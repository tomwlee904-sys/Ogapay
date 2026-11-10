import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import OrderBrief from '../components/OrderBrief'
import OrderActions from '../components/OrderActions'
import { apiRequest } from '../lib/api'
import { uploadImage, uploadFile, MAX_FILE_MB, type UploadedFile } from '../lib/upload'
import { renderBlog } from '../lib/blogMarkdown'
import { useAuth } from '../context/AuthContext'
import { decisionText, orderBadge, orderWhen, type StoreOrder } from './StoreOrders'
import { useMoney } from '../lib/useMoney'
import { useCurrency } from '../context/CurrencyContext'
import { formatCedi } from '../lib/money'
import '../styles/profile-public.css'
import '../styles/hire.css'
import '../styles/edit-profile.css'
import '../styles/my-store.css'
import { sized } from '../lib/img'
import LoadError from '../components/LoadError'
// 2026-11-10: private offers (F13) and download files (F21)
import OfferSheet from '../components/OfferSheet'
import MyOffers from '../components/MyOffers'
import DeliverableFiles, { useDeliverables } from '../components/DeliverableFiles'

type Product = {
  id: string; name: string; description: string; price: number; currency: string; imageUrl: string | null
  category: string; subcategory?: string; stock: number | null; isActive: boolean; status: 'Active' | 'Draft' | 'Removed'
  // Taken down by OgaPay (2026-11-10): the reason the team gave; it can't be published again
  delistedAt?: string | null; delistReason?: string | null
  sales: number; orders: number; avgRating: number; reviewsCount: number; delivery?: string; revisions?: number; tags?: string[]
  priceOnRequest?: boolean; sampleFiles?: UploadedFile[]; searchTags?: string
  sellerReceives?: number; buyerPays?: number; feePercent?: number
  // Orders still running (to deliver, delivered, reported): deleting doesn't cancel them
  openOrders?: number
}
// What's missing before the seller can publish (server: EMAIL, LEVEL1)
type Needs = string[]
// The VERIFY_* codes a refused publish sends back
const needsOf = (e: any): Needs => (Array.isArray(e?.errors) ? e.errors.map((x: any) => String(x?.code || '')).filter((c: string) => c.startsWith('VERIFY_')).map((c: string) => c.slice(7)) : [])
const MAX_FILES = 5
const FILE_ICON: Record<string, string> = { image: 'ti-photo', audio: 'ti-music', video: 'ti-movie', pdf: 'ti-file-type-pdf', text: 'ti-file-text' }
// OgaPay takes no fee on store sales today (backend STORE_FEE_PERCENT = 0)
const STORE_FEE_PERCENT = 0
type Order = StoreOrder & { buyer: { username: string; name: string; avatarUrl: string | null } }

const CATEGORIES = [
  'Graphics & Design', 'Writing & Translation', 'Social Media & Growth', 'Video & Animation', 'Web & App Development',
  'Marketing & Ads', 'Music & Audio', 'Photography', 'Data & Research', 'Tutoring & Coaching', 'Digital Products', 'Other',
]
// 2026-11-08: an order not marked delivered is refunded to the buyer 14 days after
// it's paid, or the delivery time plus 7 days if that's later (the server keeps
// the delivery time on the order), so '2 weeks' is safe to promise
const DELIVERY = ['Instant (digital)', '1 day', '2 days', '3 days', '5 days', '1 week', '2 weeks']
const MIN_NGN = 100

