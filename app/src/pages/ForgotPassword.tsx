import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/auth/AuthShell'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import { openSignIn } from '../lib/signin'

// Reset a forgotten password by email. Someone already signed in doesn't need a
// reset link: they change their password in Settings > Security.
export default function ForgotPassword() {
  const { isAuthed, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setMsg({ text: 'Enter the email on your account.', ok: false }); return }
    setBusy(true); setMsg(null)
    try {
      await apiRequest('/auth/forgot-password', { method: 'POST', auth: false, body: JSON.stringify({ email: email.trim() }) })
      setMsg({ text: 'If that email has an account, a reset link is on its way. Check your inbox.', ok: true })
    } catch (err: any) {
      setMsg({ text: err?.message || "Couldn't send the link. Please try again.", ok: false })
    }
    setBusy(false)
  }

  if (!isLoading && isAuthed) {
    return (
      <AuthShell eyebrow="Password" title="Reset your password" sub="You're signed in, so you don't need a reset link. Change your password in Settings, Security.">
        <Link to="/settings/security" className="ui-btn ui-btn-dark ui-btn-lg" style={{ width: '100%' }}>Change password</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell eyebrow="Password" title="Reset your password" sub="Enter the email address linked to your account and we'll send you a link to set a new password.">
      <form onSubmit={send} noValidate>
        <div className="as-field">
          <label className="ui-label" htmlFor="fp-email">Email</label>
          <input id="fp-email" className="ui-input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`as-alert${msg.ok ? ' ok' : ''}`}>{msg.text}</p>}
        <button type="submit" disabled={busy} className={`ui-btn ui-btn-dark ui-btn-lg${busy ? ' is-loading' : ''}`} style={{ width: '100%' }}>Send reset link</button>
      </form>
      <p className="as-links">
        <button type="button" className="ui-btn ui-btn-text" onClick={() => openSignIn({ view: 'email' })}>Back to sign in</button>
      </p>
    </AuthShell>
  )
}
