// Stand-ins for my-store-seller.test.cjs: the page frame, the signed-in seller,
// the display currency (naira, ₦1,500 to the dollar, no rate requests) and toasts
// (kept in window.__toasts). MyStore, its Reviews and Earnings tabs, StoreProduct
// and lib/api are the real ones.
import type { ReactNode } from 'react'

export default function Layout({ children }: { children?: ReactNode }) { return <main>{children}</main> }
export const useAuth = () => ({
  isAuthed: true,
  user: { id: 'u1', username: 'ada', firstName: 'Ada', isEmailVerified: true, kycStatus: 'APPROVED', kycTier: 1, country: 'NG' },
})
const rate = (a: number, from: string, to: string) => (from === to ? a : from === 'NGN' ? a / 1500 : to === 'NGN' ? a * 1500 : a)
export const useCurrency = () => ({
  preferredCurrency: 'NGN', convert: rate, rates: { SOL: 150, USDC: 1, USDT: 1, NGN: 1 / 1500, GHS: 1 / 15 }, loading: false, lastUpdated: null,
})
export const useToast = () => ({ toast: (message: string, type = 'info') => { const w = window as any; (w.__toasts = w.__toasts || []).push({ message, type }) } })
