// Stand-ins for dashboard.test.cjs: the page frame, who is signed in
// (window.__me), the display currency (window.__pref, with fixed rates), the
// wallet balances (window.__balances), the theme and toasts. Dashboard, Navbar,
// Drawer, lib/api and the rest of the page are real.
import { useSyncExternalStore, type ReactNode } from 'react'

const w = window as any

export default function Layout({ children }: { children: ReactNode }) {
  return <main>{children}</main>
}

// refreshUser reads the account again (window.__fetchMe, set by a test case) and
// the page re-renders with it, as the real AuthContext does
const listeners = new Set<() => void>()
const setMe = (m: any) => { w.__me = m; listeners.forEach((f) => f()) }
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
export function useAuth() {
  const user = useSyncExternalStore(subscribe, () => w.__me || null)
  const refreshUser = async () => {
    w.__refreshes = (w.__refreshes || 0) + 1
    const next = await w.__fetchMe?.()
    if (next) setMe(next)
  }
  return { user, isAuthed: !!user, isAuthenticated: !!user, isLoading: false, logout: () => {}, refreshUser }
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
