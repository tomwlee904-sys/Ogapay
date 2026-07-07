const DRAFT_PREFIX = 'ogapay_draft_'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function saveDraft(key: string, data: Record<string, any>, userId?: string) {
  try {
    const storageKey = userId ? `${DRAFT_PREFIX}${key}_${userId}` : `${DRAFT_PREFIX}${key}`
    const payload = { data, savedAt: Date.now() }
    localStorage.setItem(storageKey, JSON.stringify(payload))
  } catch { /* quota exceeded or blocked */ }
}

export function loadDraft(key: string, userId?: string): { data: Record<string, any>; savedAt: number } | null {
  try {
    const storageKey = userId ? `${DRAFT_PREFIX}${key}_${userId}` : `${DRAFT_PREFIX}${key}`
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.data || !parsed.savedAt) return null
    // Discard if older than 7 days
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(storageKey)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearDraft(key: string, userId?: string) {
  try {
    const storageKey = userId ? `${DRAFT_PREFIX}${key}_${userId}` : `${DRAFT_PREFIX}${key}`
    localStorage.removeItem(storageKey)
  } catch {}
}

export function clearAllDrafts(userId?: string) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith(DRAFT_PREFIX)) {
        // If userId is provided, only clear drafts matching that user
        if (!userId || k.endsWith(`_${userId}`)) {
          localStorage.removeItem(k)
        }
      }
    }
  } catch {}
}
