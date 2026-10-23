import { useEffect, useState } from 'react'
import { apiRequest } from './api'

// One fetch shared by everything on screen. The top bar, the dock and pages
// each used to ask for the same thing (unread alerts, saved banks, the virtual
// account), and every page change asked again because each page draws its own
// Layout. Callers asking within `maxAgeMs` of the last answer get that answer,
// and callers asking at the same moment share one request.
type Entry = { at: number; value?: unknown; pending?: Promise<unknown> }
const cache = new Map<string, Entry>()

export function sharedGet<T>(path: string, maxAgeMs = 15000): Promise<T> {
  const e = cache.get(path)
  if (e?.pending) return e.pending as Promise<T>
  if (e && 'value' in e && Date.now() - e.at < maxAgeMs) return Promise.resolve(e.value as T)
  const pending = apiRequest<T>(path).then(
    (value) => { cache.set(path, { at: Date.now(), value }); return value },
    (err) => { cache.delete(path); throw err },
  )
  cache.set(path, { at: e?.at || 0, value: e?.value, pending })
  return pending
}

// Forget a cached answer after a change (a bank saved, alerts read)
export function dropShared(path?: string) {
  if (path) cache.delete(path)
  else cache.clear()
}

// ── Unread alerts, for the top bar and the dock ──
const UNREAD = '/notifications?limit=1&unreadOnly=true'
let unread = 0
const listeners = new Set<(n: number) => void>()
const setUnread = (n: number) => { unread = n; listeners.forEach((l) => l(n)) }

export async function refreshUnread(force = false) {
  if (force) dropShared(UNREAD)
  try {
    const data = await sharedGet<any>(UNREAD, 20000)
    setUnread(Number(data?.unreadCount) || 0)
  } catch { /* background check: keep the last count */ }
}

let timer: ReturnType<typeof setInterval> | null = null
const onFocus = () => { refreshUnread() }

// The unread count, checked when first shown, every 30 seconds and when the
// window gets focus, with one timer however many places show it
export function useUnreadCount(isAuthed: boolean) {
  const [n, setN] = useState(isAuthed ? unread : 0)
  useEffect(() => {
    if (!isAuthed) { setN(0); setUnread(0); dropShared(UNREAD); return }
    listeners.add(setN)
    setN(unread)
    refreshUnread()
    if (!timer) {
      timer = setInterval(() => refreshUnread(), 30000)
      window.addEventListener('focus', onFocus)
    }
    return () => {
      listeners.delete(setN)
      // Keep the timer through a page change (the next page's Layout picks it up)
      setTimeout(() => {
        if (!listeners.size && timer) { clearInterval(timer); timer = null; window.removeEventListener('focus', onFocus) }
      }, 1000)
    }
  }, [isAuthed])
  return n
}
