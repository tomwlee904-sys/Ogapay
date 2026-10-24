import { useState, useEffect, useRef, useCallback } from 'react'
import { CATEGORY_LABELS } from '../lib/categories'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { refreshUnread } from '../lib/shared'
import LoadError from './LoadError'
import { useAuth } from '../context/AuthContext'
import { PushOffer } from './PushAlerts'
import { renderJobText } from '../lib/jobText'

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
  KYC_APPROVED:            { icon: 'ti ti-rosette-discount-check', color: 'var(--green)' },
  KYC_REJECTED:            { icon: 'ti ti-circle-x', color: 'var(--red)' },
  VERIFY_REMINDER:         { icon: 'ti ti-id', color: 'var(--accent)' },
  NEW_TASK:                { icon: 'ti ti-briefcase', color: 'var(--accent)' },
  NEW_TASKS_MORE:          { icon: 'ti ti-briefcase', color: 'var(--accent)' },
  TASK_APPLICATION:        { icon: 'ti ti-users', color: 'var(--accent)' },
  TASK_SUBMISSION:         { icon: 'ti ti-upload', color: 'var(--accent)' },
  SUBMISSION_APPROVED:     { icon: 'ti ti-circle-check', color: 'var(--green)' },
  SUBMISSION_REJECTED:     { icon: 'ti ti-circle-x', color: 'var(--red)' },
  SUBMISSION_REVIEWED:     { icon: 'ti ti-eye', color: 'var(--accent)' },
  WORK_RATED:              { icon: 'ti ti-star', color: '#d4a017' },
  SLOT_EXPIRED:            { icon: 'ti ti-clock-x', color: 'var(--text3)' },
  SLOT_REOPENED:           { icon: 'ti ti-door-enter', color: '#F59E0B' },
  COOLDOWN:                { icon: 'ti ti-hourglass', color: '#F59E0B' },
  COOLDOWN_EXPIRED:        { icon: 'ti ti-hourglass-high', color: 'var(--green)' },
  DISPUTE_OPENED:          { icon: 'ti ti-alert-triangle', color: 'var(--red)' },
  JOIN_REQUEST:            { icon: 'ti ti-door-enter', color: 'var(--accent)' },
  JOIN_REQUEST_APPROVED:   { icon: 'ti ti-door', color: 'var(--green)' },
  NEW_MESSAGE:             { icon: 'ti ti-message', color: '#EC4899' },
  STORE_PURCHASE:          { icon: 'ti ti-shopping-cart', color: 'var(--green)' },
  STORE_ORDER_UPDATE:      { icon: 'ti ti-package', color: 'var(--accent)' },
  STORE_ORDER_REFUNDED:    { icon: 'ti ti-receipt-refund', color: 'var(--green)' },
  STORE_PAYMENT_RELEASED:  { icon: 'ti ti-coin', color: 'var(--green)' },
  STORE_ORDER_DISPUTED:    { icon: 'ti ti-alert-triangle', color: 'var(--red)' },
  DIRECT_HIRE:             { icon: 'ti ti-briefcase', color: 'var(--green)' },
  SELECTION_PICKED:        { icon: 'ti ti-user-check', color: 'var(--green)' },
  SELECTION_NOT_PICKED:    { icon: 'ti ti-user-x', color: 'var(--text3)' },
  COMMUNITY_INVITE:        { icon: 'ti ti-users-plus', color: 'var(--accent)' },
  TRANSFER_RECEIVED:       { icon: 'ti ti-arrows-exchange', color: 'var(--green)' },
  TIP_RECEIVED:            { icon: 'ti ti-heart-handshake', color: 'var(--green)' },
  INFO:                    { icon: 'ti ti-bell', color: 'var(--accent)' },
  ACCOUNT_WARNING:         { icon: 'ti ti-alert-triangle', color: '#F59E0B' },
  JOBS_SUSPENDED:          { icon: 'ti ti-ban', color: 'var(--red)' },
  SUSPENSION_LIFTED:       { icon: 'ti ti-circle-check', color: 'var(--green)' },
  WARNING_WITHDRAWN:       { icon: 'ti ti-circle-check', color: 'var(--green)' },
  WARNING_APPEAL_DECLINED: { icon: 'ti ti-message-reply', color: 'var(--text2)' },
  WARNING_APPEAL:          { icon: 'ti ti-message-report', color: '#F59E0B' },
  BRAND_APPLICATION:       { icon: 'ti ti-building-store', color: 'var(--accent)' },
  BRAND_VERIFIED:          { icon: 'ti ti-rosette-discount-check', color: 'var(--green)' },
  BRAND_REJECTED:          { icon: 'ti ti-building-store', color: 'var(--red)' },
}

