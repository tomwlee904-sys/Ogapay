import { useEffect, useState } from 'react'

/* Email codes (sign-in, sign-up, verify your email, add an email): the
   "Send a new code" countdown, shared by the sign-in sheet and EmailCodeBox. */

/** Seconds the server says to wait (429 with errors: [{ code: 'RETRY_AFTER', retryAfter }]) */
export function retryAfterOf(e: any): number {
  const hit = Array.isArray(e?.errors) ? e.errors.find((x: any) => x?.code === 'RETRY_AFTER') : null
  const n = Number(hit?.retryAfter)
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : 0
}

/** A code can be asked for again after a minute (the server's own gap) */
export const RESEND_SECONDS = 60

/** Counts down to when a new code can be asked for. wait(s) starts it. */
export function useResendTimer() {
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until <= Date.now()) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [until])
  const left = Math.max(0, Math.ceil((until - now) / 1000))
  const wait = (seconds: number) => { const t = Date.now(); setNow(t); setUntil(t + seconds * 1000) }
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  return { left, wait, label: left > 0 ? `Send a new code in ${clock}` : 'Send a new code' }
}
