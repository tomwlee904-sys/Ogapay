import type { AuthTokens, AuthUser } from './types'

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || 'https://ogapay-production.up.railway.app/api/v1').replace(/\/$/, '')

// Re-export for backward compat
export type { AuthTokens, AuthUser }

type ApiOptions = RequestInit & {
  auth?: boolean
  retryOnUnauthorized?: boolean
}

const ACCESS_TOKEN_KEY = 'ogapay_access_token'
const REFRESH_TOKEN_KEY = 'ogapay_refresh_token'
const USER_KEY = 'ogapay_user'
const LEGACY_AUTH_KEY = 'ogapay-authenticated'

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

export function persistAuthSession(payload: { user?: AuthUser; tokens?: Partial<AuthTokens> }) {
  const tokens = payload.tokens || {}
  if (tokens.accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  if (tokens.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  if (payload.user) localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
  if (tokens.accessToken || payload.user) localStorage.setItem(LEGACY_AUTH_KEY, 'true')
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(LEGACY_AUTH_KEY)
  } catch {}
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

export async function refreshAuthSession() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const data = await parseResponse(res)
  if (data?.tokens) persistAuthSession({ tokens: data.tokens })
  return data?.tokens || null
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
  const res = await fetch(url, { ...init, headers: requestHeaders })

  if (res.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await refreshAuthSession().catch(() => null)
    if (refreshed?.accessToken) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false })
    }
    clearAuthSession()
  }

  return parseResponse(res)
}
