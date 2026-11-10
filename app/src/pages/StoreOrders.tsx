import { useEffect, useState } from 'react'
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
// page); a "To review" tab lists finished orders not reviewed yet.

export type StoreOrder = {
  id: string; quantity: number; total: number; currency: string; createdAt: string
  status: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'DISPUTED' | 'COMPLETED' | 'CANCELLED'
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
  // available: false once the seller deletes the product; the order keeps its name, price and picture
  product: { id: string; name: string; imageUrl: string | null; price?: number; available?: boolean }
  conversationId: string | null
}
type Bought = StoreOrder & { seller: { username: string; name: string; avatarUrl: string | null } | null }

export const orderMoney = (n: number, cur = 'NGN') =>
  cur === 'NGN' ? '₦' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${cur}`
export const orderWhen = (d: string) =>
  new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Status chip for either side of the order
export function orderBadge(o: StoreOrder): { label: string; cls: string } {
  switch (o.status) {
    case 'IN_PROGRESS': return { label: 'In progress', cls: 'work' }
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

const isOpen = (o: StoreOrder) => o.held || o.status === 'PENDING' || o.status === 'IN_PROGRESS'
// Finished orders the buyer hasn't reviewed yet (2026-11-10, "To review")
const toReview = (o: Bought) => canReviewOrder(o) && !!o.seller && !o.reviewed

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

  // A failed load keeps what was shown; on the first load it shows Try again, never "nothing bought"
  const load = () => apiRequest<Bought[]>('/store/my-purchases')
    .then((d) => { setOrders(Array.isArray(d) ? d : []); setLoadFailed(false) })
    .catch(() => setLoadFailed(true))
  useEffect(() => { load() }, [])

  const done = (o: Bought) => async (msg: string, what?: 'confirmed') => {
    setNote(msg)
    setRateNow(what === 'confirmed' && o.product.available !== false && o.seller ? o : null)
    await load(); refresh()
  }

  // One review covers a product, so "To review" shows its newest order only
  const reviewList = (orders || []).filter((o, i, all) => toReview(o) && all.findIndex((x) => x.product.id === o.product.id && toReview(x)) === i)
  const list = show === 'review' ? reviewList : (orders || []).filter((o) => show === 'all' || isOpen(o))
  const openCount = (orders || []).filter(isOpen).length
  const reviewCount = reviewList.length
  const heldTotal = (orders || []).filter((o) => o.held).reduce<Record<string, number>>((by, o) => ({ ...by, [o.currency]: (by[o.currency] || 0) + o.total }), {})

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
              Once the seller marks your order delivered, they get your payment when you press <b>Confirm received</b>, or 3 days later.
              If something is wrong, report a problem before then and the payment stays on hold while OgaPay looks into it.
              {Object.keys(heldTotal).length > 0 && <> Held for you now: <b>{Object.entries(heldTotal).map(([c, v]) => orderMoney(v, c)).join(' · ')}</b>.</>}
            </p>
          </div>
        </div>

        <div className="up-tabs-row" style={{ marginTop: 0 }}>
          <div className="up-tabs" role="tablist">
            <button role="tab" aria-selected={show === 'open'} className={`up-tab ${show === 'open' ? 'on' : ''}`} onClick={() => setShow('open')}><i className="ti ti-clock" /> Open {openCount ? <em>{openCount}</em> : null}</button>
            <button role="tab" aria-selected={show === 'review'} className={`up-tab ${show === 'review' ? 'on' : ''}`} onClick={() => setShow('review')}><i className="ti ti-star" /> To review {reviewCount ? <em>{reviewCount}</em> : null}</button>
            <button role="tab" aria-selected={show === 'all'} className={`up-tab ${show === 'all' ? 'on' : ''}`} onClick={() => setShow('all')}><i className="ti ti-receipt" /> All {orders?.length ? <em>{orders.length}</em> : null}</button>
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

        {orders === null ? (loadFailed ? <LoadError what="your orders" onRetry={() => { setLoadFailed(false); load() }} /> : <div className="up-skel" style={{ height: 140 }} />)
          : list.length === 0 ? (
            <div className="up-empty">
              <i className="ti ti-shopping-bag" />
              {orders.length === 0 ? 'You haven\'t bought anything yet.' : show === 'review' ? 'All caught up. Nothing waiting for a review.' : 'No open orders. Everything you bought is settled.'}
              {orders.length === 0 && <div style={{ marginTop: 14 }}><Link className="up-btn primary" to="/store">Browse the store</Link></div>}
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

                {o.held && o.status === 'DELIVERED' && o.releaseAt && (
                  <p className="so-line"><i className="ti ti-clock" aria-hidden="true" /><span>The seller marked this delivered. Confirm you received it, or report a problem before <b>{orderWhen(o.releaseAt)}</b>. After that the payment goes to the seller.</span></p>
                )}
                {o.held && (o.status === 'PENDING' || o.status === 'IN_PROGRESS') && (
                  <p className="so-line"><i className="ti ti-shield-check" aria-hidden="true" /><span>{o.status === 'PENDING' ? 'Waiting for the seller to start. You can still cancel.' : 'The seller is working on it.'} Your payment is held until you confirm.{o.autoRefundAt && <> If it isn't marked delivered by <b>{orderWhen(o.autoRefundAt)}</b>, your money comes back to you.</>} <b>Never confirm before you have your order, even if the seller asks.</b></span></p>
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
      </div>
    </Layout>
  )
}
