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
  return { label: 'Open', color: '#4caf50', cls: 'green' }
}

const getBarColor = (submitted: number, total: number) => {
  const pct = submitted / total
  if (pct > 0.8) return '#e74c3c'
  if (pct > 0.5) return '#f5a623'
  return 'linear-gradient(90deg, var(--accent), #6366F1)'
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
  const isCoolingDown = task.status === 'COOLING_DOWN'
  const barColor = isCoolingDown
    ? 'linear-gradient(90deg, #f59e0b, #fb923c)'
    : getBarColor(filledSlots, totalSlots)

  const rewardNum = Number(task.reward) || 0
  const usdEquivalent = isNgn ? rewardNum / NGN_USD_RATE : null
  const ngnEquivalent = !isNgn ? rewardNum * NGN_USD_RATE : null

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
      {/* Header — poster info */}
      <div className="tc-header">
        {task.poster?.avatarUrl ? (
          <img src={task.poster.avatarUrl} className="tc-avatar" />
        ) : (
          <div className="tc-avatar-initial">{posterName[0] || '?'}</div>
        )}
        <div>
          <p className="tc-listed">Listed by</p>
          <p className="tc-poster">{posterName}</p>
        </div>
        {isNew && <span className="tc-new">NEW</span>}
      </div>

      <div className="tc-body">
        {/* Progress */}
        <div>
          <div className="tc-progress-label">
            <span>Progress</span>
            <span>{filledSlots}/{totalSlots === 999 ? '\u221E' : totalSlots}</span>
          </div>
          <div className="tc-progress-track">
            <div
              className={`tc-progress-fill ${filledSlots / totalSlots > 0.8 ? 'fill-urgent' : filledSlots / totalSlots > 0.5 ? 'fill-warn' : ''} ${isCoolingDown ? 'cooling' : ''}`}
              style={{ background: barColor, width: `${progressPercent}%` }}
            />
          </div>
          <div className="tc-status-row">
            <span className="tc-status-item">
              <span className="tc-dot green" />
              <span>Submissions {submissionsCount}</span>
            </span>
            <span className="tc-status-item">
              <span className="tc-dot light" />
              <span>{totalSlots === 999 ? 'Unlimited' : `Open ${openSlots}`}</span>
            </span>
            <span className="tc-status-item">
              <span className={`tc-dot ${statusInfo.cls}`} />
              <span style={{ color: statusInfo.color }}>{statusInfo.label}</span>
            </span>
          </div>
        </div>

        {/* Reward box */}
        <div className="tc-reward">
          <div className="tc-reward-row">
            <span className="tc-reward-amount">
              {rewardNum.toLocaleString()}
            </span>
            <span className="tc-reward-currency">{currency}</span>
          </div>
          {usdEquivalent !== null && (
            <div className="tc-reward-usd">≈ ${usdEquivalent.toFixed(2)} USD</div>
          )}
          {ngnEquivalent !== null && (
            <div className="tc-reward-usd">≈ ₦{ngnEquivalent.toLocaleString()} NGN</div>
          )}
          <p className="tc-reward-label">Reward / Slot</p>
        </div>

        {/* Requirements pills */}
        <div className="tc-tags">
          <span className="tc-tag-pill">{formatCategory(task.category)}</span>
          {task.rank && (
            <span className="tc-tag-pill">Tier {task.rank}</span>
          )}
          {task.minSorsaScore && task.minSorsaScore > 0 && (
            <span className="tc-tag-pill tc-req">Req: Sorsa {task.minSorsaScore}+</span>
          )}
          {task.requiresLinkedin && (
            <span className="tc-tag-pill tc-req">Req: LinkedIn</span>
          )}
          {task.requiresWallet && (
            <span className="tc-tag-pill tc-req">Req: Wallet</span>
          )}
        </div>

        {/* About */}
        <div>
          <div className="tc-about-head">
            <span>About This Task</span>
            {timeLeft && <span className="tc-deadline">{timeLeft}</span>}
          </div>
          <p className="tc-desc">{task.description}</p>
        </div>
      </div>
    </div>
  )
}
