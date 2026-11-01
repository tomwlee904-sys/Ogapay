import { Suspense, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import { pushState, type PushState } from '../lib/push'
import { lazyPage } from '../lib/staleBuild'
import { WELCOME_RULES_EVENT, needsWelcome, welcomeSteps, type WelcomeState, type WelcomeStep } from '../lib/welcome'

// Loaded only when it opens
const WelcomeFlow = lazyPage(() => import('./WelcomeFlow'))

// Not on the sign-in and sign-up pages (it opens once sign-up is done), Google's
// return page, email and password links, payments, or admin pages
const QUIET = /^\/(login|pair|join|ref|register|auth|verify-email|verify|reset-password|forgot-password|deposit|store\/pay|orders|admin)(\/|$)/

// fromRules: opened by the rules refusal, so closing it isn't finishing the welcome flow
type Open = { steps: WelcomeStep[]; fromRules?: boolean; onAccepted?: () => void; key: number }

/* Mounted once in App. The welcome flow (2026-11-01): opens once for a signed-in
   member who hasn't finished or closed it (GET /users/me/welcome), and at
   "Before you start" when taking a place on a job is refused because the rules
   aren't accepted (lib/welcome.ts openRules). Never for signed-out visitors,
   and never by itself for admins. */
export function WelcomeHost() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [state, setState] = useState<{ userId: string; welcome: WelcomeState; push: PushState | null } | null>(null)
  const [open, setOpen] = useState<Open | null>(null)
  const opened = useRef('') // the account it already opened for on this visit

  useEffect(() => {
    setState(null); setOpen(null)
    if (!user?.id) return
    const userId = user.id
    let alive = true
    apiRequest<WelcomeState>('/users/me/welcome').then(async (welcome) => {
      // Alerts are a step only where they can be switched on (checked once, when the flow is due)
      const push = needsWelcome(welcome) ? await pushState().catch(() => null) : null
      if (alive) setState({ userId, welcome, push })
    }).catch(() => { /* no flow this time (an older server has no such page) */ })
    return () => { alive = false }
  }, [user?.id])

  const welcome = state && state.userId === user?.id ? state.welcome : null
  const patch = (w: Partial<WelcomeState>) => setState((s) => (s ? { ...s, welcome: { ...s.welcome, ...w } } : s))

  const markDone = () => {
    if (!needsWelcome(welcome)) return
    patch({ show: false, completedAt: new Date().toISOString() })
    apiRequest('/users/me/onboarding-done', { method: 'POST' }).catch(() => { /* shows again next visit */ })
  }

  // Open once it's due and the member is on an ordinary page
  useEffect(() => {
    if (!user || !state || !welcome || open || opened.current === user.id) return
    if (!needsWelcome(welcome) || user.role === 'ADMIN' || QUIET.test(pathname)) return
    opened.current = user.id
    const steps = welcomeSteps(welcome, state.push)
    if (steps.length) setOpen({ steps, key: Date.now() })
    else markDone() // nothing left to show
  }, [user, state, pathname, open])

  // "Accept the rules first": just that step, then back to what they were doing
  useEffect(() => {
    const onRules = (e: Event) => {
      if (!user) return
      opened.current = user.id
      setOpen({ steps: ['rules'], fromRules: true, onAccepted: (e as CustomEvent).detail?.onAccepted, key: Date.now() })
    }
    window.addEventListener(WELCOME_RULES_EVENT, onRules)
    return () => window.removeEventListener(WELCOME_RULES_EVENT, onRules)
  }, [user])

  if (!user || !open) return null
  return (
    <Suspense fallback={null}>
      <WelcomeFlow
        key={open.key}
        steps={open.steps}
        myCode={user.referralCode}
        onClaimed={() => patch({ referral: { eligible: false, reason: 'ALREADY_REFERRED', until: null } })}
        onRulesAccepted={() => {
          patch({ rules: { ...welcome?.rules, acceptedAt: new Date().toISOString() } })
          open.onAccepted?.()
        }}
        onFinish={() => { setOpen(null); if (!open.fromRules) markDone() }}
      />
    </Suspense>
  )
}
