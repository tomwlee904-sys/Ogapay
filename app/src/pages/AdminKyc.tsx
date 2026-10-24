import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell, { AdminEmpty, AdminRefresh, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import { withdrawLimit } from '../lib/wallet'

/* Admin: identity checks. Submissions land here when Didit couldn't confirm
   them automatically (a NIN when NIMC or Didit didn't answer, an ID + selfie
   check Didit sent for review). Approved ones can be revoked (identities were
   approved without a real check until 2026-09-26). */

type Status = 'SUBMITTED' | 'APPROVED' | 'REJECTED'
interface Rec {
  id: string; userId: string; status: Status; kycTier: number; idType: string | null; idNumber: string | null
  dateOfBirth: string | null; provider: string | null; providerRef: string | null; rejectionReason: string | null
  verifiedAt: string | null; submittedAt: string | null; updatedAt: string
  user: { id: string; email: string; username: string; firstName: string; lastName: string; phone: string | null; createdAt: string; isEmailVerified: boolean; isBanned: boolean }
  sameNumber: { userId: string; username: string | null; status: string }[]
}
interface Page { records: Rec[]; total: number; page: number; pages: number; counts: Partial<Record<Status, number>> }

const TABS: [Status, string][] = [['SUBMITTED', 'Waiting'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected']]
// Daily withdrawal limits per level, from the same rule the Withdraw screen and FAQ use
const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`
const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const ago = (d: string) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="adm-copy" aria-label={`Copy ${text}`}
      onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200) }}>
      <i className={`ti ti-${done ? 'check' : 'copy'}`} aria-hidden="true" />
    </button>
  )
}

function Row({ r, onDone }: { r: Rec; onDone: (id: string, msg: string) => void }) {
  const [mode, setMode] = useState<null | 'approve' | 'reject' | 'revoke'>(null)
  const [reason, setReason] = useState('')
  const [level, setLevel] = useState(r.idType === 'BVN' || r.provider === 'didit' ? 2 : Math.max(1, r.kycTier || 1))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const name = `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || r.user.username
  const clash = r.sameNumber.filter((x) => x.status === 'APPROVED')

  const act = async () => {
    if (mode !== 'approve' && reason.trim().length < 5) { setError('Give a reason. The user will see it.'); return }
    setBusy(true); setError('')
    try {
      await apiRequest(`/kyc/admin/${r.userId}/review`, {
        method: 'PATCH',
        body: JSON.stringify(mode === 'approve' ? { action: 'approve', tierUpgrade: level } : { action: mode, rejectionReason: reason.trim() }),
      })
      onDone(r.id, mode === 'approve' ? `${name} approved at level ${level}.` : mode === 'revoke' ? `${name}'s verification removed. They've been told why.` : `${name}'s submission rejected. They've been told why.`)
    } catch (e: any) {
      setError(e?.message || 'Could not save this')
      setBusy(false)
    }
  }

  return (
    <article className="adm-row ui-card">
      <header className="adm-top">
        <div className="adm-who">
          <b>{name} <Link to={`/user/${r.user.username}`} className="adm-handle">@{r.user.username}</Link></b>
          <span>
            {r.user.email}
            <em className={`adm-pill ${r.user.isEmailVerified ? 'ok' : 'bad'}`}>{r.user.isEmailVerified ? 'email verified' : 'email not verified'}</em>
            {r.user.isBanned && <em className="adm-pill bad">closed</em>}
          </span>
          <span>Joined {day(r.user.createdAt)}{r.user.phone ? ` · ${r.user.phone}` : ''}</span>
        </div>
        <time dateTime={r.submittedAt || r.updatedAt} title={new Date(r.submittedAt || r.updatedAt).toLocaleString()}>{ago(r.submittedAt || r.updatedAt)}</time>
      </header>

      <dl className="adm-facts">
        <div className="adm-span"><dt>{r.idType || 'ID'}</dt><dd className="adm-mono">{r.idNumber || '—'}{r.idNumber && <Copy text={r.idNumber} />}</dd></div>
        <div><dt>Date of birth</dt><dd>{day(r.dateOfBirth)}</dd></div>
        <div><dt>{r.status === 'APPROVED' ? 'Level' : 'Asks for'}</dt><dd>{r.status === 'APPROVED' ? `Level ${r.kycTier}` : r.idType === 'BVN' || r.provider === 'didit' ? 'Level 2' : 'Level 1'}</dd></div>
      </dl>

      {r.sameNumber.length > 0 && (
        <p className="adm-callout bad" role="note">
          <i className="ti ti-alert-triangle" aria-hidden="true" /><span>The same number is on {r.sameNumber.length === 1 ? 'another account' : `${r.sameNumber.length} other accounts`}:{' '}
          {r.sameNumber.map((x, i) => <span key={x.userId}>{i > 0 && ', '}<Link to={`/user/${x.username}`}>@{x.username}</Link> ({x.status.toLowerCase()})</span>)}</span>
        </p>
      )}
      {r.status === 'APPROVED' && (
        !r.providerRef
          ? <p className="adm-kind"><i className="ti ti-alert-circle" /> Approved before automatic checks were in place (26 Sept 2026), so it may never have been checked. Check the number by hand and revoke it if it doesn't match.</p>
          : <p className="adm-kind"><i className="ti ti-circle-check" /> {r.provider === 'admin' ? 'Approved by an admin' : r.provider === 'didit' ? 'ID + selfie checked by Didit' : r.provider === 'didit-nin' ? 'NIN confirmed with NIMC by Didit' : 'Checked by Dojah'}{r.verifiedAt ? ` on ${day(r.verifiedAt)}` : ''}.</p>
      )}
      {r.status === 'REJECTED' && r.rejectionReason && <p className="adm-note">{r.rejectionReason}</p>}
      {r.status === 'SUBMITTED' && (
        <p className="adm-kind"><i className="ti ti-search" /> {r.provider === 'didit'
          ? 'Didit sent this ID + selfie check for review. Open it in the Didit console before approving.'
          : "This NIN wasn't confirmed automatically (Didit or NIMC didn't answer, or the check is off). Make sure it's real before approving."}</p>
      )}

      {r.status !== 'REJECTED' && (mode === null ? (
        <div className="adm-actions">
          {r.status === 'SUBMITTED' ? (
            <>
              <button className="ui-btn ui-btn-dark" onClick={() => setMode('approve')} disabled={clash.length > 0} aria-describedby={clash.length ? `clash-${r.id}` : undefined}><i className="ti ti-check" aria-hidden="true" /> Approve</button>
              <button className="ui-btn ui-btn-ghost" onClick={() => setMode('reject')}><i className="ti ti-x" aria-hidden="true" /> Reject</button>
              {clash.length > 0 && <p className="adm-kind ak-blocked" id={`clash-${r.id}`}>Approve is off: this number is already verified on another account.</p>}
            </>
          ) : (
            <button className="ui-btn ui-btn-ghost" onClick={() => setMode('revoke')}><i className="ti ti-shield-x" /> Revoke verification</button>
          )}
        </div>
      ) : (
        <div className="adm-confirm">
          {mode === 'approve' ? (
            <>
              <p>{name} will be able to withdraw and send money. An approved NIN or ID earns the ₦1,000 sign-up bonus if they haven't had it; the inviter's referral bonus still waits for their first paid job.</p>
              <label htmlFor={`lvl-${r.id}`}>Level</label>
              <select id={`lvl-${r.id}`} className="ui-select" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                <option value={1}>Level 1: NIN or bank name ({naira(withdrawLimit(1))} a day)</option>
                <option value={2}>Level 2: Didit ID + selfie check ({naira(withdrawLimit(2))} a day)</option>
                <option value={3}>Level 3: ID documents ({naira(withdrawLimit(3))} a day)</option>
              </select>
            </>
          ) : (
            <>
              <p>{mode === 'revoke' ? `${name} goes back to level 0: no withdrawals or transfers until they verify again.` : `${name} can submit again.`}</p>
              <label htmlFor={`reason-${r.id}`}>Reason (the user sees this)</label>
              <textarea id={`reason-${r.id}`} className="ui-input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder={mode === 'revoke' ? 'e.g. We couldn’t confirm this NIN belongs to you.' : 'e.g. The date of birth doesn’t match the NIN record.'} />
            </>
          )}
          {error && <p className="adm-error" role="alert">{error}</p>}
          <div className="adm-actions">
            <button className={`ui-btn ${mode === 'approve' ? 'ui-btn-dark' : 'adm-danger'}`} onClick={act} disabled={busy}>
              {busy ? 'Saving…' : mode === 'approve' ? 'Confirm approve' : mode === 'revoke' ? 'Confirm revoke' : 'Confirm reject'}
            </button>
            <button className="ui-btn ui-btn-ghost" onClick={() => { setMode(null); setError('') }} disabled={busy}>Cancel</button>
          </div>
        </div>
      ))}
    </article>
  )
}

export default function AdminKyc() {
  const [status, setStatus] = useState<Status>('SUBMITTED')
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [data, setData] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  const load = async (s = status, p = page, qq = search) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ status: s, page: String(p) })
      if (qq) params.set('search', qq)
      setData(await apiRequest<Page>(`/kyc/admin/pending?${params}`))
      setCheckedAt(new Date())
    } catch (e: any) {
      setData(null)
      setError(e?.message || 'Could not load identity checks')
    }
    setLoading(false)
  }

  useEffect(() => { load(status, page, search) }, [status, page, search])

  const onDone = (id: string, msg: string) => {
    setNotice(msg)
    setData((d) => d && { ...d, records: d.records.filter((x) => x.id !== id), total: d.total - 1 })
    load(status, page, search)
  }

  return (
    <AdminShell
      section="kyc"
      title="Identity checks"
      sub="Checks Didit couldn't confirm automatically. Users are told either way."
      how={<>
        <p>Approve or reject identity checks Didit couldn't confirm automatically (a NIN when NIMC or Didit didn't answer, or an ID + selfie check Didit sent for review).</p>
        <p>Approved checks can be revoked when they shouldn't stand. Daily withdrawal limits: Level 1 {naira(withdrawLimit(1))}, Level 2 {naira(withdrawLimit(2))}, Level 3 {naira(withdrawLimit(3))}.</p>
      </>}
      actions={<AdminRefresh onClick={() => load()} loading={loading} />}
    >
      <style>{`
        .ak-blocked{flex-basis:100%;font-size:12.5px}
      `}</style>
      <div className="adm-tabs even" role="tablist" aria-label="Identity check status">
        {TABS.map(([s, label]) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setPage(1); setNotice('') }}>
            {label}{data && !error && <em>{data.counts?.[s] ?? 0}</em>}
          </button>
        ))}
      </div>

      <form className="adm-search" role="search" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()) }}>
        <div className="ui-search">
          <i className="ti ti-search" aria-hidden="true" />
          <input className="ui-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email, username, NIN or BVN" aria-label="Search by email, username or exact NIN/BVN" />
          <button type="submit" className="ui-search-btn" aria-label="Search"><i className="ti ti-arrow-right" aria-hidden="true" /></button>
        </div>
        {search && <button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setQ(''); setSearch('') }}>Clear</button>}
      </form>

      {notice && <div className="adm-msg" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss"><i className="ti ti-x" aria-hidden="true" /></button></div>}

      {error ? (
        <LoadError what="identity checks" onRetry={() => load()} />
      ) : loading && !data ? (
        <AdminSkeleton />
      ) : !data || data.records.length === 0 ? (
        search ? <AdminEmpty title="Nothing matches that search">NIN and BVN searches need the exact number.</AdminEmpty>
          : status === 'SUBMITTED' ? <AdminEmpty done title="Nothing waiting for review" at={checkedAt}>All caught up.</AdminEmpty>
          : <AdminEmpty title={status === 'APPROVED' ? 'No approved checks yet' : 'No rejected checks'} />
      ) : (
        <div className="adm-list">
          {data.records.map((r) => <Row key={r.id} r={r} onDone={onDone} />)}
        </div>
      )}

      {data && !error && data.pages > 1 && (
        <div className="adm-pager">
          <button type="button" className="ui-btn ui-btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><i className="ti ti-arrow-left" aria-hidden="true" /> Previous</button>
          <span>Page {page} of {data.pages}</span>
          <button type="button" className="ui-btn ui-btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next <i className="ti ti-arrow-right" aria-hidden="true" /></button>
        </div>
      )}
    </AdminShell>
  )
}
