// Test page for welcome-flow.test.cjs: the real WelcomeHost (as mounted in App)
// over a stand-in page, with the real lib/api apiRequest. window.fetch is a fake
// server (the backend's welcome.service answers), so nothing leaves the page.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import { WelcomeHost } from 'welcome-under-test'
// @ts-ignore resolved by esbuild alias
import { ToastProvider } from 'toast-under-test'
// @ts-ignore resolved by esbuild alias
import { apiRequest } from 'api-under-test'
// @ts-ignore resolved by esbuild alias
import { isRulesError, openRules } from 'welcome-lib-under-test'

const w = window as any
const RULES_MESSAGE = 'Please accept the OgaPay rules before you take a job. Read them, tap "Accept and continue", then try again.'
const reply = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any) => reply(200, { success: true, data })

const worker = { id: 'u1', role: 'WORKER', referralCode: 'MINE1234' }
const full = { show: true, completedAt: null, referral: { eligible: true, reason: null, until: '2026-11-09T00:00:00Z' }, rules: { acceptedAt: null, required: true }, level1: false }
const CASES: Record<string, { user: any; path: string; welcome: any; push: string; saved?: string; rulesAccepted?: boolean }> = {
  new: { user: worker, path: '/dashboard', welcome: full, push: 'off', saved: 'ZZZZ9999' },
  quiet: { user: worker, path: '/login', welcome: full, push: 'off' },
  some: { user: worker, path: '/tasks', welcome: { ...full, referral: { eligible: false, reason: 'TOO_OLD' }, level1: true }, push: 'unsupported' },
  none: { user: worker, path: '/dashboard', welcome: { ...full, referral: { eligible: false }, rules: { acceptedAt: '2026-10-01T00:00:00Z', required: false }, level1: true }, push: 'on' },
  verify: { user: worker, path: '/dashboard', welcome: { ...full, referral: { eligible: false }, rules: { acceptedAt: '2026-10-01T00:00:00Z' } }, push: 'blocked' },
  done: { user: worker, path: '/tasks', welcome: { ...full, show: false, completedAt: '2026-11-01T09:00:00Z', referral: { eligible: false } }, push: 'off' },
  admin: { user: { ...worker, role: 'ADMIN' }, path: '/dashboard', welcome: full, push: 'off' },
  out: { user: null, path: '/dashboard', welcome: full, push: 'off' },
  old: { user: worker, path: '/dashboard', welcome: null, push: 'off' },
}
const c = CASES[new URLSearchParams(location.search).get('case') || 'new']
w.__user = c.user
w.__push = c.push
w.__rulesAccepted = !!c.rulesAccepted
w.__calls = []
try { localStorage.clear(); if (c.saved) localStorage.setItem('ogapay_referral', c.saved) } catch { /* file page */ }

w.fetch = async (url: string, init: RequestInit = {}) => {
  const p = new URL(String(url)).pathname.replace(/^\/api\/v1/, '')
  const method = String(init.method || 'GET').toUpperCase()
  w.__calls.push({ path: p, method, body: init.body })
  if (p === '/users/me/welcome' && method === 'GET') return c.welcome ? ok(c.welcome) : reply(404, { success: false, message: 'Route not found' })
  if (p === '/users/referral/claim' && method === 'POST') {
    const code = JSON.parse(String(init.body)).code
    if (code === 'ABCD2345') return ok({ referrer: { username: 'ada', firstName: 'Ada', avatarUrl: null } })
    return reply(404, { success: false, message: "We couldn't find that code. Check it and try again.", errors: [{ code: 'UNKNOWN_CODE' }] })
  }
  if (p === '/users/me/accept-rules' && method === 'POST') { w.__rulesAccepted = true; return ok({ rulesAcceptedAt: new Date().toISOString() }) }
  if (p === '/users/me/onboarding-done' && method === 'POST') return ok({ onboardingCompletedAt: new Date().toISOString() })
  if (p === '/tasks/t1/apply' && method === 'POST') {
    return w.__rulesAccepted ? ok({ id: 's1' }) : reply(403, { success: false, message: RULES_MESSAGE, errors: [{ code: 'RULES_REQUIRED' }] })
  }
  return reply(404, { success: false, message: 'not stubbed: ' + p })
}

// A stand-in page: where we are, a way to move, and a "Take a slot" button
// handled like the Job monitor's (JobMonitor.tsx takeSlot)
function Page() {
  const loc = useLocation()
  w.__nav = useNavigate()
  const take = () => apiRequest('/tasks/t1/apply', { method: 'POST' })
    .then(() => { w.__took = (w.__took || 0) + 1 })
    .catch((e: any) => { if (isRulesError(e)) openRules(() => { take() }); else w.__err = e?.message })
  return <main><p id="loc">{loc.pathname}</p><button id="take" type="button" onClick={take}>Take a slot</button></main>
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={[c.path]}><ToastProvider><Page /><WelcomeHost /></ToastProvider></MemoryRouter>,
)
