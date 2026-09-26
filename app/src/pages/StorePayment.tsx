import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import FundWalletModal from '../components/FundWalletModal'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { apiRequest } from '../lib/api'
import { CURRENCY_SYMBOLS, type Currency } from '../lib/currency'
import '../styles/checkout.css'

// Store checkout. A purchase takes the item's price from the buyer's wallet in the
// item's currency (POST /store/:id/purchase); there is no other payment path, so the
// old card/crypto/manual options (which showed a made-up address and charged the
// wallet after a card payment) and the 5% fee the backend never charged are gone.
// Short of money? "Add money" opens the wallet top-up, then you pay from the wallet.

type Item = {
  id: string; title: string; description: string; price: number; currency: Currency
  seller: string; sellerId?: string; sellerAvatar: string | null; image: string
  stock: number | null; isActive?: boolean
}

const money = (n: number, c: Currency) =>
  `${CURRENCY_SYMBOLS[c] || ''}${n.toLocaleString('en-US', { minimumFractionDigits: c === 'NGN' ? 0 : 2, maximumFractionDigits: c === 'SOL' ? 4 : 2 })}${c === 'NGN' ? '' : ' ' + c}`

export default function StorePayment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { balances, refresh } = useWalletBalance()
  const [item, setItem] = useState<Item | null>(null)
  const [loadError, setLoadError] = useState('')
  const [topUp, setTopUp] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    apiRequest<Item>('/store/' + id, { auth: false })
      .then(setItem)
      .catch((e: any) => setLoadError(e?.message || "This product couldn't be loaded"))
  }, [id])

  if (loadError) {
    return (
      <Layout>
        <div className="ui-page sc-wrap">
          <div className="ui-empty">
            <p>{loadError}</p>
            <Link className="ui-btn ui-btn-ghost" to="/store">Back to the store</Link>
          </div>
        </div>
      </Layout>
    )
  }
  if (!item) {
    return (
      <Layout>
        <div className="ui-page sc-wrap">
          <div className="ui-sk" style={{ height: 28, width: 180 }} />
          <div className="sc-grid" style={{ marginTop: 24 }}>
            <div className="ui-sk" style={{ height: 320 }} />
            <div className="ui-sk" style={{ height: 240 }} />
          </div>
        </div>
      </Layout>
    )
  }

  const available = balances?.[item.currency]?.available ?? 0
  const short = Math.max(0, item.price - available)
  const own = !!user && item.sellerId === user.id
  const soldOut = item.isActive === false || item.stock === 0
  const canPay = !own && !soldOut && short === 0 && !paying

  const pay = async () => {
    setPaying(true); setError('')
    try {
      const order = await apiRequest<{ id: string; conversationId?: string }>(`/store/${item.id}/purchase`, { method: 'POST', body: JSON.stringify({ quantity: 1 }) })
      refresh()
      navigate(`/orders/${order.id}`, { replace: true, state: { title: item.title, seller: item.seller, total: item.price, currency: item.currency, conversationId: order.conversationId } })
    } catch (e: any) {
      setError(e?.message || 'Payment failed. You have not been charged.')
      setPaying(false)
    }
  }

  return (
    <Layout>
      <div className="ui-page sc-wrap">
        <Link to={`/store/${item.id}`} className="sc-back"><i className="ti ti-arrow-left" /> Back to product</Link>
        <span className="ui-eyebrow">Checkout</span>
        <h1 className="ui-title">Review and pay</h1>

        <div className="sc-grid">
          <div className="sc-main">
            <section className="ui-card sc-product">
              <div className="sc-thumb">{item.image ? <img src={item.image} alt="" /> : <i className="ti ti-package" />}</div>
              <div className="sc-product-t">
                <h2>{item.title}</h2>
                <p className="sc-by">Sold by <Link to={`/user/${item.seller}`}>@{item.seller}</Link></p>
                {item.description && <p className="sc-desc">{item.description}</p>}
              </div>
            </section>

            <section className="ui-card ui-card-pad">
              <span className="ui-label">Pay with</span>
              <div className="sc-method">
                <span className="sc-method-ic"><i className="ti ti-wallet" /></span>
                <div className="sc-method-t">
                  <strong>Your {item.currency} wallet</strong>
                  <span>Available: {money(available, item.currency)}</span>
                </div>
                <span className={`sc-state${short ? ' warn' : ''}`}>{short ? 'Not enough' : 'Ready'}</span>
              </div>
              {short > 0 && !own && !soldOut && (
                <div className="sc-short">
                  <p>You need <b>{money(short, item.currency)}</b> more. Add money by card, bank transfer or crypto, then come back here to pay.</p>
                  <button className="ui-btn ui-btn-ghost" onClick={() => setTopUp(true)}><i className="ti ti-plus" /> Add money</button>
                </div>
              )}
            </section>
          </div>

          <aside className="ui-card ui-card-pad sc-summary">
            <span className="ui-label">Order summary</span>
            <div className="sc-line"><span>{item.title}</span><span>{money(item.price, item.currency)}</span></div>
            <div className="sc-line"><span>Quantity</span><span>1</span></div>
            <div className="sc-line total"><span>Total</span><span>{money(item.price, item.currency)}</span></div>

            {own && <p className="sc-note warn"><i className="ti ti-info-circle" /> This is your own product, so you can't buy it.</p>}
            {soldOut && !own && <p className="sc-note warn"><i className="ti ti-info-circle" /> This product isn't available right now.</p>}

            <button className="ui-btn ui-btn-dark ui-btn-lg sc-pay" disabled={!canPay} onClick={pay}>
              {paying ? <><i className="ti ti-loader-2 sc-spin" /> Paying…</> : <>Pay {money(item.price, item.currency)}</>}
            </button>
            {error && <p className="sc-error" role="alert">{error}</p>}

            <p className="sc-note">
              <i className="ti ti-message-circle" /> The seller is paid straight away and a chat with them opens so you can arrange delivery.
            </p>
            <p className="sc-fine">By paying you agree to the <Link to="/terms">Terms of Service</Link>.</p>
          </aside>
        </div>
      </div>
      {topUp && <FundWalletModal initialStep="deposit" initialTab={item.currency === 'NGN' ? 'bank' : 'crypto'} onClose={() => { setTopUp(false); refresh() }} onDone={() => refresh()} />}
    </Layout>
  )
}
