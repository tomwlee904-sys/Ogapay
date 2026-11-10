import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import OrderActions from '../components/OrderActions'
import OrderBrief from '../components/OrderBrief'
import { apiRequest } from '../lib/api'
import { useWalletBalance } from '../context/WalletBalanceContext'
import '../styles/profile-public.css'
import '../styles/my-store.css'
import { sized } from '../lib/img'

// What the user bought in the store. The payment is held by OgaPay until they
// confirm they received it, or 3 days after the seller marks it delivered; until
// then they can report a problem (or cancel, before the seller starts).
// 2026-11-10: the steps live in OrderActions (shared with My Store and the order
// page); a "To review" tab lists finished orders not reviewed yet. The list
// pages on the server (Load more), so older orders are never lost (B15).

export type StoreOrder = {
  id: string; quantity: number; total: number; currency: string; createdAt: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SHIPPED' | 'DELIVERED' | 'REVISION_REQUESTED' | 'DISPUTED' | 'COMPLETED' | 'CANCELLED'
  protected: boolean; held: boolean
  deliveredAt: string | null; releaseAt: string | null; releasedAt: string | null; refundedAt: string | null
  disputedAt: string | null; disputeReason: string | null
  // When an order still not marked delivered is refunded to the buyer (2026-11-08)
  autoRefundAt?: string | null
  // The delivery time the listing promised when it was bought ("3 days")
  delivery?: string | null
  // The buyer's brief, saved with the payment, and how many files came with it (2026-11-10)
  brief?: string | null; briefFileCount?: number
  // 2026-11-10: when the seller started and what they delivered (a note and/or
  // files; lists only know how many files, the order page has links)
  startedAt?: string | null; deliveryNote?: string | null; deliveryFileCount?: number
  // 2026-11-10: a reported problem: the buyer's files, the seller's side, a
  // withdrawn report, and OgaPay's decision with its note. refundedPart: what a
  // split gave back to the buyer
  disputeFileCount?: number; sellerResponse?: string | null; sellerRespondedAt?: string | null; sellerResponseFileCount?: number
  disputeWithdrawnAt?: string | null
  resolution?: 'RELEASE' | 'REFUND' | 'SPLIT' | 'RESUME' | null; resolutionNote?: string | null; refundedPart?: number | null
  // My orders only: the buyer already reviewed this product (2026-11-10)
  reviewed?: boolean
  // 2026-11-10 (B7): the product type, how many days the payment waits after
  // delivery (7 after a parcel is shipped), and for a physical item the delivery
  // address (only the buyer, the seller and OgaPay see it), courier and tracking
  kind?: 'DIGITAL' | 'SERVICE' | 'PHYSICAL'; holdDays?: number
  shipping?: ShippingAddress | null; shippedAt?: string | null; courier?: string | null; trackingNumber?: string | null
  // (B8) revisions offered (999 = unlimited), used, left (null = unlimited), and the latest request
  revisionsAllowed?: number; revisionsUsed?: number; revisionsLeft?: number | null; revisionNote?: string | null; revisionRequestedAt?: string | null
  // (F20) a cancel request waiting for the seller, and how the last one ended
  cancelRequestedAt?: string | null; cancelReason?: string | null; cancelOutcome?: 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | null
  // available: false once the seller deletes the product; the order keeps its name, price and picture
  product: { id: string; name: string; imageUrl: string | null; price?: number; available?: boolean }
  conversationId: string | null
}
export type ShippingAddress = { name: string; phone: string; address: string; city: string; state: string; country: 'NG' | 'GH' }
type Bought = StoreOrder & { seller: { username: string; name: string; avatarUrl: string | null } | null }
// One page of a server-paged order list (2026-11-10, B15)
export type OrderPage<T> = { orders: T[]; nextCursor: string | null; counts?: Record<string, number>; held?: Record<string, number> }