function resolveIcon(type: string, title: string) {
  if (type === 'PLATFORM_UPDATE') return { icon: 'ti ti-speakerphone', color: 'var(--accent)' }
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

// "Today", "Yesterday" or "Earlier": the day group a notification sits under
function dayGroup(date?: string) {
  if (!date) return 'Earlier'
  const d = new Date(date); const t = new Date()
  const start = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()
  if (d.getTime() >= start) return 'Today'
  if (d.getTime() >= start - 86400000) return 'Yesterday'
  return 'Earlier'
}

// The alerts list. page: the /notifications page (its own h1 header); without
// it, the Profile tab (an h2 section heading). One card of rows grouped by day;
// a failed load says so with Try again (it used to say "All caught up!").
export default function TabNotificationsContent({ page: asPage = false }: { page?: boolean }) {
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<any[] | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [failed, setFailed] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  // The row whose ⋯ menu is open
  const [menu, setMenu] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const LIMIT = 20

  const fetchNotifs = useCallback(async (pageNum: number, append = false) => {
    if (pageNum > 1) setLoadingMore(true)
    try {
      const data = await apiRequest<any>(`/notifications?limit=${LIMIT}&page=${pageNum}`)
      const items = Array.isArray(data) ? data : data?.notifications ?? []
      setNotifs(prev => append ? [...(prev || []), ...items] : items)
      setFailed(false)
      if (data?.pagination) {
        setTotalPages(data.pagination.pages || 1)
      }
    } catch {
      // A failed refresh keeps what is already shown; only a first load shows the error
      if (!append) setFailed(true)
    }
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

  // Close the ⋯ menu on any tap elsewhere
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menu])

  // Where a notification opens. Job ones differ by who received them: posters
  // review in Manage jobs, workers see their status on the submit page.
  const POSTER_JOB = new Set(['TASK_APPLICATION', 'TASK_SUBMISSION', 'SUBMISSION_REVIEWED', 'REVIEW_REMINDER', 'DISPUTE_OPENED', 'COOLDOWN'])
  const WORKER_JOB = new Set(['SUBMISSION_APPROVED', 'SUBMISSION_REJECTED', 'SLOT_EXPIRED', 'DIRECT_HIRE', 'SELECTION_PICKED', 'WORK_RATED'])
  const MONEY = new Set(['TRANSFER_RECEIVED', 'ESCROW_REFUNDED', 'CLOSED_ACCOUNT_DEPOSIT', 'WITHDRAWAL', 'WITHDRAWAL_SUCCESS', 'WITHDRAWAL_FAILED', 'DEPOSIT', 'DEPOSIT_SUCCESS', 'DEPOSIT_RECEIVED', 'TASK_PAYMENT', 'TASK_PAYMENT_RECEIVED', 'TASK_REFUND', 'TASK_REWARD', 'REFERRAL_BONUS', 'SIGNUP_BONUS', 'TIP_RECEIVED'])
  const linkFor = (n: any): string | null => {
    const d = n.data || {}
    if (n.link) return n.link
    // Store orders: sellers manage them in My Store, buyers in My orders
    if (n.type === 'STORE_PURCHASE' || n.type === 'STORE_PAYMENT_RELEASED') return '/my-store?tab=orders'
    if (n.type === 'STORE_ORDER_DISPUTED') return /dispute/i.test(n.title || '') ? '/admin/moderation' : '/my-store?tab=orders'
    if (n.type === 'STORE_ORDER_UPDATE') return /cancelled/i.test(n.title || '') ? '/my-store?tab=orders' : '/store/orders'
    if (n.type === 'STORE_ORDER_REFUNDED') return '/store/orders'
    if (n.type === 'VERIFY_REMINDER') return '/settings/verification'
    // Warnings (same rules as the backend push.service linkFor)
    if (['ACCOUNT_WARNING', 'JOBS_SUSPENDED', 'SUSPENSION_LIFTED', 'WARNING_WITHDRAWN', 'WARNING_APPEAL_DECLINED'].includes(n.type)) return '/warnings'
    if (n.type === 'WARNING_APPEAL') return '/admin/warnings'
    // Verified business badge
    if (n.type === 'BRAND_VERIFIED' || n.type === 'BRAND_REJECTED') return '/settings/business'
    if (n.type === 'BRAND_APPLICATION') return '/admin/brands'
    // The day's grouped new-job alert (backend jobAlerts.service)
    if (n.type === 'NEW_TASKS_MORE') return '/tasks'
    if (d.taskId && POSTER_JOB.has(n.type)) return `/manage-jobs?job=${d.taskId}`
    if (d.taskId && WORKER_JOB.has(n.type)) return `/tasks/${d.taskId}/submit`
    if (MONEY.has(n.type)) return '/wallet'
    if (d.conversationId) return `/messages?c=${d.conversationId}`
    if (d.taskId) return `/tasks/${d.taskId}`
    if (d.communityId) return `/communities/${d.communityId}`
    return null
  }

  const mapNotif = (n: any) => {
    const iconInfo = resolveIcon(n.type, n.title)
    return {
      ...n,
      id: n.id,
      icon: iconInfo.icon,
      color: iconInfo.color,
      type: n.type,
      title: n.title,
      // older notifications have category codes (CONTENT_WRITING) in the text
      desc: String(n.body || n.description || '').replace(/[A-Z]+(?:_[A-Z]+)+/g, (c) => CATEGORY_LABELS[c] || c),
      time: n.createdAt ? timeAgo(n.createdAt) : '',
      group: dayGroup(n.createdAt),
      read: n.read ?? n.isRead ?? false,
      link: linkFor(n),
    }
  }

  const resetAndFetch = () => {
    setPage(1)
    fetchNotifs(1)
  }

  const mapped = (notifs || []).map(mapNotif)
  const filtered = filter === 'all' ? mapped : mapped.filter(n => !n.read)
  const unreadCount = mapped.filter(n => !n.read).length
  const groups = ['Today', 'Yesterday', 'Earlier'].map((g) => ({ g, items: filtered.filter((n) => n.group === g) })).filter((x) => x.items.length > 0)

  const markAllRead = async () => {
    try { await apiRequest('/notifications/read-all', { method: 'PATCH' }) } catch { /* ignore */ }
    resetAndFetch()
    refreshUnread(true) // the badge in the top bar and dock
  }

  const markOneRead = async (id: string | number) => {
    try { await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }) } catch { /* ignore */ }
    resetAndFetch()
    refreshUnread(true) // the badge in the top bar and dock
  }

  const deleteNotif = async (id: string | number) => {
    setMenu(null)
    try { await apiRequest(`/notifications/${id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    resetAndFetch()
    refreshUnread(true) // the badge in the top bar and dock
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchNotifs(nextPage, true)
  }

  const open = (n: any) => {
    if (!n.read) markOneRead(n.id)
    if (n.link) navigate(n.link)
  }

  const Title = asPage ? 'h1' : 'h2'
  const markBtn = unreadCount > 0 && notifs && (
    <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={markAllRead}><i className="ti ti-checks" aria-hidden="true" /> Mark all read</button>
  )

  return (
    <div className="nt">
      <style>{`
        .nt-head-sec{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
        .nt-head-sec h2{margin:0;font-size:var(--fs-h2);font-weight:600;color:var(--text)}
        .nt-chips{display:flex;gap:8px;margin:16px 0 12px}
        .nt-chips .ui-chip{height:36px}
        .nt-list{list-style:none;margin:0;padding:0 0 4px;overflow:visible}
        .nt-day{padding:14px 16px 6px;font:500 var(--fs-label) var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--text2)}
        .nt-day + .nt-row{border-top:0}
        .nt-row{display:grid;grid-template-columns:minmax(0,1fr) 44px;align-items:start;border-top:1px solid var(--border)}
        .nt-main{display:grid;grid-template-columns:36px minmax(0,1fr);gap:12px;padding:12px 0 12px 16px;cursor:pointer;min-width:0;border-radius:var(--r-md)}
        .nt-main:hover .nt-title{text-decoration:underline;text-underline-offset:2px}
        .nt-icon{width:36px;height:36px;border-radius:var(--r-ctl);display:grid;place-items:center;font-size:16px}
        .nt-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:500;line-height:1.4;color:var(--text);margin-bottom:2px}
        .nt-row.unread .nt-title{font-weight:600}
        .nt-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0}
        .nt-desc{color:var(--text2);font-size:13px;line-height:1.5;margin-bottom:2px;overflow-wrap:anywhere}
        .nt-update{color:var(--text);font-size:14px;line-height:1.6;margin:6px 0}.nt-update p{margin:0 0 10px}.nt-update ul,.nt-update ol{margin:0 0 10px;padding-left:20px}.nt-update ul{list-style:disc}.nt-update ol{list-style:decimal}.nt-update li{margin:4px 0}.nt-update a{color:var(--text);text-decoration:underline;text-underline-offset:2px;font-weight:600}
        .nt-time{font-size:12px;color:var(--text3)}
        .nt-more-wrap{position:relative;padding-top:8px}
        .nt-more{width:44px;height:44px;border:0;border-radius:var(--r-ctl);background:transparent;color:var(--text3);display:grid;place-items:center;font-size:18px;cursor:pointer}
        .nt-more:hover,.nt-more[aria-expanded="true"]{background:var(--card2);color:var(--text)}
        .nt-menu{position:absolute;right:6px;top:52px;z-index:30;min-width:170px;padding:6px;border-radius:var(--r-md);border:1px solid var(--border);background:var(--card);box-shadow:var(--sh-pop)}
        .nt-menu button{width:100%;display:flex;align-items:center;gap:8px;height:40px;padding:0 10px;border:0;border-radius:var(--r-sm);background:none;color:var(--text);font:500 13px var(--font);cursor:pointer;text-align:left}
        .nt-menu button:hover{background:var(--card2)}
        .nt-menu button.danger{color:var(--red)}
        .nt-load-more{width:100%;margin-top:12px}
      `}</style>

      {asPage ? (
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">Alerts</span>
            <Title className="ui-title">Notifications</Title>
          </div>
          {markBtn && <div className="ui-actions">{markBtn}</div>}
        </div>
      ) : (
        <div className="nt-head-sec"><Title>Notifications</Title>{markBtn}</div>
      )}

      <div style={{ marginTop: asPage ? 20 : 0 }}><PushOffer /></div>

      {failed && !notifs ? (
        <div style={{ marginTop: 16 }}><LoadError what="your notifications" onRetry={() => fetchNotifs(1)} /></div>
      ) : notifs === null ? (
        <div className="ui-sk" style={{ height: 280, marginTop: 16 }} />
      ) : (
        <>
          <div className="nt-chips" role="tablist" aria-label="Show">
            <button type="button" role="tab" aria-selected={filter === 'all'} className={`ui-chip${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button type="button" role="tab" aria-selected={filter === 'unread'} className={`ui-chip${filter === 'unread' ? ' on' : ''}`} onClick={() => setFilter('unread')}>Unread{unreadCount > 0 && <em>{unreadCount}</em>}</button>
          </div>

          {filtered.length === 0 ? (
            <div className="ui-empty">
              <strong>{filter === 'unread' && mapped.length > 0 ? 'No unread alerts' : 'No notifications yet'}</strong>
              Payments, job updates and messages for you show here.
            </div>
          ) : (
            <ul className="ui-card nt-list">
              {groups.map(({ g, items }) => (
                <li key={g} style={{ display: 'contents' }}>
                  <div className="nt-day" role="presentation">{g}</div>
                  {items.map(n => (
                    <div className={`nt-row ${!n.read ? 'unread' : ''}`} key={n.id}>
                      <div className="nt-main" role={n.link ? 'link' : 'button'} tabIndex={0} onClick={() => open(n)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(n) } }}>
                        <div className="nt-icon" style={{ background: `color-mix(in srgb, ${n.color} 12%, transparent)`, color: n.color }}>
                          <i className={n.icon} aria-hidden="true" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="nt-title">{!n.read && <span className="nt-dot" aria-label="Unread" />}{n.title}</div>
                          {n.type === 'PLATFORM_UPDATE'
                            ? <div className="nt-desc nt-update" dangerouslySetInnerHTML={{ __html: renderJobText(String(n.body || '')) }} />
                            : <div className="nt-desc">{n.desc}</div>}
                          <div className="nt-time">{n.time}</div>
                        </div>
                      </div>
                      <div className="nt-more-wrap">
                        <button type="button" className="nt-more" aria-label="More options" aria-haspopup="menu" aria-expanded={menu === n.id}
                          onClick={(e) => { e.stopPropagation(); setMenu(menu === n.id ? null : n.id) }}>
                          <i className="ti ti-dots" aria-hidden="true" />
                        </button>
                        {menu === n.id && (
                          <div className="nt-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                            {!n.read && <button type="button" role="menuitem" onClick={() => { setMenu(null); markOneRead(n.id) }}><i className="ti ti-check" aria-hidden="true" /> Mark as read</button>}
                            <button type="button" role="menuitem" className="danger" onClick={() => deleteNotif(n.id)}><i className="ti ti-trash" aria-hidden="true" /> Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
          {filtered.length > 0 && page < totalPages && (
            <button type="button" className="ui-btn ui-btn-ghost nt-load-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

