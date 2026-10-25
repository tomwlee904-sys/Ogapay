import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { fullCount, platformOf, tierFor } from '../lib/creators'

/* Admin: creator audiences sent with a screenshot (Instagram, TikTok, YouTube,
   Facebook). Check that the screenshot shows the handle and the count, correct
   the count if needed, then verify or reject. X is read from X and never
   lands here. The creator is notified either way. */

type Status = 'PENDING' | 'VERIFIED' | 'REJECTED'
interface Item {
  id: string; platform: string; platformName: string; handle: string; followers: number; tier: string | null
  status: Status; note: string | null; proofUrl: string | null; submittedAt: string
  user: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null; email: string }
}

const TABS: [Status, string][] = [['PENDING', 'Waiting'], ['VERIFIED', 'Verified'], ['REJECTED', 'Rejected']]
const ago = (d: string) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

function Row({ it, onDone }: { it: Item; onDone: (id: string, msg: string) => void }) {
  const [mode, setMode] = useState<null | 'approve' | 'reject'>(null)
  const [count, setCount] = useState(String(it.followers))
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const p = platformOf(it.platform)
  const name = `${it.user.firstName || ''} ${it.user.lastName || ''}`.trim() || it.user.username
  const n = parseInt(count.replace(/[^\d]/g, ''), 10) || 0

  const act = async () => {
    if (mode === 'reject' && note.trim().length < 5) { setError('Give a reason. The creator will see it.'); return }
    if (mode === 'approve' && n < 1) { setError('Enter the follower count shown in the screenshot.'); return }
    setBusy(true); setError('')
    try {
      await apiRequest(`/creators/admin/${it.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify(mode === 'approve' ? { approve: true, followers: n } : { approve: false, note: note.trim() }),
      })
      onDone(it.id, mode === 'approve' ? `${name}'s ${p.label} verified at ${fullCount(n)} ${p.unit}.` : `${name}'s ${p.label} rejected. They've been told why.`)
    } catch (e: any) {
      setError(e?.message || 'Could not save this'); setBusy(false)
    }
  }

  return (
    <article className="aw-row ui-card">
      <header className="aw-top">
        <div className="aw-who">
          <b>{name} <Link to={`/user/${it.user.username}`} className="ak-handle">@{it.user.username}</Link></b>
          <span>{it.user.email}</span>
        </div>
        <time dateTime={it.submittedAt} title={new Date(it.submittedAt).toLocaleString()}>{ago(it.submittedAt)}</time>
      </header>

      <div className="ac-body">
        {it.proofUrl ? (
          <a className="ac-proof" href={it.proofUrl} target="_blank" rel="noopener noreferrer" title="Open the screenshot full size">
            <img src={it.proofUrl} alt={`Screenshot of ${it.handle} on ${p.label}`} />
          </a>
        ) : <div className="ac-proof ac-none">No screenshot</div>}
        <dl className="aw-amounts ac-facts">
          <div><dt>Platform</dt><dd><i className={`ti ${p.icon}`} />&nbsp;{p.label}</dd></div>
          <div><dt>Handle</dt><dd><a href={p.url(it.handle)} target="_blank" rel="noopener noreferrer">@{it.handle}</a></dd></div>
          <div><dt>They say</dt><dd>{fullCount(it.followers)} {p.unit}{it.tier ? ` · ${it.tier}` : ''}</dd></div>
        </dl>
      </div>
      <p className="aw-kind"><i className="ti ti-search" /> Open the profile link and the screenshot. The handle and the count must match before you verify.</p>
      {it.status === 'REJECTED' && it.note && <p className="aw-note">{it.note}</p>}

      {it.status === 'PENDING' && (mode === null ? (
        <div className="aw-actions">
          <button className="ui-btn ui-btn-dark" onClick={() => setMode('approve')}><i className="ti ti-check" /> Verify</button>
          <button className="ui-btn ui-btn-ghost" onClick={() => setMode('reject')}><i className="ti ti-x" /> Reject</button>
        </div>
      ) : (
        <div className="aw-confirm">
          {mode === 'approve' ? (
            <>
              <label htmlFor={`cnt-${it.id}`}>{p.unit[0].toUpperCase() + p.unit.slice(1)} shown in the screenshot</label>
              <input id={`cnt-${it.id}`} className="ui-input" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/[^\d,]/g, ''))} />
              <p>{n > 0 ? `${fullCount(n)} ${p.unit}${tierFor(n) ? `, a ${tierFor(n)} creator` : ''}. Jobs that ask for up to this many will be open to them.` : ''}</p>
            </>
          ) : (
            <>
              <label htmlFor={`note-${it.id}`}>Reason (the creator sees this)</label>
              <textarea id={`note-${it.id}`} className="ui-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. The screenshot doesn't show the follower count." />
            </>
          )}
          {error && <p className="aw-error" role="alert">{error}</p>}
          <div className="aw-actions">
            <button className={`ui-btn ${mode === 'approve' ? 'ui-btn-dark' : 'aw-danger'}`} onClick={act} disabled={busy}>
              {busy ? 'Saving…' : mode === 'approve' ? 'Confirm verify' : 'Confirm reject'}
            </button>
            <button className="ui-btn ui-btn-ghost" onClick={() => { setMode(null); setError('') }} disabled={busy}>Cancel</button>
          </div>
        </div>
      ))}
    </article>
  )
}

