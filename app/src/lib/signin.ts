/* Open the sign-in dialog from anywhere (navbar, drawer, guards) without a
   route change. <SignInHost /> in App listens for this event. */

// email: one field, a code by email (signs in, or makes the account); signup is
// the same with Google offered first and the invite line (referral links)
export type SignInView = 'options' | 'wallets' | 'email' | 'signup' | 'forgot' | 'pair' | 'twofa' | 'profile'

export interface SignInRequest {
  view?: SignInView
  /** Pairing code to prefill (from /pair?code=…) */
  code?: string
  /** Same-site path to open after signing in */
  redirect?: string | null
  /** Where to go if the dialog is closed without signing in (used by /login) */
  closeTo?: string
  /** Closing goes back to the page before, when there is one in this tab (/login, login-10) */
  closeBack?: boolean
  /** Message to show on open, e.g. why a Google sign-in didn't finish */
  notice?: string
  /** A 2FA challenge to finish (a Google sign-in to an account with 2FA on) */
  challenge?: { token: string; userId: string }
  /** A new Google account's sign-in, kept until its last step (name, country) is done or skipped (AuthCallback, login-23) */
  pending?: any
}

export const SIGN_IN_EVENT = 'ogapay:signin'

/** sessionStorage: why a Google sign-in failed (AuthCallback), shown once on /login */
export const SIGN_IN_ERROR_KEY = 'ogapay_signin_error'

export function openSignIn(req: SignInRequest = {}) {
  window.dispatchEvent(new CustomEvent<SignInRequest>(SIGN_IN_EVENT, { detail: req }))
}

/** Only allow paths on this site ("/tasks", not "//evil.com" or "https://…") */
export function safeRedirect(path?: string | null): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null
  // Browsers drop tabs/newlines, so "/<tab>/evil.com" would open evil.com (2026-11-07)
  if (/[\u0000-\u001f\u007f]/.test(path)) return null
  try {
    if (new URL(path, window.location.origin).origin !== window.location.origin) return null
  } catch { return null }
  if (path.startsWith('/login') || path.startsWith('/pair')) return null
  return path
}
