import { useState } from 'react'
import { renderBlog } from '../lib/blogMarkdown'
import { orderMoney } from '../pages/StoreOrders'
import '../styles/order-brief.css'
import '../styles/my-store.css'
import '../styles/store-extras.css'

// What the listing said when the buyer paid (F22, 2026-11-10): saved on the
// order, so a later edit can't change what was promised. Shown on the order page
// and on the admin dispute card. Closed by default; older orders have none.

export type Listing = {
  name: string; description: string; price: number | null; currency: string; priceOnRequest?: boolean
  delivery: string | null; revisions: number | null; category?: string | null; subcategory?: string | null
  downloadFiles?: number; offer?: { price: number; note: string | null; delivery: string | null }; savedAt: string
}

export default function OrderListing({ listing, label = 'The listing when it was bought' }: { listing?: Listing | null; label?: string }) {
  const [open, setOpen] = useState(false)
  if (!listing) return null
  const L = listing
  const facts: [string, string][] = [
    ['Price', L.priceOnRequest || L.price == null ? 'Price on request' : orderMoney(L.price, L.currency)],
    ...(L.offer ? [['Private offer', orderMoney(L.offer.price, L.currency)] as [string, string]] : []),
    ['Delivery', L.offer?.delivery || L.delivery || 'Not given'],
    ['Revisions', L.revisions == null ? 'Not given' : String(L.revisions)],
    ...(L.downloadFiles ? [['Instant download', `${L.downloadFiles} file${L.downloadFiles === 1 ? '' : 's'}`] as [string, string]] : []),
  ]
  return (
    <div className="ob">
      <span className="ob-label"><i className="ti ti-history" aria-hidden="true" /> {label}</span>
      <p className="ob-text open" style={{ fontWeight: 600 }}>{L.name}</p>
      <ul className="ol-facts">
        {facts.map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}
      </ul>
      {L.offer?.note && <p className="ob-text open">Offer note: {L.offer.note}</p>}
      {open && <div className="ms2-preview ol-desc" dangerouslySetInnerHTML={{ __html: renderBlog(L.description) }} />}
      <button type="button" className="ob-more" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide the description' : 'Show the description'}
      </button>
      <small className="ol-when">Saved {new Date(L.savedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. Later edits to the product don't change this.</small>
    </div>
  )
}
