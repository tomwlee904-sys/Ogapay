import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { Card, Row, type SectionProps } from './ui'

export default function Account({ me }: SectionProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const name = `${me.firstName || ''} ${me.lastName || ''}`.trim() || me.username

  const resend = async () => {
    setSending(true)
    try {
      await apiRequest('/auth/resend-verification', { method: 'POST' })
      toast(`Verification email sent to ${me.email}`, 'success')
    } catch (e: any) {
      toast(e?.message || "Couldn't send the email", 'error')
    }
    setSending(false)
  }

  const signOut = async () => {
    await logout()
    navigate('/')
  }

  return (
    <>
      <Card title="Profile">
        <div className="st2-profile">
          <span className="st2-avatar">{me.avatarUrl ? <img src={me.avatarUrl} alt="" /> : name.slice(0, 1).toUpperCase()}</span>
          <div className="st2-profile-t">
            <strong>{name}</strong>
            <span>@{me.username}</span>
          </div>
        </div>
        <div className="st2-actions">
          <Link className="up-btn primary" to="/edit-profile"><i className="ti ti-pencil" /> Edit profile</Link>
          <Link className="up-btn" to={`/user/${me.username}`}><i className="ti ti-external-link" /> View public profile</Link>
        </div>
      </Card>

      <Card title="Email">
        <Row
          title={me.email}
          sub={me.isEmailVerified
            ? <span className="st2-ok"><i className="ti ti-circle-check" /> Verified</span>
            : <span className="st2-warn"><i className="ti ti-alert-circle" /> Not verified. You won't get email alerts until you confirm it.</span>}
        >
          {!me.isEmailVerified && <button className="up-btn" onClick={resend} disabled={sending}>{sending ? 'Sending…' : 'Resend link'}</button>}
        </Row>
      </Card>

      <Card title="Sign out">
        <Row title="Sign out of OgaPay on this device">
          <button className="up-btn" onClick={signOut}><i className="ti ti-logout" /> Sign out</button>
        </Row>
      </Card>

      <DangerZone />
    </>
  )
}

// GET /users/me/delete-check
type DeleteCheck = {
  canDelete: boolean
  blockers: { code: string; message: string }[]
  confirmWith: 'password' | 'text'
}

// Delete account. The server refuses while the account still holds money or has
// open jobs, orders, disputes, etc., so ask it first and show what has to happen.
function DangerZone() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [check, setCheck] = useState<DeleteCheck | null>(null)
  const [checking, setChecking] = useState(false)
  const [secret, setSecret] = useState('') // the password, or the typed DELETE
  const [err, setErr] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = async (): Promise<DeleteCheck | null> => {
    setChecking(true)
    try {
      const c = await apiRequest<DeleteCheck>('/users/me/delete-check')
      setCheck(c)
      return c
    } catch (e: any) {
      setCheck(null)
      setErr(e?.message || "Couldn't check your account. Try again.")
      return null
    } finally {
      setChecking(false)
    }
  }

  const start = () => {
    setCheck(null)
    setSecret('')
    setErr('')
    setOpen(true)
    load()
  }
  const close = () => { if (!deleting) setOpen(false) }

  const byPassword = check?.confirmWith === 'password'
  const confirmed = byPassword ? secret.length > 0 : secret.trim() === 'DELETE'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!check?.canDelete || !confirmed || deleting) return
    setDeleting(true)
    setErr('')
    try {
      await apiRequest('/users/me', {
        method: 'DELETE',
        body: JSON.stringify(byPassword ? { password: secret } : { confirm: secret.trim() }),
      })
      setOpen(false)
      await logout()
      navigate('/')
    } catch (e: any) {
      // If something changed since the check (money arrived, a new order), the
      // refreshed list says what to do; otherwise show the error (e.g. wrong password)
      const fresh = await load()
      setErr(fresh && !fresh.canDelete ? '' : (e?.message || 'Failed to delete account'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Card title="Delete account" danger sub="Closes your account and signs you out everywhere. Withdraw your balance and finish your open jobs, orders and disputes first.">
        <button className="up-btn st2-danger-btn" onClick={start}><i className="ti ti-trash" /> Delete account</button>
      </Card>
      {open && (
        <div className="st2-overlay" onClick={close}>
          <form className="up-card st2-modal" role="dialog" aria-modal="true" aria-labelledby="st2-del" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h3 id="st2-del">Delete your account?</h3>
            <p>Your profile is taken down and you can't sign in again. Payment and KYC records are kept for as long as the law requires.</p>
            <p>To protect your money, an account can only be deleted when nothing is left on it: no wallet balance or funds on hold, no open jobs you posted, no withdrawals still processing, no unclaimed vault payouts, no undelivered store orders, no open disputes and no submitted work waiting for review.</p>

            {checking && !check && <p><i className="ti ti-loader-2" /> Checking your account…</p>}

            {check && !check.canDelete && (
              <div className="st2-blockers" role="alert">
                <strong>You can't delete your account yet</strong>
                <ul>{check.blockers.map((b, i) => <li key={`${b.code}-${i}`}>{b.message}</li>)}</ul>
              </div>
            )}

            {check?.canDelete && (
              <div className="st2-form st2-del-confirm">
                <span className="st2-ok"><i className="ti ti-circle-check" /> Nothing is left on your account.</span>
                <label className="st2-f">
                  <span>{byPassword ? 'Enter your password to confirm' : 'Type DELETE to confirm'}</span>
                  <input
                    type={byPassword ? 'password' : 'text'}
                    autoComplete={byPassword ? 'current-password' : 'off'}
                    placeholder={byPassword ? undefined : 'DELETE'}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    autoFocus
                  />
                </label>
              </div>
            )}

            {err && <div className="st2-err st2-del-err" role="alert">{err}</div>}

            <div className="st2-modal-actions">
              {!checking && !check && <button type="button" className="up-btn" onClick={() => { setErr(''); load() }}>Try again</button>}
              <button type="button" className="up-btn" onClick={close}>Cancel</button>
              <button type="submit" className="up-btn st2-danger-fill" disabled={deleting || !check?.canDelete || !confirmed}>{deleting ? 'Deleting…' : 'Delete account'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
