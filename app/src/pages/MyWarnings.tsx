import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'
import { clearWarningsCache, type MyWarning, type MyWarnings } from '../components/WarningBanner'

/* My warnings (backend services/warning.service.js): each warning with its
   reason and the rule, what it changed, and an appeal note to an admin.
   Your own standing comes first (it used to sit under the rules), then your
   warnings with Appeal, then the rules, folded, as a numbered list. */

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

  // markSeen: opening this page counts as reading the new ones (the banner goes away)
  const load = useCallback((markSeen: boolean) => {
    setFailed(false)
    return apiRequest<MyWarnings>('/warnings/me').then((d) => {
      setData(d)
      if (markSeen) {
        d?.unseen?.forEach((w) => { apiRequest(`/warnings/${w.id}/seen`, { method: 'POST' }).catch(() => {}) })
        clearWarningsCache()
      }
    }).catch(() => setFailed(true))
  }, [])
  useEffect(() => { load(true) }, [load])

  const send = async (w: MyWarning) => {
    if (note.trim().length < 10) { toast('Tell us what happened (at least 10 characters)', 'error'); return }
    setBusy(true)
    try {
      await apiRequest(`/warnings/${w.id}/appeal`, { method: 'POST', body: JSON.stringify({ note: note.trim() }) })
      toast('Appeal sent. An admin will read it and reply.', 'success')
      setOpen(''); setNote('')
      load(false)
    } catch (e: any) { toast(e?.message || "Couldn't send your appeal", 'error') }
    setBusy(false)
  }

  return (
    <Layout>
      <style>{`
        .mw-body{display:grid;gap:14px;margin-top:var(--sp-5)}
        .mw-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-card);padding:var(--sp-4);display:grid;gap:8px}
        .mw-card.off{opacity:.75}
        .mw-top{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline}
        .mw-top b{font-size:15px;font-weight:600}
        .mw-top small{color:var(--text2);font-size:12.5px}
        .mw-card p{margin:0;font-size:14px;line-height:1.55;color:var(--text2)}
        .mw-card p strong{color:var(--text);font-weight:600}
        .mw-card a{color:var(--text);text-decoration:underline;text-underline-offset:2px}
        .mw-status{display:flex;align-items:flex-start;gap:12px}
        .mw-status-ic{width:36px;height:36px;flex-shrink:0;border-radius:var(--r-ctl);display:grid;place-items:center;font-size:18px}
        .mw-status b{display:block;font-size:15px;font-weight:600;color:var(--text)}
        .mw-status p{margin-top:2px}
        .mw-good{border-color:color-mix(in srgb,var(--green) 35%,var(--border))}
        .mw-good .mw-status-ic{background:color-mix(in srgb,var(--green) 14%,transparent);color:var(--green)}
        .mw-some .mw-status-ic{background:var(--card2);color:var(--text)}
        .mw-stop{border-color:color-mix(in srgb,var(--red) 45%,var(--border));background:color-mix(in srgb,var(--red) 6%,var(--card))}
        .mw-stop .mw-status-ic{background:color-mix(in srgb,var(--red) 14%,transparent);color:var(--red)}
        .mw-stop .ui-btn{margin-top:6px;justify-self:start}
        .mw-h{margin:8px 0 0;font-size:var(--fs-card);font-weight:600;color:var(--text)}
        .mw-rules{padding:0}
        .mw-rules summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:0 var(--sp-4);font-size:15px;font-weight:600;color:var(--text);cursor:pointer;list-style:none}
        .mw-rules summary::-webkit-details-marker{display:none}
        .mw-rules summary i{font-size:18px;color:var(--text2);transition:transform .2s ease}
        .mw-rules[open] summary i{transform:rotate(180deg)}
        .mw-rules ol{margin:0;padding:0 var(--sp-4) var(--sp-4);list-style:none;counter-reset:mw;display:grid;gap:10px}
        .mw-rules li{counter-increment:mw;display:grid;grid-template-columns:24px minmax(0,1fr);column-gap:10px;font-size:14px;line-height:1.55;color:var(--text2)}
        .mw-rules li::before{content:counter(mw);width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--card2);color:var(--text);font:600 12px var(--font);margin-top:1px}
        .mw-card textarea{width:100%;min-height:110px;height:auto;padding:12px 14px;line-height:1.5;resize:vertical}
        @media (max-width:767.98px){
          .mw-appeal .ui-btn{flex:1 1 0}
          .mw-stop .ui-btn{justify-self:stretch}
        }
      `}</style>
      <div className="ui-page">
        <div className="ui-narrow">
          <div className="ui-head">
            <div>
              <span className="ui-eyebrow">Account</span>
              <h1 className="ui-title">Warnings</h1>
              <p className="ui-sub">We warn accounts that send spam, fake proof or copied work. You can appeal any warning you think is wrong.</p>
            </div>
          </div>

          <div className="mw-body">
            {failed ? (
              <LoadError what="your warnings" onRetry={() => { load(true) }} />
            ) : !data ? (
              <div className="ui-sk" style={{ height: 96 }} />
            ) : data.suspended ? (
              <section className="mw-card mw-stop" role="status">
                <div className="mw-status">
                  <span className="mw-status-ic"><i className="ti ti-ban" aria-hidden="true" /></span>
                  <div>
                    <b>You can't take new jobs right now</b>
                    <p>Since {day(data.suspended.since)}. An admin will review your account. Work you already sent is still reviewed and paid, and you can still withdraw your money.</p>
                  </div>
                </div>
                <Link className="ui-btn ui-btn-ghost" to="/wallet"><i className="ti ti-wallet" aria-hidden="true" /> Withdraw your money</Link>
              </section>
            ) : data.recentWarnings === 0 ? (
              <section className="mw-card mw-good" role="status">
                <div className="mw-status">
                  <span className="mw-status-ic"><i className="ti ti-circle-check" aria-hidden="true" /></span>
                  <div>
                    <b>Good standing</b>
                    <p>0 warnings in the last {data.windowDays} days. Keep sending real work.</p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="mw-card mw-some" role="status">
                <div className="mw-status">
                  <span className="mw-status-ic"><i className="ti ti-alert-triangle" aria-hidden="true" /></span>
                  <div>
                    <b>{data.recentWarnings} {data.recentWarnings === 1 ? 'warning' : 'warnings'} in the last {data.windowDays} days</b>
                    <p>{data.recentWarnings === 1 ? 'Another one within 30 days moves your rank down one step.' : 'A 3rd one within 30 days stops new jobs until an admin reviews your account.'}</p>
                  </div>
                </div>
              </section>
            )}

            {data && data.warnings.length > 0 && <h2 className="mw-h">Your warnings</h2>}
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
                  <>
                    <p><strong>Your appeal ({day(w.appealedAt)}):</strong> {w.appealNote}{!w.withdrawnAt && !w.appealDecidedAt && ' An admin will reply.'}</p>
                    {w.appealReply && !w.withdrawnAt && <p><strong>Admin's reply{w.appealDecidedAt ? ` (${day(w.appealDecidedAt)})` : ''}:</strong> {w.appealReply} The warning stays.</p>}
                  </>
                ) : !w.withdrawnAt && (open === w.id ? (
                  <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                    <label className="ui-label" htmlFor={`ap-${w.id}`}>Why is this warning wrong?</label>
                    <textarea id={`ap-${w.id}`} className="ui-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Explain what happened. Add links to your work if they help." />
                    <div className="ui-actions mw-appeal">
                      <button type="button" className="ui-btn ui-btn-dark" onClick={() => send(w)} disabled={busy}>{busy ? 'Sending…' : 'Send appeal'}</button>
                      <button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setOpen(''); setNote('') }} disabled={busy}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="ui-actions mw-appeal" style={{ marginTop: 4 }}><button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setOpen(w.id); setNote('') }}>Appeal this warning</button></div>
                ))}
              </section>
            ))}

            <details className="mw-card mw-rules">
              <summary>How warnings work <i className="ti ti-chevron-down" aria-hidden="true" /></summary>
              <ol>
                <li><span>1st warning: a warning only.</span></li>
                <li><span>2nd warning within 30 days: your rank goes down one step.</span></li>
                <li><span>3rd warning within 30 days: you can't take new jobs until an admin reviews your account. You can still withdraw money you earned.</span></li>
                <li><span>Warnings older than 30 days, or withdrawn by an admin, don't count.</span></li>
              </ol>
            </details>
          </div>
        </div>
      </div>
    </Layout>
  )
}
