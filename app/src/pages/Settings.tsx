import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'

export default function Settings() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { logout, isAuthed, user, refreshUser } = useAuth()

  // ── loading state ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // ── preferences ────────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState<Record<string, any>>({
    emailNotifications: true,
    taskAlerts: true,
    newTaskAlerts: true,
    payoutAlerts: true,
    communityAlerts: true,
    weeklyDigest: true,
    pushNotifications: true,
    defaultCurrency: 'NGN',
    autoConvert: false,
    usdcAlerts: true,
    isPublic: false,
    showEarnings: false,
    showRank: true,
    twoFactorWithdrawal: false,
    loginAlerts: true,
  })

  const savePreference = async (key: string, value: any) => {
    setPrefs(p => ({ ...p, [key]: value }))
    setSaving(key)
    try {
      await apiRequest('/users/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ preferences: { ...prefs, [key]: value } }),
      })
    } catch {
      setPrefs(p => ({ ...p, [key]: !value }))
    } finally {
      setSaving(null)
    }
  }

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
  const [toggling2FA, setToggling2FA] = useState(false)

  // ── 2FA setup wizard ──────────────────────────────────────────────────────
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [manualSecret, setManualSecret] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorError, setTwoFactorError] = useState('')
  const [verifying2FA, setVerifying2FA] = useState(false)

  // ── 2FA disable confirmation ──────────────────────────────────────────────
  const [show2FADisable, setShow2FADisable] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState('')
  const [disabling2FA, setDisabling2FA] = useState(false)

  // ── connected accounts ────────────────────────────────────────────────────
  const [connected, setConnected] = useState({ linkedin: false, twitter: false, github: false, google: false, telegram: false })
  const [connecting, setConnecting] = useState<string | null>(null)

  // ── Dojah / BVN ──────────────────────────────────────────────────────────
  const [bvnNumber, setBvnNumber] = useState('')
  const [kycDob, setKycDob] = useState('')
  const [kycMsg, setKycMsg] = useState('')
  const [submittingBvn, setSubmittingBvn] = useState(false)

  // ── info modals ────────────────────────────────────────────────────────────
  const [showHumanVerifiedInfo, setShowHumanVerifiedInfo] = useState(false)
  const [showOgaScoreInfo, setShowOgaScoreInfo] = useState(false)

  // ── developer mode ──────────────────────────────────────────────────────────
  const [developerMode, setDeveloperMode] = useState(() => localStorage.getItem('ogapay_developer_mode') === 'true')

  const toggleDeveloperMode = () => {
    const next = !developerMode
    setDeveloperMode(next)
    localStorage.setItem('ogapay_developer_mode', String(next))
  }

  // ── paired devices ─────────────────────────────────────────────────────────
  const [devices, setDevices] = useState<any[]>([])
  const [pairingCode, setPairingCode] = useState('')
  const [generatingCode, setGeneratingCode] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkCode, setLinkCode] = useState('')
  const [linkingCode, setLinkingCode] = useState(false)

  // ── delete account ─────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { toast: showToast } = useToast()

  // ── handle ?tab= param for scroll navigation ──────────────────────────────
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "kyc") {
      const el = document.getElementById("kyc-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

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
          const p = data.preferences || data
          setPrefs((prev: any) => ({
            ...prev,
            emailNotifications: p.emailNotifications ?? true,
            taskAlerts: p.taskAlerts ?? true,
            newTaskAlerts: p.newTaskAlerts ?? true,
            payoutAlerts: p.payoutAlerts ?? true,
            communityAlerts: p.communityAlerts ?? true,
            weeklyDigest: p.weeklyDigest ?? true,
            pushNotifications: p.pushNotifications ?? true,
            defaultCurrency: p.defaultCurrency ?? p.currency ?? 'NGN',
            autoConvert: p.autoConvert ?? false,
            usdcAlerts: p.usdcAlerts ?? true,
            isPublic: p.isPublic ?? false,
            showEarnings: p.showEarnings ?? false,
            showRank: p.showRank ?? true,
            twoFactorWithdrawal: p.twoFactorWithdrawal ?? false,
            loginAlerts: p.loginAlerts ?? true,
          }))
          if (data.connectedAccounts) {
            setConnected((prev: any) => ({ ...prev, ...data.connectedAccounts }))
          }
          if (typeof data.isTwoFactorEnabled === 'boolean') {
            setTwoFactorEnabled(data.isTwoFactorEnabled)
          }
        }
      } catch {
        showToast('Failed to load profile', 'error')
      }
      // Fetch paired devices separately so a failure doesn't block settings
      try {
        const deviceList: any = await apiRequest('/devices')
        if (Array.isArray(deviceList)) setDevices(deviceList)
      } catch (e: any) { console.error(e) }
      setLoading(false)
    })()
  }, [isAuthed])

  // ── sync connected accounts from auth user ─────────────────────────────────
  useEffect(() => {
    if ((user as any)?.connectedAccounts) {
      setConnected((prev: any) => ({ ...prev, ...(user as any).connectedAccounts }))
    }
  }, [user])

  // ── paired device handlers ─────────────────────────────────────────────────
  const fetchDevices = async () => {
    try {
      const list: any = await apiRequest('/devices')
      if (Array.isArray(list)) setDevices(list)
    } catch (e: any) { console.error(e) }
  }

  const handleGenerateCode = async () => {
    setGeneratingCode(true)
    try {
      const data: any = await apiRequest('/devices/pair/generate', { method: 'POST' })
      if (data?.code) {
        setPairingCode(data.code)
        showToast('Pairing code generated!', 'success')
        setTimeout(() => setPairingCode(''), 5 * 60 * 1000)
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate code', 'error')
    } finally {
      setGeneratingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (linkCode.length < 6) return
    setLinkingCode(true)
    try {
      await apiRequest('/devices/pair/verify', {
        method: 'POST',
        body: JSON.stringify({ code: linkCode }),
      })
      showToast('Device linked successfully!', 'success')
      setLinkCode('')
      setShowLinkInput(false)
      fetchDevices()
    } catch (err: any) {
      showToast(err.message || 'Failed to link device', 'error')
    } finally {
      setLinkingCode(false)
    }
  }

  const handleRemoveDevice = async (id: string) => {
    try {
      await apiRequest(`/devices/${id}`, { method: 'DELETE' })
      setDevices(prev => prev.filter(d => d.id !== id))
      showToast('Device removed', 'success')
    } catch (err: any) {
      showToast(err.message || 'Failed to remove device', 'error')
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

  // ── 2FA: start setup ──────────────────────────────────────────────────────
  const handleSetup2FA = async () => {
    setToggling2FA(true)
    setTwoFactorError('')
    try {
      const result = await apiRequest<any>('/auth/2fa/setup', { method: 'GET' })
      setQrCodeDataUrl(result.qrCodeDataUrl || '')
      setManualSecret(result.secret || '')
      setShow2FASetup(true)
    } catch (err: any) {
      showToast(err.message || 'Failed to setup 2FA', 'error')
    } finally {
      setToggling2FA(false)
    }
  }

  // ── 2FA: verify & enable ─────────────────────────────────────────────────
  const handleVerify2FA = async () => {
    if (!twoFactorCode.trim() || twoFactorCode.length < 6) {
      setTwoFactorError('Enter a valid 6-digit code')
      return
    }
    setVerifying2FA(true)
    setTwoFactorError('')
    try {
      await apiRequest('/auth/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ token: twoFactorCode.trim() }),
      })
      setTwoFactorEnabled(true)
      setShow2FASetup(false)
      setQrCodeDataUrl('')
      setManualSecret('')
      setTwoFactorCode('')
      showToast('Two-factor authentication enabled', 'success')
    } catch (err: any) {
      setTwoFactorError(err.message || 'Invalid code')
    } finally {
      setVerifying2FA(false)
    }
  }

  // ── 2FA: cancel setup ────────────────────────────────────────────────────
  const handleCancel2FASetup = () => {
    setShow2FASetup(false)
    setQrCodeDataUrl('')
    setManualSecret('')
    setTwoFactorCode('')
    setTwoFactorError('')
  }

  // ── 2FA: start disable ───────────────────────────────────────────────────
  const handleStartDisable2FA = () => {
    setShow2FADisable(true)
    setDisableCode('')
    setDisableError('')
  }

  // ── 2FA: confirm disable ─────────────────────────────────────────────────
  const handleConfirmDisable2FA = async () => {
    if (!disableCode.trim() || disableCode.length < 6) {
      setDisableError('Enter a valid 6-digit code')
      return
    }
    setDisabling2FA(true)
    setDisableError('')
    try {
      await apiRequest('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ token: disableCode.trim() }),
      })
      setTwoFactorEnabled(false)
      setShow2FADisable(false)
      setDisableCode('')
      showToast('Two-factor authentication disabled', 'success')
    } catch (err: any) {
      setDisableError(err.message || 'Invalid code')
    } finally {
      setDisabling2FA(false)
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
        .st-text-red{color:var(--red);font-size:12px;margin:6px 0}
        .st-text-green{color:var(--green);font-size:12px;margin:6px 0}
        .st-danger-card{border-color:rgba(220,38,38,0.3)!important}
      `}</style>

      <div className="st-hero">
        <h1>Settings</h1>
        <p>Manage your account preferences and security</p>
      </div>

      <div className="st-sections">
        {/* ── Preferences (grouped) ────────────────────────────────────────── */}
        {[
          {
            title: 'Notifications',
            icon: 'ti-bell',
            items: [
              { key: 'emailNotifications', label: 'Email Notifications', sub: 'General updates about your account' },
              { key: 'taskAlerts', label: 'Task Approval Alerts', sub: 'When your submission is approved or rejected' },
              { key: 'newTaskAlerts', label: 'New Task Alerts', sub: 'When new tasks match your category' },
              { key: 'payoutAlerts', label: 'Payout Alerts', sub: 'When your ₦ NGN or $ USDC balance is ready to withdraw' },
              { key: 'communityAlerts', label: 'Community Alerts', sub: 'Activity in communities you joined' },
              { key: 'weeklyDigest', label: 'Weekly Earnings Summary', sub: 'Monday email showing ₦ NGN + $ USDC earned' },
              { key: 'pushNotifications', label: 'Push Notifications', sub: 'Real-time browser notifications' },
            ]
          },
          {
            title: 'Wallet & Payments',
            icon: 'ti-wallet',
            items: [
              { key: 'defaultCurrency', label: 'Default Currency', sub: 'Display prices in ₦ NGN, $ USDC, or both', type: 'select', options: ['NGN', 'USDC', 'BOTH'] },
              { key: 'autoConvert', label: 'Auto-convert USDC to NGN', sub: 'Automatically convert $ USDC earnings to ₦ NGN' },
              { key: 'usdcAlerts', label: 'USDC Transaction Alerts', sub: 'Notify me of all Solana USDC transactions' },
            ]
          },
          {
            title: 'Privacy',
            icon: 'ti-lock',
            items: [
              { key: 'isPublic', label: 'Public Profile', sub: 'Make your profile visible to everyone' },
              { key: 'showEarnings', label: 'Show Earnings on Profile', sub: 'Display your total ₦ NGN + $ USDC earnings publicly' },
              { key: 'showRank', label: 'Show OgaScore Rank Badge', sub: 'Display your rank on your public profile' },
            ]
          },
          {
            title: 'Security',
            icon: 'ti-shield',
            items: [
              { key: 'twoFactorWithdrawal', label: 'Require OTP for Withdrawals', sub: 'Extra security for ₦ NGN and $ USDC payouts' },
              { key: 'loginAlerts', label: 'Login Alerts', sub: 'Email me when a new device logs in' },
            ]
          }
        ].map(group => (
          <div className="st-card" key={group.title}>
            <div className="st-card-title"><i className={`ti ${group.icon}`} /> {group.title}</div>
            {group.items.map(item => (
              <div key={item.key} className="st-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{item.sub}</div>
                </div>
                {item.type === 'select' ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(item.options as string[]).map(opt => {
                      const labels: Record<string, string> = { NGN: '₦ NGN', USDC: '$ USDC', BOTH: 'Both' }
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => savePreference(item.key, opt)}
                          style={{
                            height: 30, padding: '0 10px', borderRadius: 8,
                            border: `1px solid ${prefs[item.key] === opt ? 'var(--accent)' : 'var(--border)'}`,
                            background: prefs[item.key] === opt ? 'rgba(31,140,255,0.1)' : 'transparent',
                            color: prefs[item.key] === opt ? 'var(--accent)' : 'var(--text2)',
                            fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          {labels[opt] || opt}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <Toggle
                    on={!!prefs[item.key]}
                    onChange={() => savePreference(item.key, !prefs[item.key])}
                    disabled={saving === item.key}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

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
            {twoFactorEnabled ? (
              <button
                type="button"
                onClick={handleStartDisable2FA}
                style={{
                  height: 34, padding: '0 14px', borderRadius: 8,
                  border: '1px solid var(--red)',
                  background: 'rgba(220,38,38,0.08)',
                  color: 'var(--red)',
                  fontWeight: 600, fontSize: 11, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Disable
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSetup2FA}
                disabled={toggling2FA}
                style={{
                  height: 34, padding: '0 14px', borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text2)',
                  fontWeight: 600, fontSize: 11, cursor: toggling2FA ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: toggling2FA ? 0.6 : 1,
                }}
              >
                {toggling2FA ? 'Preparing…' : 'Enable'}
              </button>
            )}
          </div>

          {/* 2FA Setup Wizard */}
          {show2FASetup && (
            <div style={{
              background: 'var(--bg2)', padding: 20, borderRadius: 12, marginTop: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Scan this QR code</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', maxWidth: 280 }}>
                Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.),
                then enter the 6-digit code to activate.
              </div>
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="2FA QR Code"
                  style={{ width: 180, height: 180, borderRadius: 8, border: '2px solid var(--border)' }} />
              )}
              {manualSecret && (
                <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
                  Or enter this key manually: <strong style={{ fontFamily: 'monospace', color: 'var(--text)', userSelect: 'all' }}>{manualSecret}</strong>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 240 }}>
                <input
                  type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  value={twoFactorCode}
                  onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={{
                    flex: 1, height: 42, padding: '0 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--card)',
                    fontSize: 18, fontWeight: 700, textAlign: 'center',
                    fontFamily: 'monospace', letterSpacing: 4,
                  }}
                />
              </div>
              {twoFactorError && <div style={{ fontSize: 12, color: '#dc2626' }}>{twoFactorError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleCancel2FASetup}
                  style={{
                    height: 36, padding: '0 16px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text2)', fontWeight: 600, fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerify2FA}
                  disabled={verifying2FA || twoFactorCode.length < 6}
                  style={{
                    height: 36, padding: '0 16px', borderRadius: 8,
                    border: 'none', background: verifying2FA ? 'var(--accent-dim)' : 'var(--accent)',
                    color: '#fff', fontWeight: 700, fontSize: 12,
                    cursor: verifying2FA ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    opacity: twoFactorCode.length < 6 ? 0.6 : 1,
                  }}
                >
                  {verifying2FA ? 'Verifying…' : 'Verify & Enable'}
                </button>
              </div>
            </div>
          )}

          {/* 2FA Disable Confirmation */}
          {show2FADisable && (
            <div style={{
              background: 'rgba(220,38,38,0.06)', padding: 20, borderRadius: 12, marginTop: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>Disable Two-Factor Authentication</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'center', maxWidth: 280 }}>
                Enter the 6-digit code from your authenticator app to confirm.
              </div>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                value={disableCode}
                onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{
                  width: 160, height: 42, padding: '0 12px', borderRadius: 8,
                  border: '1px solid var(--red)', background: 'var(--card)',
                  fontSize: 18, fontWeight: 700, textAlign: 'center',
                  fontFamily: 'monospace', letterSpacing: 4,
                }}
              />
              {disableError && <div style={{ fontSize: 12, color: '#dc2626' }}>{disableError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShow2FADisable(false)}
                  style={{
                    height: 36, padding: '0 16px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text2)', fontWeight: 600, fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDisable2FA}
                  disabled={disabling2FA || disableCode.length < 6}
                  style={{
                    height: 36, padding: '0 16px', borderRadius: 8,
                    border: 'none', background: disabling2FA ? '#dc262680' : '#dc2626',
                    color: '#fff', fontWeight: 700, fontSize: 12,
                    cursor: disabling2FA ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    opacity: disableCode.length < 6 ? 0.6 : 1,
                  }}
                >
                  {disabling2FA ? 'Disabling…' : 'Confirm Disable'}
                </button>
              </div>
            </div>
          )}

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

        {/* ── Connected Accounts ────────────────────────────────────────────── */}
        <div className="st-card" id="kyc-section">
          <div className="st-card-title"><i className="ti ti-link" /> Connected Accounts</div>
          <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Connect your accounts to increase your OgaScore and unlock premium features.
          </p>

          {/* Platform list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { id: 'linkedin', label: 'LinkedIn', icon: 'ti ti-brand-linkedin', color: '#0077B5', pts: 10 },
              { id: 'twitter', label: 'Twitter/X', icon: null, color: '#000000', pts: 8 },
              { id: 'github', label: 'GitHub', icon: 'ti ti-brand-github', color: '#333333', pts: 8 },
              { id: 'google', label: 'Google', icon: 'ti ti-brand-google', color: '#EA4335', pts: 5 },
              { id: 'telegram', label: 'Telegram', icon: 'ti ti-brand-telegram', color: '#229ED9', pts: 5 },
              { id: 'bvn', label: 'BVN', icon: 'ti ti-id', color: 'var(--green)', pts: 10 },
              { id: 'nin', label: 'NIN', icon: 'ti ti-id', color: 'var(--accent)', pts: 10 },
              { id: 'veryai', label: 'Human Verified', icon: 'ti ti-shield-check', color: 'var(--accent)', pts: 10 },
            ].map(platform => {
              const kycStatus = (user as any)?.kyc?.status || (user as any)?.kycStatus
              const kycTier = (user as any)?.kyc?.kycTier ?? 0
              const isConnected = platform.id === 'bvn'
                ? kycStatus === 'APPROVED'
                : platform.id === 'nin'
                  ? kycTier >= 2
                  : platform.id === 'veryai'
                    ? kycStatus === 'VERIFIED' || kycStatus === 'APPROVED'
                    : !!(connected as any)[platform.id]
              const isVerifying = connecting === platform.id

              const handleGithubConnect = async () => {
                setConnecting('github')
                try {
                  const json: any = await apiRequest('/social/github/init', { method: 'POST' })
                  if (json?.authUrl) {
                    window.location.href = json.authUrl
                  } else {
                    showToast('GitHub OAuth not configured', 'error'); setConnecting(null)
                  }
                } catch {
                  showToast('Failed to initiate GitHub connection', 'error'); setConnecting(null)
                }
              }

              const handleVeryVerify = () => {
                const params = new URLSearchParams({
                  response_type: 'code',
                  client_id: import.meta.env.VITE_VERYAI_CLIENT_ID,
                  redirect_uri: import.meta.env.VITE_VERYAI_REDIRECT_URI || `${window.location.origin}/verify/callback`,
                  scope: 'openid',
                  state: user!.id,
                })
                window.location.href = `https://api.very.org/oauth2/authorize?${params}`
              }

              const handleSocialConnect = async (platformId: string) => {
                setConnecting(platformId)
                try {
                  const json: any = await apiRequest(`/social/${platformId}/init`, { method: 'POST' })
                  if (json?.authUrl) {
                    window.location.href = json.authUrl
                  } else {
                    showToast('OAuth not configured', 'error'); setConnecting(null)
                  }
                } catch {
                  showToast('Failed to initiate connection', 'error'); setConnecting(null)
                }
              }

              const renderConnectButton = () => {
                if (platform.id === 'veryai') {
                  return isConnected
                    ? <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>✓ Verified</span>
                    : <button type="button" onClick={handleVeryVerify} style={{ height: 30, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Verify with VeryAI</button>
                }
                if (platform.id === 'bvn') {
                  return isConnected
                    ? <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, whiteSpace: 'nowrap' }}>✓ Verified</span>
                    : <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>Dojah ↓</span>
                }
                if (platform.id === 'nin') {
                  return isConnected
                    ? <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, whiteSpace: 'nowrap' }}>✓ Verified</span>
                    : <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>Upgrade to Tier 2</span>
                }
                if (isConnected) {
                  return <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, whiteSpace: 'nowrap' }}>✓ Connected</span>
                }
                return (
                  <button type="button" onClick={() => handleSocialConnect(platform.id)} disabled={isVerifying}
                    style={{ height: 30, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, fontSize: 11, cursor: isVerifying ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: isVerifying ? 0.5 : 1 }}>
                    {isVerifying ? 'Connecting...' : 'Connect'}
                  </button>
                )
              }

              return (
                <div key={platform.id} className="st-field" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: platform.color + '12', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    {platform.icon ? (
                      <i className={platform.icon} style={{ fontSize: 18, color: platform.color }} />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={platform.color}>
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.739l7.727-8.833L1.255 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {platform.label}
                      {platform.id === 'veryai' && (
                        <button onClick={() => setShowHumanVerifiedInfo(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                          <i className="ti ti-info-circle" style={{ fontSize: 13, color: 'var(--text2)' }} />
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'var(--bg2)', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600, color: 'var(--text3)' }}>+{platform.pts} pts</span>
                    </div>
                  </div>
                  {renderConnectButton()}
                </div>
              )
            })}
          </div>

          {/* OgaScore bar */}
          <OgaScoreBar score={(user as any)?.ogaScore ?? 0} connected={connected} kycStatus={(user as any)?.kyc?.status || (user as any)?.kycStatus} kycTier={(user as any)?.kyc?.kycTier ?? 0} onInfo={() => setShowOgaScoreInfo(true)} />
        </div>

        {/* ── Dojah Verification ──────────────────────────────────────────── */}
        <div className="st-card">
          <div className="st-card-title"><i className="ti ti-id" /> Dojah Verification</div>
          <p style={{ fontSize: 12, color: 'var(--text2)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Verify your identity to unlock withdrawals, premium tasks, and higher limits.
          </p>

          {/* Tier progress */}
          <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
            {[
              { tier: 1, label: 'Tier 1 — BVN', done: ((user as any)?.kyc?.kycTier ?? 0) >= 1 },
              { tier: 2, label: 'Tier 2 — NIN + Selfie', done: ((user as any)?.kyc?.kycTier ?? 0) >= 2 },
              { tier: 3, label: 'Tier 3 — Address + Docs', done: ((user as any)?.kyc?.kycTier ?? 0) >= 3 },
            ].map(t => (
              <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: t.done ? 'var(--green)08' : 'var(--bg2)', border: '1px solid ' + (t.done ? 'var(--green)20' : 'var(--border)') }}>
                <i className={`ti ti-${t.done ? 'check-circle' : 'circle'}`} style={{ fontSize: 16, color: t.done ? 'var(--green)' : 'var(--text3)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: t.done ? 'var(--green)' : 'var(--text2)' }}>{t.label}</span>
                {t.done && <i className="ti ti-shield-check" style={{ fontSize: 14, color: 'var(--green)', marginLeft: 'auto' }} />}
              </div>
            ))}
          </div>

          {(user as any)?.kyc?.status === 'APPROVED' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--green)08', borderRadius: 8, border: '1px solid var(--green)30' }}>
              <i className="ti ti-shield-check" style={{ fontSize: 20, color: 'var(--green)' }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Tier {((user as any)?.kyc?.kycTier ?? 0)} Verified</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Your identity has been verified</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Date of Birth</label>
                <input className="dash-input" type="date" value={kycDob} onChange={e => setKycDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{ fontSize: 14, fontWeight: 600 }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>BVN</label>
                <input className="dash-input" value={bvnNumber} onChange={e => setBvnNumber(e.target.value.replace(/\D/g,'').slice(0,11))}
                  placeholder="Enter 11-digit BVN" maxLength={11}
                  style={{ fontSize: 16, letterSpacing: 2, fontWeight: 700, textAlign: 'center' }} />
              </div>
              {kycMsg && <div style={{ fontSize: 12, color: kycMsg.includes('successful') || kycMsg.includes('approved') ? 'var(--green)' : '#DC2626', marginBottom: 12 }}>{kycMsg}</div>}
              <button
                type="button"
                disabled={bvnNumber.length !== 11 || !kycDob || submittingBvn}
                onClick={async () => {
                  if (bvnNumber.length !== 11 || !kycDob) return
                  setSubmittingBvn(true); setKycMsg("")
                  try {
                    const json = await apiRequest<any>('/kyc/submit', {
                      method: 'POST',
                      body: JSON.stringify({ idType: 'BVN', idNumber: bvnNumber, dateOfBirth: new Date(kycDob).toISOString() }),
                    }).catch(() => null)
                    if (json?.status) {
                      const msg = json.message || 'Verification submitted!'
                      setKycMsg(msg)
                      setBvnNumber('')
                      refreshUser?.()
                    } else {
                      setKycMsg(json?.message || 'Verification failed')
                    }
                  } catch {
                    setKycMsg('Service unavailable. Try again later.')
                  }
                  setSubmittingBvn(false)
                }}
                style={{
                  width: '100%', height: 42, borderRadius: 8, border: 'none',
                  background: bvnNumber.length === 11 ? 'var(--accent)' : 'var(--border)',
                  color: bvnNumber.length === 11 ? '#fff' : 'var(--text3)',
                  fontWeight: 700, fontSize: 13, cursor: bvnNumber.length === 11 ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit',
                }}
              >
                {submittingBvn ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <>Submit BVN</>}
              </button>
            </div>
          )}
        </div>

        {/* ── Paired Devices ───────────────────────────────────────────────── */}
        <div className="st-card">
          <div className="st-card-title"><i className="ti ti-devices" /> Paired Devices</div>

          {pairingCode && (
            <div style={{
              textAlign: 'center', padding: 16, marginBottom: 14,
              background: 'var(--bg2)', borderRadius: 10,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, fontWeight: 600 }}>Pairing Code (expires in 5 min)</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 8, color: 'var(--accent)', fontFamily: 'monospace' }}>{pairingCode}</div>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(pairingCode); showToast('Code copied!') }}
                style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
              >Copy code</button>
            </div>
          )}

          {devices.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '8px 0 16px', margin: 0 }}>
              No devices paired yet. Generate a code to link another device.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
              {devices.map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: 'var(--bg2)', borderRadius: 10,
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{d.name || 'Unknown device'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {d.browser && d.os ? `${d.browser} · ${d.os}` : d.os || d.browser || ''}
                      {d.lastActiveAt && ` · Last active ${new Date(d.lastActiveAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDevice(d.id)}
                    style={{
                      height: 30, width: 30, borderRadius: 8, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--red)', cursor: 'pointer',
                      fontSize: 16, display: 'grid', placeItems: 'center',
                    }}
                    title="Remove device"
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={handleGenerateCode} disabled={generatingCode}
              style={{
                flex: 1, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', fontWeight: 600,
                fontSize: 12, cursor: generatingCode ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: generatingCode ? 0.6 : 1,
              }}>
              {generatingCode ? 'Generating…' : 'Generate Code'}
            </button>
            <button type="button" onClick={() => setShowLinkInput(s => !s)}
              style={{
                flex: 1, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', fontWeight: 600,
                fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              Link a Device
            </button>
          </div>

          {showLinkInput && (
            <div style={{
              marginTop: 10, padding: 12, background: 'var(--bg2)', borderRadius: 10,
              display: 'flex', gap: 8,
            }}>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={linkCode}
                onChange={e => setLinkCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{
                  flex: 1, height: 36, padding: '0 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--card)',
                  color: 'var(--text)', fontSize: 14, fontFamily: 'monospace',
                  outline: 'none', letterSpacing: 4, textAlign: 'center',
                }}
              />
              <button type="button" onClick={handleVerifyCode} disabled={linkingCode || linkCode.length < 6}
                style={{
                  height: 36, padding: '0 16px', borderRadius: 8, border: 0,
                  background: 'var(--accent)', color: '#fff', fontWeight: 700,
                  fontSize: 12, cursor: linkingCode || linkCode.length < 6 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: linkingCode || linkCode.length < 6 ? 0.6 : 1,
                }}>
                {linkingCode ? 'Linking…' : 'Link'}
              </button>
            </div>
          )}
        </div>

        {/* ── Developer Mode ──────────────────────────────────────────────── */}
        <div className="st-card">
          <div className="st-card-title"><i className="ti ti-code" /> Developer Mode</div>
          <div className="st-field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Show Developer API</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Show the Developer API link in sidebar navigation</div>
            </div>
            <Toggle on={developerMode} onChange={toggleDeveloperMode} />
          </div>
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

      {/* ── OgaScore info modal ── */}
      {showOgaScoreInfo && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={() => setShowOgaScoreInfo(false)}>
          <div style={{background:'var(--card)',borderRadius:14,padding:24,maxWidth:480,width:'90%',position:'relative'}} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowOgaScoreInfo(false)} style={{position:'absolute',top:16,right:16,background:'none',border:'none',fontSize:24,cursor:'pointer',color:'var(--text2)'}}>✕</button>
            <h2 style={{fontSize:18,fontWeight:900,marginBottom:16}}>What is OgaScore?</h2>
            <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
              OgaScore is your reputation score on OgaPay. It reflects your trust level and activity on the platform. A higher score unlocks premium communities and higher-paying tasks.
            </p>
            <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:8}}>How to increase your OgaScore:</div>
            <ul style={{fontSize:12,color:'var(--text)',lineHeight:1.8,paddingLeft:18,margin:'0 0 4px'}}>
              <li>Connect social accounts (LinkedIn +10, X +8, GitHub +8, Google +5, Telegram +5)</li>
              <li>Complete KYC/BVN verification (+20)</li>
              <li>Complete tasks on time</li>
              <li>Fill in your profile (bio, avatar, skills)</li>
              <li>Connect a Solana wallet</li>
              <li>Refer friends to OgaPay</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Human verified info modal ── */}
      {showHumanVerifiedInfo && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'var(--card)',borderRadius:14,padding:24,maxWidth:480,width:'90%',position:'relative'}}>
            <button onClick={() => setShowHumanVerifiedInfo(false)} style={{position:'absolute',top:16,right:16,background:'none',border:'none',fontSize:24,cursor:'pointer',color:'var(--text2)'}}>✕</button>

            <h2 style={{fontSize:18,fontWeight:900,marginBottom:16}}>Human verified</h2>

            <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
              This status becomes <strong>Yes</strong> after you complete VeryAI verification from your profile.
            </p>

            <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:12}}>
              VeryAI is a Proof of Reality provider that verifies real humans. OgaPay stores the verification result on your account and uses it as an anti-bot trust signal.
            </p>

            <p style={{fontSize:13,color:'var(--text)',lineHeight:1.6,marginBottom:16}}>
              OgaPay does not process or store your palm image. Biometric verification is handled by VeryAI, while OgaPay keeps only account-level verification status and related metadata needed for integrity checks.
            </p>

            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:8}}>Download the VeryAI app</div>
              <div style={{display:'flex',gap:8}}>
                <a href="https://play.google.com/store/apps/details?id=org.veryai.app" target="_blank"
                  style={{flex:1,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:8,textAlign:'center',textDecoration:'none',color:'var(--text)',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <i className="ti ti-brand-google-play" /> Playstore
                </a>
                <span
                  style={{flex:1,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:8,textAlign:'center',textDecoration:'none',color:'var(--text3)',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:0.5}}>
                  <i className="ti ti-brand-apple" /> App Store
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function OgaScoreBar({ score, connected, kycStatus, kycTier, onInfo }: { score: number; connected: Record<string, boolean>; kycStatus: string | null; kycTier?: number; onInfo?: () => void }) {
  const connectedCount = Object.values(connected).filter(Boolean).length
  const kycDone = kycStatus === 'VERIFIED' || kycStatus === 'APPROVED'
  const kycPts = kycDone ? (kycTier ?? 1) * 10 : 0

  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
          OgaScore
          <button onClick={() => onInfo?.()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            <i className="ti ti-info-circle" style={{ fontSize: 13, color: 'var(--text2)' }} />
          </button>
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>{score}</span>
      </div>
      <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999, background: 'var(--accent)',
          transition: 'width 0.4s ease',
          width: `${Math.min((score / 96) * 100, 100)}%`,
        }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: connectedCount > 0 ? 'var(--accent)18' : 'var(--border)', color: connectedCount > 0 ? 'var(--accent)' : 'var(--text3)', fontWeight: 600 }}>Social: +{connectedCount * 0 + (connected.linkedin ? 10 : 0) + (connected.twitter ? 8 : 0) + (connected.github ? 8 : 0) + (connected.google ? 5 : 0) + (connected.telegram ? 5 : 0)}</span>
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: kycDone ? 'var(--green)18' : 'var(--border)', color: kycDone ? 'var(--green)' : 'var(--text3)', fontWeight: 600 }}>KYC: +{kycPts}</span>
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--border)', color: 'var(--text3)', fontWeight: 600 }}>Profile / Wallet / Tasks / Referrals</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
        Higher score unlocks premium communities and tasks
      </div>
    </div>
  )
}
