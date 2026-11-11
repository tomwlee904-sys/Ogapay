import { Suspense, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { SIGN_IN_EVENT, safeRedirect, type SignInRequest } from '../../lib/signin'
import { lazyPage } from '../../lib/staleBuild'

// Loaded on first open, so Supabase and the wallet code stay out of the first page load
const SignInModal = lazyPage(() => import('./SignInModal'))

// /auth/callback: the 2FA step after Google opens over the "signing you in" page
const AUTH_PAGES = ['/login', '/pair', '/auth/callback']

/* Mounted once in App. Shows the sign-in dialog over whatever page is open. */
export default function SignInHost() {
  const [req, setReq] = useState<(SignInRequest & { key: number }) | null>(null)
  const { isAuthed } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onOpen = (e: Event) => setReq({ ...(e as CustomEvent<SignInRequest>).detail, key: Date.now() })
    window.addEventListener(SIGN_IN_EVENT, onOpen)
    return () => window.removeEventListener(SIGN_IN_EVENT, onOpen)
  }, [])

  // Signed in somewhere else (another tab, Google return): nothing to show
  useEffect(() => { if (isAuthed && req) setReq(null) }, [isAuthed])

  if (!req) return null
  const onAuthPage = AUTH_PAGES.includes(location.pathname)

  // On /login: back to the page before it in this tab (the job you were on),
  // else req.closeTo (login-10). React Router counts this tab's pages in history.state.idx.
  const close = () => {
    setReq(null)
    if (!onAuthPage) return
    const idx = Number((window.history.state as { idx?: number } | null)?.idx)
    if (req.closeBack && idx > 0) navigate(-1)
    else if (req.closeTo) navigate(req.closeTo, { replace: true })
  }

  const signedIn = (isNewAccount: boolean) => {
    const to = safeRedirect(req.redirect) || (isNewAccount || onAuthPage ? '/dashboard' : null)
    setReq(null)
    // Signed in from the page it goes back to (a ticket link, say): don't add a
    // second copy of it to the history (2026-11-02)
    if (to) navigate(to, { replace: onAuthPage || to === location.pathname + location.search })
  }

  return (
    <Suspense fallback={null}>
      <SignInModal key={req.key} initialView={req.view} initialCode={req.code} initialNotice={req.notice} initialChallenge={req.challenge} initialPending={req.pending} redirect={safeRedirect(req.redirect)} onClose={close} onSignedIn={signedIn} />
    </Suspense>
  )
}
