import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell, { AdminEmpty, AdminRefresh, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'

/* Admin: settle queued withdrawals. Bank withdrawals only hold the user's
   money; an admin sends the transfer by hand, then marks it paid (the money
   leaves the wallet) or rejects it (the hold is released). */

type Status = 'PROCESSING' | 'COMPLETED' | 'FAILED'
type Kind = 'manual' | 'flutterwave' | 'crypto'
interface Withdrawal {
  id: string
  reference: string
  kind: Kind
  status: Status
  amount: number
  fee: number
  payout: number
  currency: string
  createdAt: string
  completedAt: string | null
  externalRef: string | null
  destination: { bankName: string | null; bankCode: string | null; accountNumber: string | null; accountName: string | null; address: string | null }
  settledAt: string | null
  note: string | null
  // Thursday payouts (backend payout.service.js)
  autoPayout?: { state: 'sending' | 'sent' | 'review'; reason?: string; transferId?: number | string; at?: string } | null
  user: { id: string; email: string; name: string; kycTier: number } | null
  // Pending bank withdrawals: other open accounts that use the same bank account
  sharedWith?: { id: string; username: string }[]
}
interface Page { items: Withdrawal[]; total: number; page: number; pages: number; totals: { currency: string; count: number; amount: number }[] }

const TABS: [Status, string][] = [['PROCESSING', 'Pending'], ['COMPLETED', 'Paid'], ['FAILED', 'Rejected']]

const KIND: Record<Kind, { label: string; icon: string; hint: string }> = {
  manual: { label: 'Bank withdrawal', icon: 'building-bank', hint: 'The money is held. It goes out automatically on Thursday if the account is in their name; otherwise send the transfer by hand, then mark it paid.' },
  flutterwave: { label: 'Flutterwave transfer', icon: 'send', hint: 'Sent automatically. Check its status in Flutterwave before settling it here.' },
  crypto: { label: 'Crypto, not confirmed', icon: 'currency-solana', hint: 'Already sent and debited. Check the signature: mark paid if it landed, reject only if it never did.' },
}

const money = (n: number, cur: string) =>
  cur === 'NGN' ? `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}` : `${n.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${cur}`

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

function Row({ w, onSettled }: { w: Withdrawal; onSettled: (id: string, msg: string) => void }) {
  const [mode, setMode] = useState<null | 'approve' | 'reject'>(null)
  const [ref, setRef] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const k = KIND[w.kind]
  const d = w.destination
  const sig = w.kind === 'crypto' ? w.externalRef : null
  const auto = w.autoPayout || null
  // An automatic transfer is out: settling it here too would pay twice (the server refuses)
  const inFlight = auto?.state === 'sending' || auto?.state === 'sent'

  const settle = async () => {
    if (mode === 'reject' && !reason.trim()) { setError('Give a reason. The user will see it.'); return }
    setBusy(true); setError('')
    try {
      await apiRequest(`/admin/withdrawals/${w.id}/${mode}`, {
        method: 'POST',
        body: JSON.stringify(mode === 'approve' ? { payoutRef: ref.trim() } : { reason: reason.trim() }),
      })
      onSettled(w.id, mode === 'approve'
        ? `Marked ${money(w.amount, w.currency)} as paid to ${w.user?.name || 'the user'}.`
        : `Rejected. ${money(w.amount, w.currency)} is back in ${w.user?.name || 'the user'}'s wallet.`)
    } catch (e: any) {
      setError(e?.message || 'Could not settle this withdrawal')
      setBusy(false)
    }
  }

  return (
    <article className="adm-row ui-card">
      <header className="adm-top">
        <div className="adm-who">
          <b>{w.user?.name || 'Unknown user'}</b>
          <span>{w.user?.email}{w.user && <em className={`adm-pill ${w.user.kycTier > 0 ? 'ok' : 'bad'}`}>KYC {w.user.kycTier > 0 ? `level ${w.user.kycTier}` : 'none'}</em>}</span>
        </div>
        <time dateTime={w.createdAt} title={new Date(w.createdAt).toLocaleString()}>{ago(w.createdAt)}</time>
      </header>

      <dl className="adm-facts">
        <div><dt>Requested</dt><dd>{money(w.amount, w.currency)}</dd></div>
        <div><dt>Fee</dt><dd>{money(w.fee, w.currency)}</dd></div>
        <div className="adm-pay adm-span"><dt>{w.status === 'PROCESSING' ? 'Send' : 'Sent'}</dt><dd>{money(w.payout, w.currency)}</dd></div>
      </dl>

      <div className="adm-dest">
        {d.accountNumber ? (
          <>
            <span><i className="ti ti-building-bank" />{d.bankName || 'Bank'}{d.bankCode ? ` (${d.bankCode})` : ''}</span>
            <span className="adm-mono">{d.accountNumber}<Copy text={d.accountNumber} /></span>
            <span>{d.accountName || 'No account name'}</span>
          </>
        ) : d.address ? (
          <span className="adm-mono adm-addr"><i className="ti ti-wallet" />{d.address}<Copy text={d.address} /></span>
        ) : <span>No destination recorded</span>}
        {sig && <a className="adm-link" href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noreferrer">View transaction <i className="ti ti-external-link" /></a>}
      </div>

      {w.status === 'PROCESSING' && !!w.sharedWith?.length && (
        <p className="adm-callout warn" role="note">
          <i className="ti ti-alert-triangle" />
          <span><b>Shares a bank account with {w.sharedWith.map((u, i) => <span key={u.id}>{i ? ', ' : ''}<Link to={`/user/${encodeURIComponent(u.username)}`}>@{u.username}</Link></span>)}.</b> Each person may have one account. Check <Link to="/admin/linked-accounts">Linked accounts</Link> before paying.</span>
        </p>
      )}
      <p className="adm-kind"><i className={`ti ti-${k.icon}`} /><b>{k.label}.</b> {w.status === 'PROCESSING' && !auto ? k.hint : ''}</p>
      {w.status === 'PROCESSING' && auto && (
        <p className={`adm-callout ${auto.state === 'review' ? 'warn' : 'muted'}`}>
          <i className={`ti ti-${auto.state === 'review' ? 'alert-triangle' : 'send'}`} />
          {auto.state === 'review'
            ? <span><b>Needs you:</b> {auto.reason || 'The automatic payout skipped it.'} Send it by hand and mark it paid, or reject it.</span>
            : auto.state === 'sent'
              ? <span><b>Sent by the Thursday payout</b>{auto.transferId ? ` (Flutterwave transfer ${auto.transferId})` : ''}. It settles by itself when Flutterwave confirms.</span>
              : <span><b>Being sent by the Thursday payout.</b> {auto.reason || ''} It settles by itself when Flutterwave confirms.</span>}
        </p>
      )}
      <p className="adm-ref adm-mono">{w.reference}{w.status !== 'PROCESSING' && w.externalRef && !sig ? ` · payout ref ${w.externalRef}` : ''}</p>
      {w.status !== 'PROCESSING' && w.note && <p className="adm-note">{w.note}</p>}

      {w.status === 'PROCESSING' && !inFlight && (mode === null ? (
        <div className="adm-actions">
          <button className="ui-btn ui-btn-dark" onClick={() => setMode('approve')}><i className="ti ti-check" /> Mark as paid</button>
          <button className="ui-btn ui-btn-ghost" onClick={() => setMode('reject')}><i className="ti ti-x" /> Reject</button>
        </div>
      ) : (
        <div className="adm-confirm">
          {mode === 'approve' ? (
            <>
              <p>Only confirm after <b>{money(w.payout, w.currency)}</b> has reached {d.accountNumber ? `${d.bankName || 'the bank'} ${d.accountNumber}` : 'the address above'}. {money(w.amount, w.currency)} then leaves the user's wallet.</p>
              <label htmlFor={`ref-${w.id}`}>Payout reference (optional)</label>
              <input id={`ref-${w.id}`} className="ui-input" value={ref} onChange={e => setRef(e.target.value)} placeholder="Bank or Flutterwave reference" />
            </>
          ) : (
            <>
              <p>Nothing will be sent. {money(w.amount, w.currency)} goes back to the user's available balance.</p>
              <label htmlFor={`reason-${w.id}`}>Reason (the user sees this)</label>
              <textarea id={`reason-${w.id}`} className="ui-input" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Account name doesn't match your KYC name" />
            </>
          )}
          {error && <p className="adm-error" role="alert">{error}</p>}
          <div className="adm-actions">
            <button className={`ui-btn ${mode === 'approve' ? 'ui-btn-dark' : 'adm-danger'}`} onClick={settle} disabled={busy}>
              {busy ? 'Saving…' : mode === 'approve' ? 'Confirm paid' : 'Confirm reject'}
            </button>
            <button className="ui-btn ui-btn-ghost" onClick={() => { setMode(null); setError('') }} disabled={busy}>Cancel</button>
          </div>
        </div>
      ))}
    </article>
  )
}

export default function AdminWithdrawals() {
  const [status, setStatus] = useState<Status>('PROCESSING')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  // The Pending count stays on its tab while another tab is open (the list
  // only returns the total for the status asked for)
  const [pendingTotal, setPendingTotal] = useState<number | null>(null)

  const load = async (s = status, p = page) => {
    setLoading(true); setError('')
    try {
      const res = await apiRequest<Page>(`/admin/withdrawals?status=${s}&page=${p}`)
      setData(res)
      setCheckedAt(new Date())
      if (s === 'PROCESSING') setPendingTotal(res.total)
    } catch (e: any) {
      setData(null)
      setError(e?.message || 'Could not load withdrawals')
    }
    setLoading(false)
  }

  useEffect(() => { load(status, page) }, [status, page])

  const onSettled = (id: string, msg: string) => {
    setNotice(msg)
    setData(d => d && { ...d, items: d.items.filter(i => i.id !== id), total: d.total - 1 })
    load(status, page)
  }

  const countFor = (s: Status) => (status === s && data ? data.total : s === 'PROCESSING' && !error ? pendingTotal : null)

  return (
    <AdminShell
      section="withdrawals"
      title="Withdrawals"
      sub="Paid automatically every Thursday at 10am. The ones that need you wait here."
      how={<>
        <p>Bank withdrawals are paid automatically every Thursday at 10am to accounts in the person's own name.</p>
        <p>The ones that need you wait here: send them by hand and mark them paid, or reject to return the money to their wallet. Check <Link to="/admin/linked-accounts">Linked accounts</Link> when a bank account is shared.</p>
      </>}
      actions={<AdminRefresh onClick={() => load()} loading={loading} />}
    >
      <div className="adm-tabs even" role="tablist" aria-label="Withdrawal status">
        {TABS.map(([s, label]) => {
          const n = countFor(s)
          return (
            <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setPage(1); setNotice('') }}>
              {label}{n != null && <em>{n}</em>}
            </button>
          )
        })}
      </div>

      {notice && <div className="adm-msg" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss"><i className="ti ti-x" aria-hidden="true" /></button></div>}

      {status === 'PROCESSING' && data && !error && (data.totals || []).length > 0 && (
        <div className="adm-totals">
          {(data.totals || []).map(t => <span key={t.currency}><b>{t.count}</b> waiting · <b>{money(t.amount, t.currency)}</b></span>)}
        </div>
      )}

      {error ? (
        <LoadError what="withdrawals" onRetry={() => load()} />
      ) : loading && !data ? (
        <AdminSkeleton />
      ) : !data || !data.items?.length ? (
        status === 'PROCESSING'
          ? <AdminEmpty done title="No withdrawals waiting" at={checkedAt}>All caught up.</AdminEmpty>
          : <AdminEmpty title={status === 'COMPLETED' ? 'No paid withdrawals yet' : 'No rejected withdrawals'} />
      ) : (
        <div className="adm-list">
          {data.items.map(w => <Row key={w.id} w={w} onSettled={onSettled} />)}
        </div>
      )}

      {data && !error && data.pages > 1 && (
        <div className="adm-pager">
          <button type="button" className="ui-btn ui-btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><i className="ti ti-arrow-left" aria-hidden="true" /> Previous</button>
          <span>Page {page} of {data.pages}</span>
          <button type="button" className="ui-btn ui-btn-ghost" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Next <i className="ti ti-arrow-right" aria-hidden="true" /></button>
        </div>
      )}
    </AdminShell>
  )
}
