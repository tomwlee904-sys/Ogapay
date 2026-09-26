import { useState } from 'react'
import { apiRequest } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../context/AuthContext'
import { Card, PrefRow, Row, type SectionProps } from './ui'

const strongEnough = (p: string) => p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p)

export default function Security(props: SectionProps) {
  const { toast } = useToast()
  return (
    <>
      <TwoFactor {...props} />
      <Password {...props} />
      <Card title="Sign-in alerts">
        <PrefRow {...props} toast={toast} k="loginAlerts" title="Email me when my account signs in on a new browser" sub="So you know straight away if someone else gets in" />
      </Card>
    </>
  )
}

function TwoFactor({ me, setMe }: SectionProps) {
  const { toast } = useToast()
  const { refreshUser } = useAuth()
  const [setup, setSetup] = useState<{ qrCode: string; secret: string; backupCodes: string[] } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null) // shown once after turning on
  const [disabling, setDisabling] = useState(false)

  const start = async () => {
    setBusy(true); setErr('')
    try {
      const r = await apiRequest<any>('/auth/2fa/setup')
      if (r?.alreadyEnabled) { setMe((m) => ({ ...m, isTwoFactorEnabled: true })); return }
      // The API returns "qrCode" (the old page read "qrCodeDataUrl", so the QR never showed)
      setSetup({ qrCode: r.qrCode, secret: r.secret, backupCodes: r.backupCodes || [] })
      setCode('')
    } catch (e: any) {
      toast(e?.message || "Couldn't start 2FA setup", 'error')
    } finally { setBusy(false) }
  }

  const enable = async () => {
    setBusy(true); setErr('')
    try {
      await apiRequest('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ token: code }) })
      setCodes(setup?.backupCodes || [])
      setSetup(null); setCode('')
      setMe((m) => ({ ...m, isTwoFactorEnabled: true }))
      refreshUser()
      toast('Two-factor authentication is on', 'success')
    } catch (e: any) {
      setErr(e?.message === 'Invalid 2FA code' ? "That code didn't match. Check the time on your phone and try the current code." : e?.message || 'Invalid code')
    } finally { setBusy(false) }
  }

  const disable = async () => {
    setBusy(true); setErr('')
    try {
      await apiRequest('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ token: code.trim() }) })
      setDisabling(false); setCode('')
      setMe((m) => ({ ...m, isTwoFactorEnabled: false }))
      refreshUser()
      toast('Two-factor authentication is off', 'success')
    } catch (e: any) {
      setErr(e?.message === 'Invalid 2FA code' ? "That code didn't match." : e?.message || 'Invalid code')
    } finally { setBusy(false) }
  }

  const copyCodes = () => {
    navigator.clipboard?.writeText((codes || []).join('\n')).then(() => toast('Backup codes copied', 'success')).catch(() => {})
  }
  const downloadCodes = () => {
    const blob = new Blob([`OgaPay backup codes for ${me.email}\nEach code works once.\n\n${(codes || []).join('\n')}\n`], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ogapay-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Card title="Two-factor authentication (2FA)" sub="A code from an authenticator app (Google Authenticator, Authy…) at sign-in, and before withdrawals and transfers.">
      <Row
        title="Status"
        sub={me.isTwoFactorEnabled ? <span className="st2-ok"><i className="ti ti-shield-check" /> On</span> : <span className="st2-muted">Off</span>}
      >
        {me.isTwoFactorEnabled
          ? !disabling && <button className="up-btn" onClick={() => { setDisabling(true); setCode(''); setErr('') }}>Turn off</button>
          : !setup && <button className="up-btn primary" onClick={start} disabled={busy}>{busy ? 'Preparing…' : 'Turn on'}</button>}
      </Row>

      {setup && (
        <div className="st2-panel">
          <ol className="st2-steps">
            <li>Scan this QR code with your authenticator app.</li>
            <li>Enter the 6-digit code it shows.</li>
          </ol>
          {setup.qrCode && <img className="st2-qr" src={setup.qrCode} alt="QR code for your authenticator app" />}
          <div className="st2-secret">Can't scan? Enter this key: <code>{setup.secret}</code></div>
          <form className="st2-inline" onSubmit={(e) => { e.preventDefault(); enable() }}>
            <input className="st2-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" aria-label="6-digit code" autoFocus />
            <button className="up-btn primary" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Turn on 2FA'}</button>
            <button type="button" className="up-btn" onClick={() => { setSetup(null); setErr('') }}>Cancel</button>
          </form>
          {err && <p className="st2-err">{err}</p>}
        </div>
      )}

      {codes && codes.length > 0 && (
        <div className="st2-panel">
          <strong>Save your backup codes</strong>
          <p className="st2-row-sub">If you lose your phone, each code lets you sign in once. They won't be shown again.</p>
          <div className="st2-codes">{codes.map((c) => <code key={c}>{c}</code>)}</div>
          <div className="st2-actions">
            <button className="up-btn" onClick={copyCodes}><i className="ti ti-copy" /> Copy</button>
            <button className="up-btn" onClick={downloadCodes}><i className="ti ti-download" /> Download</button>
            <button className="up-btn primary" onClick={() => setCodes(null)}>I've saved them</button>
          </div>
        </div>
      )}

      {disabling && (
        <div className="st2-panel">
          <p className="st2-row-sub">Enter a code from your authenticator app, or one of your backup codes, to turn 2FA off.</p>
          <form className="st2-inline" onSubmit={(e) => { e.preventDefault(); disable() }}>
            <input className="st2-code" autoComplete="one-time-code" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 10).toUpperCase())} placeholder="Code" aria-label="2FA or backup code" autoFocus />
            <button className="up-btn st2-danger-fill" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Turn off 2FA'}</button>
            <button type="button" className="up-btn" onClick={() => { setDisabling(false); setErr('') }}>Cancel</button>
          </form>
          {err && <p className="st2-err">{err}</p>}
        </div>
      )}
    </Card>
  )
}

