import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell, { AdminEmpty, AdminRefresh, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
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
    <article className="adm-row ui-card">
      <header className="adm-top">
        <div className="adm-who">
          <b>{name} <Link to={`/user/${it.user.username}`} className="adm-handle">@{it.user.username}</Link></b>
          <span>{it.user.email}</span>
        </div>
        <time dateTime={it.submittedAt} title={new Date(it.submittedAt).toLocaleString()}>{ago(it.submittedAt)}</time>
      </header>

      <div className="ac-body">
        {it.proofUrl ? (
          <a className="ac-proof" href={it.proofUrl} target="_blank" rel="noopener noreferrer" title="Open the screenshot full size" aria-label={`Open the screenshot of @${it.handle} full size`}>
            <img src={it.proofUrl} alt={`Screenshot of ${it.handle} on ${p.label}`} />
          </a>
        ) : <div className="ac-proof ac-none">No screenshot</div>}
        <dl className="ac-facts">
          <div><dt>Platform</dt><dd><i className={`ti ${p.icon}`} />&nbsp;{p.label}</dd></div>
          <div><dt>Handle</dt><dd><a href={p.url(it.handle)} target="_blank" rel="noopener noreferrer">@{it.handle}</a></dd></div>
          <div><dt>They say</dt><dd>{fullCount(it.followers)} {p.unit}{it.tier ? ` · ${it.tier}` : ''}</dd></div>
        </dl>
      </div>
      {it.status === 'REJECTED' && it.note && <p className="adm-note">{it.note}</p>}

      {it.status === 'PENDING' && (mode === null ? (
        <div className="adm-actions">
          <button className="ui-btn ui-btn-dark" onClick={() => setMode('approve')}><i className="ti ti-check" aria-hidden="true" /> Verify</button>
          <button className="ui-btn ui-btn-ghost" onClick={() => setMode('reject')}><i className="ti ti-x" aria-hidden="true" /> Reject</button>
        </div>
      ) : (
        <div className="adm-confirm">
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
          {error && <p className="adm-error" role="alert">{error}</p>}
          <div className="adm-actions">
            <button className={`ui-btn ${mode === 'approve' ? 'ui-btn-dark' : 'adm-danger'}`} onClick={act} disabled={busy}>
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
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  // Waiting count, kept on its tab while another tab is open
  const [waiting, setWaiting] = useState<number | null>(null)

  const load = async (s = status) => {
    setLoading(true); setError('')
    try {
      const list = (await apiRequest<{ items: Item[] }>(`/creators/admin/queue?status=${s}`)).items
      setItems(list)
      setCheckedAt(new Date())
      if (s === 'PENDING') setWaiting(list?.length ?? 0)
    }
    catch (e: any) { setItems(null); setError(e?.message || 'Could not load creator checks') }
    setLoading(false)
  }
  useEffect(() => { load(status) }, [status])

  const onDone = (id: string, msg: string) => {
    setNotice(msg)
    setItems((l) => l && l.filter((x) => x.id !== id))
    if (status === 'PENDING') setWaiting((n) => (n == null ? n : Math.max(0, n - 1)))
  }

  const countFor = (s: Status) => (error ? null : status === s && items ? items.length : s === 'PENDING' ? waiting : null)

  return (
    <AdminShell
      section="creators"
      title="Creator checks"
      sub="Check follower screenshots before you verify. Creators are told either way."
      howLabel="How to check"
      how={<>
        <p>Creators send a screenshot for Instagram, TikTok, YouTube and Facebook. X is read from X and never lands here.</p>
        <p>Open the profile link and the screenshot. <b>The handle and the count must match</b> before you verify. Correct the count if the screenshot shows a different number.</p>
      </>}
      actions={<AdminRefresh onClick={() => load()} loading={loading} />}
    >
      <style>{`
        .ac-body{display:grid;grid-template-columns:180px minmax(0,1fr);gap:16px;align-items:start}
        .ac-proof{display:block;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden;background:var(--card2);aspect-ratio:3/4}
        .ac-proof img{width:100%;height:100%;object-fit:contain;display:block}
        .ac-none{display:grid;place-items:center;font-size:12.5px;color:var(--text2);text-align:center;padding:8px}
        .ac-facts{display:grid;gap:10px;margin:0}
        .ac-facts div{min-width:0}
        .ac-facts dt{font-size:12px;color:var(--text2);margin-bottom:1px}
        .ac-facts dd{margin:0;font-size:15px;font-weight:600;display:flex;align-items:center;gap:4px;overflow-wrap:anywhere;min-width:0}
        .ac-facts dd a{color:var(--text)}
        @media (max-width:1023.98px){.ac-body{grid-template-columns:140px minmax(0,1fr)}}
        @media (max-width:767.98px){
          .ac-body{grid-template-columns:104px minmax(0,1fr);gap:12px}
          .ac-facts{gap:8px}
          .ac-facts dd{font-size:14px}
        }
      `}</style>
      <div className="adm-tabs even" role="tablist" aria-label="Creator check status">
        {TABS.map(([s, label]) => {
          const n = countFor(s)
          return (
            <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setNotice('') }}>
              {label}{n != null && <em>{n}</em>}
            </button>
          )
        })}
      </div>

      {notice && <div className="adm-msg" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss"><i className="ti ti-x" aria-hidden="true" /></button></div>}

      {error ? (
        <LoadError what="creator checks" onRetry={() => load()} />
      ) : loading && !items ? (
        <AdminSkeleton height={220} />
      ) : !items || items.length === 0 ? (
        status === 'PENDING'
          ? <AdminEmpty done title="Nothing waiting for review" at={checkedAt}>All caught up.</AdminEmpty>
          : <AdminEmpty title={status === 'VERIFIED' ? 'No verified creators yet' : 'No rejected checks'} />
      ) : (
        <div className="adm-list">{items.map((it) => <Row key={it.id} it={it} onDone={onDone} />)}</div>
      )}
    </AdminShell>
  )
}