export default function AdminCreators() {
  const [status, setStatus] = useState<Status>('PENDING')
  const [items, setItems] = useState<Item[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async (s = status) => {
    setLoading(true); setError('')
    try { setItems((await apiRequest<{ items: Item[] }>(`/creators/admin/queue?status=${s}`)).items) }
    catch (e: any) { setItems(null); setError(e?.message || 'Could not load creator checks') }
    setLoading(false)
  }
  useEffect(() => { load(status) }, [status])

  const onDone = (id: string, msg: string) => {
    setNotice(msg)
    setItems((l) => l && l.filter((x) => x.id !== id))
  }

  return (
    <Layout sidebar>
      <style>{`
        .aw{max-width:980px;margin:0 auto;padding:28px 24px 64px}
        .aw-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:18px}
        .aw-head h1{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:0 0 4px}
        .aw-head p{color:var(--text2);font-size:14px;margin:0;max-width:600px}
        .aw-tabs{display:flex;gap:6px;border-bottom:1px solid var(--border);margin-bottom:14px}
        .aw-tabs button{background:none;border:0;border-bottom:2px solid transparent;padding:10px 12px;font-family:inherit;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;margin-bottom:-1px}
        .aw-tabs button[aria-selected="true"]{color:var(--text);border-bottom-color:var(--text)}
        .aw-list{display:flex;flex-direction:column;gap:12px}
        .aw-row{padding:18px 20px;display:flex;flex-direction:column;gap:12px}
        .aw-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
        .aw-who{display:flex;flex-direction:column;gap:2px;min-width:0}
        .aw-who b{font-size:15px;font-weight:600}
        .aw-who span{font-size:12px;color:var(--text2);word-break:break-all}
        .ak-handle{font-weight:400;font-size:13px;color:var(--text2);text-decoration:none}
        .aw-top time{font-size:12px;color:var(--text3);white-space:nowrap}
        .ac-body{display:grid;grid-template-columns:180px 1fr;gap:14px;align-items:start}
        .ac-proof{display:block;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg2);aspect-ratio:3/4}
        .ac-proof img{width:100%;height:100%;object-fit:contain;display:block}
        .ac-none{display:grid;place-items:center;font-size:12px;color:var(--text3)}
        .aw-amounts{display:grid;grid-template-columns:1fr;gap:10px;margin:0}
        .aw-amounts div{background:var(--card2,var(--bg));border:1px solid var(--border);border-radius:12px;padding:10px 12px;min-width:0}
        .aw-amounts dt{font-size:11px;color:var(--text3);margin-bottom:2px}
        .aw-amounts dd{margin:0;font-size:15px;font-weight:600;display:flex;align-items:center;overflow-wrap:anywhere}
        .aw-amounts dd a{color:var(--text)}
        .aw-kind{margin:0;font-size:12.5px;color:var(--text2);display:flex;gap:6px;align-items:baseline;line-height:1.5}
        .aw-note{margin:0;font-size:12.5px;padding:8px 10px;border-radius:10px;background:var(--card2,var(--bg));color:var(--text2)}
        .aw-actions{display:flex;gap:8px;flex-wrap:wrap}
        .aw-confirm{border-top:1px solid var(--border);padding-top:12px;display:flex;flex-direction:column;gap:8px}
        .aw-confirm p{margin:0;font-size:13px;color:var(--text2);line-height:1.5}
        .aw-confirm label{font-size:12px;font-weight:500}
        .aw-confirm textarea{resize:vertical;min-height:64px;padding-top:10px}
        .aw-danger{background:var(--red);color:#fff}
        .aw-error{color:var(--red) !important;margin:0;font-size:13px}
        .aw-msg{padding:10px 14px;border-radius:12px;font-size:13px;margin-bottom:14px;background:color-mix(in srgb,var(--green) 12%,transparent);color:var(--text);display:flex;justify-content:space-between;gap:10px}
        .aw-msg button{background:none;border:0;color:var(--text2);cursor:pointer}
        .aw-empty{padding:48px 20px;text-align:center;color:var(--text2);font-size:14px}
        @media (max-width:640px){
          .aw{padding:20px 16px 56px}
          .ac-body{grid-template-columns:1fr}
          .ac-proof{max-width:240px}
          .aw-actions .ui-btn{flex:1}
        }
      `}</style>

      <div className="aw">
        <div className="aw-head">
          <div>
            <h1>Creator checks</h1>
            <p>Verify the follower counts creators send for Instagram, TikTok, YouTube and Facebook. X is read from X and doesn't need checking. Creators are notified either way.</p>
          </div>
          <button className="ui-btn ui-btn-ghost" onClick={() => load()} disabled={loading}><i className="ti ti-refresh" /> Refresh</button>
        </div>

        <div className="aw-tabs" role="tablist">
          {TABS.map(([s, label]) => (
            <button key={s} role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setNotice('') }}>{label}</button>
          ))}
        </div>

        {notice && <div className="aw-msg" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><i className="ti ti-x" /></button></div>}

        {loading && !items ? (
          <div className="aw-empty">Loading…</div>
        ) : error ? (
          <div className="aw-empty" role="alert">{error}</div>
        ) : !items || items.length === 0 ? (
          <div className="aw-empty">{status === 'PENDING' ? 'Nothing waiting for review. All caught up.' : 'Nothing here yet.'}</div>
        ) : (
          <div className="aw-list">{items.map((it) => <Row key={it.id} it={it} onDone={onDone} />)}</div>
        )}
      </div>
    </Layout>
  )
}
