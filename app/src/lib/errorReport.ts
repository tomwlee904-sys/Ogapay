// Error alerts through Sentry. Off unless VITE_SENTRY_DSN is set in Vercel, and
// even then the Sentry code is a separate file loaded after the page is up, so
// it costs nothing on first paint. Crashes caught by the error boundary are
// queued until it's ready. Addresses are sent without their query string (it
// can hold reset tokens, referral codes and search terms), and no cookies or
// form contents are sent.

import { isStaleBuildError } from './staleBuild'

type Sentry = typeof import('@sentry/browser')
let sentry: Sentry | null = null
const queue: unknown[] = []

const stripQuery = (url?: string) => (url ? url.split(/[?#]/)[0] : url)

export function reportError(error: unknown) {
  if (isStaleBuildError(error as Error)) return // an old page after a deploy: it reloads itself
  if (sentry) sentry.captureException(error)
  else if (import.meta.env.VITE_SENTRY_DSN && queue.length < 20) queue.push(error)
}

export function initErrorReporting() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  const start = () => import('@sentry/browser').then((S) => {
    S.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0,
      sendDefaultPii: false,
      // Noise that isn't a bug in OgaPay
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        /Failed to fetch dynamically imported module/,
        /Importing a module script failed/,
        /^Network ?Error$/i,
        /Load failed/,
      ],
      denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-extension:\/\//],
      beforeSend(event) {
        if (event.request) {
          event.request.url = stripQuery(event.request.url)
          delete event.request.cookies
          delete event.request.query_string
        }
        return event
      },
      beforeBreadcrumb(crumb) {
        if (crumb.data?.url) crumb.data.url = stripQuery(String(crumb.data.url))
        if (crumb.data?.from) crumb.data.from = stripQuery(String(crumb.data.from))
        if (crumb.data?.to) crumb.data.to = stripQuery(String(crumb.data.to))
        return crumb
      },
    })
    sentry = S
    queue.splice(0).forEach((e) => S.captureException(e))
  }).catch(() => { /* blocked by an ad blocker: no reports from this visitor */ })
  if ('requestIdleCallback' in window) (window as any).requestIdleCallback(start, { timeout: 4000 })
  else setTimeout(start, 2000)
}
