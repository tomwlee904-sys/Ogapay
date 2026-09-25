/* Open the sign-in dialog from anywhere (navbar, drawer, guards) without a
   route change. <SignInHost /> in App listens for this event. */

export type SignInView = 'options' | 'wallets' | 'email' | 'signup' | 'forgot' | 'pair'

export interface SignInRequest {
  view?: SignInView
  /** Pairing code to prefill (from /pair?code=…) */
  code?: string
  /** Same-site path to open after signing in */
  redirect?: string | null
  /** Where to go if the dialog is closed without signing in (used by /login) */
  closeTo?: string
  /** Message to show on open, e.g. why a Google sign-in didn't finish */
  notice?: string
}

export const SIGN_IN_EVENT = 'ogapay:signin'

export function openSignIn(req: SignInRequest = {}) {
  window.dispatchEvent(new CustomEvent<SignInRequest>(SIGN_IN_EVENT, { detail: req }))
}

/** Only allow paths on this site ("/tasks", not "//evil.com" or "https://…") */
export function safeRedirect(path?: string | null): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null
  if (path.startsWith('/login') || path.startsWith('/pair')) return null
  return path
}