const money = (n: number, cur = 'NGN') =>
  cur === 'NGN' ? '₦' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${cur}`
const blank = { name: '', description: '', price: '', currency: 'NGN', category: CATEGORIES[0], subcategory: '', imageUrl: '', stock: '', delivery: '3 days', revisions: '2', tags: '', priceMode: 'fixed' }
type Form = typeof blank
const startForm = (product: Product | null): Form => product ? {
  name: product.name, description: product.description, price: product.priceOnRequest ? '' : String(product.price), currency: product.currency,
  category: product.category, subcategory: product.subcategory || '', imageUrl: product.imageUrl || '', stock: product.stock === null ? '' : String(product.stock),
  delivery: product.delivery || '3 days', revisions: String(product.revisions ?? 2),
  tags: product.searchTags || (product.tags || []).join(', '), priceMode: product.priceOnRequest ? 'request' : 'fixed',
} : blank
// Server field names to the form's (a refused save highlights the right field;
// others are named in the message)
const FIELD_OF: Record<string, string> = { name: 'name', description: 'description', price: 'price', currency: 'price', stock: 'stock', searchTags: 'tags', tags: 'tags', imageUrl: 'imageUrl', sampleFiles: 'files' }

// Publishing needs a verified email and Level 1 (2026-11-10). Hidden products can
// always be saved, and products already live stay up.
function VerifyToSell({ needs }: { needs: Needs }) {
  if (!needs.length) return null
  const email = needs.includes('EMAIL'), level = needs.includes('LEVEL1')
  return (
    <div className="so-line ms2-verify" role="note">
      <i className="ti ti-shield-check" aria-hidden="true" />
      <div>
        <span>To publish products, {email && level ? 'verify your email and your account (Level 1)' : email ? 'verify your email' : 'verify your account (Level 1)'}. This keeps fake sellers out of the store. Until then you can save products as hidden, and products already live stay up.</span>
        <div className="acts">
          {email && <Link className="up-btn" to="/settings/account">Verify email</Link>}
          {level && <Link className="up-btn primary" to="/settings/verification">Verify account</Link>}
        </div>
      </div>
    </div>
  )
}

export default function MyStore() {
  // Prices and revenue in the display currency; order payments and refunds stay real
  const show = useMoney()
  const { user } = useAuth()
  // Buyers can't see a private profile's or a checked account's products (B17, 2026-11-10)
  const [visibility, setVisibility] = useState<{ visible: boolean; reason: 'private' | 'review' | null } | null>(null)
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'orders' ? 'orders' : params.get('tab') === 'offers' ? 'offers' : 'products'
  // The product a private offer is being sent for (F13)
  const [offerFor, setOfferFor] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')
  // What the last order step did (OrderActions, 2026-11-10)
  const [note, setNote] = useState('')
  const [failed, setFailed] = useState({ products: false, orders: false })
  // /my-store?new=1 (the Store page's "Add a product") opens the form straight away
  const [editing, setEditing] = useState<Product | 'new' | null>(() => (params.get('new') === '1' ? 'new' : null))
  useEffect(() => {
    if (params.get('new') !== '1') return
    const next = new URLSearchParams(params); next.delete('new'); setParams(next, { replace: true })
  }, [])
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  // Verify links shown with the error when a publish was refused
  const [errorNeeds, setErrorNeeds] = useState<Needs>([])
  // From the server (fresh after verifying); the signed-in account until it answers
  const [serverNeeds, setServerNeeds] = useState<Needs | null>(null)
  const needs: Needs = serverNeeds ?? [
    ...(user?.isEmailVerified ? [] : ['EMAIL']),
    ...((user?.kycStatus === 'APPROVED' ? user.kycTier || 0 : 0) >= 1 ? [] : ['LEVEL1']),
  ]

  const load = () => {
    // A failed load shows Try again, never "0 products" or "no orders"
    setFailed({ products: false, orders: false })
    apiRequest<{ visible: boolean; reason: 'private' | 'review' | null }>('/store/my-visibility').then(setVisibility).catch(() => {})
    apiRequest<any>('/store/my-products').then((d) => {
      setProducts(Array.isArray(d?.products) ? d.products : [])
      if (Array.isArray(d?.seller?.needs)) setServerNeeds(d.seller.needs)
    }).catch(() => setFailed((f) => ({ ...f, products: true })))
    apiRequest<Order[]>('/store/my-orders').then((d) => setOrders(Array.isArray(d) ? d : [])).catch(() => setFailed((f) => ({ ...f, orders: true })))
  }
  useEffect(load, [])

  // Paid to the seller (released, or paid at purchase on older orders) vs still held for the buyer
  const [revenue, held] = useMemo(() => {
    const sum = (list: Order[]) => {
      const by: Record<string, number> = {}
      // A split order paid the seller the total less what went back to the buyer (2026-11-10)
      for (const o of list) by[o.currency] = (by[o.currency] || 0) + o.total - (o.refundedPart || 0)
      return Object.entries(by).map(([c, v]) => show(v, c)).join(' · ')
    }
    const paid = (orders || []).filter((o) => o.releasedAt || (!o.protected && o.status !== 'CANCELLED'))
    return [sum(paid) || show(0), sum((orders || []).filter((o) => o.held))]
  }, [orders, show])
  const live = (products || []).filter((p) => p.isActive).length
  const open = (orders || []).filter((o) => o.status === 'PENDING' || o.status === 'IN_PROGRESS').length
  const rated = (products || []).filter((p) => p.reviewsCount > 0)
  const avg = rated.length ? rated.reduce((s, p) => s + p.avgRating * p.reviewsCount, 0) / rated.reduce((s, p) => s + p.reviewsCount, 0) : 0

  const ordersLine = (n: number) => `${n === 1 ? '1 order' : `${n} orders`} for it ${n === 1 ? 'is' : 'are'} still open`
  const setStatus = async (p: Product, active: boolean) => {
    if (!active && !window.confirm(`Hide "${p.name}" from the store?${p.openOrders ? ` ${ordersLine(p.openOrders)}: they don't change.` : ''} ${needs.length ? "To publish it again you'll need to verify your account first." : 'You can publish it again any time.'}`)) return
    setBusy(p.id); setError(''); setErrorNeeds([]); setNotice('')
    try { await apiRequest(`/store/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status: active ? 'ACTIVE' : 'DRAFT' }) }); load() }
    catch (e: any) { setError(e?.message || 'Could not update the product'); setErrorNeeds(needsOf(e)) }
    setBusy('')
  }
  const remove = async (p: Product) => {
    const open = p.openOrders || 0
    const text = open
      ? `Delete "${p.name}"? It disappears from the store.\n\n${ordersLine(open)}. Deleting doesn't cancel ${open === 1 ? 'it' : 'them'}: you still need to deliver from the Orders tab.`
      : `Delete "${p.name}"? It disappears from the store. Past orders are kept.`
    if (!window.confirm(text)) return
    setBusy(p.id); setError(''); setErrorNeeds([]); setNotice('')
    try {
      const d = await apiRequest<{ openOrders?: number }>(`/store/products/${p.id}`, { method: 'DELETE' })
      const left = Number(d?.openOrders) || 0
      if (left) setNotice(`"${p.name}" is deleted. ${left === 1 ? '1 order is' : `${left} orders are`} still open: deliver ${left === 1 ? 'it' : 'them'} from the Orders tab.`)
      load()
    }
    catch (e: any) { setError(e?.message || 'Could not delete the product') }
    setBusy('')
  }
  return (
    <Layout>
      <div className="up-wrap">
        {/* Back to the Profile, as on Edit profile (2026-11-08) */}
        <div className="up-crumb">
          <Link to="/profile" className="tap" style={{ color: 'var(--text2)', textDecoration: 'none' }}><i className="ti ti-arrow-left" aria-hidden="true" /> Profile</Link>
        </div>
        <div className="ms2-head">
          <div>
            <h1>My Store</h1>
            <p>Sell services and digital products. Buyers pay from their OgaPay wallet; the money comes to you when they confirm delivery, or 3 days after you mark it delivered.</p>
          </div>
          <div className="acts">
            {user?.username && <Link className="up-btn" to={`/user/${user.username}`}><i className="ti ti-eye" /> View public store</Link>}
            <button className="up-btn primary" onClick={() => setEditing('new')}><i className="ti ti-plus" /> Add product</button>
          </div>
        </div>

        {visibility && !visibility.visible && (
          <div className="up-note err" role="status" style={{ marginBottom: 12 }}>
            <i className="ti ti-eye-off" aria-hidden="true" />{' '}
            {visibility.reason === 'private'
              ? <>Your profile is private, so buyers can't see your products. <Link to="/edit-profile" style={{ color: 'inherit', fontWeight: 600 }}>Make your profile public</Link> to show your store.</>
              : <>Your products are hidden from the store while our team checks your account. <Link to="/support" style={{ color: 'inherit', fontWeight: 600 }}>Contact support</Link> if you think this is a mistake.</>}
          </div>
        )}

        <div className="ms2-stats">
          <div className="up-card ms2-stat"><span><i className="ti ti-building-store" /> Live products</span><b>{products ? live : '…'}</b><small>{products ? `${products.length - live} hidden` : ''}</small></div>
          <div className="up-card ms2-stat"><span><i className="ti ti-shopping-cart" /> Orders</span><b>{orders ? orders.length : '…'}</b><small>{orders ? `${open} to deliver` : ''}</small></div>
          <div className="up-card ms2-stat"><span><i className="ti ti-coin" /> Revenue</span><b style={{ fontSize: 18 }}>{orders ? revenue : '…'}</b><small>{held ? `+ ${held} on hold` : 'paid to your wallet'}</small></div>
          <div className="up-card ms2-stat"><span><i className="ti ti-star" /> Rating</span><b>{rated.length ? avg.toFixed(1) : '—'}</b><small>{rated.reduce((s, p) => s + p.reviewsCount, 0)} reviews</small></div>
        </div>

        <div className="up-tabs-row" style={{ marginTop: 0 }}>
          <div className="up-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'products'} className={`up-tab ${tab === 'products' ? 'on' : ''}`} onClick={() => setParams({})}><i className="ti ti-package" /> Products {products?.length ? <em>{products.length}</em> : null}</button>
            <button role="tab" aria-selected={tab === 'orders'} className={`up-tab ${tab === 'orders' ? 'on' : ''}`} onClick={() => setParams({ tab: 'orders' })}><i className="ti ti-receipt" /> Orders {open ? <em>{open} open</em> : null}</button>
            <button role="tab" aria-selected={tab === 'offers'} className={`up-tab ${tab === 'offers' ? 'on' : ''}`} onClick={() => setParams({ tab: 'offers' })}><i className="ti ti-send" /> Offers</button>
          </div>
        </div>

        {error && <div className="up-note err" role="alert" style={{ marginBottom: 12 }}>{error} <button className="up-btn" style={{ padding: '0 10px', marginLeft: 8 }} onClick={() => { setError(''); setErrorNeeds([]) }}>Dismiss</button></div>}
        {note && tab === 'orders' && <div className="up-note ok" role="status" style={{ marginBottom: 12 }}><i className="ti ti-circle-check" /> {note}</div>}
        {notice && <div className="up-note ok" role="status" style={{ marginBottom: 12 }}>{notice} <button className="up-btn" style={{ padding: '0 10px', marginLeft: 8 }} onClick={() => setNotice('')}>OK</button></div>}
        {tab === 'products' && products !== null && (needs.length > 0 || errorNeeds.length > 0) && <div style={{ marginBottom: 14 }}><VerifyToSell needs={needs.length ? needs : errorNeeds} /></div>}

        {tab === 'offers' ? <MyOffers /> : tab === 'products' ? (
          products === null ? (failed.products ? <LoadError what="your products" onRetry={load} /> : <div className="up-skel" style={{ height: 140 }} />)
          : products.length === 0 ? (
            <div className="up-empty">
              <i className="ti ti-building-store" />
              List your first product or service. It shows in the OgaPay store and on your public profile.
              <div style={{ marginTop: 14 }}><button className="up-btn primary" onClick={() => setEditing('new')}><i className="ti ti-plus" /> Add product</button></div>
            </div>
          ) : (['active', 'hidden'] as const).map((group) => {
            const list = products.filter((p) => (group === 'active' ? p.isActive : !p.isActive))
            if (!list.length) return null
            return (
              <section key={group} className="ms2-group">
                <h2 className="ms2-group-h">
                  {group === 'active' ? 'Active' : 'Hidden'} <em>{list.length}</em>
                  <small>{group === 'active' ? 'In your public store' : 'Not shown to buyers. Publish to list them again.'}</small>
                </h2>
                {list.map((p) => (
            <div className="up-card ms2-prod" key={p.id}>
              <div className="ms2-thumb">{p.imageUrl ? <img src={sized(p.imageUrl, 72)} alt="" loading="lazy" /> : <i className="ti ti-package" />}</div>
              <div style={{ minWidth: 0 }}>
                <h3>{p.name}</h3>
                <div className="meta">
                  <span className={`ms2-badge ${p.isActive ? 'live' : ''}`}>{p.delistedAt ? 'Removed by OgaPay' : p.isActive ? 'Live' : 'Hidden'}</span>
                  <span><b>{p.priceOnRequest ? 'Price on request' : show(p.price, p.currency)}</b></span>
                  {!!p.sampleFiles?.length && <span><i className="ti ti-paperclip" aria-hidden="true" /> {p.sampleFiles.length}</span>}
                  <span>{p.orders} {p.orders === 1 ? 'order' : 'orders'}</span>
                  {p.reviewsCount > 0 && <span><i className="ti ti-star" aria-hidden="true" style={{ fontSize: "0.95em", verticalAlign: "-0.1em" }} /> {p.avgRating.toFixed(1)} ({p.reviewsCount})</span>}
                  {p.stock !== null && <span>{p.stock} in stock</span>}
                  <span>{p.delivery}</span>
                </div>
                {p.delistedAt && <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--red)' }}>Removed by OgaPay: {p.delistReason || 'it broke the store rules'}. You can't publish it again. <Link to="/support" style={{ color: 'inherit', fontWeight: 600 }}>Contact support</Link> if you think this is a mistake.</p>}
              </div>
              <div className="ms2-row-acts">
                {p.isActive && <Link className="up-btn" to={`/store/${p.id}`}>View</Link>}
                {p.isActive && !p.delistedAt && <button className="up-btn" disabled={busy === p.id} onClick={() => { setNotice(''); setOfferFor(p) }}>Send offer</button>}
                <button className="up-btn" disabled={busy === p.id} onClick={() => setEditing(p)}>Edit</button>
                {!p.delistedAt && <button className="up-btn" disabled={busy === p.id} onClick={() => setStatus(p, !p.isActive)}>{p.isActive ? 'Unpublish' : 'Publish'}</button>}
                <button className="up-btn" disabled={busy === p.id} onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><i className="ti ti-trash" /></button>
              </div>
            </div>
                ))}
              </section>
            )
          })
        ) : (
          orders === null ? (failed.orders ? <LoadError what="your orders" onRetry={load} /> : <div className="up-skel" style={{ height: 140 }} />)
          : orders.length === 0 ? <div className="up-empty"><i className="ti ti-receipt" />No orders yet. When someone buys, it shows here and you get a message from them.</div>
          : orders.map((o) => (
            <div className="up-card ms2-order" key={o.id}>
              <div className="who">
                <span className="av">{o.buyer.avatarUrl ? <img src={o.buyer.avatarUrl} alt="" /> : (o.buyer.name[0] || '?').toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                  <b>{o.product.name}{o.quantity > 1 ? ` × ${o.quantity}` : ''}</b>
                  <small>by <Link to={`/user/${o.buyer.username}`} style={{ color: 'var(--text2)' }}>@{o.buyer.username}</Link> · {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</small>
                </div>
              </div>
              <div className="amt">{money(o.total, o.currency)}<small>{!o.protected ? 'paid' : o.refundedAt ? 'refunded to buyer' : o.refundedPart != null ? 'part paid to you' : o.releasedAt ? 'paid to you' : 'on hold'}</small></div>
              {o.held && o.status === 'DELIVERED' && o.releaseAt && (
                <p className="so-line"><i className="ti ti-clock" aria-hidden="true" /><span>Comes to you when the buyer confirms, or on <b>{orderWhen(o.releaseAt)}</b> if they report no problem.</span></p>
              )}
              {o.held && (o.status === 'PENDING' || o.status === 'IN_PROGRESS') && (
                <p className="so-line"><i className="ti ti-shield-check" aria-hidden="true" /><span>The buyer's payment is held by OgaPay. Deliver, then mark it delivered: you're paid when they confirm, or 3 days later.{o.autoRefundAt && <> Mark it delivered by <b>{orderWhen(o.autoRefundAt)}</b> or the buyer is refunded.</>}</span></p>
              )}
              {o.status === 'DISPUTED' && (
                <p className="so-line bad"><i className="ti ti-alert-triangle" aria-hidden="true" /><span>The buyer reported a problem: "{o.disputeReason}" The payment is on hold while OgaPay reviews it. {o.sellerResponse ? 'You told OgaPay your side; you can still edit it.' : 'Tell OgaPay your side below.'} Sort it out with them in your chat, or refund them.</span></p>
              )}
              {decisionText(o, 'SELLER') && <p className="so-line"><i className="ti ti-scale" aria-hidden="true" /><span>{decisionText(o, 'SELLER')}</span></p>}
              {/* What the buyer asked for, saved with the payment (2026-11-10) */}
              <OrderBrief brief={o.brief} fileCount={o.briefFileCount || 0} orderId={o.id} />
              {/* What you delivered (2026-11-10) */}
              <OrderBrief label="What you delivered" more="Read more" brief={o.deliveryNote} fileCount={o.deliveryFileCount || 0} orderId={o.id} />
              <OrderActions order={o} role="SELLER" onDone={(msg) => { setError(''); setNote(msg); load() }} lead={<>
                <span className={`ms2-badge ${orderBadge(o).cls}`}>{orderBadge(o).label}</span>
                <span style={{ flex: 1 }} />
                {o.conversationId && <Link className="up-btn" to={`/messages?c=${o.conversationId}`}><i className="ti ti-message" /> Message buyer</Link>}
              </>} />
            </div>
          ))
        )}
      </div>

      {editing && <ProductEditor product={editing === 'new' ? null : editing} needs={needs} ghana={user?.country === 'GH'} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice(''); load() }} />}
      {offerFor && <OfferSheet product={{ id: offerFor.id, name: offerFor.name, currency: offerFor.currency, price: offerFor.price, priceOnRequest: offerFor.priceOnRequest, delivery: offerFor.delivery }}
        onClose={() => setOfferFor(null)} onSent={(msg) => { setOfferFor(null); setNotice(msg) }} />}
    </Layout>
  )
}

