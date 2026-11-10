// Test page for signin-google.test.cjs: the real AuthCallback, LoginPage,
// SignInHost, SignInModal, AuthProvider and lib/api, in a real browser router.
// Supabase (signin-google.stubs.tsx) and window.fetch are fakes, so nothing
// leaves the page. The case (window.__case) is set before each page load.
import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import AuthCallback from 'callback-under-test'
// @ts-ignore resolved by esbuild alias
import LoginPage from 'login-under-test'
// @ts-ignore resolved by esbuild alias
import SignInHost from 'signin-host-under-test'
// @ts-ignore resolved by esbuild alias
import { AuthProvider } from 'auth-under-test'
// @ts-ignore resolved by esbuild alias
import { openSignIn } from 'signin-lib-under-test'
// @ts-ignore resolved by esbuild alias
import { apiRequest } from 'api-under-test'
// @ts-ignore resolved by esbuild alias
import Security from 'security-under-test'
// @ts-ignore resolved by esbuild alias
import { ToastProvider } from 'toast-under-test'

const w = window as any
const json = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const html = (status: number) => Promise.resolve(new Response('<!DOCTYPE html><html><body>502 Bad Gateway</body></html>', { status, headers: { 'Content-Type': 'text/html' } }))
const USER = { id: 'u1', email: 'boss@gmail.com', firstName: 'Amaka', username: 'amaka', role: 'ADMIN', isEmailVerified: true }
const TOKENS = { accessToken: 'app-access', refreshToken: 'app-refresh' }

w.__calls = JSON.parse(sessionStorage.getItem('calls') || '[]')
const log = (c: any) => { w.__calls.push(c); sessionStorage.setItem('calls', JSON.stringify(w.__calls)) }

w.fetch = async (url: string, init: RequestInit = {}) => {
  const p = new URL(String(url), location.href).pathname.replace(/^\/api\/v1/, '')
  const body = init.body ? JSON.parse(String(init.body)) : null
  const auth = new Headers(init.headers).get('Authorization')
  log({ path: p, body, auth })
  const c = w.__case
  if (p === '/auth/google/exchange') {
    if (c === 'twofa') return json(200, { success: true, data: { requiresTwoFactor: true, challengeToken: 'chal-1', userId: 'u1' } })
    if (c === 'banned') return json(403, { success: false, message: 'Account has been banned. Contact support.' })
    if (c === 'limit') return json(429, { success: false, message: 'Too many auth attempts. Please wait before trying again.' })
    if (c === 'busy') return html(502)
    if (c === 'offline') throw new TypeError('Failed to fetch')
    return json(200, { success: true, data: { user: USER, tokens: TOKENS, isNewUser: false } })
  }
  if (p === '/auth/2fa/challenge') {
    if (body?.token === '123456' || body?.token === 'A3F9-C01B7E') return json(200, { success: true, data: { user: USER, tokens: TOKENS } })
    return json(401, { success: false, message: 'Invalid 2FA code' })
  }
  if (p === '/auth/login') return html(502)
  // Changing the password ends every old session; the server sends this device a fresh one
  if (p === '/auth/change-password') {
    if (body?.currentPassword !== 'Old12345') return json(400, { success: false, message: 'Current password is incorrect' })
    return json(200, { success: true, message: 'Password changed successfully', data: { message: 'Password changed successfully', tokens: { accessToken: 'fresh-access', refreshToken: 'fresh-refresh' } } })
  }
  if (p === '/auth/me') return auth === 'Bearer app-access' ? json(200, { success: true, user: USER }) : json(401, { success: false, message: 'Invalid access token' })
  if (p === '/users/me') return json(200, { success: true, data: { ...USER, lastName: 'O', avatarUrl: 'x' } })
  return json(404, { success: false, message: 'not stubbed: ' + p })
}

const ME = { ...USER, lastName: 'O', avatarUrl: null, isPublic: true, isTwoFactorEnabled: false, hasPassword: true, humanVerifiedAt: null, ogaScore: 0, preferences: { loginAlerts: true }, kyc: null, connections: {} }

function Where() {
  const loc = useLocation()
  return <p id="loc">{loc.pathname + loc.search}</p>
}

function Opener() {
  return (
    <div>
      <button id="open-options" type="button" onClick={() => openSignIn({})}>Open</button>
      <button id="open-signup" type="button" onClick={() => openSignIn({ view: 'signup' })}>Sign up</button>
      <button id="raw-busy" type="button" onClick={() => apiRequest('/auth/login', { method: 'POST', auth: false, body: '{}' }).then(() => { w.__raw = 'ok' }, (e: any) => { w.__raw = e.message + '|' + e.status })}>Raw</button>
    </div>
  )
}

// sessionStorage strict=1: React StrictMode (effects run twice, as in dev)
const Wrap = ({ children }: { children: ReactNode }) => (sessionStorage.getItem('strict') === '1' ? <StrictMode>{children}</StrictMode> : <>{children}</>)

createRoot(document.getElementById('root')!).render(
  <Wrap><BrowserRouter>
    <AuthProvider>
      <Where />
      <SignInHost />
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join" element={<LoginPage />} />
        <Route path="/ref/:code" element={<LoginPage />} />
        <Route path="/dashboard" element={<p id="dash">Dashboard</p>} />
        <Route path="/settings" element={<ToastProvider><Security me={ME} setMe={() => {}} reload={async () => {}} /></ToastProvider>} />
        <Route path="*" element={<Opener />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter></Wrap>,
)
