import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE, getAccessToken } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// Email verification is by link: the email has /verify-email?token=…&userId=….
// Without a valid link this page sends a new one: signed in, straight away;
// signed out, to the email typed (the answer is the same whether or not an
// account exists). It used to offer "send me a code", which the API never had.

type Step = 'checking' | 'resend' | 'sent' | 'success'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const signedIn = !!getAccessToken()
  const [step, setStep] = useState<Step>('checking')
  const [linkProblem, setLinkProblem] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userId = params.get('userId')
    if (!token || !userId) { setStep('resend'); return }
    fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          setStep('success')
          refreshUser?.()
          setTimeout(() => navigate('/dashboard'), 2500)
        } else {
          setLinkProblem(/expired/i.test(data.message || '') ? 'This link has expired.' : "This link doesn't work any more.")
          setStep('resend')
        }
      })
      .catch(() => { setLinkProblem("We couldn't check the link. Try again."); setStep('resend') })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setBusy(true); setErr('')
    try {
      const r = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(signedIn && { Authorization: `Bearer ${getAccessToken()}` }) },
        body: JSON.stringify(signedIn ? {} : { email: email.trim() }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.message || "Couldn't send the email. Try again.")
      if (/already verified/i.test(data.message || '')) { setStep('success'); setTimeout(() => navigate('/dashboard'), 1500); return }
      setMsg(data.message || 'Verification email sent')
      setStep('sent')
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
  }

  const wrap = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: 16, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="ui-card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>{children}</div>
    </div>
  )

  if (step === 'checking') {
    return wrap(<p style={{ margin: 0, fontSize: 14, color: 'var(--text2)', textAlign: 'center' }}><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, verticalAlign: -3, marginRight: 8 }} />Checking your link…</p>)
  }
  if (step === 'success') {
    return wrap(
      <div style={{ textAlign: 'center' }}>
        <i className="ti ti-circle-check" style={{ fontSize: 44, color: 'var(--green)' }} />
        <h1 style={{ margin: '10px 0 6px', fontSize: 20, fontWeight: 600 }}>Email verified</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)' }}>Taking you to your dashboard…</p>
      </div>,
    )
  }
  if (step === 'sent') {
    return wrap(
      <div style={{ textAlign: 'center' }}>
        <i className="ti ti-mail-check" style={{ fontSize: 44, color: 'var(--text)' }} />
        <h1 style={{ margin: '10px 0 6px', fontSize: 20, fontWeight: 600 }}>Check your email</h1>
        <p style={{ margin: '0 0 18px', fontSize: 13, lineHeight: 1.6, color: 'var(--text2)' }}>{msg.replace(/\.?$/, '.')} The link works for 24 hours.</p>
        <button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setStep('resend'); setMsg('') }}>Send another</button>
      </div>,
    )
  }

  return wrap(
    <>
      <span className="ui-eyebrow"><i className="ti ti-mail" /> Verify your email</span>
      <h1 style={{ margin: '8px 0 6px', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em' }}>{linkProblem || 'Get a verification link'}</h1>
      <p style={{ margin: '0 0 18px', fontSize: 13, lineHeight: 1.6, color: 'var(--text2)' }}>
        {signedIn
          ? <>We'll send a new link to <b style={{ color: 'var(--text)' }}>{user?.email || 'your email'}</b>.</>
          : 'Enter the email you signed up with and we’ll send a new link.'}
      </p>
      {!signedIn && (
        <div style={{ marginBottom: 14 }}>
          <label className="ui-label" htmlFor="ve-email">Email</label>
          <input id="ve-email" className="ui-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && email.trim()) send() }} placeholder="you@example.com" />
        </div>
      )}
      {err && <p role="alert" style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--red)' }}>{err}</p>}
      <button type="button" className="ui-btn ui-btn-dark ui-btn-lg" style={{ width: '100%' }} disabled={busy || (!signedIn && !email.trim())} onClick={send}>
        {busy ? 'Sending…' : 'Send verification link'}
      </button>
      <p style={{ margin: '16px 0 0', fontSize: 12.5, color: 'var(--text2)', textAlign: 'center' }}>
        {signedIn ? <Link to="/dashboard" style={{ color: 'var(--text)', fontWeight: 600 }}>Back to dashboard</Link> : <Link to="/login" style={{ color: 'var(--text)', fontWeight: 600 }}>Sign in</Link>}
      </p>
    </>,
  )
}

