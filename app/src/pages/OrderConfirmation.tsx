import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import OrderBrief, { type BriefFile } from '../components/OrderBrief'
import OrderActions from '../components/OrderActions'
import { apiRequest } from '../lib/api'
import { sized } from '../lib/img'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { addressLine, decisionText, orderBadge, orderMoney, orderWhen, requestLines, shippedWith, type StoreOrder } from './StoreOrders'
import '../styles/checkout.css'
import '../styles/my-store.css'
import '../styles/order-brief.css'

// One store order. Right after a purchase, checkout passes what was bought and
// the chat it opened with the seller, and the page says "Order placed". The
// order itself is always loaded from the server, so a made-up or someone
// else's id shows "Order not found" instead of a false confirmation. The order
// keeps the product's name, price and picture, so it still shows what was
// bought after the seller deletes the product. 2026-11-10: the buyer's brief
// and files are saved on the order, and shown here to the buyer and the seller.
// 2026-11-10 (F16): the order's own page: what happened when (timeline), what
// comes next and by when, what the seller delivered, both sides of a reported
// problem and OgaPay's decision, and the same steps as the lists (OrderActions):
// the buyer confirms, reports, withdraws, reviews and compliments; the seller
// starts, delivers, refunds and replies to a report.
// 2026-11-10: a physical item's delivery address (buyer and seller only), the
// courier and tracking number, changes asked for, and cancel requests.
type Done = { title?: string; seller?: string; conversationId?: string }
type Order = StoreOrder & {
  role: 'BUYER' | 'SELLER'
  seller: { username: string; name: string } | null
  buyer: { username: string; name: string } | null
  briefFiles?: BriefFile[]; deliveryFiles?: BriefFile[]; disputeFiles?: BriefFile[]; sellerResponseFiles?: BriefFile[]
}