function Password({ me, setMe }: SectionProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const has = me.hasPassword

  const submit = async () => {
    setErr('')
    if (!strongEnough(next)) return setErr('Use at least 8 characters, with an uppercase letter and a number.')
    if (next !== again) return setErr("The new passwords don't match.")
    setBusy(true)
    try {
      await apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(has ? { currentPassword: cur, newPassword: next } : { newPassword: next }) })
      toast(has ? 'Password changed. Other devices have been signed out.' : 'Password set. You can now sign in with your email too.', 'success')
      setMe((m) => ({ ...m, hasPassword: true }))
      setOpen(false); setCur(''); setNext(''); setAgain('')
    } catch (e: any) {
      setErr(e?.message || "Couldn't change your password")
    } finally { setBusy(false) }
  }

  return (
    <Card title="Password">
      <Row title={has ? 'Change your password' : 'Set a password'} sub={has ? 'Changing it signs you out on other devices.' : "You sign in with Google. Add a password to also sign in with your email."}>
        {!open && <button className="up-btn" onClick={() => setOpen(true)}>{has ? 'Change' : 'Set password'}</button>}
      </Row>
      {open && (
        <form className="st2-panel st2-form" onSubmit={(e) => { e.preventDefault(); submit() }}>
          {has && <label className="st2-f"><span>Current password</span><input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required /></label>}
          <label className="st2-f"><span>New password</span><input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required /></label>
          <label className="st2-f"><span>Confirm new password</span><input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required /></label>
          <p className="st2-row-sub">At least 8 characters, with an uppercase letter and a number.</p>
          {err && <p className="st2-err">{err}</p>}
          <div className="st2-actions">
            <button type="button" className="up-btn" onClick={() => { setOpen(false); setErr('') }}>Cancel</button>
            <button className="up-btn primary" disabled={busy}>{busy ? 'Saving…' : has ? 'Change password' : 'Set password'}</button>
          </div>
        </form>
      )}
    </Card>
  )
}
