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

const formatReq = (req?: string) => {
  if (!req) return ''
  if (req.startsWith('min_balance:'))
    return `Min ₦${Number(req.split(':')[1]).toLocaleString()}`
  if (req.startsWith('community:'))
    return req.split(':')[1].replace(/_/g, ' ')
  return req
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
  const requirements = task.requirements || []

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
    <div className="task-card" style={{ '--accent': barColor } as React.CSSProperties} onClick={() => navigate(`/tasks/${task.id}`)}>

      {/* Top accent line */}
      <div className="card-accent-line" />

      {/* Listed by */}
      <div className="card-header">
        {task.poster?.avatarUrl ? (
          <img className="card-avatar" src={task.poster.avatarUrl} alt={posterName} />
        ) : (
          <div className="card-avatar card-avatar-initial">{posterName[0] || '?'}</div>
        )}
        <div className="card-header-text">
          <span className="listed-by-label">LISTED BY</span>
          <span className="listed-by-username">{posterName}</span>
        </div>
      </div>

      {/* Progress section */}
      <div className="card-progress-section">
        <div className="progress-header-row">
          <span className="progress-label">PROGRESS</span>
          <span className="progress-fraction">{submitted}/{total}</span>
        </div>

        {/* Bar FIRST */}
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} />
        </div>

        {/* Pills AFTER bar */}
        <div className="progress-pills">
          <span className="pill pill-green">● Submissions {submitted}</span>
          <span className="pill pill-grey">
            ○ {total === 999 ? 'Unlimited slots' : `Open ${total - submitted}`}
          </span>
          <span className="pill" style={{ color: status.color }}>
            ○ {status.label}
          </span>
        </div>
      </div>

      {/* Reward box — bordered, centered */}
      <div className="reward-box">
        <div className="reward-amount">
          {formatNumber(rewardNum)}
          <span className="reward-currency"> {currency}</span>
        </div>
        <div className="reward-usd">$ {toUSD(rewardNum, currency)} USD</div>
      </div>

      {/* Meta row */}
      <div className="meta-row">
        <span>{formatCategory(task.category)}</span>
        <span className="meta-divider">|</span>
        <span>Tier {task.rank ?? task.tier ?? 1}</span>
        {requirements.length > 0 && (
          <>
            <span className="meta-divider">|</span>
            <span>Req: {formatReq(requirements[0])}</span>
          </>
        )}
      </div>

      {/* Description box — bordered */}
      <div className="description-box">
        <div className="description-header">
          <span className="description-label">💬 ABOUT THIS TASK</span>
          {timeLeft && <span className="task-timer">{timeLeft}</span>}
        </div>
        <p className="description-text">{task.description}</p>
      </div>

    </div>
  )
}
