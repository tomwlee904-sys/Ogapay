import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'
import { clearWarningsCache, type MyWarning, type MyWarnings } from '../components/WarningBanner'

/* My warnings (backend services/warning.service.js): each warning with its
   reason and the rule, what it changed, and an appeal note to an admin. */

const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function outcomeText(w: MyWarning) {
  if (w.withdrawnAt) return 'Withdrawn by an admin. It no longer counts.'
  if (w.outcome === 'SUSPENDED') return '3rd warning in 30 days: new jobs stopped until an admin reviews your account.'
  if (w.outcome === 'RANK_DOWN') return `2nd warning in 30 days: rank went down from ${w.fromLevelName} to ${w.toLevelName}.`
  return 'Warning only.'
}

export default function MyWarnings() {
  const { toast } = useToast()
  const [data, setData] = useState<MyWarnings | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => apiRequest<MyWarnings>('/warnings/me').then((d) => { setData(d); setFailed(false) }).catch(() => setFailed(true))
  useEffect(() => {
    apiRequest<MyWarnings>('/warnings/me').then((d) => {
      setData(d); setFailed(false)
      // Opening this page counts as reading the new ones (the banner goes away)
      d?.unseen?.forEach((w) => { apiRequest(`/warnings/${w.id}/seen`, { method: 'POST' }).catch(() => {}) })
      clearWarningsCache()
    }).catch(() => setFailed(true))
  }, [])

  const send = async (w: MyWarning) => {
    if (note.trim().length < 10) { toast('Tell us what happened (at least 10 characters)', 'error'); return }
    setBusy(true)
    try {
      await apiRequest(`/warnings/${w.id}/appeal`, { method: 'POST', body: JSON.stringify({ note: note.trim() }) })
      toast('Appeal sent. An admin will read it and reply.', 'success')
      setOpen(''); setNote('')
      load()
    } catch (e: any) { toast(e?.message || "Couldn't send your appeal", 'error') }
    setBusy(false)
  }

  return (
    <Layout>
      <style>{`
        .mw{max-width:760px;margin:0 auto;padding:24px var(--gutter) 60px;display:grid;gap:14px}
        .mw-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;display:grid;gap:8px}
        .mw-card.off{opacity:.7}
        .mw-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline}
        .mw-top b{font-size:15px}
        .mw-top small{color:var(--text2);font-size:12.5px}
        .mw-card p{margin:0;font-size:14px;line-height:1.55;color:var(--text2)}
        .mw-card p strong{color:var(--text);font-weight:600}
        .mw-stop{border-color:rgba(239,68,68,.45);background:rgba(239,68,68,.06)}
        .mw-rules{margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:var(--text2)}
        .mw-card textarea{width:100%;min-height:90px;resize:vertical}
      `}</style>
      <div className="mw">
        <div>
          <h1 className="ui-title" style={{ margin: 0 }}>Warnings</h1>
          <p className="ui-sub">We warn accounts that send spam, fake proof or copied work. If you think a warning is wrong, send an appeal and an admin will look at it.</p>
        </div>

        <section className="mw-card" aria-label="How warnings work">
          <b>How warnings work</b>
          <ul className="mw-rules">
            <li>1st warning: a warning only.</li>
            <li>2nd warning within 30 days: your rank goes down one step.</li>
            <li>3rd warning within 30 days: you can't take new jobs until an admin reviews your account. You can still withdraw money you earned.</li>
            <li>Warnings older than 30 days, or withdrawn by an admin, don't count.</li>
          </ul>
        </section>

        {failed && <div className="mw-card"><p>Couldn't load your warnings. Check your connection and try again.</p></div>}
        {!data && !failed && <div className="ui-sk" style={{ height: 140, borderRadius: 16 }} />}

        {data?.suspended && (
          <section className="mw-card mw-stop" role="status">
            <b>You can't take new jobs right now</b>
            <p>Since {day(data.suspended.since)}. An admin will review your account. Work you already sent is still reviewed and paid, and you can still <Link to="/wallet">withdraw your money</Link>.</p>
          </section>
        )}

        {data && (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text2)' }}>
            Warnings in the last {data.windowDays} days: <strong style={{ color: 'var(--text)' }}>{data.recentWarnings}</strong>
          </p>
        )}

        {data && data.warnings.length === 0 && <div className="mw-card"><p>You have no warnings. Keep sending real work.</p></div>}

        {data?.warnings.map((w) => (
          <section className={`mw-card ${w.withdrawnAt ? 'off' : ''}`} key={w.id} aria-label={`Warning from ${day(w.createdAt)}`}>
            <div className="mw-top">
              <b>{w.reasonLabel}</b>
              <small>{day(w.createdAt)}</small>
            </div>
            <p>{w.rule}</p>
            {w.note && <p><strong>What we saw:</strong> {w.note}</p>}
            {w.taskId && <p><Link to={`/tasks/${w.taskId}`}>See the job</Link></p>}
            <p><strong>Result:</strong> {outcomeText(w)}</p>
            {w.withdrawNote && <p><strong>Admin's note:</strong> {w.withdrawNote}</p>}
            {w.appealedAt ? (
              <p><strong>Your appeal ({day(w.appealedAt)}):</strong> {w.appealNote}{!w.withdrawnAt && ' An admin will reply.'}</p>
            ) : !w.withdrawnAt && (open === w.id ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <label className="ui-label" htmlFor={`ap-${w.id}`}>Why is this warning wrong?</label>
                <textarea id={`ap-${w.id}`} className="ui-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Explain what happened. Add links to your work if they help." />
                <div className="ui-actions">
                  <button className="ui-btn ui-btn-dark" onClick={() => send(w)} disabled={busy}>{busy ? 'Sending…' : 'Send appeal'}</button>
                  <button className="ui-btn ui-btn-ghost" onClick={() => { setOpen(''); setNote('') }} disabled={busy}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="ui-actions"><button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => { setOpen(w.id); setNote('') }}>Appeal this warning</button></div>
            ))}
          </section>
        ))}
      </div>
    </Layout>
  )
}
