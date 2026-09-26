import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

/* Admin: identity checks. Submissions land here when Dojah couldn't check
   them automatically. Approved ones can be revoked (identities were approved
   without a real check until 2026-09-26). */

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
    <button type="button" className="aw-copy" aria-label={`Copy ${text}`}
      onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200) }}>
      <i className={`ti ti-${done ? 'check' : 'copy'}`} />
    </button>
  )
}

function Row({ r, onDone }: { r: Rec; onDone: (id: string, msg: string) => void }) {
  const [mode, setMode] = useState<null | 'approve' | 'reject' | 'revoke'>(null)
  const [reason, setReason] = useState('')
  const [level, setLevel] = useState(r.idType === 'BVN' ? 2 : Math.max(1, r.kycTier || 1))
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
    <article className="aw-row ui-card">
      <header className="aw-top">
        <div className="aw-who">
          <b>{name} <Link to={`/user/${r.user.username}`} className="ak-handle">@{r.user.username}</Link></b>
          <span>
            {r.user.email}
            <em className={r.user.isEmailVerified ? 'ok' : ''}>{r.user.isEmailVerified ? 'email verified' : 'email not verified'}</em>
            {r.user.isBanned && <em>closed</em>}
          </span>
          <span>Joined {day(r.user.createdAt)}{r.user.phone ? ` · ${r.user.phone}` : ''}</span>
        </div>
        <time dateTime={r.submittedAt || r.updatedAt} title={new Date(r.submittedAt || r.updatedAt).toLocaleString()}>{ago(r.submittedAt || r.updatedAt)}</time>
      </header>

      <dl className="aw-amounts">
        <div><dt>{r.idType || 'ID'}</dt><dd className="aw-mono">{r.idNumber || '—'}{r.idNumber && <Copy text={r.idNumber} />}</dd></div>
        <div><dt>Date of birth</dt><dd>{day(r.dateOfBirth)}</dd></div>
        <div><dt>{r.status === 'APPROVED' ? 'Level' : 'Asks for'}</dt><dd>{r.status === 'APPROVED' ? `Level ${r.kycTier}` : r.idType === 'BVN' ? 'Level 2' : 'Level 1'}</dd></div>
      </dl>

      {r.sameNumber.length > 0 && (
        <p className="ak-warn" role="note">
          <i className="ti ti-alert-triangle" /> The same number is on {r.sameNumber.length === 1 ? 'another account' : `${r.sameNumber.length} other accounts`}:{' '}
          {r.sameNumber.map((x, i) => <span key={x.userId}>{i > 0 && ', '}<Link to={`/user/${x.username}`}>@{x.username}</Link> ({x.status.toLowerCase()})</span>)}
        </p>
      )}
      {r.status === 'APPROVED' && (
        !r.providerRef
          ? <p className="aw-kind"><i className="ti ti-alert-circle" /> Approved before automatic checks were in place (26 Sept 2026), so it may never have been checked. Look it up in Dojah and revoke it if it doesn't match.</p>
          : <p className="aw-kind"><i className="ti ti-circle-check" /> {r.provider === 'admin' ? 'Approved by an admin' : 'Checked by Dojah'}{r.verifiedAt ? ` on ${day(r.verifiedAt)}` : ''}.</p>
      )}
      {r.status === 'REJECTED' && r.rejectionReason && <p className="aw-note">{r.rejectionReason}</p>}
      {r.status === 'SUBMITTED' && (
        <p className="aw-kind"><i className="ti ti-search" /> Dojah couldn't check this automatically. Look the number up in the Dojah dashboard and compare the name and date of birth before approving.</p>
      )}

      {r.status !== 'REJECTED' && (mode === null ? (
        <div className="aw-actions">
          {r.status === 'SUBMITTED' ? (
            <>
              <button className="ui-btn ui-btn-dark" onClick={() => setMode('approve')} disabled={clash.length > 0} title={clash.length ? 'Already verified on another account' : undefined}><i className="ti ti-check" /> Approve</button>
              <button className="ui-btn ui-btn-ghost" onClick={() => setMode('reject')}><i className="ti ti-x" /> Reject</button>
            </>
          ) : (
            <button className="ui-btn ui-btn-ghost" onClick={() => setMode('revoke')}><i className="ti ti-shield-x" /> Revoke verification</button>
          )}
        </div>
      ) : (
        <div className="aw-confirm">
          {mode === 'approve' ? (
            <>
              <p>{name} will be able to withdraw and send money, and any sign-up or referral bonus will be paid.</p>
              <label htmlFor={`lvl-${r.id}`}>Level</label>
              <select id={`lvl-${r.id}`} className="ui-input" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                <option value={1}>Level 1: NIN (₦10,000 per withdrawal)</option>
                <option value={2}>Level 2: BVN (₦20,000 per withdrawal)</option>
                <option value={3}>Level 3: ID documents (₦200,000 per withdrawal)</option>
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
          {error && <p className="aw-error" role="alert">{error}</p>}
          <div className="aw-actions">
            <button className={`ui-btn ${mode === 'approve' ? 'ui-btn-dark' : 'aw-danger'}`} onClick={act} disabled={busy}>
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

  const load = async (s = status, p = page, qq = search) => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ status: s, page: String(p) })
      if (qq) params.set('search', qq)
      setData(await apiRequest<Page>(`/kyc/admin/pending?${params}`))
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
    <Layout sidebar>
      <style>{`
        .aw{max-width:980px;margin:0 auto;padding:28px 24px 64px}
        .aw-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:18px}
        .aw-head h1{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:0 0 4px}
        .aw-head p{color:var(--text2);font-size:14px;margin:0;max-width:600px}
        .aw-tabs{display:flex;gap:6px;border-bottom:1px solid var(--border);margin-bottom:14px}
        .aw-tabs button{background:none;border:0;border-bottom:2px solid transparent;padding:10px 12px;font-family:inherit;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;margin-bottom:-1px}
        .aw-tabs button[aria-selected="true"]{color:var(--text);border-bottom-color:var(--text)}
        .ak-search{display:flex;gap:8px;margin-bottom:14px}
        .ak-search input{flex:1;min-width:0}
        .aw-list{display:flex;flex-direction:column;gap:12px}
        .aw-row{padding:18px 20px;display:flex;flex-direction:column;gap:12px}
        .aw-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
        .aw-who{display:flex;flex-direction:column;gap:2px;min-width:0}
        .aw-who b{font-size:15px;font-weight:600}
        .aw-who span{font-size:12px;color:var(--text2);display:flex;gap:8px;flex-wrap:wrap;align-items:center;word-break:break-all}
        .aw-who em{font-style:normal;font-size:11px;padding:2px 8px;border-radius:999px;background:color-mix(in srgb,var(--red) 12%,transparent);color:var(--red)}
        .aw-who em.ok{background:color-mix(in srgb,var(--green) 14%,transparent);color:var(--green)}
        .ak-handle{font-weight:400;font-size:13px;color:var(--text2);text-decoration:none}
        .aw-top time{font-size:12px;color:var(--text3);white-space:nowrap}
        .aw-amounts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0}
        .aw-amounts div{background:var(--card2,var(--bg));border:1px solid var(--border);border-radius:12px;padding:10px 12px;min-width:0}
        .aw-amounts dt{font-size:11px;color:var(--text3);margin-bottom:2px}
        .aw-amounts dd{margin:0;font-size:15px;font-weight:600;display:flex;align-items:center;gap:2px;overflow-wrap:anywhere}
        .aw-mono{font-family:var(--font-mono,monospace);font-size:13.5px}
        .aw-copy{border:0;background:none;color:var(--text2);cursor:pointer;padding:4px;min-width:28px;min-height:28px;border-radius:6px}
        .aw-copy:hover{background:var(--border)}
        .aw-kind{margin:0;font-size:12.5px;color:var(--text2);display:flex;gap:6px;align-items:baseline;line-height:1.5}
        .ak-warn{margin:0;font-size:13px;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,var(--red) 10%,transparent);color:var(--text);line-height:1.5}
        .ak-warn i{color:var(--red)}
        .ak-warn a{color:var(--text);font-weight:600}
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
        .aw-pager{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:16px;font-size:13px;color:var(--text2)}
        @media (max-width:640px){
          .aw{padding:20px 16px 56px}
          .aw-amounts{grid-template-columns:1fr 1fr}
          .aw-amounts div:first-child{grid-column:1 / -1}
          .aw-actions .ui-btn{flex:1}
        }
      `}</style>

      <div className="aw">
        <div className="aw-head">
          <div>
            <h1>Identity checks</h1>
            <p>Approve or reject KYC that Dojah couldn't check automatically, and remove approvals that shouldn't stand. Users are notified either way.</p>
          </div>
          <button className="ui-btn ui-btn-ghost" onClick={() => load()} disabled={loading}><i className="ti ti-refresh" /> Refresh</button>
        </div>

        <div className="aw-tabs" role="tablist">
          {TABS.map(([s, label]) => (
            <button key={s} role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setPage(1); setNotice('') }}>
              {label}{data ? ` (${data.counts?.[s] ?? 0})` : ''}
            </button>
          ))}
        </div>

        <form className="ak-search" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(q.trim()) }}>
          <input className="ui-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email, username or exact NIN/BVN" aria-label="Search identity checks" />
          <button className="ui-btn ui-btn-ghost">Search</button>
          {search && <button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setQ(''); setSearch('') }}>Clear</button>}
        </form>

        {notice && <div className="aw-msg" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><i className="ti ti-x" /></button></div>}

        {loading && !data ? (
          <div className="aw-empty">Loading…</div>
        ) : error ? (
          <div className="aw-empty" role="alert">{error}</div>
        ) : !data || data.records.length === 0 ? (
          <div className="aw-empty">{search ? 'Nothing matches that search.' : status === 'SUBMITTED' ? 'Nothing waiting for review. All caught up.' : 'Nothing here yet.'}</div>
        ) : (
          <div className="aw-list">
            {data.records.map((r) => <Row key={r.id} r={r} onDone={onDone} />)}
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="aw-pager">
            <button className="ui-btn ui-btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><i className="ti ti-arrow-left" /> Previous</button>
            <span>Page {page} of {data.pages}</span>
            <button className="ui-btn ui-btn-ghost" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next <i className="ti ti-arrow-right" /></button>
          </div>
        )}
      </div>
    </Layout>
  )
}
