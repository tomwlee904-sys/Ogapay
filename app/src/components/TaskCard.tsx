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

      {/* Creator row — matches Top Products creatorStyle */}
      <div className="tc-creator">
        {task.poster?.avatarUrl ? (
          <img className="tc-avatar" src={task.poster.avatarUrl} alt={posterName} />
        ) : (
          <div className="tc-avatar-init">{posterName[0] || '?'}</div>
        )}
        <div>
          <div className="tc-creator-name">{posterName}</div>
          <div className="tc-creator-role">Task Creator</div>
        </div>
        {timeLeft && <span className="tc-timer">{timeLeft}</span>}
      </div>

      {/* Title — matches titleRowStyle */}
      <div className="tc-title-row">
        <span className="tc-title">{task.title}</span>
        <span className="tc-category">{formatCategory(task.category)}</span>
      </div>

      {/* Description — matches descStyle (3-line clamp) */}
      {task.description && <p className="tc-desc">{task.description}</p>}

      {/* Progress — compact horizontal row */}
      <div className="tc-progress-row">
        <div className="tc-bar-track">
          <div className="tc-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <span className="tc-bar-label">{submitted}/{total}</span>
      </div>
      <div className="tc-stats-row">
        <span className="tc-stat">
          <span className="tc-dot green" />
          {submitted} submissions
        </span>
        <span className="tc-stat">
          <span className="tc-dot grey" />
          {total === 999 ? 'Unlimited' : `${total - submitted} open`}
        </span>
        <span className="tc-stat" style={{ color: status.color }}>
          <span className="tc-dot" style={{ background: status.color }} />
          {status.label}
        </span>
      </div>

      {/* Reward — matches priceRowStyle in Top Products */}
      <div className="tc-reward-row">
        <span className="tc-reward-primary">
          ₦{formatNumber(rewardNum)} <span className="tc-reward-cur">{currency}</span>
        </span>
        <span className="tc-reward-secondary">Reward / Slot</span>
      </div>

      {/* View button — matches viewBtnStyle */}
      <div className="tc-view-btn">
        <i className="ti ti-eye" style={{ fontSize: 14 }} /> View Details
      </div>

    </div>
  )
}