// What happened to the order, oldest first, then what comes next
function timeline(o: Order) {
  const buyer = o.role === 'BUYER'
  const done = ([
    [o.createdAt, 'ti-receipt', 'Ordered'],
    [o.startedAt, 'ti-player-play', 'Seller started'],
    [o.shippedAt, 'ti-send', 'Shipped'],
    [o.deliveredAt, 'ti-package', 'Marked delivered'],
    [o.revisionRequestedAt, 'ti-refresh', 'Changes asked for'],
    [o.cancelRequestedAt, 'ti-receipt-refund', 'Asked to cancel'],
    [o.disputedAt, 'ti-alert-triangle', 'Problem reported'],
    [o.sellerRespondedAt, 'ti-message', 'Seller replied to the report'],
    [o.disputeWithdrawnAt, 'ti-arrow-back-up', 'Report withdrawn'],
    [o.releasedAt, 'ti-circle-check', o.refundedPart != null ? 'Payment split' : buyer ? 'Paid to the seller' : 'Paid to you'],
    [o.refundedAt, 'ti-receipt-refund', buyer ? 'Refunded to you' : 'Refunded to the buyer'],
  ] as [string | null | undefined, string, string][])
    .filter(([at]) => !!at)
    .map(([at, icon, label]) => ({ at: at as string, icon, label }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  const next = o.cancelRequestedAt ? null : o.held && o.releaseAt && (o.status === 'DELIVERED' || o.status === 'SHIPPED')
    ? { at: o.releaseAt, icon: 'ti-clock', label: buyer ? 'Payment goes to the seller unless you confirm sooner or report a problem' : 'Payment comes to you, unless the buyer confirms sooner' }
    : o.held && o.autoRefundAt
      ? { at: o.autoRefundAt, icon: 'ti-clock', label: buyer ? `Your money comes back if it isn't marked ${o.kind === 'PHYSICAL' ? 'shipped' : 'delivered'} by then` : `The buyer is refunded if it isn't marked ${o.kind === 'PHYSICAL' ? 'shipped' : 'delivered'} by then` }
      : null
  return { done, next }
}

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>()
  const s = (useLocation().state || {}) as Done
  const { refresh } = useWalletBalance()
  const [order, setOrder] = useState<Order | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')
  const [note, setNote] = useState('')
  const [rateNow, setRateNow] = useState(false)

  const load = () => apiRequest<Order>(`/store/orders/${id}`)
    .then((o) => { setOrder(o); setState('ok') })
    .catch((e: any) => setState(e?.status === 404 || /not found/i.test(e?.message || '') ? 'missing' : 'error'))
  useEffect(() => {
    if (!id) { setState('missing'); return }
    setState('loading')
    load()
  }, [id])

  if (state === 'loading') {
    return <Layout><div className="ui-page"><div className="sc-done"><p className="ui-sub">Loading your order…</p></div></div></Layout>
  }

  if (state !== 'ok' || !order) {
    return (
      <Layout>
        <div className="ui-page">
          <div className="sc-done">
            <div className="sc-done-ic" style={{ background: 'var(--bg2)', color: 'var(--text2)' }}><i className="ti ti-receipt-off" aria-hidden="true" /></div>
            <h1 className="ui-title">{state === 'missing' ? 'Order not found' : "Couldn't load this order"}</h1>
            <p className="ui-sub">
              {state === 'missing'
                ? "There's no order with this link on your account. Your orders are all under My orders."
                : 'Please check your connection and try again.'}
            </p>
            <div className="ui-actions">
              <Link className="ui-btn ui-btn-dark ui-btn-lg" to="/store/orders">My orders</Link>
              {state === 'error' && <button type="button" className="ui-btn ui-btn-ghost ui-btn-lg" onClick={() => window.location.reload()}>Try again</button>}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const buyer = order.role === 'BUYER'
  const other = buyer ? order.seller : order.buyer
  const chat = (s.conversationId || order.conversationId) ? `/messages?c=${s.conversationId || order.conversationId}` : '/messages'
  // "Order placed" only straight after buying (checkout passes its state)
  const justPlaced = buyer && !!s.title && order.status === 'PENDING'
  const badge = orderBadge(order)
  const p = order.product
  const hasBrief = !!order.brief || !!order.briefFiles?.length
  const { done, next } = timeline(order)
  const decision = decisionText(order, order.role)
  const onDone = async (msg: string, what?: 'confirmed') => {
    setNote(msg)
    setRateNow(what === 'confirmed' && p.available !== false && !!order.seller)
    await load(); refresh()
  }

  return (
    <Layout>
      <div className="ui-page">
        <div className="sc-done">
          {justPlaced && <div className="sc-done-ic"><i className="ti ti-check" aria-hidden="true" /></div>}
          <h1 className="ui-title">{justPlaced ? 'Order placed' : buyer ? 'Your order' : 'Order to deliver'}</h1>
          {justPlaced ? (
            <p className="ui-sub">
              {other ? <>@{other.username} has been told about your order.</> : <>The seller has been told about your order.</>}
              {' '}OgaPay holds your payment until you confirm you received it, or {order.holdDays || 3} days after the seller marks it {order.kind === 'PHYSICAL' ? 'shipped' : 'delivered'}.
              {hasBrief ? ' Your brief and files are saved on this order and sent to them in your chat.' : ' Use the chat to share any details they need.'}
            </p>
          ) : (
            <p className="ui-sub">Status: <span className={`ms2-badge ${badge.cls}`}>{badge.label}</span></p>
          )}

          {note && <div className="up-note ok" role="status" style={{ marginTop: 16, textAlign: 'left' }}><i className="ti ti-circle-check" /> {note}</div>}
          {rateNow && (
            <div className="ob" role="status" style={{ marginTop: 12 }}>
              <span className="ob-label"><i className="ti ti-star" aria-hidden="true" /> How was {p.name}?</span>
              <p className="ob-text open">A few stars and a line or two help other buyers, and help @{order.seller?.username} get noticed.</p>
              <Link className="ob-more" to={`/store/${p.id}#review`}>Leave a review</Link>
            </div>
          )}

          <div className="ui-card ui-card-pad">
            <div className="sc-line" style={{ alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {p.imageUrl ? <img src={sized(p.imageUrl, 44, true)} alt="" width={44} height={44} style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} /> : <i className="ti ti-package" aria-hidden="true" style={{ fontSize: 22 }} />}
                {p.available === false
                  ? <span>{p.name}</span>
                  : <Link className="tap" to={`/store/${p.id}`} style={{ color: 'inherit' }}>{p.name}</Link>}
              </span>
              <span>{orderMoney(order.total, order.currency)}</span>
            </div>
            {order.quantity > 1 && p.price != null && <div className="sc-line"><span>Price each</span><span>{orderMoney(p.price, order.currency)} × {order.quantity}</span></div>}
            {other && <div className="sc-line"><span>{buyer ? 'Seller' : 'Buyer'}</span><span><Link className="tap" to={`/user/${other.username}`} style={{ color: 'inherit' }}>@{other.username}</Link></span></div>}
            {order.delivery && <div className="sc-line"><span>Promised delivery</span><span>{order.delivery}</span></div>}
            {order.courier && <div className="sc-line"><span>Shipped with</span><span>{shippedWith(order)}</span></div>}
            {(order.revisionsAllowed || 0) > 0 && <div className="sc-line"><span>Revisions</span><span>{order.revisionsLeft == null ? 'Unlimited' : `${order.revisionsLeft} of ${order.revisionsAllowed} left`}</span></div>}
            {order.refundedPart != null && <div className="sc-line"><span>{buyer ? 'Refunded to you' : 'Went back to the buyer'}</span><span>{orderMoney(order.refundedPart, order.currency)}</span></div>}
            <div className="sc-line" style={{ borderBottom: 0 }}><span>Ordered</span><span>{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
            {/* available: false is also a product the seller only hid, so don't say removed (2026-11-08) */}
            {p.available === false && <p className="ui-sub" style={{ marginTop: 8, fontSize: 13 }}>This product isn't listed in the store right now. Your order and its payment protection are not affected.</p>}
          </div>

          {/* What happened when, and what comes next (F16) */}
          <div className="ui-card ui-card-pad">
            <span className="ob-label"><i className="ti ti-clock" aria-hidden="true" /> Timeline</span>
            <ol className="ot">
              {done.map((t) => (
                <li key={`${t.label}-${t.at}`}><i className={`ti ${t.icon}`} aria-hidden="true" /><span>{t.label}</span><small>{orderWhen(t.at)}</small></li>
              ))}
              {next && <li className="ot-next"><i className={`ti ${next.icon}`} aria-hidden="true" /><span>{next.label}</span><small>{orderWhen(next.at)}</small></li>}
            </ol>
            {buyer && order.held && ['PENDING', 'IN_PROGRESS'].includes(order.status) && (
              <p className="ot-warn"><i className="ti ti-shield-check" aria-hidden="true" /> Never confirm before you have your order, even if the seller asks.</p>
            )}
          </div>

          <div className="oc-blocks">
            {/* Only this order's buyer and seller (and OgaPay) ever see the address (B7) */}
            {order.shipping && (
              <div className="ob">
                <span className="ob-label"><i className="ti ti-map-pin" aria-hidden="true" /> {buyer ? 'Your delivery address' : 'Deliver to'}</span>
                <p className="ob-text open">{order.shipping.name} · {order.shipping.phone}<br />{addressLine(order.shipping)}</p>
              </div>
            )}
            {requestLines(order, order.role).map((l) => <p key={l.icon} className={`so-line${l.bad ? ' bad' : ''}`}><i className={`ti ${l.icon}`} aria-hidden="true" /><span>{l.text}</span></p>)}
            {hasBrief && <OrderBrief label={buyer ? 'Your brief' : "Buyer's brief"} brief={order.brief} files={order.briefFiles || []} />}
            <OrderBrief label={buyer ? 'What the seller delivered' : 'What you delivered'} more="Read more" brief={order.deliveryNote} files={order.deliveryFiles || []} />
            {order.disputeReason && (order.status === 'DISPUTED' || order.disputedAt) && (
              <OrderBrief label={buyer ? 'The problem you reported' : 'The problem the buyer reported'} more="Read more" brief={order.disputeReason} files={order.disputeFiles || []} />
            )}
            <OrderBrief label={buyer ? "The seller's side" : 'Your side, sent to OgaPay'} more="Read more" brief={order.sellerResponse} files={order.sellerResponseFiles || []} />
            {decision && <p className="so-line"><i className="ti ti-scale" aria-hidden="true" /><span>{decision}</span></p>}
          </div>

          {/* The same steps as My orders and My Store */}
          <div className="ui-card ms2-order oc-acts">
            <OrderActions order={order} role={order.role} onDone={onDone} details={false} checkCompliment lead={<span className={`ms2-badge ${badge.cls}`}>{badge.label}</span>} />
          </div>

          <div className="ui-actions">
            <Link className="ui-btn ui-btn-dark ui-btn-lg" to={chat}><i className="ti ti-message-circle" aria-hidden="true" /> {other ? `Message @${other.username}` : 'Open messages'}</Link>
            <Link className="ui-btn ui-btn-ghost ui-btn-lg" to={buyer ? '/store/orders' : '/my-store?tab=orders'}>{buyer ? 'My orders' : 'My store orders'}</Link>
          </div>
          <p className="sc-ref">Order reference {order.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>
    </Layout>
  )
}
