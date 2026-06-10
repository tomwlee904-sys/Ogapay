import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './TaskCard.css'

const formatNumber = (n: number | string) =>
  Number(n).toLocaleString('en-NG')

const formatCategory = (cat: string) =>
  (cat ?? 'Custom').replace(/_/g, ' ')
    .toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())

const toUSD = (amount: number | string, currency?: string) => {
  const n = Number(amount)
  if (!n) return '0.00'
  if (currency === 'NGN') return (n / 1600).toFixed(2)
  if (currency === 'USDC') return n.toFixed(2)
  return n.toFixed(2)
}

const getStatus = (submitted: number, total: number) => {
  const remaining = total - submitted
  if (remaining <= 0) return { label: 'Completed', color: '#888' }
  if (remaining / total <= 0.2) return { label: 'Filling', color: '#f5a623' }
  return { label: 'Open', color: '#4caf50' }
}

const getBarColor = (submitted: number, total: number) => {
  const pct = submitted / total
  if (pct > 0.8) return '#e74c3c'
  if (pct > 0.5) return '#f5a623'
  return '#4caf50'
}

interface TaskData {
  id: string
  title: string
  description: string
  reward: number | string
  currency?: string
  category: string
  status: string
  maxWorkers: number
  currentWorkers: number
  submissionsCount?: number
  minSorsaScore?: number
  requiresLinkedin?: boolean
  requiresWallet?: boolean
  tier?: string | number
  rank?: string | number
  expiresAt?: string | null
  createdAt: string
  poster?: {
    id: string
    username?: string
    avatarUrl?: string | null
  }
  _count?: {
    submissions: number
  }
  requirements?: string[]
}

interface TaskCardProps {
  task: TaskData
}

export default function TaskCard({ task }: TaskCardProps) {
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState('')

  const submitted = task.currentWorkers || 0
  const total = task.maxWorkers || 1
  const pct = Math.min((submitted / total) * 100, 100)
  const barColor = getBarColor(submitted, total)
  const status = getStatus(submitted, total)
  const posterName = task.poster?.username || 'Anonymous'
  const rewardNum = Number(task.reward) || 0
  const currency = task.currency || 'NGN'
  const tier = task.tier ?? task.rank ?? 1
  const requirements = task.requirements || []

  // Format requirement text
  const formatReq = (req: string) => {
    if (req.startsWith('min_balance:'))
      return `Min ₦${Number(req.split(':')[1]).toLocaleString()}`
    if (req.startsWith('community:'))
      return req.split(':')[1].replace(/_/g, ' ')
    return req
  }

  // Countdown timer
  useEffect(() => {
    if (!task.expiresAt) return
    const tick = () => {
      const diff = new Date(task.expiresAt!).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Expired'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${d}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [task.expiresAt])

  return (
    <div className="tc-card" onClick={() => navigate(`/tasks/${task.id}`)}>

      {/* ═══ 1. HEADER (~15%) — Avatar + LISTED BY + Name + Timer ═══ */}
      <div className="tc-header">
        {task.poster?.avatarUrl ? (
          <img className="tc-header-avatar" src={task.poster.avatarUrl} alt={posterName} />
        ) : (
          <div className="tc-header-avatar-init">{posterName[0] || '?'}</div>
        )}
        <div className="tc-header-info">
          <span className="tc-header-label">LISTED BY</span>
          <div className="tc-header-name-row">
            <span className="tc-header-name">{posterName}</span>
            <span className="tc-header-badge" title="Verified">✓</span>
          </div>
        </div>
        {timeLeft && <span className="tc-header-timer">{timeLeft}</span>}
      </div>

      {/* ═══ 2. PROGRESS — Single compact row ═══ */}
      <div className="tc-progress-section">
        <div className="tc-progress-header">
          <span className="tc-progress-label">PROGRESS</span>
          <span className="tc-progress-fraction">{submitted}/{total}</span>
        </div>
        <div className="tc-bar-track">
          <div className="tc-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <div className="tc-progress-pills">
          <span className="tc-pill">
            <span className="tc-pill-dot" style={{ background: '#4caf50' }} />
            Submissions {submitted}
          </span>
          <span className="tc-pill">
            <span className="tc-pill-dot" style={{ background: '#888' }} />
            Open {total === 999 ? '∞' : total - submitted}
          </span>
          <span className="tc-pill" style={{ color: status.color }}>
            <span className="tc-pill-dot" style={{ background: status.color }} />
            {status.label}
          </span>
        </div>
      </div>

      {/* ═══ 3. REWARD BOX — Highlighted container ═══ */}
      <div className="tc-reward-box">
        <div className="tc-reward-amount">
          {currency === 'NGN' ? '₦' : currency === 'USDC' ? '$' : ''}{formatNumber(rewardNum)}
          <span className="tc-reward-cur"> {currency}</span>
        </div>
        <div className="tc-reward-usd">≈ ${toUSD(rewardNum, currency)} USD</div>
        <div className="tc-reward-label">Reward / Slot</div>
      </div>

      {/* ═══ 4. METADATA ROW — Category | Tier | Requirement ═══ */}
      <div className="tc-meta-row">
        <span className="tc-meta-item">{formatCategory(task.category)}</span>
        <span className="tc-meta-divider">|</span>
        <span className="tc-meta-item">Tier {tier}</span>
        {requirements.length > 0 && (
          <>
            <span className="tc-meta-divider">|</span>
            <span className="tc-meta-item tc-meta-req">Req: {formatReq(requirements[0])}</span>
          </>
        )}
      </div>

      {/* ═══ 5. ABOUT THIS TASK — Bordered box, 25-35% height ═══ */}
      <div className="tc-about-box">
        <div className="tc-about-header">
          <span className="tc-about-label">ABOUT THIS TASK</span>
          {timeLeft && <span className="tc-about-timer">{timeLeft}</span>}
        </div>
        {task.description ? (
          <p className="tc-about-text">{task.description}</p>
        ) : (
          <p className="tc-about-text tc-about-empty">No description provided.</p>
        )}
      </div>

      {/* ═══ 6. VIEW DETAILS — Small button, bottom-right ═══ */}
      <div className="tc-footer">
        <span className="tc-view-btn">
          View Details <i className="ti ti-arrow-right" />
        </span>
      </div>

    </div>
  )
}
