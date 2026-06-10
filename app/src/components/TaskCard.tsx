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

const getStatus = (submitted: number, total: number, status?: string) => {
  if (status === 'cooling_down') return { label: 'Cooling Down', color: '#f97316' }
  const remaining = total - submitted
  if (remaining <= 0) return { label: 'Completed', color: '#888' }
  if (remaining / total <= 0.2) return { label: 'Filling', color: '#f59e0b' }
  return { label: 'Status Open', color: '#191C6B' }
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
  const openSlots = total === 999 ? 'Unlimited slots' : `${total - submitted} open`
  const pct = Math.min((submitted / total) * 100, 100)
  const status = getStatus(submitted, total, task.status)
  const posterName = task.poster?.username || 'Anonymous'
  const rewardNum = Number(task.reward) || 0
  const currency = task.currency || 'NGN'
  const tier = task.tier ?? task.rank ?? 1
  const requirements = task.requirements || []
  const isNew = task.createdAt && Date.now() - new Date(task.createdAt).getTime() < 86400000

  // Countdown timer using expiresAt
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

      {/* ═══ HEADER — avatar + listed by + new badge ═══ */}
      <div className="tc-header">
        {task.poster?.avatarUrl ? (
          <img className="tc-avatar" src={task.poster.avatarUrl} alt={posterName} />
        ) : (
          <div className="tc-avatar-init">{posterName[0] || '?'}</div>
        )}
        <div className="tc-header-info">
          <span className="tc-listed-label">Listed by</span>
          <span className="tc-listed-name">{posterName}</span>
        </div>
        {isNew && <span className="tc-new-badge">NEW</span>}
      </div>

      {/* ═══ CONTENT PADDED SECTION ═══ */}
      <div className="tc-body">

        {/* ═══ PROGRESS ═══ */}
        <div className="tc-progress-block">
          <div className="tc-progress-header">
            <span className="tc-progress-label">Progress</span>
            <span className="tc-progress-count">{submitted}/{total === 999 ? '∞' : total}</span>
          </div>
          <div className="tc-bar-track">
            <div className="tc-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="tc-status-row">
            <span className="tc-stat-item">
              <span className="tc-dot blue-main" />
              <span className="tc-stat-label blue-text">Submissions {submitted}</span>
            </span>
            <span className="tc-stat-item">
              <span className="tc-dot blue-light" />
              <span className="tc-stat-label blue-subtle">
                {total === 999 ? 'Unlimited slots' : `Open ${total - submitted}`}
              </span>
            </span>
            <span className="tc-stat-item">
              <span className={`tc-dot ${task.status === 'cooling_down' ? 'orange' : 'blue-main animate-pulse-dot'}`} />
              <span className={`tc-stat-label ${task.status === 'cooling_down' ? 'orange-text' : 'blue-text'}`}>
                {status.label}
              </span>
            </span>
          </div>
        </div>

        {/* ═══ REWARD BOX ═══ */}
        <div className="tc-reward-box">
          <div className="tc-reward-row">
            <span className="tc-reward-amount">
              {currency === 'NGN' ? '₦' : currency === 'USDC' ? '$' : ''}{formatNumber(rewardNum)}
            </span>
            <span className="tc-reward-cur">{currency}</span>
          </div>
          <span className="tc-reward-sublabel">Reward / Slot</span>
        </div>

        {/* ═══ CATEGORY | RANK | REQUIREMENTS ═══ */}
        <div className="tc-meta-row">
          <span className="tc-meta-item">{formatCategory(task.category)}</span>
          <span className="tc-meta-divider">|</span>
          <span className="tc-meta-item">Rank {tier}</span>
          {task.minSorsaScore && task.minSorsaScore > 0 ? (
            <>
              <span className="tc-meta-divider">|</span>
              <span className="tc-meta-item">Req: Sorsa {task.minSorsaScore}+</span>
            </>
          ) : task.requiresLinkedin ? (
            <>
              <span className="tc-meta-divider">|</span>
              <span className="tc-meta-item">Req: LinkedIn</span>
            </>
          ) : task.requiresWallet ? (
            <>
              <span className="tc-meta-divider">|</span>
              <span className="tc-meta-item">Req: Wallet</span>
            </>
          ) : requirements.length > 0 ? (
            <>
              <span className="tc-meta-divider">|</span>
              <span className="tc-meta-item">Req: {formatReq(requirements[0])}</span>
            </>
          ) : null}
        </div>

        {/* ═══ ABOUT THIS TASK + DESCRIPTION ═══ */}
        <div className="tc-about-block">
          <div className="tc-about-header">
            <div className="tc-about-label-row">
              <i className="ti ti-message" />
              <span className="tc-about-label">About This Task</span>
            </div>
            {timeLeft && <span className="tc-about-timer">{timeLeft}</span>}
          </div>
          <p className="tc-desc">{task.description || 'No description provided.'}</p>
        </div>

      </div>
    </div>
  )
}
