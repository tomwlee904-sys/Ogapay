import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { uploadImage } from '../lib/upload'
import { useAuth } from '../context/AuthContext'
import '../styles/profile-public.css'
import '../styles/hire.css'
import '../styles/edit-profile.css'
import '../styles/my-store.css'

type Product = {
  id: string; name: string; description: string; price: number; currency: string; imageUrl: string | null
  category: string; subcategory?: string; stock: number | null; isActive: boolean; status: 'Active' | 'Draft'
  sales: number; orders: number; avgRating: number; reviewsCount: number; delivery?: string; revisions?: number; tags?: string[]
}
type Order = {
  id: string; quantity: number; total: number; currency: string; status: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED'; createdAt: string
  product: { id: string; name: string; imageUrl: string | null }
  buyer: { username: string; name: string; avatarUrl: string | null }; conversationId: string | null
}

const CATEGORIES = [
  'Graphics & Design', 'Writing & Translation', 'Social Media & Growth', 'Video & Animation', 'Web & App Development',
  'Marketing & Ads', 'Music & Audio', 'Photography', 'Data & Research', 'Tutoring & Coaching', 'Digital Products', 'Other',
]
const DELIVERY = ['Instant (digital)', '1 day', '2 days', '3 days', '5 days', '1 week', '2 weeks']
const MIN_NGN = 100

