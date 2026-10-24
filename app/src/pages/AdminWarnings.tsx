import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AdminShell, { AdminEmpty, AdminRefresh, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'

/* Admin: rule warnings (backend services/warning.service.js). Warn a member,
   read appeals and answer them (keep the warning with a reply, or withdraw it:
   a rank it took comes back, and a suspension lifts once fewer than 3 count)
   and lift a suspension. Warnings from the moderation queue show here too. */

type Person = { id: string; username: string; firstName?: string; lastName?: string; levelName: string; jobsSuspendedAt: string | null }
type Warning = {
  id: string; reason: string; reasonLabel: string; note: string | null; taskId: string | null; submissionId: string | null
  outcome: 'WARNING' | 'RANK_DOWN' | 'SUSPENDED'; fromLevelName: string | null; toLevelName: string | null
  appealNote: string | null; appealedAt: string | null; withdrawnAt: string | null; withdrawNote: string | null
  appealDecidedAt?: string | null; appealReply?: string | null
  createdAt: string; user: Person; issuedBy: string | null
}
type Data = { warnings: Warning[]; suspended: (Person & { recentWarnings: number })[]; reasons: { code: string; label: string; rule: string }[] }

const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const RESULT: Record<string, string> = { WARNING: 'Warning', RANK_DOWN: 'Rank down', SUSPENDED: 'Suspended' }

export default function AdminWarnings() {
  const { toast } = useToast()
  const [params] = useSearchParams()
  // Appeals first: opens on Appeals, and moves to All only when none are waiting
  const [view, setView] = useState<'all' | 'appeals'>('appeals')
  const autoView = useRef(true)
  const [appeals, setAppeals] = useState<number | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [who, setWho] = useState(params.get('warn') || '')
  // No reason until one is picked (the list comes with the page data)
  const [reason, setReason] = useState('')
  const [why, setWhy] = useState('')
  const [formOpen, setFormOpen] = useState(!!params.get('warn'))
  const formRef = useRef<HTMLElement>(null)

  const load = (v = view) => {
    setLoading(true); setFailed(false)
    return apiRequest<Data>(`/warnings/admin?view=${v}`)
      .then((d) => {
        if (v === 'appeals') setAppeals(d.warnings.length)
        if (v === 'appeals' && autoView.current && d.warnings.length === 0) { autoView.current = false; setView('all'); return }
        autoView.current = false
        setData(d)
      })
      .catch(() => { setData(null); setFailed(true) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load(view) }, [view])
  useEffect(() => { if (params.get('warn')) setTimeout(() => formRef.current?.scrollIntoView({ block: 'start' }), 300) }, [])
  const pickView = (v: 'all' | 'appeals') => { autoView.current = false; setView(v) }
  const openForm = () => { setFormOpen(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0) }

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key)
    try { await fn(); toast(done, 'success'); if (view !== 'appeals') setAppeals(null); load() } catch (e: any) { toast(e?.message || "Couldn't save", 'error') }
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
  const keep = (w: Warning) => { const note = needNote(w.id); if (note) run(w.id, () => apiRequest(`/warnings/admin/${w.id}/appeal/decline`, { method: 'POST', body: JSON.stringify({ note }) }), 'Reply sent. The warning stays.') }
  const lift = (p: Person) => { const note = needNote(p.id); if (note) run(p.id, () => apiRequest(`/warnings/admin/users/${p.id}/lift`, { method: 'POST', body: JSON.stringify({ note }) }), `@${p.username} can take jobs again`) }

  const rule = data?.reasons.find((r) => r.code === reason)
  const noReasons = !data?.reasons?.length

  return (
    <AdminShell
      section="warnings"
      title="Warnings"
      sub="A 2nd warning in 30 days lowers a rank; a 3rd stops new jobs until you lift it."
      how={<p>Members see the reason and can appeal. Be fair: say what you saw. Withdrawing a warning gives back a rank it took, and lifts a suspension once fewer than 3 count.</p>}
      actions={<>
        <button type="button" className="ui-btn ui-btn-ghost wn-warn-btn" onClick={openForm}><i className="ti ti-alert-triangle" aria-hidden="true" /> Warn</button>
        <AdminRefresh onClick={() => load()} loading={loading} />
      </>}
    >
      <style>{`
        .wn-item{border-top:1px solid var(--border);padding-top:12px;display:grid;gap:8px;font-size:14px;min-width:0}
        .wn-item:first-of-type{border-top:0;padding-top:0}
        .wn-item p{margin:0;color:var(--text2);line-height:1.5;overflow-wrap:anywhere}
        .wn-item p b{color:var(--text);font-weight:600}
        .adm .wn-item textarea.ui-input{min-height:64px}
        .wn-tag{margin-left:6px}
        .wn-card .adm-tabs{margin:0}
        @media (min-width:1024px){.wn-warn-btn,.wn-form-toggle{display:none}}
        @media (max-width:1023.98px){.wn-form:not(.open) .wn-form-body{display:none}}
      `}</style>
      {failed ? <LoadError what="warnings" onRetry={() => load()} /> : (
        <div className="ui-split">
          <div className="adm-stack">
            <section className="ui-card adm-card wn-card" aria-label={view === 'appeals' ? 'Appeals' : 'All warnings'}>
              <div className="adm-tabs even" role="tablist" aria-label="Warnings">
                <button type="button" role="tab" aria-selected={view === 'appeals'} onClick={() => pickView('appeals')}>Appeals{appeals != null && <em>{appeals}</em>}</button>
                <button type="button" role="tab" aria-selected={view === 'all'} onClick={() => pickView('all')}>All warnings</button>
              </div>
              {!data ? <AdminSkeleton rows={2} height={100} /> : data.warnings.length === 0 ? (
                <AdminEmpty compact done={view === 'appeals'} title={view === 'appeals' ? 'No appeals waiting' : 'No warnings yet'} />
              ) : data.warnings.map((w) => (
                <div className="wn-item" key={w.id}>
                  <div>
                    <b><Link to={`/user/${w.user.username}`} style={{ color: 'inherit' }}>@{w.user.username}</Link></b>: {w.reasonLabel}
                    <span className={`adm-pill wn-tag${w.withdrawnAt ? '' : w.outcome === 'RANK_DOWN' ? ' warn' : w.outcome === 'SUSPENDED' ? ' bad' : ''}`}>{w.withdrawnAt ? 'Withdrawn' : RESULT[w.outcome]}</span>
                  </div>
                  <p>{day(w.createdAt)} by @{w.issuedBy || 'admin'}{w.outcome === 'RANK_DOWN' ? ` · ${w.fromLevelName} to ${w.toLevelName}` : ''}{w.taskId ? <> · <Link to={`/tasks/${w.taskId}`}>job</Link></> : null}</p>
                  {w.note && <p><b>Note:</b> {w.note}</p>}
                  {w.appealNote && <p><b>Their appeal ({day(w.appealedAt!)}):</b> {w.appealNote}</p>}
                  {w.appealReply && <p><b>Your reply (warning kept{w.appealDecidedAt ? `, ${day(w.appealDecidedAt)}` : ''}):</b> {w.appealReply}</p>}
                  {w.withdrawNote && <p><b>Withdrawn:</b> {w.withdrawNote}</p>}
                  {!w.withdrawnAt && (
                    <>
                      <textarea className="ui-input" rows={2} placeholder={w.appealedAt && !w.appealDecidedAt ? 'Your reply to the appeal (they see this)' : 'Why you are withdrawing it (they see this)'} value={notes[w.id] || ''} onChange={(e) => setNotes({ ...notes, [w.id]: e.target.value })} maxLength={300} aria-label={`Note for the warning to @${w.user.username}`} />
                      <div className="adm-actions">
                        {w.appealedAt && !w.appealDecidedAt && <button type="button" className="ui-btn ui-btn-dark" onClick={() => keep(w)} disabled={!!busy}>{busy === w.id ? 'Saving…' : 'Keep warning'}</button>}
                        <button type="button" className="ui-btn ui-btn-ghost" onClick={() => withdraw(w)} disabled={!!busy}>{busy === w.id ? 'Saving…' : 'Withdraw warning'}</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </section>

            <section className="ui-card adm-card" aria-label="Members who can't take jobs">
              <h2 className="adm-card-title">Can't take new jobs{data && <em>{data.suspended.length}</em>}</h2>
              {!data ? <div className="ui-sk" style={{ height: 60 }} /> : data.suspended.length === 0 ? <p style={{ margin: 0, color: 'var(--text2)', fontSize: 14 }}>Nobody is suspended.</p> : data.suspended.map((p) => (
                <div className="wn-item" key={p.id}>
                  <p><b><Link to={`/user/${p.username}`} style={{ color: 'inherit' }}>@{p.username}</Link></b> · {p.levelName} · since {day(p.jobsSuspendedAt!)} · {p.recentWarnings} warnings in 30 days</p>
                  <textarea className="ui-input" rows={2} placeholder="Note to them (for example: reviewed, please keep to the rules)" value={notes[p.id] || ''} onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} maxLength={300} aria-label={`Note for @${p.username}`} />
                  <div className="adm-actions"><button type="button" className="ui-btn ui-btn-dark" onClick={() => lift(p)} disabled={!!busy}>{busy === p.id ? 'Saving…' : 'Lift suspension'}</button></div>
                </div>
              ))}
            </section>
          </div>

          <aside className="ui-split-side">
            <section ref={formRef} className={`ui-card adm-card wn-form${formOpen ? ' open' : ''}`} aria-label="Warn a member" style={{ scrollMarginTop: 'calc(var(--nav-h) + 16px)' }}>
              <div className="adm-card-head">
                <h2 className="adm-card-title">Warn a member</h2>
                <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm wn-form-toggle" aria-expanded={formOpen} onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'Close' : 'Open'}</button>
              </div>
              <div className="wn-form-body adm-fields">
                <div className="adm-field">
                  <label className="ui-label" htmlFor="aw-who">Username</label>
                  <input id="aw-who" className="ui-input" value={who} onChange={(e) => setWho(e.target.value)} placeholder="@username" />
                </div>
                <div className="adm-field">
                  <label className="ui-label" htmlFor="aw-reason">Reason</label>
                  <select id="aw-reason" className="ui-select" value={reason} onChange={(e) => setReason(e.target.value)} disabled={noReasons}>
                    <option value="" disabled>{noReasons ? 'Loading reasons…' : 'Choose a reason'}</option>
                    {(data?.reasons || []).map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                  </select>
                  {rule && <p className="ui-hint" style={{ margin: 0 }}>They will read: {rule.rule}</p>}
                </div>
                <div className="adm-field">
                  <label className="ui-label" htmlFor="aw-why">What you saw (they see this)</label>
                  <textarea id="aw-why" className="ui-input" rows={3} value={why} onChange={(e) => setWhy(e.target.value)} maxLength={500} placeholder="For example: the same screenshot was sent to 4 jobs" />
                  <span className="adm-count">{why.length}/500</span>
                </div>
                <button type="button" className="ui-btn ui-btn-dark" onClick={warn} disabled={busy === 'warn' || !rule}>{busy === 'warn' ? 'Sending…' : 'Send warning'}</button>
              </div>
            </section>
          </aside>
        </div>
      )}
    </AdminShell>
  )
}
