// Stand-ins for dashboard.test.cjs: the page frame, who is signed in
// (window.__me), the display currency (window.__pref, with fixed rates), the
// wallet balances (window.__balances), the theme and toasts. Dashboard, Navbar,
// Drawer, lib/api and the rest of the page are real.
import type { ReactNode } from 'react'

const w = window as any

export default function Layout({ children }: { children: ReactNode }) {
  return <main>{children}</main>
}

export function useAuth() {
  return { user: w.__me || null, isAuthed: !!w.__me, isAuthenticated: !!w.__me, isLoading: false, logout: () => {} }
}

// Value of one unit in naira
const NGN_PER: Record<string, number> = { NGN: 1, USDC: 1500, USDT: 1500, GHS: 100, SOL: 200000 }
const convert = (a: number, from: string, to: string) => (NGN_PER[from] && NGN_PER[to] ? (a * NGN_PER[from]) / NGN_PER[to] : NaN)
export function useCurrency() {
  return { preferredCurrency: w.__pref || 'NGN', convert, setPreferredCurrency: () => {}, rates: {} }
}

export function useWalletBalance() {
  return { balances: w.__balances ?? null, loading: false, error: null, lastFetched: 1, refresh: async () => {} }
}

export function useTheme() {
  return { theme: 'light', toggle: () => {} }
}

export function useToast() {
  return { toast: () => {}, show: () => {}, success: () => {}, error: () => {} }
}
