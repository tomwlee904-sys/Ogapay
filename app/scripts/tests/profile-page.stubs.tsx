// Stand-ins for profile-page.test.cjs: the page frame, who is signed in
// (window.__me), the display currency (naira) and toasts. UserProfile, lib/api,
// CreatorAudiences and the rest of the page are real.
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return <main>{children}</main>
}

export function useAuth() {
  return { user: (window as any).__me || null, isAuthenticated: !!(window as any).__me, isLoading: false }
}

export function useCurrency() {
  return { preferredCurrency: 'NGN', convert: (a: number) => a }
}

export function useToast() {
  return { show: () => {}, success: () => {}, error: () => {} }
}
