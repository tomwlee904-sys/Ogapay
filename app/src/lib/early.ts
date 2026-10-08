// On a first visit, index.html asks for the page's first public data before the
// page's code has loaded (build-plugins/routePreload.ts). The first request for
// one of those URLs gets that answer instead of asking again; it's handed out
// once, so later requests (refreshes, polling) go to the network as usual.

declare global {
  interface Window { __early?: Record<string, Promise<Response>> }
}

export function earlyFetch(url: string, init?: RequestInit): Promise<Response> {
  const waiting = typeof window !== 'undefined' ? window.__early?.[url] : undefined
  if (!waiting) return fetch(url, init)
  delete window.__early![url]
  // failed or timed out early: ask again the normal way
  return waiting.catch(() => fetch(url, init))
}
