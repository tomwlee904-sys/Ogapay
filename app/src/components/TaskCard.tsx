import { useNavigate } from 'react-router-dom'

const OGAPAY_BLUE = '#191C6D'

function formatAddress(addr: string) {
  if (!addr) return ''
  return addr.slice(0, 2).toUpperCase()
}

function getDifficultyColor(difficulty?: string) {
  if (!difficulty) return '#6366f1'
  const d = difficulty.toLowerCase()
  if (d === 'easy') return '#16a34a'
  if (d === 'medium') return '#f59e0b'
  if (d === 'hard') return '#dc2626'
  return '#6366f1'
}

export default function TaskCard({ task }: { task: any }) {
  const navigate = useNavigate()

  const id = task.id
  const title = task.title || 'Untitled Task'
  const description = task.description || ''
  const category = task.category || task.taskCategory || 'Task'
  const reward = task.reward || task.amount || 0
  const currency = task.currency || task.rewardCurrency || 'NGN'
  const difficulty = task.difficulty || ''
  const timeEstimate = task.timeEstimate || task.deadlineHours ? `${task.deadlineHours}h` : ''
  const status = task.status || 'OPEN'
  const creatorName = task.creatorName || task.poster?.username || task.creator?.username || task.creator || 'Anonymous'
  const creatorAvatar = task.creatorAvatar || task.poster?.avatarUrl || task.creator?.avatarUrl || null
  const creatorLabel = task.creatorLabel || 'Poster'
  const featured = task.featured || false
  const verificationRequired = task.verificationRequired || task.requiresLinkedin || task.requiresWallet || false
  const rankRequired = task.rankRequired || task.rank || task.minOgaScore || null
  const slotsTotal = task.slots || task.maxWorkers || task.maxSlots || 100
  const slotsFilled = task.filled || task.currentWorkers || task.slotsFilled || 0
  const progress = slotsTotal > 0 ? (slotsFilled / slotsTotal) * 100 : 0
  const platform = task.platform || ''
  const isNew = Date.now() - new Date(task.createdAt || Date.now()).getTime() < 86400000

  return (
    <div style={{
      background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
      border: '1px solid var(--glass-border)', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.06)', cursor: 'pointer', height: '100%',
      display: 'flex', flexDirection: 'column',
    }} onClick={() => navigate(`/tasks/${id}`)}>
      {/* Creator row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: OGAPAY_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0, overflow: 'hidden' }}>
          {creatorAvatar ? <img src={creatorAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : formatAddress(creatorName)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{creatorName}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>{creatorLabel}</div>
        </div>
        {isNew && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: 10, fontWeight: 800 }}>NEW</span>}
      </div>

      {/* Meta pills */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 14px 0', flexWrap: 'wrap' }}>
        <span style={{ padding: '2px 7px', borderRadius: 5, background: 'rgba(25,28,107,0.08)', color: OGAPAY_BLUE, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
          <i className="ti ti-tag" style={{fontSize:10}} /> {category}
        </span>
        {platform && (
          <span style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-device-laptop" style={{fontSize:10}} /> {platform}
          </span>
        )}
        {timeEstimate && (
          <span style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
            <i className="ti ti-clock" style={{fontSize:10}} /> {timeEstimate}
          </span>
        )}
      </div>

      {/* Title + Description */}
      <div style={{ padding: '10px 14px', flex: 1 }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: 15, fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>{title}</h3>
        <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
          {description}
        </p>
      </div>

      {/* Reward */}
      <div style={{ padding: '0 14px 10px' }}>
        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Reward</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>{typeof reward === 'number' ? reward.toLocaleString() : reward}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{currency}</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, padding: '0 14px 10px', flexWrap: 'wrap' }}>
        {featured && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-star" /> Featured</span>}
        {verificationRequired && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(22,163,74,0.12)', color: '#16a34a', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-shield-check" /> Verified</span>}
        {difficulty && (
          <span style={{ padding: '3px 8px', borderRadius: 5, background: `${getDifficultyColor(difficulty)}12`, color: getDifficultyColor(difficulty), fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-speedometer" /> {difficulty}
          </span>
        )}
        {rankRequired && (
          <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(31,140,255,0.08)', color: '#1F8CFF', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-medal" /> {typeof rankRequired === 'number' ? `Rank ${rankRequired}` : rankRequired}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 14px 12px' }}>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: OGAPAY_BLUE, width: `${Math.min(progress, 100)}%`, transition: 'width .3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
          <span>{slotsFilled} filled</span>
          <span>{slotsTotal} total</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px' }}>
        <button onClick={e => { e.stopPropagation(); navigate(`/tasks/${id}`); }}
          style={{ flex: 1, height: 34, borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <i className="ti ti-eye" style={{fontSize:13}} /> View
        </button>
        <button onClick={e => { e.stopPropagation(); navigate(`/tasks/${id}`); }}
          style={{ flex: 1, height: 34, borderRadius: 8, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <i className="ti ti-send" style={{fontSize:13}} /> Apply Now
        </button>
      </div>
    </div>
  )
}