const money = (n: number, cur = 'NGN') =>
  cur === 'NGN' ? '₦' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${cur}`
const blank = { name: '', description: '', price: '', currency: 'NGN', category: CATEGORIES[0], imageUrl: '', stock: '', delivery: '3 days', revisions: '2', tags: '' }
type Form = typeof blank

export default function MyStore() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'orders' ? 'orders' : 'products'
  const [products, setProducts] = useState<Product[] | null>(null)
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [busy, setBusy] = useState('')

  const load = () => {
    apiRequest<any>('/store/my-products').then((d) => setProducts(Array.isArray(d?.products) ? d.products : [])).catch(() => { setProducts([]); setError("Couldn't load your products.") })
    apiRequest<Order[]>('/store/my-orders').then((d) => setOrders(Array.isArray(d) ? d : [])).catch(() => setOrders([]))
  }
  useEffect(load, [])

  const revenue = useMemo(() => {
    const by: Record<string, number> = {}
    for (const o of orders || []) by[o.currency] = (by[o.currency] || 0) + o.total
    const parts = Object.entries(by).map(([c, v]) => money(v, c))
    return parts.length ? parts.join(' · ') : money(0)
  }, [orders])
  const live = (products || []).filter((p) => p.isActive).length
  const open = (orders || []).filter((o) => o.status !== 'DELIVERED').length
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
    if (status === 'DELIVERED' && !window.confirm(`Mark "${o.product.name}" for @${o.buyer.username} as delivered? The buyer is notified.`)) return
    setBusy(o.id)
    try { await apiRequest(`/store/orders/${o.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); load() }
    catch (e: any) { setError(e?.message || 'Could not update the order') }
    setBusy('')
  }

  return (
    <Layout>
      <div className="up-wrap">
        <div className="ms2-head">
          <div>
            <h1>My Store</h1>
            <p>Sell services and digital products. Buyers pay from their OgaPay wallet.</p>
          </div>
          <div className="acts">
            {user?.username && <Link className="up-btn" to={`/user/${user.username}`}><i className="ti ti-eye" /> View public store</Link>}
            <button className="up-btn primary" onClick={() => setEditing('new')}><i className="ti ti-plus" /> Add product</button>
          </div>
        </div>

        <div className="ms2-stats">
          <div className="up-card ms2-stat"><span><i className="ti ti-building-store" /> Live products</span><b>{products ? live : '…'}</b><small>{products ? `${products.length - live} draft` : ''}</small></div>
          <div className="up-card ms2-stat"><span><i className="ti ti-shopping-cart" /> Orders</span><b>{orders ? orders.length : '…'}</b><small>{orders ? `${open} to deliver` : ''}</small></div>
          <div className="up-card ms2-stat"><span><i className="ti ti-coin" /> Revenue</span><b style={{ fontSize: 18 }}>{orders ? revenue : '…'}</b><small>paid to your wallet</small></div>
          <div className="up-card ms2-stat"><span><i className="ti ti-star" /> Rating</span><b>{rated.length ? avg.toFixed(1) : '—'}</b><small>{rated.reduce((s, p) => s + p.reviewsCount, 0)} reviews</small></div>
        </div>

        <div className="up-tabs-row" style={{ marginTop: 0 }}>
          <div className="up-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'products'} className={`up-tab ${tab === 'products' ? 'on' : ''}`} onClick={() => setParams({})}><i className="ti ti-package" /> Products {products?.length ? <em>{products.length}</em> : null}</button>
            <button role="tab" aria-selected={tab === 'orders'} className={`up-tab ${tab === 'orders' ? 'on' : ''}`} onClick={() => setParams({ tab: 'orders' })}><i className="ti ti-receipt" /> Orders {open ? <em>{open} open</em> : null}</button>
          </div>
        </div>

        {error && <div className="up-note err" role="alert" style={{ marginBottom: 12 }}>{error} <button className="up-btn" style={{ height: 26, padding: '0 8px', marginLeft: 8 }} onClick={() => setError('')}>Dismiss</button></div>}

        {tab === 'products' ? (
          products === null ? <div className="up-skel" style={{ height: 140 }} />
          : products.length === 0 ? (
            <div className="up-empty">
              <i className="ti ti-building-store" />
              List your first product or service. It shows in the OgaPay store and on your public profile.
              <div style={{ marginTop: 14 }}><button className="up-btn primary" onClick={() => setEditing('new')}><i className="ti ti-plus" /> Add product</button></div>
            </div>
          ) : products.map((p) => (
            <div className="up-card ms2-prod" key={p.id}>
              <div className="ms2-thumb">{p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" /> : <i className="ti ti-package" />}</div>
              <div style={{ minWidth: 0 }}>
                <h3>{p.name}</h3>
                <div className="meta">
                  <span className={`ms2-badge ${p.isActive ? 'live' : ''}`}>{p.isActive ? 'Live' : 'Draft'}</span>
                  <span><b>{money(p.price, p.currency)}</b></span>
                  <span>{p.orders} {p.orders === 1 ? 'order' : 'orders'}</span>
                  {p.reviewsCount > 0 && <span>★ {p.avgRating.toFixed(1)} ({p.reviewsCount})</span>}
                  {p.stock !== null && <span>{p.stock} in stock</span>}
                  <span>{p.delivery}</span>
                </div>
              </div>
              <div className="ms2-row-acts">
                {p.isActive && <Link className="up-btn" to={`/store/${p.id}`}>View</Link>}
                <button className="up-btn" disabled={busy === p.id} onClick={() => setEditing(p)}>Edit</button>
                <button className="up-btn" disabled={busy === p.id} onClick={() => setStatus(p, !p.isActive)}>{p.isActive ? 'Unpublish' : 'Publish'}</button>
                <button className="up-btn" disabled={busy === p.id} onClick={() => remove(p)} aria-label={`Delete ${p.name}`}><i className="ti ti-trash" /></button>
              </div>
            </div>
          ))
        ) : (
          orders === null ? <div className="up-skel" style={{ height: 140 }} />
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
              <div className="amt">{money(o.total, o.currency)}<small>paid</small></div>
              <div className="row-acts">
                <span className={`ms2-badge ${o.status === 'DELIVERED' ? 'done' : o.status === 'IN_PROGRESS' ? 'work' : ''}`}>{o.status === 'DELIVERED' ? 'Delivered' : o.status === 'IN_PROGRESS' ? 'In progress' : 'New'}</span>
                <span style={{ flex: 1 }} />
                {o.conversationId && <Link className="up-btn" to={`/messages?c=${o.conversationId}`}><i className="ti ti-message" /> Message buyer</Link>}
                {o.status === 'PENDING' && <button className="up-btn" disabled={busy === o.id} onClick={() => moveOrder(o, 'IN_PROGRESS')}>Start</button>}
                {o.status !== 'DELIVERED' && <button className="up-btn primary" disabled={busy === o.id} onClick={() => moveOrder(o, 'DELIVERED')}>Mark delivered</button>}
              </div>
            </div>
          ))
        )}
      </div>

      {editing && <ProductEditor product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </Layout>
  )
}

