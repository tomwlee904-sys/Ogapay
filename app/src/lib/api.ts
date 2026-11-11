import { earlyFetch } from './early'
import { clearAllDrafts } from "./draft"

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || 'https://ogapay.app/api/v1').replace(/\/$/, '')

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  /** From the server: false = "Remember me" was unticked (ends when the browser closes) */
  rememberMe?: boolean
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
  /** Give up after this long (ms). Most requests get 15 s; photo uploads on
   *  slow mobile data need longer (2026-11-01). */
  timeoutMs?: number
  /** Always send a new request, never join one already on its way (e.g. reading
   *  the account again right after a change). */
  fresh?: boolean
}

export const REQUEST_TIMEOUT_MS = 15000
/** Wait before the one retry of a failed session renewal (well inside the server's 60 s) */
export const REFRESH_RETRY_DELAY_MS = 1500

const ACCESS_TOKEN_KEY = 'ogapay_access_token'
const REFRESH_TOKEN_KEY = 'ogapay_refresh_token'
const USER_KEY = 'ogapay_user'
const LEGACY_AUTH_KEY = 'ogapay-authenticated'

let refreshInProgress: Promise<AuthTokens | null> | null = null
// Set when the server turned the refresh token down (not a network blip)
let refreshRejected = false

/** Fired when the session can't be renewed; AuthContext signs out and asks to sign in again */
export const SESSION_EXPIRED_EVENT = 'ogapay:session-expired'

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

// "Remember me" unticked (2026-11-11): the server gives a 1-day session and the
// website drops it when the browser closes. A cookie without an expiry date is
// shared by every tab and is gone once the browser closes; the flag says this
// sign-in needs it. Tokens stay in localStorage like any other session.
const SHORT_SESSION_KEY = 'ogapay_short_session'
const SESSION_COOKIE = 'ogapay_sess'

