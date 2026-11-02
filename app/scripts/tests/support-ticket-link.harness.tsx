// Test page for support-ticket-link.test.cjs: the real Support page, signed
// out, opened from the ticket link in a support email (/support?ticket=T1),
// with the real AuthProvider and SignInHost (as mounted in App). window.fetch
// is a fake server, so nothing leaves the page.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import Support from 'support-under-test'
// @ts-ignore resolved by esbuild alias
import SignInHost from 'signin-host-under-test'
// @ts-ignore resolved by esbuild alias
import { AuthProvider } from 'auth-under-test'
// @ts-ignore resolved by esbuild alias
import { ToastProvider } from 'toast-under-test'
// @ts-ignore resolved by esbuild alias
import { SIGN_IN_EVENT } from 'signin-lib-under-test'

const w = window as any
const reply = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any) => reply(200, { success: true, data })

const TICKET = {
  id: 'T1', subject: 'Withdrawal pending', category: 'Payments and withdrawals', description: 'My withdrawal has been pending for two days.',
  targetType: 'support', status: 'resolved', attachments: [], email: null, createdAt: '2026-11-01T09:00:00Z', resolvedAt: '2026-11-02T09:00:00Z',
}
const REPLY = 'Your bank rejected the transfer. We sent it again and it is paid now.'
const CASES: Record<string, { entries: string[] }> = {
  // From the email: the mail app first, then the ticket link
  link: { entries: ['/mail', '/support?ticket=T1'] },
  page: { entries: ['/support'] },
}
const c = CASES[new URLSearchParams(location.search).get('case') || 'link']
w.__calls = []
w.__signins = []
try { localStorage.clear() } catch { /* file page */ }
window.addEventListener(SIGN_IN_EVENT, (e) => { w.__signins.push((e as CustomEvent).detail) })

w.fetch = async (url: string, init: RequestInit = {}) => {
  const p = new URL(String(url)).pathname.replace(/^\/api\/v1/, '')
  const method = String(init.method || 'GET').toUpperCase()
  const auth = new Headers(init.headers).get('Authorization')
  w.__calls.push({ path: p, method, auth })
  if (!auth) return reply(401, { success: false, message: 'Sign in first' })
  if (p === '/auth/me') return ok({ user: { id: 'u1', email: 'ada@test.io', firstName: 'Ada', username: 'ada', role: 'WORKER', isEmailVerified: true } })
  if (p === '/store/my-perks') return ok([])
  if (p === '/reports/mine') return ok([{ ...TICKET, description: TICKET.description, replies: 1, lastReplyAt: '2026-11-02T09:00:00Z' }])
  if (p === '/reports/mine/T1') return ok({ ...TICKET, messages: [{ id: 'm1', fromTeam: true, body: REPLY, attachments: [], createdAt: '2026-11-02T09:00:00Z' }] })
  return reply(404, { success: false, message: 'not stubbed: ' + p })
}

// Where we are, how we got here, and a way to go back
function Where() {
  const loc = useLocation()
  const type = useNavigationType()
  w.__nav = useNavigate()
  return <p id="loc" data-type={type}>{loc.pathname + loc.search}</p>
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={c.entries} initialIndex={c.entries.length - 1}>
    <AuthProvider><ToastProvider><Where /><Support /><SignInHost /></ToastProvider></AuthProvider>
  </MemoryRouter>,
)
