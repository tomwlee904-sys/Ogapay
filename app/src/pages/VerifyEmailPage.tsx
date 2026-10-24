import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE, getAccessToken } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/auth/AuthShell'

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

  // The shared sign-in page frame: logo, card, no marketing footer
  const wrap = (children: React.ReactNode) => <AuthShell>{children}</AuthShell>

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
      {/* a real form, so Enter / Go on the keyboard sends it; the button stays
          enabled and says what's missing instead of greying out */}
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (!signedIn && !email.trim()) { setErr('Enter the email you signed up with.'); return } send() }}>
        {!signedIn && (
          <div className="as-field">
            <label className="ui-label" htmlFor="ve-email">Email</label>
            <input id="ve-email" className="ui-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        )}
        {err && <p role="alert" className="as-alert">{err}</p>}
        <button type="submit" className={`ui-btn ui-btn-dark ui-btn-lg${busy ? ' is-loading' : ''}`} style={{ width: '100%' }} disabled={busy}>Send verification link</button>
      </form>
      <p className="as-links">
        {signedIn ? <Link to="/dashboard" className="ui-btn ui-btn-text">Back to dashboard</Link> : <Link to="/login" className="ui-btn ui-btn-text">Sign in</Link>}
      </p>
    </>,
  )
}

