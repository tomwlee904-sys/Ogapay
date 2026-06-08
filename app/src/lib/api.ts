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
  // Support both nested tokens object and top-level accessToken/refreshToken
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
  console.log('[clearAuthSession] Clearing ALL auth data from localStorage - stack:', new Error().stack?.split('\n').slice(2,6).join(' | '))
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
  // Support both nested tokens object and top-level accessToken/refreshToken
  const tokenObj = data?.tokens || data
  if (tokenObj?.accessToken) {
    persistAuthSession({ tokens: tokenObj })
    return tokenObj
  }
  return null
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
    console.log('[apiRequest] 401 on', path, '- attempting refresh')
    const refreshed = await refreshAuthSession().catch(() => null)
    if (refreshed?.accessToken) {
      console.log('[apiRequest] Refresh succeeded for', path)
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false })
    }
    console.log('[apiRequest] Refresh failed for', path, '- clearing auth')
    clearAuthSession()
  }

  return parseResponse(res)
}
