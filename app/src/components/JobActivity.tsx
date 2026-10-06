import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Money from './Money'
import { apiRequest } from '../lib/api'
import { sized } from '../lib/img'

// Public submissions on a job page: who sent work, when, its status and what was
// paid (GET /tasks/:id/activity). The proof itself stays with the poster; people
// with a private profile show as "A worker".

type Item = {
  id: string; status: 'SUBMITTED' | 'APPROVED' | 'REJECTED'; submittedAt: string | null; paidAt: string | null
  place: number | null; payout: number | null; worker: { username: string; avatarUrl: string | null } | null
}
type Activity = { currency: string; counts: { submitted: number; approved: number; rejected: number }; totalPaid: number; items: Item[] }

const ago = (d: string | null) => {
  if (!d) return ''
  const m = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000))
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`
}
const STATUS: Record<Item['status'], [string, string]> = {
  SUBMITTED: ['Waiting for review', 'var(--text2)'],
  APPROVED: ['Paid', 'var(--green)'],
  REJECTED: ['Not accepted', 'var(--text3)'],
}

export default function JobActivity({ jobId, convert, isContest }: { jobId: string; convert: any; isContest?: boolean }) {
  const [data, setData] = useState<Activity | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    apiRequest<Activity>(`/tasks/${jobId}/activity`, { auth: true })
      .then((d) => { if (live) setData(d) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [jobId])

  if (failed) return null
  const total = data ? data.counts.submitted + data.counts.approved + data.counts.rejected : 0

  return (
    <section className="wjd-panel ja">
      <style>{`
        .ja{padding:20px 22px}
        .ja-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
        .ja-head b{font-size:15px;font-weight:600;color:var(--text);display:inline-flex;align-items:center;gap:8px}
        .ja-stats{display:flex;gap:14px;font-size:12.5px;color:var(--text2)}
        .ja-stats span b{color:var(--text);font-weight:600}
        .ja-list{display:grid;gap:8px}
        .ja-row{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-ctl,12px)}
        .ja-av{width:32px;height:32px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--card2);color:var(--text2);font-size:13px;font-weight:600}
        .ja-av img{width:100%;height:100%;object-fit:cover}
        .ja-who{min-width:0}
        .ja-who a,.ja-who span.n{font-size:13.5px;font-weight:600;color:var(--text);text-decoration:none}
        .ja-who a:hover{text-decoration:underline}
        .ja-who small{display:block;font-size:12px;color:var(--text3)}
        .ja-st{font-size:12.5px;font-weight:600;text-align:right;white-space:nowrap}
        .ja-empty{font-size:13.5px;color:var(--text2);margin:0}
      `}</style>
      <div className="ja-head">
        <b><i className="ti ti-list-check" /> Submissions</b>
        {data && total > 0 && (
          <div className="ja-stats">
            <span><b>{total}</b> sent</span>
            <span><b>{data.counts.approved}</b> paid</span>
            {data.totalPaid > 0 && <span>Paid out <Money amount={data.totalPaid} currency={data.currency} convert={convert} size={12.5} positive /></span>}
          </div>
        )}
      </div>
      {!data ? (
        <p className="ja-empty">Loading…</p>
      ) : total === 0 ? (
        <p className="ja-empty">{isContest ? 'No entries yet. Be the first.' : 'No work sent yet. Be the first.'}</p>
      ) : (
        <div className="ja-list">
          {data.items.map((s) => {
            const [label, color] = STATUS[s.status]
            const name = s.worker?.username
            return (
              <div key={s.id} className="ja-row">
                <span className="ja-av">{s.worker?.avatarUrl ? <img src={sized(s.worker.avatarUrl, 32, true)} alt="" loading="lazy" /> : (name || '?').charAt(0).toUpperCase()}</span>
                <span className="ja-who">
                  {name ? <Link to={`/user/${encodeURIComponent(name)}`}>@{name}</Link> : <span className="n">A worker</span>}
                  <small>{s.place ? `${s.place === 1 ? '1st' : s.place === 2 ? '2nd' : s.place === 3 ? '3rd' : `${s.place}th`} place · ` : ''}{ago(s.submittedAt)}</small>
                </span>
                <span className="ja-st" style={{ color }}>
                  {s.status === 'APPROVED' && s.payout != null
                    ? <Money amount={s.payout} currency={data.currency} convert={convert} size={13} positive />
                    : label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
