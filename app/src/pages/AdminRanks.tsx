import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell, { AdminEmpty, AdminRefresh, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'
import { sized } from '../lib/img'

/* Admin: rank claims waiting for review (backend services/rank.service.js).
   Clean accounts get their new rank at once; these had warning signs (reasons). */

type Claim = {
  id: string; fromLevelName: string; toLevelName: string; reasons: string[]; createdAt: string
  user: { id: string; username: string; firstName?: string; lastName?: string; avatarUrl?: string | null; createdAt: string
    workerProfile?: { tasksCompleted: number; tasksRejected: number; avgRating: number; totalRatings: number } | null }
}

const ago = (d: string) => { const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return days < 1 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago` }

export default function AdminRanks() {
  const { toast } = useToast()
  const [list, setList] = useState<Claim[] | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  // Approve and Reject each ask first; Reject needs a reason they will see
  const [mode, setMode] = useState<Record<string, 'approve' | 'reject' | undefined>>({})

  const load = () => {
    setLoading(true); setFailed(false)
    return apiRequest<Claim[]>('/scores/admin/rank-claims')
      .then((d) => { setList(Array.isArray(d) ? d : []); setCheckedAt(new Date()) })
      .catch(() => { setList(null); setFailed(true) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const act = async (c: Claim, action: 'approve' | 'reject') => {
    const note = (notes[c.id] || '').trim()
    if (action === 'reject' && note.length < 5) { toast('Write a short reason for them first', 'error'); return }
    setBusy(c.id + action)
    try {
      await apiRequest(`/scores/admin/rank-claims/${c.id}`, { method: 'PATCH', body: JSON.stringify({ action, ...(note && { note }) }) })
      toast(action === 'approve' ? `@${c.user.username} is now ${c.toLevelName}` : 'Claim rejected. They can try again in 7 days.', 'success')
      load()
    } catch (e: any) { toast(e?.message || "Couldn't save", 'error') }
    setBusy('')
  }

  const cancel = (id: string) => { setMode((m) => ({ ...m, [id]: undefined })); setNotes((n) => ({ ...n, [id]: '' })) }

  return (
    <AdminShell
      section="ranks"
      title="Rank claims"
      sub="Rank-ups from accounts with warning signs. Clean accounts get their rank straight away."
      actions={<AdminRefresh onClick={load} loading={loading} />}
    >
      <style>{`
        .ar-who{display:flex;gap:12px;align-items:center}
        .ar-who img,.ar-who .ph{width:40px;height:40px;border-radius:50%;object-fit:cover;background:var(--card2);display:grid;place-items:center;font-weight:600;flex-shrink:0}
        .ar-who b{display:block;font-weight:600;overflow-wrap:anywhere}
        .ar-who small{color:var(--text2);font-size:12.5px}
        .ar-stats{display:flex;flex-wrap:wrap;gap:6px}
        .ar-stats b{color:var(--text);font-weight:600}
        .ar-reasons{margin:0;padding-left:18px;list-style:disc;font-size:13.5px;line-height:1.5;color:var(--text)}
      `}</style>
      {failed ? <LoadError what="rank claims" onRetry={load} />
        : list === null ? <AdminSkeleton rows={2} height={180} />
        : list.length === 0 ? <AdminEmpty done title="Nothing to review" at={checkedAt}>All caught up.</AdminEmpty>
        : (
          <div className="adm-list">
            {list.map((c) => {
              const wp = c.user.workerProfile
              const decided = (wp?.tasksCompleted || 0) + (wp?.tasksRejected || 0)
              const m = mode[c.id]
              return (
                <section className="adm-row ui-card" key={c.id} aria-label={`Claim by @${c.user.username}`}>
                  <div className="ar-who">
                    {c.user.avatarUrl ? <img src={sized(c.user.avatarUrl, 40, true)} alt="" /> : <span className="ph">{(c.user.firstName || c.user.username || '?')[0].toUpperCase()}</span>}
                    <div style={{ minWidth: 0 }}>
                      <b><Link to={`/user/${c.user.username}`} style={{ color: 'inherit' }}>@{c.user.username}</Link>: {c.fromLevelName} → {c.toLevelName}</b>
                      <small>Claimed {ago(c.createdAt)} · joined {ago(c.user.createdAt)}</small>
                    </div>
                  </div>
                  <div className="ar-stats">
                    <span className="adm-pill"><b>{wp?.tasksCompleted ?? 0}</b> jobs done</span>
                    <span className="adm-pill"><b>{wp?.tasksRejected ?? 0}</b> rejected{decided ? ` (${Math.round(((wp?.tasksRejected || 0) / decided) * 100)}%)` : ''}</span>
                    <span className="adm-pill"><b>{Number(wp?.avgRating || 0).toFixed(1)}★</b> from {wp?.totalRatings ?? 0} ratings</span>
                  </div>
                  <div className="adm-callout warn"><i className="ti ti-alert-triangle" aria-hidden="true" /><div><b>Why it's here</b><ul className="ar-reasons">{c.reasons.map((r) => <li key={r}>{r}</li>)}</ul></div></div>
                  {!m ? (
                    <div className="adm-actions">
                      <button type="button" className="ui-btn ui-btn-dark" disabled={!!busy} onClick={() => setMode((x) => ({ ...x, [c.id]: 'approve' }))}><i className="ti ti-check" aria-hidden="true" /> Approve</button>
                      <button type="button" className="ui-btn ui-btn-ghost" disabled={!!busy} onClick={() => setMode((x) => ({ ...x, [c.id]: 'reject' }))}><i className="ti ti-x" aria-hidden="true" /> Reject</button>
                    </div>
                  ) : (
                    <div className="adm-confirm">
                      {m === 'approve' ? (
                        <p>Move <b>@{c.user.username}</b> from {c.fromLevelName} to <b>{c.toLevelName}</b>?</p>
                      ) : (
                        <>
                          <label htmlFor={`ar-n-${c.id}`}>Reason (they see this)</label>
                          <textarea id={`ar-n-${c.id}`} className="ui-input" rows={2} placeholder="e.g. Too many rejected jobs this month" value={notes[c.id] || ''} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} maxLength={300} />
                        </>
                      )}
                      <div className="adm-actions">
                        <button type="button" className={`ui-btn ${m === 'approve' ? 'ui-btn-dark' : 'adm-danger'}`} disabled={!!busy} onClick={() => act(c, m)}>
                          {busy === c.id + m ? 'Saving…' : m === 'approve' ? `Confirm ${c.toLevelName}` : 'Confirm reject'}
                        </button>
                        <button type="button" className="ui-btn ui-btn-ghost" disabled={!!busy} onClick={() => cancel(c.id)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
    </AdminShell>
  )
}
