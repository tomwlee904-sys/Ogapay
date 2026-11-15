import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Cloudflare Turnstile, the "are you human" check on sign-in, sign-up (email
// code) and forgot password. Off until VITE_TURNSTILE_SITE_KEY is set: then
// nothing renders and forms work as before. Tokens are single-use, so the form
// calls ref.reset() after every request that used one.

export const TURNSTILE_SITE_KEY: string = String(import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
export const turnstileOn = TURNSTILE_SITE_KEY.length > 0
// The API's answer when the check failed (backend turnstile.service)
export const isTurnstileError = (e: any) => e?.code === 'TURNSTILE_FAILED' || (Array.isArray(e?.errors) && e.errors.some((x: any) => x?.code === 'TURNSTILE_FAILED'))

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const LOAD_ERROR = "Couldn't load the human check. Check your connection and try again."

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}
declare global { interface Window { turnstile?: TurnstileApi } }

// The script loads once for the whole site; a failed load can be tried again
let loading: Promise<TurnstileApi> | null = null
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loading) return loading
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    const fail = () => { loading = null; document.querySelector(`script[src="${SCRIPT_SRC}"]`)?.remove(); reject(new Error(LOAD_ERROR)) }
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : fail())
    s.onerror = fail
    document.head.appendChild(s)
  })
  return loading
}

const currentTheme = (): 'dark' | 'light' => {
  const t = document.documentElement.getAttribute('data-theme')
  if (t === 'dark' || t === 'light') return t
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export type TurnstileHandle = { reset: () => void }
type Props = { onToken: (token: string) => void; onExpire?: () => void; action?: string }

const Turnstile = forwardRef<TurnstileHandle, Props>(function Turnstile({ onToken, onExpire, action }, ref) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState(currentTheme)
  const [attempt, setAttempt] = useState(0)
  // Latest callbacks without re-rendering the widget
  const cb = useRef({ onToken, onExpire })
  cb.current = { onToken, onExpire }

  // Follow the site's dark/light switch
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme(currentTheme()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => mo.disconnect()
  }, [])

  useEffect(() => {
    if (!turnstileOn) return
    let gone = false
    setError('')
    loadTurnstile().then((ts) => {
      if (gone || !box.current) return
      widget.current = ts.render(box.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme,
        size: 'flexible',
        ...(action ? { action } : {}),
        callback: (token: string) => { setError(''); cb.current.onToken(token) },
        'expired-callback': () => { cb.current.onToken(''); cb.current.onExpire?.() },
        'timeout-callback': () => { cb.current.onToken(''); cb.current.onExpire?.() },
        'error-callback': () => { cb.current.onToken(''); setError(LOAD_ERROR); return true },
      })
    }).catch(() => { if (!gone) setError(LOAD_ERROR) })
    return () => {
      gone = true
      // A removed widget's token is no use to the form any more
      cb.current.onToken('')
      if (widget.current && window.turnstile) { try { window.turnstile.remove(widget.current) } catch { /* already gone */ } }
      widget.current = null
    }
  }, [theme, attempt, action])

  const reset = useCallback(() => {
    cb.current.onToken('')
    if (widget.current && window.turnstile) { try { window.turnstile.reset(widget.current) } catch { setAttempt((a) => a + 1) } }
    else setAttempt((a) => a + 1)
  }, [])
  useImperativeHandle(ref, () => ({ reset }), [reset])

  if (!turnstileOn) return null
  return (
    <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <div ref={box} style={{ width: '100%', minHeight: error ? 0 : 65 }} />
      {error && (
        <p role="alert" style={{ fontSize: 13, margin: '6px 0 0', color: 'var(--red, #dc2626)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {error}
          <button type="button" onClick={() => { setError(''); setAttempt((a) => a + 1) }}
            style={{ background: 'none', border: 'none', padding: '6px 0', color: 'var(--text)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>
            Try again
          </button>
        </p>
      )}
    </div>
  )
})

export default Turnstile
