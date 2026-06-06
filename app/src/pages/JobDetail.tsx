import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE, getAccessToken, getStoredUser } from '../lib/api'

// ── OgaPay Brand Colors ──
const BLUE = '#1F8CFF'
const BLUE_LIGHT = '#E8F4FD'
const BLUE_DARK = '#0D6EEB'

// ── Types ──
type TaskData = {
  id: string
  title: string
  description: string
  status: string
  category: string
  type: string
  reward: number
  currency: string
  usdValue: number
  slots: number
  slotsLeft: number
  completions: number
  deadline: string | null
  posted: string
  difficulty: string
  estimatedTime: string
  instructions: string
  requirements: string[]
  proofInstructions: string[]
  tags: string[]
  platform: string
  brand: string
  brandHandle: string
  brandVerified: boolean
  creatorId: string
  creator: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null; walletAddress: string | null; isVerified: boolean }
  totalPool: number
  approvalTime: string
}

type OnboardingStatus = {
  walletConnected: boolean
  xConnected: boolean
  telegramConnected: boolean
  emailVerified: boolean
  kycVerified: boolean
}

type Submission = {
  id: string
  workerName: string
  workerInitials: string
  workerColor: string
  status: string
  time: string
}

// ── Helpers ──
function useCountdown(deadline: number) {
  const calc = () => {
    const diff = deadline - Date.now()
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 }
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, [deadline])
  return t
}

const pad = (n: number) => String(n).padStart(2, '0')
const pct = (a: number, b: number) => Math.round((a / b) * 100)

function getName(user: any) {
  return user?.firstName || user?.username || user?.fullName || 'OgaPay'
}

function getInitials(user: any) {
  const n = getName(user)
  return n.split(/\s+/).slice(0, 2).map((s: string) => s[0]).join('').toUpperCase() || '?'
}

function formatWallet(addr: string | null) {
  if (!addr) return ''
  return addr.length > 12 ? addr.slice(0, 4) + '...' + addr.slice(-4) : addr
}

// ── API Fetches ──
async function fetchTask(id: string): Promise<TaskData | null> {
  try {
    const token = getAccessToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token

    let res = await fetch(`${API_BASE}/tasks/${id}`, { headers })
    if (!res.ok) res = await fetch(`${API_BASE}/jobs/${id}`, { headers })
    const json = await res.json()
    // Handle nested data.task structure from single-task endpoint
    let data = json?.data?.task || json?.data || json
    if (!data || !data.id) {
      // Try /jobs/:id endpoint as alternative
      if (!res.ok) {
        const res2 = await fetch(`${API_BASE}/jobs/${id}`, { headers })
        const json2 = await res2.json()
        data = json2?.data?.task || json2?.data || json2
      }
    }
    if (!data || !data.id) return null

    const creatorRaw = data.poster || data.creator || {}
    const brandName = getName(creatorRaw) || 'OgaPay'
    const brandHandle = creatorRaw?.username ? `@${creatorRaw.username}` : '@OgaPayHQ'

    let tags: string[] = []
    if (Array.isArray(data.tags)) tags = data.tags
    else if (typeof data.tags === 'string') tags = data.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    else if (data.category) tags = [data.category]

    let instructions = ''
    if (data.instructions) instructions = data.instructions
    else if (data.description) {
      // Use description as instructions if no separate instructions
      instructions = data.description
    }

    const slots = data.maxWorkers || data.slots || 1
    const filled = data.currentWorkers || data.filled || 0

    return {
      id: data.id,
      title: data.title || 'Untitled Task',
      description: data.description || '',
      status: (data.status || 'open').toLowerCase(),
      category: data.category || 'General',
      type: data.type || data.taskType || 'Standard',
      reward: Number(data.reward) || 0,
      currency: data.currency || 'OGA',
      usdValue: Number(data.usdValue || data.usd_value || 0),
      slots,
      slotsLeft: slots - filled,
      completions: filled,
      deadline: data.expiryDate || data.expiry_date || data.deadline || null,
      posted: data.createdAt || data.posted || new Date().toISOString(),
      difficulty: data.difficulty || 'Easy',
      estimatedTime: data.estimatedTime ? `${data.estimatedTime} min` : data.timeEstimate || '2-4 mins',
      instructions,
      requirements: data.requirements || data.requirementList || [],
      proofInstructions: data.proofRequired ? (Array.isArray(data.proofRequired) ? data.proofRequired : ['Provide proof of completion']) : [],
      tags,
      platform: tags[0] || 'Web',
      brand: brandName,
      brandHandle,
      brandVerified: !!creatorRaw.isVerified || !!creatorRaw.verified_creator,
      creatorId: creatorRaw.id || '',
      creator: {
        id: creatorRaw.id || '',
        username: creatorRaw.username || creatorRaw.nickname || 'ogapay',
        firstName: creatorRaw.firstName || creatorRaw.first_name || '',
        lastName: creatorRaw.lastName || creatorRaw.last_name || '',
        avatarUrl: creatorRaw.avatarUrl || creatorRaw.avatar_url || creatorRaw.pfp_url || null,
        walletAddress: creatorRaw.walletAddress || creatorRaw.wallet_address || null,
        isVerified: !!creatorRaw.isVerified || !!creatorRaw.verified_creator,
      },
      totalPool: Number(data.totalPool || data.total_pool || data.reward * slots || 0),
      approvalTime: data.approvalTime || data.reviewTime || 'Within 24 hours',
    }
  } catch { return null }
}

