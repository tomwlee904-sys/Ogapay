import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import LoadError from './LoadError'


// ── Info tooltip ─────────────────────────────────────────────────────
function InfoBtn({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", marginLeft: 4, verticalAlign: "middle" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.stopPropagation(); setShow(s => !s) }}>
      <i className="ti ti-info-circle" style={{ fontSize: 12, color: "var(--text3)", cursor: "pointer" }} />
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", background: "var(--text)", color: "var(--card)",
          fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 8,
          whiteSpace: "normal", width: 240, zIndex: 99, pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

// PENDING is a taken slot with no work sent yet; SUBMITTED is work waiting
// for review (it used to show the raw word "SUBMITTED")
const STATUS_MAP: Record<string, string> = {
  APPLIED: 'In Progress',
  PENDING: 'In Progress',
  SUBMITTED: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DISPUTED: 'In dispute',
  EXPIRED: 'Slot released',
}

const COLOR_MAP: Record<string, string> = {
  APPLIED: 'var(--accent)',
  PENDING: 'var(--accent)',
  SUBMITTED: '#F59E0B',
  APPROVED: 'var(--green)',
  REJECTED: '#DC2626',
  DISPUTED: '#F59E0B',
  EXPIRED: 'var(--text3)',
}


// A contest slot taken but never sent, once an entry can't be sent any more
// (the end date passed, or the winners were paid)
const unsentContest = (s: any) => {
  const e = s.task?.expiresAt || s.task?.deadline
  return !!s.isContest && !s.submittedAt && s.contestResult !== 'WON'
    && (s.contestResult === 'NOT_PLACED' || (s.status === 'PENDING' && !!e && new Date(e).getTime() <= Date.now()))
}

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'in progress', label: 'In Progress' },
  { id: 'under review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

function fmtCurrency(currency: string, amount: number) {
  const sym: Record<string, string> = { NGN: '₦', USD: '$', SOL: '◎' }
  return (sym[currency] || currency + ' ') + amount.toLocaleString()
}

function timeAgo(dateStr: string) {
  if (!dateStr) return ''
  const time = new Date(dateStr).getTime()
  if (isNaN(time)) return ''
  const diff = Date.now() - time
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.floor(hrs / 24)
  return days + 'd ago'
}

export default function TabMyTasksContent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState('all')
  const [submissions, setSubmissions] = useState<any[]>([])
  const [createdTasks, setCreatedTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // The submissions request failed: say so with Try again, not "No submissions yet"
  const [failed, setFailed] = useState(false)

  const fetchData = async () => {
    try {
      const [subRes, createdRes] = await Promise.allSettled([
        apiRequest<any>('/tasks/my/submissions'),
        apiRequest<any>('/tasks/my/created'),
      ])
      if (subRes.status === 'fulfilled' && subRes.value) {
        const v = subRes.value
        const list = Array.isArray(v) ? v : v.submissions || v.data || v.tasks || []
        setSubmissions(list)
        setFailed(false)
      } else {
        setFailed(true)
      }
      if (createdRes.status === 'fulfilled' && createdRes.value) {
        const v = createdRes.value
        const list = Array.isArray(v) ? v : v.data || v.tasks || []
        setCreatedTasks(list)
      }
    } catch {
      setFailed(true)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchData()
    const onVisible = () => { if (!document.hidden) fetchData() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.id])

  // A contest entry that didn't place (it stays SUBMITTED) or a contest slot
  // never sent is finished, not in progress or waiting for review: it shows
  // under All only, with its "Didn't place" or "Not sent" badge (as in MyTasks)
  const filtered = tab === 'all'
    ? submissions
    : submissions.filter(s => {
        if ((tab === 'in progress' || tab === 'under review') && (s.contestResult === 'NOT_PLACED' || unsentContest(s))) return false
        const display = STATUS_MAP[s.status] || s.status
        return display.toLowerCase() === tab
      })

  return (
    <>
      <style>{`
        .mt-head{margin-bottom:12px}
        .mt-head h2{margin:0;font-size:var(--fs-h2);font-weight:600;color:var(--text)}
        .mt-head p{margin:4px 0 0;color:var(--text2);font-size:13px}
        .mt-head a{color:var(--text);font-weight:600}
        .mt-tabs{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
        .mt-tabs .ui-chip{height:36px}
        .mt-sec{margin:0 0 10px;font-size:var(--fs-card);font-weight:600;color:var(--text)}
        .mt-list{list-style:none;margin:0;padding:0 16px}
        .mt-list > li + li{border-top:1px solid var(--border)}
        .mt-item{display:flex;align-items:center;gap:14px;padding:12px 0;width:100%;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
        .mt-icon{width:36px;height:36px;border-radius:var(--r-ctl);display:grid;place-items:center;flex-shrink:0;font-size:16px}
        .mt-info{flex:1;min-width:0}
        .mt-title{display:block;font-weight:600;font-size:14px;line-height:1.4;margin-bottom:2px;color:var(--text)}
        .mt-meta{font-size:12.5px;color:var(--text2)}
        .mt-right{text-align:right;flex-shrink:0;display:grid;gap:4px;justify-items:end}
        .mt-reward{font-weight:600;font-size:14px;font-variant-numeric:tabular-nums}
        .mt-status{padding:3px 9px;border-radius:var(--r-pill);font-size:12px;font-weight:600;display:inline-block}
      `}</style>

      <div className="mt-head">
        <h2>My tasks</h2>
        <p>Jobs you've taken and where each one stands. <a href="/my-tasks" onClick={(e) => { e.preventDefault(); navigate('/my-tasks') }}>Open the full list</a></p>
      </div>

      <div className="mt-tabs" role="tablist" aria-label="Filter">
        {(tabs || []).map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`ui-chip${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
        <InfoBtn text="In progress: you took a place and haven't sent your work yet. Under review: the poster is checking your work. Approved: accepted and paid. Rejected: declined by the poster." />
      </div>

      {createdTasks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 className="mt-sec">Jobs you posted</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {createdTasks.map(t => (
              <div key={t.id} onClick={() => navigate('/tasks/' + t.id + '/submissions')} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                cursor: 'pointer', transition: 'all .2s',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <i className="ti ti-checklist" style={{color:'var(--on-accent)',fontSize:16}} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    {t._count?.submissions || 0} submissions<InfoBtn text="How many workers have applied to this task so far." /> · {t.status} · {fmtCurrency(t.currency || 'NGN', Number(t.reward || 0))}
                  </div>
                </div>
                <span style={{
                  padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700,
                  background: t.status === 'OPEN' ? 'rgba(22,163,74,0.12)' : 'rgba(245,158,11,0.12)',
                  color: t.status === 'OPEN' ? 'var(--green)' : '#f59e0b',
                }}>
                  {t.status === 'OPEN' ? 'Open' : t.status === 'CLOSED' ? 'Closed' : t.status}
                </span>
                <i className="ti ti-chevron-right" style={{color:'var(--text3)',fontSize:14}} />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <h3 className="mt-sec">Jobs you took</h3>

      {failed && submissions.length === 0 ? (
        <LoadError what="your tasks" onRetry={() => { setLoading(true); fetchData() }} />
      ) : loading ? (
        <div className="ui-sk" style={{ height: 200 }} />
      ) : filtered.length === 0 ? (
        <div className="ui-empty">
          <strong>{tab === 'all' ? 'No jobs taken yet' : 'Nothing here'}</strong>
          {tab === 'all' ? 'Take a job, send your proof and get paid to your wallet.' : 'No jobs match this filter.'}
          {tab === 'all' && <div style={{ marginTop: 14 }}><button type="button" className="ui-btn ui-btn-dark" onClick={() => navigate('/tasks')}>Find jobs</button></div>}
        </div>
      ) : (
        <ul className="ui-card mt-list">
          {(filtered || []).map((s: any) => {
            // Contest results: a win, an entry that didn't place once winners are
            // paid, a slot never sent, or an entry waiting for the winners
            const unsent = unsentContest(s)
            const out = unsent || s.contestResult === 'NOT_PLACED'
            const status = s.contestResult === 'WON' ? 'Won' : unsent ? 'Not sent' : out ? "Didn't place"
              : s.isContest && s.status === 'SUBMITTED' ? 'Entered' : STATUS_MAP[s.status] || s.status
            const color = out ? 'var(--text3)' : COLOR_MAP[s.status] || 'var(--accent)'
            // What was really paid. A contest's reward is its 1st prize, so until
            // a place is won it's "Up to" that, not what this entry will get.
            const shownAmount = Number(s.paidAmount ?? s.task?.reward ?? 0)
            const upTo = !!s.isContest && s.contestResult !== 'WON'
            return (
              <li key={s.id}>
                <button type="button" className="mt-item" onClick={() => { const tid = s.task?.id || s.taskId; if (tid) navigate('/tasks/' + tid) }}>
                  <span className="mt-icon" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                    <i className="ti ti-file-text" aria-hidden="true" />
                  </span>
                  <span className="mt-info">
                    <span className="mt-title">{s.task?.title || 'Task'}</span>
                    <span className="mt-meta">{timeAgo(s.createdAt)}</span>
                  </span>
                  <span className="mt-right">
                    {!out && <span className="mt-reward">{upTo ? 'Up to ' : ''}{fmtCurrency(s.task?.currency || 'NGN', shownAmount)}</span>}
                    <span className="mt-status" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>{status}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}
