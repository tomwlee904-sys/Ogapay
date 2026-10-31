import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import RateWork from '../components/RateWork'
import CopyFlag from '../components/CopyFlag'

export default function AdminModeration() {
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  // Optional stars and a note for work we approve; they count towards the worker's rating
  const [stars, setStars] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  // "Spam / fake work" reject: also warns the worker (backend services/warning.service.js)
  const [spamFor, setSpamFor] = useState<string | null>(null)
  const [spamReason, setSpamReason] = useState('SPAM')
  const [spamNote, setSpamNote] = useState('')
  // Store orders where the buyer reported a problem: the payment waits for us
  const [disputes, setDisputes] = useState<any[] | null>(null)
  const loadDisputes = () => apiRequest<any[]>('/store/admin/disputes').then((d) => setDisputes(Array.isArray(d) ? d : [])).catch(() => setDisputes([]))
  // Second looks: workers who asked us to check a rejection (POST /escrow/dispute)
  const [looks, setLooks] = useState<any[] | null>(null)
  const [lookNotes, setLookNotes] = useState<Record<string, string>>({})
  const loadLooks = () => apiRequest<{ disputes: any[] }>('/escrow/disputes').then((d) => setLooks(d?.disputes || [])).catch(() => setLooks([]))

  const loadQueue = async () => {
    setLoading(true)
    try {
      const res = await apiRequest<any>('/admin/moderation/queue')
      setQueue(res.queue || [])
    } catch { setQueue([]) }
    setLoading(false)
  }

  useEffect(() => { loadQueue(); loadDisputes(); loadLooks() }, [])

  const amountOf = (t: any, share = 1) => {
    const n = Number(t?.reward || 0) * share
    return t?.currency === 'NGN' || !t?.currency ? `₦${Math.round(n).toLocaleString('en-US')}` : `${n.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${t.currency}`
  }
  const decide = async (d: any, outcome: 'WORKER_WON' | 'POSTER_WON' | 'SPLIT') => {
    const what = outcome === 'WORKER_WON' ? `Approve the work and pay @${d.worker?.username} ${amountOf(d.task)}`
      : outcome === 'SPLIT' ? `Pay @${d.worker?.username} half (${amountOf(d.task, 0.5)})`
      : `Keep @${d.poster?.username}'s rejection (nothing is paid)`
    if (!window.confirm(`${what}? Both sides are told. This can't be undone.`)) return
    setBusy(d.id)
    setMsg('')
    try {
      await apiRequest(`/escrow/resolve/${d.id}`, { method: 'POST', body: JSON.stringify({ outcome, ...((lookNotes[d.id] || '').trim() && { resolution: (lookNotes[d.id] || '').trim() }) }) })
      setLooks((prev) => (prev || []).filter((x) => x.id !== d.id))
      setMsg(outcome === 'POSTER_WON' ? `Rejection kept on "${d.task?.title}"` : `Paid @${d.worker?.username} for "${d.task?.title}"`)
    } catch (err: any) {
      setMsg(`Failed: ${err.message || 'could not decide'}`)
      loadLooks()
    }
    setBusy(null)
  }

  const settle = async (o: any, action: 'RELEASE' | 'REFUND') => {
    const amount = `${o.currency === 'NGN' ? '₦' : ''}${Number(o.total).toLocaleString('en-US', { maximumFractionDigits: 6 })}${o.currency === 'NGN' ? '' : ' ' + o.currency}`
    const who = action === 'RELEASE' ? `the seller @${o.seller?.username}` : `the buyer @${o.buyer?.username}`
    if (!window.confirm(`Send ${amount} for "${o.product?.name}" to ${who}? This can't be undone.`)) return
    setBusy(o.id)
    setMsg('')
    try {
      await apiRequest(`/store/admin/orders/${o.id}/resolve`, { method: 'POST', body: JSON.stringify({ action }) })
      setDisputes((prev) => (prev || []).filter((d) => d.id !== o.id))
      setMsg(action === 'RELEASE' ? `Paid ${amount} to @${o.seller?.username}` : `Refunded ${amount} to @${o.buyer?.username}`)
    } catch (err: any) {
      setMsg(err.message || 'Failed to settle the order')
    }
    setBusy(null)
  }

  const handleResolve = async (submissionId: string, action: 'APPROVED' | 'REJECTED', warn?: { reason: string; note: string }) => {
    if (warn && warn.note.trim().length < 5) { setMsg('Failed: say what you saw (the worker reads it)'); return }
    let why = ''
    if (action === 'REJECTED' && !warn) {
      why = (window.prompt('Why is it rejected? The worker reads this, and a rejection is final for them on this job.') || '').trim()
      if (why.length < 5) { setMsg('Failed: give a reason of at least 5 characters (the worker reads it)'); return }
    }
    setBusy(submissionId)
    setMsg('')
    try {
      const res = await apiRequest<any>(`/admin/moderation/resolve/${submissionId}`, {
        method: 'POST',
        body: JSON.stringify({ action, ...(action === 'APPROVED' && stars[submissionId] ? { rating: stars[submissionId], feedback: (notes[submissionId] || '').trim() || undefined } : {}), ...(warn && { warn: warn.reason, posterNotes: warn.note.trim() }), ...(why && { posterNotes: why }) }),
      })
      setQueue(prev => prev.filter(s => s.id !== submissionId))
      setSpamFor(null); setSpamNote('')
      const outcome = res?.warning?.outcome
      setMsg(warn
        ? `Rejected and warned${outcome === 'RANK_DOWN' ? ': 2nd warning in 30 days, their rank went down one step' : outcome === 'SUSPENDED' ? ': 3rd warning in 30 days, they can no longer take new jobs' : ''}`
        : `Submission ${action.toLowerCase()} successfully`)
    } catch (err: any) {
      setMsg(err.message || 'Failed to resolve')
    }
    setBusy(null)
  }

  const handleFlagAll = async () => {
    setBusy('flag')
    try {
      const res = await apiRequest<any>('/admin/moderation/flag-expired', { method: 'POST' })
      setMsg(`Flagged ${res.flagged} expired submissions`)
      loadQueue()
    } catch (err: any) {
      setMsg(err.message || 'Failed to flag')
    }
    setBusy(null)
  }

  const timeSince = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  return (
    <Layout sidebar>
      <style>{`
        .mod-wrap{max-width:1100px;margin:0 auto;padding:28px 24px 60px}
        .mod-wrap h1{font-family:Inter,sans-serif;font-size:28px;font-weight:900;margin:0 0 4px}
        .mod-wrap .sub{color:var(--text2);font-size:14px;margin:0 0 20px}
        .mod-queue{display:flex;flex-direction:column;gap:12px}
        .mod-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .mod-card-info{flex:1;min-width:0}
        .mod-card-info h3{font-size:15px;font-weight:700;margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .mod-card-info .meta{font-size:12px;color:var(--text2);display:flex;gap:12px;flex-wrap:wrap}
        .mod-text{margin:8px 0 0;padding:8px 10px;border-radius:8px;background:var(--card2);font-size:12px;line-height:1.5;color:var(--text);white-space:pre-wrap;overflow-wrap:anywhere}
        .mod-text-match{border:1px dashed var(--border)}
        .mod-card-info .meta span{display:inline-flex;align-items:center;gap:4px}
        .mod-actions{display:flex;gap:8px;flex-shrink:0}
        .mod-actions button{padding:8px 18px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .13s}
        .mod-actions button:disabled{opacity:.5;cursor:not-allowed}
        .btn-approve{background:#059669;color:#fff}
        .btn-reject{background:#dc2626;color:#fff}
        .btn-spam{background:transparent;color:var(--text);border:1px solid var(--border)!important}
        .mod-spam{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}
        .mod-spam .ui-select{width:auto;min-width:180px}
        .mod-spam .ui-input{flex:1;min-width:200px}
        .mod-spam button{padding:8px 14px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer}
        .mod-spam p{margin:0;width:100%;font-size:12px;color:var(--text2)}
        .btn-flag{background:var(--accent);color:var(--on-accent);padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:16px}
        .mod-empty{padding:40px;text-align:center;color:var(--text2);font-size:14px}
        .mod-msg{padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px;background:#d1fae5;color:#065f46}
        .mod-msg.error{background:#fee2e2;color:#991b1b}
        .mod-h2{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:700;margin:22px 0 12px;color:var(--text)}
        .mod-h2 span{font-size:12px;font-weight:700;padding:2px 8px;border-radius:99px;background:#fee2e2;color:#991b1b}
        .mod-dispute{align-items:flex-start}
        .mod-reason{margin:8px 0 0;font-size:13px;line-height:1.5;color:var(--text);white-space:normal}
        .mod-look{display:block}
        .mod-look .mod-actions{margin-top:12px;flex-wrap:wrap}
        .mod-look .mod-text b{display:block;margin-bottom:2px}
        .mod-look .mod-files{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:12px}
        .mod-look .mod-files a{color:var(--accent);text-decoration:none}
        .mod-look .ui-input{margin-top:10px}
        .btn-split{background:transparent;color:var(--text);border:1px solid var(--border)!important}
        @media(max-width:640px){.mod-card{flex-direction:column;align-items:stretch}.mod-actions button{flex:1}}
      `}</style>
      <div className="mod-wrap">
        <h1>Moderation Queue</h1>
        <p className="sub">Second looks at rejected work, store orders with a reported problem, then job submissions waiting too long for review</p>

        {msg && <div className={`mod-msg${msg.includes('Failed') || msg.includes('failed') ? ' error' : ''}`}>{msg}</div>}

        <h2 className="mod-h2">Second looks at rejected work {looks && looks.length > 0 && <span>{looks.length}</span>}</h2>
        <p className="sub" style={{ marginTop: -6 }}>Workers who think their work was wrongly rejected. Read the brief, what they sent and the poster's reason, then decide. Both sides are told.</p>
        {looks === null ? (
          <div className="mod-empty">Loading...</div>
        ) : looks.length === 0 ? (
          <div className="mod-empty">No second looks waiting.</div>
        ) : (
          <div className="mod-queue" style={{ marginBottom: 28 }}>
            {looks.map((d: any) => {
              const sub = d.submission || {}
              const brief = String(d.task?.instructions || d.task?.description || '').trim()
              const files = (sub.attachments || []).filter(Boolean)
              return (
                <div key={d.id} className="mod-card mod-look">
                  <div className="mod-card-info">
                    <h3><Link to={`/tasks/${d.task?.id}`} style={{ color: 'inherit' }}>{d.task?.title || 'Job'}</Link></h3>
                    <div className="meta">
                      <span><i className="ti ti-user" /> Worker <Link to={`/user/${d.worker?.username}`} style={{ color: 'inherit' }}>@{d.worker?.username}</Link></span>
                      <span><i className="ti ti-briefcase" /> Poster @{d.poster?.username}</span>
                      <span><i className="ti ti-coin" /> {amountOf(d.task)}</span>
                      <span><i className="ti ti-clock" /> asked {timeSince(d.createdAt)} ago</span>
                      {d.holdsPlace && <span><i className="ti ti-lock" /> reward held for them</span>}
                    </div>
                    {brief && <p className="mod-text"><b>The brief</b>{brief.length > 700 ? brief.slice(0, 700) + '…' : brief}</p>}
                    <p className="mod-text"><b>What @{d.worker?.username} sent</b>{sub.workerNotes || (sub.proof && sub.proof !== 'Proof attached' ? '' : 'No text')}</p>
                    {(sub.proof && /^https?:/.test(sub.proof)) || files.length ? (
                      <div className="mod-files">
                        {sub.proof && /^https?:/.test(sub.proof) && <a href={sub.proof} target="_blank" rel="noreferrer"><i className="ti ti-link" /> Link they sent</a>}
                        {files.map((u: string, i: number) => <a key={u} href={u} target="_blank" rel="noreferrer"><i className="ti ti-paperclip" /> File {i + 1}</a>)}
                      </div>
                    ) : null}
                    <p className="mod-text"><b>Why @{d.poster?.username} rejected it</b>{sub.posterNotes || 'No reason given'}</p>
                    <p className="mod-text"><b>Why @{d.worker?.username} disagrees</b>{d.reason}</p>
                    {d.workerEvidence && <div className="mod-files">{/^https?:/.test(d.workerEvidence) ? <a href={d.workerEvidence} target="_blank" rel="noreferrer"><i className="ti ti-link" /> More proof from the worker</a> : <span>{d.workerEvidence}</span>}</div>}
                    <input className="ui-input" value={lookNotes[d.id] || ''} maxLength={500} onChange={(e) => setLookNotes((m) => ({ ...m, [d.id]: e.target.value }))} placeholder="Note to both sides (optional), e.g. The screenshot shows the follow" aria-label="Note to both sides" />
                  </div>
                  <div className="mod-actions">
                    <button className="btn-approve" onClick={() => decide(d, 'WORKER_WON')} disabled={busy === d.id}>{busy === d.id ? '...' : `Approve and pay ${amountOf(d.task)}`}</button>
                    <button className="btn-split" onClick={() => decide(d, 'SPLIT')} disabled={busy === d.id}>Pay half</button>
                    <button className="btn-reject" onClick={() => decide(d, 'POSTER_WON')} disabled={busy === d.id}>Keep the rejection</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <h2 className="mod-h2">Store orders with a problem {disputes && disputes.length > 0 && <span>{disputes.length}</span>}</h2>
        {disputes === null ? (
          <div className="mod-empty">Loading...</div>
        ) : disputes.length === 0 ? (
          <div className="mod-empty">No reported problems. Payments for store orders are released as normal.</div>
        ) : (
          <div className="mod-queue" style={{ marginBottom: 28 }}>
            {disputes.map((o: any) => (
              <div key={o.id} className="mod-card mod-dispute">
                <div className="mod-card-info">
                  <h3>{o.product?.name || 'Store order'}</h3>
                  <div className="meta">
                    <span><i className="ti ti-user" /> Buyer @{o.buyer?.username}</span>
                    <span><i className="ti ti-building-store" /> Seller @{o.seller?.username}</span>
                    <span><i className="ti ti-coin" /> {Number(o.total).toLocaleString('en-US', { maximumFractionDigits: 6 })} {o.currency} held</span>
                    {o.disputedAt && <span><i className="ti ti-clock" /> reported {timeSince(o.disputedAt)} ago</span>}
                    {o.deliveredAt && <span><i className="ti ti-package" /> marked delivered</span>}
                  </div>
                  <p className="mod-reason">"{o.disputeReason}"</p>
                </div>
                <div className="mod-actions">
                  <button className="btn-approve" onClick={() => settle(o, 'RELEASE')} disabled={busy === o.id}>
                    {busy === o.id ? '...' : 'Pay seller'}
                  </button>
                  <button className="btn-reject" onClick={() => settle(o, 'REFUND')} disabled={busy === o.id}>
                    {busy === o.id ? '...' : 'Refund buyer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="mod-h2">Job submissions</h2>
        <p className="sub" style={{ marginTop: -6 }}>Possible copies and spam first (they are never paid automatically), then work left unreviewed for more than 24 hours</p>

        <button className="btn-flag" onClick={handleFlagAll} disabled={busy === 'flag'}>
          {busy === 'flag' ? 'Flagging...' : 'Manually Flag All Expired'}
        </button>

        {loading ? (
          <div className="mod-empty">Loading...</div>
        ) : queue.length === 0 ? (
          <div className="mod-empty">No submissions pending moderation</div>
        ) : (
          <div className="mod-queue">
            {queue.map((s: any) => (
              <div key={s.id} className="mod-card">
                <div className="mod-card-info">
                  <h3>{s.task?.title || 'Untitled Task'}</h3>
                  <div className="meta">
                    <span><i className="ti ti-user" /> {s.worker?.username ? <Link to={`/user/${s.worker.username}`} style={{ color: 'inherit' }}>@{s.worker.username}</Link> : `${s.worker?.firstName || '?'} ${s.worker?.lastName || ''}`}</span>
                    <span><i className="ti ti-currency-naira" /> {s.task?.reward || '?'} {s.task?.currency || ''}</span>
                    <span><i className="ti ti-clock" /> {s.submittedAt ? timeSince(s.submittedAt) : '?'} ago</span>
                    {s.proof && <span><i className="ti ti-link" /> <a href={s.proof} target="_blank" rel="noreferrer" style={{color:'var(--accent)',textDecoration:'none'}}>Proof</a></span>}
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
                  {spamFor === s.id && (
                    <div className="mod-spam">
                      <select className="ui-select" value={spamReason} onChange={(e) => setSpamReason(e.target.value)} aria-label="Warning reason">
                        <option value="SPAM">Spam or low-effort work</option>
                        <option value="FAKE_WORK">Fake proof</option>
                        <option value="COPIED">Copied or AI-written work</option>
                        <option value="RULES">Broke the site rules</option>
                      </select>
                      <input className="ui-input" value={spamNote} onChange={(e) => setSpamNote(e.target.value)} maxLength={500} placeholder="What you saw (the worker reads this)" aria-label="What you saw" />
                      <button className="btn-reject" onClick={() => handleResolve(s.id, 'REJECTED', { reason: spamReason, note: spamNote })} disabled={busy === s.id}>
                        {busy === s.id ? '...' : 'Reject and warn'}
                      </button>
                      <p>A 2nd warning in 30 days lowers their rank; a 3rd stops new jobs.</p>
                    </div>
                  )}
                </div>
                <div className="mod-actions">
                  <button className="btn-approve" onClick={() => handleResolve(s.id, 'APPROVED')} disabled={busy === s.id}>
                    {busy === s.id ? '...' : 'Approve'}
                  </button>
                  <button className="btn-reject" onClick={() => handleResolve(s.id, 'REJECTED')} disabled={busy === s.id}>
                    {busy === s.id ? '...' : 'Reject'}
                  </button>
                  <button className="btn-spam" onClick={() => { setSpamFor(spamFor === s.id ? null : s.id); setSpamReason('SPAM'); setSpamNote('') }} disabled={busy === s.id} aria-expanded={spamFor === s.id}>
                    Spam / fake work
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
