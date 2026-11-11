import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/Logo'
import { openSignIn, safeRedirect, SIGN_IN_ERROR_KEY } from '../lib/signin'

const ERRORS: Record<string, string> = {
  no_session: "Google sign-in didn't finish. Please try again.",
  callback_error: "Google sign-in didn't finish. Please try again.",
  auth_init_failed: "Couldn't start Google sign-in. Please try again.",
  google_auth_failed: 'Google sign-in failed. Please try again.',
  google_failed: "Google sign-in didn't finish. Please try again.",
}

// The reason a Google sign-in failed (AuthCallback), shown once: read when the
// page mounts, removed after the dialog opens
const peekSignInError = () => {
  try { return (sessionStorage.getItem(SIGN_IN_ERROR_KEY) || '').slice(0, 300) } catch { return '' }
}
const clearSignInError = () => { try { sessionStorage.removeItem(SIGN_IN_ERROR_KEY) } catch { /* private mode */ } }

// Set by AuthContext when a session couldn't be renewed; shown for a minute
const takeSessionNotice = () => {
  try {
    const v = sessionStorage.getItem('ogapay_session_ended')
    return v && Date.now() - Number(v) < 60000 ? 'Your session ended. Please sign in again.' : ''
  } catch { return '' }
}

// Pages anyone can open: closing the dialog on /login?redirect=/tasks/abc goes
// back there (login-10). A members-only page would only bring /login back.
const PUBLIC_PAGE = /^\/(tasks\/(?!new\b)[^/?#]+|store\/(?!orders\b|pay\b)[^/?#]+|blog\/(?!write\b)[^/?#]+|user\/[^/?#]+|communities\/(?!create\b|mine\b)[^/?#]+)\/?([?#].*)?$/

/* /login, /pair and referral links (/ref/CODE, /join?ref=CODE) open the sign-in
   dialog over a light page (login-9, 2026-11-11). It used to be the whole
   homepage: on 3G its code, pictures and six lists came first and the dialog
   showed after about 6 s. Closing the dialog goes back to the page you came
   from (or the page you were sent here from), else the homepage (login-10). */
export default function LoginPage() {
  const { isAuthed, isLoading } = useAuth()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const redirect = safeRedirect(params.get('redirect'))
  const { code: refCode } = useParams<{ code?: string }>()
  const isReferral = pathname === '/join' || pathname.startsWith('/ref/')
  // Kept in state: StrictMode runs the initialiser and the effect below twice,
  // and reading-and-deleting there lost the reason (generic text instead)
  const [googleError] = useState(() => (params.get('error') === 'google_failed' ? peekSignInError() : ''))
  const view = pathname === '/pair' ? 'pair' : params.get('mode') === 'signup' || isReferral ? 'signup' : 'options'
  const open = (notice = '') => openSignIn({
    view,
    code: params.get('code') || '',
    notice,
    redirect,
    closeTo: redirect && PUBLIC_PAGE.test(redirect) ? redirect : '/',
    closeBack: true,
  })

  useEffect(() => {
    const ref = (refCode || params.get('ref') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)
    if (ref) localStorage.setItem('ogapay_referral', ref)
  }, [refCode, params])

  useEffect(() => {
    if (isLoading || isAuthed) return
    open(googleError || ERRORS[params.get('error') || ''] || takeSessionNotice())
    clearSignInError()
  }, [isLoading, isAuthed, pathname])

  if (!isLoading && isAuthed) return <Navigate to={redirect || '/dashboard'} replace />
  // Behind the dialog; also what's left if the dialog's code couldn't load
  return (
    <main id="login-page" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--text)', padding: 16, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <span style={{ display: 'inline-flex', marginBottom: 12 }}><Logo size={40} /></span>
        <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, letterSpacing: '-.01em' }}>{isReferral ? 'Join OgaPay' : 'Sign in to OgaPay'}</h1>
        <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.5, color: 'var(--text2)' }}>Earn from tasks, hire people and sell in the store.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="ui-btn ui-btn-dark" style={{ minHeight: 44 }} onClick={() => open()}>{isReferral ? 'Create my account' : 'Sign in'}</button>
          <Link to="/" className="ui-btn ui-btn-ghost" style={{ minHeight: 44 }}>Go to homepage</Link>
        </div>
      </div>
    </main>
  )
}
