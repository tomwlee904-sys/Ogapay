import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { sized } from '../lib/img'
import { orderBadge, orderMoney, type StoreOrder } from './StoreOrders'
import '../styles/checkout.css'
import '../styles/my-store.css'

// One store order. Right after a purchase, checkout passes what was bought and
// the chat it opened with the seller, and the page says "Order placed". The
// order itself is always loaded from the server, so a made-up or someone
// else's id shows "Order not found" instead of a false confirmation. The order
// keeps the product's name, price and picture, so it still shows what was
// bought after the seller deletes the product.
type Done = { title?: string; seller?: string; conversationId?: string; briefSent?: boolean }
type Order = StoreOrder & {
  role: 'BUYER' | 'SELLER'
  seller: { username: string; name: string } | null
  buyer: { username: string; name: string } | null
}

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>()
  const s = (useLocation().state || {}) as Done
  const [order, setOrder] = useState<Order | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!id) { setState('missing'); return }
    setState('loading')
    apiRequest<Order>(`/store/orders/${id}`)
      .then((o) => { setOrder(o); setState('ok') })
      .catch((e: any) => setState(e?.status === 404 || /not found/i.test(e?.message || '') ? 'missing' : 'error'))
  }, [id, reloadKey])

  if (state === 'loading') {
    return <Layout><div className="ui-page"><div className="sc-done"><p className="ui-sub">Loading your order…</p></div></div></Layout>
  }

  if (state !== 'ok' || !order) {
    return (
      <Layout>
        <div className="ui-page">
          <div className="sc-done">
            <div className="sc-done-ic" style={{ background: 'var(--card2)', color: 'var(--text2)' }}><i className="ti ti-receipt-off" aria-hidden="true" /></div>
            <h1 className="ui-title">{state === 'missing' ? 'Order not found' : "We couldn't load this order"}</h1>
            <p className="ui-sub">
              {state === 'missing'
                ? "There's no order with this link on your account. Your orders are all under My orders."
                : 'Check your connection and try again. Nothing has changed on your account.'}
            </p>
            <div className="ui-actions">
              <Link className="ui-btn ui-btn-dark ui-btn-lg" to="/store/orders">My orders</Link>
              {state === 'error' && <button type="button" className="ui-btn ui-btn-ghost ui-btn-lg" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>}
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

  return (
    <Layout>
      <div className="ui-page">
        <div className="sc-done">
          {justPlaced && <div className="sc-done-ic"><i className="ti ti-check" aria-hidden="true" /></div>}
          <h1 className="ui-title">{justPlaced ? 'Order placed' : 'Your order'}</h1>
          {justPlaced ? (
            <p className="ui-sub">
              {other ? <>@{other.username} has been told about your order.</> : <>The seller has been told about your order.</>}
              {' '}OgaPay holds your payment until you confirm you received it, or 3 days after the seller marks it delivered.
              {s.briefSent === true ? ' Your brief and attachments are in your chat with them.' : ' Use the chat to share any details they need.'}
            </p>
          ) : (
            <p className="ui-sub">Status: <span className={`ms2-badge ${badge.cls}`}>{badge.label}</span></p>
          )}
          {justPlaced && s.briefSent === false && (
            <p className="sc-note warn" style={{ justifyContent: 'center' }}><i className="ti ti-info-circle" aria-hidden="true" /> We couldn't send your brief. Please paste it into the chat with the seller.</p>
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
            <div className="sc-line" style={{ borderBottom: 0 }}><span>Ordered</span><span>{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
            {p.available === false && <p className="ui-sub" style={{ marginTop: 8, fontSize: 13 }}>The seller has removed this product from the store. Your order and its payment protection are not affected.</p>}
          </div>

          <div className="ui-actions">
            <Link className="ui-btn ui-btn-dark ui-btn-lg" to={chat}><i className="ti ti-message-circle" aria-hidden="true" /> {other ? `Message @${other.username}` : 'Open messages'}</Link>
            <Link className="ui-btn ui-btn-ghost ui-btn-lg" to={buyer ? '/store/orders' : '/my-store'}>{buyer ? 'My orders' : 'My store'}</Link>
          </div>
          <p className="sc-ref">Order reference {order.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>
    </Layout>
  )
}
