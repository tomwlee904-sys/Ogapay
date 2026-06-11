import { useLivePrice } from "../hooks/useLivePrice"
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'

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

interface WorkerItem {
  id: string
  username: string
  avatarUrl: string | null
  bio: string
  rating: number
  reviews: number
  level: string
  skills: string[]
  tasksCompleted: number
  successRate: number
  isAvailable: boolean
}

interface WorkerProfileData {
  id: string
  username: string
  avatarUrl: string | null
  role: string
  bio: string
  rating: number
  reviews: number
  level: string
  skills: string[]
  tasksCompleted: number
  successRate: number
  isAvailable: boolean
  memberSince: string
  productCount: number
}

interface ReviewItem {
  id: string
  userId: string
  username: string
  avatarUrl: string | null
  rating: number
  comment: string | null
  createdAt: string
}

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

function formatPrice(item: StoreItem): string {
  const sym: Record<string, string> = { NGN: 'NGN ', SOL: '◎', USDC: '$' }
  const prefix = sym[item.currency] || ''
  if (item.currency === 'NGN') return `${prefix}${Math.round(item.price).toLocaleString('en-US')}`
  return `${prefix}${item.price.toFixed(item.price < 1 ? 4 : 2)}${item.currency === 'SOL' ? ' SOL' : ''}`
}

function formatSol(price: number, currency: string, solRate?: number): string {
  if (currency === 'SOL') return `◎${price.toFixed(3)} SOL`
  return `◎${solRate ? (price / solRate).toFixed(3) : (price / 145).toFixed(3)} SOL`
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

function Avatar({ size = 28, url }: { size?: number; url?: string | null }) {
  if (url) {
    return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
  }
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
    background: '#191C6B', color: '#fff', fontSize: 13, fontWeight: 700,
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
  cardTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardDesc: { fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box' as any, WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties,
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border)' },
  priceMain: { fontSize: 15, fontWeight: 800, color: 'var(--green)' },
  priceSub: { fontSize: 11, color: 'var(--text3)' },
  sellerRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 },
  newBadge: { background: 'var(--bg2)', color: 'var(--text3)', fontSize: 10, padding: '2px 7px', borderRadius: 20, marginLeft: 'auto', border: '1px solid var(--border)' },
  paginationRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24, paddingBottom: 16 },
  pageText: { fontSize: 13, color: 'var(--text2)' },
  categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 20 },
  catTile: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '12px 6px', gap: 6, cursor: 'pointer', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', transition: 'all 0.15s' },
  catTileLabel: { fontSize: 10, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.3 },
  loadingWrap: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 16 },
  errorBox: { background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 10, padding: 20, textAlign: 'center' as const, color: '#ef4444', fontSize: 13, lineHeight: 1.6 },
}

