import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'

const COMMUNITY_LINKS = [
  { key: 'telegram', label: 'Telegram', icon: 'ti ti-brand-telegram', url: 'https://t.me/ogapay' },
  { key: 'twitter', label: 'X (Twitter)', icon: 'ti ti-brand-x', url: 'https://x.com/ogapay' },
  { key: 'facebook', label: 'Facebook', icon: 'ti ti-brand-facebook', url: 'https://facebook.com/ogapay' },
  { key: 'discord', label: 'Discord', icon: 'ti ti-brand-discord', url: 'https://discord.gg/ogapay' },
]

const STORAGE_KEY = 'ogapay_community_visited'

function getVisitedLinks(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function persistVisitedLinks(links: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
}

export const OnboardingChecklist = () => {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [visitedLinks, setVisitedLinks] = useState<string[]>(getVisitedLinks)

  // Refresh user data periodically
  useEffect(() => {
    const interval = setInterval(() => { refreshUser() }, 5000)
    return () => clearInterval(interval)
  }, [refreshUser])

  // Derive completion from real user state
  const profileComplete = !!(user?.firstName && user?.lastName && user?.avatar)
  const emailVerified = !!((user as any)?.emailVerified ?? (user as any)?.isEmailVerified)
  const walletConnected = !!(user?.walletAddress || user?.bankAccount)
  const communityJoined = visitedLinks.length >= COMMUNITY_LINKS.length
  const allComplete = profileComplete && emailVerified && walletConnected && communityJoined

  // Save community completion to backend when all links visited
  useEffect(() => {
    if (communityJoined) {
      apiRequest('/users/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({ communityJoined: true }),
      }).catch(() => {})
    }
  }, [communityJoined])

  const handleCommunityClick = useCallback((key: string, url: string) => {
    if (!visitedLinks.includes(key)) {
      const next = [...visitedLinks, key]
      setVisitedLinks(next)
      persistVisitedLinks(next)
    }
    window.open(url, '_blank', 'noopener')
  }, [visitedLinks])

  if (!user) return null

  const stepStates = [profileComplete, emailVerified, walletConnected, communityJoined]
  const completedCount = stepStates.filter(Boolean).length
  const percent = Math.round((completedCount / 4) * 100)
  const firstIncomplete = stepStates.findIndex(s => !s)

  // All complete state
  if (allComplete) {
    return (
      <div style={{
        padding: 20, borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(22,163,74,0.08) 0%, rgba(22,163,74,0.02) 100%)',
        border: '1px solid rgba(22,163,74,0.2)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
        <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>Setup Complete!</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
          You're ready to start earning on OgaPay.
        </div>
        <button onClick={() => navigate('/tasks')} style={{
          marginTop: 14, padding: '10px 24px', borderRadius: 10,
          background: 'var(--accent)', color: '#fff', border: 'none',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}>Browse Tasks</button>
      </div>
    )
  }

  const steps = [
    {
      id: 'profile',
      label: 'Complete Profile',
      description: 'Add your photo and display name so task creators can find and trust you',
      complete: profileComplete,
      action: () => navigate('/edit-profile'),
      actionLabel: 'Complete Profile',
      lockedValue: user?.avatar ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Profile set' : null,
      completeLabel: 'Profile Complete',
    },
    {
      id: 'email',
      label: 'Verify Your Email Address',
      description: 'Unlock withdrawals and task notifications',
      complete: emailVerified,
      action: null,
      actionLabel: null,
      lockedValue: (user as any)?.email || null,
      completeLabel: 'Email Verified',
    },
    {
      id: 'wallet',
      label: 'Connect Wallet or Bank Account',
      description: 'Receive payouts via Solana wallet or Nigerian bank account',
      complete: walletConnected,
      action: () => navigate('/profile'),
      actionLabel: 'Connect',
      lockedValue: user?.walletAddress
        ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
        : user?.bankAccount
        ? `${(user.bankAccount as any).accountNumber} · ${(user.bankAccount as any).bankName}`
        : null,
      completeLabel: 'Wallet Connected',
    },
    {
      id: 'community',
      label: 'Join the Community',
      description: `Follow us on ${COMMUNITY_LINKS.length} platforms to stay updated`,
      complete: communityJoined,
      action: null,
      actionLabel: null,
      completeLabel: 'Community Joined',
    },
  ]

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>Setup Progress</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{completedCount}/4 · {percent}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: 'linear-gradient(90deg, var(--accent), var(--green))',
            width: `${percent}%`, transition: 'width 0.4s ease',
          }} />
        </div>
        {completedCount < 4 && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            {4 - completedCount} step{4 - completedCount !== 1 ? 's' : ''} remaining
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((step, i) => {
          const isExpanded = i === firstIncomplete || (!step.complete && firstIncomplete < 0)

          // Collapse completed steps that aren't the current focus
          if (step.complete && i !== firstIncomplete) return null

          return (
            <div key={step.id} style={{
              padding: '14px 16px', borderRadius: 12,
              border: `1px solid ${step.complete ? 'rgba(22,163,74,0.25)' : 'var(--border)'}`,
              background: step.complete ? 'rgba(22,163,74,0.04)' : 'var(--card)',
              opacity: step.complete ? 0.85 : 1, transition: 'all 0.3s ease',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: step.complete ? 'var(--green)' : i === firstIncomplete ? 'var(--accent)' : 'var(--border)',
                  color: '#fff', display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 800, flexShrink: 0, transition: 'background 0.3s',
                }}>
                  {step.complete ? <i className="ti ti-check" style={{fontSize:13}} /> : i + 1}
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{step.label}</span>
                {step.complete && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                    color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <i className="ti ti-circle-check" /> {step.completeLabel}
                  </span>
                )}
              </div>

              <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0 36px', lineHeight: 1.5 }}>
                {step.description}
              </p>

              {/* Show locked value for completed steps */}
              {step.complete && step.lockedValue && (
                <div style={{
                  margin: '8px 0 0 36px', padding: '8px 12px',
                  background: 'var(--bg)', borderRadius: 8,
                  fontSize: 12, color: 'var(--text2)', border: '1px solid var(--border)',
                }}>
                  {step.lockedValue}
                </div>
              )}

              {/* Action button for incomplete steps */}
              {!step.complete && step.action && (
                <button onClick={step.action} style={{
                  marginLeft: 36, marginTop: 10,
                  padding: '8px 18px', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {step.actionLabel}
                </button>
              )}

              {/* Community social links */}
              {!step.complete && step.id === 'community' && (
                <div style={{ marginLeft: 36, marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {COMMUNITY_LINKS.map(link => {
                    const visited = visitedLinks.includes(link.key)
                    return (
                      <a
                        key={link.key}
                        href={link.url}
                        target="_blank"
                        rel="noopener"
                        onClick={(e) => { e.preventDefault(); handleCommunityClick(link.key, link.url) }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px', borderRadius: 8,
                          background: visited ? 'rgba(22,163,74,0.08)' : 'var(--bg2)',
                          border: `1px solid ${visited ? 'rgba(22,163,74,0.25)' : 'var(--border)'}`,
                          color: visited ? 'var(--green)' : 'var(--text2)',
                          fontSize: 12, fontWeight: 600,
                          textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                      >
                        <i className={link.icon} />
                        {link.label}
                        {visited && <i className="ti ti-check" style={{fontSize:11}} />}
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
