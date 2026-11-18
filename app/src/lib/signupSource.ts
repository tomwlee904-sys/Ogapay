// Where a new member came from (2026-11-18). On the first page load in this
// browser (any page) we keep the UTM tags, Google/Facebook click ids, a referral
// code from /ref/:code or ?ref=, the host of the site that sent them, the landing
// path and the time. Kept once (first touch) and sent as `signupSource` on every
// call that can make an account; the server saves it only on a new account.
// Storage may be off (private mode): then nothing is kept and nothing breaks.

const KEY = 'ogapay_signup_source'
const MAX = 200

export type SignupSource = Partial<Record<
  'utm_source' | 'utm_medium' | 'utm_campaign' | 'gclid' | 'fbclid' | 'ref' | 'referrer' | 'landing' | 'ts',
  string
>>

const cut = (v: string | null | undefined) => String(v || '').trim().slice(0, MAX)

function readNow(): SignupSource {
  const out: SignupSource = {}
  const params = new URLSearchParams(window.location.search)
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid'] as const) {
    const v = cut(params.get(k))
    if (v) out[k] = v
  }
  const path = window.location.pathname
  const fromPath = (path.match(/^\/ref\/([^/?#]+)/) || [])[1]
  const ref = cut(fromPath ? decodeURIComponent(fromPath) : params.get('ref') || params.get('referral')).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40)
  if (ref) out.ref = ref
  try {
    // Only the host ("t.me", "l.facebook.com"), never the full address
    const host = document.referrer ? new URL(document.referrer).hostname : ''
    if (host && host !== window.location.hostname) out.referrer = cut(host)
  } catch { /* no referrer */ }
  out.landing = cut(path)
  out.ts = new Date().toISOString()
  return out
}

/** Call once at start-up: keeps the first visit's details if none are kept yet. */
export function captureSignupSource() {
  try {
    if (localStorage.getItem(KEY)) return
    localStorage.setItem(KEY, JSON.stringify(readNow()))
  } catch { /* storage off */ }
}

/** The kept first-visit details, for account-creating calls (undefined if none). */
export function getSignupSource(): SignupSource | undefined {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return undefined
    const v = JSON.parse(raw)
    if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined
    const out: SignupSource = {}
    for (const [k, val] of Object.entries(v)) if (typeof val === 'string') (out as Record<string, string>)[k] = val.slice(0, MAX)
    return out
  } catch { return undefined }
}
