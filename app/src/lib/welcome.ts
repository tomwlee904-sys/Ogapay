import type { PushState } from './push'

// The welcome flow shown once per account (components/WelcomeHost.tsx and
// WelcomeFlow.tsx), right after sign-up or, for older members, on their next
// visit (2026-11-01). The server says what applies (GET /users/me/welcome,
// backend services/welcome.service.js welcomeFor):
//   1. Who invited you?  (only while a referrer can still be added)
//   2. Before you start  (the rules; new accounts need them to take a place on a job)
//   3. Get job alerts    (only where push alerts can be turned on)
//   4. Verify Level 1    (only below Level 1)
// The server keeps onboardingCompletedAt and rulesAcceptedAt, so it shows once, whatever the device.

export type WelcomeStep = 'invite' | 'rules' | 'alerts' | 'verify'

// GET /users/me/welcome (also `welcome` in GET /users/me)
export interface WelcomeState {
  show?: boolean // not finished or closed yet (never for admins)
  completedAt?: string | null
  referral?: { eligible?: boolean; reason?: string | null; until?: string | null } | null
  rules?: { acceptedAt?: string | null; required?: boolean } | null
  level1?: boolean
}

const MAX_CODE = 40

// A referral code from what someone pasted or typed: the code itself, a link
// (ogapay.app/ref/CODE, ogapay.app/join?ref=CODE, any page with ?ref=CODE) or a
// message with the link in it. Null when there is no code in it.
export function parseReferralInput(input: string): string | null {
  const s = String(input || '').trim()
  if (!s) return null
  const fromLink = s.match(/\/ref\/([A-Za-z0-9_-]+)/i) || s.match(/[?&#]ref=([A-Za-z0-9_-]+)/i)
  if (fromLink) return fromLink[1].slice(0, MAX_CODE)
  // Not a link: the code alone. Anything with a dot or slash was a link without a code.
  if (/[./:?=&]/.test(s)) return null
  if (/^[A-Za-z0-9_-]{3,40}$/.test(s)) return s
  // A code typed with a space in it ("ABCD 2345"): codes are 8 letters and digits
  const joined = s.replace(/\s+/g, '')
  return /^[A-Za-z0-9]{8}$/.test(joined) ? joined : null
}

// Not finished or closed yet. An older server sends nothing: then nothing shows.
export const needsWelcome = (w?: WelcomeState | null) => w?.show === true

// The steps this member sees, in order (only the ones they can use)
export function welcomeSteps(w: WelcomeState, push: PushState | null): WelcomeStep[] {
  const steps: WelcomeStep[] = []
  if (w.referral?.eligible === true) steps.push('invite')
  if (w.rules && !w.rules.acceptedAt) steps.push('rules')
  if (push === 'off') steps.push('alerts') // already on, blocked or not possible here: skipped
  if (w.level1 === false) steps.push('verify')
  return steps
}

// The server's refusal when the rules aren't accepted yet (applyToTask, for jobs
// and contests): 403 with errors [{ code: 'RULES_REQUIRED' }]
export function isRulesError(e: unknown): boolean {
  const err = e as { message?: string; errors?: { code?: string }[] } | null
  if (Array.isArray(err?.errors) && err.errors.some((x) => x?.code === 'RULES_REQUIRED')) return true
  return /\baccept\w*\b[^.]*\brules\b/i.test(String(err?.message || ''))
}

// Open the flow at "Before you start" (e.g. after that refusal). onAccepted runs
// once the rules are accepted, to clear the page's error or try again.
export const WELCOME_RULES_EVENT = 'ogapay:welcome-rules'
export function openRules(onAccepted?: () => void) {
  window.dispatchEvent(new CustomEvent(WELCOME_RULES_EVENT, { detail: { onAccepted } }))
}
