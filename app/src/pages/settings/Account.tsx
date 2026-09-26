import { useState } from 'react'
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

// Delete account (the flow is being reworked separately to check for money
// still held on the account first)
function DangerZone() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await apiRequest('/users/me', { method: 'DELETE' })
      await logout()
      navigate('/')
    } catch (err: any) {
      toast(err.message || 'Failed to delete account', 'error')
    } finally {
      setDeleting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Card title="Delete account" danger sub="Closes your account and signs you out everywhere. Withdraw your balance first.">
        <button className="up-btn st2-danger-btn" onClick={() => setOpen(true)}><i className="ti ti-trash" /> Delete account</button>
      </Card>
      {open && (
        <div className="st2-overlay" onClick={() => setOpen(false)}>
          <div className="up-card st2-modal" role="dialog" aria-modal="true" aria-labelledby="st2-del" onClick={(e) => e.stopPropagation()}>
            <h3 id="st2-del">Delete your account?</h3>
            <p>Your profile is taken down and you can't sign in again. Payment and KYC records are kept for as long as the law requires.</p>
            <div className="st2-modal-actions">
              <button className="up-btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="up-btn st2-danger-fill" onClick={handleDeleteAccount} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete account'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
