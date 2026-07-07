import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'
import { useAuth } from '../context/AuthContext'

function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ── Icon mapping by notification TYPE (not title keywords) ──
const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  DEPOSIT_CONFIRMED:       { icon: 'ti ti-coin', color: 'var(--green)' },
  WITHDRAWAL_SUCCESS:      { icon: 'ti ti-wallet', color: '#F59E0B' },
  WITHDRAWAL_FAILED:       { icon: 'ti ti-wallet-off', color: 'var(--red)' },
  REFERRAL_BONUS:          { icon: 'ti ti-user-plus', color: '#F59E0B' },
  REFERRAL_SIGNUP:         { icon: 'ti ti-link', color: '#F59E0B' },
  SIGNUP_BONUS:            { icon: 'ti ti-gift', color: 'var(--green)' },
  TASK_PAYMENT_RECEIVED:   { icon: 'ti ti-coin', color: 'var(--green)' },
  ESCROW_REFUNDED:         { icon: 'ti ti-arrow-back-up', color: '#EC4899' },
  KYC_APPROVED:            { icon: 'ti ti-badge-check', color: 'var(--green)' },
  KYC_REJECTED:            { icon: 'ti ti-x-circle', color: 'var(--red)' },
  NEW_TASK:                { icon: 'ti ti-briefcase', color: 'var(--accent)' },
  TASK_APPLICATION:        { icon: 'ti ti-users', color: 'var(--accent)' },
  TASK_SUBMISSION:         { icon: 'ti ti-upload', color: 'var(--accent)' },
  SUBMISSION_APPROVED:     { icon: 'ti ti-check-circle', color: 'var(--green)' },
  SUBMISSION_REJECTED:     { icon: 'ti ti-x-circle', color: 'var(--red)' },
  SUBMISSION_REVIEWED:     { icon: 'ti ti-eye', color: 'var(--accent)' },
  SLOT_REOPENED:           { icon: 'ti ti-door-open', color: '#F59E0B' },
  COOLDOWN:                { icon: 'ti ti-hourglass', color: '#F59E0B' },
  COOLDOWN_EXPIRED:        { icon: 'ti ti-hourglass-high', color: 'var(--green)' },
  DISPUTE_OPENED:          { icon: 'ti ti-alert-triangle', color: 'var(--red)' },
  JOIN_REQUEST:            { icon: 'ti ti-door-enter', color: 'var(--accent)' },
  JOIN_REQUEST_APPROVED:   { icon: 'ti ti-door', color: 'var(--green)' },
  NEW_MESSAGE:             { icon: 'ti ti-message', color: '#EC4899' },
  STORE_PURCHASE:          { icon: 'ti ti-shopping-cart', color: 'var(--green)' },
  INFO:                    { icon: 'ti ti-bell', color: 'var(--accent)' },
}

function resolveIcon(type: string, title: string) {
  const mapped = TYPE_ICONS[type]
  if (mapped) return mapped
  // Fallback: guess from title if type is unknown
  const t = title.toLowerCase()
  if (t.includes('earn') || t.includes('payment') || t.includes('reward') || t.includes('bonus') || t.includes('deposit')) return TYPE_ICONS.DEPOSIT_CONFIRMED
  if (t.includes('approv') || t.includes('task') || t.includes('submit')) return TYPE_ICONS.TASK_SUBMISSION
  if (t.includes('withdraw')) return TYPE_ICONS.WITHDRAWAL_SUCCESS
  if (t.includes('refer')) return TYPE_ICONS.REFERRAL_BONUS
  if (t.includes('message') || t.includes('chat')) return TYPE_ICONS.NEW_MESSAGE
  if (t.includes('kyc') || t.includes('verified') || t.includes('identity')) return TYPE_ICONS.KYC_APPROVED
  if (t.includes('achie') || t.includes('badge') || t.includes('star')) return { icon: 'ti ti-star', color: '#F59E0B' }
  return TYPE_ICONS.INFO
}

