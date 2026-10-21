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
