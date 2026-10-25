import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

/* Admin: posters asking for the Verified business badge (Settings > Business).
   Check the CAC number belongs to that business name and that the website or
   social page is theirs, then verify or reject with a reason. Verified
   businesses can lose the badge later the same way. The poster is told
   either way. */

type Status = 'PENDING' | 'APPROVED' | 'REJECTED'
interface Item {
  id: string; companyName: string; regNumber: string; website: string | null; socialUrl: string | null
  contactEmail: string; status: Status; note: string | null; reviewedAt: string | null; createdAt: string; updatedAt: string
  user: { id: string; username: string; firstName: string; lastName: string; email: string; createdAt: string; kycVerified: boolean; jobsPosted: number }
  // Other accounts that sent the same CAC number
  sameNumber?: { username: string | null; status: Status; companyName: string }[]
}

const TABS: [Status, string][] = [['PENDING', 'Waiting'], ['APPROVED', 'Verified'], ['REJECTED', 'Rejected']]
const ago = (d: string) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}
const host = (u: string) => { try { return new URL(u).host.replace(/^www\./, '') + new URL(u).pathname.replace(/\/$/, '') } catch { return u } }

function Row({ it, onDone }: { it: Item; onDone: (id: string, msg: string) => void }) {
  const [mode, setMode] = useState<null | 'approve' | 'reject'>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const name = `${it.user.firstName || ''} ${it.user.lastName || ''}`.trim() || it.user.username
  const removing = it.status === 'APPROVED'

  const act = async () => {
    if (mode === 'reject' && note.trim().length < 5) { setError('Give a reason. The poster will see it.'); return }
    setBusy(true); setError('')
    try {
      await apiRequest(`/brands/admin/${it.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify(mode === 'approve' ? { approve: true, seenAt: it.updatedAt } : { approve: false, note: note.trim(), seenAt: it.updatedAt }),
      })
      onDone(it.id, mode === 'approve' ? `${it.companyName} is verified. ${name} has been told.`
        : removing ? `Badge removed from ${it.companyName}. ${name} has been told why.` : `${it.companyName} rejected. ${name} has been told why.`)
    } catch (e: any) {
      setError(e?.message || 'Could not save this'); setBusy(false)
    }
  }

  return (
    <article className="aw-row ui-card">
      <header className="aw-top">
        <div className="aw-who">
          <b>{name} <Link to={`/user/${it.user.username}`} className="ak-handle">@{it.user.username}</Link></b>
          <span>{it.user.email} · {it.user.kycVerified ? 'ID verified' : 'ID not verified'} · {it.user.jobsPosted} {it.user.jobsPosted === 1 ? 'job' : 'jobs'} posted</span>
        </div>
        <time dateTime={it.updatedAt} title={new Date(it.updatedAt).toLocaleString()}>{ago(it.updatedAt)}</time>
      </header>

      <dl className="aw-amounts">
        <div><dt>Business name</dt><dd>{it.companyName}</dd></div>
        <div><dt>CAC number</dt><dd>{it.regNumber}</dd></div>
        <div><dt>Website</dt><dd>{it.website ? <a href={it.website} target="_blank" rel="noopener noreferrer nofollow">{host(it.website)}</a> : 'None'}</dd></div>
        <div><dt>Social page</dt><dd>{it.socialUrl ? <a href={it.socialUrl} target="_blank" rel="noopener noreferrer nofollow">{host(it.socialUrl)}</a> : 'None'}</dd></div>
        <div><dt>Contact email</dt><dd>{it.contactEmail}</dd></div>
      </dl>
      {!!it.sameNumber?.length && (
        <p className="aw-warn" role="note">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <span>
            This CAC number was also sent by {it.sameNumber.map((o, i) => (
              <span key={i}>{i > 0 && ', '}{o.username ? <Link to={`/user/${o.username}`}>@{o.username}</Link> : 'a deleted account'} ({o.status === 'APPROVED' ? 'verified' : o.status === 'PENDING' ? 'waiting' : 'rejected'})</span>
            ))}. CAC details are public, so anyone can copy them: make sure the website or page really belongs to this poster.
            {it.sameNumber.some((o) => o.status === 'APPROVED') && ' A number can only be verified for one account.'}
          </span>
        </p>
      )}
      <p className="aw-kind"><i className="ti ti-search" /> Look the CAC number up on the CAC public search and check it matches the business name. Then check the website or page belongs to the same business.</p>
      {it.status === 'REJECTED' && it.note && <p className="aw-note">{it.note}</p>}

      {it.status !== 'REJECTED' && (mode === null ? (
        <div className="aw-actions">
          {it.status === 'PENDING' && <button className="ui-btn ui-btn-dark" onClick={() => setMode('approve')}><i className="ti ti-check" /> Verify</button>}
          <button className="ui-btn ui-btn-ghost" onClick={() => setMode('reject')}><i className="ti ti-x" /> {removing ? 'Remove badge' : 'Reject'}</button>
        </div>
      ) : (
        <div className="aw-confirm">
          {mode === 'approve' ? (
            <p>The Verified business badge will show as "{it.companyName}" on {name}'s jobs and profile.</p>
          ) : (
            <>
              <label htmlFor={`note-${it.id}`}>Reason (the poster sees this)</label>
              <textarea id={`note-${it.id}`} className="ui-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={removing ? 'e.g. The business is no longer registered.' : "e.g. The CAC number doesn't match this business name."} />
            </>
          )}
          {error && <p className="aw-error" role="alert">{error}</p>}
          <div className="aw-actions">
            <button className={`ui-btn ${mode === 'approve' ? 'ui-btn-dark' : 'aw-danger'}`} onClick={act} disabled={busy}>
              {busy ? 'Saving…' : mode === 'approve' ? 'Confirm verify' : removing ? 'Confirm remove' : 'Confirm reject'}
            </button>
            <button className="ui-btn ui-btn-ghost" onClick={() => { setMode(null); setError('') }} disabled={busy}>Cancel</button>
          </div>
        </div>
      ))}
    </article>
  )
}

export default function AdminBrands() {
  const [status, setStatus] = useState<Status>('PENDING')
  const [items, setItems] = useState<Item[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const load = async (s = status, term = q) => {
    setLoading(true); setError('')
    const search = term.trim() ? `&q=${encodeURIComponent(term.trim())}` : ''
    try { setItems((await apiRequest<{ items: Item[] }>(`/brands/admin/queue?status=${s}${search}`)).items) }
    catch (e: any) { setItems(null); setError(e?.message || 'Could not load business checks') }
    setLoading(false)
  }
  useEffect(() => { load(status, q) }, [status])

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
        .aw-amounts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:0}
        .aw-amounts div{background:var(--card2,var(--bg));border:1px solid var(--border);border-radius:12px;padding:10px 12px;min-width:0}
        .aw-amounts dt{font-size:11px;color:var(--text3);margin-bottom:2px}
        .aw-amounts dd{margin:0;font-size:14px;font-weight:600;overflow-wrap:anywhere}
        .aw-amounts dd a{color:var(--text)}
        .aw-kind{margin:0;font-size:12.5px;color:var(--text2);display:flex;gap:6px;align-items:baseline;line-height:1.5}
        .aw-warn{margin:0;font-size:12.5px;line-height:1.5;padding:8px 10px;border-radius:10px;display:flex;gap:6px;align-items:baseline;background:color-mix(in srgb,var(--red) 10%,transparent);color:var(--text)}
        .aw-warn a{color:inherit;font-weight:600}
        .aw-search{display:flex;gap:8px;margin-bottom:14px}
        .aw-search .ui-input{flex:1;min-width:0}
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
          .aw-actions .ui-btn{flex:1}
        }
      `}</style>

      <div className="aw">
        <div className="aw-head">
          <div>
            <h1>Business checks</h1>
            <p>Posters asking for the Verified business badge. Check the CAC number and the website or social page, then verify or reject. Posters are notified either way.</p>
          </div>
          <button className="ui-btn ui-btn-ghost" onClick={() => load()} disabled={loading}><i className="ti ti-refresh" /> Refresh</button>
        </div>

        <div className="aw-tabs" role="tablist">
          {TABS.map(([s, label]) => (
            <button key={s} role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setNotice('') }}>{label}</button>
          ))}
        </div>

        <form className="aw-search" role="search" onSubmit={(e) => { e.preventDefault(); load(status, q) }}>
          <input className="ui-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username, business name or CAC number" aria-label="Search business checks" />
          <button className="ui-btn ui-btn-ghost" type="submit" disabled={loading}>Search</button>
        </form>

        {notice && <div className="aw-msg" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><i className="ti ti-x" /></button></div>}

        {loading && !items ? (
          <div className="aw-empty">Loading…</div>
        ) : error ? (
          <div className="aw-empty" role="alert">{error}</div>
        ) : !items || items.length === 0 ? (
          <div className="aw-empty">{status === 'PENDING' ? (q.trim() ? 'Nothing matches that search.' : 'Nothing waiting for review. All caught up.') : q.trim() ? 'Nothing matches that search.' : 'Nothing here yet.'}</div>
        ) : (
          <div className="aw-list">
            {items.map((it) => <Row key={it.id} it={it} onDone={onDone} />)}
          </div>
        )}
      </div>
    </Layout>
  )
}
