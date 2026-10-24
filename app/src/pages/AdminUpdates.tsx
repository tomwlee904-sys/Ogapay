import { useEffect, useState } from 'react'
import AdminShell, { AdminEmpty } from '../components/AdminShell'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'
import { renderJobText } from '../lib/jobText'

/* Admin: platform updates, like wurk.fun's "Store update" / "Rank update".
   One update goes to every user's Notifications, and to phones with push
   alerts on (POST /updates). Past updates are listed below (GET /updates). */

type Update = { id: string; title: string; body: string; createdAt: string }

export default function AdminUpdates() {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [preview, setPreview] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [past, setPast] = useState<Update[] | null>(null)

  const [pastFailed, setPastFailed] = useState(false)
  const load = () => { setPastFailed(false); return apiRequest<Update[]>('/updates', { auth: false }).then((l) => setPast(Array.isArray(l) ? l : [])).catch(() => { setPast(null); setPastFailed(true) }) }
  useEffect(() => { load() }, [])

  const ready = title.trim().length >= 3 && body.trim().length >= 20
  const send = async () => {
    setBusy(true)
    try {
      const r = await apiRequest<{ sentTo: number }>('/updates', { method: 'POST', body: JSON.stringify({ title: title.trim(), body: body.trim() }) })
      toast(`Sent to ${Number(r.sentTo).toLocaleString('en-US')} people`, 'success')
      setTitle(''); setBody(''); setPreview(false); setConfirming(false); load()
    } catch (e: any) { toast(e?.message || "Couldn't send the update", 'error') }
    setBusy(false)
  }

  const previewBox = (
    <div className="au-preview" aria-live="polite">
      {ready
        ? <><h3>{title}</h3><div className="au-body" dangerouslySetInnerHTML={{ __html: renderJobText(body) }} /></>
        : <p className="au-hint" style={{ margin: 0 }}>Your update shows here as people will read it.</p>}
    </div>
  )

  return (
    <AdminShell
      section="updates"
      title="Platform updates"
      sub="Tell everyone what's new, in their Notifications and as a push alert."
    >
      <style>{`
        .au-hint{font-size:12.5px;color:var(--text2);line-height:1.5}
        .au-req{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text2)}
        .au-req.ok{color:var(--green)}
        .au textarea.ui-input{min-height:220px}
        .au-preview{border:1px dashed var(--border2);border-radius:var(--r-md);padding:16px;min-width:0}
        .au-preview h3{margin:0 0 8px;font-size:15px;font-weight:600}
        .au-confirm{background:color-mix(in srgb,var(--gold) 12%,transparent);border-radius:var(--r-ctl);padding:12px 14px;font-size:14px;line-height:1.5}
        .au-past{display:grid;gap:10px}
        .au-past details{border:1px solid var(--border);border-radius:var(--r-md);padding:12px 14px}
        .au-past summary{cursor:pointer;font-weight:600;font-size:14px}
        .au-past time{display:block;font-size:12.5px;color:var(--text2);font-weight:400;margin-top:2px}
        .au-side-only{display:none}
        @media (min-width:1024px){.au-side-only{display:grid}.au-inline-preview{display:none}}
        .au-body p{margin:0 0 10px}.au-body ul,.au-body ol{margin:0 0 10px;padding-left:20px}.au-body ul{list-style:disc}.au-body ol{list-style:decimal}.au-body li{margin:4px 0}.au-body a{color:var(--text);text-decoration:underline;text-underline-offset:2px;font-weight:600}
      `}</style>
      <div className="ui-split au">
        <div className="adm-stack">
          <section className="ui-card adm-card" aria-labelledby="au-new">
            <h2 className="adm-card-title" id="au-new">New update</h2>
            <div className="adm-fields">
              <div className="adm-field">
                <label className="ui-label" htmlFor="au-title">Title</label>
                <input id="au-title" className="ui-input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Store update" />
              </div>
              <div className="adm-field">
                <label className="ui-label" htmlFor="au-body">Message</label>
                <textarea id="au-body" className="ui-input" value={body} maxLength={6000} onChange={(e) => setBody(e.target.value)}
                  placeholder={'What changed and what people should do.\n\n- Use dashes for lists\n- **bold** for what matters\n- [links](https://ogapay.app/…) to the page'} />
                <span className="au-hint">{body.length.toLocaleString()} / 6,000 · **bold**, - lists and [links](https://…) work</span>
              </div>
            </div>
            <p className={`au-req${ready ? ' ok' : ''}`} style={{ margin: 0 }}>
              <i className={`ti ${ready ? 'ti-circle-check' : 'ti-info-circle'}`} aria-hidden="true" />
              {ready ? 'Ready to preview and send' : 'Add a title and at least 20 characters to preview or send'}
            </p>
            {!confirming && (
              <div className="adm-actions">
                <button type="button" className="ui-btn ui-btn-ghost au-inline-preview" onClick={() => setPreview((v) => !v)} disabled={!ready}>{preview ? 'Hide preview' : 'Preview'}</button>
                <button type="button" className="ui-btn ui-btn-dark" onClick={() => setConfirming(true)} disabled={!ready}>Send to everyone</button>
              </div>
            )}
            {preview && ready && <div className="au-inline-preview">{previewBox}</div>}
            {confirming && (
              <div className="au-confirm" role="alert">
                This goes to <b>every OgaPay user</b> right away and can't be taken back. Send it?
                <div className="adm-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="ui-btn ui-btn-dark" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Yes, send it'}</button>
                  <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Not yet</button>
                </div>
              </div>
            )}
          </section>

          <section className="ui-card adm-card" aria-labelledby="au-past">
            <h2 className="adm-card-title" id="au-past">Sent updates</h2>
            {pastFailed ? <LoadError what="sent updates" onRetry={load} />
              : past === null ? <div className="ui-sk" style={{ height: 96 }} />
              : past.length === 0 ? <AdminEmpty compact title="No updates sent yet" />
              : (
                <div className="au-past">
                  {past.map((u) => (
                    <details key={u.id}>
                      <summary>{u.title}<time>{new Date(u.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></summary>
                      <div className="au-body" style={{ marginTop: 10 }} dangerouslySetInnerHTML={{ __html: renderJobText(u.body) }} />
                    </details>
                  ))}
                </div>
              )}
          </section>
        </div>
        <aside className="ui-split-side au-side-only" aria-label="Live preview">
          <section className="ui-card adm-card">
            <h2 className="adm-card-title">Preview</h2>
            {previewBox}
          </section>
        </aside>
      </div>
    </AdminShell>
  )
}
