// @ts-nocheck
import { useNavigate } from 'react-router-dom'

const getStatus = (task) => {
  const remaining = task.slots - task.filled
  const pct = remaining / task.slots
  if (remaining === 0) return 'Completed'
  if (pct <= 0.2) return 'Filling'
  return 'Open'
}

const getStatusColor = (task) => {
  const s = getStatus(task)
  if (s === 'Completed') return '#888'
  if (s === 'Filling') return '#f5a623'
  return '#4caf50'
}

const getBarColor = (filled, total) => {
  const pct = filled / total
  if (pct > 0.8) return '#e74c3c'
  if (pct > 0.5) return '#f5a623'
  return '#4a90d9'
}

const formatCategory = (cat) =>
  cat.replace(/_/g, ' ').toLowerCase()
     .replace(/\b\w/g, l => l.toUpperCase())

const toUSD = (amount, currency) => {
  if (currency === 'NGN') return (amount / 1600).toFixed(2)
  if (currency === 'USDC') return amount.toFixed(2)
  return '—'
}

const formatNumber = (n) => {
  if (!n && n !== 0) return '0'
  return Number(n).toLocaleString()
}

function Avatar({ name, size = 24 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="listed-by-avatar" style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#191C6B',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.38,
      fontWeight: 700,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

export default function TaskCard({ job }) {
  const navigate = useNavigate()
  const progress = job.slots > 0 ? (job.filled / job.slots) * 100 : 0
  const remaining = job.slots - job.filled
  const status = getStatus(job)
  const statusColor = getStatusColor(job)

  return (
    <div className="task-card" onClick={() => navigate(`/tasks/${job.id}`)}>
      
      {/* LISTED BY */}
      <div className="listed-by-row">
        <Avatar name={job.creator} />
        <div>
          <span className="listed-by-label">Listed by</span>
          <span className="listed-by-username">{job.creator}</span>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="progress-header">
        <span>PROGRESS</span>
        <span>{job.filled}/{job.slots}</span>
      </div>

      {/* STATUS PILLS */}
      <div className="status-pills-row">
        <span className="status-pill" style={{ color: '#4caf50' }}>
          ● Submissions {job.filled}
        </span>
        <span className="status-pill" style={{ color: '#aaa' }}>
          ○ Open {remaining}
        </span>
        <span className="status-pill" style={{ color: statusColor }}>
          ● {status}
        </span>
      </div>

      {/* PROGRESS BAR */}
      <div className="progress-bar-track">
        <div
          className="progress-bar"
          style={{
            width: `${Math.min(100, progress)}%`,
            background: getBarColor(job.filled, job.slots),
          }}
        />
      </div>

      {/* REWARD — no box, left aligned */}
      <div className="reward-block">
        <div className="reward-amount">
          {formatNumber(job.reward)} <span>{job.rewardCurrency}</span>
        </div>
        <div className="reward-usd">≈ ${toUSD(job.reward, job.rewardCurrency)} USD</div>
        <div className="reward-label">Reward / Slot</div>
      </div>

      {/* META ROW */}
      <div className="task-meta-row">
        <span className="meta-pill">{formatCategory(job.category)}</span>
        <span className="meta-divider">|</span>
        <span className="meta-pill">Difficulty {job.difficulty}</span>
        {job.verificationRequired && (
          <>
            <span className="meta-divider">|</span>
            <span className="meta-pill req">Req: Verified</span>
          </>
        )}
      </div>

      {/* ABOUT + TIMER */}
      <div className="about-header-row">
        <span className="about-label">About this task</span>
        <span className="task-timer">{job.timeEstimate}</span>
      </div>

      {/* DESCRIPTION */}
      <p className="task-description">{job.description}</p>

    </div>
  )
}