async function fetchRelated(category: string, excludeId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/tasks?category=${encodeURIComponent(category)}&limit=4`)
    const json = await res.json()
    const items = json?.data || json || []
    return items.filter((t: any) => t.id !== excludeId).slice(0, 3)
  } catch { return [] }
}

async function fetchOnboarding(): Promise<OnboardingStatus> {
  try {
    const token = getAccessToken()
    if (!token) return { walletConnected: false, xConnected: false, telegramConnected: false, emailVerified: false, kycVerified: false }
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    const json = await res.json()
    const u = json?.data || json
    return {
      walletConnected: !!u.walletAddress || !!u.wallet_address || !!u.isWalletConnected,
      xConnected: !!u.xUsername || !!u.twitterUsername || !!u.isXConnected,
      telegramConnected: !!u.telegramUsername || !!u.isTelegramConnected,
      emailVerified: !!u.isEmailVerified || !!u.emailVerified,
      kycVerified: !!u.isKycVerified || !!u.kycVerified || !!u.isHumanVerified,
    }
  } catch { return { walletConnected: false, xConnected: false, telegramConnected: false, emailVerified: false, kycVerified: false } }
}

async function fetchSubmissions(taskId: string): Promise<Submission[]> {
  try {
    const token = getAccessToken()
    if (!token) return []
    const res = await fetch(`${API_BASE}/tasks/${taskId}/submissions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const json = await res.json()
    const items = json?.data || json || []
    if (!Array.isArray(items)) return []
    return items.map((s: any) => ({
      id: s.id || '',
      workerName: s.worker?.username || s.workerName || 'Worker',
      workerInitials: getInitials(s.worker || s),
      workerColor: s.workerColor || BLUE,
      status: (s.status || 'pending').toLowerCase(),
      time: s.createdAt || s.time || new Date().toISOString(),
    }))
  } catch { return [] }
}

// ── Badge Component ──
function JBadge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    blue: '#1F8CFF',
    green: '#16a34a',
    amber: '#f59e0b',
    red: '#ef4444',
    gray: '#6b7280',
  }
  const c = map[color] || map.blue
  return (
    <span className="jdg-badge" style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>
      {children}
    </span>
  )
}

// ── Countdown ──
function CountdownBlock({ deadline }: { deadline: number }) {
  const { d, h, m, s } = useCountdown(deadline)
  const units = [
    { v: d, l: 'Days' }, { v: h, l: 'Hrs' }, { v: m, l: 'Min' }, { v: s, l: 'Sec' },
  ]
  return (
    <div className="jdg-cdown">{units.map(({ v, l }) => (
      <div key={l} className="jdg-cdown-unit">
        <span className="jdg-cdown-val">{pad(v)}</span>
        <span className="jdg-cdown-lbl">{l}</span>
      </div>
    ))}</div>
  )
}

