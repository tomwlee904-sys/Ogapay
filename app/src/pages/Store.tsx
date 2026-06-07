import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

// ─── Types ──────────────────────────────────────────────────────────────────
interface StoreItem {
  id: string
  title: string
  description: string
  price: number
  currency: string
  seller: string
  rating: number
  reviewsCount: number
  image: string
  category: string
  createdAt: string
}

interface StoreResponse {
  items: StoreItem[]
  total: number
  page: number
  limit: number
  totalPages?: number
}

// ─── Static Categories ──────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'design', name: 'Design', icon: 'ti ti-palette', count: 12 },
  { id: 'social', name: 'Social Media', icon: 'ti ti-share', count: 8 },
  { id: 'marketing', name: 'Marketing', icon: 'ti ti-trending-up', count: 6 },
  { id: 'dev', name: 'Development', icon: 'ti ti-code', count: 10 },
  { id: 'communities', name: 'Communities', icon: 'ti ti-users', count: 5 },
  { id: 'content', name: 'Content Creation', icon: 'ti ti-edit', count: 7 },
  { id: 'crypto', name: 'Crypto Services', icon: 'ti ti-coin', count: 9 },
  { id: 'ai', name: 'AI Tools', icon: 'ti ti-robot', count: 4 },
  { id: 'templates', name: 'Templates', icon: 'ti ti-files', count: 11 },
]

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatPrice(item: StoreItem): string {
  const sym: Record<string, string> = { NGN: 'NGN ', SOL: '◎', USDC: '$' }
  const prefix = sym[item.currency] || ''
  if (item.currency === 'NGN') return `${prefix}${Math.round(item.price).toLocaleString('en-US')}`
  return `${prefix}${item.price.toFixed(item.price < 1 ? 4 : 2)}${item.currency === 'SOL' ? ' SOL' : ''}`
}

function formatSol(price: number, currency: string): string {
  if (currency === 'SOL') return `◎${price.toFixed(3)} SOL`
  return `◎${(price / 145).toFixed(3)} SOL`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
}

// ─── Stars Component ────────────────────────────────────────────────────────
function Stars({ score = 0, size = 12 }: { score?: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i <= Math.round(score) ? '#facc15' : 'none'}
          stroke={i <= Math.round(score) ? '#facc15' : 'var(--border2)'} strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
      {score > 0 && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 2 }}>{score.toFixed(1)}</span>}
    </span>
  )
}

