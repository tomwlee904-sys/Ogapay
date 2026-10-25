import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
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

  const load = () => apiRequest<Claim[]>('/scores/admin/rank-claims').then((d) => setList(Array.isArray(d) ? d : [])).catch(() => setList([]))
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

  return (
    <Layout>
      <style>{`
        .ar{max-width:860px;margin:0 auto;padding:24px var(--gutter) 60px;display:grid;gap:14px}
        .ar-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;display:grid;gap:12px}
        .ar-who{display:flex;gap:12px;align-items:center}
        .ar-who img,.ar-who .ph{width:40px;height:40px;border-radius:50%;object-fit:cover;background:var(--bg2);display:grid;place-items:center;font-weight:600}
        .ar-who b{display:block}
        .ar-who small{color:var(--text2);font-size:12.5px}
        .ar-stats{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:13px;color:var(--text2)}
        .ar-stats b{color:var(--text);font-weight:600}
        .ar-reasons{margin:0;padding-left:18px;list-style:disc;font-size:13.5px;color:#b45309}
        .ar-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .ar-row input{flex:1;min-width:200px}
      `}</style>
      <div className="ar">
        <div>
          <h1 className="ui-title" style={{ margin: 0 }}>Rank claims</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text2)' }}>People who qualified for a new rank but whose account had warning signs. Clean accounts get their rank straight away and don't show here.</p>
        </div>
        {list === null ? <div className="ui-sk" style={{ height: 160, borderRadius: 16 }} /> : list.length === 0 ? (
          <div className="ar-card" style={{ color: 'var(--text2)', fontSize: 14 }}>Nothing to review.</div>
        ) : list.map((c) => {
          const wp = c.user.workerProfile
          const decided = (wp?.tasksCompleted || 0) + (wp?.tasksRejected || 0)
          return (
            <section className="ar-card" key={c.id} aria-label={`Claim by @${c.user.username}`}>
              <div className="ar-who">
                {c.user.avatarUrl ? <img src={sized(c.user.avatarUrl, 40, true)} alt="" /> : <span className="ph">{(c.user.firstName || c.user.username || '?')[0].toUpperCase()}</span>}
                <div style={{ minWidth: 0 }}>
                  <b><Link to={`/user/${c.user.username}`} style={{ color: 'inherit' }}>@{c.user.username}</Link>: {c.fromLevelName} → {c.toLevelName}</b>
                  <small>Claimed {ago(c.createdAt)} · joined {ago(c.user.createdAt)}</small>
                </div>
              </div>
              <div className="ar-stats">
                <span><b>{wp?.tasksCompleted ?? 0}</b> jobs done</span>
                <span><b>{wp?.tasksRejected ?? 0}</b> rejected{decided ? ` (${Math.round(((wp?.tasksRejected || 0) / decided) * 100)}%)` : ''}</span>
                <span><b>{Number(wp?.avgRating || 0).toFixed(1)}★</b> from {wp?.totalRatings ?? 0} ratings</span>
              </div>
              <ul className="ar-reasons">{c.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              <div className="ar-row">
                <input className="ui-input" placeholder="Reason, if you reject (they see it)" value={notes[c.id] || ''} onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} maxLength={300} aria-label={`Reason for @${c.user.username}`} />
                <button className="ui-btn ui-btn-ghost" disabled={!!busy} onClick={() => act(c, 'reject')}>{busy === c.id + 'reject' ? 'Saving…' : 'Reject'}</button>
                <button className="ui-btn ui-btn-dark" disabled={!!busy} onClick={() => act(c, 'approve')}>{busy === c.id + 'approve' ? 'Saving…' : `Approve ${c.toLevelName}`}</button>
              </div>
            </section>
          )
        })}
      </div>
    </Layout>
  )
}