function setShortSession(short: boolean) {
  try {
    if (short) {
      localStorage.setItem(SHORT_SESSION_KEY, '1')
      document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
    } else {
      localStorage.removeItem(SHORT_SESSION_KEY)
      document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`
    }
  } catch { /* storage blocked */ }
}

/** A "don't remember me" sign-in whose browser was closed since */
export function shortSessionEnded(): boolean {
  try {
    return localStorage.getItem(SHORT_SESSION_KEY) === '1' && !document.cookie.split(/;\s*/).includes(`${SESSION_COOKIE}=1`)
  } catch { return false }
}

export function persistAuthSession(payload: { user?: AuthUser; tokens?: Partial<AuthTokens>; accessToken?: string; refreshToken?: string }) {
  const tokens = payload.tokens || {}
  const accessToken = tokens.accessToken || (payload as any).accessToken || ''
  const refreshToken = tokens.refreshToken || (payload as any).refreshToken || ''
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  if (payload.user) localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
  if (accessToken || payload.user) localStorage.setItem(LEGACY_AUTH_KEY, 'true')
  // The server says how long this sign-in lasts (sign-in and refresh replies).
  // A new sign-in from a path without the box (Google, wallet) is a normal one.
  if (typeof tokens.rememberMe === 'boolean') setShortSession(!tokens.rememberMe)
  else if (refreshToken && payload.user) setShortSession(false)
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
    setShortSession(false)
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

// "Remember me" was unticked and the browser was closed since: sign out before
// anything reads the tokens, and tell the server (best effort; it ends by itself within a day)
export function endClosedShortSession() {
  if (!shortSessionEnded()) return false
  const access = getAccessToken()
  const refreshToken = getRefreshToken()
  clearAuthSession()
  if (access && refreshToken) {
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }
  return true
}
endClosedShortSession()

/** Safely read localStorage value */
function ls(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

/** Shown when the answer isn't from OgaPay's server (a 502/504 page while it restarts) */
export const BUSY_MESSAGE = 'OgaPay is busy right now. Please try again in a minute.'

async function parseResponse(res: Response) {
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // An HTML error page used to show as "Unexpected token '<'" (2026-11-10)
    if (!res.ok || /^\s*</.test(text)) {
      const err: Error & { status?: number } = new Error(BUSY_MESSAGE)
      err.status = res.status
      throw err
    }
    return text
  }
  if (!res.ok) {
    let message = json?.message || json?.error || 'Request failed'
    // "Validation failed" alone doesn't say what to fix: add the server's reason
    // (validate.js sends errors: [{ field, message }])
    const first = Array.isArray(json?.errors) ? json.errors.find((e: any) => e?.message) : null
    if (/^validation failed$/i.test(message) && first) {
      const field = String(first.field || '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()
      message = field ? `Check your ${field}: ${String(first.message).replace(/^String /, '')}` : String(first.message)
    }
    // The status and any data the server sent with the error ride along, e.g. the
    // new quote when a conversion's rate moved (409) (2026-11-01)
    const err: Error & { status?: number; data?: any; errors?: any[]; code?: string } = new Error(message)
    err.status = res.status
    if (json?.data !== undefined) err.data = json.data
    // A top-level reason code, e.g. PRICE_CHANGED when a store price moved (2026-11-08)
    if (typeof json?.code === 'string') err.code = json.code
    // and the reason codes, e.g. RULES_REQUIRED: the rules aren't accepted yet (2026-11-01)
    if (Array.isArray(json?.errors)) err.errors = json.errors
    throw err
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
    refreshRejected = false
    const refreshToken = getRefreshToken()
    if (!refreshToken) { refreshRejected = true; return null }

    // A reply lost on bad data is tried once more: the server gives the same new
    // pair for the same token for 60 s (auth.service refreshTokens, 2026-11-11)
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, REFRESH_RETRY_DELAY_MS))
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          signal: controller.signal,
        })
        if (res.status === 401 || res.status === 403) {
          // Each refresh token works once. If another tab renewed the session
          // meanwhile, use what it stored instead of signing out.
          const now = getRefreshToken()
          const access = getAccessToken()
          if (now && now !== refreshToken && access) return { accessToken: access, refreshToken: now }
          refreshRejected = true
          return null
        }
        const data = await parseResponse(res)
        const tokenObj = data?.tokens || data
        if (tokenObj?.accessToken) {
          persistAuthSession({ tokens: tokenObj })
          return tokenObj
        }
        return null
      } catch {
        // Network trouble or a server restart (502 page): try once more, then
        // keep the session and try again next time
      } finally {
        clearTimeout(timer)
      }
    }
    return null
  })()

  refreshInProgress.finally(() => { refreshInProgress = null })
  return refreshInProgress
}

const urlOf = (path: string) => path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`

// Identical signed-in GETs asked for at the same moment share one request
// (2026-11-07): the menu, the providers and the page each asked for /users/me or
// /wallet/balance at once. Keyed on the address and the token, so two accounts
// never share. Only plain GETs (no body, headers or other options) join; any other
// request (a save) empties the table when it starts and ends, so a fresh read
// after a change never gets an answer that began before it. A joined call uses
// the first caller's time limit.
const inFlight = new Map<string, Promise<unknown>>()

// Each caller gets its own copy, so one changing the answer can't change another's
function copyOf<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  try { return structuredClone(value) } catch { return JSON.parse(JSON.stringify(value)) }
}

/** A save sent with a plain fetch (not apiRequest): reads started before it
 *  must not be shared with reads made after it. */
export function invalidateInFlight() {
  inFlight.clear()
}

export async function apiRequest<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, retryOnUnauthorized = true, method, fresh = false, ...rest } = options
  if ((method || 'GET').toUpperCase() !== 'GET') {
    inFlight.clear()
    return sendRequest<T>(path, options).finally(() => inFlight.clear())
  }
  const token = auth ? getAccessToken() : null
  // Signed out, index.html's early answers (lib/early.ts) already cover it
  if (fresh || !token || Object.keys(rest).some((k) => k !== 'timeoutMs')) return sendRequest<T>(path, options)
  const key = `${retryOnUnauthorized ? 1 : 0} ${token} ${urlOf(path)}`
  let pending = inFlight.get(key)
  if (!pending) {
    const p = sendRequest<T>(path, options)
    const drop = () => { if (inFlight.get(key) === p) inFlight.delete(key) }
    p.then(drop, drop)
    inFlight.set(key, p)
    pending = p
  }
  return pending.then((v) => copyOf(v as T))
}

async function sendRequest<T>(path: string, options: ApiOptions): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { auth = true, retryOnUnauthorized = true, timeoutMs, headers, fresh: _fresh, ...init } = options
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

  const sentToken = auth ? getAccessToken() : null
  if (sentToken) requestHeaders.set('Authorization', `Bearer ${sentToken}`)

  const url = urlOf(path)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs && timeoutMs > 0 ? timeoutMs : REQUEST_TIMEOUT_MS)
  let res: Response;
  try {
    // A signed-out GET may already have been asked for by index.html (lib/early.ts)
    const plainGet = !sentToken && !init.body && (init.method || 'GET').toUpperCase() === 'GET'
    res = await (plainGet ? earlyFetch : fetch)(url, { ...init, headers: requestHeaders, signal: controller.signal })
    clearTimeout(timeoutId)

  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error('Request timed out')
    }
    throw err
  }

  if (res.status === 401 && sentToken && retryOnUnauthorized) {
    // Another request or tab may already have renewed the session
    const current = getAccessToken()
    if (current && current !== sentToken) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false })
    }
    const refreshed = await refreshAuthSession().catch(() => null)
    if (refreshed?.accessToken) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false })
    }
    // The server turned the session down for good (expired, signed out
    // elsewhere): sign out cleanly instead of showing empty pages and $0.00
    if (refreshRejected && getAccessToken() === sentToken && !/^\/?auth\/(login|register|2fa|verify)/.test(path.replace(API_BASE, ''))) {
      clearAuthSession()
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }
  }

  return parseResponse(res)
}