export default function TabNotificationsContent() {
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState('all')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const LIMIT = 20

  const fetchNotifs = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)
    try {
      const data = await apiRequest<any>(`/notifications?limit=${LIMIT}&page=${pageNum}`)
      const items = Array.isArray(data) ? data : data?.notifications ?? []
      setNotifs(prev => append ? [...prev, ...items] : items)
      if (data?.pagination) {
        setTotalPages(data.pagination.pages || 1)
      }
    } catch {
      if (!append) setNotifs([])
    }
    setLoading(false)
    setLoadingMore(false)
  }, [])

  // Initial fetch + refetch on focus
  useEffect(() => {
    fetchNotifs(1)
    const onFocus = () => fetchNotifs(1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authUser?.id, fetchNotifs])

  // ── Real-time polling every 30s ──
  useEffect(() => {
    pollingRef.current = setInterval(() => fetchNotifs(1), 30000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [authUser?.id, fetchNotifs])

  useEffect(() => { injectSkeletonStyles() }, [])

  const mapNotif = (n: any) => {
    const iconInfo = resolveIcon(n.type, n.title)
    return {
      ...n,
      id: n.id,
      icon: iconInfo.icon,
      color: iconInfo.color,
      type: n.type,
      title: n.title,
      desc: n.body || n.description || '',
      time: n.createdAt ? timeAgo(n.createdAt) : '',
      read: n.read ?? n.isRead ?? false,
      link: n.link || (n.data?.taskId ? `/tasks/${n.data.taskId}${n.data.submissionId ? `?tab=submissions` : ''}` : null),
    }
  }

  const resetAndFetch = () => {
    setPage(1)
    fetchNotifs(1)
  }

  const mapped = notifs.map(mapNotif)
  const filtered = filter === 'all' ? mapped
    : filter === 'unread' ? mapped.filter(n => !n.read)
    : mapped.filter(n => n.read)
  const unreadCount = mapped.filter(n => !n.read).length

  const markAllRead = async () => {
    try { await apiRequest('/notifications/read-all', { method: 'PATCH' }) } catch { /* ignore */ }
    resetAndFetch()
  }

  const markOneRead = async (id: string | number) => {
    try { await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }) } catch { /* ignore */ }
    resetAndFetch()
  }

  const deleteNotif = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    try { await apiRequest(`/notifications/${id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    resetAndFetch()
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchNotifs(nextPage, true)
  }

  if (loading) {
    return <SkeletonPage />
  }

  return (
    <>
      <style>{`
        .nt-hero{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px}
        .nt-hero-left .nt-greeting{color:var(--text2);font-size:13px;font-weight:600;margin-bottom:2px}
        .nt-hero-left h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0}
        .nt-hero-right{display:flex;gap:8px}
        .nt-tabs{display:flex;gap:4px;margin-bottom:16px}
        .nt-tab{padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}
        .nt-tab:hover,.nt-tab.active{border-color:var(--accent);color:var(--accent);background:rgba(var(--accent-rgb),.08)}
        .nt-mark-btn{height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap}
        .nt-mark-btn:hover{border-color:var(--accent);color:var(--accent)}
        .nt-list{display:grid;gap:6px}
        .nt-item{display:flex;gap:14px;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:12px;transition:all .2s;cursor:pointer;position:relative}
        .nt-item:hover{border-color:var(--border2)}
        .nt-item.unread{border-left:3px solid var(--accent);background:rgba(var(--accent-rgb),.03)}
        .nt-icon{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;flex-shrink:0;font-size:16px}
        .nt-content{flex:1;min-width:0}
        .nt-title{font-weight:700;font-size:13px;margin-bottom:2px;padding-right:20px}
        .nt-desc{color:var(--text2);font-size:12px;margin-bottom:2px}
        .nt-time{font-size:11px;color:var(--text3)}
        .nt-del{position:absolute;top:10px;right:10px;width:24px;height:24px;border-radius:6px;border:none;background:transparent;color:var(--text3);cursor:pointer;display:grid;place-items:center;font-size:14px;transition:all .15s}
        .nt-del:hover{background:rgba(var(--red-rgb,239,68,68),.1);color:var(--red)}
        .nt-empty{text-align:center;padding:48px 20px;color:var(--text2)}
        .nt-empty i{font-size:36px;color:var(--text3);margin-bottom:12px;display:block}
        .nt-load-more{width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .2s;margin-top:6px}
        .nt-load-more:hover{background:var(--bg2)}
        .nt-load-more:disabled{opacity:.5;cursor:not-allowed}
      `}</style>

      <div className="nt-hero">
        <div className="nt-hero-left">
          <div className="nt-greeting">Updates</div>
          <h1>Notifications {unreadCount > 0 && <span style={{fontSize:14,color:'var(--accent)',fontWeight:700}}>({unreadCount})</span>}</h1>
        </div>
        <div className="nt-hero-right">
          {unreadCount > 0 && (
            <button className="nt-mark-btn" onClick={markAllRead}><i className="ti ti-check-double" /> Mark all read</button>
          )}
        </div>
      </div>

      <div className="nt-tabs">
        {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'read', label: 'Read' },
        ].map(t => (
          <button key={t.id} className={`nt-tab ${filter === t.id ? 'active' : ''}`} onClick={() => setFilter(t.id)}>{t.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="nt-empty">
          <i className="ti ti-bell-off" />
          <h3 style={{fontFamily:'Outfit',fontWeight:800,margin:'0 0 4px',color:'var(--text)'}}>All caught up!</h3>
          <p style={{fontSize:13,margin:0}}>No notifications here</p>
        </div>
      ) : (
        <div className="nt-list">
          {filtered.map(n => (
            <div className={`nt-item ${!n.read ? 'unread' : ''}`} key={n.id} onClick={() => {
              markOneRead(n.id)
              if (n.link) navigate(n.link)
            }}>
              <div className="nt-icon" style={{background: `${n.color}15`, color: n.color}}>
                <i className={n.icon} />
              </div>
              <div className="nt-content">
                <div className="nt-title">{n.title}</div>
                <div className="nt-desc">{n.desc}</div>
                <div className="nt-time">{n.time}</div>
              </div>
              <button className="nt-del" onClick={(e) => deleteNotif(n.id, e)} title="Delete">
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
          {page < totalPages && (
            <button className="nt-load-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </>
  )
}
