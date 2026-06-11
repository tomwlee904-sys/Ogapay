import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './TaskCard.css'

const NGN_USD_RATE = 1600

const formatCategory = (cat: string) =>
  (cat || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())

const getStatus = (submitted: number, total: number, status: string) => {
  if (status === 'COOLING_DOWN') return { label: 'Cooling Down', color: '#f59e0b', cls: 'orange' }
  const remaining = total - submitted
  if (remaining <= 0) return { label: 'Completed', color: '#888', cls: 'grey' }
  if (remaining / total <= 0.2) return { label: 'Filling Fast', color: '#f5a623', cls: 'yellow' }
  return { label: 'Open', color: '#22c55e', cls: 'green' }
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
  deadlineHours?: number | null
  expiresAt?: string | null
  createdAt: string
  rank?: string | number
  poster?: {
    id: string
    username?: string
    avatarUrl?: string | null
    createdAt?: string
    posterProfile?: {
      avgRating?: number
      isVerified?: boolean
      totalPosted?: number
    }
  }
  _count?: {
    submissions: number
  }
}

interface TaskCardProps {
  task: TaskData
}

export default function TaskCard({ task }: TaskCardProps) {
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState('')

  const currency = task.currency || 'NGN'
  const isNgn = currency === 'NGN'
  const filledSlots = task.currentWorkers || 0
  const totalSlots = task.maxWorkers || 1
  const openSlots = totalSlots - filledSlots
  const progressPercent = Math.min(Math.round((filledSlots / totalSlots) * 100), 100)
  const submissionsCount = task.submissionsCount ?? task._count?.submissions ?? 0
  const isNew = Date.now() - new Date(task.createdAt).getTime() < 86400000
  const posterName = task.poster?.username || 'Anonymous'
  const statusInfo = getStatus(filledSlots, totalSlots, task.status)

  const rewardNum = Number(task.reward) || 0
  const usdEquivalent = isNgn ? rewardNum / NGN_USD_RATE : null

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

      {/* ═══ 1. CREATOR HEADER ROW ═══ */}
      <div className="tc-header">
        {task.poster?.avatarUrl ? (
          <img src={task.poster.avatarUrl} className="tc-avatar" alt={posterName} />
        ) : (
          <div className="tc-avatar-init">{posterName[0] || '?'}</div>
        )}
        <div className="tc-header-text">
          <span className="tc-listed-label">Listed by</span>
          <span className="tc-listed-name">{posterName}</span>
        </div>
        {isNew && <span className="tc-new-badge">NEW</span>}
      </div>

      {/* ═══ 2. PROGRESS SECTION ═══ */}
      <div className="tc-progress-section">
        <div className="tc-progress-header">
          <span>PROGRESS</span>
          <span>{filledSlots}/{totalSlots === 999 ? '\u221E' : totalSlots}</span>
        </div>
        <div className="tc-bar-track">
          <div className="tc-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="tc-progress-stats">
          <span className="tc-stat-item tc-stat-green">
            <span className="tc-dot tc-dot-green" /> Submissions {submissionsCount}
          </span>
          <span className="tc-stat-item tc-stat-muted">
            <span className="tc-dot tc-dot-muted" /> Open {openSlots}
          </span>
          <span className="tc-stat-item tc-stat-muted">
            <span className={`tc-dot ${statusInfo.cls === 'green' ? 'tc-dot-green' : statusInfo.cls === 'orange' ? 'tc-dot-orange' : 'tc-dot-grey'}`} /> {statusInfo.label}
          </span>
        </div>
      </div>

      {/* ═══ 3. REWARD BOX ═══ */}
      <div className="tc-reward-box">
        <div className="tc-reward-main">
          <span className="tc-reward-amount">{rewardNum.toLocaleString()}</span>
          <span className="tc-reward-cur">{currency}</span>
        </div>
        {usdEquivalent !== null && (
          <div className="tc-reward-usd">≈ ${usdEquivalent.toFixed(2)} USD</div>
        )}
      </div>

      {/* ═══ 4. CATEGORY | RANK ═══ */}
      <div className="tc-meta-row">
        <span className="tc-meta-item">{formatCategory(task.category)}</span>
        {task.rank && (
          <>
            <span className="tc-meta-divider">|</span>
            <span className="tc-meta-item">Rank {task.rank}</span>
          </>
        )}
        {task.minSorsaScore && task.minSorsaScore > 0 && (
          <>
            <span className="tc-meta-divider">|</span>
            <span className="tc-meta-item tc-meta-req">Req: Sorsa {task.minSorsaScore}+</span>
          </>
        )}
        {task.requiresLinkedin && (
          <>
            <span className="tc-meta-divider">|</span>
            <span className="tc-meta-item tc-meta-req">Req: LinkedIn</span>
          </>
        )}
        {task.requiresWallet && (
          <>
            <span className="tc-meta-divider">|</span>
            <span className="tc-meta-item tc-meta-req">Req: Wallet</span>
          </>
        )}
      </div>

      {/* ═══ 5. ABOUT THIS JOB ═══ */}
      <div className="tc-about-section">
        <div className="tc-about-header">
          <span className="tc-about-label">
            <i className="ti ti-message" style={{ fontSize: 11, marginRight: 4 }} />
            ABOUT THIS TASK
          </span>
          {timeLeft && <span className="tc-about-timer">{timeLeft}</span>}
        </div>
        <p className="tc-about-desc">{task.description || 'No description provided.'}</p>
      </div>

    </div>
  )
}
