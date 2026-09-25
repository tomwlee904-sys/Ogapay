import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { SIGN_IN_EVENT, safeRedirect, type SignInRequest } from '../../lib/signin'

// Loaded on first open, so Supabase and the wallet code stay out of the first page load
const SignInModal = lazy(() => import('./SignInModal'))

const AUTH_PAGES = ['/login', '/pair']

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

  const close = () => {
    setReq(null)
    if (onAuthPage && req.closeTo) navigate(req.closeTo, { replace: true })
  }

  const signedIn = (isNewAccount: boolean) => {
    const to = safeRedirect(req.redirect) || (isNewAccount || onAuthPage ? '/dashboard' : null)
    setReq(null)
    if (to) navigate(to, { replace: onAuthPage })
  }

  return (
    <Suspense fallback={null}>
      <SignInModal key={req.key} initialView={req.view} initialCode={req.code} initialNotice={req.notice} redirect={safeRedirect(req.redirect)} onClose={close} onSignedIn={signedIn} />
    </Suspense>
  )
}