function StorePage({ onViewProduct }: { onViewProduct: (product: any) => void }) {
  const { sol } = useLivePrice()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
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

      const res = await apiRequest<any>(`/store?${params.toString()}`)
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

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { injectSkeletonStyles(); }, [])

  const totalPages = Math.ceil(total / 8) || 1

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <i className="ti ti-building-store" style={{ fontSize: 22, color: '#191C6B' }} />
        <h1 style={S.pageTitle}>Marketplace</h1>
      </div>
      <p style={S.subtitle}>Buy and sell digital products, services, templates, and more.</p>

      <div style={S.categoryGrid}>
        <div key="all" onClick={() => { setCategory(''); setPage(1) }} style={{
          ...S.catTile, borderColor: !category ? '#191C6B' : 'var(--border)',
          background: !category ? 'rgba(25,28,107,0.10)' : 'var(--card)',
        }}>
          <i className="ti ti-grid" style={{ fontSize: 18, color: !category ? '#191C6B' : 'var(--text3)' }} />
          <span style={{ ...S.catTileLabel, color: !category ? '#191C6B' : 'var(--text3)', fontWeight: !category ? 700 : 500 }}>All</span>
        </div>
        {CATEGORIES.map(c => (
          <div key={c.id} onClick={() => { setCategory(category === c.id ? '' : c.id); setPage(1) }} style={{
            ...S.catTile, borderColor: category === c.id ? '#191C6B' : 'var(--border)',
            background: category === c.id ? 'rgba(25,28,107,0.10)' : 'var(--card)',
          }}>
            <i className={c.icon} style={{ fontSize: 18, color: category === c.id ? '#191C6B' : 'var(--text3)' }} />
            <span style={{ ...S.catTileLabel, color: category === c.id ? '#191C6B' : 'var(--text3)', fontWeight: category === c.id ? 700 : 500 }}>{c.name}</span>
          </div>
        ))}
      </div>

      <div style={S.filterRow}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input style={{ ...S.input, paddingLeft: 34 }} placeholder="Search products..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 14 }} />
        </div>
        <select style={S.select} value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}>
          <option value="newest">Newest</option>
          <option value="stars_desc">Top Rated</option>
        </select>
      </div>

      <div style={{ ...S.resultsCount, marginBottom: 12 }}>
        <i className="ti ti-grid" style={{ fontSize: 14 }} />
        Showing {products.length} of {total} products
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {loading && <SkeletonPage />}

      {!loading && error && (
        <div style={S.errorBox}>
          <i className="ti ti-alert-circle" style={{ fontSize: 20, display: 'block', marginBottom: 8 }} />
          {error}
          <button onClick={fetchProducts} style={{ ...S.btnOutline, marginTop: 12, display: 'inline-flex' }}>
            <i className="ti ti-refresh" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div style={S.loadingWrap}>
          <i className="ti ti-search-off" style={{ fontSize: 28, color: 'var(--text3)' }} />
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>No products found. Try a different search or category.</span>
        </div>
      )}

      {!loading && !error && (
        <div style={S.grid2}>
          {products.map(p => (
            <div key={p.id} style={S.card} onClick={() => onViewProduct(p)}>
              <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
                <SafeImage src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' as const, position: 'absolute', inset: 0 }} />
                <ActiveBadge />
              </div>
              <div style={S.cardBody}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                  <span style={S.cardTitle}>{p.title}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{timeAgo(p.createdAt)}</span>
                </div>
                <p style={S.cardDesc}>{p.description}</p>
                <div style={S.sellerRow}>
                  <Avatar size={24} url={p.sellerAvatar} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/messages?user=" + encodeURIComponent(p.seller))}>{p.seller}</span>
                  {p.reviewsCount > 0
                    ? <span style={{ marginLeft: 'auto' }}><Stars score={p.rating} size={11} /></span>
                    : <span style={S.newBadge}>New creator</span>
                  }
                </div>
                <div style={S.priceRow}>
                  <span style={S.priceMain}>{formatPrice(p)}</span>
                  <span style={S.priceSub}>{formatSol(p.price, p.currency, sol.ngn)}</span>
                </div>
                <button style={S.btnOutlineFull}>
                  <i className="ti ti-eye" style={{ fontSize: 13 }} /> View more
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div style={S.paginationRow}>
          <button style={S.btnOutline} disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            <i className="ti ti-chevron-left" style={{ fontSize: 14 }} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              ...S.btnOutline, background: page === p ? '#191C6B' : 'var(--card)',
              color: page === p ? '#fff' : 'var(--text2)',
              borderColor: page === p ? '#191C6B' : 'var(--border)', minWidth: 32, justifyContent: 'center',
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

function ProductDetailPage({ product, onBack, onPurchase, refreshProducts }: { product: StoreItem; onBack: () => void; onPurchase: (item: StoreItem) => void; refreshProducts: () => void }) {
  const { sol } = useLivePrice()
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [purchased, setPurchased] = useState(false)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true)
    try {
      const data = await apiRequest<any>(`/store/${product.id}/reviews`)
      setReviews(Array.isArray(data) ? data : [])
    } catch {} finally { setReviewsLoading(false) }
  }, [product.id])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const handlePurchase = async () => {
    setPurchasing(true)
    setPurchaseError(null)
    try {
      await apiRequest(`/store/${product.id}/purchase`, { method: 'POST' })
      setPurchased(true)
      onPurchase(product)
      refreshProducts()
    } catch (err: any) {
      setPurchaseError(err?.message || 'Purchase failed')
    } finally { setPurchasing(false) }
  }

  const handleMessageSeller = () => {
    window.location.href = `/messages?user=${product.seller}`
  }

  const handleSubmitReview = async () => {
    if (reviewRating < 1) return
    setSubmittingReview(true)
    try {
      await apiRequest(`/store/${product.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      })
      setReviewSubmitted(true)
      setReviewRating(0)
      setReviewComment('')
      fetchReviews()
    } catch {} finally { setSubmittingReview(false) }
  }

  const p = product

  return (
    <div style={{ ...S.page, display: 'flex', flexDirection: 'column', gap: 0, padding: 0 }}>

      {/* Back link */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 0, cursor: 'pointer', color: 'var(--text2)', fontSize: 13, padding: '12px 16px' }} onClick={onBack}>
        <i className="ti ti-arrow-left" style={{ fontSize: 16 }} /> Back to Store
      </div>

      {/* 1. Full-width hero image, 16:9, no border-radius on top */}
      <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', position: 'relative', background: 'var(--bg2)' }}>
        {p.image ? (
          <SafeImage src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 32 }}>
            <i className="ti ti-photo" />
          </div>
        )}
        <ActiveBadge />
      </div>

      {/* Content padding */}
      <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 2. Title */}
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>{p.title}</h1>

        {/* 3. Pill row: Delivery time, Revisions, Category */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-clock" style={{ fontSize: 12 }} /> 1-3 days
          </span>
          <span style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-refresh" style={{ fontSize: 12 }} /> Unlimited revisions
          </span>
          <span style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-tag" style={{ fontSize: 12 }} /> {p.category}
          </span>
        </div>

        {/* 4. Dark "Ready to Order?" card */}
        <div style={{ background: '#0d0f14', border: '1px solid #1e2028', borderRadius: 12, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Ready to Order?</div>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>Complete your purchase and start working with {p.seller}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111318', border: '1px solid #2a2d35', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#4caf50' }}>{formatPrice(p)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#888' }}>≈ {formatSol(p.price, p.currency, sol.ngn)}</div>
            </div>
          </div>
          <button style={{ width: '100%', background: '#f5f5f5', color: '#0a0a0a', fontSize: 14, fontWeight: 700, padding: '13px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: purchasing || purchased ? 0.6 : 1, transition: 'opacity .15s' }}
            onClick={handlePurchase} disabled={purchasing || purchased}>
            {purchasing ? <><i className="ti ti-loader" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }} /> Processing...</>
            : purchased ? <><i className="ti ti-circle-check" style={{ fontSize: 16 }} /> Purchased</>
            : 'Buy Now'}
          </button>
          <button style={{ width: '100%', background: 'transparent', color: '#aaa', fontSize: 13, fontWeight: 600, padding: '12px 0', borderRadius: 10, border: '1.5px solid #2a2d35', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color .15s' }}
            onClick={handleMessageSeller}>
            <i className="ti ti-message" style={{ fontSize: 14, marginRight: 6 }} /> Message Seller
          </button>
        </div>

        {/* Purchase error/success */}
        {purchaseError && (
          <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)', borderRadius: 10, padding: 12, fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 14 }} />{purchaseError}
          </div>
        )}
        {purchased && (
          <div style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 13, color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 14 }} />Purchase successful!
          </div>
        )}

        {/* 5. DESCRIPTION */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Description</div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text2)', margin: 0 }}>{p.description}</p>
        </div>

        {/* 6. Seller card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 0' }}>
            <Avatar size={40} url={p.sellerAvatar} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{p.seller}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Seller</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)', marginTop: 12 }}>
            {[
              { icon: 'ti ti-heart', num: '0', label: 'Compliments' },
              { icon: 'ti ti-trophy', num: '0', label: 'Challenges Won' },
              { icon: 'ti ti-star', num: p.reviewsCount || 0, label: 'Reviews' },
              { icon: 'ti ti-award', num: p.rating > 0 ? p.rating.toFixed(1) : '0.0', label: 'Rating' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--card)', padding: '14px 8px', textAlign: 'center' }}>
                <i className={s.icon} style={{ fontSize: 16, color: '#191C6B' }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{s.num}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 7. REVIEWS */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Reviews</div>

          {!purchased && !reviewSubmitted && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Write a review</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {[1,2,3,4,5].map(i => (
                  <span key={i} onClick={() => setReviewRating(i)} style={{ cursor: 'pointer', fontSize: 20, color: i <= reviewRating ? '#facc15' : 'var(--text3)' }}>★</span>
                ))}
              </div>
              <textarea style={{ ...S.input, minHeight: 60, resize: 'vertical' } as any} placeholder="Share your experience..." value={reviewComment}
                onChange={e => setReviewComment(e.target.value)} />
              <button style={{ ...S.btnPrimary, marginTop: 8 }} onClick={handleSubmitReview} disabled={submittingReview || reviewRating < 1}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          )}

          {reviewSubmitted && (
            <div style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)', borderRadius: 10, padding: 12, marginBottom: 12, color: '#22c55e', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-circle-check" />Review submitted!
            </div>
          )}

          {reviewsLoading && <p style={{ fontSize: 12, color: 'var(--text3)' }}>Loading reviews...</p>}

          {!reviewsLoading && reviews.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>No reviews yet.</p>
          )}

          {!reviewsLoading && reviews.map(r => (
            <div key={r.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={28} url={r.avatarUrl} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.username}</span>
                <span style={{ marginLeft: 'auto' }}><Stars score={r.rating} size={11} /></span>
              </div>
              {r.comment && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8, margin: 0 }}>{r.comment}</p>}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

function WorkersPage({ onViewWorker }: { onViewWorker: (worker: WorkerItem) => void }) {
  const [workers, setWorkers] = useState<WorkerItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('random')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const fetchWorkers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      if (sort) params.set('sort', sort)
      params.set('page', String(page))
      params.set('limit', '12')

      const res = await apiRequest<any>(`/store/workers?${params.toString()}`)
      setWorkers(Array.isArray(res) ? res : res?.items ?? [])
      setTotal(res?.total ?? 0)
    } catch {} finally { setLoading(false) }
  }, [search, category, sort, page])

  useEffect(() => { fetchWorkers() }, [fetchWorkers])

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <i className="ti ti-users" style={{ fontSize: 22, color: '#191C6B' }} />
        <h1 style={S.pageTitle}>Find Workers</h1>
      </div>
      <p style={S.subtitle}>Browse workers ready to help with your projects</p>

      <div style={{ ...S.filterGrid, marginTop: 20 }}>
        <select style={S.select} value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}>
          <option value="">All Categories</option>
          <option value="Design">Design</option>
          <option value="Writing">Writing</option>
          <option value="Social Media">Social Media</option>
          <option value="Tech">Tech</option>
        </select>
        <select style={S.select} value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}>
          <option value="random">Random</option>
          <option value="rating">Rating</option>
          <option value="active">Most Active</option>
          <option value="newest">Newest</option>
        </select>
      </div>
      <div style={{ ...S.filterRow, marginTop: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input style={{ ...S.input, paddingLeft: 34 }} placeholder="Search by skills, bio, or tags..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 14 }} />
        </div>
        <button style={S.btnPrimary} onClick={fetchWorkers}><i className="ti ti-search" style={{ fontSize: 14 }} /> Search</button>
      </div>

      <div style={S.resultsCount}>
        <i className="ti ti-users" style={{ fontSize: 14 }} /> Found {total} worker{total !== 1 ? 's' : ''}
      </div>

      {loading && <SkeletonPage />}

      {!loading && workers.length === 0 && (
        <div style={S.loadingWrap}>
          <i className="ti ti-search-off" style={{ fontSize: 28, color: 'var(--text3)' }} />
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>No workers found.</span>
        </div>
      )}

      {!loading && (
        <div style={S.grid2}>
          {workers.map(w => (
            <div key={w.id} onClick={() => onViewWorker(w)} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
              padding: 14, display: 'flex', flexDirection: 'column' as const, gap: 8, cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar size={40} url={w.avatarUrl} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{w.username}</span>
              </div>
              <Stars score={w.rating} size={12} />
              <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>{w.bio}</p>
              <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text3)', flexWrap: 'wrap' }}>
                <span>{w.tasksCompleted} tasks</span>
                <span>{(w.successRate * 100).toFixed(0)}% success</span>
              </div>
              <button style={S.btnOutlineFull}>
                View Profile <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WorkerProfilePage({ worker, onBack }: { worker: WorkerItem; onBack: () => void }) {
  const [profile, setProfile] = useState<WorkerProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Products')
  const tabs = ['Products', 'Reviews', 'Blogs']

  useEffect(() => {
    if (!worker?.id) return
    setProfileLoading(true)
    apiRequest<any>(`/store/workers/${worker.id}`)
      .then(data => {
        if (data && data.success === true && data.data != null) {
          setProfile(data.data)
        }
        // If fetch returns empty/unexpected, keep profile as null
        // so the component renders using worker prop directly
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, [worker?.id])

  const w = profile || worker

  const handleHire = () => {
    window.location.href = `/messages?hire=${w.username}`
  }

  const handleTip = () => {
    window.location.href = `/wallet?tip=${w.username}`
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', color: 'var(--text2)', fontSize: 13 }} onClick={onBack}>
        <i className="ti ti-arrow-left" style={{ fontSize: 16 }} /> Back to Workers
      </div>

      {profileLoading && <SkeletonPage />}

      {!profileLoading && (
        <>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Avatar size={72} url={'avatarUrl' in w ? (w as any).avatarUrl : null} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginTop: 12 }}>{w.username}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>{w.bio}</div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
              <Stars score={w.rating} size={14} />
            </div>
            {'level' in w && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                <span style={{ background: 'var(--bg2)', padding: '3px 8px', borderRadius: 20 }}>{w.level}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            {[
              { icon: 'ti ti-star', num: w.tasksCompleted || 0, label: 'Tasks' },
              { icon: 'ti ti-users', num: 0, label: 'Communities' },
              { icon: 'ti ti-heart', num: 0, label: 'Compliments' },
              { icon: 'ti ti-gift', num: 0, label: 'Tips' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--card)', padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><i className={s.icon} style={{ fontSize: 18, color: '#191C6B' }} /></div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{s.num}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
            {tabs.map(t => (
              <div key={t} onClick={() => setActiveTab(t)} style={{
                flex: 1, textAlign: 'center', padding: '11px 8px', fontSize: 13, fontWeight: 500,
                color: activeTab === t ? 'var(--text)' : 'var(--text3)', cursor: 'pointer',
                borderBottom: activeTab === t ? '2px solid #191C6B' : '2px solid transparent', transition: 'all 0.15s',
              }}>{t}</div>
            ))}
          </div>

          {activeTab === 'Reviews' && <p style={{ fontSize: 12, color: 'var(--text3)' }}>No reviews yet.</p>}
          {activeTab === 'Blogs' && <p style={{ fontSize: 12, color: 'var(--text3)' }}>No blog posts yet.</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            <button style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center' }} onClick={handleHire}>
              <i className="ti ti-briefcase" style={{ fontSize: 16 }} /> Hire this Worker
            </button>
            <button style={{ ...S.btnOutline, flex: 1, justifyContent: 'center' }} onClick={handleTip}>
              <i className="ti ti-gift" style={{ fontSize: 16 }} /> Send Tip
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function StoreNav({ activeView, onChange }: { activeView: string; onChange: (v: string) => void }) {
  const tabs = [
    { key: 'store', label: 'Store', icon: 'ti ti-building-store' },
    { key: 'workers', label: 'Workers', icon: 'ti ti-users' },
    { key: 'worker-portal', label: 'My Portal', icon: 'ti ti-briefcase' },
  ]
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          background: activeView === t.key ? 'var(--card)' : 'transparent',
          color: activeView === t.key ? '#191C6B' : 'var(--text3)',
          border: '1px solid', borderColor: activeView === t.key ? '#191C6B' : 'var(--border)',
          borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
        }}>
          <i className={t.icon} style={{ fontSize: 14 }} />
          {t.label}
        </button>
      ))}
    </div>
  )
}

export default function Store() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [activeView, setActiveView] = useState(id ? 'product' : 'store')
  const [selectedProduct, setSelectedProduct] = useState<StoreItem | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<WorkerItem | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [productError, setProductError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoadingProduct(true)
    setProductError(null)
    apiRequest<StoreItem>(`/store/${id}`, { method: 'GET', auth: false })
      .then(product => {
        setSelectedProduct(product)
        setActiveView('product')
      })
      .catch(err => setProductError(err.message || 'Product not found'))
      .finally(() => setLoadingProduct(false))
  }, [id])

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
    if (id) navigate('/store', { replace: true })
  }

  const handleBackToWorkers = () => {
    setSelectedWorker(null)
    setActiveView('workers')
  }

  const handlePurchase = (_item: any) => {}

  const refreshProducts = () => setRefreshKey(k => k + 1)

  const showNav = ['store', 'workers', 'worker-portal'].includes(activeView)

  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {showNav && (
          <StoreNav activeView={activeView} onChange={(v) => {
            setActiveView(v)
            if (v === 'worker-portal') navigate('/worker-portal')
          }} />
        )}

        {id && loadingProduct && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <i className="ti ti-loader" style={{ fontSize: 24, color: 'var(--text3)', animation: 'spin 1s linear infinite', display: 'block', marginBottom: 12 }} />
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Loading product...</span>
          </div>
        )}

        {id && productError && !loadingProduct && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 28, color: '#ef4444', display: 'block', marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: '#ef4444', marginBottom: 16 }}>{productError}</p>
            <button onClick={() => navigate('/store')} style={S.btnPrimary}>
              <i className="ti ti-arrow-left" /> Back to Store
            </button>
          </div>
        )}

        {activeView === 'store' && <StorePage onViewProduct={handleViewProduct} key={refreshKey} />}
        {activeView === 'workers' && <WorkersPage onViewWorker={handleViewWorker} />}
        {activeView === 'product' && selectedProduct && <ProductDetailPage product={selectedProduct!} onBack={handleBackToStore} onPurchase={handlePurchase} refreshProducts={refreshProducts} />}
        {activeView === 'worker-profile' && <WorkerProfilePage worker={selectedWorker!} onBack={handleBackToWorkers} />}
      </div>
    </Layout>
  )
}