// ─── Active Badge ───────────────────────────────────────────────────────────
function ActiveBadge() {
  return (
    <span style={{
      position: 'absolute', top: 8, right: 8,
      background: '#052e16', color: '#22c55e',
      fontSize: 10, fontWeight: 700, padding: '3px 8px',
      borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}/>
      ACTIVE
    </span>
  )
}

// ─── Avatar Component ──────────────────────────────────────────────────────
function Avatar({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--bg2)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, border: '1px solid var(--border)',
    }}>
      <i className="ti ti-user" style={{ fontSize: size * 0.5, color: 'var(--text3)' }} />
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const S: {[key: string]: React.CSSProperties} = {
  page: { padding: '20px 0' },
  pageTitle: { fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 },
  subtitle: { fontSize: 13, color: 'var(--text2)', marginTop: 4 },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  filterGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 },
  filterRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 16 },
  input: {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7,
    color: 'var(--text)', fontSize: 13, padding: '9px 12px', width: '100%',
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
  },
  select: {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7,
    color: 'var(--text)', fontSize: 13, padding: '9px 12px', width: '100%',
    outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
    appearance: 'none' as const, cursor: 'pointer',
  },
  btnPrimary: {
    background: '#1F8CFF', color: '#fff', fontSize: 13, fontWeight: 700,
    padding: '9px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  btnOutline: {
    background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 500,
    padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'inherit', whiteSpace: 'nowrap',
  },
  btnOutlineFull: {
    background: 'transparent', color: 'var(--text3)', fontSize: 12, fontWeight: 500,
    padding: '9px 14px', borderRadius: 7, border: '1px solid var(--border)',
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 6, width: '100%', fontFamily: 'inherit',
    marginTop: 8,
  },
  resultsCount: { fontSize: 11, color: 'var(--text3)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  card: {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
    overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s',
  },
  cardBody: { padding: 10, display: 'flex', flexDirection: 'column' as const, gap: 6 },
  cardTitle: {
    fontSize: 13, fontWeight: 700, color: 'var(--text)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  cardDesc: {
    fontSize: 12, color: 'var(--text2)', lineHeight: 1.5,
    overflow: 'hidden', display: '-webkit-box' as any,
    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  } as React.CSSProperties,
  priceRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)',
  },
  priceMain: { fontSize: 15, fontWeight: 800, color: 'var(--green)' },
  priceSub: { fontSize: 11, color: 'var(--text3)' },
  sellerRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 },
  newBadge: {
    background: 'var(--bg2)', color: 'var(--text3)', fontSize: 10,
    padding: '2px 7px', borderRadius: 20, marginLeft: 'auto',
    border: '1px solid var(--border)',
  },
  paginationRow: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 12, marginTop: 24, paddingBottom: 16,
  },
  pageText: { fontSize: 13, color: 'var(--text2)' },
  categoryGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: 8, marginBottom: 20,
  },
  catTile: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'center', padding: '12px 6px', gap: 6,
    cursor: 'pointer', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--card)',
    transition: 'all 0.15s',
  },
  catTileLabel: { fontSize: 10, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.3 },
  loadingWrap: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 16 },
  errorBox: {
    background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)',
    borderRadius: 10, padding: 20, textAlign: 'center' as const,
    color: '#ef4444', fontSize: 13, lineHeight: 1.6,
  },
}

