import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'

export default function Settings() {
  const navigate = useNavigate()
  const { logout, isAuthed } = useAuth()

  // ── loading state ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)

  // ── toggles (API-backed) ───────────────────────────────────────────────────
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPublic, setSavingPublic] = useState(false)

  // ── toggles (API-backed) ───────────────────────────────────────────────────
  const [pushNotifications, setPushNotifications] = useState(false)
  const [currency, setCurrency] = useState('NGN')
  const [savingPush, setSavingPush] = useState(false)

  // ── password ───────────────────────────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // ── 2FA ───────────────────────────────────────────────────────────────────
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  // ── delete account ─────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── fetch user preferences on mount ────────────────────────────────────────
  useEffect(() => {
    if (!isAuthed) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const data: any = await apiRequest('/users/me')
        if (data) {
          setEmailNotifications(data.emailNotifications ?? false)
          setIsPublic(data.isPublic ?? false)
          setTwoFactorEnabled(data.twoFactorEnabled ?? false)
          setPushNotifications(data.pushNotifications ?? false)
          setCurrency(data.currency ?? 'NGN')
        }
      } catch {
        showToast('Failed to load settings', 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [isAuthed])

  // ── email notifications toggle ────────────────────────────────────────────
  const handleEmailToggle = async () => {
    const next = !emailNotifications
    setEmailNotifications(next)
    setSavingEmail(true)
    try {
      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ emailNotifications: next }),
      })
      showToast('Settings saved!', 'success')
    } catch (err: any) {
      setEmailNotifications(!next)
      showToast(err.message || 'Failed to save setting', 'error')
    } finally {
      setSavingEmail(false)
    }
  }

  // ── public profile toggle ─────────────────────────────────────────────────
  const handlePublicToggle = async () => {
    const next = !isPublic
    setIsPublic(next)
    setSavingPublic(true)
    try {
      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ isPublic: next }),
      })
      showToast('Settings saved!', 'success')
    } catch (err: any) {
      setIsPublic(!next)
      showToast(err.message || 'Failed to save setting', 'error')
    } finally {
      setSavingPublic(false)
    }
  }

  // ── push notifications toggle (API-backed) ─────────────────────────────────
  const handlePushToggle = async () => {
    const next = !pushNotifications
    setPushNotifications(next)
    setSavingPush(true)
    try {
      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ pushNotifications: next }),
      })
      showToast('Settings saved!', 'success')
    } catch (err: any) {
      setPushNotifications(!next)
      showToast(err.message || 'Failed to save setting', 'error')
    } finally {
      setSavingPush(false)
    }
  }

  // ── currency selector (API-backed) ────────────────────────────────────────
  const handleCurrencyChange = async (c: string) => {
    const prev = currency
    setCurrency(c)
    try {
      await apiRequest('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ currency: c }),
      })
      showToast('Settings saved!', 'success')
    } catch (err: any) {
      setCurrency(prev)
      showToast(err.message || 'Failed to save setting', 'error')
    }
  }

  // ── password change ────────────────────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setChangingPassword(true)
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setPasswordSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
      showToast('Password updated successfully', 'success')
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password')
      showToast(err.message || 'Failed to change password', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  // ── logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // ── delete account ─────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await apiRequest('/users/me', { method: 'DELETE' })
      await logout()
      navigate('/')
    } catch (err: any) {
      showToast(err.message || 'Failed to delete account', 'error')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // ── toggle switch component ────────────────────────────────────────────────
  const Toggle = ({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) => (
    <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, opacity: disabled ? 0.55 : 1 }}>
      <input
        type="checkbox"
        checked={on}
        onChange={onChange}
        disabled={disabled}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute', margin: 0 }}
      />
      <span
        style={{
          position: 'absolute', cursor: disabled ? 'not-allowed' : 'pointer', inset: 0,
          background: on ? 'var(--accent)' : 'var(--border)',
          borderRadius: 11, transition: 'background .2s',
        }}
      >
        <span
          style={{
            position: 'absolute', left: on ? 20 : 2, top: 2,
            width: 18, height: 18, borderRadius: '50%',
            background: '#fff', transition: 'left .2s',
          }}
        />
      </span>
    </label>
  )

  // ── spinner ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="loading">
          <div className="spinner" />
          Loading settings…
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <style>{`
        .st-hero{margin-bottom:20px}
        .st-hero h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0 0 4px}
        .st-hero p{color:var(--text2);font-size:14px;margin:0}
        .st-sections{display:grid;gap:14px}
        .st-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;transition:all .25s}
        .st-card:hover{border-color:var(--border2)}
        .st-card-title{font-weight:800;font-size:14px;margin-bottom:16px;display:flex;align-items:center;gap:8px}
        .st-card-title i{color:var(--accent)}
        .st-field{margin-bottom:14px}
        .st-divider{border:0;border-top:1px solid var(--border);margin:16px 0}
        .st-btn{border-radius:10px;border:0;cursor:pointer;font-family:inherit;transition:all .2s;display:inline-flex;align-items:center;gap:6px;justify-content:center}
        .st-btn:disabled{opacity:0.5;cursor:not-allowed}
        .st-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;z-index:999;opacity:0;transition:all .3s;pointer-events:none;white-space:nowrap}
        .st-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
        .st-toast.success{background:var(--green);color:#fff}
        .st-toast.error{background:var(--red);color:#fff}
        .st-text-red{color:var(--red);font-size:12px;margin:6px 0}
        .st-text-green{color:var(--green);font-size:12px;margin:6px 0}
        .st-danger-card{border-color:rgba(220,38,38,0.3)!important}
      `}</style>

      <div className="st-hero">
        <h1>Settings</h1>
        <p>Manage your account preferences and security</p>
      </div>

      <div className="st-sections">
        {/* ── Preferences ──────────────────────────────────────────────────── */}
        <div className="st-card">
          <div className="st-card-title"><i className="ti ti-settings" /> Preferences</div>

          {/* Email Notifications */}
          <div className="st-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Email Notifications</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Receive email updates about tasks and earnings</div>
            </div>
            <Toggle on={emailNotifications} onChange={handleEmailToggle} disabled={savingEmail} />
          </div>

          {/* Public Profile */}
          <div className="st-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Public Profile</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Make your profile visible to everyone</div>
            </div>
            <Toggle on={isPublic} onChange={handlePublicToggle} disabled={savingPublic} />
          </div>

          {/* Push Notifications */}
          <div className="st-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Push Notifications</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Receive push notifications in your browser</div>
            </div>
            <Toggle on={pushNotifications} onChange={handlePushToggle} disabled={savingPush} />
          </div>

          {/* Currency Display */}
          <div className="st-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Currency Display</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Preferred currency for showing prices</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['NGN', 'USDC'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCurrencyChange(c)}
                  style={{
                    height: 30, padding: '0 14px', borderRadius: 8,
                    border: `1px solid ${currency === c ? 'var(--accent)' : 'var(--border)'}`,
                    background: currency === c ? 'rgba(31,140,255,0.1)' : 'transparent',
                    color: currency === c ? 'var(--accent)' : 'var(--text2)',
                    fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Security ─────────────────────────────────────────────────────── */}
        <div className="st-card">
          <div className="st-card-title"><i className="ti ti-shield-lock" /> Security</div>

          {/* Two-Factor Authentication */}
          <div className="st-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Two-Factor Authentication</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                Status:{' '}
                <span style={{ color: twoFactorEnabled ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => showToast('Two-factor authentication is coming soon!', 'success')}
              style={{
                height: 34, padding: '0 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text2)', fontWeight: 600, fontSize: 11, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Enable
            </button>
          </div>

          <hr className="st-divider" />

          {/* Password */}
          <div className="st-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Password</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Update your account password</div>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordForm(f => !f)}
              style={{
                height: 34, padding: '0 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text2)', fontWeight: 600, fontSize: 11, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {showPasswordForm ? 'Cancel' : 'Change'}
            </button>
          </div>

          {showPasswordForm && (
            <form
              onSubmit={handlePasswordChange}
              style={{
                background: 'var(--bg2)', padding: 16, borderRadius: 10, marginTop: 8,
                display: 'grid', gap: 10,
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: '0 12px', height: 38, border: '1px solid var(--border)',
                    borderRadius: 8, background: 'var(--card)', color: 'var(--text)',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: '100%', padding: '0 12px', height: 38, border: '1px solid var(--border)',
                    borderRadius: 8, background: 'var(--card)', color: 'var(--text)',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: '100%', padding: '0 12px', height: 38, border: '1px solid var(--border)',
                    borderRadius: 8, background: 'var(--card)', color: 'var(--text)',
                    fontSize: 13, outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              {passwordError && <div className="st-text-red">{passwordError}</div>}
              {passwordSuccess && <div className="st-text-green">{passwordSuccess}</div>}
              <button
                type="submit"
                disabled={changingPassword}
                style={{
                  height: 40, padding: '0 24px', borderRadius: 10, border: 0,
                  background: 'var(--accent)', color: '#fff', fontWeight: 700,
                  fontSize: 13, cursor: changingPassword ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
                  gap: 6, justifyContent: 'center', opacity: changingPassword ? 0.6 : 1,
                }}
              >
                {changingPassword ? (
                  <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Updating…</>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          )}

          <hr className="st-divider" />

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%', height: 40, padding: '0 20px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
              gap: 6, justifyContent: 'center',
            }}
          >
            <i className="ti ti-logout" style={{ fontSize: 16 }} /> Logout
          </button>
        </div>

        {/* ── Danger Zone ──────────────────────────────────────────────────── */}
        <div className="st-card st-danger-card">
          <div className="st-card-title" style={{ color: 'var(--red)' }}>
            <i className="ti ti-alert-triangle" style={{ color: 'var(--red)' }} /> Danger Zone
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              height: 40, padding: '0 20px', borderRadius: 10,
              border: '1px solid var(--red)', background: 'transparent',
              color: 'var(--red)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
              gap: 6,
            }}
          >
            <i className="ti ti-trash" style={{ fontSize: 16 }} /> Delete Account
          </button>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <div className={`st-toast ${toast?.type || 'success'} ${toast ? 'show' : ''}`}>
        {toast?.msg || ''}
      </div>

      {/* ── Delete Confirmation Modal ──────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24, maxWidth: 400, width: '90%',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800 }}>Delete Account</h3>
            <p style={{ color: 'var(--text2)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
              Are you sure? This cannot be undone. All your data, tasks, earnings, and profile will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  height: 38, padding: '0 18px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text)', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  height: 38, padding: '0 18px', borderRadius: 10,
                  border: '1px solid var(--red)', background: 'var(--red)',
                  color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
