// Stand-ins for store-product.test.cjs: the page frame, the signed-in person,
// the display currency and live coin prices. The product page, its cards,
// ShareButton, the toasts and lib/api are the real ones.
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) { return <main>{children}</main> }
export const useAuth = () => ({ isAuthed: !!(window as any).__user, user: (window as any).__user || null })
export const useCurrency = () => ({ preferredCurrency: 'NGN', convert: (a: number) => a, rates: {}, loading: false, lastUpdated: null })
export const useLivePrice = () => ({ sol: 200000 })
