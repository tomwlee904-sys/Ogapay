import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import Money from '../Money'
import { money, PAYOUT_LABEL, payoutNote, payoutStatusOf, txDetail, txTitle, when, type Tx } from '../../lib/wallet'
import '../../styles/profile-own.css'

const PAGE = 10
const url = (p: number) => `/users/transactions/history?type=WITHDRAWAL&page=${p}&limit=${PAGE}`

// A bank withdrawal's fee comes off the amount, so say what reached the bank
// (the amount shown is what left the wallet)
function netLine(w: Tx, s: string) {
  const fee = Number(w.fee || 0)
  if (fee <= 0 || s === 'failed' || s === 'refunded') return ''
  const net = Number(w.metadata?.netAmount ?? Math.abs(Number(w.amount || 0)) - fee)
  const cur = w.currency || 'NGN'
  return `Your bank ${s === 'paid' ? 'got' : 'gets'} ${money(net, cur)} after the ${money(fee, cur)} fee`
}

// Every withdrawal you've made, newest first, page by page. It asks the history
// for withdrawals only: the latest transactions of any type are mostly job
// payments and fees, so older withdrawals used to drop out of view. Each one
// says where it stands: processing, paid, failed (the money came back) or refunded.
export default function ProfileWithdrawalsCard() {
  const [rows, setRows] = useState<Tx[] | null>(null)
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const d = await apiRequest<Tx[]>(url(1))
      const list = Array.isArray(d) ? d : []
      setRows(list); setPage(1); setMore(list.length === PAGE)
    } catch { setFailed(true); setRows([]) }
  }, [])
  useEffect(() => { load() }, [load])

  async function loadMore() {
    setBusy(true)
    try {
      const d = await apiRequest<Tx[]>(url(page + 1))
      const list = Array.isArray(d) ? d : []
      setRows((l) => [...(l || []), ...list.filter((r) => !(l || []).some((x) => x.id === r.id))])
      setPage((p) => p + 1)
      setMore(list.length === PAGE)
    } catch { /* keep the button */ }
    setBusy(false)
  }

  return (
    <section className="profile-card prof-full pf-wd" aria-labelledby="pf-wd-title">
      <div className="profile-card-head">
        <span id="pf-wd-title" className="pf-wd-title"><i className="ti ti-history" /> Withdrawal History</span>
        <Link to="/wallet" className="pf-wd-link">Wallet</Link>
      </div>
      {rows === null ? (
        <div className="pf-wd-list">{[0, 1, 2].map((i) => <div key={i} className="up-skel" style={{ height: 52, margin: '10px 16px', borderRadius: 12 }} />)}</div>
      ) : failed ? (
        <div className="pf-wd-empty">
          Couldn't load your withdrawals.
          <button type="button" className="pf-wd-more-btn" onClick={load}>Try again</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="pf-wd-empty">
          <i className="ti ti-history-off" />
          <div>No withdrawals yet</div>
        </div>
      ) : (
        <ul className="pf-wd-list">
          {rows.map((w) => {
            const s = payoutStatusOf(w)
            const detail = txDetail(w)
            const note = payoutNote(w)
            const net = w.metadata?.toAddress || w.metadata?.walletAddress ? '' : netLine(w, s)
            return (
              <li key={w.id} className="pf-wd-row">
                <div className="pf-wd-main">
                  <strong>{txTitle(w)}</strong>
                  <span>{when(w.createdAt)}{detail ? ` · ${detail}` : ''}</span>
                  {net && <span>{net}</span>}
                  {note && <span className="pf-wd-note">{note}</span>}
                </div>
                <div className="pf-wd-side">
                  <Money amount={Math.abs(Number(w.amount || 0))} currency={w.currency || 'NGN'} exact size={14} className={s === 'failed' || s === 'refunded' ? 'pf-wd-void' : ''} />
                  <span className={`pf-wd-pill ${s}`}>{PAYOUT_LABEL[s]}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {more && rows && !failed && (
        <div className="pf-wd-more"><button type="button" className="pf-wd-more-btn" disabled={busy} onClick={loadMore}>{busy ? 'Loading…' : 'Load more'}</button></div>
      )}
    </section>
  )
}
