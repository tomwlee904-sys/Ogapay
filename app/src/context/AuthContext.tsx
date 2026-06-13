import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { apiRequest, getAccessToken, clearAuthSession, persistAuthSession } from '../lib/api'

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
  walletAddress: string | null
  walletProvider: string | null
  walletConnectedAt: string | null
  referralCode: string
  isEmailVerified: boolean
  kycStatus: string | null
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
  login: (payload: { user?: any; tokens?: { accessToken?: string; refreshToken?: string } }) => void
  refreshUser: () => Promise<void>
  updateUser: (partial: Partial<User>) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isAuthed = !!user

  const login = useCallback((payload: { user?: any; tokens?: { accessToken?: string; refreshToken?: string } }) => {
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
        walletAddress: userData.walletAddress || null,
        walletProvider: userData.walletProvider || null,
        walletConnectedAt: userData.walletConnectedAt || null,
        referralCode: userData.referralCode || '',
        isEmailVerified: userData.isEmailVerified || false,
        kycStatus: userData.kycStatus || null,
        onboardingComplete: userData.onboardingComplete || false,
        wallet: userData.wallet || {},
        bankAccount: userData.bankAccount || null,
        onboarding: userData.onboarding || { profileComplete: false, emailVerified: false, walletConnected: false, bankAdded: false, allComplete: false },
        _count: userData._count || { taskSubmissions: 0, tasksCreated: 0, referrals: 0 },
        createdAt: userData.createdAt || new Date().toISOString(),
      }
      setUser(mapped)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiRequest('/auth/me')
      const u: User = data.user || data
      setUser(u)
      persistAuthSession({ user: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, username: u.username, avatarUrl: u.avatar, role: u.role as any, referralCode: u.referralCode, isEmailVerified: u.isEmailVerified, createdAt: u.createdAt } })
      return u
    } catch {
      if (!getAccessToken()) {
        clearAuthSession()
        setUser(null)
      }
    }
  }, [])

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...partial } : null)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch { /* ignore */ }
    clearAuthSession()
    setUser(null)
  }, [])

  useEffect(() => {
    let mounted = true
    const token = getAccessToken()
    if (token) {
      refreshUser().finally(() => {
        if (mounted) setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
    return () => { mounted = false }
  }, [refreshUser])

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
