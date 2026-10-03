import { lazy, type ComponentType } from 'react'

// After a deploy, a tab opened earlier still runs the old version. When it opens
// another page it asks for that page's code under the old file names, which the
// new deploy no longer has ("Failed to fetch dynamically imported module").
// Reloading once loads the new version. The time check stops a reload loop if a
// file is genuinely missing.

const KEY = 'ogapay_reloaded_for_update'

export const isStaleBuildError = (e: unknown) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\w-]+ failed|Unable to preload CSS/i
    .test(String((e as any)?.message || e || ''))

// Reload unless we already did in the last 20 seconds; true if reloading
export function reloadForUpdate(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (Date.now() - last < 20000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch { /* storage off: still reload, once per page load */ }
  window.location.reload()
  return true
}

// React.lazy for pages: on a stale-version error, reload instead of failing
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() => load().catch((err) => {
    if (isStaleBuildError(err) && reloadForUpdate()) return new Promise<never>(() => {})
    throw err
  }))
}
