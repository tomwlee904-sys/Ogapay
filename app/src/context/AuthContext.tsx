import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  apiRequest,
  AuthUser,
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  persistAuthSession,
} from '../lib/api'

interface AuthContextType {
  isAuthed: boolean
  user: AuthUser | null
  loading: boolean
  login: (payload: { user?: AuthUser; tokens?: { accessToken?: string; refreshToken?: string } }) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<AuthUser | null>
}

const AuthContext = createContext<AuthContextType>({
  isAuthed: false,
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [loading, setLoading] = useState(true)
  const isAuthed = Boolean(user)

  useEffect(() => {
    document.body.setAttribute('data-auth', isAuthed ? 'authed' : 'public')
  }, [isAuthed])

  const refreshUser = async () => {
    try {
      const nextUser = await apiRequest<AuthUser>('/auth/me')
      const roleOverride = localStorage.getItem('ogapay_role_override')
      if (roleOverride) {
        nextUser.role = roleOverride as any
      }
      setUser(nextUser)
      persistAuthSession({ user: nextUser })
      return nextUser
    } catch {
      // apiRequest clears auth on 401 + failed refresh, otherwise the error is a transient/server
      // blip and the session is still valid. Only log out if tokens are already gone.
      if (!getAccessToken()) {
        clearAuthSession()
        setUser(null)
      }
      return null
    }
  }

  useEffect(() => {
    let mounted = true
    const boot = async () => {
      if (!getRefreshToken()) {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
        return
      }
      try {
        await Promise.race([
          refreshUser(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('auth timeout')), 15000)
          ),
        ])
      } catch {
        if (!getAccessToken()) {
          clearAuthSession()
          if (mounted) setUser(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    boot()
    return () => { mounted = false }
  }, [])

  const login = (payload: { user?: AuthUser; tokens?: { accessToken?: string; refreshToken?: string } }) => {
    persistAuthSession(payload)
    if (payload.user) setUser(payload.user)
    setLoading(false)
  }

  const logout = async () => {
    clearAuthSession()
    setUser(null)
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthed, user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)