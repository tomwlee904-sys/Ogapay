import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { sized } from '../lib/img'
import { orderMoney } from '../pages/StoreOrders'
import LoadError from './LoadError'
import type { ChatOffer } from './ChatCards'
import '../styles/store-extras.css'
import '../styles/my-store.css'

// My Store's Offers tab (F13, 2026-11-10): the private offers you sent buyers
// (withdraw an open one) and the ones sellers sent you (pay or open the order).
// New offers are sent from a product (Send offer) or from your chat with the buyer.

type Offer = ChatOffer & { createdAt: string; seller: { username: string } | null; buyer: { username: string } | null }
const STATUS: Record<Offer['status'], { label: string; cls: string }> = {
  OPEN: { label: 'Open', cls: 'live' }, ACCEPTED: { label: 'Paid', cls: 'done' }, DECLINED: { label: 'Declined', cls: 'bad' },
  WITHDRAWN: { label: 'Withdrawn', cls: '' }, EXPIRED: { label: 'Expired', cls: '' },
}
const when = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export default function MyOffers() {
  const [data, setData] = useState<{ sent: Offer[]; received: Offer[] } | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const load = () => {
    setFailed(false)
    apiRequest<{ sent: Offer[]; received: Offer[] }>('/store/my-offers', { fresh: true })
      .then((d) => setData({ sent: d?.sent || [], received: d?.received || [] }))
      .catch(() => setFailed(true))
  }
  useEffect(load, [])

  const withdraw = async (o: Offer) => {
    if (!window.confirm(`Withdraw your offer of ${orderMoney(o.price, o.currency)} to @${o.buyer?.username}? They can no longer pay it.`)) return
    setBusy(o.id); setError('')
    try { await apiRequest(`/store/offers/${o.id}/withdraw`, { method: 'POST' }); load() } catch (e: any) { setError(e?.message || 'Could not withdraw the offer') }
    setBusy('')
  }

  if (!data) return failed ? <LoadError what="your offers" onRetry={load} /> : <div className="up-skel" style={{ height: 120 }} />
  const row = (o: Offer, sent: boolean) => (
    <div className="up-card ms2-order mo-item" key={o.id}>
      <div className="cc-row">
        <span className="cc-img">{o.product.imageUrl ? <img src={sized(o.product.imageUrl, 40, true)} alt="" /> : <i className="ti ti-package" aria-hidden="true" />}</span>
        <span className="cc-mid">
          <b>{o.product.name}</b>
          <small>
            {orderMoney(o.price, o.currency)} · {sent ? `to @${o.buyer?.username}` : `from @${o.seller?.username}`} · sent {when(o.createdAt)}
            {o.status === 'OPEN' ? ` · ends ${when(o.expiresAt)}` : ''}
          </small>
        </span>
      </div>
      <div className="mo-acts">
        <span className={`ms2-badge ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span>
        {o.status === 'OPEN' && sent && <button type="button" className="up-btn" disabled={busy === o.id} onClick={() => withdraw(o)}>Withdraw</button>}
        {o.status === 'OPEN' && !sent && <Link className="up-btn primary" to={o.payLink}>Pay</Link>}
        {o.status === 'ACCEPTED' && o.purchaseId && <Link className="up-btn" to={`/orders/${o.purchaseId}`}>View order</Link>}
      </div>
    </div>
  )
  return (
    <div className="mo-list">
      {error && <div className="up-note err" role="alert">{error}</div>}
      <p className="so-line"><i className="ti ti-receipt" aria-hidden="true" /><span>Agreed a price with a buyer in your chat? Send them a private offer: tap <b>Send offer</b> on the product, or <b>Send an offer</b> in your chat about it. They pay it like any order, and OgaPay holds the money until they confirm.</span></p>
      {data.sent.length === 0 && data.received.length === 0 && <div className="up-empty"><i className="ti ti-receipt" />No offers yet.</div>}
      {data.sent.length > 0 && <h2 className="ms2-group-h">Offers you sent <em>{data.sent.length}</em></h2>}
      {data.sent.map((o) => row(o, true))}
      {data.received.length > 0 && <h2 className="ms2-group-h">Offers you got <em>{data.received.length}</em></h2>}
      {data.received.map((o) => row(o, false))}
    </div>
  )
}
