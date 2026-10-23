import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

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

  const btn = { height: 44, borderRadius: 10, background: 'var(--text)', color: 'var(--bg)', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', padding: '0 18px' } as const

  return (
    <Layout sidebar={false}>
      <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Reset your password</h1>
        {!isLoading && isAuthed ? (
          <>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
              You're signed in, so you don't need a reset link. Change your password in Settings, Security.
            </p>
            <Link to="/settings/security" style={btn}>Change password</Link>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
              Enter the email address linked to your account and we'll send you a password reset link.
            </p>
            <form onSubmit={send} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label htmlFor="fp-email" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Email</label>
                <input id="fp-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
              </div>
              {msg && <p role={msg.ok ? 'status' : 'alert'} style={{ fontSize: 13, margin: 0, color: msg.ok ? 'var(--green)' : 'var(--red, #dc2626)' }}>{msg.text}</p>}
              <button type="submit" disabled={busy} style={btn}>{busy ? 'Sending…' : 'Send reset link'}</button>
              <Link to="/login" className="tap" style={{ textAlign: 'center', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>Back to sign in</Link>
            </form>
          </>
        )}
      </div>
    </Layout>
  )
}
