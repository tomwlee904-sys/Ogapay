import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE, getAccessToken, getStoredUser } from '../lib/api'

const OGAPAY_BLUE = '#121566'

// ─── Types ───
type TaskData = {
  id: string
  title: string
  description: string
  longDescription: string
  status: string
  category: string
  type: string
  expiryDate: string | null
  reward: number
  rewardCurrency: string
  usdValue: number
  slots: number
  filled: number
  winners: number
  platform: string
  difficulty: string
  timeEstimate: string
  tags: string[]
  instructions: string
  requirements: string[]
  proofRequired: boolean
  creatorId: string
  creator: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null; walletAddress: string | null; isVerified: boolean }
}

type OnboardingStatus = {
  walletConnected: boolean
  xConnected: boolean
  telegramConnected: boolean
  emailVerified: boolean
  kycVerified: boolean
}

type SubmissionStatus = {
  hasSubmitted: boolean
  isApproved: boolean
  isPending: boolean
}

// ─── Helpers ───
const OGAPAY_BLUE_LIGHT = '#EEEDFE'
const OGAPAY_BLUE_DARK = '#534AB7'

function formatAddress(addr: string | null) {
  if (!addr) return '??'
  return addr.length > 12 ? addr.slice(0, 4) + '...' + addr.slice(-4) : addr
}

function getInitials(first: string, last: string) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '?'
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.floor(hrs / 24)
  if (days < 30) return days + 'd ago'
  return new Date(dateStr).toLocaleDateString()
}

// ─── API fetches ───
async function fetchTask(id: string): Promise<TaskData | null> {
  try {
    const token = getAccessToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token

    // Try /tasks/:id first
    let res = await fetch(API_BASE + '/tasks/' + id, { headers })
    if (!res.ok) {
      // Try /jobs/:id
      res = await fetch(API_BASE + '/jobs/' + id, { headers })
    }
    const json = await res.json()
    const data = json?.data || json
    if (!data) return null

    // Format tags
    let tags: string[] = []
    if (Array.isArray(data.tags)) tags = data.tags
    else if (typeof data.tags === 'string') tags = data.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    else if (data.category) tags = [data.category]

    const creatorRaw = data.poster || data.creator || {}
    const creator = {
      id: creatorRaw.id || '',
      username: creatorRaw.username || creatorRaw.nickname || 'OgaPay',
      firstName: creatorRaw.firstName || creatorRaw.first_name || '',
      lastName: creatorRaw.lastName || creatorRaw.last_name || '',
      avatarUrl: creatorRaw.avatarUrl || creatorRaw.avatar_url || creatorRaw.pfp_url || null,
      walletAddress: creatorRaw.walletAddress || creatorRaw.wallet_address || null,
      isVerified: !!creatorRaw.isVerified || !!creatorRaw.is_verified || !!creatorRaw.verified_creator,
    }

    return {
      id: data.id || id,
      title: data.title || 'Untitled Task',
      description: data.description || '',
      longDescription: data.longDescription || data.long_description || data.description || '',
      status: (data.status || 'open').toLowerCase(),
      category: data.category || 'General',
      type: data.type || data.taskType || 'Standard',
      expiryDate: data.expiryDate || data.expiry_date || data.deadline || null,
      reward: Number(data.reward) || 0,
      rewardCurrency: data.currency || data.rewardCurrency || 'SOL',
      usdValue: Number(data.usdValue || data.usd_value || 0),
      slots: data.maxWorkers || data.max_workers || data.slots || 1,
      filled: data.currentWorkers || data.current_workers || data.filled || 0,
      winners: data.winners || data.winnerCount || 0,
      platform: data.platform || (tags[0] || 'Web'),
      difficulty: data.difficulty || 'Medium',
      timeEstimate: data.estimatedTime ? data.estimatedTime + ' min' : data.timeEstimate || '—',
      tags,
      instructions: data.instructions || '',
      requirements: data.requirements || data.requirementList || [],
      proofRequired: !!data.proofRequired || !!data.proof_required,
      creatorId: creator.id,
      creator,
    }
  } catch {
    return null
  }
}

async function fetchRelatedTasks(category: string, excludeId: string): Promise<any[]> {
  try {
    const res = await fetch(API_BASE + '/tasks?category=' + encodeURIComponent(category) + '&limit=4')
    const json = await res.json()
    const items = json?.data || json || []
    return items.filter((t: any) => t.id !== excludeId).slice(0, 3)
  } catch { return [] }
}

