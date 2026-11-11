// Test page for signin-email-code.test.cjs: the real LoginPage, SignInHost,
// SignInModal, AuthProvider and lib/api in a real browser router. Supabase,
// push and the homepage are stand-ins (signin-google.stubs.tsx) and
// window.fetch is a fake OgaPay server, so nothing leaves the page.
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import LoginPage from 'login-under-test'
// @ts-ignore resolved by esbuild alias
import SignInHost from 'signin-host-under-test'
// @ts-ignore resolved by esbuild alias
import { AuthProvider, useAuth } from 'auth-under-test'
// @ts-ignore resolved by esbuild alias
import { openSignIn } from 'signin-lib-under-test'

const w = window as any
const json = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any, message = 'ok') => json(200, { success: true, message, data })
const OLD = { id: 'u1', email: 'old@mail.ng', firstName: 'Amaka', lastName: 'O', username: 'amaka', role: 'WORKER', isEmailVerified: true }
const NEW = { id: 'u9', email: 'new@mail.ng', firstName: 'Member', lastName: '', username: 'member_ab12cd3', role: 'WORKER', isEmailVerified: true, hasEmail: true }
const WAL = { id: 'u7', email: '', hasEmail: false, firstName: 'Member', lastName: '', username: 'member_77aa001', role: 'WORKER', isEmailVerified: false }
const WRONG = 'That code is wrong or has expired. Check the latest email, or ask for a new code.'

w.__calls = JSON.parse(sessionStorage.getItem('calls') || '[]')
const log = (c: any) => { w.__calls.push(c); sessionStorage.setItem('calls', JSON.stringify(w.__calls)) }
w.__gtag = []
w.gtag = (...a: any[]) => w.__gtag.push(a)

w.fetch = async (url: string, init: RequestInit = {}) => {
  const p = new URL(String(url), location.href).pathname.replace(/^\/api\/v1/, '')
  const body = init.body ? JSON.parse(String(init.body)) : null
  const auth = new Headers(init.headers).get('Authorization')
  log({ path: p, method: init.method || 'GET', body, auth })
  if (p === '/auth/email-code/request') {
    if (body?.email === 'wait@mail.ng') return json(429, { success: false, message: 'We just sent a code. Wait a minute before asking for another.', errors: [{ code: 'RETRY_AFTER', retryAfter: 42 }] })
    return ok({ message: 'Check your email for a 6-digit code. It works for 10 minutes.' })
  }
  if (p === '/auth/email-code/verify') {
    if (body?.code !== '123456') return json(401, { success: false, message: WRONG })
    if (body.email === 'new@mail.ng' || body.email === 'tobi@mail.ng') return ok({ user: { ...NEW, email: body.email }, tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' }, isNewUser: true }, 'Account created')
    if (body.email === '2fa@mail.ng') return ok({ requiresTwoFactor: true, challengeToken: 'chal-2', userId: 'u2' })
    return ok({ user: OLD, tokens: { accessToken: 'app-access', refreshToken: 'app-refresh' } })
  }
  if (p === '/users/me' && init.method === 'PATCH') return auth === 'Bearer new-access' || auth === 'Bearer w-access' ? ok({ ...NEW, ...body }) : json(401, { success: false, message: 'Invalid access token' })
  if (p === '/auth/login') return body?.password === 'Pass1234' ? ok({ user: OLD, tokens: { accessToken: 'app-access', refreshToken: 'app-refresh' } }) : json(401, { success: false, message: 'Invalid email or password' })
  if (p === '/wallet/nonce') return ok({ message: 'Sign in to OgaPay on ogapay.app with this wallet.', purpose: 'signin' })
  if (p === '/auth/wallet/login') return ok({ user: WAL, tokens: { accessToken: 'w-access', refreshToken: 'w-refresh' }, isNewUser: true, needsEmail: true }, 'Account created with wallet')
  if (p === '/auth/email/add/request') return auth === 'Bearer w-access' ? ok({ message: 'sent' }) : json(401, { success: false, message: 'Invalid access token' })
  if (p === '/auth/email/add/confirm') return auth === 'Bearer w-access' && body?.code === '123456' ? ok({ email: body.email, isEmailVerified: true, hasEmail: true }) : json(401, { success: false, message: WRONG })
  if (p === '/auth/me') {
    if (auth === 'Bearer app-access') return json(200, { success: true, user: OLD })
    if (auth === 'Bearer new-access') return json(200, { success: true, user: NEW })
    if (auth === 'Bearer w-access') return json(200, { success: true, user: WAL })
    return json(401, { success: false, message: 'Invalid access token' })
  }
  return json(404, { success: false, message: 'not stubbed: ' + p })
}

function Where() {
  const loc = useLocation()
  const { user } = useAuth()
  return <><p id="loc">{loc.pathname + loc.search}</p><p id="who">{user ? user.id : ''}</p></>
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <Where />
      <SignInHost />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ref/:code" element={<LoginPage />} />
        <Route path="/dashboard" element={<p id="dash">Dashboard</p>} />
        <Route path="*" element={<button id="open" type="button" onClick={() => openSignIn({ redirect: '/tasks/abc' })}>Open</button>} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
)
