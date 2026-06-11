export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || 'https://ogapay-production.up.railway.app/api/v1').replace(/\/$/, '')

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type AuthUser = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  username?: string
  avatarUrl?: string | null
  role?: 'WORKER' | 'POSTER' | 'ADMIN'
  referralCode?: string
  isEmailVerified?: boolean
  createdAt?: string
}

type ApiOptions = RequestInit & {
  auth?: boolean
  retryOnUnauthorized?: boolean
}

const ACCESS_TOKEN_KEY = 'ogapay_access_token'
const REFRESH_TOKEN_KEY = 'ogapay_refresh_token'
const USER_KEY = 'ogapay_user'
const LEGACY_AUTH_KEY = 'ogapay-authenticated'

let refreshInProgress: Promise<AuthTokens | null> | null = null

export function getAccessToken() {
  try { return localStorage.getItem(ACCESS_TOKEN_KEY) } catch { return null }
}

export function getRefreshToken() {
  try { return localStorage.getItem(REFRESH_TOKEN_KEY) } catch { return null }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function persistAuthSession(payload: { user?: AuthUser; tokens?: Partial<AuthTokens>; accessToken?: string; refreshToken?: string }) {
  const tokens = payload.tokens || {}
  const accessToken = tokens.accessToken || (payload as any).accessToken || ''
  const refreshToken = tokens.refreshToken || (payload as any).refreshToken || ''
  console.log('[persistAuthSession] Storing - user?', !!payload.user, 'accessToken?', !!accessToken, 'refreshToken?', !!refreshToken)
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  if (payload.user) localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
  if (accessToken || payload.user) localStorage.setItem(LEGACY_AUTH_KEY, 'true')
}

export function clearAuthSession() {
  console.log('[clearAuthSession] Clearing ALL auth data from localStorage')
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(LEGACY_AUTH_KEY)
    localStorage.removeItem('ogapay_auth_provider')
    localStorage.removeItem('ogapay_supabase_user')
  } catch {}
}

/** Safely read localStorage value */
function ls(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

async function parseResponse(res: Response) {
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) {
    const message = json?.message || json?.error || 'Request failed'
    throw new Error(message)
  }
  return json?.data ?? json
}

/**
 * Try to refresh the auth session.
 * First tries backend /auth/refresh (for backend JWTs).
 * If that fails and auth_provider is 'supabase', tries Supabase SDK refresh.
 */
export async function refreshAuthSession(): Promise<AuthTokens | null> {
  if (refreshInProgress) return refreshInProgress

  refreshInProgress = (async () => {
    const isSupabase = ls('ogapay_auth_provider') === 'supabase'

    if (isSupabase) {
      try {
        const supabaseModule = await import('../lib/supabaseClient')
        const { data: { session }, error } = await supabaseModule.supabase.auth.refreshSession()
        if (!error && session) {
          localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token)
          if (session.refresh_token) {
            localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token)
          }
          console.log('[refreshAuthSession] Supabase refresh succeeded')
          return { accessToken: session.access_token, refreshToken: session.refresh_token }
        }
      } catch (e) {
        console.warn('[refreshAuthSession] Supabase refresh failed:', e)
      }
    }

    // Fallback to backend refresh
    const refreshToken = getRefreshToken()
    if (!refreshToken) return null

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await parseResponse(res)
      const tokenObj = data?.tokens || data
      if (tokenObj?.accessToken) {
        persistAuthSession({ tokens: tokenObj })
        return tokenObj
      }
    } catch {
      // Both methods failed
    }
    return null
  })()

  refreshInProgress.finally(() => { refreshInProgress = null })
  return refreshInProgress
}

export async function apiRequest<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, retryOnUnauthorized = true, headers, ...init } = options
  const requestHeaders = new Headers(headers)

  if (!requestHeaders.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (auth) {
    const token = getAccessToken()
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, { ...init, headers: requestHeaders, signal: controller.signal })
    clearTimeout(timeoutId)

  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw err
  }

  if (res.status === 401 && auth && retryOnUnauthorized) {
    console.log('[apiRequest] 401 on', path, '- attempting refresh')
    const refreshed = await refreshAuthSession().catch(() => null)
    if (refreshed?.accessToken) {
      console.log('[apiRequest] Refresh succeeded for', path)
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false })
    }
    console.log('[apiRequest] Refresh failed for', path, '- keeping user data, not clearing auth')
    // Don't clear auth on 401 — let the AuthContext handle it.
    // The 401 may be because the backend doesn't recognize the token (old Railway code).
    // If auth_provider is supabase, the user should still be considered logged in.
    if (ls('ogapay_auth_provider') !== 'supabase') {
      clearAuthSession()
    }
  }

  return parseResponse(res)
}
