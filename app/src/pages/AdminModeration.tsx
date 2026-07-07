import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

export default function AdminModeration() {
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const loadQueue = async () => {
    setLoading(true)
    try {
      const res = await apiRequest<any>('/admin/moderation/queue')
      setQueue(res.queue || [])
    } catch { setQueue([]) }
    setLoading(false)
  }

  useEffect(() => { loadQueue() }, [])

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
        .mod-wrap h1{font-family:Outfit,sans-serif;font-size:28px;font-weight:900;margin:0 0 4px}
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
        .btn-flag{background:var(--accent);color:#fff;padding:10px 20px;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:16px}
        .mod-empty{padding:40px;text-align:center;color:var(--text2);font-size:14px}
        .mod-msg{padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px;background:#d1fae5;color:#065f46}
        .mod-msg.error{background:#fee2e2;color:#991b1b}
      `}</style>
      <div className="mod-wrap">
        <h1>Moderation Queue</h1>
        <p className="sub">Submissions unreviewed for &gt;24h — flagged for moderator action</p>

        {msg && <div className={`mod-msg${msg.includes('Failed') || msg.includes('failed') ? ' error' : ''}`}>{msg}</div>}

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
