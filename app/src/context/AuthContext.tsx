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
      console.log('[refreshUser] Calling /auth/me...')
      const nextUser = await apiRequest<AuthUser>('/auth/me')
      console.log('[refreshUser] /auth/me succeeded, user:', nextUser?.email || nextUser?.id)
      // If a role override is set (e.g. after manual upgrade), preserve it
      const roleOverride = localStorage.getItem('ogapay_role_override')
      if (roleOverride) {
        nextUser.role = roleOverride as any
      }
      setUser(nextUser)
      persistAuthSession({ user: nextUser })
      return nextUser
    } catch {
      console.log('[refreshUser] /auth/me FAILED -> clearing auth, tokens:', 
        'accessToken:', !!localStorage.getItem('ogapay_access_token'),
        'refreshToken:', !!localStorage.getItem('ogapay_refresh_token'),
        'user:', !!localStorage.getItem('ogapay_user'))
      clearAuthSession()
      setUser(null)
      return null
    }
  }

  useEffect(() => {
    let mounted = true
    const boot = async () => {
      if (!getRefreshToken()) {
        // If no refresh token but we have an access token, copy it
        const accessFallback = getAccessToken()
        if (accessFallback) {
          console.log('[AuthBoot] No refresh token, using access token as fallback')
          localStorage.setItem(REFRESH_TOKEN_KEY, accessFallback)
        } else {
          console.log('[AuthBoot] No token at all -> setting user=null')
          if (mounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }
      }
      console.log('[AuthBoot] Calling refreshUser (5s timeout)...')
      try {
        // 5s timeout so a hanging API never blocks the app forever
        await Promise.race([
          refreshUser(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('auth timeout')), 5000)
          ),
        ])
        console.log('[AuthBoot] refreshUser completed OK')
      } catch {
        console.log('[AuthBoot] refreshUser failed/timeout -> clearing auth')
        clearAuthSession()
        if (mounted) setUser(null)
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
