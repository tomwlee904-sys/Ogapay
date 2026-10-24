import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { uploadImage, uploadFile, MAX_FILE_MB, type UploadedFile } from '../lib/upload'
import { renderBlog } from '../lib/blogMarkdown'
import { useAuth } from '../context/AuthContext'
import { orderBadge, orderWhen, type StoreOrder } from './StoreOrders'
import { useMoney } from '../lib/useMoney'
import '../styles/profile-public.css'
import '../styles/hire.css'
import '../styles/edit-profile.css'
import '../styles/my-store.css'
import { sized } from '../lib/img'
import LoadError from '../components/LoadError'
import { StoreTabs, RowMenu, type MenuItem } from '../components/store/StoreUi'

type Product = {
  id: string; name: string; description: string; price: number; currency: string; imageUrl: string | null
  category: string; subcategory?: string; stock: number | null; isActive: boolean; status: 'Active' | 'Draft'
  sales: number; orders: number; avgRating: number; reviewsCount: number; delivery?: string; revisions?: number; tags?: string[]
  priceOnRequest?: boolean; sampleFiles?: UploadedFile[]; searchTags?: string
  sellerReceives?: number; buyerPays?: number; feePercent?: number
}
const MAX_FILES = 5
const FILE_ICON: Record<string, string> = { image: 'ti-photo', audio: 'ti-music', video: 'ti-movie', pdf: 'ti-file-type-pdf', text: 'ti-file-text' }
// OgaPay takes no fee on store sales today (backend STORE_FEE_PERCENT = 0)
const STORE_FEE_PERCENT = 0
type Order = StoreOrder & { buyer: { username: string; name: string; avatarUrl: string | null } }

const CATEGORIES = [
  'Graphics & Design', 'Writing & Translation', 'Social Media & Growth', 'Video & Animation', 'Web & App Development',
  'Marketing & Ads', 'Music & Audio', 'Photography', 'Data & Research', 'Tutoring & Coaching', 'Digital Products', 'Other',
]
const DELIVERY = ['Instant (digital)', '1 day', '2 days', '3 days', '5 days', '1 week', '2 weeks']
const MIN_NGN = 100

