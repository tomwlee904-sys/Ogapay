import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import {
  apiRequest,
  AuthUser,
  clearAuthSession,
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
      setUser(nextUser)
      persistAuthSession({ user: nextUser })
      return nextUser
    } catch {
      clearAuthSession()
      setUser(null)
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
      await refreshUser()
      if (mounted) setLoading(false)
    }
    boot()
    return () => { mounted = false }
  }, [])

  const login = (payload: { user?: AuthUser; tokens?: { accessToken?: string; refreshToken?: string } }) => {
    persistAuthSession(payload)
    if (payload.user) setUser(payload.user)
  }

  const logout = async () => {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        })
      }
    } catch {
      // Local logout should still succeed if the API session is already gone.
    }
    clearAuthSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthed, user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
