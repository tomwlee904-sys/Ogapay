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
      background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
      border: '1px solid var(--glass-border)', borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.06)', cursor: 'pointer',
      padding: 16, height: '100%', display: 'flex', flexDirection: 'column',
      position: 'relative',
    }}>
      {/* ═══ 1. HEADER — avatar + LISTED BY + username ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: OGAPAY_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0, overflow: 'hidden' }}>
          {creatorAvatar ? <img src={creatorAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : formatAddress(creatorName)}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)', marginBottom: 1 }}>Listed by</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>{creatorName}</div>
        </div>
      </div>

      {/* ═══ 2. PROGRESS ROW ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)' }}>Progress</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          {slotsTotal >= 999 ? 'Unlimited slots' : `${slotsFilled}/${slotsTotal}`}
        </span>
      </div>

      {/* ═══ 3. PROGRESS BAR ═══ */}
      <div style={{ height: 6, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', borderRadius: 4, background: OGAPAY_BLUE, width: `${Math.min(progress, 100)}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* ═══ 4. STATUS LINE — colored dots ═══ */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
        <span><span style={{ color: '#16a34a', marginRight: 3 }}>●</span> Submissions {submissionsCount}</span>
        <span><span style={{ color: 'var(--text3)', marginRight: 3 }}>●</span> Open {Math.max(0, openSlots)}</span>
        <span>
          <span style={{ color: status === 'OPEN' ? '#16a34a' : status === 'CLOSED' ? '#dc2626' : '#f59e0b', marginRight: 3 }}>●</span>
          Status {status === 'OPEN' ? 'Open' : status === 'CLOSED' ? 'Closed' : status}
        </span>
      </div>

      {/* ═══ 4.5 TITLE ═══ */}
      <h3 style={{ fontFamily: 'Outfit', fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.3 }}>{title}</h3>

      {/* ═══ 5. REWARD BOX — large centered ═══ */}
      <div style={{ background: 'rgba(25,28,107,0.06)', borderRadius: 10, padding: 18, textAlign: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, color: OGAPAY_BLUE }}>{reward.toLocaleString()}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>{currency}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>${usdValue.toFixed(2)} USD</div>
      </div>

      {/* ═══ 6. META ROW — category | rank | req ═══ */}
      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: '2px 6px' }}>
        <span>{formatCategory(category)}</span>
        {rankRequired && <><span style={{ color: 'var(--border)' }}>|</span><span>Rank {typeof rankRequired === 'number' ? rankRequired : rankRequired}</span></>}
        {minPayHolding && <><span style={{ color: 'var(--border)' }}>|</span><span>Req: $PAY &gt;= {minPayHolding.toLocaleString()}</span></>}
      </div>

      {/* ═══ 7. ABOUT THIS TASK ═══ */}
      <div style={{ flex: 1, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-message" style={{ fontSize: 12 }} /> About This Task
          </span>
          {createdAtDisplay && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{createdAtDisplay}</span>}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
          {description || 'No description provided.'}
        </p>
      </div>

      {/* ═══ 8. APPLY BUTTON ═══ */}
      <button onClick={e => { e.stopPropagation(); navigate(`/tasks/${id}`); }}
        style={{ width: '100%', height: 38, borderRadius: 9, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        Apply Now <i className="ti ti-arrow-right" style={{ fontSize: 14 }} />
      </button>
    </div>
  )
}