const money = (n: number, cur = 'NGN') =>
  cur === 'NGN' ? '₦' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${cur}`
const blank = { name: '', description: '', price: '', currency: 'NGN', category: CATEGORIES[0], subcategory: '', imageUrl: '', stock: '', delivery: '3 days', revisions: '2', tags: '', priceMode: 'fixed' }
type Form = typeof blank

export default function MyStore() {
  // Prices and revenue in the display currency; order payments and refunds stay real
  const show = useMoney()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'orders' ? 'orders' : 'products'
  const [products, setProducts] = useState<Product[] | null>(null)
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')
  const [failed, setFailed] = useState({ products: false, orders: false })
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [busy, setBusy] = useState('')

  const load = () => {
    // A failed load shows Try again, never "0 products" or "no orders"
    setFailed({ products: false, orders: false })
    apiRequest<any>('/store/my-products').then((d) => setProducts(Array.isArray(d?.products) ? d.products : [])).catch(() => setFailed((f) => ({ ...f, products: true })))
    apiRequest<Order[]>('/store/my-orders').then((d) => setOrders(Array.isArray(d) ? d : [])).catch(() => setFailed((f) => ({ ...f, orders: true })))
  }
  useEffect(load, [])
  // "Sell a product" on the store opens the add form straight away
  useEffect(() => {
    if (params.get('add') === '1') {
      setEditing('new')
      const next = new URLSearchParams(params); next.delete('add'); setParams(next, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Paid to the seller (released, or paid at purchase on older orders) vs still held for the buyer
  const [revenue, held] = useMemo(() => {
    const sum = (list: Order[]) => {
      const by: Record<string, number> = {}
      for (const o of list) by[o.currency] = (by[o.currency] || 0) + o.total
      return Object.entries(by).map(([c, v]) => show(v, c)).join(' · ')
    }
    const paid = (orders || []).filter((o) => o.releasedAt || (!o.protected && o.status !== 'CANCELLED'))
    return [sum(paid) || show(0), sum((orders || []).filter((o) => o.held))]
  }, [orders, show])
  const live = (products || []).filter((p) => p.isActive).length
  const open = (orders || []).filter((o) => o.status === 'PENDING' || o.status === 'IN_PROGRESS').length
  const rated = (products || []).filter((p) => p.reviewsCount > 0)
  const avg = rated.length ? rated.reduce((s, p) => s + p.avgRating * p.reviewsCount, 0) / rated.reduce((s, p) => s + p.reviewsCount, 0) : 0

  const setStatus = async (p: Product, active: boolean) => {
    setBusy(p.id)
    try { await apiRequest(`/store/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status: active ? 'ACTIVE' : 'DRAFT' }) }); load() }
    catch (e: any) { setError(e?.message || 'Could not update the product') }
    setBusy('')
  }
  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? It disappears from the store. Past orders are kept.`)) return
    setBusy(p.id)
    try { await apiRequest(`/store/products/${p.id}`, { method: 'DELETE' }); load() }
    catch (e: any) { setError(e?.message || 'Could not delete the product') }
    setBusy('')
  }
  const moveOrder = async (o: Order, status: 'IN_PROGRESS' | 'DELIVERED') => {
    if (status === 'DELIVERED' && !window.confirm(`Mark "${o.product.name}" for @${o.buyer.username} as delivered? The buyer is notified${o.held ? ', and the payment comes to you when they confirm, or in 3 days if they report no problem' : ''}.`)) return
    setBusy(o.id)
    try { await apiRequest(`/store/orders/${o.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); load() }
    catch (e: any) { setError(e?.message || 'Could not update the order') }
    setBusy('')
  }
  const refundOrder = async (o: Order) => {
    if (!window.confirm(`Cancel @${o.buyer.username}'s order for "${o.product.name}" and refund ${money(o.total, o.currency)} to them? This can't be undone.`)) return
    setBusy(o.id)
    try { await apiRequest(`/store/orders/${o.id}/cancel`, { method: 'POST' }); load() }
    catch (e: any) { setError(e?.message || 'Could not cancel the order') }
    setBusy('')
  }

  // A number that failed to load shows a dash, never 0
  const stat = (ready: boolean, failedLoad: boolean, value: string | number) => (ready ? value : failedLoad ? '—' : '…')

  return (
    <Layout>
      <div className="ui-page ms2-page">
        <header className="ui-head">
          <div>
            <h1 className="ui-title" style={{ marginTop: 0 }}>My store</h1>
            <p className="ui-sub">Sell services and digital products. You're paid when the buyer confirms delivery.</p>
          </div>
          <div className="ui-actions ms2-acts">
            {user?.username && <Link className="ui-btn ui-btn-ghost" to={`/user/${user.username}`}><i className="ti ti-eye" /> <span className="ms2-hide-phone">View public store</span><span className="ms2-show-phone">Public store</span></Link>}
            <button className="ui-btn ui-btn-dark" onClick={() => setEditing('new')}><i className="ti ti-plus" /> Add product</button>
          </div>
        </header>
        <StoreTabs active="mine" />

        {open > 0 && tab !== 'orders' && (
          <button className="ui-card ms2-alert" onClick={() => setParams({ tab: 'orders' })}>
            <i className="ti ti-alert-circle" aria-hidden="true" />
            <span><b>Action needed: {open} order{open === 1 ? '' : 's'} to deliver</b>Buyers are waiting. Open your orders.</span>
            <i className="ti ti-chevron-right" aria-hidden="true" />
          </button>
        )}

        <div className="ui-stats ms2-kpis">
          <div><span className="ui-stats-label">Live products</span><span className="ui-stats-value">{stat(!!products, failed.products, live)}</span>{products && <small>{products.length - live} hidden</small>}</div>
          <div><span className="ui-stats-label">Orders</span><span className="ui-stats-value">{stat(!!orders, failed.orders, orders?.length ?? 0)}</span>{orders && <small>{open} to deliver</small>}</div>
          <div><span className="ui-stats-label">Revenue</span><span className="ui-stats-value ms2-rev">{stat(!!orders, failed.orders, revenue)}</span>{orders && <small>{held ? `+ ${held} on hold` : 'paid to your wallet'}</small>}</div>
          <div><span className="ui-stats-label">Rating</span><span className="ui-stats-value">{stat(!!products, failed.products, rated.length ? avg.toFixed(1) : '—')}</span>{products && <small>{rated.reduce((s, p) => s + p.reviewsCount, 0)} reviews</small>}</div>
        </div>

        <div className="ui-split ms2-layout">
          <div className="ms2-main">
            <div className="st-seg ms2-tabs" role="tablist" aria-label="My store">
              <button role="tab" aria-selected={tab === 'products'} className={tab === 'products' ? 'on' : ''} onClick={() => setParams({})}>Products {products?.length ? <em>{products.length}</em> : null}</button>
              <button role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'on' : ''} onClick={() => setParams({ tab: 'orders' })}>Orders {open ? <em>{open} open</em> : null}</button>
            </div>

            {error && (
              <div className="up-note err ms2-err" role="alert">
                <span>{error}</span>
                <button className="ui-btn ui-btn-text ui-btn-sm ui-btn-icon tap" aria-label="Dismiss" onClick={() => setError('')}><i className="ti ti-x" /></button>
              </div>
            )}

            {tab === 'products' ? (
              products === null ? (failed.products ? <LoadError what="your products" onRetry={load} /> : <div className="ui-sk" style={{ height: 160 }} />)
              : products.length === 0 ? (
                <div className="ui-empty">
                  <strong>List your first product or service</strong>
                  It shows in the OgaPay store and on your public profile.
                  <div style={{ marginTop: 14 }}><button className="ui-btn ui-btn-dark" onClick={() => setEditing('new')}><i className="ti ti-plus" /> Add product</button></div>
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
                    {list.map((p) => {
                      const menu: MenuItem[] = [
                        ...(p.isActive ? [{ label: 'View in store', icon: 'ti-eye', to: `/store/${p.id}` }] : []),
                        { label: p.isActive ? 'Unpublish (hide)' : 'Publish', icon: p.isActive ? 'ti-eye-off' : 'ti-world', disabled: busy === p.id, onSelect: () => setStatus(p, !p.isActive) },
                        { label: 'Delete product', icon: 'ti-trash', danger: true, disabled: busy === p.id, onSelect: () => remove(p) },
                      ]
                      return (
                        <div className="up-card ms2-prod" key={p.id}>
                          {/* Tapping the product opens it for editing */}
                          <button type="button" className="ms2-prod-main" disabled={busy === p.id} onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`}>
                            <span className="ms2-thumb">{p.imageUrl ? <img src={sized(p.imageUrl, 72)} alt="" loading="lazy" /> : <i className="ti ti-package" />}</span>
                            <span style={{ minWidth: 0 }}>
                              <h3>{p.name}</h3>
                              <span className="meta">
                                <span className={`ms2-badge ${p.isActive ? 'live' : ''}`}>{p.isActive ? 'Live' : 'Hidden'}</span>
                                <span><b>{p.priceOnRequest ? 'Price on request' : show(p.price, p.currency)}</b></span>
                                <span>{p.orders} {p.orders === 1 ? 'order' : 'orders'}</span>
                                {p.reviewsCount > 0 && <span><i className="ti ti-star" aria-hidden="true" /> {p.avgRating.toFixed(1)} ({p.reviewsCount})</span>}
                                {!!p.sampleFiles?.length && <span className="ms2-hide-phone"><i className="ti ti-paperclip" aria-hidden="true" /> {p.sampleFiles.length}</span>}
                                {p.stock !== null && <span className="ms2-hide-phone">{p.stock} in stock</span>}
                                <span className="ms2-hide-phone">{p.delivery}</span>
                              </span>
                            </span>
                          </button>
                          <div className="ms2-row-acts">
                            <button className="ui-btn ui-btn-ghost ui-btn-sm ms2-hide-phone" disabled={busy === p.id} onClick={() => setEditing(p)}><i className="ti ti-pencil" /> Edit</button>
                            <RowMenu label={`More actions for ${p.name}`} items={menu} />
                          </div>
                        </div>
                      )
                    })}
                  </section>
                )
              })
            ) : (
              orders === null ? (failed.orders ? <LoadError what="your orders" onRetry={load} /> : <div className="ui-sk" style={{ height: 160 }} />)
              : orders.length === 0 ? <div className="ui-empty"><strong>No orders yet</strong>When someone buys, it shows here and you get a message from them.</div>
              : orders.map((o) => {
                const b = orderBadge(o)
                // One next step per state; refunding sits in the menu and asks first (refundOrder)
                const menu: MenuItem[] = []
                if (o.status === 'PENDING') menu.push({ label: 'Mark delivered', icon: 'ti-check', disabled: busy === o.id, onSelect: () => moveOrder(o, 'DELIVERED') })
                if (o.held) menu.push({ label: 'Cancel and refund', icon: 'ti-arrow-back-up', danger: true, disabled: busy === o.id, onSelect: () => refundOrder(o) })
                return (
                  <div className="up-card ms2-order so-order" key={o.id}>
                    <div className="who">
                      <span className="av">{o.buyer.avatarUrl ? <img src={o.buyer.avatarUrl} alt="" /> : (o.buyer.name[0] || '?').toUpperCase()}</span>
                      <div style={{ minWidth: 0 }}>
                        <b className="so-name"><span>{o.product.name}{o.quantity > 1 ? ` × ${o.quantity}` : ''}</span><span className={`ms2-badge ${b.cls}`}>{b.label}</span></b>
                        <small>by <Link className="tap" to={`/user/${o.buyer.username}`} style={{ color: 'var(--text2)' }}>@{o.buyer.username}</Link> · {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</small>
                      </div>
                    </div>
                    <div className="amt">{money(o.total, o.currency)}<small>{!o.protected ? 'paid' : o.refundedAt ? 'refunded to buyer' : o.releasedAt ? 'paid to you' : 'on hold'}</small></div>
                    {o.held && o.status === 'DELIVERED' && o.releaseAt && (
                      <p className="so-line"><i className="ti ti-clock" aria-hidden="true" /><span>Comes to you when the buyer confirms, or on <b>{orderWhen(o.releaseAt)}</b> if they report no problem.</span></p>
                    )}
                    {o.held && (o.status === 'PENDING' || o.status === 'IN_PROGRESS') && (
                      <p className="so-line"><i className="ti ti-shield-check" aria-hidden="true" /><span>The buyer's payment is held by OgaPay. Deliver, then mark it delivered: you're paid when they confirm, or 3 days later.</span></p>
                    )}
                    {o.status === 'DISPUTED' && (
                      <p className="so-line bad"><i className="ti ti-alert-triangle" aria-hidden="true" /><span>The buyer reported a problem: "{o.disputeReason}" The payment is on hold while OgaPay reviews it. Sort it out with them in your chat, or refund them.</span></p>
                    )}
                    <div className="so-acts">
                      {o.status === 'PENDING' && <button className="ui-btn ui-btn-dark so-main-btn" disabled={busy === o.id} onClick={() => moveOrder(o, 'IN_PROGRESS')}>Start</button>}
                      {o.status === 'IN_PROGRESS' && <button className="ui-btn ui-btn-dark so-main-btn" disabled={busy === o.id} onClick={() => moveOrder(o, 'DELIVERED')}><i className="ti ti-check" /> Mark delivered</button>}
                      {o.conversationId && <Link className="ui-btn ui-btn-ghost" to={`/messages?c=${o.conversationId}`}><i className="ti ti-message" /> Message buyer</Link>}
                      <RowMenu label={`More actions for ${o.product.name}`} items={menu} />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <aside className="ui-split-side ms2-side">
            <div className="ui-card ms2-how">
              <h2>How you get paid</h2>
              <p>Buyers pay from their OgaPay wallet and OgaPay holds the money. It comes to you when they confirm delivery, or 3 days after you mark the order delivered if they report no problem.</p>
              {user?.username && <Link className="ui-btn ui-btn-ghost" to={`/user/${user.username}`}><i className="ti ti-eye" /> View public store</Link>}
            </div>
          </aside>
        </div>
      </div>

      {editing && <ProductEditor product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </Layout>
  )
}

function ProductEditor({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(() => product ? {
    name: product.name, description: product.description, price: product.priceOnRequest ? '' : String(product.price), currency: product.currency,
    category: product.category, subcategory: product.subcategory || '', imageUrl: product.imageUrl || '', stock: product.stock === null ? '' : String(product.stock),
    delivery: product.delivery || '3 days', revisions: String(product.revisions ?? 2),
    tags: product.searchTags || (product.tags || []).join(', '), priceMode: product.priceOnRequest ? 'request' : 'fixed',
  } : blank)
  const [files, setFiles] = useState<UploadedFile[]>(product?.sampleFiles || [])
  const [filesBusy, setFilesBusy] = useState(false)
  const [descTab, setDescTab] = useState<'write' | 'preview'>('write')
  const [tagsBusy, setTagsBusy] = useState(false)
  const sampleRef = useRef<HTMLInputElement>(null)
  const onRequest = form.priceMode === 'request'
  const priceNum = Number(form.price) || 0
  const fee = Math.round(priceNum * STORE_FEE_PERCENT) / 100
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  // Optional fields start folded unless this product already uses them
  const [moreOpen, setMoreOpen] = useState(() => !!product && (product.stock !== null || !!product.searchTags || !!product.tags?.length || !!product.sampleFiles?.length))
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (k: keyof Form, v: string) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); setMsg('') }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

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
    setFilesBusy(true); setMsg('')
    try {
      for (const f of Array.from(list).slice(0, room)) {
        const up = await uploadFile(f, 'store-file')
        setFiles((cur) => [...cur, up].slice(0, MAX_FILES))
      }
      if (list.length > room) setMsg(`Only ${MAX_FILES} files per product. The rest were left out.`)
    } catch (e: any) { setMsg(e?.message || 'Upload failed') }
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
    const price = Number(form.price)
    if (form.name.trim().length < 3) errs.name = 'At least 3 characters'
    if (form.description.trim().length < 10) errs.description = 'Describe what the buyer gets (10+ characters)'
    if (onRequest) { /* no price needed */ }
    else if (!(price > 0)) errs.price = 'Enter a price'
    else if (form.currency === 'NGN' && price < MIN_NGN) errs.price = `Minimum ₦${MIN_NGN}`
    if (form.stock !== '' && !(Number.isInteger(Number(form.stock)) && Number(form.stock) >= 0)) errs.stock = 'Whole number, or leave empty'
    if (Object.keys(errs).length) { setErrors(errs); return }

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
    setSaving(true); setMsg('')
    try {
      if (product) await apiRequest(`/store/products/${product.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      else await apiRequest('/store/products', { method: 'POST', body: JSON.stringify(body) })
      onSaved()
    } catch (e: any) {
      setMsg(e?.message === 'Validation failed' ? 'Check the highlighted fields.' : e?.message || 'Could not save')
    }
    setSaving(false)
  }

  const cats = CATEGORIES.includes(form.category) ? CATEGORIES : [form.category, ...CATEGORIES]
  return (
    <div className="up-modal ms2-modal" onClick={() => !saving && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="ms2-h" onClick={(e) => e.stopPropagation()} className="ms2-form">
        <div className="ms2-sheet-head">
          <h3 id="ms2-h">{product ? 'Edit product' : 'Add product'}</h3>
          <button className="x tap" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button>
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
            <label className="ep-field"><span>Price</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={form.currency} onChange={(e) => set('currency', e.target.value)} style={{ width: 92, flexShrink: 0 }} aria-label="Currency">
                  <option value="NGN">₦ NGN</option><option value="USDC">USDC</option><option value="SOL">SOL</option>
                </select>
                <input className="hr-input" inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="5000" aria-invalid={!!errors.price} />
              </div>
              {errors.price && <em>{errors.price}</em>}
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
            <div className="ms2-split" aria-live="polite">
              <div><span>You receive per sale</span><b>{money(priceNum, form.currency)}</b></div>
              <div><span>Buyer pays, incl. fee</span><b>{money(priceNum + fee, form.currency)}</b></div>
              <small>OgaPay takes no fee on store sales right now, so the buyer pays your price and you get all of it.</small>
            </div>
            <label className="ep-field"><span>Subcategory (optional)</span><input className="hr-input" maxLength={60} value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="e.g. Logos" /></label>
          </>
        )}

        <div className="ep-field">
          <span>Thumbnail</span>
          <div className="ms2-img">
            <div className="ms2-thumb">{form.imageUrl ? <img src={form.imageUrl} alt="" /> : <i className="ti ti-photo" />}</div>
            <button type="button" className="up-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? 'Uploading…' : form.imageUrl ? 'Replace' : 'Upload image'}</button>
            {form.imageUrl && <button type="button" className="up-btn" onClick={() => set('imageUrl', '')}>Remove</button>}
          </div>
          <small>Wide pictures work best (16:10). It shows on the product card.</small>
          <div style={{ display: 'none' }}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        </div>

        <div className="hr-row">
          <label className="ep-field"><span>Delivery time</span>
            <select value={form.delivery} onChange={(e) => set('delivery', e.target.value)}>{(DELIVERY.includes(form.delivery) ? DELIVERY : [form.delivery, ...DELIVERY]).map((d) => <option key={d}>{d}</option>)}</select>
          </label>
          <label className="ep-field"><span>Revisions</span>
            <select value={form.revisions} onChange={(e) => set('revisions', e.target.value)}>{Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select>
          </label>
        </div>

        <details className="ms2-more" open={moreOpen || !!errors.stock} onToggle={(e) => setMoreOpen((e.target as HTMLDetailsElement).open)}>
          <summary>More options <small>Stock, search tags, sample files</small></summary>
        <div className="hr-row">
          <label className="ep-field"><span>Stock (optional)</span><input className="hr-input" inputMode="numeric" value={form.stock} onChange={(e) => set('stock', e.target.value.replace(/[^0-9]/g, ''))} placeholder="Unlimited" aria-invalid={!!errors.stock} />{errors.stock ? <em>{errors.stock}</em> : <small>Leave empty for services.</small>}</label>
        </div>

        <div className="ep-field">
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            Search tags (optional)
            <button type="button" className="up-btn" style={{ height: 36 }} disabled={tagsBusy} onClick={makeTags}><i className="ti ti-sparkles" /> {tagsBusy ? 'Making…' : 'Generate tags with AI'}</button>
          </span>
          <input className="hr-input" maxLength={200} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="logo, branding, flyer" aria-label="Search tags" />
          <small>Words buyers might search for, separated by commas. {form.tags.length}/200</small>
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
              <i className="ti ti-paperclip" /> {filesBusy ? 'Uploading…' : files.length >= MAX_FILES ? `${MAX_FILES} files added` : 'Add files'}
            </button>
            <input ref={sampleRef} type="file" multiple hidden accept="image/*,audio/*,video/mp4,video/webm,video/quicktime,application/pdf,.txt,.csv,.md,text/plain,text/csv,text/markdown" onChange={(e) => addFiles(e.target.files)} />
          </div>
          <small>Up to {MAX_FILES} files, {MAX_FILE_MB} MB each: images, audio, video, PDF, TXT, CSV or Markdown. Buyers can open them before paying.</small>
        </div>

        </details>

        {msg && <div className="up-note err" role="alert">{msg}</div>}
        <div className="ms2-sheet-foot">
          <button className="up-btn" disabled={saving || uploading || filesBusy} onClick={() => save('DRAFT')}>{product && !product.isActive ? 'Save hidden' : product ? 'Save & hide' : 'Save as hidden'}</button>
          <button className="up-btn primary" style={{ flex: 1 }} disabled={saving || uploading || filesBusy} onClick={() => save('ACTIVE')}>{saving ? 'Saving…' : product?.isActive ? 'Save changes' : 'Publish'}</button>
        </div>
      </div>
    </div>
  )
}
