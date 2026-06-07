import { useState, useEffect } from 'react'
import { apiRequest } from '../lib/api'
import Layout from '../components/Layout'

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

const iconMap: Record<string, { icon: string; color: string }> = {
  earnings: { icon: 'ti ti-coin', color: '#16a34a' },
  task: { icon: 'ti ti-check', color: '#1F8CFF' },
  withdrawal: { icon: 'ti ti-wallet', color: '#2563EB' },
  referral: { icon: 'ti ti-user-plus', color: '#F59E0B' },
  message: { icon: 'ti ti-message', color: '#EC4899' },
  update: { icon: 'ti ti-bullhorn', color: '#1F8CFF' },
  achievement: { icon: 'ti ti-star', color: '#F59E0B' },
}

function guessMeta(title = '') {
  const t = title.toLowerCase()
  if (t.includes('earn') || t.includes('payment') || t.includes('reward')) return iconMap.earnings
  if (t.includes('approv') || t.includes('task') || t.includes('submit')) return iconMap.task
  if (t.includes('withdraw') || t.includes('wallet')) return iconMap.withdrawal
  if (t.includes('refer') || t.includes('referral')) return iconMap.referral
  if (t.includes('message') || t.includes('chat')) return iconMap.message
  if (t.includes('update') || t.includes('platform') || t.includes('new')) return iconMap.update
  if (t.includes('achie') || t.includes('badge') || t.includes('star')) return iconMap.achievement
  return { icon: 'ti ti-bell', color: '#1F8CFF' }
}

export default function Notifications() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchNotifs = async () => {
    setLoading(true)
    try {
      const data = await apiRequest<any>('/notifications?limit=50')
      const items = Array.isArray(data) ? data : data?.notifications ?? []
      setNotifs(items)
    } catch {
      setNotifs([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchNotifs() }, [])

  const mapNotif = (n: any) => ({
    ...n,
    id: n.id,
    icon: n.icon || guessMeta(n.title).icon,
    color: n.color || guessMeta(n.title).color,
    title: n.title,
    desc: n.body || n.description || '',
    time: n.createdAt ? timeAgo(n.createdAt) : '',
    read: n.read ?? n.isRead ?? false,
  })

  const mapped = notifs.map(mapNotif)
  const filtered = filter === 'all' ? mapped : filter === 'unread' ? mapped.filter(n => !n.read) : mapped.filter(n => n.read)
  const unreadCount = mapped.filter(n => !n.read).length

  const markAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' })
    } catch {}
    fetchNotifs()
  }

  const markOneRead = async (id: string | number) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' })
    } catch {}
    fetchNotifs()
  }

  return (
    <Layout>
      <style>{`
        .nt-hero{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px}
        .nt-hero-left{}
        .nt-hero-left .nt-greeting{color:var(--text2);font-size:13px;font-weight:600;margin-bottom:2px}
        .nt-hero-left h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0}
        .nt-hero-right{display:flex;gap:8px}
        .nt-tabs{display:flex;gap:4px;margin-bottom:16px}
        .nt-tab{padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}
        .nt-tab:hover,.nt-tab.active{border-color:var(--accent);color:var(--accent);background:rgba(31,140,255,.08)}
        .nt-mark-btn{height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}
        .nt-mark-btn:hover{border-color:var(--accent);color:var(--accent)}
        .nt-list{display:grid;gap:6px}
        .nt-item{display:flex;gap:14px;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:12px;transition:all .2s;cursor:pointer}
        .nt-item:hover{border-color:var(--border2)}
        .nt-item.unread{border-left:3px solid var(--accent);background:rgba(31,140,255,.03)}
        .nt-icon{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;flex-shrink:0;font-size:16px}
        .nt-content{flex:1;min-width:0}
        .nt-title{font-weight:700;font-size:13px;margin-bottom:2px}
        .nt-desc{color:var(--text2);font-size:12px;margin-bottom:2px}
        .nt-time{font-size:11px;color:var(--text3)}
        .nt-empty{text-align:center;padding:48px 20px;color:var(--text2)}
        .nt-empty i{font-size:36px;color:var(--text3);margin-bottom:12px;display:block}
        .nt-loading{text-align:center;padding:48px 20px;color:var(--text2)}
        .nt-spinner{display:inline-block;width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
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

      {loading ? (
        <div className="nt-loading"><div className="nt-spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="nt-empty">
          <i className="ti ti-bell-off" />
          <h3 style={{fontFamily:'Outfit',fontWeight:800,margin:'0 0 4px',color:'var(--text)'}}>All caught up!</h3>
          <p style={{fontSize:13,margin:0}}>No notifications here</p>
        </div>
      ) : (
        <div className="nt-list">
          {filtered.map(n => (
            <div className={`nt-item ${!n.read ? 'unread' : ''}`} key={n.id} onClick={() => { if (!n.read) markOneRead(n.id) }}>
              <div className="nt-icon" style={{background: `${n.color}15`, color: n.color}}>
                <i className={n.icon} />
              </div>
              <div className="nt-content">
                <div className="nt-title">{n.title}</div>
                <div className="nt-desc">{n.desc}</div>
                <div className="nt-time">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
