import { Component, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { SIGN_IN_EVENT, safeRedirect, type SignInRequest } from '../../lib/signin'
import { lazyPage } from '../../lib/staleBuild'

// Loaded on first open, so Supabase and the wallet code stay out of the first page load
const SignInModal = lazyPage(() => import('./SignInModal'))

const AUTH_PAGES = ['/login', '/pair']

// Its own small error boundary: if the dialog fails to load or crashes, say so
// in a small sheet instead of replacing the whole page with the crash screen
class DialogBoundary extends Component<{ onClose: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { /* the page behind stays usable */ }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="ui-actionbar" role="alert" style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(var(--dock-clear) + 16px)', zIndex: 1000, maxWidth: 480, margin: '0 auto' }}>
        <span className="ui-actionbar-text"><b>Sign-in couldn't load</b>Check your connection and try again.</span>
        <button type="button" className="ui-btn ui-btn-dark" onClick={() => window.location.reload()}>Reload</button>
        <button type="button" className="ui-btn ui-btn-text ui-btn-icon" aria-label="Close" onClick={this.props.onClose}><i className="ti ti-x" /></button>
      </div>
    )
  }
}

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
    <DialogBoundary key={req.key} onClose={close}>
    <Suspense fallback={null}>
      <SignInModal key={req.key} initialView={req.view} initialCode={req.code} initialNotice={req.notice} redirect={safeRedirect(req.redirect)} onClose={close} onSignedIn={signedIn} />
    </Suspense>
    </DialogBoundary>
  )
}