function ProductEditor({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(() => product ? {
    name: product.name, description: product.description, price: String(product.price), currency: product.currency,
    category: product.category, imageUrl: product.imageUrl || '', stock: product.stock === null ? '' : String(product.stock),
    delivery: product.delivery || '3 days', revisions: String(product.revisions ?? 2), tags: (product.tags || []).join(', '),
  } : blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
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

  const save = async (status: 'ACTIVE' | 'DRAFT') => {
    const errs: Record<string, string> = {}
    const price = Number(form.price)
    if (form.name.trim().length < 3) errs.name = 'At least 3 characters'
    if (form.description.trim().length < 10) errs.description = 'Describe what the buyer gets (10+ characters)'
    if (!(price > 0)) errs.price = 'Enter a price'
    else if (form.currency === 'NGN' && price < MIN_NGN) errs.price = `Minimum ₦${MIN_NGN}`
    if (form.stock !== '' && !(Number.isInteger(Number(form.stock)) && Number(form.stock) >= 0)) errs.stock = 'Whole number, or leave empty'
    if (Object.keys(errs).length) { setErrors(errs); return }

    const body = {
      name: form.name.trim(), description: form.description.trim(), price, currency: form.currency, category: form.category,
      imageUrl: form.imageUrl || null, stock: form.stock === '' ? null : Number(form.stock), delivery: form.delivery,
      revisions: Number(form.revisions), tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8), status,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 id="ms2-h">{product ? 'Edit product' : 'Add product'}</h3>
          <button className="x" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        <label className="ep-field"><span>Title</span><input className="hr-input" maxLength={120} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Logo design: 3 concepts" aria-invalid={!!errors.name} />{errors.name && <em>{errors.name}</em>}</label>
        <label className="ep-field"><span>What the buyer gets</span><textarea className="hr-input hr-area" style={{ minHeight: 120 }} maxLength={5000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Deliverables, format, what you need from the buyer." aria-invalid={!!errors.description} />{errors.description && <em>{errors.description}</em>}</label>

        <div className="hr-row">
          <label className="ep-field"><span>Price</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)} style={{ width: 92, flexShrink: 0 }} aria-label="Currency">
                <option value="NGN">₦ NGN</option><option value="USDC">USDC</option><option value="SOL">SOL</option>
              </select>
              <input className="hr-input" inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="5000" aria-invalid={!!errors.price} />
            </div>
            {errors.price ? <em>{errors.price}</em> : <small>Paid to your wallet when someone buys.</small>}
          </label>
          <label className="ep-field"><span>Category</span>
            <select value={form.category} onChange={(e) => set('category', e.target.value)}>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </label>
        </div>

        <div className="hr-row">
          <label className="ep-field"><span>Delivery time</span>
            <select value={form.delivery} onChange={(e) => set('delivery', e.target.value)}>{(DELIVERY.includes(form.delivery) ? DELIVERY : [form.delivery, ...DELIVERY]).map((d) => <option key={d}>{d}</option>)}</select>
          </label>
          <label className="ep-field"><span>Revisions</span>
            <select value={form.revisions} onChange={(e) => set('revisions', e.target.value)}>{Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}</select>
          </label>
        </div>

        <div className="hr-row">
          <label className="ep-field"><span>Stock (optional)</span><input className="hr-input" inputMode="numeric" value={form.stock} onChange={(e) => set('stock', e.target.value.replace(/[^0-9]/g, ''))} placeholder="Unlimited" aria-invalid={!!errors.stock} />{errors.stock ? <em>{errors.stock}</em> : <small>Leave empty for services.</small>}</label>
          <label className="ep-field"><span>Tags (optional)</span><input className="hr-input" maxLength={200} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="logo, branding" /></label>
        </div>

        <div className="ep-field">
          <span>Cover image</span>
          <div className="ms2-img">
            <div className="ms2-thumb">{form.imageUrl ? <img src={form.imageUrl} alt="" /> : <i className="ti ti-photo" />}</div>
            <button type="button" className="up-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? 'Uploading…' : form.imageUrl ? 'Replace' : 'Upload image'}</button>
            {form.imageUrl && <button type="button" className="up-btn" onClick={() => set('imageUrl', '')}>Remove</button>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        </div>

        {msg && <div className="up-note err" role="alert">{msg}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          <button className="up-btn" disabled={saving || uploading} onClick={() => save('DRAFT')}>{product && !product.isActive ? 'Save draft' : product ? 'Save & unpublish' : 'Save as draft'}</button>
          <button className="up-btn primary" style={{ flex: 1 }} disabled={saving || uploading} onClick={() => save('ACTIVE')}>{saving ? 'Saving…' : product?.isActive ? 'Save changes' : 'Publish'}</button>
        </div>
      </div>
    </div>
  )
}
