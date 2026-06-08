import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

interface Product {
  id: string
  name: string
  description: string
  price: number
  currency: string
  imageUrl: string | null
  category: string
  stock: number | null
  isActive: boolean
  sales: number
  revenue: number
  avgRating: number
  reviewsCount: number
  status: string
  createdAt: string
}

interface StoreStats {
  products: number
  activeProducts: number
  orders: number
  sales: number
  pendingOrders: number
}

function formatPrice(price: number, currency: string): string {
  if (currency === 'NGN') return `NGN ${Math.round(price).toLocaleString('en-US')}`
  if (currency === 'SOL') return `◎${price.toFixed(3)} SOL`
  return `$${price.toFixed(2)}`
}

export default function MyStore() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<StoreStats>({ products: 0, activeProducts: 0, orders: 0, sales: 0, pendingOrders: 0 })
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'design', currency: 'NGN', stock: '' })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [productsRes, statsRes] = await Promise.all([
        apiRequest<any>('/store/my-products'),
        apiRequest<StoreStats>('/store/my-stats').catch(() => null),
      ])
      const items = productsRes?.products ?? (Array.isArray(productsRes) ? productsRes : [])
      setProducts(items)
      if (statsRes) setStats(statsRes)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = tab === 'all' ? products : products.filter(p => p.status.toLowerCase() === tab)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null
    setUploadingImg(true)
    try {
      const formData = new FormData()
      formData.append('file', imageFile)
      const res = await fetch('https://ogapay-production.up.railway.app/api/v1/uploads/store', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('ogapay_access_token') },
        body: formData,
      })
      if (!res.ok) {
        let msg = 'Upload failed'
        try { const j = await res.json(); msg = j?.message || msg } catch {}
        throw new Error(msg)
      }
      const json = await res.json()
      return json.data?.url || null
    } catch (err: any) {
      setError(err?.message || 'Failed to upload image')
      return null
    } finally { setUploadingImg(false) }
  }

  const handleAddProduct = async () => {
    if (!form.name || !form.description || !form.price) return
    setSubmitting(true)
    setError(null)
    try {
      const imageUrl = await uploadImage()
      await apiRequest('/store/products', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          category: form.category,
          currency: form.currency,
          stock: form.stock ? parseInt(form.stock) : undefined,
          imageUrl,
        }),
      })
      setShowAddModal(false)
      setForm({ name: '', description: '', price: '', category: 'design', currency: 'NGN', stock: '' })
      setImageFile(null)
      setImagePreview(null)
      fetchData()
    } catch (err: any) {
      setError(err?.message || 'Failed to create product')
    } finally { setSubmitting(false) }
  }

  const handleGenerateDescription = async () => {
    if (!form.name) return
    setAiLoading(true)
    try {
      const res = await fetch('https://ogapay-production.up.railway.app/api/v1/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('ogapay_access_token'),
        },
        body: JSON.stringify({ name: form.name, category: form.category }),
      })
      if (!res.ok) {
        let msg = 'AI generation failed'
        try { const j = await res.json(); msg = j?.message || msg } catch {}
        throw new Error(msg)
      }
      const json = await res.json()
      const desc = json.data?.description || json.description
      if (desc) setForm(f => ({ ...f, description: desc }))
    } catch (err: any) {
      setError(err?.message || 'AI generation failed')
    } finally { setAiLoading(false) }
  }

  return (
    <Layout>
      <style>{`
        .mst-hero{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
        .mst-hero-left h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0 0 4px}
        .mst-hero-left p{color:var(--text2);font-size:14px;margin:0}
        .mst-add-btn{height:38px;padding:0 16px;border-radius:10px;border:0;background:#191C6B;color:#fff;font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all .2s;text-decoration:none;font-family:inherit}
        .mst-add-btn:hover{box-shadow:0 4px 16px rgba(25,28,107,.2)}
        .mst-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
        @media(max-width:500px){.mst-stats{grid-template-columns:1fr}}
        .mst-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;transition:all .25s}
        .mst-stat:hover{transform:translateY(-2px);border-color:#191C6B}
        .mst-stat i{font-size:24px;margin-bottom:6px;display:block}
        .mst-stat .mst-num{font-family:Outfit;font-size:24px;font-weight:900}
        .mst-stat .mst-label{font-size:12px;color:var(--text2);margin-top:2px}
        .mst-tabs{display:flex;gap:4px;margin-bottom:14px}
        .mst-tab{padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
        .mst-tab:hover,.mst-tab.active{border-color:#191C6B;color:#191C6B;background:rgba(25,28,107,.08)}
        .mst-list{display:grid;gap:6px}
        .mst-item{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:12px;transition:all .2s}
        .mst-item:hover{border-color:var(--border2)}
        .mst-icon{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;flex-shrink:0;font-size:16px}
        .mst-info{flex:1;min-width:0}
        .mst-name{font-weight:700;font-size:13px;margin-bottom:2px}
        .mst-meta{font-size:11px;color:var(--text3);display:flex;gap:10px}
        .mst-right{text-align:right;flex-shrink:0}
        .mst-price{font-weight:700;font-size:14px}
        .mst-status{padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;display:inline-block;margin-top:4px}
        .mst-empty{text-align:center;padding:48px 20px;color:var(--text2)}
        .mst-empty i{font-size:36px;color:var(--text3);margin-bottom:12px;display:block}
        .mst-modal{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:999;padding:20px}
        .mst-modal-inner{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:24px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto}
        .mst-modal h2{font-family:Outfit;font-size:20px;font-weight:800;margin:0 0 16px}
        .mst-field{margin-bottom:12px}
        .mst-field label{display:block;font-size:11px;font-weight:600;color:var(--text3);margin-bottom:4px}
        .mst-field input,.mst-field select,.mst-field textarea{width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:7px;background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;outline:none;box-sizing:border-box}
        .mst-field textarea{min-height:80px;resize:vertical}
      `}</style>

      <div className="mst-hero">
        <div className="mst-hero-left">
          <h1>My Store</h1>
          <p>Manage your products and services</p>
        </div>
        <button className="mst-add-btn" onClick={() => setShowAddModal(true)}><i className="ti ti-plus" /> Add Product</button>
      </div>

      <div className="mst-stats">
        {[
          { icon: 'ti ti-building-store', color: '#191C6B', count: String(stats.products), label: 'Products' },
          { icon: 'ti ti-coin', color: '#16a34a', count: formatPrice(stats.sales, 'NGN'), label: 'Sales' },
          { icon: 'ti ti-shopping-cart', color: '#191C6B', count: String(stats.orders), label: 'Orders' },
        ].map((s, i) => (
          <div className="mst-stat" key={i}>
            <i className={s.icon} style={{color: s.color}} />
            <div className="mst-num" style={{color: s.color}}>{s.count}</div>
            <div className="mst-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mst-tabs">
        {['all', 'active', 'draft'].map(t => (
          <button key={t} className={`mst-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div className="mst-empty"><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} /></div>}

      {!loading && filtered.length === 0 ? (
        <div className="mst-empty">
          <i className="ti ti-building-store" />
          <h3 style={{fontFamily:'Outfit',fontWeight:800,margin:'0 0 4px',color:'var(--text)'}}>No products yet</h3>
          <p style={{fontSize:13,margin:0}}>Start adding products to your store</p>
        </div>
      ) : (
        <div className="mst-list">
          {filtered.map(p => (
            <div className="mst-item" key={p.id}>
              <div className="mst-icon" style={{background: p.isActive ? '#16a34a15' : '#F59E0B15', color: p.isActive ? '#16a34a' : '#F59E0B'}}>
                <i className="ti ti-box" />
              </div>
              <div className="mst-info">
                <div className="mst-name">{p.name}</div>
                <div className="mst-meta">
                  <span>{p.sales} sales</span>
                  {p.reviewsCount > 0 && <span>{p.avgRating.toFixed(1)} ★</span>}
                </div>
              </div>
              <div className="mst-right">
                <div className="mst-price">{formatPrice(p.price, p.currency)}</div>
                <span className="mst-status" style={{background: p.isActive ? '#16a34a15' : '#F59E0B15', color: p.isActive ? '#16a34a' : '#F59E0B'}}>{p.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="mst-modal" onClick={() => setShowAddModal(false)}>
          <div className="mst-modal-inner" onClick={e => e.stopPropagation()}>
            <h2>Add Product</h2>
            {error && <div style={{background:'rgba(239,68,68,0.10)',border:'1px solid rgba(239,68,68,0.30)',borderRadius:8,padding:10,fontSize:12,color:'#ef4444',marginBottom:12}}>{error}</div>}
            <div className="mst-field">
              <label>Product Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Social Media Growth Package" />
            </div>
            <div className="mst-field">
              <label>Product Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7,
                  padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text2)',
                }}>
                  <i className="ti ti-upload" />
                  {uploadingImg ? 'Uploading...' : 'Choose Image'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                </label>
                {imagePreview && <img src={imagePreview} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} />}
              </div>
            </div>
            <div className="mst-field">
              <label>Description *</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Describe your product..." style={{ flex: 1 }} />
                <button
                  onClick={handleGenerateDescription}
                  disabled={aiLoading || !form.name}
                  title="Generate with AI"
                  style={{
                    width: 38, height: 38, borderRadius: 7, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    fontSize: 16, fontFamily: 'inherit',
                  }}
                >
                  {aiLoading
                    ? <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} />
                    : <i className="ti ti-sparkles" style={{ color: '#7C3AED' }} />
                  }
                </button>
              </div>
            </div>
            <div className="mst-field">
              <label>Price *</label>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} placeholder="5000" />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="mst-field">
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                  <option value="design">Design</option>
                  <option value="social">Social Media</option>
                  <option value="marketing">Marketing</option>
                  <option value="dev">Development</option>
                  <option value="content">Content Creation</option>
                  <option value="crypto">Crypto Services</option>
                  <option value="ai">AI Tools</option>
                  <option value="templates">Templates</option>
                </select>
              </div>
              <div className="mst-field">
                <label>Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({...f, currency: e.target.value}))}>
                  <option value="NGN">NGN</option>
                  <option value="USDC">USDC</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
            </div>
            <div className="mst-field">
              <label>Stock (optional)</label>
              <input type="number" value={form.stock} onChange={e => setForm(f => ({...f, stock: e.target.value}))} placeholder="Leave empty for unlimited" />
            </div>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button className="mst-add-btn" style={{flex:1,justifyContent:'center'}} onClick={handleAddProduct} disabled={submitting || uploadingImg || !form.name || !form.description || !form.price}>
                {uploadingImg ? 'Uploading image...' : submitting ? 'Creating...' : 'Create Product'}
              </button>
              <button className="mst-add-btn" style={{flex:1,justifyContent:'center',background:'transparent',color:'var(--text2)',border:'1px solid var(--border)'}} onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
