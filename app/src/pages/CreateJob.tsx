import { useState, useMemo } from 'react'
import Layout from '../components/Layout'

// ─── Action Definitions (from Wurk.fun) ───
type ActionConfig = {
  id: string
  label: string
  description: string
  minPer: number         // min SOL per completion
  maxPerComponent: number // max completions per component
  icon: string           // SVG path or emoji fallback
  platformId: string
}

const ACTIONS: ActionConfig[] = [
  // X / Twitter
  { id: 'x_followers', label: 'Followers', description: 'Get X followers', minPer: 0.003, maxPerComponent: 100, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', platformId: 'x' },
  { id: 'x_followers_verified', label: 'Followers (Verified)', description: 'Get X followers (verified accounts)', minPer: 0.01, maxPerComponent: 50, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', platformId: 'x' },
  { id: 'reposts', label: 'Reposts', description: 'Get X reposts', minPer: 0.005, maxPerComponent: 100, icon: 'M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3', platformId: 'x' },
  { id: 'likes', label: 'Likes', description: 'Get X likes', minPer: 0.001, maxPerComponent: 200, icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', platformId: 'x' },
  { id: 'comments_x', label: 'Comments', description: 'Get X comments', minPer: 0.008, maxPerComponent: 50, icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', platformId: 'x' },
  { id: 'bookmarks', label: 'Bookmarks', description: 'Get X bookmarks', minPer: 0.002, maxPerComponent: 100, icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z', platformId: 'x' },
  { id: 'x_raid', label: 'Raid', description: 'X raid engagement', minPer: 0.006, maxPerComponent: 50, icon: 'M13 10V3L4 14h7v7l9-11h-7z', platformId: 'x' },
  // Instagram
  { id: 'followers_insta', label: 'Followers', description: 'Get Instagram followers', minPer: 0.004, maxPerComponent: 100, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', platformId: 'instagram' },
  { id: 'likes_insta', label: 'Likes', description: 'Get Instagram likes', minPer: 0.001, maxPerComponent: 200, icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', platformId: 'instagram' },
  { id: 'comments_insta', label: 'Comments', description: 'Get Instagram comments', minPer: 0.008, maxPerComponent: 50, icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', platformId: 'instagram' },
  // YouTube
  { id: 'subscribers_youtube', label: 'Subscribers', description: 'Get YouTube subscribers', minPer: 0.005, maxPerComponent: 50, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', platformId: 'youtube' },
  { id: 'likes_youtube', label: 'Likes', description: 'Get YouTube likes', minPer: 0.001, maxPerComponent: 200, icon: 'M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5', platformId: 'youtube' },
  { id: 'comments_youtube', label: 'Comments', description: 'Get YouTube comments', minPer: 0.008, maxPerComponent: 50, icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', platformId: 'youtube' },
  // Telegram
  { id: 'members_telegram', label: 'Members', description: 'Get Telegram members', minPer: 0.002, maxPerComponent: 200, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', platformId: 'telegram' },
  // Discord
  { id: 'members_discord', label: 'Members', description: 'Get Discord members', minPer: 0.003, maxPerComponent: 100, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', platformId: 'discord' },
  // TikTok
  { id: 'followers_tiktok', label: 'Followers', description: 'Get TikTok followers', minPer: 0.004, maxPerComponent: 100, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', platformId: 'tiktok' },
  { id: 'likes_tiktok', label: 'Likes', description: 'Get TikTok likes', minPer: 0.001, maxPerComponent: 200, icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', platformId: 'tiktok' },
]

// Platform definitions
const PLATFORMS = [
  { id: 'x', name: 'X / Twitter', color: '#000000', icon: 'ti-brand-x' },
  { id: 'instagram', name: 'Instagram', color: '#E4405F', icon: 'ti-brand-instagram' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', icon: 'ti-brand-youtube' },
  { id: 'telegram', name: 'Telegram', color: '#0088cc', icon: 'ti-brand-telegram' },
  { id: 'discord', name: 'Discord', color: '#5865F2', icon: 'ti-brand-discord' },
  { id: 'tiktok', name: 'TikTok', color: '#000000', icon: 'ti-brand-tiktok' },
]

type ComponentState = {
  enabled: boolean
  actionId: string
  budget: number        // total SOL budget for this component
  amount: number        // number of completions
}

type ModeType = 'select' | 'quick' | 'social' | 'custom'

export default function CreateJob() {
  const [mode, setMode] = useState<ModeType>('select')
  const [currency, setCurrency] = useState<'SOL' | 'USDC' | 'NGN'>('SOL')
  const [components, setComponents] = useState<Record<string, ComponentState>>({})
  const [showSuccess, setShowSuccess] = useState(false)

  // Quick Job mode
  const [quickUrl, setQuickUrl] = useState('')
  const [quickPlatform, setQuickPlatform] = useState('x')
  const [quickAction, setQuickAction] = useState('reposts')
  const [quickAmount, setQuickAmount] = useState(50)
  const [quickBudget, setQuickBudget] = useState(0.25)

  // Get available actions for a platform
  const getActionsForPlatform = (platformId: string) =>
    ACTIONS.filter(a => a.platformId === platformId)

  // Get default action for a platform
  const getDefaultAction = (platformId: string) => {
    const actions = getActionsForPlatform(platformId)
    return actions[0]?.id || ''
  }

  // Toggle component (platform+action combination)
  const toggleComponent = (platformId: string, actionId: string) => {
    const key = `${platformId}:${actionId}`
    setComponents(prev => {
      if (prev[key]) {
        return { ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }
      }
      const action = ACTIONS.find(a => a.id === actionId)
      return {
        ...prev,
        [key]: { enabled: true, actionId, budget: action ? action.minPer * 50 : 0.25, amount: 50 }
      }
    })
  }

  const updateComponent = (key: string, field: 'budget' | 'amount', value: number) => {
    setComponents(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }))
  }

  const changeComponentAction = (key: string, newActionId: string) => {
    setComponents(prev => {
      const existing = prev[key]
      const action = ACTIONS.find(a => a.id === newActionId)
      return {
        ...prev,
        [key]: { ...existing, actionId: newActionId, budget: action ? action.minPer * (existing?.amount || 50) : existing?.budget || 0.25 }
      }
    })
  }

  // Computed values
  const enabledComponents = Object.entries(components).filter(([, v]) => v.enabled)

  const totalBudget = enabledComponents.reduce((sum, [, v]) => sum + (v.budget || 0), 0)
  const platformFee = totalBudget * 0.1  // 10% fee like Wurk.fun
  const grandTotal = totalBudget + platformFee
  const totalCompletions = enabledComponents.reduce((sum, [, v]) => sum + (v.amount || 0), 0)

  const formatSol = (val: number) => val.toFixed(3)

  const handlePay = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 4000)
  }

  // ─── Mode Selection Screen ───
  if (mode === 'select') {
    return (
      <Layout>
        <style>{createStyles}</style>
        <div className="create-page">
          <div className="create-container create-container--select-mode">
            <div className="create-wrapper">
              <div className="create-header">
                <h1 className="create-title">Create a Job</h1>
                <p className="create-subtitle">Create social or custom jobs to boost your community's growth and engagement</p>
              </div>

              <div className="mode-selection-container">
                {/* Quick Job */}
                <div className="mode-card" onClick={() => setMode('quick')}>
                  <div className="mode-card-badge">1</div>
                  <div className="mode-card-icon" style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />
                    </svg>
                  </div>
                  <div className="mode-card-text">
                    <h3>Quick jobs</h3>
                    <p>Select a preset job and paste your link to get started instantly</p>
                  </div>
                  <svg className="mode-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>

                <div className="mode-divider">
                  <span>OR</span>
                </div>

                {/* Social Cluster */}
                <div className="mode-card" onClick={() => setMode('social')}>
                  <div className="mode-card-badge">2</div>
                  <div className="mode-card-icon" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  </div>
                  <div className="mode-card-text">
                    <h3>Socials cluster</h3>
                    <p>Create a bundle of social actions across multiple platforms</p>
                  </div>
                  <svg className="mode-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>

                <div className="mode-divider">
                  <span>OR</span>
                </div>

                {/* Custom Job */}
                <div className="mode-card" onClick={() => setMode('custom')}>
                  <div className="mode-card-badge">3</div>
                  <div className="mode-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                  <div className="mode-card-text">
                    <h3>Custom Job</h3>
                    <p>Create a completely custom job with specific requirements</p>
                  </div>
                  <svg className="mode-card-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // ─── Quick Job Mode ───
  if (mode === 'quick') {
    const currentActions = getActionsForPlatform(quickPlatform)
    const selectedAction = ACTIONS.find(a => a.id === quickAction) || currentActions[0]
    const minBudget = selectedAction ? selectedAction.minPer * quickAmount : 0.25
    const quickFee = Math.max(quickBudget, minBudget) * 0.1
    const quickTotal = Math.max(quickBudget, minBudget) + quickFee
    const perActionReward = Math.max(quickBudget, minBudget) / quickAmount

    return (
      <Layout>
        <style>{createStyles}</style>
        <div className="create-page">
          <div className="create-container">
            <div className="create-wrapper">
              <div className="create-header">
                <button className="back-btn" onClick={() => setMode('select')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <h1 className="create-title">Quick Job</h1>
                <p className="create-subtitle">Paste your post URL and configure the job</p>
              </div>

              <div className="quick-job-form">
                <div className="form-section">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Platform</label>
                      <select
                        className="form-select"
                        value={quickPlatform}
                        onChange={e => {
                          setQuickPlatform(e.target.value)
                          const actions = getActionsForPlatform(e.target.value)
                          setQuickAction(actions[0]?.id || '')
                        }}
                      >
                        {PLATFORMS.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Action</label>
                      <select
                        className="form-select"
                        value={quickAction}
                        onChange={e => setQuickAction(e.target.value)}
                      >
                        {currentActions.map(a => (
                          <option key={a.id} value={a.id}>{a.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Post URL</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="https://x.com/username/status/123456789"
                      value={quickUrl}
                      onChange={e => setQuickUrl(e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Amount</label>
                      <input
                        type="number"
                        className="form-input"
                        min={1}
                        max={selectedAction?.maxPerComponent || 100}
                        value={quickAmount}
                        onChange={e => setQuickAmount(Math.min(Number(e.target.value) || 1, selectedAction?.maxPerComponent || 100))}
                      />
                      <span className="form-hint">Max: {selectedAction?.maxPerComponent || 100}</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Budget ({currency})</label>
                      <input
                        type="number"
                        className="form-input"
                        step={0.001}
                        min={minBudget}
                        value={quickBudget}
                        onChange={e => setQuickBudget(Number(e.target.value) || minBudget)}
                      />
                      <span className="form-hint">Min: {formatSol(minBudget)} {currency}</span>
                    </div>
                  </div>
                </div>

                <div className="quick-summary">
                  <div className="summary-row-inline">
                    <span>Reward per action</span>
                    <strong>{formatSol(perActionReward)} {currency}</strong>
                  </div>
                  <div className="summary-row-inline">
                    <span>Platform fee (10%)</span>
                    <strong>{formatSol(quickFee)} {currency}</strong>
                  </div>
                  <div className="summary-row-inline summary-total-inline">
                    <span>Total</span>
                    <strong>{formatSol(quickTotal)} {currency}</strong>
                  </div>
                </div>

                <button className="btn-primary btn-full" onClick={handlePay}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Continue & Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // ─── Social Cluster Mode ───
  if (mode === 'social') {
    return (
      <Layout>
        <style>{createStyles}</style>
        <div className="create-page">
          <div className="create-container">
            <div className="create-wrapper">
              <div className="create-header">
                <button className="back-btn" onClick={() => setMode('select')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <h1 className="create-title">Socials Cluster</h1>
                <p className="create-subtitle" style={{ marginBottom: '0.5rem' }}>
                  Select platforms and configure actions. Total: <strong>{enabledComponents.length} component{enabledComponents.length !== 1 ? 's' : ''}</strong>
                  {totalCompletions > 0 && <> · <strong>{totalCompletions}</strong> total completions</>}
                </p>
              </div>

              {/* Platform Selector */}
              <div className="platform-selector">
                {PLATFORMS.map(p => {
                  const availableActions = getActionsForPlatform(p.id)
                  return (
                    <div key={p.id} className="platform-section">
                      <div className="platform-header">
                        <div className="platform-icon-wrap">
                          <i className={`ti ${p.icon}`} style={{ color: p.color }} />
                        </div>
                        <span className="platform-name">{p.name}</span>
                      </div>
                      <div className="platform-actions">
                        {availableActions.map(action => {
                          const key = `${p.id}:${action.id}`
                          const comp = components[key]
                          const isEnabled = comp?.enabled || false
                          return (
                            <div key={action.id} className={`component-card ${isEnabled ? 'component-card--active' : ''}`}>
                              <label className="component-card-main">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => toggleComponent(p.id, action.id)}
                                />
                                <div className="component-card-info">
                                  <div className="component-card-icon-wrap">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d={action.icon} />
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="component-card-label">{action.label}</div>
                                    <div className="component-card-desc">{action.description}</div>
                                  </div>
                                </div>
                              </label>
                              {isEnabled && comp && (
                                <div className="component-card-controls">
                                  <div className="ctrl-group">
                                    <label>Budget ({currency})</label>
                                    <input
                                      type="number"
                                      className="form-input ctrl-input"
                                      step={0.001}
                                      min={action.minPer * comp.amount}
                                      value={comp.budget}
                                      onChange={e => updateComponent(key, 'budget', Number(e.target.value) || action.minPer)}
                                    />
                                  </div>
                                  <div className="ctrl-group">
                                    <label>Amount</label>
                                    <input
                                      type="number"
                                      className="form-input ctrl-input"
                                      min={1}
                                      max={action.maxPerComponent}
                                      value={comp.amount}
                                      onChange={e => updateComponent(key, 'amount', Math.min(Number(e.target.value) || 1, action.maxPerComponent))}
                                    />
                                  </div>
                                  <div className="ctrl-group ctrl-reward">
                                    <label>Per action</label>
                                    <div className="ctrl-reward-value">
                                      {comp.amount > 0 ? formatSol(comp.budget / comp.amount) : '0.000'} {currency}
                                    </div>
                                    <div className="ctrl-reward-min">
                                      min {formatSol(action.minPer)} {currency}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              {enabledComponents.length > 0 && (
                <div className="social-summary">
                  <div className="summary-title">Summary</div>
                  {enabledComponents.map(([key, comp]) => {
                    const [, actionId] = key.split(':')
                    const action = ACTIONS.find(a => a.id === actionId)
                    const platform = PLATFORMS.find(p => p.id === action?.platformId)
                    return (
                      <div key={key} className="summary-item">
                        <div className="summary-item-label">
                          <span className="summary-item-platform">{platform?.name}</span>
                          <span className="summary-item-action">{action?.label}</span>
                          <span className="summary-item-amount">×{comp.amount}</span>
                        </div>
                        <div className="summary-item-value">
                          {formatSol(comp.budget)} {currency}
                        </div>
                      </div>
                    )
                  })}
                  <div className="summary-divider" />
                  <div className="summary-item">
                    <span>Total budget</span>
                    <strong>{formatSol(totalBudget)} {currency}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Platform fee (10%)</span>
                    <strong>{formatSol(platformFee)} {currency}</strong>
                  </div>
                  <div className="summary-item summary-grand-total">
                    <span>Grand total</span>
                    <strong>{formatSol(grandTotal)} {currency}</strong>
                  </div>

                  <button className="btn-primary btn-full" onClick={handlePay} disabled={enabledComponents.length === 0}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Continue & Pay
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // ─── Custom Job Mode ───
  return (
    <Layout>
      <style>{createStyles}</style>
      <div className="create-page">
        <div className="create-container">
          <div className="create-wrapper">
            <div className="create-header">
              <button className="back-btn" onClick={() => setMode('select')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="create-title">Custom Job</h1>
              <p className="create-subtitle">Create a completely custom job with specific requirements</p>
            </div>

            <form className="custom-job-form" onSubmit={e => { e.preventDefault(); handlePay() }}>
              <div className="form-section">
                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input type="text" className="form-input" placeholder="e.g. Review my UI design" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input form-textarea" placeholder="Describe what workers need to do..." rows={4} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select">
                      <option>Social Media</option>
                      <option>Content Creation</option>
                      <option>Testing & Review</option>
                      <option>Design</option>
                      <option>Development</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select className="form-select">
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Reward per Worker ({currency})</label>
                    <input type="number" className="form-input" step={0.001} min={0.001} defaultValue={0.025} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Available Slots</label>
                    <input type="number" className="form-input" min={1} defaultValue={50} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <label className="form-label">Instructions</label>
                <textarea className="form-input form-textarea" placeholder="Provide detailed step-by-step instructions for workers..." rows={5} />
              </div>

              <button type="submit" className="btn-primary btn-full">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Create & Fund Job
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// ─── Styles ───
const createStyles = `
.create-page{width:100%;max-width:1000px;margin:0 auto;padding:2rem 1rem 4rem}
.create-container{width:100%}
.create-header{margin-bottom:2rem}
.create-title{font-family:Outfit;font-size:1.75rem;font-weight:900;margin:0;letter-spacing:-.02em;color:var(--text)}
.create-subtitle{color:var(--text2);font-size:.875rem;margin:.25rem 0 0;line-height:1.5}
.back-btn{display:inline-flex;align-items:center;gap:6px;font-size:.8125rem;color:var(--text2);margin-bottom:.75rem;cursor:pointer;border:0;background:none;padding:4px 8px;border-radius:6px;transition:all .15s}
.back-btn:hover{color:var(--text);background:var(--bg2)}

/* Mode Selection */
.mode-selection-container{max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:0}
.mode-card{display:flex;align-items:center;gap:14px;padding:1.25rem;border-radius:12px;border:1.5px solid var(--border);background:var(--card);cursor:pointer;transition:all .2s ease;position:relative}
.mode-card:hover{border-color:var(--accent);box-shadow:0 4px 12px rgba(124,58,237,.08)}
.mode-card-badge{position:absolute;top:-12px;left:16px;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#A78BFA,#7C3AED);color:white;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:800;box-shadow:0 2px 8px rgba(124,58,237,.3);border:2px solid var(--card)}
.mode-card-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mode-card-text{flex:1;min-width:0}
.mode-card-text h3{font-size:.9375rem;font-weight:700;margin:0;color:var(--text)}
.mode-card-text p{font-size:.8125rem;color:var(--text2);margin:2px 0 0;line-height:1.4}
.mode-card-arrow{color:var(--text3);flex-shrink:0}
.mode-divider{display:flex;align-items:center;gap:12px;margin:8px 0}
.mode-divider::before,.mode-divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--border),transparent)}
.mode-divider span{font-size:.625rem;font-weight:800;color:var(--text3);letter-spacing:.08em;text-transform:uppercase}

/* Form Elements */
.form-section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1.25rem;margin-bottom:1rem}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:600px){.form-row{grid-template-columns:1fr}}
.form-group{margin-bottom:0;display:flex;flex-direction:column;gap:6px}
.form-label{font-size:.8125rem;font-weight:700;color:var(--text);margin-bottom:2px}
.form-input,.form-select{padding:10px 12px;border-radius:8px;border:1.5px solid var(--border);background:var(--bg);color:var(--text);font-size:.875rem;transition:border-color .15s;width:100%;box-sizing:border-box}
.form-input:focus,.form-select:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 3px rgba(124,58,237,.12)}
.form-textarea{resize:vertical;min-height:100px}
.form-hint{font-size:.6875rem;color:var(--text3);margin-top:2px}

/* Quick Job */
.quick-job-form{max-width:600px}
.quick-summary{margin:1rem 0;padding:1rem;border-radius:10px;background:var(--bg2);border:1px solid var(--border)}
.summary-row-inline{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:.875rem;color:var(--text2)}
.summary-row-inline strong{color:var(--text)}
.summary-total-inline{border-top:1px solid var(--border);margin-top:6px;padding-top:8px;font-size:1rem}
.summary-total-inline strong{font-size:1.125rem;color:var(--accent)}

/* Platform Selector (Social Cluster) */
.platform-selector{display:flex;flex-direction:column;gap:20px;margin-bottom:1.5rem}
.platform-section{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:1rem;overflow:hidden}
.platform-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)}
.platform-icon-wrap{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:var(--bg2);font-size:18px}
.platform-name{font-size:.875rem;font-weight:700;color:var(--text)}
.platform-actions{display:flex;flex-direction:column;gap:8px}

/* Component Card */
.component-card{border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--bg);transition:all .15s}
.component-card--active{border-color:var(--accent);background:var(--card)}
.component-card-main{display:flex;align-items:flex-start;gap:10px;cursor:pointer}
.component-card-main input[type=checkbox]{width:18px;height:18px;margin-top:3px;accent-color:var(--accent);cursor:pointer}
.component-card-info{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.component-card-icon-wrap{width:28px;height:28px;border-radius:7px;background:var(--bg2);display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0}
.component-card-label{font-size:.8125rem;font-weight:700;color:var(--text)}
.component-card-desc{font-size:.6875rem;color:var(--text3);margin-top:1px}
.component-card-controls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)}
@media(max-width:600px){.component-card-controls{grid-template-columns:1fr 1fr}}
.ctrl-group{display:flex;flex-direction:column;gap:4px}
.ctrl-group label{font-size:.6875rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em}
.ctrl-input{padding:6px 8px;font-size:.8125rem;height:32px}
.ctrl-reward{text-align:right}
@media(max-width:600px){.ctrl-reward{text-align:left}}
.ctrl-reward-value{font-size:.875rem;font-weight:700;color:var(--accent)}
.ctrl-reward-min{font-size:.625rem;color:var(--text3);margin-top:1px}

/* Social Summary */
.social-summary{margin-top:1.5rem;padding:1.25rem;border-radius:12px;background:var(--card);border:1px solid var(--border)}
.summary-title{font-size:.8125rem;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px}
.summary-item{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:.875rem;color:var(--text2)}
.summary-item-label{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.summary-item-platform{font-weight:600;color:var(--text)}
.summary-item-action{color:var(--text2)}
.summary-item-amount{color:var(--text3);font-size:.8125rem}
.summary-item-value{font-weight:600;color:var(--text)}
.summary-divider{height:1px;background:var(--border);margin:8px 0}
.summary-grand-total{font-size:1rem;padding-top:6px;border-top:1px solid var(--border);margin-top:4px}
.summary-grand-total strong{color:var(--accent);font-size:1.125rem}

/* Buttons */
.btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border:0;border-radius:10px;background:linear-gradient(135deg,#A78BFA,#7C3AED);color:white;font-size:.875rem;font-weight:700;cursor:pointer;transition:all .15s}
.btn-primary:hover:not(:disabled){box-shadow:0 4px 12px rgba(124,58,237,.3);transform:translateY(-1px)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-full{width:100%;margin-top:1rem}

/* Select mode specific */
.create-container--select-mode .create-wrapper{max-width:720px;margin:0 auto}

/* Success overlay */
.success-overlay{position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center}
.success-card{background:var(--card);border-radius:16px;padding:2rem;text-align:center;max-width:380px;width:90%;border:1px solid var(--border)}
.success-icon{width:56px;height:56px;border-radius:50%;background:rgba(16,163,74,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;color:var(--green)}
.success-icon svg{width:28px;height:28px}
.success-card h2{font-size:1.25rem;font-weight:800;margin:0 0 .5rem;color:var(--text)}
.success-card p{font-size:.8125rem;color:var(--text2);margin:0 0 1.5rem;line-height:1.5}
.btn-done{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border:0;border-radius:8px;background:var(--accent);color:white;font-size:.8125rem;font-weight:700;cursor:pointer}
`
