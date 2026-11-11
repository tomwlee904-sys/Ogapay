import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { dropPushOnSignOut } from '../lib/push'
import { apiRequest, getAccessToken, getRefreshToken, getStoredUser, clearAuthSession, persistAuthSession, SESSION_EXPIRED_EVENT } from '../lib/api'
import { openSignIn } from '../lib/signin'

interface BankAccount {
  accountNumber: string
  bankName: string
}

interface WalletEntry {
  balance: number
  pendingWithdrawals: number
}

interface Onboarding {
  profileComplete: boolean
  emailVerified: boolean
  walletConnected: boolean
  bankAdded: boolean
  allComplete: boolean
}

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  avatar: string | null
  bio: string | null
  role: string
  // Store moderator (2026-11-10): the store queue and the Moderate bar on products
  isModerator?: boolean
  walletAddress: string | null
  walletProvider: string | null
  walletConnectedAt: string | null
  referralCode: string
  isEmailVerified: boolean
  // False for a wallet account that hasn't added an email yet (email is then '')
  hasEmail?: boolean
  isTwoFactorEnabled: boolean
  // False for an account made with Google that has no password yet
  hasPassword?: boolean
  kycStatus: string | null
  kycTier: number
  // Where they live: NG or GH (the Ghana test)
  country?: string
  onboardingComplete: boolean
  wallet: Record<string, WalletEntry>
  bankAccount: BankAccount | null
  onboarding: Onboarding
  _count: { taskSubmissions: number; tasksCreated: number; referrals: number }
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isAuthed: boolean
  isLoading: boolean
  login: (payload: { user?: any; tokens?: { accessToken?: string; refreshToken?: string; rememberMe?: boolean } }) => void
  refreshUser: () => Promise<void>
  updateUser: (partial: Partial<User>) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

// The account saved at the last sign-in or refresh, in the shape pages read
// (it's saved with avatarUrl), so pages can draw at once (login-24)
const savedUser = (): User | null => {
  const c = getStoredUser() as any
  if (!c?.id) return null
  return { ...c, avatar: c.avatar ?? c.avatarUrl ?? null, kycTier: Number(c.kycTier ?? 0) } as User
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Drawn from the saved account straight away when there is one (login-24)
  const [user, setUser] = useState<User | null>(() => (getAccessToken() ? savedUser() : null))
  const [isLoading, setIsLoading] = useState(() => !(getAccessToken() && savedUser()))
  const isAuthed = !!user

  const refreshUser = useCallback(async () => {
    try {
      // fresh: reading the account again after a change must not join an older read
      const data = await apiRequest<any>('/auth/me', { fresh: true })
      const u: User = data.user || data
      setUser(u)
      // (also what the next visit draws with before /auth/me answers: no balances or bank details)
      persistAuthSession({ user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, username: u.username, avatarUrl: u.avatar, role: u.role as any, referralCode: u.referralCode, isEmailVerified: u.isEmailVerified, createdAt: u.createdAt, kycStatus: u.kycStatus, kycTier: u.kycTier, hasEmail: u.hasEmail, country: u.country, isModerator: u.isModerator, walletAddress: u.walletAddress } as any })
      return u as any
    } catch {
      if (!getAccessToken()) {
        clearAuthSession()
        setUser(null)
      } else {
        const cached = savedUser()
        if (cached) setUser((prev) => prev || cached)
      }
    }
  }, [])

  const login = useCallback((payload: { user?: any; tokens?: { accessToken?: string; refreshToken?: string; rememberMe?: boolean } }) => {
    const { user: userData, tokens } = payload
    persistAuthSession({
      user: userData || undefined,
      tokens: tokens || undefined,
    })
    if (userData) {
      const mapped: User = {
        id: userData.id,
        username: userData.username || '',
        email: userData.email || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        displayName: userData.displayName || userData.firstName || '',
        avatar: userData.avatarUrl || userData.avatar || null,
        bio: userData.bio || null,
        role: userData.role || 'WORKER',
        isModerator: !!userData.isModerator,
        walletAddress: userData.walletAddress || null,
        walletProvider: userData.walletProvider || null,
        walletConnectedAt: userData.walletConnectedAt || null,
        referralCode: userData.referralCode || '',
        isEmailVerified: userData.isEmailVerified || false,
        hasEmail: userData.hasEmail !== false,
        isTwoFactorEnabled: userData.isTwoFactorEnabled || false,
        // /users/me sends the KYC record as `kyc`; kycStatus was always empty
        kycStatus: userData.kycStatus || userData.kyc?.status || null,
        kycTier: Number(userData.kyc?.kycTier ?? 0),
        country: userData.country || 'NG',
        onboardingComplete: userData.onboardingComplete || false,
        wallet: userData.wallet || {},
        bankAccount: userData.bankAccount || null,
        onboarding: userData.onboarding || { profileComplete: false, emailVerified: false, walletConnected: false, bankAdded: false, allComplete: false },
        _count: userData._count || { taskSubmissions: 0, tasksCreated: 0, referrals: 0 },
        createdAt: userData.createdAt || new Date().toISOString(),
      }
      setUser(mapped)
      // The sign-in response has no KYC level, so a verified user looked unverified
      // (wallet: "Verify your identity to withdraw") until the page was reloaded.
      // Load the full profile straight away.
      refreshUser()
    }
  }, [refreshUser])


  const updateUser = useCallback((partial: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...partial } : null)
  }, [])

  const logout = useCallback(async () => {
    // This device stops getting the account's alerts (while still signed in, so the server hears it)
    await dropPushOnSignOut()
    try {
      await apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: getRefreshToken() }) })
    } catch { /* ignore */ }
    try {
      if (localStorage.getItem('ogapay_auth_provider') === 'supabase') {
        const { supabase } = await import('../lib/supabaseClient')
        await supabase.auth.signOut()
      }
    } catch { /* ignore */ }
    clearAuthSession()
    setUser(null)
  }, [])

  useEffect(() => {
    let mounted = true
    const token = getAccessToken()
    // Signed in on this device before: pages draw at once with the saved account
    // and /auth/me refreshes it behind them. Protected pages used to show a
    // loader until it answered, seconds on slow data (login-24). A session the
    // server turns down still signs out (SESSION_EXPIRED_EVENT below).
    const cached = token ? savedUser() : null
    if (cached) {
      setUser(cached)
      setIsLoading(false)
      refreshUser()
    } else if (token) {
      refreshUser().finally(() => {
        if (mounted) setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
    return () => { mounted = false }
  }, [refreshUser])

  // The session couldn't be renewed (api.ts already cleared it): show the
  // signed-out state and ask to sign in again, back to the same page
  useEffect(() => {
    const onExpired = () => {
      // Pages behind sign-in redirect to /login, which shows this note
      try { sessionStorage.setItem('ogapay_session_ended', String(Date.now())) } catch { /* storage off */ }
      setUser(null)
      openSignIn({ notice: 'Your session ended. Please sign in again.', redirect: window.location.pathname + window.location.search })
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  useEffect(() => {
    document.body.setAttribute('data-auth', isAuthed ? 'authed' : 'public')
  }, [isAuthed])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthed,
      isLoading,
      login,
      refreshUser,
      updateUser,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
