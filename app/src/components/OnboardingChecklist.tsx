import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export const OnboardingChecklist = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user || user.onboarding?.allComplete) return null

  const steps = [
    {
      id: 'profile',
      label: 'Add Profile Photo & Display Name',
      description: 'So task creators can find and trust you',
      complete: user.onboarding?.profileComplete || false,
      action: () => navigate('/profile/edit'),
      actionLabel: 'Complete Profile',
      lockedValue: user.avatar ? `${user.firstName} ${user.lastName}` : null,
    },
    {
      id: 'email',
      label: 'Verify Your Email Address',
      description: 'Unlock withdrawals and task notifications',
      complete: user.onboarding?.emailVerified || false,
      lockedValue: user.email,
      action: null,
      actionLabel: null,
    },
    {
      id: 'wallet',
      label: 'Connect a Solana Wallet',
      description: 'Receive USDC payouts directly. Supports Phantom, Backpack, Solflare',
      complete: user.onboarding?.walletConnected || false,
      lockedValue: user.walletAddress || null,
      action: () => navigate('/profile?tab=wallet'),
      actionLabel: 'Connect Wallet',
    },
    {
      id: 'bank',
      label: 'Add a Nigerian Bank Account',
      description: 'Withdraw your earnings in Naira',
      complete: user.onboarding?.bankAdded || false,
      lockedValue: user.bankAccount
        ? `${user.bankAccount.accountNumber} · ${user.bankAccount.bankName}`
        : null,
      action: () => navigate('/profile?tab=bank'),
      actionLabel: 'Add Bank Account',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {steps.map((step, i) => (
        <div key={step.id} style={{
          padding: 16,
          borderRadius: 12,
          border: `1px solid ${step.complete ? 'rgba(22,163,74,0.2)' : 'var(--border)'}`,
          background: step.complete ? 'rgba(22,163,74,0.03)' : 'var(--card)',
          opacity: step.complete ? 0.8 : 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: step.complete ? '#16a34a' : 'var(--border)',
              color: '#fff', display: 'grid', placeItems: 'center',
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>
              {step.complete ? '✓' : i + 1}
            </div>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{step.label}</span>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 10px 34px' }}>
            {step.description}
          </p>

          {step.complete && step.lockedValue && (
            <div style={{
              margin: '0 0 0 34px', padding: '8px 12px',
              background: 'var(--bg)', borderRadius: 8,
              fontSize: 12, color: 'var(--text2)',
              border: '1px solid var(--border)',
            }}>
              {step.lockedValue}
            </div>
          )}

          {step.complete && (
            <div style={{ color: '#16a34a', fontSize: 12, fontWeight: 600, marginTop: 8, marginLeft: 34 }}>
              ✓ {step.id === 'email' ? 'Email Verified' :
                 step.id === 'wallet' ? 'Wallet Connected' :
                 step.id === 'bank' ? 'Bank Account Saved' : 'Complete'}
            </div>
          )}

          {!step.complete && step.action && (
            <button
              onClick={step.action}
              style={{
                marginLeft: 34, marginTop: 8,
                padding: '8px 16px', borderRadius: 8,
                background: '#191C6D', color: '#fff',
                border: 'none', fontSize: 12,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              {step.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
