import { clearAllDrafts } from "./draft"

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || 'https://ogapay.app/api/v1').replace(/\/$/, '')

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
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  if (payload.user) localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
  if (accessToken || payload.user) localStorage.setItem(LEGACY_AUTH_KEY, 'true')
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(LEGACY_AUTH_KEY)
    localStorage.removeItem('ogapay_auth_provider')
    localStorage.removeItem('ogapay_supabase_user')
    // Clear user-session flags that could leak state between users
    localStorage.removeItem('ogapay_onboarding_collapsed')
    localStorage.removeItem('ogapay_is_new_user')
    localStorage.removeItem('ogapay_referral')
    // Clear remaining user-specific cached data that could leak between users
    localStorage.removeItem('ogapay_applied_jobs')
    localStorage.removeItem('ogapay_bookmarked')
    localStorage.removeItem('ogapay_bookmarked_posts')
    localStorage.removeItem('ogapay_bookmarks')
    localStorage.removeItem('ogapay_email_verified')
    localStorage.removeItem('ogapay_job_statuses')
    localStorage.removeItem('ogapay_kyc_document_url')
    localStorage.removeItem('ogapay_nudge_dismissed')
    localStorage.removeItem('ogapay_role_override')
    localStorage.removeItem('ogapay_task_history')
    localStorage.removeItem('ogapay_temp_pw')
    // Clear all user drafts
    clearAllDrafts()
    // Note: ogapay_remember_email is intentionally NOT cleared here
    // because it supports the "Remember Me" convenience feature allowing
    // the email field to pre-fill on the next login attempt.
    // Clear any Supabase persisted sessions
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.startsWith('supabase.auth.'))) {
        localStorage.removeItem(key)
      }
    }
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
  return json && 'data' in json ? json.data : json
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

  if (init.body && !(init.body instanceof FormData)) {
    // Auto-stringify plain objects (not FormData, URLSearchParams, or already-string)
    if (typeof init.body === 'object' && !(init.body instanceof URLSearchParams)) {
      requestHeaders.set('Content-Type', 'application/json')
      init.body = JSON.stringify(init.body)
    }
    // Pre-serialized JSON strings also need Content-Type set
    if (typeof init.body === 'string' && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json')
    }
  } else if (!requestHeaders.has('Content-Type') && !init.body) {
    // no body, no Content-Type needed
  }

  if (auth) {
    const token = getAccessToken()
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: requestHeaders, signal: controller.signal })
    clearTimeout(timeoutId)

  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw err
  }

  if (res.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await refreshAuthSession().catch(() => null)
    if (refreshed?.accessToken) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false })
    }
    // Don't clear auth on 401 — let AuthContext handle it.
  }

  return parseResponse(res)
}
