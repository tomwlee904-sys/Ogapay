import { useNavigate } from 'react-router-dom'

const OGAPAY_BLUE = '#191C6B'
const NGN_USD_RATE = 1600

function formatAddress(addr: string) {
  if (!addr) return ''
  return addr.slice(0, 2).toUpperCase()
}

function formatCategory(cat: string) {
  return (cat || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())
}

export default function TaskCard({ task }: { task: any }) {
  const navigate = useNavigate()

  const id = task.id
  const title = task.title || 'Untitled Task'
  const description = task.description || ''
  const category = task.category || task.taskCategory || 'Task'
  const reward = Number(task.reward || task.amount || 0)
  const currency = task.currency || task.rewardCurrency || 'NGN'
  const usdValue = currency === 'NGN' ? reward / NGN_USD_RATE : reward
  const status = task.status || 'OPEN'
  const creatorName = task.creatorName || task.poster?.username || task.creator?.username || task.creator || 'Anonymous'
  const creatorAvatar = task.creatorAvatar || task.poster?.avatarUrl || task.creator?.avatarUrl || null
  const slotsTotal = task.maxWorkers || task.maxSlots || task.slots || 100
  const slotsFilled = task.currentWorkers || task.filled || task.slotsFilled || 0
  const submissionsCount = task.submissionsCount ?? task._count?.submissions ?? task.currentWorkers ?? 0
  const openSlots = slotsTotal - slotsFilled
  const progress = slotsTotal > 0 ? (slotsFilled / slotsTotal) * 100 : 30
  const rankRequired = task.rankRequired || task.rank || task.minOgaScore || null
  const minPayHolding = task.minOgaScore && task.minOgaScore > 100000 ? task.minOgaScore : null
  const createdAt = task.createdAt || ''
  const createdAtDisplay = createdAt
    ? (() => { const diff = Date.now() - new Date(createdAt).getTime(); const m = Math.floor(diff / 60000); if (m < 1) return 'Just now'; if (m < 60) return `${m} MIN AGO`; const h = Math.floor(m / 60); return `${h}H AGO`; })()
    : ''

  return (
    <div onClick={() => navigate(`/tasks/${id}`)} style={{
      background: 'linear-gradient(135deg, rgba(220,252,231,0.3), rgba(255,255,255,0.7))',
      border: '1px solid var(--glass-border)', borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.06)', cursor: 'pointer',
      overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* ── LISTED BY — Boxed Header ── */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--glass-border)', background: 'rgba(25,28,107,0.04)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Listed By</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: OGAPAY_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0, overflow: 'hidden' }}>
            {creatorAvatar ? <img src={creatorAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : formatAddress(creatorName)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{creatorName}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{category ? formatCategory(category) : 'Poster'}</div>
          </div>
        </div>
      </div>

      {/* ═══ TITLE ═══ */}
      <div style={{ padding: '10px 14px 0' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>{title}</h3>
        <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
          {description || 'No description provided.'}
        </p>
      </div>

      {/* ═══ REWARD BOX ═══ */}
      <div style={{ padding: '10px 14px' }}>
        <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Reward</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>
            {reward.toLocaleString()} <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700 }}>{currency}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>${usdValue.toFixed(2)} USD</div>
        </div>
      </div>

      {/* ═══ META ROW ═══ */}
      <div style={{ padding: '0 14px', display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {rankRequired && (
          <span style={{ padding: '2px 7px', borderRadius: 5, background: 'rgba(31,140,255,0.08)', color: '#1F8CFF', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-medal" style={{fontSize:10}} /> Rank {typeof rankRequired === 'number' ? rankRequired : rankRequired}
          </span>
        )}
        {minPayHolding && (
          <span style={{ padding: '2px 7px', borderRadius: 5, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-coin" style={{fontSize:10}} /> $PAY &gt;= {minPayHolding.toLocaleString()}
          </span>
        )}
        {createdAtDisplay && (
          <span style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
            <i className="ti ti-clock" style={{fontSize:10}} /> {createdAtDisplay}
          </span>
        )}
      </div>

      {/* ═══ PROGRESS SECTION ═══ */}
      <div style={{ padding: '0 14px 6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>Progress</span>
          <span>{slotsTotal >= 999 ? 'Unlimited' : `${slotsFilled}/${slotsTotal}`}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: OGAPAY_BLUE, width: `${Math.min(progress, 100)}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* ═══ STATUS ROW — Single inline line ═══ */}
      <div style={{ padding: '0 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap', fontSize: 11 }}>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>● Submissions {submissionsCount}</span>
          <span style={{ color: '#6366f1', fontWeight: 600 }}>● Open {Math.max(0, openSlots)}</span>
          <span style={{ color: status === 'OPEN' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>● Status {status === 'OPEN' ? 'Open' : status === 'CLOSED' ? 'Closed' : status}</span>
        </div>
      </div>

      {/* ═══ APPLY BUTTON ═══ */}
      <div style={{ padding: '0 14px 14px', marginTop: 'auto' }}>
        <button onClick={e => { e.stopPropagation(); navigate(`/tasks/${id}`); }}
          style={{ width: '100%', height: 34, borderRadius: 8, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <i className="ti ti-send" style={{fontSize:13}} /> Apply Now
        </button>
      </div>
    </div>
  )
}
