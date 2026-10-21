import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'

/* Admin: rule warnings (backend services/warning.service.js). Warn a member,
   read appeals, withdraw a warning (a rank it took comes back) and lift a
   suspension. Warnings from the moderation queue show here too. */

type Person = { id: string; username: string; firstName?: string; lastName?: string; levelName: string; jobsSuspendedAt: string | null }
type Warning = {
  id: string; reason: string; reasonLabel: string; note: string | null; taskId: string | null; submissionId: string | null
  outcome: 'WARNING' | 'RANK_DOWN' | 'SUSPENDED'; fromLevelName: string | null; toLevelName: string | null
  appealNote: string | null; appealedAt: string | null; withdrawnAt: string | null; withdrawNote: string | null
  createdAt: string; user: Person; issuedBy: string | null
}
type Data = { warnings: Warning[]; suspended: (Person & { recentWarnings: number })[]; reasons: { code: string; label: string; rule: string }[] }

const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const RESULT: Record<string, string> = { WARNING: 'Warning', RANK_DOWN: 'Rank down', SUSPENDED: 'Suspended' }

export default function AdminWarnings() {
  const { toast } = useToast()
  const [params] = useSearchParams()
  const [view, setView] = useState<'all' | 'appeals'>('all')
  const [data, setData] = useState<Data | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [who, setWho] = useState(params.get('warn') || '')
  const [reason, setReason] = useState('SPAM')
  const [why, setWhy] = useState('')

  const load = (v = view) => apiRequest<Data>(`/warnings/admin?view=${v}`).then(setData).catch(() => setData({ warnings: [], suspended: [], reasons: [] }))
  useEffect(() => { load(view) }, [view])

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key)
    try { await fn(); toast(done, 'success'); load() } catch (e: any) { toast(e?.message || "Couldn't save", 'error') }
    setBusy('')
  }

  const warn = () => {
    const name = who.trim().replace(/^@/, '')
    if (!name) { toast('Type the username to warn', 'error'); return }
    if (why.trim().length < 5) { toast('Say what you saw (they read it)', 'error'); return }
    if (!window.confirm(`Warn @${name} for "${data?.reasons.find((r) => r.code === reason)?.label}"? A 2nd warning in 30 days lowers their rank; a 3rd stops new jobs.`)) return
    run('warn', () => apiRequest(`/warnings/admin/users/${encodeURIComponent(name)}`, { method: 'POST', body: JSON.stringify({ reason, note: why.trim() }) }).then(() => { setWhy('') }), `@${name} was warned`)
  }
  const needNote = (key: string) => { const n = (notes[key] || '').trim(); if (n.length < 5) { toast('Write a short note first (they see it)', 'error'); return null } return n }
  const withdraw = (w: Warning) => { const note = needNote(w.id); if (note) run(w.id, () => apiRequest(`/warnings/admin/${w.id}/withdraw`, { method: 'POST', body: JSON.stringify({ note }) }), 'Warning withdrawn') }
  const lift = (p: Person) => { const note = needNote(p.id); if (note) run(p.id, () => apiRequest(`/warnings/admin/users/${p.id}/lift`, { method: 'POST', body: JSON.stringify({ note }) }), `@${p.username} can take jobs again`) }

  return (
    <Layout>
      <style>{`
        .aw{max-width:900px;margin:0 auto;padding:24px var(--gutter) 60px;display:grid;gap:14px}
        .aw-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;display:grid;gap:10px}
        .aw-card h2{margin:0;font-size:16px}
        .aw-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media(max-width:640px){.aw-grid{grid-template-columns:1fr}}
        .aw-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .aw-row input{flex:1;min-width:180px}
        .aw-item{border-top:1px solid var(--border);padding-top:12px;display:grid;gap:6px;font-size:14px}
        .aw-item:first-of-type{border-top:0;padding-top:0}
        .aw-item p{margin:0;color:var(--text2);line-height:1.5}
        .aw-item p b{color:var(--text);font-weight:600}
        .aw-tag{display:inline-block;font-size:12px;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--bg2);color:var(--text2);margin-left:6px}
        .aw-tag.RANK_DOWN{background:rgba(245,158,11,.15);color:#b45309}
        .aw-tag.SUSPENDED{background:rgba(239,68,68,.12);color:var(--red)}
        .aw-tabs{display:flex;gap:8px}
      `}</style>
      <div className="aw">
        <div>
          <h1 className="ui-title" style={{ margin: 0 }}>Warnings</h1>
          <p className="ui-sub">Within 30 days a 2nd warning lowers a member's rank one step and a 3rd stops new jobs until you lift it. Members see the reason and can appeal. Be fair: say what you saw.</p>
        </div>

        <section className="aw-card" aria-label="Warn a member">
          <h2>Warn a member</h2>
          <div className="aw-grid">
            <div>
              <label className="ui-label" htmlFor="aw-who">Username</label>
              <input id="aw-who" className="ui-input" value={who} onChange={(e) => setWho(e.target.value)} placeholder="@username" />
            </div>
            <div>
              <label className="ui-label" htmlFor="aw-reason">Reason</label>
              <select id="aw-reason" className="ui-select" value={reason} onChange={(e) => setReason(e.target.value)}>
                {(data?.reasons || []).map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {data?.reasons.find((r) => r.code === reason) && <p className="ui-hint" style={{ margin: 0 }}>They will read: {data.reasons.find((r) => r.code === reason)!.rule}</p>}
          <div>
            <label className="ui-label" htmlFor="aw-why">What you saw (they see this)</label>
            <input id="aw-why" className="ui-input" value={why} onChange={(e) => setWhy(e.target.value)} maxLength={500} placeholder="For example: the same screenshot was sent to 4 jobs" />
          </div>
          <div className="ui-actions"><button className="ui-btn ui-btn-dark" onClick={warn} disabled={busy === 'warn'}>{busy === 'warn' ? 'Sending…' : 'Send warning'}</button></div>
        </section>

        <section className="aw-card" aria-label="Members who can't take jobs">
          <h2>Can't take new jobs ({data?.suspended.length ?? 0})</h2>
          {!data ? <div className="ui-sk" style={{ height: 60, borderRadius: 12 }} /> : data.suspended.length === 0 ? <p style={{ margin: 0, color: 'var(--text2)', fontSize: 14 }}>Nobody is suspended.</p> : data.suspended.map((p) => (
            <div className="aw-item" key={p.id}>
              <p><b><Link to={`/user/${p.username}`} style={{ color: 'inherit' }}>@{p.username}</Link></b> · {p.levelName} · since {day(p.jobsSuspendedAt!)} · {p.recentWarnings} warnings in 30 days</p>
              <div className="aw-row">
                <input className="ui-input" placeholder="Note to them (for example: reviewed, please keep to the rules)" value={notes[p.id] || ''} onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} maxLength={300} aria-label={`Note for @${p.username}`} />
                <button className="ui-btn ui-btn-dark" onClick={() => lift(p)} disabled={!!busy}>{busy === p.id ? 'Saving…' : 'Lift suspension'}</button>
              </div>
            </div>
          ))}
        </section>

        <div className="aw-tabs" role="tablist">
          <button role="tab" aria-selected={view === 'all'} className={`ui-btn ui-btn-sm ${view === 'all' ? 'ui-btn-dark' : 'ui-btn-ghost'}`} onClick={() => setView('all')}>All warnings</button>
          <button role="tab" aria-selected={view === 'appeals'} className={`ui-btn ui-btn-sm ${view === 'appeals' ? 'ui-btn-dark' : 'ui-btn-ghost'}`} onClick={() => setView('appeals')}>Appeals</button>
        </div>

        <section className="aw-card" aria-label={view === 'appeals' ? 'Appeals' : 'All warnings'}>
          {!data ? <div className="ui-sk" style={{ height: 120, borderRadius: 12 }} /> : data.warnings.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text2)', fontSize: 14 }}>{view === 'appeals' ? 'No appeals waiting.' : 'No warnings yet.'}</p>
          ) : data.warnings.map((w) => (
            <div className="aw-item" key={w.id}>
              <div>
                <b><Link to={`/user/${w.user.username}`} style={{ color: 'inherit' }}>@{w.user.username}</Link></b>: {w.reasonLabel}
                <span className={`aw-tag ${w.outcome}`}>{w.withdrawnAt ? 'Withdrawn' : RESULT[w.outcome]}</span>
              </div>
              <p>{day(w.createdAt)} by @{w.issuedBy || 'admin'}{w.outcome === 'RANK_DOWN' ? ` · ${w.fromLevelName} to ${w.toLevelName}` : ''}{w.taskId ? <> · <Link to={`/tasks/${w.taskId}`}>job</Link></> : null}</p>
              {w.note && <p><b>Note:</b> {w.note}</p>}
              {w.appealNote && <p><b>Their appeal ({day(w.appealedAt!)}):</b> {w.appealNote}</p>}
              {w.withdrawNote && <p><b>Withdrawn:</b> {w.withdrawNote}</p>}
              {!w.withdrawnAt && (
                <div className="aw-row">
                  <input className="ui-input" placeholder="Why you are withdrawing it (they see this)" value={notes[w.id] || ''} onChange={(e) => setNotes({ ...notes, [w.id]: e.target.value })} maxLength={300} aria-label={`Note for the warning to @${w.user.username}`} />
                  <button className="ui-btn ui-btn-ghost" onClick={() => withdraw(w)} disabled={!!busy}>{busy === w.id ? 'Saving…' : 'Withdraw warning'}</button>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </Layout>
  )
}
