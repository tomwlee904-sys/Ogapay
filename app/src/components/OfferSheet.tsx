import { useEffect, useState } from 'react'
import Modal from './Modal'
import { apiRequest } from '../lib/api'
import { orderMoney } from '../pages/StoreOrders'
import '../styles/store-extras.css'

// Send one buyer a private offer (F13, 2026-11-10): the price you agreed in the
// chat, for one of your products. The buyer pays it from the chat or the link
// in their notifications, and OgaPay holds the money like any order. Opened from
// a chat about your product (the buyer is the other person) or from My Store
// (type the buyer's username). A new offer replaces your open one to that buyer.

export type OfferProduct = { id: string; name: string; currency: string; price?: number; priceOnRequest?: boolean; delivery?: string }
const DELIVERY = ['', 'Instant (digital)', '1 day', '2 days', '3 days', '5 days', '1 week', '2 weeks']
const DAYS = [1, 3, 7, 14, 30]

export default function OfferSheet({ product, conversationId, buyer, onClose, onSent }: {
  product: OfferProduct; conversationId?: string; buyer?: string; onClose: () => void; onSent: (msg: string) => void
}) {
  const [username, setUsername] = useState(buyer || '')
  const [price, setPrice] = useState(product.priceOnRequest || !product.price ? '' : String(product.price))
  const [delivery, setDelivery] = useState('')
  const [days, setDays] = useState('7')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setError('') }, [username, price])

  const ngn = product.currency === 'NGN'
  const amount = Number(price)
  const send = async () => {
    if (!conversationId && !username.trim()) { setError("Enter the buyer's username."); return }
    if (!(amount > 0)) { setError('Enter the price you agreed.'); return }
    if (ngn && amount < 100) { setError('The lowest price is ₦100.'); return }
    setBusy(true); setError('')
    try {
      await apiRequest('/store/offers', {
        method: 'POST',
        body: JSON.stringify({
          itemId: product.id, price: amount, days: Number(days),
          ...(conversationId ? { conversationId } : { username: username.trim().replace(/^@/, '') }),
          ...(note.trim() && { note: note.trim() }), ...(delivery && { delivery }),
        }),
      })
      onSent(`Offer sent: ${product.name} for ${orderMoney(amount, product.currency)}. The buyer can pay it from your chat.`)
    } catch (e: any) { setError(e?.message || 'The offer could not be sent. Try again.') }
    setBusy(false)
  }

  return (
    <Modal open onClose={() => { if (!busy) onClose() }} title="Send a private offer">
      <div className="of-form">
        <div className="of-prod"><i className="ti ti-package" aria-hidden="true" /> <b>{product.name}</b></div>
        {conversationId
          ? buyer && <small>For @{buyer} only. They pay it from your chat, and OgaPay holds the money until they confirm they received the order.</small>
          : (
            <label>Buyer's username
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. amaka" autoCapitalize="none" autoCorrect="off" maxLength={60} />
              <small>Only this person can pay it. OgaPay holds the money until they confirm they received the order.</small>
            </label>
          )}
        <div className="of-row">
          <label>{ngn ? 'Price you agreed (₦)' : `Price you agreed (${product.currency})`}
            <input inputMode="decimal" value={price} placeholder="5000" onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, '')
              setPrice(ngn ? v.replace(/^(\d*\.?\d{0,2}).*$/, '$1') : v)
            }} />
          </label>
          <label>Delivery time
            <select value={delivery} onChange={(e) => setDelivery(e.target.value)}>
              {DELIVERY.map((d) => <option key={d} value={d}>{d || `As listed${product.delivery ? ` (${product.delivery})` : ''}`}</option>)}
            </select>
          </label>
        </div>
        <label>Offer ends after
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            {DAYS.map((d) => <option key={d} value={d}>{d === 1 ? '1 day' : `${d} days`}</option>)}
          </select>
        </label>
        <label>Note for the buyer (optional)
          <textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} placeholder="What's included, e.g. 3 logo ideas and 2 changes" />
          <small>{note.length}/1000</small>
        </label>
        {error && <p className="of-err" role="alert">{error}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="ui-btn ui-btn-dark" style={{ flex: 1 }} onClick={send} disabled={busy}>
            {busy ? 'Sending…' : amount > 0 ? `Send offer for ${orderMoney(amount, product.currency)}` : 'Send offer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
