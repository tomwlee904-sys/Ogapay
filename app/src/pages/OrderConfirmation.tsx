import { Link, useLocation, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { CURRENCY_SYMBOLS, type Currency } from '../lib/currency'
import '../styles/checkout.css'

// Shown after a store purchase. Checkout passes the item and the chat the purchase
// opened with the seller; after a reload that state is gone, so fall back to the inbox.
type Done = { title?: string; seller?: string; total?: number; currency?: Currency; conversationId?: string }

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>()
  const s = (useLocation().state || {}) as Done
  const chat = s.conversationId ? `/messages?c=${s.conversationId}` : '/messages'
  const total = s.total != null && s.currency
    ? `${CURRENCY_SYMBOLS[s.currency] || ''}${s.total.toLocaleString('en-US', { maximumFractionDigits: s.currency === 'SOL' ? 4 : 2 })}${s.currency === 'NGN' ? '' : ' ' + s.currency}`
    : null

  return (
    <Layout>
      <div className="ui-page">
        <div className="sc-done">
          <div className="sc-done-ic"><i className="ti ti-check" /></div>
          <h1 className="ui-title">Order placed</h1>
          <p className="ui-sub">
            {s.seller ? <>@{s.seller} has been told about your order.</> : <>The seller has been told about your order.</>}
            {' '}OgaPay holds your payment until you confirm you received it, or 3 days after the seller marks it delivered.
            {' '}Use the chat to share any details they need.
          </p>

          {s.title && (
            <div className="ui-card ui-card-pad">
              <div className="sc-line"><span>{s.title}</span><span>{total}</span></div>
              {s.seller && <div className="sc-line" style={{ borderBottom: 0 }}><span>Seller</span><span>@{s.seller}</span></div>}
            </div>
          )}

          <div className="ui-actions">
            <Link className="ui-btn ui-btn-dark ui-btn-lg" to={chat}><i className="ti ti-message-circle" /> {s.seller ? `Message @${s.seller}` : 'Open messages'}</Link>
            <Link className="ui-btn ui-btn-ghost ui-btn-lg" to="/store/orders">My orders</Link>
          </div>
          {id && <p className="sc-ref">Order reference {id.slice(0, 8).toUpperCase()}</p>}
        </div>
      </div>
    </Layout>
  )
}
