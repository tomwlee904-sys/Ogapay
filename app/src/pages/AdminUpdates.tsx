import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
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

  const load = () => apiRequest<Update[]>('/updates', { auth: false }).then((l) => setPast(Array.isArray(l) ? l : [])).catch(() => setPast([]))
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

  return (
    <Layout>
      <style>{`
        .au{max-width:calc(760px + 2 * var(--gutter));margin:0 auto;padding:24px var(--gutter) 60px;display:grid;gap:16px}
        .au-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px;display:grid;gap:12px}
        .au-card h2{margin:0;font-size:16px;font-weight:600}
        .au label{font-size:13px;font-weight:600;color:var(--text)}
        .au input,.au textarea{width:100%;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--bg2);color:var(--text);font:15px/1.6 inherit;font-family:inherit}
        .au textarea{min-height:260px;resize:vertical}
        .au-hint{font-size:12px;color:var(--text2)}
        .au-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .au-preview{border:1px dashed var(--border);border-radius:12px;padding:16px}
        .au-preview h3{margin:0 0 8px;font-size:15px}
        .au-confirm{background:rgba(245,158,11,.1);border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.5}
        .au-past{display:grid;gap:10px}
        .au-past details{border:1px solid var(--border);border-radius:12px;padding:12px 14px}
        .au-past summary{cursor:pointer;font-weight:600;font-size:14px}
        .au-past time{display:block;font-size:12px;color:var(--text2);font-weight:400;margin-top:2px}
        .au-body p{margin:0 0 10px}.au-body ul,.au-body ol{margin:0 0 10px;padding-left:20px}.au-body ul{list-style:disc}.au-body ol{list-style:decimal}.au-body li{margin:4px 0}.au-body a{color:var(--text);text-decoration:underline;text-underline-offset:2px;font-weight:600}
      `}</style>
      <div className="au">
        <div>
          <h1 className="ui-title" style={{ margin: 0 }}>Platform updates</h1>
          <p className="au-hint" style={{ fontSize: 14, marginTop: 6 }}>Tell everyone what's new. Each update goes to every user's Notifications, and to phones with push alerts on.</p>
        </div>

        <section className="au-card" aria-labelledby="au-new">
          <h2 id="au-new">New update</h2>
          <label htmlFor="au-title">Title</label>
          <input id="au-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Store update" />
          <label htmlFor="au-body">Message</label>
          <textarea id="au-body" value={body} maxLength={6000} onChange={(e) => setBody(e.target.value)}
            placeholder={'What changed and what people should do.\n\n- Use dashes for lists\n- **bold** for what matters\n- [links](https://ogapay.app/…) to the page'} />
          <span className="au-hint">{body.length.toLocaleString()} / 6,000 · **bold**, - lists and [links](https://…) work</span>
          <div className="au-row">
            <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setPreview((v) => !v)} disabled={!ready}>{preview ? 'Hide preview' : 'Preview'}</button>
            {!confirming && <button type="button" className="ui-btn ui-btn-dark" onClick={() => setConfirming(true)} disabled={!ready}>Send to everyone</button>}
          </div>
          {preview && ready && (
            <div className="au-preview"><h3>{title}</h3><div className="au-body" dangerouslySetInnerHTML={{ __html: renderJobText(body) }} /></div>
          )}
          {confirming && (
            <div className="au-confirm" role="alert">
              This goes to <b>every OgaPay user</b> right away and can't be taken back. Send it?
              <div className="au-row" style={{ marginTop: 10 }}>
                <button type="button" className="ui-btn ui-btn-dark" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Yes, send it'}</button>
                <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Not yet</button>
              </div>
            </div>
          )}
        </section>

        <section className="au-card" aria-labelledby="au-past">
          <h2 id="au-past">Sent updates</h2>
          {past === null ? <span className="au-hint">Loading…</span> : past.length === 0 ? <span className="au-hint">None yet.</span> : (
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
    </Layout>
  )
}
