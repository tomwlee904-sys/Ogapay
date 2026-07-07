import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
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
  btnPrimary: { height: 38, padding: '0 18px', borderRadius: 9, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [products, setProducts] = useState<StoreItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>(['All'])
  const limit = 12

  const category = searchParams.get('category') || ''
  const sort = searchParams.get('sort') || 'newest'
  const page = Number(searchParams.get('page')) || 1

  const updateURL = (updates: Record<string, string | undefined>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => {
        if (v) next.set(k, v); else next.delete(k)
      })
      return next
    }, { replace: false })
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      updateURL({ search: searchInput || undefined })
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchProducts = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (search) params.set('search', search)
      if (sort) params.set('sort', sort)
      params.set('page', String(page))
      params.set('limit', String(limit))
      const res = await apiRequest<any>('/store?' + params.toString())
      const data = res?.data || res
      const items = data?.products || data?.items || data?.data || data || []
      setProducts(items)
      setTotal(data?.total || data?.count || (Array.isArray(data) ? data.length : 0))
      // Derive categories from API response
      if (data?.categories || items.length > 0) {
        const cats = data?.categories || [...new Set(items.map((p: any) => p.category).filter(Boolean))] as string[]
        if (cats.length > 0) setAllCategories(['All', ...cats])
      }
    } catch (e) {
      setError((e as any)?.message || 'Failed to load products')
    } finally { setLoading(false) }
  }, [category, search, sort, page])
  useEffect(() => { fetchProducts() }, [fetchProducts])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <style>{`
.store-card{background:var(--glass-bg);backdrop-filter:blur(var(--glass-blur));-webkit-backdrop-filter:blur(var(--glass-blur));border:1.5px solid var(--glass-border);border-radius:18px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);cursor:pointer;transition:box-shadow .25s ease,transform .25s ease,border-color .25s ease;display:flex;flex-direction:column;min-height:460px}
.store-card:hover{box-shadow:0 0 0 1px rgba(var(--accent-rgb),0.5),0 0 36px 6px rgba(var(--accent-rgb),0.20),0 14px 28px -8px rgba(var(--accent-rgb),0.28);transform:translateY(-4px);border-color:rgba(var(--accent-rgb),0.5)}
.store-card:hover img{transform:scale(1.05)}
.store-card .card-body{flex:1;display:flex;flex-direction:column;padding:16px;gap:10px}
.store-card .card-desc{flex-shrink:0}
.store-card .seller-box{display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(var(--accent-rgb),0.05);border:1px solid rgba(var(--accent-rgb),0.12);border-radius:12px;padding:9px 12px}
.store-card .price-box{display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(var(--accent-rgb),0.06);border:1.5px solid rgba(var(--accent-rgb),0.28);border-radius:12px;padding:10px 14px}
.store-card .view-more-btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;height:38px;border-radius:999px;border:1.5px solid var(--border);background:var(--card);color:var(--text2);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;transition:background .2s,border-color .2s,color .2s}
.store-card:hover .view-more-btn{border-color:rgba(var(--accent-rgb),0.4);color:var(--accent)}
@keyframes price-shimmer{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}
.price-shimmer{animation:price-shimmer 2s ease-in-out infinite}
.store-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:767px){.store-grid{grid-template-columns:1fr!important}.store-filter-bar{grid-template-columns:1fr!important}.store-action-btns{flex-direction:column}}@media(min-width:768px) and (max-width:1279px){.store-grid{grid-template-columns:repeat(2,1fr)!important}.store-filter-bar{grid-template-columns:1fr!important}.store-action-btns{flex-direction:column}}
`}</style>
      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800,
          color: 'var(--text)', marginBottom: 4
        }}>
          Discover Products
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
          Browse amazing products and services from workers
        </p>

        {/* Action buttons */}
        <div className="store-action-btns" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
          <button
            onClick={() => navigate('/create')}
            style={{
              height: 40, padding: '0 18px', borderRadius: 10,
              background: OGAPAY_BLUE, color: '#fff', border: 'none',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', display: 'inline-flex',
              alignItems: 'center', gap: 7
            }}>
            <i className="ti ti-plus-circle" style={{ fontSize: 15 }} />
            Create a job
          </button>
          <button
            onClick={() => navigate('/workers')}
            style={{
              height: 40, padding: '0 18px', borderRadius: 10,
              background: OGAPAY_BLUE, color: '#fff',
              border: 'none', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 7
            }}>
            <i className="ti ti-search" style={{ fontSize: 15 }} />
            Browse creators
          </button>
          <button
            onClick={() => navigate('/worker-portal')}
            style={{
              height: 40, padding: '0 18px', borderRadius: 10,
              background: OGAPAY_BLUE, color: '#fff',
              border: 'none', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 7
            }}>
            <i className="ti ti-building-store" style={{ fontSize: 15 }} />
            Open your store
          </button>
        </div>

        {/* Filter bar */}
        <div className="store-filter-bar" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr auto',
          gap: 12, alignItems: 'end',
          padding: '18px 20px',
          border: '1px solid var(--border)',
          borderRadius: 14,
          background: 'var(--card)',
          marginBottom: 16
        }}>
          {/* Category */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5
            }}>
              <i className="ti ti-layout-list" style={{ fontSize: 12 }} /> Category
            </div>
            <select
              value={category || ''}
              onChange={e => updateURL({ category: e.target.value || undefined, page: undefined })}
              style={{
                width: '100%', height: 42, padding: '0 12px',
                border: '1px solid var(--border)', borderRadius: 9,
                background: 'var(--bg)', color: 'var(--text)',
                fontSize: 13, fontFamily: 'inherit', outline: 'none'
              }}>
              <option value="">All</option>
              {['Design','Social','Marketing','Development','Communities','Content','Crypto','AI','Templates'].map(c => (
                <option key={c} value={c.toLowerCase()}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sort by */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5
            }}>
              <i className="ti ti-home" style={{ fontSize: 12 }} /> Sort By
            </div>
            <select
              value={sort}
              onChange={e => updateURL({ sort: e.target.value === 'newest' ? undefined : e.target.value })}
              style={{
                width: '100%', height: 42, padding: '0 12px',
                border: '1px solid var(--border)', borderRadius: 9,
                background: 'var(--bg)', color: 'var(--text)',
                fontSize: 13, fontFamily: 'inherit', outline: 'none'
              }}>
              <option value="newest">Newest</option>
              <option value="rating">Quality (High to Low)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5
            }}>
              <i className="ti ti-search" style={{ fontSize: 12 }} /> Search Products
            </div>
            <input
              value={searchInput}
              onChange={e => { setSearchInput(e.target.value); updateURL({ page: undefined }) }}
              placeholder="Try: Logo Design, Writing, Developm..."
              style={{
                width: '100%', height: 42, padding: '0 12px',
                border: '1px solid var(--border)', borderRadius: 9,
                background: 'var(--bg)', color: 'var(--text)',
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Search button */}
          <button
            onClick={() => { setSearch(searchInput); updateURL({ search: searchInput || undefined, page: undefined }) }}
            style={{
              height: 42, padding: '0 20px', borderRadius: 9,
              background: OGAPAY_BLUE, color: '#fff', border: 'none',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              fontFamily: 'inherit', display: 'inline-flex',
              alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
            }}>
            <i className="ti ti-search" style={{ fontSize: 14 }} /> Search
          </button>
        </div>

        {/* Results count */}
        {!loading && total > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--card)', fontSize: 13,
            color: 'var(--text2)', marginBottom: 16
          }}>
            <i className="ti ti-briefcase" style={{ fontSize: 14, color: 'var(--text3)' }} />
            Showing <strong>{products.length}</strong> of <strong>{total}</strong> products
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: 'rgba(var(--red-rgb),0.08)', border: '1px solid rgba(var(--red-rgb),0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: 'var(--red)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-circle" /> {error}
          <button onClick={fetchProducts} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Products grid */}
      {loading ? (
        <SkeletonPage />
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
          <i className="ti ti-building-store-off" style={{ fontSize: 36, color: 'var(--text3)', marginBottom: 12, display: 'block' }} />
          <p style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>No products found</p>
          <p style={{ fontSize: 12, margin: 0 }}>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="store-grid" style={{ display: 'grid', gap: 16 }}>
          {products.map(p => (
            <div key={p.id} className="store-card" onClick={() => onViewProduct(p)}>
              <div style={{ position: 'relative', height: 200, background: 'var(--bg2)', overflow: 'hidden', flexShrink: 0 }}>
                <SafeImage src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }} />
                {p.category && (
                  <span style={{ position: 'absolute', top: 8, left: 8, padding: '2px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                    {p.category}
                  </span>
                )}
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{p.title}</div>
                  {p.createdAt && <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0, paddingTop: 2 }}>{timeAgo(p.createdAt)}</span>}
                </div>
                <div className="card-desc" style={{ fontSize: 12, color: 'var(--text2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden', lineHeight: 1.4 }}>
                  {p.description}
                </div>
                <div className="seller-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: p.reviewsCount > 0 ? `2px solid ${OGAPAY_BLUE}` : '1.5px solid var(--border)', display: 'grid', placeItems: 'center', background: OGAPAY_BLUE, color: '#fff', fontSize: 11, fontWeight: 800 }}>
                      {p.sellerAvatar ? <img src={p.sellerAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : p.seller?.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.seller}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>
                        {p.reviewsCount >= 10 ? 'Top creator' : p.reviewsCount >= 1 ? 'Creator' : 'New creator'}
                      </div>
                    </div>
                  </div>
                  {p.rating > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 9px' }}>
                      <ProductStars rating={p.rating} compact />
                    </div>
                  )}
                </div>
                <div className="price-box">
                  <div className="price-shimmer" style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', lineHeight: 1.2 }}>
                    ${(['USDC', 'USDT'].includes(p.currency) ? p.price : p.currency === 'NGN' ? p.price * 0.0008 : p.price * 190).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginTop: 2 }}>
                    {p.currency || 'NGN'} {formatCompact(p.price)}
                  </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onViewProduct(p); }}
                    className="view-more-btn"
                    style={{ width: '100%' }}
                  ><i className="ti ti-eye" style={{ fontSize: 13 }} /> View more</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          <button onClick={() => updateURL({ page: String(page - 1) })} disabled={page <= 1}
            style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: page <= 1 ? 'var(--text3)' : 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: page <= 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            Prev
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--text2)', padding: '0 8px' }}>Page {page} of {totalPages}</span>
          <button onClick={() => updateURL({ page: String(page + 1) })} disabled={page >= totalPages}
            style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: page >= totalPages ? 'var(--text3)' : 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: page >= totalPages ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            Next
          </button>
        </div>
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 20% 10%, rgba(var(--accent-rgb),0.10), transparent 50%),radial-gradient(circle at 80% 30%, rgba(20,184,166,0.08), transparent 50%),radial-gradient(circle at 50% 90%, rgba(153,69,255,0.06), transparent 50%)',
      }} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px', position: 'relative' as const, zIndex: 1 }}>
        {showNav && <StoreNav activeView={activeView} onChange={(v) => { setActiveView(v); if (v === 'worker-portal') navigate('/worker-portal') }} />}

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
                background: OGAPAY_BLUE, color: '#fff',
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
                  background: OGAPAY_BLUE, color: '#fff',
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
                  background: OGAPAY_BLUE, color: '#fff',
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