async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    const token = getAccessToken()
    if (!token) return { walletConnected: false, xConnected: false, telegramConnected: false, emailVerified: false, kycVerified: false }
    const headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    const res = await fetch(API_BASE + '/users/me', { headers })
    const json = await res.json()
    const user = json?.data || json
    return {
      walletConnected: !!user.walletAddress || !!user.wallet_address || !!user.isWalletConnected,
      xConnected: !!user.xUsername || !!user.twitterUsername || !!user.isXConnected,
      telegramConnected: !!user.telegramUsername || !!user.isTelegramConnected,
      emailVerified: !!user.isEmailVerified || !!user.emailVerified,
      kycVerified: !!user.isKycVerified || !!user.kycVerified || !!user.isHumanVerified,
    }
  } catch {
    return { walletConnected: false, xConnected: false, telegramConnected: false, emailVerified: false, kycVerified: false }
  }
}

async function fetchSubmissionStatus(taskId: string): Promise<SubmissionStatus> {
  try {
    const token = getAccessToken()
    if (!token) return { hasSubmitted: false, isApproved: false, isPending: false }
    const res = await fetch(API_BASE + '/tasks/' + taskId + '/submissions?limit=1', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    const json = await res.json()
    const subs = json?.data || json || []
    const mine = Array.isArray(subs) ? subs.find((s: any) => s.workerId === getStoredUser()?.id) : null
    if (!mine) return { hasSubmitted: false, isApproved: false, isPending: false }
    const st = (mine.status || '').toLowerCase()
    return {
      hasSubmitted: true,
      isApproved: st === 'approved' || st === 'accepted',
      isPending: st === 'pending' || st === 'submitted',
    }
  } catch { return { hasSubmitted: false, isApproved: false, isPending: false } }
}

// ─── Component ───
export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null)
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus | null>(null)
  const [related, setRelated] = useState<any[]>([])
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportMsg, setReportMsg] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchTask(id),
      fetchOnboardingStatus(),
      fetchSubmissionStatus(id),
    ]).then(([taskData, ob, sub]) => {
      setTask(taskData)
      setOnboarding(ob)
      setSubmissionStatus(sub)
      if (taskData) {
        fetchRelatedTasks(taskData.category, id).then(setRelated)
      }
      setLoading(false)
    })
  }, [id])

  // ── Onboarding checks ──
  const missingChecks: { label: string; action: string; key: keyof OnboardingStatus }[] = []
  if (onboarding) {
    if (!onboarding.walletConnected) missingChecks.push({ label: 'Connect a Solana wallet', action: 'Connect Wallet', key: 'walletConnected' })
    if (!onboarding.xConnected) missingChecks.push({ label: 'Connect your X/Twitter account', action: 'Connect X', key: 'xConnected' })
    if (!onboarding.telegramConnected) missingChecks.push({ label: 'Connect your Telegram', action: 'Connect Telegram', key: 'telegramConnected' })
    if (!onboarding.emailVerified) missingChecks.push({ label: 'Verify your email address', action: 'Verify Email', key: 'emailVerified' })
    if (!onboarding.kycVerified) missingChecks.push({ label: 'Complete KYC verification', action: 'Verify KYC', key: 'kycVerified' })
  }

  const canApply = onboarding && missingChecks.length === 0 && !submissionStatus?.hasSubmitted

  // ── Apply handler ──
  const handleApply = async () => {
    if (!task || !canApply) return
    setApplying(true)
    setError('')
    try {
      const token = getAccessToken()
      if (!token) { navigate('/login'); return }
      const res = await fetch(API_BASE + '/tasks/' + task.id + '/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Failed to apply')
      setApplied(true)
    } catch (err: any) {
      setError(err.message)
    }
    setApplying(false)
  }

  // ── Report handler ──
  const handleReport = async () => {
    if (!task || !reportReason.trim()) return
    try {
      const token = getAccessToken()
      if (!token) { navigate('/login'); return }
      await fetch(API_BASE + '/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ taskId: task.id, reason: reportReason, message: reportMsg }),
      })
      setShowReportModal(false)
      setReportReason('')
      setReportMsg('')
    } catch {}
  }

  // ── Loading state ──
  if (loading) {
    return (
      <Layout>
        <div className="jd-wrap">
          <div className="jd-loading">
            {[1,2,3,4,5].map(i => <div key={i} className="jd-skel" style={{ height: i === 1 ? 200 : 80, marginBottom: 14 }} />)}
          </div>
        </div>
        <style>{jdStyles}</style>
      </Layout>
    )
  }

  // ── Not found ──
  if (!task) {
    return (
      <Layout>
        <div className="jd-wrap">
          <div className="jd-empty">
            <i className="ti ti-search-off" />
            <h2>Task Not Found</h2>
            <p>This task doesn't exist or has been removed.</p>
            <button className="jd-btn jd-btn-primary" onClick={() => navigate('/tasks')}>
              <i className="ti ti-arrow-left" /> Browse Tasks
            </button>
          </div>
        </div>
        <style>{jdStyles}</style>
      </Layout>
    )
  }

  const expiryDate = task.expiryDate ? new Date(task.expiryDate) : null
  const isExpired = expiryDate && expiryDate.getTime() < Date.now()
  const progressPct = task.slots > 0 ? Math.min(100, Math.round((task.filled / task.slots) * 100)) : 0
  const user = getStoredUser()
  const isOwnTask = user?.id === task.creatorId

  return (
    <Layout>
      <div className="jd-wrap">
        {/* ── Breadcrumb ── */}
        <div className="jd-breadcrumb">
          <button className="jd-bc-link" onClick={() => navigate('/tasks')}>
            <i className="ti ti-arrow-left" /> Tasks
          </button>
          <span className="jd-bc-sep">/</span>
          <span className="jd-bc-current">{task.title}</span>
        </div>

        <div className="jd-layout">
          {/* ═══ Main ═══ */}
          <div className="jd-main">

            {/* ── Creator Profile ── */}
            <div className="jd-creator-card" onClick={() => task.creatorId && navigate('/user/' + task.creator.username)}>
              <div className="jd-creator-avatar" style={{ background: OGAPAY_BLUE }}>
                {task.creator.avatarUrl
                  ? <img src={task.creator.avatarUrl} alt="" />
                  : getInitials(task.creator.firstName, task.creator.lastName)
                }
              </div>
              <div className="jd-creator-info">
                <div className="jd-creator-name">
                  {task.creator.firstName || task.creator.username || 'OgaPay'}
                  {task.creator.isVerified && <i className="ti ti-badge-verified" style={{ color: '#2563eb', fontSize: 15 }} />}
                </div>
                <div className="jd-creator-handle">@{task.creator.username || 'ogapay'}</div>
                {task.creator.walletAddress && (
                  <div className="jd-creator-wallet" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(task.creator.walletAddress || '') }}>
                    <i className="ti ti-copy" /> {formatAddress(task.creator.walletAddress)}
                  </div>
                )}
              </div>
              <i className="ti ti-chevron-right jd-creator-arrow" />
            </div>

            {/* ── Status Banner ── */}
            <div className={`jd-status-banner ${task.status} ${isExpired ? 'expired' : ''}`}>
              <i className={`ti ${task.status === 'open' && !isExpired ? 'ti-circle-check' : isExpired ? 'ti-clock-off' : 'ti-lock'}`} />
              <span>{isExpired ? 'Expired' : task.status === 'open' ? 'Open for applications' : task.status === 'closed' ? 'Closed' : task.status}</span>
              {isExpired && <span className="jd-status-dot" />}
            </div>

            {/* ── Title & Badges ── */}
            <div className="jd-head-card">
              <div className="jd-badge-row">
                <span className="jd-badge jd-badge-cat">{task.category}</span>
                <span className="jd-badge jd-badge-type">{task.type}</span>
                {task.proofRequired && <span className="jd-badge jd-badge-proof"><i className="ti ti-shield-check" /> Proof Required</span>}
              </div>
              <h1 className="jd-title">{task.title}</h1>

              {/* ── Reward Card ── */}
              <div className="jd-reward-card">
                <div className="jd-reward-main">
                  <div className="jd-reward-label">Reward</div>
                  <div className="jd-reward-amount">
                    <span className="jd-reward-val">{task.reward.toLocaleString()}</span>
                    <span className="jd-reward-cur">{task.rewardCurrency}</span>
                  </div>
                  {task.usdValue > 0 && <div className="jd-reward-usd">≈ ${task.usdValue.toFixed(2)} USD</div>}
                </div>
                <div className="jd-reward-stats">
                  <div className="jd-stat-box">
                    <div className="jd-stat-val">{task.slots}</div>
                    <div className="jd-stat-lbl">Total Slots</div>
                  </div>
                  <div className="jd-stat-box">
                    <div className="jd-stat-val">{task.filled}</div>
                    <div className="jd-stat-lbl">Entries</div>
                  </div>
                  <div className="jd-stat-box">
                    <div className="jd-stat-val">{task.winners}</div>
                    <div className="jd-stat-lbl">Winners</div>
                  </div>
                </div>
              </div>

              {/* ── Deadline ── */}
              {expiryDate && (
                <div className={`jd-deadline ${isExpired ? 'expired' : ''}`}>
                  <div className="jd-deadline-icon"><i className={`ti ${isExpired ? 'ti-clock-off' : 'ti-clock'}`} /></div>
                  <div className="jd-deadline-info">
                    <div className="jd-deadline-label">{isExpired ? 'Expired' : 'Expires'}</div>
                    <div className="jd-deadline-date">
                      {expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Progress ── */}
              <div className="jd-progress-section">
                <div className="jd-progress-bar"><div className="jd-progress-fill" style={{ width: progressPct + '%' }} /></div>
                <div className="jd-progress-stats">
                  <span>{task.filled} / {task.slots} filled</span>
                  <span>{progressPct}%</span>
                </div>
              </div>
            </div>

            {/* ── Task Config ── */}
            <div className="jd-section">
              <h2 className="jd-section-title">Task Configuration</h2>
              <div className="jd-config-grid">
                <div className="jd-config-item">
                  <span className="jd-config-lbl">Status</span>
                  <span className={`jd-config-val jd-status-pill ${task.status}`}>{isExpired ? 'Expired' : task.status}</span>
                </div>
                <div className="jd-config-item">
                  <span className="jd-config-lbl">Category</span>
                  <span className="jd-config-val">{task.category}</span>
                </div>
                <div className="jd-config-item">
                  <span className="jd-config-lbl">Type</span>
                  <span className="jd-config-val">{task.type}</span>
                </div>
                <div className="jd-config-item">
                  <span className="jd-config-lbl">Difficulty</span>
                  <span className="jd-config-val">{task.difficulty}</span>
                </div>
                <div className="jd-config-item">
                  <span className="jd-config-lbl">Platform</span>
                  <span className="jd-config-val">{task.platform}</span>
                </div>
                <div className="jd-config-item">
                  <span className="jd-config-lbl">Time Estimate</span>
                  <span className="jd-config-val">{task.timeEstimate}</span>
                </div>
                {expiryDate && (
                  <div className="jd-config-item">
                    <span className="jd-config-lbl">Expiry</span>
                    <span className="jd-config-val">{expiryDate.toLocaleDateString()}</span>
                  </div>
                )}
                {task.tags.length > 0 && (
                  <div className="jd-config-item jd-config-tags">
                    <span className="jd-config-lbl">Tags</span>
                    <span className="jd-config-val" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {task.tags.map((t, i) => <span key={i} className="jd-pill-tag">{t}</span>)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Description ── */}
            <div className="jd-section">
              <h2 className="jd-section-title">Description</h2>
              <div className="jd-desc">{task.longDescription || task.description}</div>
            </div>

            {/* ── Instructions ── */}
            {task.instructions && (
              <div className="jd-section">
                <h2 className="jd-section-title">Instructions</h2>
                <div className="jd-instructions">
                  {task.instructions.split('\n').filter(Boolean).map((step, i) => (
                    <div className="jd-step" key={i}>
                      <span className="jd-step-num" style={{ background: OGAPAY_BLUE }}>{i + 1}</span>
                      <span className="jd-step-text">{step.replace(/^\d+[\.\)]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Requirements ── */}
            {task.requirements.length > 0 && (
              <div className="jd-section">
                <h2 className="jd-section-title">Requirements</h2>
                <ul className="jd-req-list">
                  {task.requirements.map((r, i) => <li key={i}><i className="ti ti-check" style={{ color: '#16a34a' }} /> {r}</li>)}
                </ul>
              </div>
            )}

            {/* ── Action Buttons ── */}
            <div className="jd-actions">
              {isOwnTask ? (
                <>
                  <button className="jd-btn jd-btn-primary" onClick={() => navigate('/tasks/' + task.id + '/submissions')}>
                    <i className="ti ti-list" /> View Submissions
                  </button>
                  <button className="jd-btn jd-btn-outline" onClick={() => setShowReportModal(true)}>
                    <i className="ti ti-flag" /> Report Task
                  </button>
                </>
              ) : submissionStatus?.hasSubmitted ? (
                <div className="jd-submitted-banner">
                  <i className="ti ti-circle-check" style={{ color: '#16a34a', fontSize: 22 }} />
                  <div>
                    <strong>{submissionStatus.isApproved ? 'Approved' : submissionStatus.isPending ? 'Under Review' : 'Submitted'}</strong>
                    <p>{submissionStatus.isApproved ? 'Your submission was accepted' : submissionStatus.isPending ? 'Your submission is being reviewed' : 'You have submitted to this task'}</p>
                  </div>
                </div>
              ) : (
                <>
                  {onboarding && missingChecks.length > 0 && (
                    <div className="jd-onboarding-block">
                      <div className="jd-ob-title"><i className="ti ti-shield-off" /> Complete these to apply</div>
                      {missingChecks.map((check, i) => (
                        <div className="jd-ob-item" key={i}>
                          <i className="ti ti-alert-circle" style={{ color: '#f59e0b' }} />
                          <span>{check.label}</span>
                          <button className="jd-btn jd-btn-sm jd-btn-outline">{check.action}</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {applied ? (
                    <div className="jd-submitted-banner">
                      <i className="ti ti-circle-check" style={{ color: '#16a34a', fontSize: 22 }} />
                      <div>
                        <strong>Application Submitted!</strong>
                        <p>You can now submit your work</p>
                      </div>
                      <button className="jd-btn jd-btn-primary jd-btn-sm" onClick={() => navigate('/tasks/' + task.id + '/submit')}>
                        Submit Work <i className="ti ti-arrow-right" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="jd-btn jd-btn-primary jd-btn-apply"
                        onClick={() => navigate('/tasks/' + task.id + '/submit')}
                        disabled={(!isExpired && task.status !== 'open') || !canApply}
                      >
                        <i className="ti ti-send" /> Apply Now
                      </button>
                      {error && <div className="jd-error-msg"><i className="ti ti-alert-triangle" /> {error}</div>}
                    </>
                  )}

                  <div className="jd-actions-row">
                    <button className="jd-btn jd-btn-outline" onClick={() => navigate('/tasks/' + task.id + '/submissions')}>
                      <i className="ti ti-list" /> View Submissions
                    </button>
                    <button className="jd-btn jd-btn-outline jd-btn-danger" onClick={() => setShowReportModal(true)}>
                      <i className="ti ti-flag" /> Report
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ── Related Tasks ── */}
            {related.length > 0 && (
              <div className="jd-section">
                <h2 className="jd-section-title">Related Tasks</h2>
                <div className="jd-related-grid">
                  {related.map((rt: any) => (
                    <div className="jd-related-card" key={rt.id} onClick={() => navigate('/tasks/' + rt.id)}>
                      <div className="jd-related-cat">{rt.category || 'Task'}</div>
                      <div className="jd-related-title">{rt.title}</div>
                      <div className="jd-related-meta">
                        <span>◎ {Number(rt.reward).toLocaleString()} {rt.currency || 'SOL'}</span>
                        <span><i className="ti ti-users" /> {rt.currentWorkers || rt.filled || 0}/{rt.maxWorkers || rt.slots || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ═══ Sidebar ═══ */}
          <div className="jd-sidebar">
            {/* Statistics */}
            <div className="jd-side-card">
              <div className="jd-side-title">Participation</div>
              <div className="jd-side-stats">
                <div className="jd-side-stat"><span>Total Slots</span><span className="jd-side-stat-val">{task.slots}</span></div>
                <div className="jd-side-stat"><span>Entries</span><span className="jd-side-stat-val">{task.filled}</span></div>
                <div className="jd-side-stat"><span>Winners</span><span className="jd-side-stat-val" style={{ color: '#f5b301' }}>{task.winners}</span></div>
                <div className="jd-side-stat"><span>Remaining</span><span className="jd-side-stat-val">{task.slots - task.filled}</span></div>
              </div>
              <div className="jd-progress-bar" style={{ marginTop: 10 }}>
                <div className="jd-progress-fill" style={{ width: progressPct + '%' }} />
              </div>
            </div>

            {/* Task Info */}
            <div className="jd-side-card">
              <div className="jd-side-title">Details</div>
              <div className="jd-details-list">
                <div className="jd-detail-item">
                  <span className="jd-detail-lbl">Status</span>
                  <span className={`jd-status-pill ${task.status}`}>{isExpired ? 'Expired' : task.status}</span>
                </div>
                <div className="jd-detail-item">
                  <span className="jd-detail-lbl">Category</span>
                  <span>{task.category}</span>
                </div>
                <div className="jd-detail-item">
                  <span className="jd-detail-lbl">Type</span>
                  <span>{task.type}</span>
                </div>
                <div className="jd-detail-item">
                  <span className="jd-detail-lbl">Difficulty</span>
                  <span>{task.difficulty}</span>
                </div>
                <div className="jd-detail-item">
                  <span className="jd-detail-lbl">Time</span>
                  <span>{task.timeEstimate}</span>
                </div>
                {expiryDate && (
                  <div className="jd-detail-item">
                    <span className="jd-detail-lbl">Expires</span>
                    <span>{expiryDate.toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Creator mini */}
            <div className="jd-side-card">
              <div className="jd-side-title">Creator</div>
              <div className="jd-side-creator" onClick={() => navigate('/user/' + task.creator.username)}>
                <div className="jd-side-avatar" style={{ background: OGAPAY_BLUE }}>
                  {task.creator.avatarUrl ? <img src={task.creator.avatarUrl} alt="" /> : getInitials(task.creator.firstName, task.creator.lastName)}
                </div>
                <div>
                  <div className="jd-side-cr-name">{task.creator.firstName || task.creator.username}</div>
                  <div className="jd-side-cr-handle">@{task.creator.username}</div>
                </div>
              </div>
            </div>

            {/* Report Submission */}
            {!isOwnTask && (
              <button className="jd-btn jd-btn-outline jd-btn-full" onClick={() => setShowReportModal(true)}>
                <i className="ti ti-flag" /> Report Submission
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Report Modal ── */}
      {showReportModal && (
        <div className="jd-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="jd-modal" onClick={e => e.stopPropagation()}>
            <div className="jd-modal-head">
              <h3><i className="ti ti-flag" /> Report</h3>
              <button className="jd-modal-close" onClick={() => setShowReportModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="jd-modal-body">
              <label className="jd-modal-label">Reason</label>
              <select className="jd-modal-input" value={reportReason} onChange={e => setReportReason(e.target.value)}>
                <option value="">Select a reason...</option>
                <option value="spam">Spam</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="scam">Scam or fraud</option>
                <option value="offensive">Offensive</option>
                <option value="other">Other</option>
              </select>
              <label className="jd-modal-label" style={{ marginTop: 12 }}>Message (optional)</label>
              <textarea className="jd-modal-input jd-modal-textarea" rows={3} value={reportMsg} onChange={e => setReportMsg(e.target.value)} placeholder="Additional details..." />
              <button className="jd-btn jd-btn-danger jd-btn-full" style={{ marginTop: 16 }} onClick={handleReport} disabled={!reportReason.trim()}>
                <i className="ti ti-flag" /> Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{jdStyles}</style>
    </Layout>
  )
}

const jdStyles = `
/* ── Container ── */
.jd-wrap { max-width: 1100px; margin: 0 auto; padding: 20px 24px 60px; }
.jd-breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; font-size: 13px; }
.jd-bc-link { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; padding: 4px 0; transition: color .13s; }
.jd-bc-link:hover { color: var(--text); }
.jd-bc-sep { color: var(--text3); }
.jd-bc-current { color: var(--text); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px; }

.jd-layout { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
@media (max-width: 860px) { .jd-layout { grid-template-columns: 1fr; } }

/* ── Loading ── */
.jd-loading { padding: 40px 0; }
.jd-skel { background: var(--bg2); border-radius: 12px; animation: jd-shimmer 1.5s ease-in-out infinite; }
@keyframes jd-shimmer { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }

/* ── Empty ── */
.jd-empty { text-align: center; padding: 60px 20px; }
.jd-empty i { font-size: 48px; color: var(--text3); display: block; margin-bottom: 16px; }
.jd-empty h2 { font-family: Outfit, sans-serif; font-size: 22px; font-weight: 900; margin: 0 0 8px; color: var(--text); }
.jd-empty p { font-size: 14px; color: var(--text2); margin: 0 0 20px; }

/* ── Creator ── */
.jd-creator-card {
  display: flex; align-items: center; gap: 14px; padding: 16px 20px;
  background: var(--card); border: 1px solid var(--border); border-radius: 14px;
  margin-bottom: 14px; cursor: pointer; transition: border-color .13s;
}
.jd-creator-card:hover { border-color: var(--text2); }
.jd-creator-avatar { width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; color: #fff; font-size: 16px; font-weight: 800; overflow: hidden; }
.jd-creator-avatar img { width: 100%; height: 100%; object-fit: cover; }
.jd-creator-info { flex: 1; min-width: 0; }
.jd-creator-name { font-size: 15px; font-weight: 800; color: var(--text); display: flex; align-items: center; gap: 6px; }
.jd-creator-handle { font-size: 12px; color: var(--text2); font-weight: 600; }
.jd-creator-wallet { font-family: monospace; font-size: 11px; color: var(--text3); background: var(--bg2); border: 1px solid var(--border); border-radius: 6px; padding: 2px 8px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; margin-top: 3px; }
.jd-creator-wallet:hover { color: var(--text); }
.jd-creator-arrow { color: var(--text3); font-size: 18px; flex-shrink: 0; }

/* ── Status Banner ── */
.jd-status-banner {
  display: flex; align-items: center; gap: 8px; padding: 12px 20px;
  border-radius: 10px; margin-bottom: 14px; font-size: 13px; font-weight: 700;
}
.jd-status-banner.open { background: #052e16; color: #4ade80; }
.jd-status-banner.closed { background: #1c1917; color: #a8a29e; }
.jd-status-banner.expired { background: #1c1917; color: #fb923c; }
.jd-status-banner i { font-size: 18px; }
.jd-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #fb923c; animation: jd-pulse 1.5s infinite; margin-left: auto; }
@keyframes jd-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

/* ── Head Card ── */
.jd-head-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 14px; }
.jd-badge-row { display: flex; gap: 6px; flex-wrap: wrap; padding: 18px 22px 0; }
.jd-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }
.jd-badge-cat { background: #12156615; color: #121566; border: 1px solid #12156625; }
.jd-badge-type { background: var(--bg2); color: var(--text2); border: 1px solid var(--border); }
.jd-badge-proof { background: #1e1035; color: #c4b5fd; border: 1px solid rgba(196,181,253,.15); }
[data-theme="dark"] .jd-badge-cat { background: rgba(18,21,102,.2); color: #818cf8; border-color: rgba(18,21,102,.3); }
.jd-title { font-family: Outfit, sans-serif; font-size: 24px; font-weight: 900; margin: 12px 22px; line-height: 1.25; color: var(--text); }

/* ── Reward ── */
.jd-reward-card { display: flex; align-items: stretch; gap: 12px; padding: 16px 22px; border-top: 1px solid var(--border); background: var(--bg2); }
@media (max-width: 600px) { .jd-reward-card { flex-direction: column; } }
.jd-reward-main { flex: 1; }
.jd-reward-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--text3); margin-bottom: 4px; }
.jd-reward-amount { display: flex; align-items: baseline; gap: 6px; }
.jd-reward-val { font-size: 28px; font-weight: 900; color: var(--text); font-family: Outfit, sans-serif; }
.jd-reward-cur { font-size: 14px; font-weight: 700; color: var(--text2); }
.jd-reward-usd { font-size: 12px; color: var(--text2); font-weight: 600; margin-top: 2px; }
.jd-reward-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; flex-shrink: 0; }
.jd-stat-box { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; text-align: center; min-width: 72px; }
.jd-stat-val { font-size: 18px; font-weight: 900; color: var(--text); font-family: Outfit, sans-serif; }
.jd-stat-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text3); margin-top: 1px; }

/* ── Deadline ── */
.jd-deadline { display: flex; align-items: center; gap: 14px; padding: 14px 22px; border-top: 1px solid var(--border); }
.jd-deadline-icon { width: 38px; height: 38px; border-radius: 50%; background: var(--card); border: 1px solid var(--border); display: grid; place-items: center; flex-shrink: 0; }
.jd-deadline-icon i { font-size: 17px; color: var(--text2); }
.jd-deadline.expired .jd-deadline-icon i { color: #fb923c; }
.jd-deadline-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text3); }
.jd-deadline-date { font-size: 15px; font-weight: 800; color: var(--text); font-family: Outfit, sans-serif; }
.jd-deadline.expired .jd-deadline-date { color: #fb923c; }

/* ── Progress ── */
.jd-progress-section { padding: 0 22px 18px; }
.jd-progress-bar { height: 6px; border-radius: 999px; background: var(--bg2); overflow: hidden; border: 1px solid var(--border); }
.jd-progress-fill { height: 100%; border-radius: inherit; background: #121566; transition: width .5s; }
.jd-progress-stats { display: flex; justify-content: space-between; font-size: 11px; color: var(--text3); font-weight: 600; margin-top: 4px; }

/* ── Section ── */
.jd-section { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px 22px; margin-bottom: 14px; }
.jd-section-title { font-family: Outfit, sans-serif; font-size: 16px; font-weight: 800; margin: 0 0 14px; color: var(--text); }

/* ── Config Grid ── */
.jd-config-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
@media (max-width: 480px) { .jd-config-grid { grid-template-columns: 1fr; } }
.jd-config-item { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; }
.jd-config-tags { grid-column: 1 / -1; }
.jd-config-lbl { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--text3); }
.jd-config-val { font-size: 13px; font-weight: 700; color: var(--text); }
.jd-pill-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: #12156610; color: #121566; border: 1px solid #12156620; }
[data-theme="dark"] .jd-pill-tag { background: rgba(18,21,102,.2); color: #818cf8; border-color: rgba(18,21,102,.3); }
.jd-status-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 99px; }
.jd-status-pill.open { background: #052e16; color: #4ade80; }
.jd-status-pill.closed { background: #1c1917; color: #a8a29e; }
.jd-status-pill.expired { background: #1c1917; color: #fb923c; }

/* ── Description ── */
.jd-desc { font-size: 14px; line-height: 1.7; color: var(--text2); white-space: pre-wrap; }

/* ── Instructions ── */
.jd-instructions { display: flex; flex-direction: column; gap: 10px; }
.jd-step { display: flex; align-items: center; gap: 12px; }
.jd-step-num { width: 28px; height: 28px; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 800; display: grid; place-items: center; flex-shrink: 0; }
.jd-step-text { font-size: 13px; color: var(--text2); line-height: 1.4; }

/* ── Requirements ── */
.jd-req-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.jd-req-list li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text2); }

/* ── Actions ── */
.jd-actions { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px 22px; margin-bottom: 14px; }
.jd-actions-row { display: flex; gap: 8px; margin-top: 10px; }
.jd-actions-row .jd-btn { flex: 1; }

/* ── Onboarding Block ── */
.jd-onboarding-block { background: #1c1917; border: 1px solid #292524; border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; }
.jd-ob-title { font-size: 13px; font-weight: 800; color: #fb923c; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.jd-ob-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 12px; color: var(--text2); }
.jd-ob-item .jd-btn { margin-left: auto; flex-shrink: 0; font-size: 11px; height: 28px; padding: 0 10px; }
.jd-ob-item i { flex-shrink: 0; }

/* ── Submitted Banner ── */
.jd-submitted-banner { display: flex; align-items: center; gap: 14px; background: rgba(22,163,74,.06); border: 1px solid rgba(22,163,74,.15); border-radius: 12px; padding: 16px 20px; }
.jd-submitted-banner strong { display: block; font-size: 14px; color: var(--text); margin-bottom: 2px; }
.jd-submitted-banner p { font-size: 12px; color: var(--text2); margin: 0; }
.jd-submitted-banner .jd-btn { margin-left: auto; flex-shrink: 0; }

/* ── Error ── */
.jd-error-msg { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #ef4444; margin-top: 8px; }

/* ── Buttons ── */
.jd-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  height: 42px; padding: 0 20px; border-radius: 10px; font-size: 13px; font-weight: 700;
  border: 1.5px solid transparent; cursor: pointer; transition: all .13s;
  text-decoration: none; font-family: inherit; white-space: nowrap;
}
.jd-btn-primary { background: #121566; color: #fff; border-color: #121566; }
.jd-btn-primary:hover { opacity: .9; }
.jd-btn-primary:disabled { opacity: .4; cursor: not-allowed; }
.jd-btn-outline { background: transparent; border-color: var(--border); color: var(--text); }
.jd-btn-outline:hover { border-color: var(--text2); background: var(--bg2); }
.jd-btn-danger { color: #ef4444; border-color: rgba(239,68,68,.3); }
.jd-btn-danger:hover { background: rgba(239,68,68,.06); border-color: #ef4444; }
.jd-btn-sm { height: 34px; font-size: 12px; padding: 0 14px; }
.jd-btn-full { width: 100%; }
.jd-btn-apply { width: 100%; height: 48px; font-size: 15px; background: #121566; }

/* ── Related ── */
.jd-related-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
@media (max-width: 600px) { .jd-related-grid { grid-template-columns: 1fr; } }
.jd-related-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; cursor: pointer; transition: border-color .13s; }
.jd-related-card:hover { border-color: var(--text2); }
.jd-related-cat { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #121566; margin-bottom: 6px; }
.jd-related-title { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.jd-related-meta { display: flex; justify-content: space-between; font-size: 11px; color: var(--text2); font-weight: 600; }

/* ── Sidebar ── */
.jd-sidebar { display: flex; flex-direction: column; gap: 14px; }
.jd-side-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; }
.jd-side-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); margin-bottom: 12px; }
.jd-side-stats { display: flex; flex-direction: column; gap: 0; }
.jd-side-stat { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border); font-size: 13px; color: var(--text2); }
.jd-side-stat:last-child { border-bottom: none; }
.jd-side-stat-val { font-weight: 800; color: var(--text); }

.jd-details-list { display: flex; flex-direction: column; gap: 0; }
.jd-detail-item { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px dashed var(--border); font-size: 12px; color: var(--text2); }
.jd-detail-item:last-child { border-bottom: none; }
.jd-detail-lbl { font-weight: 600; color: var(--text2); }

.jd-side-creator { display: flex; align-items: center; gap: 12px; cursor: pointer; transition: opacity .13s; }
.jd-side-creator:hover { opacity: .75; }
.jd-side-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; color: #fff; font-size: 14px; font-weight: 800; overflow: hidden; }
.jd-side-avatar img { width: 100%; height: 100%; object-fit: cover; }
.jd-side-cr-name { font-size: 14px; font-weight: 800; color: var(--text); }
.jd-side-cr-handle { font-size: 11px; color: var(--text2); font-weight: 600; }

/* ── Report Modal ── */
.jd-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.jd-modal { background: var(--card); border: 1px solid var(--border); border-radius: 16px; max-width: 460px; width: 100%; max-height: 90vh; overflow-y: auto; }
.jd-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
.jd-modal-head h3 { font-size: 16px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 8px; }
.jd-modal-close { background: none; border: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--text2); font-size: 18px; }
.jd-modal-close:hover { background: var(--bg2); }
.jd-modal-body { padding: 18px 22px; }
.jd-modal-label { display: block; font-size: 12px; font-weight: 700; color: var(--text2); margin-bottom: 6px; }
.jd-modal-input { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 8px; background: var(--bg2); color: var(--text); font-size: 13px; font-family: inherit; }
.jd-modal-input:focus { outline: none; border-color: #121566; }
.jd-modal-textarea { resize: vertical; min-height: 70px; }

@media (max-width: 600px) {
  .jd-wrap { padding: 14px 16px 40px; }
  .jd-title { font-size: 20px; margin: 10px 16px; }
  .jd-badge-row { padding: 14px 16px 0; }
  .jd-reward-card { flex-direction: column; padding: 14px 16px; }
  .jd-reward-stats { grid-template-columns: repeat(3, 1fr); }
  .jd-reward-val { font-size: 24px; }
  .jd-head-card { border-radius: 12px; }
  .jd-section { padding: 16px; border-radius: 12px; }
  .jd-actions { padding: 16px; }
  .jd-related-grid { grid-template-columns: 1fr; }
  .jd-actions-row { flex-direction: column; }
  .jd-creator-card { padding: 12px 16px; }
}
`