// ─── Store Page ─────────────────────────────────────────────────────────────
function StorePage({ onViewProduct }: { onViewProduct: (product: any) => void }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('quality_desc')
  const [page, setPage] = useState(1)

  const [products, setProducts] = useState<StoreItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (search) params.set('search', search)
      if (sort) params.set('sort', sort)
      params.set('page', String(page))
      params.set('limit', '8')

      const res = await apiRequest<StoreResponse>(`/store?${params.toString()}`)
      const items = Array.isArray(res) ? res : res?.items ?? []
      const totalCount = res?.total ?? items.length
      setProducts(items)
      setTotal(totalCount)
    } catch (err: any) {
      setError(err?.message || 'Failed to load store items')
      setProducts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [category, search, sort, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filtered = products

  const totalPages = Math.ceil(total / 8) || 1

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <i className="ti ti-building-store" style={{ fontSize: 22, color: '#1F8CFF' }} />
        <h1 style={S.pageTitle}>Marketplace</h1>
      </div>
      <p style={S.subtitle}>Buy and sell digital products, services, templates, and more.</p>

      {/* Category Tiles */}
      <div style={S.categoryGrid}>
        <div key="all" onClick={() => { setCategory(''); setPage(1) }} style={{
          ...S.catTile,
          borderColor: !category ? '#1F8CFF' : 'var(--border)',
          background: !category ? 'rgba(31,140,255,0.10)' : 'var(--card)',
        }}>
          <i className="ti ti-grid" style={{ fontSize: 18, color: !category ? '#1F8CFF' : 'var(--text3)' }} />
          <span style={{ ...S.catTileLabel, color: !category ? '#1F8CFF' : 'var(--text3)', fontWeight: !category ? 700 : 500 }}>All</span>
        </div>
        {CATEGORIES.map(c => (
          <div key={c.id} onClick={() => { setCategory(category === c.id ? '' : c.id); setPage(1) }} style={{
            ...S.catTile,
            borderColor: category === c.id ? '#1F8CFF' : 'var(--border)',
            background: category === c.id ? 'rgba(31,140,255,0.10)' : 'var(--card)',
          }}>
            <i className={c.icon} style={{ fontSize: 18, color: category === c.id ? '#1F8CFF' : 'var(--text3)' }} />
            <span style={{ ...S.catTileLabel, color: category === c.id ? '#1F8CFF' : 'var(--text3)', fontWeight: category === c.id ? 700 : 500 }}>{c.name}</span>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={S.filterRow}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            style={{ ...S.input, paddingLeft: 34 }}
            placeholder="Search products..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 14 }} />
        </div>
        <select style={S.select} value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}>
          <option value="quality_desc">Best Quality</option>
          <option value="newest">Newest</option>
          <option value="stars_desc">Top Rated</option>
          <option value="random">Random</option>
        </select>
      </div>

      <div style={{ ...S.resultsCount, marginBottom: 12 }}>
        <i className="ti ti-grid" style={{ fontSize: 14 }} />
        Showing {filtered.length} of {total} products
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Loading State */}
      {loading && (
        <div style={S.loadingWrap}>
          <i className="ti ti-loader" style={{ fontSize: 28, color: '#1F8CFF', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>Loading products...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div style={S.errorBox}>
          <i className="ti ti-alert-circle" style={{ fontSize: 20, display: 'block', marginBottom: 8 }} />
          {error}
          <button onClick={fetchProducts} style={{ ...S.btnOutline, marginTop: 12, display: 'inline-flex' }}>
            <i className="ti ti-refresh" /> Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div style={S.loadingWrap}>
          <i className="ti ti-search-off" style={{ fontSize: 28, color: 'var(--text3)' }} />
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>No products found. Try a different search or category.</span>
        </div>
      )}

      {/* Product Grid */}
      {!loading && !error && (
        <div style={S.grid2}>
          {filtered.slice((page - 1) * 8, page * 8).map(p => (
            <div key={p.id} style={S.card} onClick={() => onViewProduct(p)}>
              <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
                <img src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <ActiveBadge />
              </div>
              <div style={S.cardBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                  <span style={S.cardTitle}>{p.title}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(p.createdAt)}</span>
                </div>
                <p style={S.cardDesc}>{p.description}</p>
                <div style={S.sellerRow}>
                  <Avatar size={24} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>{p.seller}</span>
                  {p.reviewsCount > 0
                    ? <span style={{ marginLeft: 'auto' }}><Stars score={p.rating} size={11} /></span>
                    : <span style={S.newBadge}>New creator</span>
                  }
                </div>
                <div style={S.priceRow}>
                  <span style={S.priceMain}>{formatPrice(p)}</span>
                  <span style={S.priceSub}>{formatSol(p.price, p.currency)}</span>
                </div>
                <button style={S.btnOutlineFull}>
                  <i className="ti ti-eye" style={{ fontSize: 13 }} /> View more
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div style={S.paginationRow}>
          <button style={S.btnOutline} disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            <i className="ti ti-chevron-left" style={{ fontSize: 14 }} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              ...S.btnOutline,
              background: page === p ? '#1F8CFF' : 'var(--card)',
              color: page === p ? '#fff' : 'var(--text2)',
              borderColor: page === p ? '#1F8CFF' : 'var(--border)',
              minWidth: 32, justifyContent: 'center',
            }}>{p}</button>
          ))}
          <button style={S.btnOutline} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <i className="ti ti-chevron-right" style={{ fontSize: 14 }} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Product Detail Page ────────────────────────────────────────────────────
function ProductDetailPage({ product, onBack, onPurchase }: { product: StoreItem; onBack: () => void; onPurchase: (item: StoreItem) => void }) {
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchased, setPurchased] = useState(false)

  const handlePurchase = async () => {
    setPurchasing(true)
    setPurchaseError(null)
    try {
      await apiRequest(`/store/${product.id}/purchase`, { method: 'POST' })
      setPurchased(true)
      onPurchase(product)
    } catch (err: any) {
      setPurchaseError(err?.message || 'Purchase failed')
    } finally {
      setPurchasing(false)
    }
  }

  const p = product

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', color: 'var(--text2)', fontSize: 13 }} onClick={onBack}>
        <i className="ti ti-arrow-left" style={{ fontSize: 16 }} /> Back to Store
      </div>

      <div style={{ position: 'relative' }}>
        <img src={p.image} alt={p.title} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />
        <ActiveBadge />
      </div>

      <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>{p.title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Avatar size={32} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.seller}</span>
        <span style={{ marginLeft: 'auto' }}><Stars score={p.rating} size={13} /></span>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>({p.reviewsCount} reviews)</span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 10,
        margin: '14px 0', padding: 14, background: 'var(--card)',
        border: '1px solid var(--border)', borderRadius: 8,
      }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{formatPrice(p)}</span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{formatSol(p.price, p.currency)}</span>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: 8 }}>DESCRIPTION</div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text2)' }}>{p.description}</p>
      </div>

      {purchaseError && (
        <div style={{ ...S.errorBox, marginTop: 12, padding: 10, fontSize: 12 }}>
          <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{purchaseError}
        </div>
      )}

      {purchased && (
        <div style={{
          background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)',
          borderRadius: 10, padding: 14, textAlign: 'center', marginTop: 12,
          color: '#22c55e', fontSize: 13,
        }}>
          <i className="ti ti-circle-check" style={{ marginRight: 6 }} />Purchase successful!
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginTop: 20 }}>
        <button
          style={{ ...S.btnPrimary, justifyContent: 'center', padding: 13, fontSize: 14, opacity: purchasing || purchased ? 0.6 : 1 }}
          onClick={handlePurchase}
          disabled={purchasing || purchased}
        >
          {purchasing ? (
            <><i className="ti ti-loader" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }} /> Processing...</>
          ) : purchased ? (
            <><i className="ti ti-circle-check" style={{ fontSize: 16 }} /> Purchased</>
          ) : (
            <><i className="ti ti-shopping-cart" style={{ fontSize: 16 }} /> Order Now</>
          )}
        </button>
        <button style={{ ...S.btnOutline, justifyContent: 'center', padding: 13, fontSize: 13 }}>
          <i className="ti ti-message" style={{ fontSize: 16 }} /> Message Seller
        </button>
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: 8 }}>REVIEWS</div>
        {p.reviewsCount > 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size={28} /><span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>UserABC</span>
              <span style={{ marginLeft: 'auto' }}><Stars score={5} size={11} /></span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Great service, very professional and fast delivery!</p>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>No reviews yet.</p>
        )}
      </div>
    </div>
  )
}

