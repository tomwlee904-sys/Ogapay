// Test page for signin-return.test.cjs: the real LoginPage, SignInHost,
// SignInModal, AuthCallback, VerifyEmailPage, AuthProvider and lib/api in a real
// browser router. Supabase, push and the homepage are stand-ins
// (signin-google.stubs.tsx) and window.fetch is a fake OgaPay server.
// The case (sessionStorage 'case') is set before each page load.
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes, useLocation, useParams } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import LoginPage from 'login-under-test'
// @ts-ignore resolved by esbuild alias
import SignInHost from 'signin-host-under-test'
// @ts-ignore resolved by esbuild alias
import AuthCallback from 'callback-under-test'
// @ts-ignore resolved by esbuild alias
import VerifyEmailPage from 'verify-under-test'
// @ts-ignore resolved by esbuild alias
import { AuthProvider, useAuth } from 'auth-under-test'
// @ts-ignore resolved by esbuild alias
import { openSignIn } from 'signin-lib-under-test'

const w = window as any
w.__case = sessionStorage.getItem('case') || ''
const json = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any, message = 'ok') => json(200, { success: true, message, data })
const OLD = { id: 'u1', email: 'old@mail.ng', firstName: 'Amaka', lastName: 'O', username: 'amaka', role: 'WORKER', isEmailVerified: true }
const GNEW = { id: 'g9', email: 'kemi@gmail.com', firstName: 'Kemi', lastName: 'Adeyemi', username: 'kemi_3f9c1e', role: 'POSTER', isEmailVerified: true }
const WRONG = 'That code is wrong or has expired. Check the latest email, or ask for a new code.'

w.__calls = JSON.parse(sessionStorage.getItem('calls') || '[]')
const log = (c: any) => { w.__calls.push(c); sessionStorage.setItem('calls', JSON.stringify(w.__calls)) }

w.fetch = async (url: string, init: RequestInit = {}) => {
  const p = new URL(String(url), location.href).pathname.replace(/^\/api\/v1/, '')
  const body = init.body ? JSON.parse(String(init.body)) : null
  const auth = new Headers(init.headers).get('Authorization')
  log({ path: p, method: init.method || 'GET', body, auth })
  if (p === '/auth/email-code/request') return ok({ message: 'Check your email for a 6-digit code. It works for 10 minutes.' })
  if (p === '/auth/email-code/verify') {
    // The first answer is lost on the way back (slow data); the code was used up
    if (body?.email === 'slow@mail.ng' && !sessionStorage.getItem('slowOnce')) { sessionStorage.setItem('slowOnce', '1'); throw new TypeError('Failed to fetch') }
    if (body?.email === 'slow@mail.ng') return json(401, { success: false, message: WRONG })
    if (body?.code !== '123456') return json(401, { success: false, message: WRONG })
    return ok({ user: OLD, tokens: { accessToken: 'app-access', refreshToken: 'app-refresh' } })
  }
  if (p === '/auth/google/exchange') {
    if (w.__case === 'gnew') return ok({ user: GNEW, tokens: { accessToken: 'g-access', refreshToken: 'g-refresh' }, isNewUser: true })
    return ok({ user: OLD, tokens: { accessToken: 'app-access', refreshToken: 'app-refresh' }, isNewUser: false })
  }
  if (p === '/users/me' && init.method === 'PATCH') return auth === 'Bearer g-access' ? ok({ ...GNEW, ...body }) : json(401, { success: false, message: 'Invalid access token' })
  if (p === '/users/me') return auth === 'Bearer g-access' || auth === 'Bearer app-access' ? ok({ ...(auth === 'Bearer g-access' ? GNEW : OLD), avatarUrl: 'x' }) : json(401, { success: false, message: 'Invalid access token' })
  if (p === '/auth/verify-email') return body?.token === 'good' ? ok(null, 'Email verified successfully') : json(400, { success: false, message: 'Invalid token' })
  if (p === '/auth/me') {
    if (auth === 'Bearer app-access') return json(200, { success: true, user: OLD })
    if (auth === 'Bearer g-access') return json(200, { success: true, user: GNEW })
    return json(401, { success: false, message: 'Invalid access token' })
  }
  return json(404, { success: false, message: 'not stubbed: ' + p })
}

function Where() {
  const loc = useLocation()
  const { user } = useAuth()
  return <><p id="loc">{loc.pathname + loc.search}</p><p id="who">{user ? user.id : ''}</p></>
}

// Stand-in for a job page: its sign-in buttons open the sheet over it (as JobDetail's do)
function Job() {
  const { id } = useParams()
  return (
    <div id="job">
      <h2>Job {id}</h2>
      <button id="apply" type="button" onClick={() => openSignIn({ redirect: '/tasks/' + id })}>Sign in to apply</button>
      <button id="navsignin" type="button" onClick={() => openSignIn()}>Navbar sign in</button>
      <Link id="to-login" to={'/login?redirect=' + encodeURIComponent('/wallet')}>Wallet (members only)</Link>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <Where />
      <SignInHost />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/ref/:code" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/tasks/:id" element={<Job />} />
        <Route path="/dashboard" element={<p id="dash">Dashboard</p>} />
        <Route path="/" element={<p id="home">Home</p>} />
        <Route path="*" element={<p id="other">Other</p>} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
)
