// Solana wallets on a phone. Phantom, Solflare and Backpack only add
// themselves to their own in-app browser, never to Safari or Chrome, so on a
// phone they always looked "Not installed" and nobody could connect. Each app
// has a universal link that opens a page inside its browser, where the wallet
// is found and connecting works the same as on a computer.

// iPadOS reports itself as a Mac; a touch screen gives it away
export const isPhone = () =>
  typeof navigator !== 'undefined' && (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

export type WalletAppId = 'phantom' | 'solflare' | 'backpack'

export const WALLET_APPS: { id: WalletAppId; name: string; icon: string }[] = [
  { id: 'phantom', name: 'Phantom', icon: '/wallets/phantom.svg' },
  { id: 'solflare', name: 'Solflare', icon: '/wallets/solflare.svg' },
  { id: 'backpack', name: 'Backpack', icon: '/wallets/backpack.png' },
]

// Each app's "browse" universal link (from its own deep-link docs)
const BROWSE: Record<WalletAppId, string> = {
  phantom: 'https://phantom.app/ul/browse/',
  solflare: 'https://solflare.com/ul/v1/browse/',
  backpack: 'https://backpack.app/ul/v1/browse/',
}

// Opens `url` (this page by default) inside the wallet app's browser. If the
// app isn't on the phone, the link opens the wallet's site, which offers it.
export const openInWalletUrl = (id: WalletAppId, url = window.location.href) =>
  `${BROWSE[id]}${encodeURIComponent(url)}?ref=${encodeURIComponent(window.location.origin)}`

export const PHONE_WALLET_LINE = 'On a phone, open OgaPay inside your wallet app to connect.'

// The wallet app's browser doesn't share Safari's or Chrome's sign-in, so
// OgaPay asks you to sign in again there. Google refuses to sign anyone in
// inside an app's built-in browser ("disallowed_useragent"), so it has to be
// email and password. Someone who signed up with Google has no password yet
// (hasPassword false) and is told to set one in Settings before leaving
// (shown with a "Set a password" link to /settings/security).
export const phoneWalletSignInLine = (hasPassword?: boolean) =>
  hasPassword === false
    ? "You'll need to sign in again there, and Google sign-in usually doesn't work inside wallet apps. Set a password first so you can sign in with your email."
    : "You'll need to sign in again there with your email and password. Google sign-in usually doesn't work inside wallet apps."

// True on a phone inside a wallet app's own browser: the app has added its
// wallet to the page, which Safari and Chrome on a phone never have
export const inWalletAppBrowser = () => {
  if (!isPhone() || typeof window === 'undefined') return false
  const w = window as any
  return !!(w.phantom?.solana || w.solflare || w.backpack || w.trustwallet?.solana || w.bitkeep?.solana || w.solana)
}

export const WALLET_APP_SIGNIN_LINE = "Google sign-in usually doesn't work inside wallet apps. Sign in with Email (signed up with Google? Use Forgot password there to set a password), or with Pair devices."
