import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

// Admin: support tickets and user reports (there was no screen for them).
// Priority Support holders' tickets come first. (2026-11-02) Replies are written
// here: the member sees them on their ticket and gets a notification and email.
// Resolving or dismissing needs a reply; internal notes stay with the team.

type TicketMessage = { id: string; fromTeam: boolean; body: string; attachments?: string[]; createdAt: string }
type Ticket = {
  id: string; subject?: string | null; category: string; description: string
  targetType?: string | null; targetId?: string | null; email?: string | null
  status: string; adminNotes?: string | null; createdAt: string; priority?: boolean
  user?: { id: string; firstName?: string; lastName?: string; email?: string } | null
  // Files sent with a support message, and who a "Report this user" is about
  attachments?: string[]
  reportedUser?: { id: string; username: string; firstName?: string; lastName?: string } | null
  messages?: TicketMessage[]
}
const REPLY_MIN = 10
const STATUSES = [['open', 'Open'], ['in_review', 'In review'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']] as const
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const TARGET_LINK: Record<string, (id: string) => string> = { task: (id) => `/tasks/${id}`, store: (id) => `/store/${id}`, user: (id) => `/user/${id}` }

export default function AdminSupport() {
  const [status, setStatus] = useState<(typeof STATUSES)[number][0]>('open')
  const [items, setItems] = useState<Ticket[] | null>(null)
  const [err, setErr] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [cardErr, setCardErr] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')

  const load = useCallback(() => {
    setItems(null); setErr('')
    apiRequest<Ticket[]>(`/reports/admin?status=${status}`)
      .then((l) => setItems(Array.isArray(l) ? l : []))
      .catch((e) => { setErr(e?.message || "Couldn't load tickets"); setItems([]) })
  }, [status])
  useEffect(() => { load() }, [load])

  // to: a new status, or undefined to only send the reply
  const move = async (t: Ticket, to?: string) => {
    const reply = (replies[t.id] || '').trim()
    const closing = to === 'resolved' || to === 'dismissed'
    const sayErr = (m: string) => setCardErr((c) => ({ ...c, [t.id]: m }))
    if ((closing || !to) && reply.length < REPLY_MIN) {
      return sayErr(closing
        ? `Write a reply the member will see before you ${to === 'resolved' ? 'resolve' : 'dismiss'} this (at least ${REPLY_MIN} characters). Tell them what was done or why.`
        : reply ? `Write a little more in the reply (at least ${REPLY_MIN} characters)` : 'Write a reply first')
    }
    if (!closing && reply && reply.length < REPLY_MIN) return sayErr(`Write a little more in the reply (at least ${REPLY_MIN} characters)`)
    setBusy(t.id); sayErr('')
    try {
      const saved = await apiRequest<Ticket>(`/reports/admin/${t.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status: to, adminNotes: notes[t.id] ?? t.adminNotes ?? undefined, reply: reply || undefined }),
      })
      setReplies((r) => ({ ...r, [t.id]: '' }))
      // Same tab: stays in the list with the new reply; otherwise it moves tabs
      if (!to || to === status) setItems((l) => (l || []).map((x) => (x.id === t.id ? { ...x, messages: saved?.messages || x.messages } : x)))
      else setItems((l) => (l || []).filter((x) => x.id !== t.id))
    } catch (e: any) { sayErr(e?.message || 'That didn’t work') }
    setBusy('')
  }

  return (
    <Layout>
      <div className="ui-page">
        <Link to="/admin" className="ui-eyebrow" style={{ textDecoration: 'none' }}><i className="ti ti-arrow-left" /> Admin</Link>
        <h1 className="ui-title">Support and reports</h1>
        <p className="ui-sub">Tickets from the help centre and reports on jobs, store items and people. Priority Support tickets are listed first. Reply here: the member sees it on their ticket and gets a notification and an email. Resolving or dismissing needs a reply. If they write back, the ticket comes back to Open.</p>

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
              const target = t.targetType === 'user' && t.reportedUser ? `/user/${t.reportedUser.username}` : t.targetType && t.targetId && TARGET_LINK[t.targetType]?.(t.targetId)
              const msgs = t.messages || []
              const memberWroteLast = msgs.length > 0 && !msgs[msgs.length - 1].fromTeam
              return (
                <article key={t.id} className="ui-card ui-card-pad">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                    {t.priority && <span className="oga-prem" style={{ marginLeft: 0 }}><i className="ti ti-bolt" />Priority</span>}
                    <span className="ui-chip" style={{ height: 24, cursor: 'default' }}>{t.targetType === 'support' ? 'Ticket' : `Report: ${t.targetType || 'other'}`}</span>
                    {memberWroteLast && <span className="ui-chip" style={{ height: 24, cursor: 'default', fontWeight: 700 }}>Member replied</span>}
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
                  {msgs.length > 0 && (
                    <ol style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'grid', gap: 8 }} aria-label="Conversation">
                      {msgs.map((m) => (
                        <li key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px', background: m.fromTeam ? 'var(--card)' : 'var(--bg2)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, color: 'var(--text2)', marginBottom: 3 }}>
                            <strong style={{ color: 'var(--text)' }}>{m.fromTeam ? 'Team reply' : 'Member'}</strong><span>{when(m.createdAt)}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.body}</p>
                          {!!m.attachments?.length && (
                            <p style={{ margin: '6px 0 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {m.attachments.map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow" className="ui-chip" style={{ minHeight: 36 }}><i className="ti ti-paperclip" /> File {i + 1}</a>)}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                  <label className="ui-label" htmlFor={`r-${t.id}`}>Reply to the member <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(they see this, by notification and email)</span></label>
                  <textarea id={`r-${t.id}`} className="ui-input" style={{ height: 84, padding: 10, resize: 'vertical' }} maxLength={5000} placeholder="What was done, or what they should do next" value={replies[t.id] ?? ''} onChange={(e) => setReplies((r) => ({ ...r, [t.id]: e.target.value }))} />
                  <label className="ui-label" htmlFor={`n-${t.id}`} style={{ marginTop: 10 }}>Internal notes <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(only the team sees these)</span></label>
                  <textarea id={`n-${t.id}`} className="ui-input" style={{ height: 64, padding: 10, resize: 'vertical' }} maxLength={2000} value={notes[t.id] ?? t.adminNotes ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))} />
                  {cardErr[t.id] && <p role="alert" style={{ color: 'var(--red)', fontSize: 13, margin: '8px 0 0' }}>{cardErr[t.id]}</p>}
                  <div className="ui-actions" style={{ marginTop: 10 }}>
                    <button type="button" className="ui-btn ui-btn-ghost" disabled={busy === t.id} onClick={() => move(t)}>Send reply</button>
                    {status !== 'resolved' && <button type="button" className="ui-btn ui-btn-dark" disabled={busy === t.id} onClick={() => move(t, 'resolved')}>Reply and resolve</button>}
                    {status === 'open' && <button type="button" className="ui-btn ui-btn-ghost" disabled={busy === t.id} onClick={() => move(t, 'in_review')}>Mark in review</button>}
                    {status !== 'dismissed' && status !== 'resolved' && <button type="button" className="ui-btn ui-btn-ghost" disabled={busy === t.id} onClick={() => move(t, 'dismissed')}>Reply and dismiss</button>}
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
