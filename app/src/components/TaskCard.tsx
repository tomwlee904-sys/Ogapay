import { useNavigate } from 'react-router-dom'
import './TaskCard.css'

interface TaskData {
  id: string
  title: string
  description: string
  reward: number | string
  category: string
  status: string
  maxWorkers: number
  currentWorkers: number
  submissionsCount?: number
  minSorsaScore?: number
  requiresLinkedin?: boolean
  requiresWallet?: boolean
  deadlineHours?: number | null
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

  const isCoolingDown = task.status === 'COOLING_DOWN'
  const filledSlots = task.currentWorkers || 0
  const totalSlots = task.maxWorkers || 1
  const openSlots = totalSlots - filledSlots
  const progressPercent = Math.min(Math.round((filledSlots / totalSlots) * 100), 100)
  const submissionsCount = task.submissionsCount ?? task._count?.submissions ?? 0
  const isNew = Date.now() - new Date(task.createdAt).getTime() < 86400000
  const posterName = task.poster?.username || 'Anonymous'

  const deadlineDisplay = () => {
    const target = task.deadlineHours
      ? new Date(new Date(task.createdAt).getTime() + task.deadlineHours * 3600000)
      : null
    if (!target) return ''
    const diff = target.getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return d > 0
      ? `${d}d ${h}h ${m}m ${s}s`
      : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="tc-card" onClick={() => navigate(`/tasks/${task.id}`)}>
      {/* Header — poster info */}
      <div className="tc-header">
        <img
          src={task.poster?.avatarUrl || '/default-avatar.png'}
          className="tc-avatar"
        />
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
              className={`tc-progress-fill ${isCoolingDown ? 'cooling' : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="tc-status-row">
            <span className="tc-status-item">
              <span className="tc-dot blue" />
              <span>Submissions {submissionsCount}</span>
            </span>
            <span className="tc-status-item">
              <span className="tc-dot light" />
              <span>{totalSlots === 999 ? 'Unlimited slots' : `Open ${openSlots}`}</span>
            </span>
            <span className="tc-status-item">
              <span className={`tc-dot ${isCoolingDown ? 'orange' : 'green pulse'}`} />
              <span className={isCoolingDown ? 'text-orange' : 'text-green'}>
                {isCoolingDown ? 'Cooling Down' : 'Open'}
              </span>
            </span>
          </div>
        </div>

        {/* Reward box */}
        <div className="tc-reward">
          <div className="tc-reward-row">
            <span className="tc-reward-amount">
              {Number(task.reward).toLocaleString()}
            </span>
            <span className="tc-reward-currency">NGN</span>
          </div>
          <p className="tc-reward-label">Reward / Slot</p>
        </div>

        {/* Category + rank + requirements */}
        <div className="tc-tags">
          <span>{task.category}</span>
          {task.rank && (
            <>
              <span className="tc-sep">|</span>
              <span>Rank {task.rank}</span>
            </>
          )}
          {task.minSorsaScore && task.minSorsaScore > 0 && (
            <>
              <span className="tc-sep">|</span>
              <span>Req: Sorsa {task.minSorsaScore}+</span>
            </>
          )}
          {task.requiresLinkedin && (
            <>
              <span className="tc-sep">|</span>
              <span>Req: LinkedIn</span>
            </>
          )}
          {task.requiresWallet && (
            <>
              <span className="tc-sep">|</span>
              <span>Req: Wallet</span>
            </>
          )}
        </div>

        {/* About */}
        <div>
          <div className="tc-about-head">
            <span>About This Task</span>
            <span className="tc-deadline">{deadlineDisplay()}</span>
          </div>
          <p className="tc-desc">{task.description}</p>
        </div>
      </div>
    </div>
  )
}
