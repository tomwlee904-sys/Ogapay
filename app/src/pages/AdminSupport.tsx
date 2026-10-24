import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell, { AdminEmpty, AdminRefresh, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'

// Admin: support tickets and user reports (there was no screen for them).
// Priority Support holders' tickets come first. Replies go by email.

type Ticket = {
  id: string; subject?: string | null; category: string; description: string
  targetType?: string | null; targetId?: string | null; email?: string | null
  status: string; adminNotes?: string | null; createdAt: string; priority?: boolean
  user?: { id: string; firstName?: string; lastName?: string; email?: string } | null
  // Files sent with a support message, and who a "Report this user" is about
  attachments?: string[]
  reportedUser?: { id: string; username: string; firstName?: string; lastName?: string } | null
}
const STATUSES = [['open', 'Open'], ['in_review', 'In review'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']] as const
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const TARGET_LINK: Record<string, (id: string) => string> = { task: (id) => `/tasks/${id}`, store: (id) => `/store/${id}`, user: (id) => `/user/${id}` }

export default function AdminSupport() {
  const [status, setStatus] = useState<(typeof STATUSES)[number][0]>('open')
  const [items, setItems] = useState<Ticket[] | null>(null)
  const [err, setErr] = useState('')
  const [failed, setFailed] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')

  const load = useCallback(() => {
    setItems(null); setErr(''); setFailed(false)
    apiRequest<Ticket[]>(`/reports/admin?status=${status}`)
      .then((l) => setItems(Array.isArray(l) ? l : []))
      .catch(() => { setFailed(true) })
  }, [status])
  useEffect(() => { load() }, [load])

  const move = async (t: Ticket, to: string) => {
    setBusy(t.id)
    try {
      await apiRequest(`/reports/admin/${t.id}/review`, { method: 'PATCH', body: JSON.stringify({ status: to, adminNotes: notes[t.id] ?? t.adminNotes ?? undefined }) })
      setItems((l) => (l || []).filter((x) => x.id !== t.id))
    } catch (e: any) { setErr(e?.message || 'That didn’t work') }
    setBusy('')
  }

  return (
    <AdminShell
      section="support"
      title="Support and reports"
      sub="Help centre tickets and reports. Priority Support tickets come first."
      how={<p>Tickets from the help centre and reports on jobs, store items and people. Reply by email, then resolve. Internal notes are only seen by admins.</p>}
      actions={<AdminRefresh onClick={load} loading={items === null && !failed} />}
    >
        <div className="adm-tabs" role="tablist" aria-label="Ticket status">
          {STATUSES.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={status === k} onClick={() => setStatus(k)}>{l}{status === k && items && <em>{items.length}</em>}</button>)}
        </div>
        {err && <div className="adm-msg bad" role="alert"><span>{err}</span><button type="button" onClick={() => setErr('')} aria-label="Dismiss"><i className="ti ti-x" aria-hidden="true" /></button></div>}

        {failed ? (
          <LoadError what="tickets" onRetry={load} />
        ) : items === null ? (
          <AdminSkeleton />
        ) : items.length === 0 ? (
          <AdminEmpty done={status === 'open'} title={`Nothing ${STATUSES.find(([k]) => k === status)?.[1].toLowerCase()} right now`} />
        ) : (
          <div className="adm-list">
            {items.map((t) => {
              const who = [t.user?.firstName, t.user?.lastName].filter(Boolean).join(' ') || 'A user'
              const reply = t.email || t.user?.email
              const target = t.targetType === 'user' && t.reportedUser ? `/user/${t.reportedUser.username}` : t.targetType && t.targetId && TARGET_LINK[t.targetType]?.(t.targetId)
              return (
                <article key={t.id} className="ui-card ui-card-pad">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                    {t.priority && <span className="oga-prem" style={{ marginLeft: 0 }}><i className="ti ti-bolt" />Priority</span>}
                    <span className="adm-pill">{t.targetType === 'support' ? 'Ticket' : `Report: ${t.targetType || 'other'}`}</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{t.category} · {when(t.createdAt)}</span>
                  </div>
                  <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{t.subject || t.category}</h2>
                  <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{t.description}</p>
                  {t.reportedUser && <p style={{ margin: '0 0 8px', fontSize: 13 }}>About <Link to={`/user/${t.reportedUser.username}`} style={{ color: 'var(--text)', fontWeight: 600 }}>@{t.reportedUser.username}</Link></p>}
                  {!!t.attachments?.length && (
                    <p style={{ margin: '0 0 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {t.attachments.map((u, i) => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow" className="ui-chip" style={{ minHeight: 36 }}><i className="ti ti-paperclip" /> File {i + 1}</a>
                      ))}
                    </p>
                  )}
                  <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text2)' }}>
                    From {who}{reply && <> · <a href={`mailto:${reply}?subject=${encodeURIComponent('Re: ' + (t.subject || t.category))}`} style={{ color: 'var(--text)', fontWeight: 600 }}>{reply}</a></>}
                    {target && <> · <Link to={target} style={{ color: 'var(--text)', fontWeight: 600 }}>Open what was reported</Link></>}
                  </p>
                  <details className="as-notes" open={!!t.adminNotes || undefined}>
                    <summary>{t.adminNotes ? 'Internal notes' : 'Add a note'}</summary>
                    <label className="ui-label" htmlFor={`n-${t.id}`} style={{ marginTop: 8 }}>Internal notes (admins only)</label>
                    <textarea id={`n-${t.id}`} className="ui-input" rows={3} maxLength={2000} value={notes[t.id] ?? t.adminNotes ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))} />
                  </details>
                  <div className="adm-actions" style={{ marginTop: 10 }}>
                    {status !== 'resolved' && <button type="button" className="ui-btn ui-btn-dark" disabled={busy === t.id} onClick={() => move(t, 'resolved')}>Resolve</button>}
                    {status === 'open' && <button type="button" className="ui-btn ui-btn-ghost" disabled={busy === t.id} onClick={() => move(t, 'in_review')}>Mark in review</button>}
                    {status !== 'dismissed' && status !== 'resolved' && <button type="button" className="ui-btn ui-btn-ghost" disabled={busy === t.id} onClick={() => move(t, 'dismissed')}>Dismiss</button>}
                    {(status === 'resolved' || status === 'dismissed') && <button type="button" className="ui-btn ui-btn-ghost" disabled={busy === t.id} onClick={() => move(t, 'open')}>Reopen</button>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      <style>{`
        .as-notes summary{display:inline-flex;align-items:center;min-height:36px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text)}
      `}</style>
    </AdminShell>
  )
}