function ProductEditor({ product, needs, ghana, onClose, onSaved }: { product: Product | null; needs: Needs; ghana: boolean; onClose: () => void; onSaved: () => void }) {
  const { convert } = useCurrency()
  const [form, setForm] = useState<Form>(() => startForm(product))
  const [files, setFiles] = useState<UploadedFile[]>(product?.sampleFiles || [])
  // Files buyers download after paying (F21), saved after the product
  const dl = useDeliverables(product?.id)
  // What the form held when it opened: closing with changes asks first (2026-11-10)
  const [initial] = useState(() => JSON.stringify([startForm(product), product?.sampleFiles || []]))
  const dirty = JSON.stringify([form, files]) !== initial || dl.dirty
  const [filesBusy, setFilesBusy] = useState(false)
  // Upload progress of the sample file being sent (SP8)
  const [filePct, setFilePct] = useState(0)
  const [descTab, setDescTab] = useState<'write' | 'preview'>('write')
  const [tagsBusy, setTagsBusy] = useState(false)
  const sampleRef = useRef<HTMLInputElement>(null)
  const onRequest = form.priceMode === 'request'
  const priceNum = Number(form.price) || 0
  const fee = Math.round(priceNum * STORE_FEE_PERCENT) / 100
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [saveNeeds, setSaveNeeds] = useState<Needs>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: keyof Form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); setMsg('') }
  // New products are priced in naira (2026-11-10). An older USDC or SOL product
  // keeps its currency, or can move to naira.
  const oldCrypto = !!product && product.currency !== 'NGN'
  // Publishing needs verifying first; a product that is already live stays live
  const publishBlocked = needs.length > 0 && !product?.isActive
  // Ghana sellers can type the price in cedis: it's saved in naira (what buyers pay
  // from their wallet) at today's rate. No rate yet: naira only.
  const nairaPerCedi = ghana && form.currency === 'NGN' ? convert(1, 'GHS', 'NGN') : 0
  const [cedis, setCedis] = useState('')

  const tryClose = () => {
    if (saving) return
    if (dirty && !window.confirm('Discard your changes? What you typed here will be lost.')) return
    onClose()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') tryClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const upload = async (f?: File) => {
    if (!f) return
    setUploading(true); setMsg('')
    try { set('imageUrl', await uploadImage(f, 'store')) } catch (e: any) { setMsg(e?.message || 'Upload failed') }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return
    const room = MAX_FILES - files.length
    if (room <= 0) { setMsg(`Up to ${MAX_FILES} files`); return }
    setFilesBusy(true); setMsg(''); setErrors((e) => ({ ...e, files: '' }))
    // One file at a time: a file that fails doesn't stop the others (2026-11-10)
    let added = 0
    const failed: string[] = []
    for (const f of Array.from(list).slice(0, room)) {
      try {
        setFilePct(0)
        const up = await uploadFile(f, 'store-file', setFilePct)
        setFiles((cur) => [...cur, up].slice(0, MAX_FILES))
        added++
      } catch (e: any) { failed.push(`${f.name} (${e?.message || 'upload failed'})`) }
    }
    const notes: string[] = []
    if (failed.length) notes.push(`${added} uploaded, ${failed.length} failed: ${failed.join('; ')}.`)
    if (list.length > room) notes.push(`Only ${MAX_FILES} files per product. The rest were left out.`)
    if (notes.length) setMsg(notes.join(' '))
    setFilesBusy(false)
    if (sampleRef.current) sampleRef.current.value = ''
  }

  // Search words from the title, category and description (the store's AI helper)
  const makeTags = async () => {
    if (form.name.trim().length < 3) { setErrors((e) => ({ ...e, name: 'Add a title first' })); return }
    setTagsBusy(true)
    try {
      const d = await apiRequest<{ tags: string }>('/ai/search-tags', { method: 'POST', body: JSON.stringify({ name: form.name, category: form.category, subcategory: form.subcategory, description: form.description }) })
      if (d?.tags) set('tags', d.tags.slice(0, 200))
    } catch (e: any) { setMsg(e?.message || "Couldn't make tags") }
    setTagsBusy(false)
  }

  const save = async (status: 'ACTIVE' | 'DRAFT') => {
    const errs: Record<string, string> = {}
    // Naira to the kobo (the server rounds the same way)
    const price = form.currency === 'NGN' ? Math.round(Number(form.price) * 100) / 100 : Number(form.price)
    if (form.name.trim().length < 3) errs.name = 'At least 3 characters'
    if (form.description.trim().length < 10) errs.description = 'Describe what the buyer gets (10+ characters)'
    if (onRequest) { /* no price needed */ }
    else if (!(price > 0)) errs.price = 'Enter a price'
    // Like the server: an older product under ₦100 keeps its price until it changes
    // or the product goes live again
    else if (form.currency === 'NGN' && price < MIN_NGN && (!product || price !== product.price || product.currency !== 'NGN' || product.priceOnRequest || (status === 'ACTIVE' && !product.isActive))) errs.price = `Minimum ₦${MIN_NGN}`
    if (form.stock !== '' && !(Number.isInteger(Number(form.stock)) && Number(form.stock) >= 0)) errs.stock = 'Whole number, or leave empty'
    if (Object.keys(errs).length) { setErrors(errs); setMsg('Check the highlighted fields.'); return }

    const words = form.tags.split(',').map((t) => t.trim()).filter(Boolean)
    const body = {
      name: form.name.trim(), description: form.description.trim(), currency: form.currency, category: form.category,
      ...(onRequest ? { priceOnRequest: true } : { priceOnRequest: false, price }),
      subcategory: form.subcategory.trim() || null,
      imageUrl: form.imageUrl || null, stock: form.stock === '' ? null : Number(form.stock), delivery: form.delivery,
      // The first few words show on the product card; all of them are searched
      revisions: Number(form.revisions), tags: words.filter((t) => t.length <= 30).slice(0, 8), searchTags: form.tags.trim().slice(0, 200) || null,
      sampleFiles: files, status,
    }
    setSaving(true); setMsg(''); setSaveNeeds([])
    try {
      const saved = product
        ? await apiRequest<{ id: string }>(`/store/products/${product.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiRequest<{ id: string }>('/store/products', { method: 'POST', body: JSON.stringify(body) })
      // The download files go after the product (it needs an id first)
      try { await dl.save(product?.id || saved.id) } catch (e: any) {
        window.alert(`The product was saved, but its download files were not: ${e?.message || 'please try again'}. Open the product again to add them.`)
      }
      onSaved()
    } catch (e: any) {
      // The server's field errors ([{ field, message }]) highlight those fields
      const fieldErrs: Record<string, string> = {}
      let unmapped = false
      for (const x of Array.isArray(e?.errors) ? e.errors : []) {
        if (!x?.field) continue
        const k = FIELD_OF[String(x.field).split('.')[0]]
        if (!k) unmapped = true
        else if (x.message && !fieldErrs[k]) fieldErrs[k] = String(x.message).replace(/^String /, '')
      }
      setErrors(fieldErrs)
      setMsg(Object.keys(fieldErrs).length && !unmapped ? 'Check the highlighted fields.' : e?.message || 'Could not save')
      setSaveNeeds(needsOf(e))
    }
    setSaving(false)
  }

  const cats = CATEGORIES.includes(form.category) ? CATEGORIES : [form.category, ...CATEGORIES]
  return (
    <div className="up-modal ms2-modal" onClick={tryClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="ms2-h" onClick={(e) => e.stopPropagation()} className="ms2-form">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 id="ms2-h">{product ? 'Edit product' : 'Add product'}</h3>
          <button className="x" aria-label="Close" onClick={tryClose}><i className="ti ti-x" /></button>
        </div>

        <label className="ep-field"><span>Title</span><input className="hr-input" maxLength={120} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Logo design: 3 concepts" aria-invalid={!!errors.name} />{errors.name && <em>{errors.name}</em>}</label>
        <div className="ep-field">
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            What the buyer gets
            <span className="ms2-seg" role="tablist" aria-label="Description">
              <button type="button" role="tab" aria-selected={descTab === 'write'} className={descTab === 'write' ? 'on' : ''} onClick={() => setDescTab('write')}>Write</button>
              <button type="button" role="tab" aria-selected={descTab === 'preview'} className={descTab === 'preview' ? 'on' : ''} onClick={() => setDescTab('preview')}>Preview</button>
            </span>
          </span>
          {descTab === 'write'
            ? <textarea className="hr-input hr-area" style={{ minHeight: 140 }} maxLength={5000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={'Deliverables, format, what you need from the buyer.\n\n## What you get\n- 3 logo ideas\n- **PNG and SVG** files'} aria-invalid={!!errors.description} aria-label="What the buyer gets" />
            : <div className="ms2-preview" dangerouslySetInnerHTML={{ __html: renderBlog(form.description) || '<p style="color:var(--text3)">Nothing to preview yet.</p>' }} />}
          {errors.description ? <em>{errors.description}</em> : <small>Formatting: ## heading, **bold**, *italic*, - list, 1. list, [link](https://…), | table |.</small>}
        </div>

        <div className="ep-field">
          <span>Pricing</span>
          <div className="ms2-seg ms2-seg-wide" role="radiogroup" aria-label="Pricing">
            <button type="button" role="radio" aria-checked={!onRequest} className={!onRequest ? 'on' : ''} onClick={() => set('priceMode', 'fixed')}>Fixed price</button>
            <button type="button" role="radio" aria-checked={onRequest} className={onRequest ? 'on' : ''} onClick={() => set('priceMode', 'request')}>Price on request</button>
          </div>
          {onRequest && <small>Buyers message you with what they need and you agree a price in the chat. It can't be bought directly.</small>}
        </div>

        <div className="hr-row">
          {!onRequest && (
            <label className="ep-field"><span>{form.currency === 'NGN' ? 'Price (₦)' : 'Price'}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {oldCrypto && (
                  <select value={form.currency} onChange={(e) => { set('currency', e.target.value); setCedis('') }} style={{ width: 92, flexShrink: 0 }} aria-label="Currency">
                    <option value={product!.currency}>{product!.currency}</option><option value="NGN">₦ NGN</option>
                  </select>
                )}
                <input className="hr-input" inputMode="decimal" value={form.price} onChange={(e) => {
                  // Naira: up to 2 decimals (kobo)
                  const v = e.target.value.replace(/[^0-9.]/g, '')
                  set('price', form.currency === 'NGN' ? v.replace(/^(\d*\.?\d{0,2}).*$/, '$1') : v); setCedis('')
                }} placeholder="5000" aria-invalid={!!errors.price} aria-label={form.currency === 'NGN' ? 'Price in naira' : `Price in ${form.currency}`} />
              </div>
              {errors.price ? <em>{errors.price}</em>
                : oldCrypto && form.currency !== 'NGN' ? <small>New products are priced in naira. You can keep this price in {form.currency}, or switch it to naira.</small>
                  : STORE_FEE_PERCENT === 0 ? <small>OgaPay takes no fee on store sales: the buyer pays your price and you get all of it.</small> : null}
            </label>
          )}
          {!onRequest && nairaPerCedi > 0 && (
            <label className="ep-field"><span>Or type it in cedis (GH₵)</span>
              <input className="hr-input" inputMode="decimal" value={cedis} placeholder={priceNum > 0 ? formatCedi(priceNum / nairaPerCedi).replace('GH₵', '') : '50'} aria-label="Price in cedis" onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d{0,2}).*$/, '$1')
                setCedis(v)
                // Saved in naira, rounded to the naira, at today's rate
                set('price', Number(v) > 0 ? String(Math.round(Number(v) * nairaPerCedi)) : '')
              }} />
              <small>{priceNum > 0 ? `About ${formatCedi(priceNum / nairaPerCedi)} today. ` : ''}Buyers pay in naira from their OgaPay wallet, so the cedi amount moves a little with the rate.</small>
            </label>
          )}
          <label className="ep-field"><span>Category</span>
            <select value={form.category} onChange={(e) => set('category', e.target.value)}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </label>
          {onRequest && (
            <label className="ep-field"><span>Subcategory (optional)</span><input className="hr-input" maxLength={60} value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="e.g. Logos" /></label>
          )}
        </div>
        {!onRequest && (
          <>
            {/* With no fee both numbers were the same, so only the line under the price shows (2026-11-10) */}
            {STORE_FEE_PERCENT > 0 && (
              <div className="ms2-split" aria-live="polite">
                <div><span>You receive per sale</span><b>{money(priceNum, form.currency)}</b></div>
                <div><span>Buyer pays, incl. fee</span><b>{money(priceNum + fee, form.currency)}</b></div>
              </div>
            )}
            <label className="ep-field"><span>Subcategory (optional)</span><input className="hr-input" maxLength={60} value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="e.g. Logos" /></label>
          </>
        )}

        <div className="hr-row">
          <label className="ep-field"><span>Delivery time</span>
            <select value={form.delivery} onChange={(e) => set('delivery', e.target.value)}>{(DELIVERY.includes(form.delivery) ? DELIVERY : [form.delivery, ...DELIVERY]).map((d) => <option key={d}>{d}</option>)}</select>
            <small>Not marked delivered within 14 days (or your delivery time plus 7 days, if longer)? The buyer is refunded.</small>
          </label>
          <label className="ep-field"><span>Revisions</span>
            <select value={form.revisions} onChange={(e) => set('revisions', e.target.value)}>{Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select>
          </label>
        </div>

        <div className="hr-row">
          <label className="ep-field"><span>Stock (optional)</span><input className="hr-input" inputMode="numeric" value={form.stock} onChange={(e) => set('stock', e.target.value.replace(/[^0-9]/g, ''))} placeholder="Unlimited" aria-invalid={!!errors.stock} />{errors.stock ? <em>{errors.stock}</em> : <small>Leave empty for services.</small>}</label>
        </div>

        <div className="ep-field">
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            Search tags (optional)
            <button type="button" className="up-btn" style={{ height: 36 }} disabled={tagsBusy} onClick={makeTags}><i className="ti ti-sparkles" /> {tagsBusy ? 'Making…' : 'Generate tags with AI'}</button>
          </span>
          <input className="hr-input" maxLength={200} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="logo, branding, flyer" aria-label="Search tags" aria-invalid={!!errors.tags} />
          {errors.tags ? <em>{errors.tags}</em> : <small>Words buyers might search for, separated by commas. {form.tags.length}/200</small>}
        </div>

        <div className="ep-field">
          <span>Sample files (optional)</span>
          {files.length > 0 && (
            <ul className="ms2-files">
              {files.map((f, i) => (
                <li key={f.url}>
                  <i className={`ti ${FILE_ICON[f.type] || 'ti-file'}`} aria-hidden="true" />
                  <a href={f.url} target="_blank" rel="noopener noreferrer">{f.name}</a>
                  <button type="button" className="up-btn" aria-label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}><i className="ti ti-x" /></button>
                </li>
              ))}
            </ul>
          )}
          <div>
            <button type="button" className="up-btn" disabled={filesBusy || files.length >= MAX_FILES} onClick={() => sampleRef.current?.click()}>
              <i className="ti ti-paperclip" /> {filesBusy ? `Uploading… ${filePct}%` : files.length >= MAX_FILES ? `${MAX_FILES} files added` : 'Add files'}
            </button>
            <input ref={sampleRef} type="file" multiple hidden accept="image/*,audio/*,video/mp4,video/webm,video/quicktime,application/pdf,.txt,.csv,.md,text/plain,text/csv,text/markdown" onChange={(e) => addFiles(e.target.files)} />
          </div>
          {errors.files ? <em>{errors.files}</em> : <small>Up to {MAX_FILES} files, {MAX_FILE_MB} MB each: images, audio, video, PDF, TXT, CSV or Markdown. Buyers can open them before paying.</small>}
        </div>

        <DeliverableFiles dl={dl} />

        <div className="ep-field">
          <span>Thumbnail</span>
          <div className="ms2-img">
            <div className="ms2-thumb">{form.imageUrl ? <img src={sized(form.imageUrl, 96)} alt="" /> : <i className="ti ti-photo" />}</div>
            <button type="button" className="up-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? 'Uploading…' : form.imageUrl ? 'Replace' : 'Upload image'}</button>
            {form.imageUrl && <button type="button" className="up-btn" onClick={() => set('imageUrl', '')}>Remove</button>}
          </div>
          {errors.imageUrl ? <em>{errors.imageUrl}</em> : <small>Wide pictures work best (16:10). It shows on the product card.</small>}
          <div style={{ display: 'none' }}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        </div>

        {msg && <div className="up-note err" role="alert">{msg}</div>}
        {(publishBlocked || saveNeeds.length > 0) && <div style={{ marginTop: 12 }}><VerifyToSell needs={publishBlocked ? needs : saveNeeds} /></div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          {/* Not while files upload or tags are being made: they'd be left out */}
          <button className="up-btn" disabled={saving || uploading || filesBusy || tagsBusy || dl.busy} onClick={() => save('DRAFT')}>{product && !product.isActive ? 'Save hidden' : product ? 'Save & hide' : 'Save as hidden'}</button>
          <button className="up-btn primary" style={{ flex: 1 }} disabled={saving || uploading || filesBusy || tagsBusy || dl.busy || publishBlocked} onClick={() => save('ACTIVE')}>{saving ? 'Saving…' : product?.isActive ? 'Save changes' : 'Publish'}</button>
        </div>
      </div>
    </div>
  )
}
