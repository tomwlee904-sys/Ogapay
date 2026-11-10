import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { sized } from '../lib/img'
import { orderBadge, orderMoney, type StoreOrder } from '../pages/StoreOrders'
import '../styles/store-extras.css'
import '../styles/my-store.css'

// Cards inside chat messages (2026-11-10):
//  - F17 an order card on messages about a store order: the automatic "order
//    placed" message gets the full card (product, status now, link); the brief
//    and delivery messages a small "Order #…" link
//  - F13 a seller's private offer: price, note, when it ends, and Pay / Decline
//    for the buyer, Withdraw for the seller. The status is as it is now.

export type ChatOrder = { id: string; ref: string; name: string; imageUrl: string | null; status: StoreOrder['status']; total: number; currency: string; instant?: boolean; role: 'BUYER' | 'SELLER' }
export type ChatOffer = {
  id: string; itemId: string; product: { id: string; name: string; imageUrl: string | null }; price: number; currency: string
  note: string | null; delivery: string | null; expiresAt: string; status: 'OPEN' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED'
  purchaseId: string | null; role: 'BUYER' | 'SELLER'; payLink: string
}

const Thumb = ({ src }: { src: string | null }) => <span className="cc-img">{src ? <img src={sized(src, 40, true)} alt="" /> : <i className="ti ti-package" aria-hidden="true" />}</span>
const day = (d: string) => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function ChatOrderCard({ order: o, auto }: { order: ChatOrder; auto: boolean }) {
  if (!auto) {
    return <Link className="cc-tag" to={`/orders/${o.id}`} style={{ marginBottom: 4, color: 'inherit', minHeight: 24 }}><i className="ti ti-receipt" aria-hidden="true" /> Order #{o.ref}</Link>
  }
  const badge = orderBadge({ status: o.status } as StoreOrder)
  return (
    <div className="cc-card">
      <span className="cc-tag"><i className="ti ti-receipt" aria-hidden="true" /> Order #{o.ref} · automatic message</span>
      <div className="cc-row">
        <Thumb src={o.imageUrl} />
        <span className="cc-mid">
          <b>{o.name}</b>
          <small>{orderMoney(o.total, o.currency)} · <span className={`ms2-badge ${badge.cls}`}>{badge.label}</span>{o.instant ? ' · instant download' : ''}</small>
        </span>
      </div>
      <div className="cc-acts"><Link className="pri" to={`/orders/${o.id}`}>{o.role === 'BUYER' ? 'View your order' : 'View order'}</Link></div>
    </div>
  )
}

const OFFER_STATUS: Record<ChatOffer['status'], string> = {
  OPEN: 'Open', ACCEPTED: 'Paid', DECLINED: 'Declined', WITHDRAWN: 'Withdrawn', EXPIRED: 'Expired',
}

export function ChatOfferCard({ offer: o, onChanged }: { offer: ChatOffer; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const buyer = o.role === 'BUYER'
  const open = o.status === 'OPEN'
  const act = async (what: 'decline' | 'withdraw') => {
    if (!window.confirm(what === 'decline' ? 'Decline this offer? The seller is told.' : 'Withdraw this offer? The buyer can no longer pay it.')) return
    setBusy(true); setError('')
    try { await apiRequest(`/store/offers/${o.id}/${what}`, { method: 'POST' }); onChanged() } catch (e: any) { setError(e?.message || 'Something went wrong. Try again.') }
    setBusy(false)
  }
  return (
    <div className="cc-card">
      <span className="cc-tag"><i className="ti ti-receipt" aria-hidden="true" /> Private offer · {OFFER_STATUS[o.status]}</span>
      <div className="cc-row">
        <Thumb src={o.product.imageUrl} />
        <span className="cc-mid">
          <b>{o.product.name}</b>
          <small>{orderMoney(o.price, o.currency)}{o.delivery ? ` · delivery ${o.delivery}` : ''}</small>
        </span>
      </div>
      {o.note && <p className="cc-note">{o.note}</p>}
      {open && <p className="cc-note">{buyer ? 'Only you can pay this price.' : 'Only this buyer can pay it.'} Ends {day(o.expiresAt)}. OgaPay holds the payment until the order is delivered and confirmed.</p>}
      {error && <p className="cc-err" role="alert">{error}</p>}
      <div className="cc-acts">
        {open && buyer && <Link className="pri" to={o.payLink}>Pay {orderMoney(o.price, o.currency)}</Link>}
        {open && buyer && <button type="button" disabled={busy} onClick={() => act('decline')}>Decline</button>}
        {open && !buyer && <button type="button" disabled={busy} onClick={() => act('withdraw')}>Withdraw offer</button>}
        {o.status === 'ACCEPTED' && o.purchaseId && <Link to={`/orders/${o.purchaseId}`}>View order</Link>}
      </div>
    </div>
  )
}