// ── Apply Modal ──
function ApplyModal({ task, onboarding, onClose }: { task: TaskData; onboarding: OnboardingStatus | null; onClose: () => void }) {
  const navigate = useNavigate()
  const missingChecks: { label: string; key: string }[] = []
  if (onboarding) {
    if (!onboarding.walletConnected) missingChecks.push({ label: 'Connect a Solana wallet', key: 'wallet' })
    if (!onboarding.xConnected) missingChecks.push({ label: 'Connect your X/Twitter account', key: 'x' })
    if (!onboarding.telegramConnected) missingChecks.push({ label: 'Connect your Telegram', key: 'telegram' })
    if (!onboarding.emailVerified) missingChecks.push({ label: 'Verify your email address', key: 'email' })
    if (!onboarding.kycVerified) missingChecks.push({ label: 'Complete KYC verification', key: 'kyc' })
  }

  return (
    <div className="jdg-modal-overlay" onClick={onClose}>
      <div className="jdg-modal" onClick={e => e.stopPropagation()}>
        <div className="jdg-modal-head">
          <h3><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Apply for this Task</h3>
          <button className="jdg-modal-x" onClick={onClose}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="jdg-modal-body">
          {missingChecks.length > 0 && (
            <div className="jdg-ob-block">
              <div className="jdg-ob-title">Complete these to apply</div>
              {missingChecks.map(c => (
                <div className="jdg-ob-item" key={c.key}>
                  <svg width="16" height="16" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          )}
          <div className="jdg-modal-info">
            <div className="jdg-modal-info-row">
              <span>Reward</span><span className="jdg-modal-info-val">{task.reward.toLocaleString()} {task.currency}</span>
            </div>
            <div className="jdg-modal-info-row">
              <span>Slots left</span><span className="jdg-modal-info-val">{task.slotsLeft} / {task.slots}</span>
            </div>
            <div className="jdg-modal-info-row">
              <span>Difficulty</span><span className="jdg-modal-info-val">{task.difficulty}</span>
            </div>
            <div className="jdg-modal-info-row">
              <span>Time</span><span className="jdg-modal-info-val">{task.estimatedTime}</span>
            </div>
          </div>
          <button
            className="jdg-btn jdg-btn-primary jdg-btn-full"
            onClick={() => { onClose(); navigate(`/tasks/${task.id}/submit`) }}
            disabled={missingChecks.length > 0}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {missingChecks.length > 0 ? 'Requirements Not Met' : `Apply & Earn ${task.reward.toLocaleString()} ${task.currency}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Report Modal ──
function ReportModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) return
    try {
      const token = getAccessToken()
      if (!token) return
      await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ taskId, reason, message: msg }),
      })
      setSent(true)
    } catch {}
  }

  return (
    <div className="jdg-modal-overlay" onClick={onClose}>
      <div className="jdg-modal" onClick={e => e.stopPropagation()}>
        <div className="jdg-modal-head">
          <h3><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg> Report</h3>
          <button className="jdg-modal-x" onClick={onClose}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="jdg-modal-body">
          {sent ? (
            <div className="jdg-sent-msg">
              <svg width="24" height="24" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Report submitted. We'll review it shortly.</span>
            </div>
          ) : (
            <>
              <label className="jdg-modal-label">Reason</label>
              <select className="jdg-modal-input" value={reason} onChange={e => setReason(e.target.value)}>
                <option value="">Select a reason...</option>
                <option value="spam">Spam</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="scam">Scam or fraud</option>
                <option value="offensive">Offensive</option>
                <option value="other">Other</option>
              </select>
              <label className="jdg-modal-label" style={{ marginTop: 12 }}>Message</label>
              <textarea className="jdg-modal-input jdg-modal-ta" rows={3} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Additional details..." />
              <button className="jdg-btn jdg-btn-danger jdg-btn-full" style={{ marginTop: 14 }} onClick={handleSubmit} disabled={!reason.trim()}>
                Submit Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Share Panel ──
function SharePanel({ task, onClose }: { task: TaskData; onClose: () => void }) {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  return (
    <div className="jdg-modal-overlay" onClick={onClose}>
      <div className="jdg-modal" onClick={e => e.stopPropagation()}>
        <div className="jdg-modal-head">
          <h3>Share this task</h3>
          <button className="jdg-modal-x" onClick={onClose}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="jdg-modal-body">
          <div className="jdg-share-link">
            <span className="jdg-share-url">{url}</span>
            <button className="jdg-btn jdg-btn-sm jdg-btn-outline" onClick={() => navigator.clipboard.writeText(url)}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy
            </button>
          </div>
          <div className="jdg-share-social">
            <button className="jdg-btn jdg-btn-sm jdg-btn-outline" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this task on OgaPay: ${task.title}`)}&url=${encodeURIComponent(url)}`, '_blank')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              X / Twitter
            </button>
            <button className="jdg-btn jdg-btn-sm jdg-btn-outline" onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(task.title)}`, '_blank')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              Telegram
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──
export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [related, setRelated] = useState<any[]>([])
  const [showApply, setShowApply] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showSubs, setShowSubs] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchTask(id),
      fetchOnboarding(),
      fetchSubmissions(id),
    ]).then(([t, ob, subs]) => {
      setTask(t)
      setOnboarding(ob)
      setSubmissions(subs)
      if (t) fetchRelated(t.category, id).then(setRelated)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <Layout>
        <div className="jdg-wrap"><div className="jdg-loading">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="jdg-skel" style={{ height: i === 0 ? 180 : 80, marginBottom: 12 }} />)}</div></div>
        <style>{styles}</style>
      </Layout>
    )
  }

  if (!task) {
    return (
      <Layout>
        <div className="jdg-wrap">
          <div className="jdg-empty">
            <svg width="48" height="48" fill="none" stroke="var(--text3)" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <h2>Task Not Found</h2>
            <p>This task doesn't exist or has been removed.</p>
            <button className="jdg-btn jdg-btn-primary" onClick={() => navigate('/tasks')}>Browse Tasks</button>
          </div>
        </div>
        <style>{styles}</style>
      </Layout>
    )
  }

  const deadlineMs = task.deadline ? new Date(task.deadline).getTime() : 0
  const isExpired = deadlineMs && deadlineMs < Date.now()
  const progressPct = task.slots > 0 ? pct(task.completions, task.slots) : 0
  const user = getStoredUser()
  const isOwnTask = user?.id === task.creatorId

  const missingChecks: { label: string; key: string }[] = []
  if (onboarding) {
    if (!onboarding.walletConnected) missingChecks.push({ label: 'Connect a Solana wallet', key: 'wallet' })
    if (!onboarding.xConnected) missingChecks.push({ label: 'Connect your X/Twitter account', key: 'x' })
    if (!onboarding.telegramConnected) missingChecks.push({ label: 'Connect your Telegram', key: 'telegram' })
    if (!onboarding.emailVerified) missingChecks.push({ label: 'Verify your email address', key: 'email' })
    if (!onboarding.kycVerified) missingChecks.push({ label: 'Complete KYC verification', key: 'kyc' })
  }
  const canApply = onboarding && missingChecks.length === 0 && !applied

  return (
    <Layout>
      <div className="jdg-wrap">
        {/* Breadcrumb */}
        <div className="jdg-bc">
          <button className="jdg-bc-link" onClick={() => navigate('/tasks')}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Tasks
          </button>
          <span className="jdg-bc-sep">/</span>
          <span className="jdg-bc-cur">{task.title}</span>
        </div>

        {/* Header Card */}
        <div className="jdg-header">
          {/* Brand Row */}
          <div className="jdg-brand" onClick={() => task.creatorId && navigate(`/user/${task.creator.username}`)}>
            <div className="jdg-avatar" style={{ background: BLUE }}>
              {task.creator.avatarUrl ? <img src={task.creator.avatarUrl} alt="" /> : getInitials(task.creator)}
            </div>
            <div>
              <div className="jdg-brand-name">
                {task.brand}
                {task.brandVerified && (
                  <svg width="14" height="14" fill="#1F8CFF" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                )}
              </div>
              <div className="jdg-brand-handle">{task.brandHandle}</div>
            </div>
          </div>

          {/* Badge Row */}
          <div className="jdg-badge-row">
            <JBadge color="blue">{task.category}</JBadge>
            <JBadge color="gray">{task.type}</JBadge>
            <JBadge color={task.difficulty === 'Easy' ? 'green' : task.difficulty === 'Medium' ? 'amber' : 'red'}>{task.difficulty}</JBadge>
          </div>

          {/* Title */}
          <h1 className="jdg-title">{task.title}</h1>

          {/* Reward + Stats Row */}
          <div className="jdg-reward-row">
            <div className="jdg-reward-main">
              <div className="jdg-reward-label">Reward</div>
              <div className="jdg-reward-amount">
                <span className="jdg-reward-val">{task.reward.toLocaleString()}</span>
                <span className="jdg-reward-cur">{task.currency}</span>
              </div>
              {task.usdValue > 0 && <div className="jdg-reward-usd">≈ ${task.usdValue.toFixed(2)} USD</div>}
            </div>
            <div className="jdg-stats-row">
              <div className="jdg-stat-box">
                <div className="jdg-stat-val">{task.slots}</div>
                <div className="jdg-stat-lbl">Slots</div>
              </div>
              <div className="jdg-stat-box">
                <div className="jdg-stat-val">{task.completions}</div>
                <div className="jdg-stat-lbl">Done</div>
              </div>
              <div className="jdg-stat-box">
                <div className="jdg-stat-val" style={{ color: BLUE }}>{task.slotsLeft}</div>
                <div className="jdg-stat-lbl">Left</div>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="jdg-progress">
            <div className="jdg-progress-bar"><div className="jdg-progress-fill" style={{ width: `${progressPct}%` }} /></div>
            <div className="jdg-progress-stats">
              <span>{task.completions} / {task.slots} completed</span>
              <span>{progressPct}%</span>
            </div>
          </div>

          {/* Deadline */}
          {deadlineMs > 0 && (
            <div className={`jdg-deadline ${isExpired ? 'expired' : ''}`}>
              <div className="jdg-deadline-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div className="jdg-deadline-info">
                <div className="jdg-deadline-lbl">{isExpired ? 'Expired' : 'Time Left'}</div>
                <CountdownBlock deadline={deadlineMs} />
              </div>
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="jdg-cols">
          {/* ─── LEFT COLUMN ─── */}
          <div className="jdg-left">
            {/* Task Config */}
            <div className="jdg-card">
              <h3 className="jdg-card-title">Task Configuration</h3>
              <div className="jdg-config">
                {[
                  { label: 'Status', val: isExpired ? 'Expired' : task.status, color: isExpired ? '#f59e0b' : '#16a34a' },
                  { label: 'Category', val: task.category },
                  { label: 'Type', val: task.type },
                  { label: 'Difficulty', val: task.difficulty },
                  { label: 'Platform', val: task.platform },
                  { label: 'Est. Time', val: task.estimatedTime },
                  { label: 'Approval', val: task.approvalTime },
                ].map(c => (
                  <div className="jdg-config-item" key={c.label}>
                    <span className="jdg-config-lbl">{c.label}</span>
                    <span className="jdg-config-val" style={c.color ? { color: c.color } : {}}>{c.val}</span>
                  </div>
                ))}
              </div>
              {task.tags.length > 0 && (
                <div className="jdg-tags">
                  {task.tags.map((t, i) => <span className="jdg-tag" key={i}>{t}</span>)}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="jdg-card">
              <h3 className="jdg-card-title">Description</h3>
              <div className="jdg-desc">{task.description}</div>
            </div>

            {/* Steps */}
            <div className="jdg-card">
              <h3 className="jdg-card-title">Task Steps</h3>
              <div className="jdg-steps">
                {task.instructions.split('\n').filter(Boolean).map((step, i) => (
                  <div className="jdg-step" key={i}>
                    <span className="jdg-step-num" style={{ background: BLUE }}>{i + 1}</span>
                    <span className="jdg-step-text">{step.replace(/^\d+[\.\)]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Requirements */}
            {task.requirements.length > 0 && (
              <div className="jdg-card">
                <h3 className="jdg-card-title">Requirements</h3>
                <ul className="jdg-req-list">
                  {task.requirements.map((r, i) => (
                    <li key={i}>
                      <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Proof Required */}
            {task.proofInstructions.length > 0 && (
              <div className="jdg-card">
                <h3 className="jdg-card-title">Proof Required</h3>
                <ul className="jdg-req-list">
                  {task.proofInstructions.map((p, i) => (
                    <li key={i}>
                      <svg width="16" height="16" fill="none" stroke={BLUE} strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Payment Info */}
            <div className="jdg-card">
              <h3 className="jdg-card-title">Payment Information</h3>
              <div className="jdg-pay-grid">
                <div className="jdg-pay-item">
                  <span className="jdg-pay-lbl">Total Pool</span>
                  <span className="jdg-pay-val">{task.totalPool.toLocaleString()} {task.currency}</span>
                </div>
                <div className="jdg-pay-item">
                  <span className="jdg-pay-lbl">Per Worker</span>
                  <span className="jdg-pay-val">{task.reward.toLocaleString()} {task.currency}</span>
                </div>
                <div className="jdg-pay-item">
                  <span className="jdg-pay-lbl">Review Time</span>
                  <span className="jdg-pay-val">{task.approvalTime}</span>
                </div>
              </div>
            </div>

            {/* Onboarding Block */}
            {onboarding && missingChecks.length > 0 && !isOwnTask && (
              <div className="jdg-card jdg-ob-card">
                <h3 className="jdg-card-title" style={{ color: '#f59e0b' }}>
                  <svg width="16" height="16" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  Complete these to apply
                </h3>
                <div className="jdg-ob-list">
                  {missingChecks.map(c => (
                    <div className="jdg-ob-check" key={c.key}>
                      <svg width="16" height="16" fill="none" stroke="#f59e0b" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submissions Section */}
            {submissions.length > 0 && (
              <div className="jdg-card">
                <div className="jdg-card-head-row">
                  <h3 className="jdg-card-title">Recent Submissions</h3>
                  <button className="jdg-btn jdg-btn-sm jdg-btn-ghost" onClick={() => setShowSubs(!showSubs)}>
                    {showSubs ? 'Hide' : `${submissions.length} total`}
                  </button>
                </div>
                {showSubs && (
                  <div className="jdg-subs-list">
                    {submissions.slice(0, 10).map(s => (
                      <div className="jdg-sub-item" key={s.id}>
                        <div className="jdg-sub-avatar" style={{ background: s.workerColor }}>{s.workerInitials}</div>
                        <div className="jdg-sub-info">
                          <div className="jdg-sub-name">{s.workerName}</div>
                          <div className="jdg-sub-time">{new Date(s.time).toLocaleDateString()}</div>
                        </div>
                        <span className={`jdg-sub-status ${s.status}`}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Related Tasks */}
            {related.length > 0 && (
              <div className="jdg-card">
                <h3 className="jdg-card-title">Similar Tasks</h3>
                <div className="jdg-related">
                  {related.map((rt: any) => (
                    <div className="jdg-rel-card" key={rt.id} onClick={() => navigate(`/tasks/${rt.id}`)}>
                      <div className="jdg-rel-icon"><svg width="16" height="16" fill="none" stroke={BLUE} strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg></div>
                      <div className="jdg-rel-info">
                        <div className="jdg-rel-title">{rt.title}</div>
                        <div className="jdg-rel-meta">{rt.maxWorkers || rt.slots || 0} slots · {rt.category || 'Task'}</div>
                      </div>
                      <div className="jdg-rel-reward">{Number(rt.reward).toLocaleString()} {rt.currency || 'SOL'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Report */}
            <div className="jdg-report-row">
              <button className="jdg-report-btn" onClick={() => setShowReport(true)}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                Report this task
              </button>
              <button className="jdg-report-btn" onClick={() => setShowShare(true)}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
                Share
              </button>
            </div>
          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div className="jdg-right">
            {/* Task Info Card */}
            <div className="jdg-side-card">
              <h4 className="jdg-side-title">Task Info</h4>
              {[
                { label: 'Status', val: isExpired ? 'Expired' : task.status, color: isExpired ? '#f59e0b' : '#16a34a' },
                { label: 'Category', val: task.category },
                { label: 'Difficulty', val: task.difficulty },
                { label: 'Slots', val: `${task.completions}/${task.slots}` },
                { label: 'Est. Time', val: task.estimatedTime },
              ].map(i => (
                <div className="jdg-side-row" key={i.label}>
                  <span className="jdg-side-lbl">{i.label}</span>
                  <span className="jdg-side-val" style={i.color ? { color: i.color } : {}}>{i.val}</span>
                </div>
              ))}
              {task.tags.length > 0 && (
                <div className="jdg-tags" style={{ marginTop: 8 }}>
                  {task.tags.slice(0, 4).map((t, i) => <span className="jdg-tag" key={i}>{t}</span>)}
                </div>
              )}
            </div>

            {/* Creator Card */}
            <div className="jdg-side-card">
              <h4 className="jdg-side-title">Creator</h4>
              <div className="jdg-side-creator" onClick={() => navigate(`/user/${task.creator.username}`)}>
                <div className="jdg-side-av" style={{ background: BLUE }}>
                  {task.creator.avatarUrl ? <img src={task.creator.avatarUrl} alt="" /> : getInitials(task.creator)}
                </div>
                <div>
                  <div className="jdg-side-cr-name">{task.brand}</div>
                  <div className="jdg-side-cr-handle">{task.brandHandle}</div>
                </div>
              </div>
            </div>

            {/* Applicants Preview */}
            {submissions.length > 0 && (
              <div className="jdg-side-card">
                <h4 className="jdg-side-title">Applicants</h4>
                <div className="jdg-applicants">
                  {submissions.slice(0, 5).map((s, i) => (
                    <div className="jdg-app-item" key={i}>
                      <div className="jdg-app-av" style={{ background: s.workerColor }}>{s.workerInitials}</div>
                      <div className="jdg-app-info">
                        <div className="jdg-app-name">{s.workerName}</div>
                        <span className={`jdg-sub-status ${s.status}`}>{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky Bottom CTA ── */}
        <div className="jdg-sticky-bottom">
          <div className="jdg-sticky-inner">
            {isOwnTask ? (
              <div className="jdg-sticky-own">
                <button className="jdg-btn jdg-btn-primary" onClick={() => navigate(`/tasks/${task.id}/submissions`)}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  View Submissions
                </button>
                <button className="jdg-btn jdg-btn-outline" onClick={() => setShowShare(true)}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
                  Share
                </button>
              </div>
            ) : applied ? (
              <div className="jdg-sticky-applied">
                <svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Application submitted</span>
                <button className="jdg-btn jdg-btn-sm jdg-btn-primary" onClick={() => navigate(`/tasks/${task.id}/submit`)}>
                  Submit Work
                </button>
              </div>
            ) : !isExpired && task.status === 'open' ? (
              <>
                <button
                  className="jdg-btn jdg-btn-primary jdg-btn-apply"
                  onClick={() => setShowApply(true)}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Apply & Earn {task.reward.toLocaleString()} {task.currency} →
                </button>
                <p className="jdg-sticky-note">{task.slotsLeft} slots remaining</p>
              </>
            ) : (
              <button className="jdg-btn jdg-btn-disabled" disabled>
                {isExpired ? 'Task Expired' : task.status === 'closed' ? 'Task Closed' : 'All Slots Filled'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showApply && <ApplyModal task={task} onboarding={onboarding} onClose={() => setShowApply(false)} />}
      {showReport && <ReportModal taskId={task.id} onClose={() => setShowReport(false)} />}
      {showShare && <SharePanel task={task} onClose={() => setShowShare(false)} />}

      <style>{styles}</style>
    </Layout>
  )
}

const styles = `
/* ── Container ── */
.jdg-wrap { max-width: 1100px; margin: 0 auto; padding: 20px 24px 120px; }
.jdg-bc { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 13px; }
.jdg-bc-link { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; padding: 4px 0; }
.jdg-bc-link:hover { color: var(--text); }
.jdg-bc-sep { color: var(--text3); }
.jdg-bc-cur { color: var(--text); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 280px; }

/* ── Header ── */
.jdg-header { background: rgba(255,255,255,0.04); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; margin-bottom: 16px; }
.jdg-brand { display: flex; align-items: center; gap: 12px; padding: 18px 22px 0; cursor: pointer; }
.jdg-avatar { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 14px; font-weight: 800; flex-shrink: 0; overflow: hidden; }
.jdg-avatar img { width: 100%; height: 100%; object-fit: cover; }
.jdg-brand-name { font-size: 15px; font-weight: 800; color: var(--text); display: flex; align-items: center; gap: 5px; }
.jdg-brand-handle { font-size: 12px; color: var(--text2); font-weight: 600; }
.jdg-badge-row { display: flex; gap: 6px; flex-wrap: wrap; padding: 12px 22px 0; }
.jdg-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }
.jdg-title { font-family: Outfit, sans-serif; font-size: 24px; font-weight: 900; margin: 12px 22px; line-height: 1.25; color: var(--text); }

/* ── Reward ── */
.jdg-reward-row { display: flex; align-items: stretch; gap: 14px; padding: 14px 22px; border-top: 1px solid var(--border); background: var(--bg2); }
@media (max-width: 600px) { .jdg-reward-row { flex-direction: column; } }
.jdg-reward-main { flex: 1; }
.jdg-reward-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--text3); margin-bottom: 4px; }
.jdg-reward-amount { display: flex; align-items: baseline; gap: 6px; }
.jdg-reward-val { font-size: 26px; font-weight: 900; color: var(--text); font-family: Outfit, sans-serif; }
.jdg-reward-cur { font-size: 14px; font-weight: 700; color: var(--text2); }
.jdg-reward-usd { font-size: 12px; color: var(--text2); font-weight: 600; margin-top: 2px; }
.jdg-stats-row { display: flex; gap: 10px; flex-shrink: 0; }
.jdg-stat-box { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 16px; text-align: center; min-width: 64px; }
.jdg-stat-val { font-size: 18px; font-weight: 900; color: var(--text); font-family: Outfit, sans-serif; }
.jdg-stat-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--text3); margin-top: 1px; }

/* ── Progress ── */
.jdg-progress { padding: 0 22px 12px; }
.jdg-progress-bar { height: 5px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
.jdg-progress-fill { height: 100%; border-radius: inherit; background: #1F8CFF; transition: width .5s; }
.jdg-progress-stats { display: flex; justify-content: space-between; font-size: 10px; color: var(--text3); font-weight: 600; margin-top: 3px; }

/* ── Deadline ── */
.jdg-deadline { display: flex; align-items: center; gap: 12px; padding: 12px 22px; border-top: 1px solid var(--border); }
.jdg-deadline-icon { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); display: grid; place-items: center; flex-shrink: 0; }
.jdg-deadline-icon svg { color: var(--text2); }
.jdg-deadline.expired .jdg-deadline-icon svg { color: #f59e0b; }
.jdg-deadline-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text3); margin-bottom: 4px; }
.jdg-cdown { display: flex; gap: 6px; }
.jdg-cdown-unit { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px 10px; text-align: center; min-width: 44px; }
.jdg-cdown-val { display: block; font-size: 16px; font-weight: 900; color: var(--text); font-family: Outfit, sans-serif; }
.jdg-cdown-lbl { display: block; font-size: 9px; font-weight: 700; color: var(--text3); margin-top: 1px; }

/* ── Columns ── */
.jdg-cols { display: grid; grid-template-columns: 1fr 280px; gap: 16px; align-items: start; }
@media (max-width: 860px) { .jdg-cols { grid-template-columns: 1fr; } }

/* ── Cards ── */
.jdg-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 18px 20px; margin-bottom: 14px; }
.jdg-card-title { font-family: Outfit, sans-serif; font-size: 15px; font-weight: 800; margin: 0 0 12px; color: var(--text); display: flex; align-items: center; gap: 6px; }
.jdg-card-head-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.jdg-card-head-row .jdg-card-title { margin-bottom: 0; }

/* ── Config ── */
.jdg-config { display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; }
@media (max-width: 480px) { .jdg-config { grid-template-columns: 1fr; } }
.jdg-config-item { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; }
.jdg-config-lbl { display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--text3); margin-bottom: 2px; }
.jdg-config-val { font-size: 13px; font-weight: 700; color: var(--text); }

/* ── Tags ── */
.jdg-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.jdg-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: #1F8CFF12; color: #1F8CFF; border: 1px solid rgba(31,140,255,.2); }

/* ── Description ── */
.jdg-desc { font-size: 13px; line-height: 1.7; color: var(--text2); white-space: pre-wrap; }

/* ── Steps ── */
.jdg-steps { display: flex; flex-direction: column; gap: 8px; }
.jdg-step { display: flex; align-items: center; gap: 10px; }
.jdg-step-num { width: 26px; height: 26px; border-radius: 50%; color: #fff; font-size: 11px; font-weight: 800; display: grid; place-items: center; flex-shrink: 0; }
.jdg-step-text { font-size: 13px; color: var(--text2); line-height: 1.4; }

/* ── Req List ── */
.jdg-req-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.jdg-req-list li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text2); }
.jdg-req-list li svg { flex-shrink: 0; }

/* ── Payment ── */
.jdg-pay-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
@media (max-width: 480px) { .jdg-pay-grid { grid-template-columns: 1fr; } }
.jdg-pay-item { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 12px; }
.jdg-pay-lbl { display: block; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--text3); margin-bottom: 2px; }
.jdg-pay-val { font-size: 14px; font-weight: 800; color: var(--text); }

/* ── Onboarding ── */
.jdg-ob-card { border-color: rgba(245,158,11,.2); }
.jdg-ob-list { display: flex; flex-direction: column; gap: 6px; }
.jdg-ob-check { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text2); padding: 4px 0; }
.jdg-ob-check svg { flex-shrink: 0; }

/* ── Submissions ── */
.jdg-subs-list { display: flex; flex-direction: column; gap: 6px; }
.jdg-sub-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--border); }
.jdg-sub-item:last-child { border-bottom: none; }
.jdg-sub-avatar { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 10px; font-weight: 800; flex-shrink: 0; }
.jdg-sub-info { flex: 1; }
.jdg-sub-name { font-size: 12px; font-weight: 700; color: var(--text); }
.jdg-sub-time { font-size: 10px; color: var(--text3); }
.jdg-sub-status { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px; }
.jdg-sub-status.approved, .jdg-sub-status.accepted { background: rgba(22,163,74,.1); color: #16a34a; }
.jdg-sub-status.pending { background: rgba(245,158,11,.1); color: #f59e0b; }
.jdg-sub-status.rejected { background: rgba(239,68,68,.1); color: #ef4444; }

/* ── Related ── */
.jdg-related { display: flex; flex-direction: column; gap: 6px; }
.jdg-rel-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; cursor: pointer; transition: border-color .13s; }
.jdg-rel-card:hover { border-color: var(--text2); }
.jdg-rel-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(31,140,255,.1); display: grid; place-items: center; flex-shrink: 0; }
.jdg-rel-info { flex: 1; min-width: 0; }
.jdg-rel-title { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jdg-rel-meta { font-size: 10px; color: var(--text3); }
.jdg-rel-reward { font-size: 12px; font-weight: 800; color: #16a34a; flex-shrink: 0; }

/* ── Report Row ── */
.jdg-report-row { display: flex; justify-content: center; gap: 20px; padding: 8px 0 20px; }
.jdg-report-btn { background: none; border: none; color: var(--text3); font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 6px; transition: color .13s, background .13s; }
.jdg-report-btn:hover { color: #ef4444; background: rgba(239,68,68,.06); }

/* ── Right Sidebar ── */
.jdg-right { display: flex; flex-direction: column; gap: 14px; }
.jdg-side-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px 18px; }
.jdg-side-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); margin-bottom: 10px; }
.jdg-side-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed var(--border); font-size: 12px; }
.jdg-side-row:last-child { border-bottom: none; }
.jdg-side-lbl { color: var(--text2); font-weight: 600; }
.jdg-side-val { font-weight: 800; color: var(--text); }
.jdg-side-creator { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.jdg-side-av { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 12px; font-weight: 800; flex-shrink: 0; overflow: hidden; }
.jdg-side-av img { width: 100%; height: 100%; object-fit: cover; }
.jdg-side-cr-name { font-size: 13px; font-weight: 800; color: var(--text); }
.jdg-side-cr-handle { font-size: 11px; color: var(--text2); font-weight: 600; }
.jdg-applicants { display: flex; flex-direction: column; gap: 6px; }
.jdg-app-item { display: flex; align-items: center; gap: 8px; }
.jdg-app-av { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 9px; font-weight: 800; flex-shrink: 0; }
.jdg-app-info { display: flex; align-items: center; gap: 6px; flex: 1; }
.jdg-app-name { font-size: 11px; font-weight: 700; color: var(--text); }

/* ── Sticky Bottom ── */
.jdg-sticky-bottom { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; padding: 14px 20px; background: linear-gradient(to top, rgba(10,10,20,0.9) 60%, transparent); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.jdg-sticky-inner { max-width: 1100px; margin: 0 auto; }
.jdg-btn-apply { width: 100%; height: 50px; font-size: 15px; }
.jdg-sticky-note { text-align: center; font-size: 11px; color: var(--text3); margin: 6px 0 0; }
.jdg-sticky-own { display: flex; gap: 8px; }
.jdg-sticky-own .jdg-btn { flex: 1; }
.jdg-sticky-applied { display: flex; align-items: center; gap: 10px; background: rgba(22,163,74,.06); border: 1px solid rgba(22,163,74,.15); border-radius: 12px; padding: 12px 16px; font-size: 13px; color: var(--text); }
.jdg-sticky-applied .jdg-btn { margin-left: auto; }
.jdg-btn-disabled { width: 100%; height: 50px; border-radius: 12px; background: var(--bg2); border: 1px solid var(--border); color: var(--text3); font-size: 14px; font-weight: 700; cursor: not-allowed; }

/* ── Buttons ── */
.jdg-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  height: 42px; padding: 0 20px; border-radius: 10px; font-size: 13px; font-weight: 700;
  border: 1.5px solid transparent; cursor: pointer; transition: all .13s;
  text-decoration: none; font-family: inherit; white-space: nowrap;
}
.jdg-btn-primary { background: #1F8CFF; color: #fff; border-color: #1F8CFF; }
.jdg-btn-primary:hover { background: #0D6EEB; }
.jdg-btn-primary:disabled { opacity: .4; cursor: not-allowed; }
.jdg-btn-outline { background: transparent; border-color: var(--border); color: var(--text); }
.jdg-btn-outline:hover { border-color: var(--text2); background: var(--bg2); }
.jdg-btn-danger { background: transparent; border-color: rgba(239,68,68,.3); color: #ef4444; }
.jdg-btn-danger:hover { background: rgba(239,68,68,.06); border-color: #ef4444; }
.jdg-btn-ghost { background: transparent; border-color: transparent; color: var(--text2); height: 30px; padding: 0 8px; font-size: 11px; }
.jdg-btn-ghost:hover { background: var(--bg2); }
.jdg-btn-sm { height: 34px; font-size: 12px; padding: 0 14px; }
.jdg-btn-full { width: 100%; }

/* ── Modal ── */
.jdg-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.jdg-modal { background: rgba(20,20,30,0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; max-width: 460px; width: 100%; max-height: 90vh; overflow-y: auto; }
.jdg-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.jdg-modal-head h3 { font-size: 15px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 8px; }
.jdg-modal-x { background: none; border: none; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--text2); }
.jdg-modal-x:hover { background: var(--bg2); }
.jdg-modal-body { padding: 16px 20px; }
.jdg-modal-label { display: block; font-size: 12px; font-weight: 700; color: var(--text2); margin-bottom: 6px; }
.jdg-modal-input { width: 100%; padding: 9px 12px; border: 1.5px solid rgba(255,255,255,0.1); border-radius: 8px; background: rgba(255,255,255,0.04); color: var(--text); font-size: 13px; font-family: inherit; box-sizing: border-box; }
.jdg-modal-input:focus { outline: none; border-color: #1F8CFF; }
.jdg-modal-ta { resize: vertical; min-height: 70px; }
.jdg-modal-info { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
.jdg-modal-info-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed var(--border); font-size: 12px; color: var(--text2); }
.jdg-modal-info-row:last-child { border-bottom: none; }
.jdg-modal-info-val { font-weight: 800; color: var(--text); }
.jdg-ob-block { background: #1c1917; border: 1px solid #292524; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
.jdg-ob-title { font-size: 12px; font-weight: 800; color: #f59e0b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.jdg-ob-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; color: var(--text2); }

/* ── Share ── */
.jdg-share-link { display: flex; align-items: center; gap: 8px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
.jdg-share-url { flex: 1; font-size: 11px; color: var(--text3); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jdg-share-social { display: flex; gap: 8px; }
.jdg-share-social .jdg-btn { flex: 1; }
.jdg-sent-msg { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text); padding: 12px; }

/* ── Loading ── */
.jdg-loading { padding: 40px 0; }
.jdg-skel { background: var(--bg2); border-radius: 12px; animation: jdg-shimmer 1.5s ease-in-out infinite; }
@keyframes jdg-shimmer { 0% { opacity: .5; } 50% { opacity: 1; } 100% { opacity: .5; } }

/* ── Empty ── */
.jdg-empty { text-align: center; padding: 60px 20px; }
.jdg-empty svg { display: block; margin: 0 auto 16px; }
.jdg-empty h2 { font-family: Outfit, sans-serif; font-size: 20px; font-weight: 900; margin: 0 0 8px; color: var(--text); }
.jdg-empty p { font-size: 13px; color: var(--text2); margin: 0 0 20px; }

@media (max-width: 600px) {
  .jdg-wrap { padding: 14px 16px 130px; }
  .jdg-title { font-size: 20px; margin: 10px 16px; }
  .jdg-brand { padding: 14px 16px 0; }
  .jdg-badge-row { padding: 8px 16px 0; }
  .jdg-reward-row { flex-direction: column; padding: 12px 16px; }
  .jdg-stats-row { justify-content: stretch; }
  .jdg-stat-box { flex: 1; }
  .jdg-deadline { padding: 10px 16px; }
  .jdg-progress { padding: 0 16px 8px; }
  .jdg-card { padding: 14px 16px; border-radius: 12px; }
  .jdg-reward-val { font-size: 22px; }
  .jdg-cdown-unit { min-width: 38px; padding: 4px 8px; }
  .jdg-cdown-val { font-size: 14px; }
  .jdg-sticky-bottom { padding: 10px 14px; }
  .jdg-sticky-applied { flex-wrap: wrap; }
  .jdg-bc-cur { max-width: 160px; }
}

/* Light theme glass overrides */
[data-theme="light"] .jdg-header { background: rgba(255,255,255,0.7); border-color: rgba(0,0,0,0.06); }
[data-theme="light"] .jdg-card { background: rgba(255,255,255,0.6); border-color: rgba(0,0,0,0.04); }
[data-theme="light"] .jdg-side-card { background: rgba(255,255,255,0.6); border-color: rgba(0,0,0,0.04); }
[data-theme="light"] .jdg-modal { background: rgba(255,255,255,0.85); border-color: rgba(0,0,0,0.08); }
[data-theme="light"] .jdg-sticky-bottom { background: linear-gradient(to top, rgba(255,255,255,0.9) 60%, transparent); }
[data-theme="light"] .jdg-config-item { background: rgba(255,255,255,0.5); border-color: rgba(0,0,0,0.06); }
[data-theme="light"] .jdg-pay-item { background: rgba(255,255,255,0.5); border-color: rgba(0,0,0,0.06); }
[data-theme="light"] .jdg-stat-box { background: rgba(255,255,255,0.5); border-color: rgba(0,0,0,0.06); }
[data-theme="light"] .jdg-cdown-unit { background: rgba(255,255,255,0.5); border-color: rgba(0,0,0,0.06); }
[data-theme="light"] .jdg-deadline-icon { background: rgba(255,255,255,0.5); border-color: rgba(0,0,0,0.06); }
[data-theme="light"] .jdg-progress-bar { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.06); }
[data-theme="light"] .jdg-modal-input { background: rgba(255,255,255,0.5); border-color: rgba(0,0,0,0.08); }
[data-theme="light"] .jdg-rel-card { background: rgba(255,255,255,0.5); border-color: rgba(0,0,0,0.06); }
`
