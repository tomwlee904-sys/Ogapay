import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
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
  user: { id: string; email: string; name: string; kycTier: number } | null
}
interface Page { items: Withdrawal[]; total: number; page: number; pages: number; totals: { currency: string; count: number; amount: number }[] }

const TABS: [Status, string][] = [['PROCESSING', 'Pending'], ['COMPLETED', 'Paid'], ['FAILED', 'Rejected']]

const KIND: Record<Kind, { label: string; icon: string; hint: string }> = {
  manual: { label: 'Pay by hand', icon: 'building-bank', hint: 'The money is held. Send the transfer, then mark it paid.' },
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
    <button type="button" className="aw-copy" aria-label={`Copy ${text}`}
      onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200) }}>
      <i className={`ti ti-${done ? 'check' : 'copy'}`} />
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
    <article className="aw-row ui-card">
      <header className="aw-top">
        <div className="aw-who">
          <b>{w.user?.name || 'Unknown user'}</b>
          <span>{w.user?.email}{w.user && <em className={w.user.kycTier > 0 ? 'ok' : ''}>KYC {w.user.kycTier > 0 ? `level ${w.user.kycTier}` : 'none'}</em>}</span>
        </div>
        <time dateTime={w.createdAt} title={new Date(w.createdAt).toLocaleString()}>{ago(w.createdAt)}</time>
      </header>

      <dl className="aw-amounts">
        <div><dt>Requested</dt><dd>{money(w.amount, w.currency)}</dd></div>
        <div><dt>Fee</dt><dd>{money(w.fee, w.currency)}</dd></div>
        <div className="aw-pay"><dt>{w.status === 'PROCESSING' ? 'Send' : 'Sent'}</dt><dd>{money(w.payout, w.currency)}</dd></div>
      </dl>

      <div className="aw-dest">
        {d.accountNumber ? (
          <>
            <span><i className="ti ti-building-bank" />{d.bankName || 'Bank'}{d.bankCode ? ` (${d.bankCode})` : ''}</span>
            <span className="aw-mono">{d.accountNumber}<Copy text={d.accountNumber} /></span>
            <span>{d.accountName || 'No account name'}</span>
          </>
        ) : d.address ? (
          <span className="aw-mono aw-addr"><i className="ti ti-wallet" />{d.address}<Copy text={d.address} /></span>
        ) : <span>No destination recorded</span>}
        {sig && <a className="aw-link" href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noreferrer">View transaction <i className="ti ti-external-link" /></a>}
      </div>

      <p className="aw-kind"><i className={`ti ti-${k.icon}`} /><b>{k.label}.</b> {w.status === 'PROCESSING' ? k.hint : ''}</p>
      <p className="aw-ref aw-mono">{w.reference}{w.status !== 'PROCESSING' && w.externalRef && !sig ? ` · payout ref ${w.externalRef}` : ''}</p>
      {w.status !== 'PROCESSING' && w.note && <p className="aw-note">{w.note}</p>}

      {w.status === 'PROCESSING' && (mode === null ? (
        <div className="aw-actions">
          <button className="ui-btn ui-btn-dark" onClick={() => setMode('approve')}><i className="ti ti-check" /> Mark as paid</button>
          <button className="ui-btn ui-btn-ghost" onClick={() => setMode('reject')}><i className="ti ti-x" /> Reject</button>
        </div>
      ) : (
        <div className="aw-confirm">
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
          {error && <p className="aw-error" role="alert">{error}</p>}
          <div className="aw-actions">
            <button className={`ui-btn ${mode === 'approve' ? 'ui-btn-dark' : 'aw-danger'}`} onClick={settle} disabled={busy}>
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

  const load = async (s = status, p = page) => {
    setLoading(true); setError('')
    try {
      setData(await apiRequest<Page>(`/admin/withdrawals?status=${s}&page=${p}`))
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

  return (
    <Layout sidebar>
      <style>{`
        .aw{max-width:980px;margin:0 auto;padding:28px 24px 64px}
        .aw-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:18px}
        .aw-head h1{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:0 0 4px}
        .aw-head p{color:var(--text2);font-size:14px;margin:0;max-width:560px}
        .aw-tabs{display:flex;gap:6px;border-bottom:1px solid var(--border);margin-bottom:16px}
        .aw-tabs button{background:none;border:0;border-bottom:2px solid transparent;padding:10px 12px;font-family:inherit;font-size:13px;font-weight:500;color:var(--text2);cursor:pointer;margin-bottom:-1px}
        .aw-tabs button[aria-selected="true"]{color:var(--text);border-bottom-color:var(--text)}
        .aw-totals{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
        .aw-totals span{font-size:12px;padding:6px 10px;border-radius:999px;background:var(--card);border:1px solid var(--border);color:var(--text2)}
        .aw-totals b{color:var(--text);font-weight:600}
        .aw-list{display:flex;flex-direction:column;gap:12px}
        .aw-row{padding:18px 20px;display:flex;flex-direction:column;gap:12px}
        .aw-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
        .aw-who{display:flex;flex-direction:column;gap:2px;min-width:0}
        .aw-who b{font-size:15px;font-weight:600}
        .aw-who span{font-size:12px;color:var(--text2);display:flex;gap:8px;flex-wrap:wrap;align-items:center;word-break:break-all}
        .aw-who em{font-style:normal;font-size:11px;padding:2px 8px;border-radius:999px;background:color-mix(in srgb,var(--red) 12%,transparent);color:var(--red)}
        .aw-who em.ok{background:color-mix(in srgb,var(--green) 14%,transparent);color:var(--green)}
        .aw-top time{font-size:12px;color:var(--text3);white-space:nowrap}
        .aw-amounts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0}
        .aw-amounts div{background:var(--card2,var(--bg));border:1px solid var(--border);border-radius:12px;padding:10px 12px}
        .aw-amounts dt{font-size:11px;color:var(--text3);margin-bottom:2px}
        .aw-amounts dd{margin:0;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums}
        .aw-amounts .aw-pay dd{color:var(--green)}
        .aw-dest{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;align-items:center}
        .aw-dest span{display:inline-flex;align-items:center;gap:6px}
        .aw-mono{font-family:var(--font-mono,monospace);font-size:12.5px}
        .aw-addr{word-break:break-all}
        .aw-copy{border:0;background:none;color:var(--text2);cursor:pointer;padding:4px;min-width:28px;min-height:28px;border-radius:6px}
        .aw-copy:hover{background:var(--border)}
        .aw-link{font-size:12.5px;color:var(--text);display:inline-flex;gap:4px;align-items:center}
        .aw-kind{margin:0;font-size:12.5px;color:var(--text2);display:flex;gap:6px;align-items:baseline}
        .aw-kind b{color:var(--text);font-weight:600}
        .aw-ref{margin:-6px 0 0;color:var(--text3)}
        .aw-note{margin:0;font-size:12.5px;padding:8px 10px;border-radius:10px;background:var(--card2,var(--bg));color:var(--text2)}
        .aw-actions{display:flex;gap:8px;flex-wrap:wrap}
        .aw-confirm{border-top:1px solid var(--border);padding-top:12px;display:flex;flex-direction:column;gap:8px}
        .aw-confirm p{margin:0;font-size:13px;color:var(--text2);line-height:1.5}
        .aw-confirm label{font-size:12px;font-weight:500}
        .aw-confirm textarea{resize:vertical;min-height:64px;padding-top:10px}
        .aw-danger{background:var(--red);color:#fff}
        .aw-error{color:var(--red) !important}
        .aw-msg{padding:10px 14px;border-radius:12px;font-size:13px;margin-bottom:14px;background:color-mix(in srgb,var(--green) 12%,transparent);color:var(--text);display:flex;justify-content:space-between;gap:10px}
        .aw-msg button{background:none;border:0;color:var(--text2);cursor:pointer}
        .aw-empty{padding:48px 20px;text-align:center;color:var(--text2);font-size:14px}
        .aw-pager{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:16px;font-size:13px;color:var(--text2)}
        @media (max-width:640px){
          .aw{padding:20px 16px 56px}
          .aw-amounts{grid-template-columns:1fr 1fr}
          .aw-amounts .aw-pay{grid-column:1 / -1}
          .aw-actions .ui-btn{flex:1}
        }
      `}</style>

      <div className="aw">
        <div className="aw-head">
          <div>
            <h1>Withdrawals</h1>
            <p>Send each pending payout, then mark it paid. Rejecting returns the money to the user's wallet.</p>
          </div>
          <button className="ui-btn ui-btn-ghost" onClick={() => load()} disabled={loading}><i className="ti ti-refresh" /> Refresh</button>
        </div>

        <div className="aw-tabs" role="tablist">
          {TABS.map(([s, label]) => (
            <button key={s} role="tab" aria-selected={status === s} onClick={() => { setStatus(s); setPage(1); setNotice('') }}>
              {label}{status === s && data ? ` (${data.total})` : ''}
            </button>
          ))}
        </div>

        {notice && <div className="aw-msg" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><i className="ti ti-x" /></button></div>}

        {status === 'PROCESSING' && data && data.totals.length > 0 && (
          <div className="aw-totals">
            {data.totals.map(t => <span key={t.currency}><b>{t.count}</b> waiting · <b>{money(t.amount, t.currency)}</b></span>)}
          </div>
        )}

        {loading && !data ? (
          <div className="aw-empty">Loading…</div>
        ) : error ? (
          <div className="aw-empty" role="alert">{error}</div>
        ) : !data || data.items.length === 0 ? (
          <div className="aw-empty">{status === 'PROCESSING' ? 'No withdrawals waiting. All caught up.' : 'Nothing here yet.'}</div>
        ) : (
          <div className="aw-list">
            {data.items.map(w => <Row key={w.id} w={w} onSettled={onSettled} />)}
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="aw-pager">
            <button className="ui-btn ui-btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><i className="ti ti-arrow-left" /> Previous</button>
            <span>Page {page} of {data.pages}</span>
            <button className="ui-btn ui-btn-ghost" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Next <i className="ti ti-arrow-right" /></button>
          </div>
        )}
      </div>
    </Layout>
  )
}
