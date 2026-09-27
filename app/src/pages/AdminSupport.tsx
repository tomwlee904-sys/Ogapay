import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

// Admin: support tickets and user reports (there was no screen for them).
// Priority Support holders' tickets come first. Replies go by email.

type Ticket = {
  id: string; subject?: string | null; category: string; description: string
  targetType?: string | null; targetId?: string | null; email?: string | null
  status: string; adminNotes?: string | null; createdAt: string; priority?: boolean
  user?: { id: string; firstName?: string; lastName?: string; email?: string } | null
}
const STATUSES = [['open', 'Open'], ['in_review', 'In review'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']] as const
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const TARGET_LINK: Record<string, (id: string) => string> = { task: (id) => `/tasks/${id}`, store: (id) => `/store/${id}`, user: (id) => `/user/${id}` }

export default function AdminSupport() {
  const [status, setStatus] = useState<(typeof STATUSES)[number][0]>('open')
  const [items, setItems] = useState<Ticket[] | null>(null)
  const [err, setErr] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')

  const load = useCallback(() => {
    setItems(null); setErr('')
    apiRequest<Ticket[]>(`/reports/admin?status=${status}`)
      .then((l) => setItems(Array.isArray(l) ? l : []))
      .catch((e) => { setErr(e?.message || "Couldn't load tickets"); setItems([]) })
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
    <Layout>
      <div className="ui-page">
        <Link to="/admin" className="ui-eyebrow" style={{ textDecoration: 'none' }}><i className="ti ti-arrow-left" /> Admin</Link>
        <h1 className="ui-title">Support and reports</h1>
        <p className="ui-sub">Tickets from the help centre and reports on jobs, store items and people. Priority Support tickets are listed first. Reply by email, then resolve.</p>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '20px 0 16px' }}>
          {STATUSES.map(([k, l]) => <button key={k} type="button" className={`ui-chip${status === k ? ' on' : ''}`} aria-pressed={status === k} onClick={() => setStatus(k)}>{l}</button>)}
        </div>
        {err && <p role="alert" style={{ color: 'var(--red)', fontSize: 13 }}>{err}</p>}

        {items === null ? (
          <div style={{ display: 'grid', gap: 10 }}>{[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 120 }} />)}</div>
        ) : items.length === 0 ? (
          <div className="ui-empty">Nothing {STATUSES.find(([k]) => k === status)?.[1].toLowerCase()} right now.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map((t) => {
              const who = [t.user?.firstName, t.user?.lastName].filter(Boolean).join(' ') || 'A user'
              const reply = t.email || t.user?.email
              const target = t.targetType && t.targetId && TARGET_LINK[t.targetType]?.(t.targetId)
              return (
                <article key={t.id} className="ui-card ui-card-pad">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                    {t.priority && <span className="oga-prem" style={{ marginLeft: 0 }}><i className="ti ti-bolt" />Priority</span>}
                    <span className="ui-chip" style={{ height: 24, cursor: 'default' }}>{t.targetType === 'support' ? 'Ticket' : `Report: ${t.targetType || 'other'}`}</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>{t.category} · {when(t.createdAt)}</span>
                  </div>
                  <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{t.subject || t.category}</h2>
                  <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{t.description}</p>
                  <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text2)' }}>
                    From {who}{reply && <> · <a href={`mailto:${reply}?subject=${encodeURIComponent('Re: ' + (t.subject || t.category))}`} style={{ color: 'var(--text)', fontWeight: 600 }}>{reply}</a></>}
                    {target && <> · <Link to={target} style={{ color: 'var(--text)', fontWeight: 600 }}>Open what was reported</Link></>}
                  </p>
                  <label className="ui-label" htmlFor={`n-${t.id}`}>Internal notes</label>
                  <textarea id={`n-${t.id}`} className="ui-input" style={{ height: 64, padding: 10, resize: 'vertical' }} maxLength={2000} value={notes[t.id] ?? t.adminNotes ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))} />
                  <div className="ui-actions" style={{ marginTop: 10 }}>
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
      </div>
    </Layout>
  )
}
