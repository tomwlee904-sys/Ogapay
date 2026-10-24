import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell, { AdminEmpty, AdminRefresh, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
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
    <article className="adm-row ui-card">
      <header className="adm-top">
        <div className="adm-who">
          <b>{it.companyName}</b>
          <span>{name} <Link to={`/user/${it.user.username}`} className="adm-handle">@{it.user.username}</Link></span>
          <span>{it.user.email} · <em className={`adm-pill ${it.user.kycVerified ? 'ok' : 'bad'}`}>{it.user.kycVerified ? 'ID verified' : 'ID not verified'}</em> · {it.user.jobsPosted} {it.user.jobsPosted === 1 ? 'job' : 'jobs'} posted</span>
        </div>
        <time dateTime={it.updatedAt} title={new Date(it.updatedAt).toLocaleString()}>{ago(it.updatedAt)}</time>
      </header>

      <dl className="adm-facts ab-facts">
        <div><dt>CAC number</dt><dd>{it.regNumber}</dd></div>
        <div><dt>Website</dt><dd>{it.website ? <a href={it.website} target="_blank" rel="noopener noreferrer nofollow">{host(it.website)}</a> : 'None'}</dd></div>
        <div><dt>Social page</dt><dd>{it.socialUrl ? <a href={it.socialUrl} target="_blank" rel="noopener noreferrer nofollow">{host(it.socialUrl)}</a> : 'None'}</dd></div>
        <div><dt>Contact email</dt><dd>{it.contactEmail}</dd></div>
      </dl>
      {!!it.sameNumber?.length && (
        <p className="adm-callout bad" role="note">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <span>
            This CAC number was also sent by {it.sameNumber.map((o, i) => (
              <span key={i}>{i > 0 && ', '}{o.username ? <Link to={`/user/${o.username}`}>@{o.username}</Link> : 'a deleted account'} ({o.status === 'APPROVED' ? 'verified' : o.status === 'PENDING' ? 'waiting' : 'rejected'})</span>
            ))}. CAC details are public, so anyone can copy them: make sure the website or page really belongs to this poster.
            {it.sameNumber.some((o) => o.status === 'APPROVED') && ' A number can only be verified for one account.'}
          </span>
        </p>
      )}
      {it.status === 'REJECTED' && it.note && <p className="adm-note">{it.note}</p>}

      {it.status !== 'REJECTED' && (mode === null ? (
        <div className="adm-actions">
          {it.status === 'PENDING' && <button className="ui-btn ui-btn-dark" onClick={() => setMode('approve')}><i className="ti ti-check" aria-hidden="true" /> Verify</button>}
          <button className="ui-btn ui-btn-ghost" onClick={() => setMode('reject')}><i className="ti ti-x" aria-hidden="true" /> {removing ? 'Remove badge' : 'Reject'}</button>
        </div>
      ) : (
        <div className="adm-confirm">
          {mode === 'approve' ? (
            <p>The Verified business badge will show as "{it.companyName}" on {name}'s jobs and profile.</p>
          ) : (
            <>
              <label htmlFor={`note-${it.id}`}>Reason (the poster sees this)</label>
              <textarea id={`note-${it.id}`} className="ui-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={removing ? 'e.g. The business is no longer registered.' : "e.g. The CAC number doesn't match this business name."} />
            </>
          )}
          {error && <p className="adm-error" role="alert">{error}</p>}
          <div className="adm-actions">
            <button className={`ui-btn ${mode === 'approve' ? 'ui-btn-dark' : 'adm-danger'}`} onClick={act} disabled={busy}>
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
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  // Waiting count (without a search), kept on its tab while another tab is open
  const [waiting, setWaiting] = useState<number | null>(null)

  const load = async (s = status, term = q) => {
    setLoading(true); setError('')
    const search = term.trim() ? `&q=${encodeURIComponent(term.trim())}` : ''
    try {
      const list = (await apiRequest<{ items: Item[] }>(`/brands/admin/queue?status=${s}${search}`)).items
      setItems(list)
      setCheckedAt(new Date())
      if (s === 'PENDING' && !search) setWaiting(list?.length ?? 0)
    }
    catch (e: any) { setItems(null); setError(e?.message || 'Could not load business checks') }
    setLoading(false)
  }
  useEffect(() => { load(status, q) }, [status])

  const onDone = (id: string, msg: string) => {
    setNotice(msg)
    setItems((l) => l && l.filter((x) => x.id !== id))
    if (status === 'PENDING') setWaiting((n) => (n == null ? n : Math.max(0, n - 1)))
  }

  const countFor = (s: Status) => (error ? null : status === s && items ? items.length : s === 'PENDING' ? waiting : null)

  return (
    <AdminShell
      section="brands"
      title="Business checks"
      sub="Posters asking for the Verified business badge. Posters are told either way."
      howLabel="How to check"
      how={<>
        <p>Look the CAC number up on the CAC public search and check it matches the business name. Then check the website or social page belongs to the same business.</p>
        <p>CAC details are public, so anyone can copy them. A number can only be verified for one account.</p>
      </>}
      actions={<AdminRefresh onClick={() => load()} loading={loading} />}
    >
      <style>{`
        .ab-facts{grid-template-columns:repeat(4,minmax(0,1fr))}
        .ab-facts dd{font-size:14px}
        @media (max-width:767.98px){.ab-facts{grid-template-columns:repeat(2,minmax(0,1fr))}}
      `}</style>
      <div className="adm-tabs even" role="tablist" aria-label="Business check status">
        {TABS.map(([s, label]) => {
          const n = countFor(s)
          return (
            <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setNotice('') }}>
              {label}{n != null && <em>{n}</em>}
            </button>
          )
        })}
      </div>

      <form className="adm-search" role="search" onSubmit={(e) => { e.preventDefault(); load(status, q) }}>
        <div className="ui-search">
          <i className="ti ti-search" aria-hidden="true" />
          <input className="ui-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, @user or CAC number" aria-label="Search by username, business name or CAC number" />
          <button className="ui-search-btn" type="submit" disabled={loading} aria-label="Search"><i className="ti ti-arrow-right" aria-hidden="true" /></button>
        </div>
      </form>

      {notice && <div className="adm-msg" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss"><i className="ti ti-x" aria-hidden="true" /></button></div>}

      {error ? (
        <LoadError what="business checks" onRetry={() => load()} />
      ) : loading && !items ? (
        <AdminSkeleton height={200} />
      ) : !items || items.length === 0 ? (
        q.trim() ? <AdminEmpty title="Nothing matches that search" />
          : status === 'PENDING' ? <AdminEmpty done title="Nothing waiting for review" at={checkedAt}>All caught up.</AdminEmpty>
          : <AdminEmpty title={status === 'APPROVED' ? 'No verified businesses yet' : 'No rejected checks'} />
      ) : (
        <div className="adm-list">
          {items.map((it) => <Row key={it.id} it={it} onDone={onDone} />)}
        </div>
      )}
    </AdminShell>
  )
}
