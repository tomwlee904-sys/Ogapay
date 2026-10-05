import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

export default function AdminModeration() {
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  // Store orders where the buyer reported a problem: the payment waits for us
  const [disputes, setDisputes] = useState<any[] | null>(null)
  const loadDisputes = () => apiRequest<any[]>('/store/admin/disputes').then((d) => setDisputes(Array.isArray(d) ? d : [])).catch(() => setDisputes([]))

  const loadQueue = async () => {
    setLoading(true)
    try {
      const res = await apiRequest<any>('/admin/moderation/queue')
      setQueue(res.queue || [])
    } catch { setQueue([]) }
    setLoading(false)
  }

  useEffect(() => { loadQueue(); loadDisputes() }, [])

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

  const handleResolve = async (submissionId: string, action: 'APPROVED' | 'REJECTED') => {
    setBusy(submissionId)
    setMsg('')
    try {
      await apiRequest(`/admin/moderation/resolve/${submissionId}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      setQueue(prev => prev.filter(s => s.id !== submissionId))
      setMsg(`Submission ${action.toLowerCase()} successfully`)
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
        .mod-card-info .meta span{display:inline-flex;align-items:center;gap:4px}
        .mod-actions{display:flex;gap:8px;flex-shrink:0}
        .mod-actions button{padding:8px 18px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;transition:opacity .13s}
        .mod-actions button:disabled{opacity:.5;cursor:not-allowed}
        .btn-approve{background:#059669;color:#fff}
        .btn-reject{background:#dc2626;color:#fff}
        .btn-flag{background:var(--accent);color:var(--on-accent);padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:16px}
        .mod-empty{padding:40px;text-align:center;color:var(--text2);font-size:14px}
        .mod-msg{padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px;background:#d1fae5;color:#065f46}
        .mod-msg.error{background:#fee2e2;color:#991b1b}
        .mod-h2{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:700;margin:22px 0 12px;color:var(--text)}
        .mod-h2 span{font-size:12px;font-weight:700;padding:2px 8px;border-radius:99px;background:#fee2e2;color:#991b1b}
        .mod-dispute{align-items:flex-start}
        .mod-reason{margin:8px 0 0;font-size:13px;line-height:1.5;color:var(--text);white-space:normal}
        @media(max-width:640px){.mod-card{flex-direction:column;align-items:stretch}.mod-actions button{flex:1}}
      `}</style>
      <div className="mod-wrap">
        <h1>Moderation Queue</h1>
        <p className="sub">Store orders with a reported problem, then job submissions waiting too long for review</p>

        {msg && <div className={`mod-msg${msg.includes('Failed') || msg.includes('failed') ? ' error' : ''}`}>{msg}</div>}

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
        <p className="sub" style={{ marginTop: -6 }}>Submissions unreviewed for more than 24 hours, flagged for moderator action</p>

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
                    <span><i className="ti ti-user" /> {s.worker?.firstName || '?'} {s.worker?.lastName || ''}</span>
                    <span><i className="ti ti-currency-naira" /> {s.task?.reward || '?'} {s.task?.currency || ''}</span>
                    <span><i className="ti ti-clock" /> {s.submittedAt ? timeSince(s.submittedAt) : '?'} ago</span>
                    {s.proof && <span><i className="ti ti-link" /> <a href={s.proof} target="_blank" rel="noreferrer" style={{color:'var(--accent)',textDecoration:'none'}}>Proof</a></span>}
                  </div>
                </div>
                <div className="mod-actions">
                  <button className="btn-approve" onClick={() => handleResolve(s.id, 'APPROVED')} disabled={busy === s.id}>
                    {busy === s.id ? '...' : 'Approve'}
                  </button>
                  <button className="btn-reject" onClick={() => handleResolve(s.id, 'REJECTED')} disabled={busy === s.id}>
                    {busy === s.id ? '...' : 'Reject'}
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
