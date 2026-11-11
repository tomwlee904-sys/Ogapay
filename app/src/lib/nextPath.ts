// "Back to the job" after verifying (ver-10). A job's "Verify..." links carry
// ?next=/tasks/ID to Settings → Verification. Only a path on this site is ever
// followed: never another site (https://, //host, /\host) or a script.

const MAX = 200
// The job (or other page) to return to, and what the member had when they left it
const KEY = 'ogapay_verify_next'
const KEEP_MS = 2 * 3600 * 1000 // VeryAI and the ID check can take a while, or open another tab

export function safeNext(raw: string | null | undefined): string | null {
  const s = String(raw || '').trim()
  if (!s || s.length > MAX) return null
  // One leading slash, then a plain path (and query); no "//", no backslash, no scheme
  if (!/^\/(?![/\\])[A-Za-z0-9\-._~/?=&%]*$/.test(s)) return null
  if (s.includes('//') || /%2f%2f|%5c/i.test(s)) return null
  return s
}

// A link to `to` that comes back to `next` once done (the hash stays last)
export function withNext(to: string, next: string | null | undefined): string {
  const n = safeNext(next)
  if (!n) return to
  const [path, hash] = to.split('#')
  return `${path}${path.includes('?') ? '&' : '?'}next=${encodeURIComponent(n)}${hash ? `#${hash}` : ''}`
}

export type NextVisit = { path: string; tier: number; human: boolean; at: number }

// Kept in this browser, so the way back survives the trip to VeryAI or Didit
// (they come back without ?next, sometimes in another tab)
export function saveNext(v: Omit<NextVisit, 'at'>) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...v, at: Date.now() })) } catch { /* storage off */ }
}
export function readNext(now = Date.now()): NextVisit | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!v || now - Number(v.at) > KEEP_MS || !safeNext(v.path)) return null
    return { path: v.path, tier: Number(v.tier) || 0, human: !!v.human, at: Number(v.at) }
  } catch { return null }
}
export function clearNext() {
  try { localStorage.removeItem(KEY) } catch { /* storage off */ }
}
