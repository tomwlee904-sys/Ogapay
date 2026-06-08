import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
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
});

/** Safely read a localStorage value */
function ls(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

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
      const roleOverride = ls('ogapay_role_override')
      if (roleOverride) {
        nextUser.role = roleOverride as any
      }
      setUser(nextUser)
      persistAuthSession({ user: nextUser })
      return nextUser
    } catch {
      // If /auth/me fails (401 on old Railway code), try Supabase fallback
      const authProvider = ls('ogapay_auth_provider')
      if (authProvider === 'supabase') {
        try {
          const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()
          if (!error && supabaseUser) {
            const meta = supabaseUser.user_metadata || {}
            const fullName = meta.full_name || meta.name || supabaseUser.email?.split('@')[0] || 'User'
            const parts = fullName.trim().split(/\s+/)
            const fallbackUser: AuthUser = {
              id: supabaseUser.id,
              email: supabaseUser.email || '',
              firstName: parts[0],
              lastName: parts.slice(1).join(' ') || '',
              username: supabaseUser.email?.split('@')[0] || '',
              avatarUrl: meta.avatar_url || meta.picture || null,
              role: 'WORKER',
              isEmailVerified: !!supabaseUser.email_confirmed_at,
            }
            setUser(fallbackUser)
            return fallbackUser
          }
        } catch {}
      }

      // If no access token left, clear session
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
      // If we have a Supabase provider flag but no refresh token, try Supabase first
      const authProvider = ls('ogapay_auth_provider')
      if (authProvider === 'supabase' && !getRefreshToken()) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            localStorage.setItem('ogapay_access_token', session.access_token)
            if (session.refresh_token) {
              localStorage.setItem('ogapay_refresh_token', session.refresh_token)
            }
          }
        } catch {}
      }

      if (!getRefreshToken() && !getAccessToken()) {
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
            setTimeout(() => reject(new Error('auth timeout')), 20000)
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
    const authProvider = ls('ogapay_auth_provider')
    clearAuthSession()
    setUser(null)
    try { localStorage.removeItem('ogapay_auth_provider') } catch {}
    try { localStorage.removeItem('ogapay_supabase_user') } catch {}

    // If using Supabase auth, sign out from Supabase too
    if (authProvider === 'supabase') {
      try { await supabase.auth.signOut() } catch {}
    } else {
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {})
      }
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthed, user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