// ─── Workers Page ───────────────────────────────────────────────────────────
function WorkersPage({ onViewWorker }: { onViewWorker: (worker: any) => void }) {
  const WORKERS = [
    { id: 1, username: 'Twitter_Automation_god', bio: 'I am a professional software developer and I write code that helps people save time and make money.', rating: 0, reviews: 0 },
    { id: 2, username: 'Dogo2541', bio: 'Active', rating: 0, reviews: 0 },
    { id: 3, username: 'Taki.Sakura', bio: 'Always available to help', rating: 0, reviews: 0 },
    { id: 4, username: 'Blueice', bio: 'That web3 guy', rating: 0, reviews: 0 },
    { id: 5, username: 'CHOCHO', bio: 'Hi, I\'m CHOCHO, a passionate graphic designer dedicated to transforming ideas into visually compelling and meaningful designs.', rating: 0, reviews: 0 },
    { id: 6, username: 'Wurk.Brainard', bio: 'Not a hell of an intro. Just a chill guy who\'s kinda into web3. Loves writing articles.', rating: 0, reviews: 0 },
    { id: 7, username: 'moony', bio: 'No bio available yet', rating: 3.9, reviews: 12 },
    { id: 8, username: 'ASQUARE', bio: 'Chasing the Big bag', rating: 3.5, reviews: 8 },
  ]

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <i className="ti ti-users" style={{ fontSize: 22, color: '#1F8CFF' }} />
        <h1 style={S.pageTitle}>Find Workers</h1>
      </div>
      <p style={S.subtitle}>Browse workers ready to help with your projects</p>

      <div style={{ ...S.filterGrid, marginTop: 20 }}>
        <select style={S.select}>
          <option>All</option>
          <option>Design</option>
          <option>Writing</option>
          <option>Social Media</option>
          <option>Tech</option>
        </select>
        <select style={S.select}>
          <option>Random</option>
          <option>Rating</option>
          <option>Most Active</option>
          <option>Newest</option>
        </select>
      </div>
      <div style={{ ...S.filterRow, marginTop: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input style={{ ...S.input, paddingLeft: 34 }} placeholder="Search by skills, bio, or tags..." />
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 14 }} />
        </div>
        <button style={S.btnPrimary}><i className="ti ti-search" style={{ fontSize: 14 }} /> Search</button>
      </div>

      <div style={S.resultsCount}>
        <i className="ti ti-users" style={{ fontSize: 14 }} /> Found 1,279 workers
      </div>

      <div style={S.grid2}>
        {WORKERS.map(w => (
          <div key={w.id} onClick={() => onViewWorker(w)} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
            padding: 14, display: 'flex', flexDirection: 'column' as const, gap: 8, cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar size={40} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{w.username}</span>
            </div>
            <Stars score={w.rating} size={12} />
            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>{w.bio}</p>
            <button style={S.btnOutlineFull}>
              View Profile <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Worker Profile Page ────────────────────────────────────────────────────
function WorkerProfilePage({ worker, onBack }: { worker: any; onBack: () => void }) {
  const PRODUCTS = [
    { id: 1, title: 'X Premium Membership', desc: 'Get your X (Twitter) account upgraded to premium for 3 months without any hassle. Quick setup.', seller: 'Afzan', rating: 5.0, reviews: 1, price: 'NGN 4,120', sol: '0.037 SOL', date: '1 week ago', img: 'https://picsum.photos/seed/xpremium/400/250', category: 'social' },
    { id: 2, title: 'High-CTR YouTube Thumbnail Design', desc: 'Struggling to get views? The secret is in the Thumbnail! Even the best videos fail without an eye-catching design.', seller: 'Kashem', rating: 0, reviews: 0, price: 'NGN 55,965', sol: '0.500 SOL', date: 'Feb 6', img: 'https://picsum.photos/seed/thumb/400/250', category: 'design' },
  ]
  const WORKERS = [
    { id: 1, username: 'Twitter_Automation_god', bio: 'I am a professional software developer and I write code that helps people save time and make money.', rating: 0, reviews: 0 },
  ]
  const w = worker || WORKERS[0]
  const [activeTab, setActiveTab] = useState('Products')
  const tabs = ['Products', 'Reviews', 'Blogs']

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', color: 'var(--text2)', fontSize: 13 }} onClick={onBack}>
        <i className="ti ti-arrow-left" style={{ fontSize: 16 }} /> Back to Workers
      </div>

      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
        padding: 20, textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'var(--bg2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--border)',
          }}>
            <i className="ti ti-user" style={{ fontSize: 32, color: 'var(--text3)' }} />
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 12 }}>{w.username}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>{w.bio}</div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
          <Stars score={w.rating} size={14} />
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1, background: 'var(--border)', border: '1px solid var(--border)',
        borderRadius: 10, overflow: 'hidden', marginBottom: 16,
      }}>
        {[
          { icon: 'ti ti-star', num: 0, label: 'Wins' },
          { icon: 'ti ti-users', num: 0, label: 'Communities' },
          { icon: 'ti ti-heart', num: 0, label: 'Compliments' },
          { icon: 'ti ti-gift', num: 0, label: 'Tips' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--card)', padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}><i className={s.icon} style={{ fontSize: 18, color: '#1F8CFF' }} /></div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{s.num}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {tabs.map(t => (
          <div key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, textAlign: 'center', padding: '11px 8px',
            fontSize: 13, fontWeight: 500, color: activeTab === t ? 'var(--text)' : 'var(--text3)',
            cursor: 'pointer', borderBottom: activeTab === t ? '2px solid #1F8CFF' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{t}</div>
        ))}
      </div>

      {activeTab === 'Products' && (
        <div style={S.grid2}>
          {PRODUCTS.slice(0, 2).map(p => (
            <div key={p.id} style={S.card}>
              <div style={{ position: 'relative', height: 100, overflow: 'hidden' }}>
                <img src={p.img} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <ActiveBadge />
              </div>
              <div style={{ padding: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>{p.price}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{p.sol}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'Reviews' && <p style={{ fontSize: 12, color: 'var(--text3)' }}>No reviews yet.</p>}
      {activeTab === 'Blogs' && <p style={{ fontSize: 12, color: 'var(--text3)' }}>No blog posts yet.</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        <button style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center' }}>
          <i className="ti ti-briefcase" style={{ fontSize: 16 }} /> Hire this Worker
        </button>
        <button style={{ ...S.btnOutline, flex: 1, justifyContent: 'center' }}>
          <i className="ti ti-gift" style={{ fontSize: 16 }} /> Send Tip
        </button>
      </div>
    </div>
  )
}

// ─── Store Nav ──────────────────────────────────────────────────────────────
function StoreNav({ activeView, onChange }: { activeView: string; onChange: (v: string) => void }) {
  const tabs = [
    { key: 'store', label: 'Store', icon: 'ti ti-building-store' },
    { key: 'workers', label: 'Workers', icon: 'ti ti-users' },
    { key: 'worker-portal', label: 'My Portal', icon: 'ti ti-briefcase' },
  ]
  return (
    <div style={{
      display: 'flex', gap: 4, marginBottom: 20, paddingBottom: 12,
      borderBottom: '1px solid var(--border)',
    }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          background: activeView === t.key ? 'var(--card)' : 'transparent',
          color: activeView === t.key ? '#1F8CFF' : 'var(--text3)',
          border: '1px solid',
          borderColor: activeView === t.key ? '#1F8CFF' : 'var(--border)',
          borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.15s',
        }}>
          <i className={t.icon} style={{ fontSize: 14 }} />
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main Store Component ───────────────────────────────────────────────────
export default function Store() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('store')
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [selectedWorker, setSelectedWorker] = useState<any>(null)

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product)
    setActiveView('product')
  }

  const handleViewWorker = (worker: any) => {
    setSelectedWorker(worker)
    setActiveView('worker-profile')
  }

  const handleBackToStore = () => {
    setSelectedProduct(null)
    setActiveView('store')
  }

  const handleBackToWorkers = () => {
    setSelectedWorker(null)
    setActiveView('workers')
  }

  const handlePurchase = async (_item: any) => {
    // Purchase succeeded — could navigate back or refresh
  }

  const showNav = ['store', 'workers', 'worker-portal'].includes(activeView)

  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {showNav && (
          <StoreNav activeView={activeView} onChange={(v) => {
            setActiveView(v)
            if (v === 'worker-portal') {
              navigate('/worker-portal')
            }
          }} />
        )}

        {activeView === 'store' && <StorePage onViewProduct={handleViewProduct} />}
        {activeView === 'workers' && <WorkersPage onViewWorker={handleViewWorker} />}
        {activeView === 'product' && <ProductDetailPage product={selectedProduct} onBack={handleBackToStore} onPurchase={handlePurchase} />}
        {activeView === 'worker-profile' && <WorkerProfilePage worker={selectedWorker} onBack={handleBackToWorkers} />}
      </div>
    </Layout>
  )
}