export const orderMoney = (n: number, cur = 'NGN') =>
  cur === 'NGN' ? '₦' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${cur}`
export const orderWhen = (d: string) =>
  new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Status chip for either side of the order
export function orderBadge(o: StoreOrder): { label: string; cls: string } {
  switch (o.status) {
    case 'IN_PROGRESS': return { label: 'In progress', cls: 'work' }
    case 'SHIPPED': return { label: 'Shipped', cls: 'work' }
    case 'REVISION_REQUESTED': return { label: 'Changes asked', cls: 'work' }
    case 'DELIVERED': return { label: 'Delivered', cls: 'done' }
    case 'DISPUTED': return { label: 'Problem reported', cls: 'bad' }
    case 'COMPLETED': return { label: 'Completed', cls: 'done' }
    case 'CANCELLED': return { label: 'Refunded', cls: '' }
    default: return { label: 'New', cls: '' }
  }
}

// A finished order the buyer can rate: paid to the seller (or an older order paid
// at purchase, not refunded) and the product still listed. Same rule as the
// server; the product page checks again (canReview) before it shows the form (2026-11-08)
export const canReviewOrder = (o: StoreOrder) =>
  (o.status === 'COMPLETED' || (!o.protected && o.status !== 'CANCELLED')) && o.product.available !== false

// Finished orders the buyer hasn't reviewed yet (2026-11-10, "To review")
const toReview = (o: Bought) => canReviewOrder(o) && !!o.seller && !o.reviewed

// The courier and tracking number in one line ("GIG Logistics, tracking GIG-123")
export const shippedWith = (o: StoreOrder) => o.courier ? `${o.courier}${o.trackingNumber ? `, tracking number ${o.trackingNumber}` : ''}` : ''
// A delivery address on one line
export const addressLine = (a: ShippingAddress) => `${a.address}, ${a.city}, ${a.state}, ${a.country === 'GH' ? 'Ghana' : 'Nigeria'}`

// The order's revisions and cancel request, in a line or two for either side (2026-11-10)
export function requestLines(o: StoreOrder, role: 'BUYER' | 'SELLER') {
  const buyer = role === 'BUYER'
  const lines: { icon: string; text: string; bad?: boolean }[] = []
  if (o.status === 'REVISION_REQUESTED' && o.revisionNote) {
    lines.push({ icon: 'ti-refresh', text: buyer
      ? `You asked for changes: "${o.revisionNote}" The seller is working on them. The payment waits until they deliver again.`
      : `The buyer asked for changes: "${o.revisionNote}" Make them and mark it delivered again. The payment waits until you do.` })
  }
  if (o.cancelRequestedAt) {
    lines.push({ icon: 'ti-receipt-refund', bad: true, text: buyer
      ? `You asked to cancel${o.cancelReason ? `: "${o.cancelReason}"` : ''}. Waiting for the seller to answer. The payment waits too.`
      : `The buyer asked to cancel${o.cancelReason ? `: "${o.cancelReason}"` : ''}. Accept to refund them, or decline and the order goes on. The payment waits until you answer.` })
  } else if (o.cancelOutcome === 'DECLINED' && o.held) {
    lines.push({ icon: 'ti-receipt-refund', text: buyer ? 'The seller declined your request to cancel, so the order goes on.' : 'You declined the buyer\'s request to cancel.' })
  }
  return lines
}

// What happened to a settled report, in one line for either side (2026-11-10)
export function decisionText(o: StoreOrder, role: 'BUYER' | 'SELLER'): string | null {
  if (!o.resolution) return null
  const part = o.refundedPart != null ? orderMoney(o.refundedPart, o.currency) : ''
  const rest = o.refundedPart != null ? orderMoney(o.total - o.refundedPart, o.currency) : ''
  const what = {
    RELEASE: 'OgaPay settled the report: the payment went to the seller.',
    REFUND: role === 'BUYER' ? 'OgaPay settled the report: you were refunded.' : 'OgaPay settled the report: the buyer was refunded.',
    SPLIT: role === 'BUYER' ? `OgaPay settled the report: ${part} came back to you and ${rest} went to the seller.` : `OgaPay settled the report: ${rest} came to you and ${part} went back to the buyer.`,
    RESUME: 'OgaPay looked into the report and the order went on as normal.',
  }[o.resolution]
  return o.resolutionNote ? `${what} Their note: "${o.resolutionNote}"` : what
}

export default function StoreOrders() {
  const { refresh } = useWalletBalance()
  const [orders, setOrders] = useState<Bought[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [note, setNote] = useState('')
  const [show, setShow] = useState<'open' | 'review' | 'all'>('open')
  // Just confirmed: ask for a review of that order (F18)
  const [rateNow, setRateNow] = useState<Bought | null>(null)
  // 2026-11-10 (B15): the server pages and counts; Load more asks for the next page
  const [next, setNext] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [heldTotal, setHeldTotal] = useState<Record<string, number>>({})
  const [more, setMore] = useState(false)
  const asked = useRef(0)

  // A failed load keeps what was shown; on the first load it shows Try again, never "nothing bought".
  // A reload (after a step) keeps as many orders as were showing.
  const load = (tab = show, keep = 0) => {
    const ask = ++asked.current
    return apiRequest<OrderPage<Bought>>(`/store/my-purchases?status=${tab}&limit=${Math.min(Math.max(keep, 20), 50)}`)
      .then((d) => {
        if (ask !== asked.current) return
        setOrders(Array.isArray(d?.orders) ? d.orders : []); setNext(d?.nextCursor || null)
        if (d?.counts) setCounts(d.counts)
        if (d?.held) setHeldTotal(d.held)
        setLoadFailed(false)
      })
      .catch(() => { if (ask === asked.current) setLoadFailed(true) })
  }
  useEffect(() => { setOrders(null); load(show) }, [show]) // eslint-disable-line react-hooks/exhaustive-deps
  const loadMore = async () => {
    if (!next || more) return
    setMore(true)
    try {
      const d = await apiRequest<OrderPage<Bought>>(`/store/my-purchases?status=${show}&limit=20&cursor=${next}`)
      setOrders((prev) => [...(prev || []), ...(d?.orders || []).filter((o) => !(prev || []).some((x) => x.id === o.id))])
      setNext(d?.nextCursor || null)
    } catch { setNote('') }
    setMore(false)
  }

  const done = (o: Bought) => async (msg: string, what?: 'confirmed') => {
    setNote(msg)
    setRateNow(what === 'confirmed' && o.product.available !== false && o.seller ? o : null)
    await load(show, orders?.length || 0); refresh()
  }

  // One review covers a product, so "To review" shows its newest order only
  const list = show === 'review'
    ? (orders || []).filter((o, i, all) => toReview(o) && all.findIndex((x) => x.product.id === o.product.id && toReview(x)) === i)
    : orders || []
  const openCount = counts.open || 0
  const reviewCount = counts.review || 0

  return (
    <Layout>
      <div className="up-wrap">
        <div className="ms2-head">
          <div>
            <h1>My orders</h1>
            <p>What you bought in the store. Your payment is held by OgaPay until you confirm you received it.</p>
          </div>
          <div className="acts">
            <Link className="up-btn" to="/store"><i className="ti ti-building-store" /> Browse the store</Link>
          </div>
        </div>

        <div className="up-card so-how">
          <i className="ti ti-shield-check" aria-hidden="true" />
          <div>
            <b>How buyer protection works</b>
            <p>
              Once the seller marks your order delivered, they get your payment when you press <b>Confirm received</b>, or 3 days later (7 days after a parcel is shipped).
              If something is wrong, report a problem before then and the payment stays on hold while OgaPay looks into it.
              {Object.keys(heldTotal).length > 0 && <> Held for you now: <b>{Object.entries(heldTotal).map(([c, v]) => orderMoney(v, c)).join(' · ')}</b>.</>}
            </p>
          </div>
        </div>

        <div className="up-tabs-row" style={{ marginTop: 0 }}>
          <div className="up-tabs" role="tablist">
            <button role="tab" aria-selected={show === 'open'} className={`up-tab ${show === 'open' ? 'on' : ''}`} onClick={() => setShow('open')}><i className="ti ti-clock" /> Open {openCount ? <em>{openCount}</em> : null}</button>
            <button role="tab" aria-selected={show === 'review'} className={`up-tab ${show === 'review' ? 'on' : ''}`} onClick={() => setShow('review')}><i className="ti ti-star" /> To review {reviewCount ? <em>{reviewCount}</em> : null}</button>
            <button role="tab" aria-selected={show === 'all'} className={`up-tab ${show === 'all' ? 'on' : ''}`} onClick={() => setShow('all')}><i className="ti ti-receipt" /> All {counts.all ? <em>{counts.all}</em> : null}</button>
          </div>
        </div>

        {note && <div className="up-note ok" role="status" style={{ marginBottom: 12 }}><i className="ti ti-circle-check" /> {note}</div>}
        {rateNow && (
          <div className="up-card so-how" role="status">
            <i className="ti ti-star" aria-hidden="true" />
            <div>
              <b>How was {rateNow.product.name}?</b>
              <p>A few stars and a line or two help other buyers, and help @{rateNow.seller?.username} get noticed.</p>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Link className="up-btn primary" to={`/store/${rateNow.product.id}#review`}><i className="ti ti-star" /> Leave a review</Link>
                <button className="up-btn" onClick={() => setRateNow(null)}>Later</button>
              </div>
            </div>
          </div>
        )}

        {orders === null ? (loadFailed ? <LoadError what="your orders" onRetry={() => { setLoadFailed(false); load(show) }} /> : <div className="up-skel" style={{ height: 140 }} />)
          : list.length === 0 ? (
            <div className="up-empty">
              <i className="ti ti-shopping-bag" />
              {!counts.all ? 'You haven\'t bought anything yet.' : show === 'review' ? 'All caught up. Nothing waiting for a review.' : 'No open orders. Everything you bought is settled.'}
              {!counts.all && <div style={{ marginTop: 14 }}><Link className="up-btn primary" to="/store">Browse the store</Link></div>}
            </div>
          ) : list.map((o) => {
            const b = orderBadge(o)
            const payState = !o.protected ? 'paid at purchase' : o.refundedAt ? 'refunded' : o.refundedPart != null ? 'part refunded' : o.releasedAt ? 'paid to seller' : 'held by OgaPay'
            return (
              <div className="up-card ms2-order" key={o.id}>
                <div className="who">
                  <span className="ms2-thumb so-thumb">{o.product.imageUrl ? <img src={sized(o.product.imageUrl, 44, true)} alt="" loading="lazy" /> : <i className="ti ti-package" />}</span>
                  <div style={{ minWidth: 0 }}>
                    <b><Link className="tap" to={o.product.available === false ? `/orders/${o.id}` : `/store/${o.product.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{o.product.name}</Link>{o.quantity > 1 ? ` × ${o.quantity}` : ''}</b>
                    <small>
                      {o.seller ? <>from <Link className="tap" to={`/user/${o.seller.username}`} style={{ color: 'var(--text2)' }}>@{o.seller.username}</Link> · </> : null}
                      {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </small>
                  </div>
                </div>
                <div className="amt">{orderMoney(o.total, o.currency)}<small>{payState}</small></div>

                {o.held && o.status === 'DELIVERED' && o.releaseAt && !o.cancelRequestedAt && (
                  <p className="so-line"><i className="ti ti-clock" aria-hidden="true" /><span>The seller marked this delivered. Confirm you received it, or report a problem before <b>{orderWhen(o.releaseAt)}</b>. After that the payment goes to the seller.</span></p>
                )}
                {o.held && o.status === 'SHIPPED' && (
                  <p className="so-line"><i className="ti ti-send" aria-hidden="true" /><span>Shipped with {shippedWith(o)}. Confirm once it arrives{o.releaseAt && !o.cancelRequestedAt ? <>, or report a problem before <b>{orderWhen(o.releaseAt)}</b>. After that the payment goes to the seller</> : ''}.</span></p>
                )}
                {requestLines(o, 'BUYER').map((l) => <p key={l.icon} className={`so-line${l.bad ? ' bad' : ''}`}><i className={`ti ${l.icon}`} aria-hidden="true" /><span>{l.text}</span></p>)}
                {o.held && (o.status === 'PENDING' || o.status === 'IN_PROGRESS') && (
                  <p className="so-line"><i className="ti ti-shield-check" aria-hidden="true" /><span>{o.status === 'PENDING' ? 'Waiting for the seller to start. You can still cancel.' : 'The seller is working on it.'} Your payment is held until you confirm.{o.autoRefundAt && <> If it isn't marked {o.kind === 'PHYSICAL' ? 'shipped' : 'delivered'} by <b>{orderWhen(o.autoRefundAt)}</b>, your money comes back to you.</>} <b>Never confirm before you have your order, even if the seller asks.</b></span></p>
                )}
                {o.status === 'DISPUTED' && (
                  <p className="so-line bad"><i className="ti ti-alert-triangle" aria-hidden="true" /><span>You reported: "{o.disputeReason}" The payment is on hold while OgaPay reviews it.{o.sellerResponse ? ' The seller told OgaPay their side: see the order.' : ''} Keep talking to the seller in your chat. Sorted it out? Withdraw your report.</span></p>
                )}
                {decisionText(o, 'BUYER') && <p className="so-line"><i className="ti ti-scale" aria-hidden="true" /><span>{decisionText(o, 'BUYER')}</span></p>}
                {/* What the seller delivered (2026-11-10) */}
                <OrderBrief label="What the seller delivered" more="Read more" brief={o.deliveryNote} fileCount={o.deliveryFileCount || 0} orderId={o.id} />

                <OrderActions order={o} role="BUYER" onDone={done(o)} lead={<>
                  <span className={`ms2-badge ${b.cls}`}>{b.label}</span>
                  <span style={{ flex: 1 }} />
                  {o.conversationId && <Link className="up-btn" to={`/messages?c=${o.conversationId}`}><i className="ti ti-message" /> Message seller</Link>}
                </>} />
              </div>
            )
          })}
        {next && orders && list.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button className="up-btn" disabled={more} onClick={loadMore}>{more ? 'Loading…' : 'Load more'}</button>
          </div>
        )}
      </div>
    </Layout>
  )
}
