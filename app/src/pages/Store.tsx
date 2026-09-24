import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, API_BASE } from '../lib/api'
import { useCurrency } from '../context/CurrencyContext'
import { HomeProductCard } from '../components/home/HomeCards'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useApi } from '../lib/useApi'
// ── Info tooltip ─────────────────────────────────────────────────────
function InfoBtn({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", marginLeft: 4, verticalAlign: "middle" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.stopPropagation(); setShow(s => !s) }}>
      <i className="ti ti-info-circle" style={{ fontSize: 12, color: "var(--text3)", cursor: "pointer" }} />
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", background: "var(--text)", color: "var(--card)",
          fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 8,
          whiteSpace: "normal", width: 240, zIndex: 99, pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {text}
        </div>
      )}
    </span>
  );
}


import { useWalletBalance } from '../context/WalletBalanceContext'
import FundJobWalletModal from '../components/FundJobWalletModal'
import { SkeletonPage } from '../components/SkeletonLoader'
import { formatCompact } from '../lib/currency'

const OGAPAY_BLUE = 'var(--accent)'

function timeAgo(dateStr?: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay >= 30) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (diffDay >= 7) { const w = Math.floor(diffDay / 7); return `${w} week${w !== 1 ? 's' : ''} ago` }
  if (diffDay >= 1) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
  if (diffHr >= 1) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`
  if (diffMin >= 1) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  return 'Just now'
}

function SafeImage({ src, alt, style }: { src: string; alt: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 32, background: 'var(--bg2)' }}>
        <i className="ti ti-box" />
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" style={{ ...style, position: 'absolute', inset: 0 }} onError={() => setFailed(true)} />
}

interface StoreItem {
  id: string
  title: string
  description: string
  price: number
  currency: string
  seller: string
  sellerAvatar: string | null
  rating: number
  reviewsCount: number
  image: string
  category: string
  stock: number | null
  createdAt: string
}

const S = {
  card: { background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1.5px solid var(--glass-border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' },
  grid: { display: 'grid', gap: 16 } as React.CSSProperties,
  btnPrimary: { height: 38, padding: '0 18px', borderRadius: 9, background: OGAPAY_BLUE, color: 'var(--on-accent)', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnOutline: { height: 38, padding: '0 18px', borderRadius: 9, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
}

// ═══════════════════════════════════════════════
// CATEGORIES (from API, fallback icons)
// ═══════════════════════════════════════════════
const CATEGORY_ICONS: Record<string, string> = {
  'All': 'ti ti-layout-grid',
  'design': 'ti ti-palette', 'Design': 'ti ti-palette',
  'social': 'ti ti-share', 'Social': 'ti ti-share',
  'marketing': 'ti ti-trending-up', 'Marketing': 'ti ti-trending-up',
  'dev': 'ti ti-code', 'Development': 'ti ti-code',
  'communities': 'ti ti-users', 'Communities': 'ti ti-users',
  'content': 'ti ti-edit', 'Content': 'ti ti-edit',
  'crypto': 'ti ti-coin', 'Crypto': 'ti ti-coin',
  'ai': 'ti ti-robot', 'AI': 'ti ti-robot',
  'templates': 'ti ti-files', 'Templates': 'ti ti-files',
}

// ═══════════════════════════════════════════════
// STARS COMPONENT
// ═══════════════════════════════════════════════
function ProductStars({ rating, compact }: { rating: number; compact?: boolean }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half
  const size = compact ? 11 : 13
  return (
    <span style={{ display: 'inline-flex', gap: compact ? 1 : 2, alignItems: 'center' }}>
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} width={size} height={size} viewBox="0 0 24 24" fill="#f59e0b" style={{ filter: 'drop-shadow(0 1px 1px rgba(251,191,36,0.3))', transition: 'transform 0.2s' }}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      {half === 1 && (
        <svg key="half" width={size} height={size} viewBox="0 0 24 24" fill="#f59e0b" opacity={0.7}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} width={size} height={size} viewBox="0 0 24 24" fill="var(--border)" opacity={0.5}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
      <span style={{ fontSize: compact ? 10.5 : 11, fontWeight: 700, color: 'var(--text2)', marginLeft: 2 }}>{rating.toFixed(1)}</span>
    </span>
  )
}

// ═══════════════════════════════════════════════
// STORE PAGE (product grid with categories)
// ═══════════════════════════════════════════════
// Sort options the API understands (GET /store?sort=): default order is newest-first
const STORE_SORTS: [string, string][] = [['', 'Quality'], ['newest', 'Newest'], ['stars_desc', 'Highest rated'], ['random', 'Random']]

function StorePage({
  onViewProduct,
  onBuyProduct,
  setActiveView,
  navigate
}: {
  onViewProduct: (p: StoreItem) => void
  onBuyProduct: (p: StoreItem) => void
  setActiveView: (v: string) => void
  navigate: (path: string) => void
}) {
  const { user } = useAuth()
  const { convert } = useCurrency()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [products, setProducts] = useState<StoreItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const limit = 12

  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || ''
  const page = Number(searchParams.get('page')) || 1

  const updateURL = (updates: Record<string, string | undefined>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k) })
      return next
    }, { replace: false })
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (search) params.set('search', search)
      if (sort) params.set('sort', sort)
      params.set('page', String(page))
      params.set('limit', String(limit))
      // Raw fetch: apiRequest unwraps `data` and drops `pagination`, which paging needs
      const res = await fetch(`${API_BASE}/store?${params.toString()}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.message || 'Failed to load products')
      const items: StoreItem[] = Array.isArray(json?.data) ? json.data : []
      setProducts(items)
      setTotal(Number(json?.pagination?.total ?? items.length))
      setAllCategories(prev => Array.from(new Set([...prev, ...items.map(p => p.category).filter(Boolean)])).sort())
    } catch (e) {
      setError((e as any)?.message || 'Failed to load products')
    } finally { setLoading(false) }
  }, [category, search, sort, page])
  useEffect(() => { fetchProducts() }, [fetchProducts])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const submitSearch = (e?: React.FormEvent) => { e?.preventDefault(); updateURL({ search: searchInput.trim() || undefined, page: undefined }) }

  return (
    <div className="ui-page" style={{ paddingTop: 28 }}>
      <style>{`
        .st-filter{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr);gap:14px;padding:16px;margin-top:24px}
        .st-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:22px 0 14px}
        .st-row a,.st-row button.link{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:var(--text);text-decoration:none;background:none;border:0;cursor:pointer;font-family:inherit;padding:6px 2px}
        @media(max-width:860px){.st-filter{grid-template-columns:1fr 1fr}.st-filter>:first-child{grid-column:1 / -1}}
        @media(max-width:520px){.st-filter{grid-template-columns:1fr}}
      `}</style>

      <header className="ui-head">
        <div>
          <h1 className="ui-title" style={{ marginTop: 0 }}>Products</h1>
          <p className="ui-sub">Services and digital products from OgaPay creators.</p>
        </div>
        <div className="ui-actions">
          <button className="ui-btn ui-btn-ghost" onClick={() => navigate('/workers')}>Browse creators <i className="ti ti-arrow-up-right" /></button>
          <button className="ui-btn ui-btn-dark" onClick={() => navigate(user ? '/my-store' : '/login?redirect=/my-store')}>My store <i className="ti ti-user" /></button>
        </div>
      </header>

      <form className="ui-card st-filter" onSubmit={submitSearch} role="search">
        <div>
          <label className="ui-label" htmlFor="st-search">Search products</label>
          <div className="ui-search">
            <input id="st-search" className="ui-input" style={{ paddingLeft: 14 }} placeholder="Design, writing, development..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            <button type="submit" className="ui-search-btn" aria-label="Search"><i className="ti ti-search" /></button>
          </div>
        </div>
        <div>
          <label className="ui-label" htmlFor="st-cat">Category</label>
          <select id="st-cat" className="ui-select" value={category} onChange={e => updateURL({ category: e.target.value || undefined, page: undefined })}>
            <option value="">All</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="ui-label" htmlFor="st-sort">Sort by</label>
          <select id="st-sort" className="ui-select" value={sort} onChange={e => updateURL({ sort: e.target.value || undefined, page: undefined })}>
            {STORE_SORTS.map(([v, l]) => <option key={v || 'quality'} value={v}>{l}</option>)}
          </select>
        </div>
      </form>

      <div className="st-row">
        <span className="ui-count"><b>{products.length ? (page - 1) * limit + products.length : 0}</b> of {total} products</span>
        <button className="link" type="button" onClick={() => navigate('/create')}>Create a job <i className="ti ti-plus" /></button>
      </div>

      {error && (
        <div className="ui-empty" style={{ marginBottom: 16 }}>
          <b style={{ color: 'var(--text)' }}>Couldn't load products</b>
          <p style={{ margin: '6px 0 14px' }}>{error}</p>
          <button className="ui-btn ui-btn-ghost" onClick={fetchProducts}>Try again</button>
        </div>
      )}

      {loading ? (
        <div className="ui-grid-3">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="ui-sk" style={{ height: 460 }} />)}</div>
      ) : !error && products.length === 0 ? (
        <div className="ui-empty">
          <i className="ti ti-building-store" style={{ fontSize: 28, display: 'block', marginBottom: 10, color: 'var(--text3)' }} />
          <b style={{ color: 'var(--text)' }}>No products found</b>
          <p style={{ margin: '6px 0 16px' }}>Try a different search or category.</p>
          <button className="ui-btn ui-btn-ghost" onClick={() => { setSearchInput(''); updateURL({ search: undefined, category: undefined, page: undefined }) }}>Clear filters</button>
        </div>
      ) : (
        <div className="ui-grid-3">
          {products.map(p => <HomeProductCard key={p.id} item={p} convert={convert} />)}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="ui-pager" aria-label="Pages">
          <button className="ui-btn ui-btn-ghost" disabled={page <= 1} onClick={() => { updateURL({ page: page - 1 > 1 ? String(page - 1) : undefined }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><i className="ti ti-arrow-left" />Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className="ui-btn ui-btn-ghost" disabled={page >= totalPages} onClick={() => { updateURL({ page: String(page + 1) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Next<i className="ti ti-arrow-right" /></button>
        </nav>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// STORE NAV
// ═══════════════════════════════════════════════
function StoreNav({ activeView, onChange }: { activeView: string; onChange: (v: string) => void }) {
  const tabs = [
    { key: 'store', label: 'Store', icon: 'ti ti-building-store' },
    { key: 'worker-portal', label: 'My Portal', icon: 'ti ti-briefcase' },
  ]
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          background: activeView === t.key ? 'var(--card)' : 'transparent',
          color: activeView === t.key ? OGAPAY_BLUE : 'var(--text3)',
          border: '1px solid',
          borderColor: activeView === t.key ? OGAPAY_BLUE : 'var(--border)',
          borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
        }}>
          <i className={t.icon} style={{ fontSize: 14 }} />
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN STORE COMPONENT
// ═══════════════════════════════════════════════
export default function Store() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('store')
  const { user } = useAuth()
  const { balances, refresh: refreshBalance } = useWalletBalance()

  // Purchase state
  const [buyingProduct, setBuyingProduct] = useState<StoreItem | null>(null)
  const [purchaseStep, setPurchaseStep] = useState<'idle' | 'confirm' | 'processing' | 'done' | 'error'>('idle')
  const [purchaseError, setPurchaseError] = useState('')
  const [showFundModal, setShowFundModal] = useState(false)
  // purchase conversation created server-side — user will see it in /messages

  const handleViewProduct = (product: any) => {
    navigate('/store/' + product.id)
  }

  const handleBuyProduct = (product: StoreItem) => {
    if (!user) {
      navigate('/login?redirect=/store')
      return
    }
    setBuyingProduct(product)
    setPurchaseStep('confirm')
    setPurchaseError('')
  }

  const executePurchase = async () => {
    if (!buyingProduct) return
    setPurchaseStep('processing')
    setPurchaseError('')

    // Check balance
    const currency = buyingProduct.currency || 'NGN'
    const walletData = balances?.[currency]
    const currentBalance = walletData ? (walletData.balance || 0) : 0

    if (currentBalance < buyingProduct.price) {
      // Insufficient — open fund modal
      setShowFundModal(true)
      setPurchaseStep('idle')
      return
    }

    try {
      const res = await apiRequest<any>('/store/' + buyingProduct.id + '/purchase', {
        method: 'POST',
        body: JSON.stringify({ quantity: 1 }),
      })
      const data = res?.data || res
      setPurchaseStep('done')
      // Refresh wallet balance
      refreshBalance()
    } catch (e: any) {
      setPurchaseError(e.message || 'Purchase failed. Please try again.')
      setPurchaseStep('error')
    }
  }

  const handleFunded = async () => {
    // After wallet funded, retry the purchase
    setShowFundModal(false)
    if (buyingProduct) {
      await executePurchase()
    }
  }

  const closePurchaseModal = () => {
    setBuyingProduct(null)
    setPurchaseStep('idle')
    setPurchaseError('')
    // purchaseConversationId state removed
  }

  const goToMessages = () => {
    navigate('/messages')
    closePurchaseModal()
  }

  const showNav = ['store', 'worker-portal'].includes(activeView)

  return (
    <Layout>
      <div>
        {activeView === 'store' && (
          <StorePage
            onViewProduct={handleViewProduct}
            onBuyProduct={handleBuyProduct}
            setActiveView={setActiveView}
            navigate={navigate}
          />
        )}
      </div>

      {/* ── Purchase Confirmation Modal ── */}
      {buyingProduct && purchaseStep === 'confirm' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={closePurchaseModal}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, maxWidth: 420, width: '100%', padding: 28,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
              Confirm Purchase
            </div>
            <div style={{
              display: 'flex', gap: 14, padding: '14px 0', marginBottom: 16,
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 10,
                background: 'var(--bg2)', overflow: 'hidden', flexShrink: 0,
              }}>
                {buyingProduct.image ? (
                  <img src={buyingProduct.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text3)', fontSize: 20 }}>
                    <i className="ti ti-box" />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{buyingProduct.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>by {buyingProduct.seller}</div>
                {buyingProduct.stock !== null && (
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    Stock: {buyingProduct.stock} available<InfoBtn text="Number of units currently in stock. For service-type items, this may represent available booking slots rather than physical inventory." />
                  </div>
                )}
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>Total</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: OGAPAY_BLUE }}>
                {buyingProduct.currency || 'NGN'} {formatCompact(buyingProduct.price)}
              </div>
            </div>
            {purchaseError && (
              <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{purchaseError}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closePurchaseModal} style={{
                flex: 1, height: 44, borderRadius: 12, border: '1.5px solid var(--border)',
                background: 'transparent', color: 'var(--text2)',
                fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
              <button onClick={executePurchase} style={{
                flex: 1, height: 44, borderRadius: 12, border: 'none',
                background: OGAPAY_BLUE, color: 'var(--on-accent)',
                fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>Pay Now</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Purchase Processing / Success / Error ── */}
      {buyingProduct && (purchaseStep === 'processing' || purchaseStep === 'done' || purchaseStep === 'error') && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={purchaseStep === 'done' ? undefined : closePurchaseModal}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, maxWidth: 400, width: '100%', padding: 32,
            textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            {purchaseStep === 'processing' && (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Processing Purchase...</div>
                <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>
                  Your payment is being processed. Please wait.
                </p>
              </>
            )}
            {purchaseStep === 'done' && (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}><i className="ti ti-circle-check" style={{color:"var(--green)"}} /></div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#16A34A', marginBottom: 8 }}>
                  Purchase Successful!
                </div>
                <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>
                  A conversation has been opened with the seller to arrange next steps.
                </p>
                <button onClick={goToMessages} style={{
                  height: 44, padding: '0 24px', borderRadius: 12, border: 'none',
                  background: OGAPAY_BLUE, color: 'var(--on-accent)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <i className="ti ti-message" style={{ marginRight: 6 }} /> Message Seller
                </button>
                <button onClick={closePurchaseModal} style={{
                  display: 'block', margin: '12px auto 0',
                  background: 'none', border: 'none', color: 'var(--text3)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
                }}>
                  Back to Store
                </button>
              </>
            )}
            {purchaseStep === 'error' && (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}><i className="ti ti-circle-x" style={{color:"var(--red)"}} /></div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)', marginBottom: 8 }}>
                  Purchase Failed
                </div>
                <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
                  {purchaseError || 'Something went wrong. Please try again.'}
                </p>
                <button onClick={closePurchaseModal} style={{
                  height: 44, padding: '0 24px', borderRadius: 12, border: 'none',
                  background: OGAPAY_BLUE, color: 'var(--on-accent)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                }}>Try Again</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Fund Wallet Modal (for insufficient balance) ── */}
      {showFundModal && buyingProduct && (
        <FundJobWalletModal
          currency={buyingProduct.currency || 'NGN'}
          shortfall={buyingProduct.price}
          totalToPay={buyingProduct.price}
          balance={balances?.[buyingProduct.currency || 'NGN']?.balance || 0}
          onClose={() => { setShowFundModal(false); closePurchaseModal() }}
          onFunded={handleFunded}
        />
      )}
    </Layout>
  )
}
