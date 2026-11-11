import { useEffect, useRef, useState, type FormEvent } from 'react'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { RESEND_SECONDS, retryAfterOf, useResendTimer } from '../../lib/emailCode'

/* Verify your email inside the app (ver-11, dash-18, 2026-11-11): send a code,
   type it here, done. The link in the old emails keeps working. A wallet
   account with no email yet adds one the same way (mode "add").
   look: the dashboard's small buttons, or the settings page's. */

interface Props {
  mode: 'verify' | 'add'
  email?: string
  look?: 'dashboard' | 'settings'
  onDone?: () => void
}

export default function EmailCodeBox({ mode, email = '', look = 'settings', onDone }: Props) {
  const { refreshUser } = useAuth()
  const [to, setTo] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'' | 'send' | 'check'>('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [done, setDone] = useState(false)
  const timer = useResendTimer()
  const codeRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (sent) codeRef.current?.focus() }, [sent])

  const btn = look === 'dashboard' ? 'db-step-btn' : 'up-btn'
  const primary = look === 'dashboard' ? 'db-step-btn' : 'up-btn primary'
  const target = mode === 'add' ? to.trim() : email

  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    if (mode === 'add' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) { setMsg({ ok: false, text: 'Check your email address. It should look like name@example.com.' }); return }
    setBusy('send'); setMsg(null)
    try {
      const r = await apiRequest<any>(mode === 'add' ? '/auth/email/add/request' : '/auth/verify-email/code/request', { method: 'POST', body: JSON.stringify(mode === 'add' ? { email: target } : {}) })
      if (r?.alreadyVerified) { await refreshUser(); setDone(true); onDone?.(); return }
      setSent(true); setCode('')
      timer.wait(RESEND_SECONDS)
      setMsg({ ok: true, text: `We sent a 6-digit code to ${target || 'your email'}. It works for 10 minutes. Not there? Check your spam folder.` })
    } catch (err: any) {
      // The server's reason, and a countdown when it says how long to wait (login-28)
      const wait = retryAfterOf(err)
      if (wait) { timer.wait(wait); setSent(true) }
      setMsg({ ok: false, text: err?.message || "Couldn't send the code. Please try again." })
    } finally { setBusy('') }
  }

  const check = async (e: FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) { setMsg({ ok: false, text: 'Enter the 6-digit code from the email.' }); return }
    setBusy('check'); setMsg(null)
    try {
      await apiRequest(mode === 'add' ? '/auth/email/add/confirm' : '/auth/verify-email/code/confirm', { method: 'POST', body: JSON.stringify(mode === 'add' ? { email: target, code } : { code }) })
      setDone(true)
      // The dashboard step and the menus update from the fresh account
      await refreshUser()
      onDone?.()
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || "That didn't work. Please try again." })
    } finally { setBusy('') }
  }

  if (done) return <p role="status" style={{ margin: '8px 0 0', color: 'var(--green)', fontSize: 13 }}><i className="ti ti-circle-check" aria-hidden="true" /> {mode === 'add' ? 'Email added and verified.' : 'Email verified.'}</p>

  const line = msg && <p role={msg.ok ? 'status' : 'alert'} style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.5, color: msg.ok ? 'var(--green)' : 'var(--red)' }}>{msg.text}</p>
  const row = { display: 'flex', flexWrap: 'wrap' as const, gap: 8, alignItems: 'center', marginTop: 8 }
  // 16px text, or iPhones zoom in when the field is tapped
  const input = { fontSize: 16, maxWidth: 240, minHeight: 40 }

  if (!sent) {
    return (
      <form onSubmit={send} noValidate>
        <div style={row}>
          {mode === 'add' && (
            <input className="ui-input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} aria-label="Your email address"
              placeholder="you@example.com" value={to} onChange={(e) => setTo(e.target.value)} style={input} />
          )}
          <button type="submit" className={primary} style={{ minHeight: 40, marginTop: 0 }} disabled={busy === 'send'}>{busy === 'send' ? 'Sending…' : mode === 'add' ? 'Send code' : 'Send me a code'}</button>
        </div>
        {line}
      </form>
    )
  }

  return (
    <form onSubmit={check} noValidate>
      {line}
      <div style={row}>
        <input ref={codeRef} className="ui-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" aria-label="6-digit code from the email"
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={{ ...input, maxWidth: 160, letterSpacing: '.2em' }} />
        <button type="submit" className={primary} style={{ minHeight: 40, marginTop: 0 }} disabled={busy === 'check' || code.length !== 6}>{busy === 'check' ? 'Checking…' : mode === 'add' ? 'Add email' : 'Verify'}</button>
        <button type="button" className={btn} style={{ minHeight: 40, marginTop: 0 }} disabled={busy === 'send' || timer.left > 0} onClick={() => send()}>{timer.label}</button>
        {mode === 'add' && <button type="button" className={btn} style={{ minHeight: 40, marginTop: 0 }} onClick={() => { setSent(false); setMsg(null) }}>Use another email</button>}
      </div>
    </form>
  )
}
