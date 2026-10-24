import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import AdminShell, { AdminEmpty, AdminRefresh, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import RateWork from '../components/RateWork'
import CopyFlag from '../components/CopyFlag'

export default function AdminModeration() {
  // null until loaded; a failed load keeps it null and shows "couldn't load"
  const [queue, setQueue] = useState<any[] | null>(null)
  const [queueFailed, setQueueFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [msgBad, setMsgBad] = useState(false)
  const say = (text: string, bad = false) => { setMsg(text); setMsgBad(bad) }
  // Optional stars and a note for work we approve; they count towards the worker's rating
  const [stars, setStars] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  // "Spam / fake work" reject: also warns the worker (backend services/warning.service.js)
  const [spamFor, setSpamFor] = useState<string | null>(null)
  const [spamReason, setSpamReason] = useState('SPAM')
  const [spamNote, setSpamNote] = useState('')
  // A plain Reject asks first (the worker isn't paid)
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  // Store orders where the buyer reported a problem: the payment waits for us
  const [disputes, setDisputes] = useState<any[] | null>(null)
  const [disputesFailed, setDisputesFailed] = useState(false)
  const [tab, setTab] = useState<'subs' | 'disputes'>('subs')
  const tabPicked = useRef(false)

  const loadDisputes = () => {
    setDisputesFailed(false)
    return apiRequest<any[]>('/store/admin/disputes').then((d) => setDisputes(Array.isArray(d) ? d : [])).catch(() => { setDisputes(null); setDisputesFailed(true) })
  }

  const loadQueue = async () => {
    setLoading(true); setQueueFailed(false)
    try {
      const res = await apiRequest<any>('/admin/moderation/queue')
      setQueue(res.queue || [])
      setCheckedAt(new Date())
    } catch { setQueueFailed(true) }
    setLoading(false)
  }

  useEffect(() => { loadQueue(); loadDisputes() }, [])

  // Open on store disputes when there's no job work waiting but money is held
  useEffect(() => {
    if (tabPicked.current || queue === null || disputes === null) return
    tabPicked.current = true
    if (queue.length === 0 && disputes.length > 0) setTab('disputes')
  }, [queue, disputes])

  const settle = async (o: any, action: 'RELEASE' | 'REFUND') => {
    const amount = `${o.currency === 'NGN' ? '₦' : ''}${Number(o.total).toLocaleString('en-US', { maximumFractionDigits: 6 })}${o.currency === 'NGN' ? '' : ' ' + o.currency}`
    const who = action === 'RELEASE' ? `the seller @${o.seller?.username}` : `the buyer @${o.buyer?.username}`
    if (!window.confirm(`Send ${amount} for "${o.product?.name}" to ${who}? This can't be undone.`)) return
    setBusy(o.id)
    setMsg('')
    try {
      await apiRequest(`/store/admin/orders/${o.id}/resolve`, { method: 'POST', body: JSON.stringify({ action }) })
      setDisputes((prev) => (prev || []).filter((d) => d.id !== o.id))
      say(action === 'RELEASE' ? `Paid ${amount} to @${o.seller?.username}` : `Refunded ${amount} to @${o.buyer?.username}`)
    } catch (err: any) {
      say(err.message || 'Failed to settle the order', true)
    }
    setBusy(null)
  }

  const handleResolve = async (submissionId: string, action: 'APPROVED' | 'REJECTED', warn?: { reason: string; note: string }) => {
    if (warn && warn.note.trim().length < 5) { say('Failed: say what you saw (the worker reads it)', true); return }
    setBusy(submissionId)
    setMsg('')
    try {
      const res = await apiRequest<any>(`/admin/moderation/resolve/${submissionId}`, {
        method: 'POST',
        body: JSON.stringify({ action, ...(action === 'APPROVED' && stars[submissionId] ? { rating: stars[submissionId], feedback: (notes[submissionId] || '').trim() || undefined } : {}), ...(warn && { warn: warn.reason, posterNotes: warn.note.trim() }) }),
      })
      setQueue(prev => prev && prev.filter(s => s.id !== submissionId))
      setSpamFor(null); setSpamNote(''); setRejectFor(null)
      const outcome = res?.warning?.outcome
      say(warn
        ? `Rejected and warned${outcome === 'RANK_DOWN' ? ': 2nd warning in 30 days, their rank went down one step' : outcome === 'SUSPENDED' ? ': 3rd warning in 30 days, they can no longer take new jobs' : ''}`
        : `Submission ${action.toLowerCase()} successfully`)
    } catch (err: any) {
      say(err.message || 'Failed to resolve', true)
    }
    setBusy(null)
  }

  const handleFlagAll = async () => {
    if (!window.confirm('Add every job submission that has waited more than 24 hours for review to this queue?')) return
    setBusy('flag')
    try {
      const res = await apiRequest<any>('/admin/moderation/flag-expired', { method: 'POST' })
      say(`Flagged ${res.flagged} expired submissions`)
      loadQueue()
    } catch (err: any) {
      say(err.message || 'Failed to flag', true)
    }
    setBusy(null)
  }

  const timeSince = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  const pick = (t: 'subs' | 'disputes') => { tabPicked.current = true; setTab(t) }
  const refresh = () => { loadQueue(); loadDisputes() }

  return (
    <AdminShell
      section="moderation"
      title="Moderation"
      sub="Job submissions to check, and store orders with a reported problem."
      how={<>
        <p><b>Job submissions:</b> possible copies and spam come first (they are never paid automatically), then work left unreviewed for more than 24 hours.</p>
        <p><b>Store disputes:</b> the buyer reported a problem, so the payment waits until you pay the seller or refund the buyer.</p>
      </>}
      actions={<AdminRefresh onClick={refresh} loading={loading} />}
    >
      <style>{`
        .mod-info{min-width:0;display:grid;gap:8px}
        .mod-info h3{margin:0;font-size:15px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}
        .mod-meta{font-size:12.5px;color:var(--text2);display:flex;gap:6px 14px;flex-wrap:wrap}
        .mod-meta span{display:inline-flex;align-items:center;gap:4px}
        .mod-meta a{color:var(--text);font-weight:600}
        .mod-text{margin:0;padding:8px 10px;border-radius:var(--r-ctl);background:var(--card2);font-size:13px;line-height:1.5;color:var(--text);white-space:pre-wrap;overflow-wrap:anywhere}
        .mod-text-match{background:transparent;border:1px dashed var(--border2)}
        .mod-reason{margin:0;font-size:13.5px;line-height:1.5;color:var(--text);overflow-wrap:anywhere}
        .mod-actions{display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:12px}
        .mod-tools{display:flex;justify-content:space-between;align-items:center;gap:8px 12px;flex-wrap:wrap;margin:0 0 12px}
        .mod-tools p{margin:0;font-size:13px;color:var(--text2);line-height:1.5;flex:1 1 240px}
        @media (max-width:767.98px){
          .mod-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
          .mod-actions .mod-approve{grid-column:1 / -1}
        }
      `}</style>

      <div className="adm-tabs even" role="tablist" aria-label="Moderation queues">
        <button type="button" role="tab" aria-selected={tab === 'subs'} onClick={() => pick('subs')}>
          Job submissions{queue && !queueFailed && <em>{queue.length}</em>}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'disputes'} onClick={() => pick('disputes')}>
          Store disputes{disputes && !disputesFailed && <em>{disputes.length}</em>}
        </button>
      </div>

      {msg && <div className={`adm-msg${msgBad ? ' bad' : ''}`} role={msgBad ? 'alert' : 'status'}><span>{msg}</span><button type="button" onClick={() => setMsg('')} aria-label="Dismiss"><i className="ti ti-x" aria-hidden="true" /></button></div>}

      {tab === 'disputes' ? (
        disputesFailed ? (
          <LoadError what="store disputes" onRetry={loadDisputes} />
        ) : disputes === null ? (
          <AdminSkeleton rows={2} />
        ) : disputes.length === 0 ? (
          <AdminEmpty done title="No reported problems">Payments for store orders are released as normal.</AdminEmpty>
        ) : (
          <div className="adm-list">
            {disputes.map((o: any) => (
              <article key={o.id} className="adm-row ui-card">
                <div className="mod-info">
                  <h3>{o.product?.name || 'Store order'}</h3>
                  <div className="mod-meta">
                    <span><i className="ti ti-user" aria-hidden="true" /> Buyer @{o.buyer?.username}</span>
                    <span><i className="ti ti-building-store" aria-hidden="true" /> Seller @{o.seller?.username}</span>
                    <span><i className="ti ti-coin" aria-hidden="true" /> {Number(o.total).toLocaleString('en-US', { maximumFractionDigits: 6 })} {o.currency} held</span>
                    {o.disputedAt && <span><i className="ti ti-clock" aria-hidden="true" /> reported {timeSince(o.disputedAt)} ago</span>}
                    {o.deliveredAt && <span><i className="ti ti-package" aria-hidden="true" /> marked delivered</span>}
                  </div>
                  <p className="mod-reason">"{o.disputeReason}"</p>
                </div>
                <div className="mod-actions">
                  <button type="button" className="ui-btn ui-btn-ghost" onClick={() => settle(o, 'RELEASE')} disabled={busy === o.id}>
                    {busy === o.id ? 'Saving…' : 'Pay seller'}
                  </button>
                  <button type="button" className="ui-btn ui-btn-ghost" onClick={() => settle(o, 'REFUND')} disabled={busy === o.id}>
                    {busy === o.id ? 'Saving…' : 'Refund buyer'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="mod-tools">
            <p>Possible copies and spam first, then work waiting over 24 hours.</p>
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={handleFlagAll} disabled={busy === 'flag'}>
              <i className="ti ti-flag" aria-hidden="true" /> {busy === 'flag' ? 'Flagging…' : 'Flag work waiting over 24h'}
            </button>
          </div>

          {queueFailed ? (
            <LoadError what="the moderation queue" onRetry={loadQueue} />
          ) : loading && queue === null ? (
            <AdminSkeleton />
          ) : !queue || queue.length === 0 ? (
            <AdminEmpty done title="No submissions waiting" at={checkedAt}>All caught up.</AdminEmpty>
          ) : (
            <div className="adm-list">
              {queue.map((s: any) => {
                const worker = s.worker?.username ? `@${s.worker.username}` : 'the worker'
                return (
                  <article key={s.id} className="adm-row ui-card">
                    <div className="mod-info">
                      <h3>{s.task?.title || 'Untitled job'}</h3>
                      <div className="mod-meta">
                        <span><i className="ti ti-user" aria-hidden="true" /> {s.worker?.username ? <Link to={`/user/${s.worker.username}`}>@{s.worker.username}</Link> : `${s.worker?.firstName || '?'} ${s.worker?.lastName || ''}`}</span>
                        <span><i className="ti ti-currency-naira" aria-hidden="true" /> {s.task?.reward || '?'} {s.task?.currency || ''}</span>
                        <span><i className="ti ti-clock" aria-hidden="true" /> {s.submittedAt ? timeSince(s.submittedAt) : '?'} ago</span>
                        {s.proof && <span><i className="ti ti-link" aria-hidden="true" /> <a href={s.proof} target="_blank" rel="noreferrer">Open proof</a></span>}
                      </div>
                      <CopyFlag reason={s.spamReason} copy={!!s.similarToId} compact />
                      {s.workerNotes && <p className="mod-text"><b>{s.worker?.username ? `@${s.worker.username}` : 'Worker'}:</b> {s.workerNotes}</p>}
                      {s.similarTo && (
                        <p className="mod-text mod-text-match">
                          <b>Matched @{s.similarTo.worker?.username || 'someone'}{s.similarTo.status ? ` (${s.similarTo.status.toLowerCase()})` : ''}:</b> {s.similarTo.workerNotes || (s.similarTo.proof && s.similarTo.proof !== 'Proof attached' ? s.similarTo.proof : 'No text')}
                        </p>
                      )}
                      <RateWork who={s.worker?.firstName || 'the worker'} rating={stars[s.id] || 0} note={notes[s.id] || ''} disabled={busy === s.id}
                        onRating={(v) => setStars((m) => ({ ...m, [s.id]: v }))} onNote={(v) => setNotes((m) => ({ ...m, [s.id]: v }))} />
                    </div>

                    {spamFor === s.id ? (
                      <div className="adm-confirm">
                        <p>Reject this work and warn {worker}. A 2nd warning in 30 days lowers their rank; a 3rd stops new jobs.</p>
                        <div className="adm-field">
                          <label className="ui-label" htmlFor={`spam-r-${s.id}`}>Reason</label>
                          <select id={`spam-r-${s.id}`} className="ui-select" value={spamReason} onChange={(e) => setSpamReason(e.target.value)}>
                            <option value="SPAM">Spam or low-effort work</option>
                            <option value="FAKE_WORK">Fake proof</option>
                            <option value="COPIED">Copied or AI-written work</option>
                            <option value="RULES">Broke the site rules</option>
                          </select>
                        </div>
                        <div className="adm-field">
                          <label className="ui-label" htmlFor={`spam-n-${s.id}`}>What you saw (the worker reads this)</label>
                          <textarea id={`spam-n-${s.id}`} className="ui-input" rows={3} value={spamNote} onChange={(e) => setSpamNote(e.target.value)} maxLength={500} placeholder="For example: the same screenshot was sent to 4 jobs" />
                          <span className="adm-count">{spamNote.length}/500{spamNote.trim().length < 5 ? ' · at least 5 characters' : ''}</span>
                        </div>
                        <div className="adm-actions">
                          <button type="button" className="ui-btn adm-danger" onClick={() => handleResolve(s.id, 'REJECTED', { reason: spamReason, note: spamNote })} disabled={busy === s.id || spamNote.trim().length < 5}>
                            {busy === s.id ? 'Saving…' : 'Reject and warn'}
                          </button>
                          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setSpamFor(null)} disabled={busy === s.id}>Cancel</button>
                        </div>
                      </div>
                    ) : rejectFor === s.id ? (
                      <div className="adm-confirm">
                        <p>Reject this work? {worker} won't be paid for it.</p>
                        <div className="adm-actions">
                          <button type="button" className="ui-btn adm-danger" onClick={() => handleResolve(s.id, 'REJECTED')} disabled={busy === s.id}>
                            {busy === s.id ? 'Saving…' : 'Confirm reject'}
                          </button>
                          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setRejectFor(null)} disabled={busy === s.id}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mod-actions">
                        <button type="button" className="ui-btn ui-btn-dark mod-approve" onClick={() => handleResolve(s.id, 'APPROVED')} disabled={busy === s.id}>
                          <i className="ti ti-check" aria-hidden="true" /> {busy === s.id ? 'Saving…' : 'Approve'}
                        </button>
                        <button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setRejectFor(s.id); setSpamFor(null) }} disabled={busy === s.id}>
                          Reject…
                        </button>
                        <button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setSpamFor(spamFor === s.id ? null : s.id); setSpamReason('SPAM'); setSpamNote(''); setRejectFor(null) }} disabled={busy === s.id}>
                          Spam / fake work…
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}
    </AdminShell>
  )
}
