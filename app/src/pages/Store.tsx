import { useLivePrice } from "../hooks/useLivePrice"
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'

const OGAPAY_BLUE = '#191C6D'

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

function formatPay(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
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
  memberSince: string
  languages: string[]
  hourlyRate: number
  walletAddress: string | null
}

interface ReviewItem {
  id: string
  user: { username: string; avatarUrl: string | null }
  rating: number
  comment: string
  createdAt: string
}

const S = {
  card: { background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' },
  grid: { display: 'grid', gap: 16 } as React.CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 } as React.CSSProperties,
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
// PRODUCT DETAIL PAGE
// ═══════════════════════════════════════════════
function ProductDetailPage({ product, onBack }: { product: StoreItem; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'Products' | 'Reviews' | 'Blogs'>('Products')
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
    try {
      const data = await apiRequest<any>('/store/' + product.id + '/reviews')
      setReviews(data?.data || data || [])
    } catch {} finally { setReviewsLoading(false) }
  }, [product.id])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const handlePurchase = async () => {
    setPurchasing(true); setPurchaseError(null)
    try {
      await apiRequest('/store/' + product.id + '/purchase', { method: 'POST' })
      setPurchased(true)
    } catch (e: any) {
      setPurchaseError(e?.message || 'Purchase failed')
    } finally { setPurchasing(false) }
  }

  const submitReview = async () => {
    if (!reviewRating) return
    setSubmittingReview(true)
    try {
      await apiRequest('/store/' + product.id + '/reviews', {
        method: 'POST',
        body: { rating: reviewRating, comment: reviewComment },
      })
      setReviewSubmitted(true)
      fetchReviews()
    } catch {} finally { setSubmittingReview(false) }
  }

  const icon = (n: string, s = 18, c?: string) => (
    <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || 'var(--text2)', lineHeight: 1, flexShrink: 0 }} />
  )

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} style={{ height: 36, padding: '0 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <i className="ti ti-arrow-left" style={{ fontSize: 15 }} /> Back to Store
      </button>

      {/* Product Hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', position: 'relative', height: 300, background: 'var(--bg2)' }}>
          <SafeImage src={product.image} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'Outfit', marginBottom: 8 }}>{product.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: OGAPAY_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, overflow: 'hidden' }}>
              {product.sellerAvatar ? <img src={product.sellerAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : product.seller?.slice(0,2).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{product.seller}</span>
            <span style={{ fontSize: 12, color: '#f59e0b' }}>{'★'.repeat(Math.round(product.rating || 0))}{'☆'.repeat(5 - Math.round(product.rating || 0))}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>({product.reviewsCount || 0})</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>{product.description}</p>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#16a34a', marginBottom: 4 }}>{product.currency || 'NGN'} {formatPay(product.price)}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
            {product.stock !== null && product.stock !== undefined ? `${product.stock} in stock` : 'Digital delivery'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePurchase} disabled={purchasing || purchased}
              style={{ height: 40, padding: '0 24px', borderRadius: 9, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: (purchasing || purchased) ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {purchased ? '✓ Purchased' : purchasing ? 'Purchasing...' : 'Buy Now'}
            </button>
          </div>
          {purchaseError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{purchaseError}</div>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {['Products', 'Reviews', 'Blogs'].map(t => (
          <div key={t} onClick={() => setActiveTab(t as any)}
            style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: activeTab === t ? OGAPAY_BLUE : 'var(--text3)', borderBottom: activeTab === t ? '2px solid ' + OGAPAY_BLUE : '2px solid transparent', transition: 'all 0.15s' }}>
            {t}
          </div>
        ))}
      </div>

      {activeTab === 'Products' && (
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>This item is a digital product. Upon purchase, you will receive access instructions.</p>
      )}
      {activeTab === 'Reviews' && (
        <div>
          {reviewsLoading ? (
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>No reviews yet. Be the first!</p>
          ) : (
            reviews.map(r => (
              <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: OGAPAY_BLUE, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 9, fontWeight: 800 }}>
                    {r.user?.avatarUrl ? <img src={r.user.avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} /> : r.user?.username?.slice(0,2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{r.user?.username}</span>
                  <span style={{ fontSize: 11, color: '#f59e0b' }}>{'★'.repeat(r.rating)}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0 }}>{r.comment}</p>
              </div>
            ))
          )}
          {!reviewSubmitted && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Write a Review</div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} onClick={() => setReviewRating(n)} style={{ cursor: 'pointer', fontSize: 20, color: n <= reviewRating ? '#f59e0b' : 'var(--border)' }}>★</span>
                ))}
              </div>
              <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                placeholder="Share your experience..."
                style={{ width: '100%', minHeight: 60, padding: 10, border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={submitReview} disabled={!reviewRating || submittingReview}
                style={{ marginTop: 8, height: 34, padding: '0 16px', borderRadius: 8, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          )}
        </div>
      )}
      {activeTab === 'Blogs' && <p style={{ fontSize: 12, color: 'var(--text3)' }}>No blog posts yet.</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════
// WORKER PROFILE PAGE
// ═══════════════════════════════════════════════
function WorkerProfilePage({ worker, onBack }: { worker: WorkerItem; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'Products' | 'Reviews' | 'Blogs'>('Products')
  const navigate = useNavigate()
  const icon = (n: string, s = 18, c?: string) => (
    <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || 'var(--text2)', lineHeight: 1, flexShrink: 0 }} />
  )

  const ActiveBadge = () => (
    <span style={{
      position: 'absolute', top: 8, left: 8, background: '#16a34a', color: '#fff',
      fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
      {worker.isAvailable ? 'Available' : 'Busy'}
    </span>
  )

  return (
    <div>
      <button onClick={onBack} style={{ height: 36, padding: '0 14px', borderRadius: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <i className="ti ti-arrow-left" /> Back to Workers
      </button>

      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: OGAPAY_BLUE, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 24, fontWeight: 900, overflow: 'hidden', flexShrink: 0 }}>
            {worker.avatarUrl ? <img src={worker.avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : worker.username?.slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'Outfit' }}>{worker.username}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{worker.bio?.slice(0, 80) || 'Worker'}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: '#f59e0b' }}>{'★'.repeat(Math.round(worker.rating || 0))}{'☆'.repeat(5 - Math.round(worker.rating || 0))}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>({worker.reviews || 0} reviews)</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: OGAPAY_BLUE }}>{worker.level}</span>
            </div>
          </div>
          <button onClick={() => navigate('/user/' + worker.username)} style={{ marginLeft: 'auto', height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            View Profile
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {worker.skills?.map((s, i) => (
            <span key={i} style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(25,28,107,0.08)', color: OGAPAY_BLUE, fontSize: 11, fontWeight: 600 }}>{s}</span>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 900 }}>{worker.tasksCompleted || 0}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tasks Done</div>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 900, color: '#16a34a' }}>{worker.successRate || 0}%</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Success Rate</div>
          </div>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>{'★'}</div>
            <div style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{worker.rating?.toFixed(1) || '—'}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {['Products', 'Reviews', 'Blogs'].map(t => (
            <div key={t} onClick={() => setActiveTab(t as any)}
              style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: activeTab === t ? OGAPAY_BLUE : 'var(--text3)', borderBottom: activeTab === t ? '2px solid ' + OGAPAY_BLUE : '2px solid transparent' }}>
              {t}
            </div>
          ))}
        </div>

        {activeTab === 'Products' && <p style={{ fontSize: 12, color: 'var(--text3)' }}>No products listed yet.</p>}
        {activeTab === 'Reviews' && <p style={{ fontSize: 12, color: 'var(--text3)' }}>No reviews yet.</p>}
        {activeTab === 'Blogs' && <p style={{ fontSize: 12, color: 'var(--text3)' }}>No blog posts yet.</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button style={S.btnPrimary}>
            <i className="ti ti-briefcase" /> Hire this Worker
          </button>
          <button style={S.btnOutline}>
            <i className="ti ti-gift" /> Send Tip
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// WORKERS PAGE
// ═══════════════════════════════════════════════
function WorkersPage({ onViewWorker }: { onViewWorker: (w: WorkerItem) => void }) {
  const [workers, setWorkers] = useState<WorkerItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWorkers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiRequest<any>('/workers')
      setWorkers(res?.data || res || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchWorkers() }, [fetchWorkers])

  if (loading) return <SkeletonPage />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {workers.map(w => (
        <div key={w.id} style={{ ...S.card, cursor: 'pointer', padding: 16, textAlign: 'center' as const }} onClick={() => onViewWorker(w)}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: OGAPAY_BLUE, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 auto 10px', overflow: 'hidden' }}>
            {w.avatarUrl ? <img src={w.avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : w.username?.slice(0,2).toUpperCase()}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{w.username}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>{w.bio?.slice(0, 60) || 'Worker'}</div>
          <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 8 }}>{'★'.repeat(Math.round(w.rating || 0))}{'☆'.repeat(5 - Math.round(w.rating || 0))} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({w.reviews || 0})</span></div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {w.skills?.slice(0, 3).map((s, i) => (
              <span key={i} style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(25,28,107,0.08)', color: OGAPAY_BLUE, fontSize: 10, fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════
// STORE PAGE (product grid with categories)
// ═══════════════════════════════════════════════
function StorePage({ onViewProduct }: { onViewProduct: (p: StoreItem) => void }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [products, setProducts] = useState<StoreItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 12

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
      setProducts(data?.products || data?.items || data?.data || data || [])
      setTotal(data?.total || data?.count || (Array.isArray(data) ? data.length : 0))
    } catch (e) {
      setError((e as any)?.message || 'Failed to load products')
    } finally { setLoading(false) }
  }, [category, search, sort, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { injectSkeletonStyles() }, [])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      {/* Search + Sort bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180, display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card)' }}>
          <i className="ti ti-search" style={{ color: 'var(--text3)', fontSize: 15 }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search products..." style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--card)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit' }}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="price_asc">Price: Low</option>
          <option value="price_desc">Price: High</option>
          <option value="rating">Highest Rated</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#dc2626', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-circle" /> {error}
          <button onClick={fetchProducts} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['All', 'Design', 'Social', 'Marketing', 'Development', 'Communities', 'Content', 'Crypto', 'AI', 'Templates'].map(c => (
          <button key={c} onClick={() => { setCategory(c === 'All' ? '' : c.toLowerCase()); setPage(1) }}
            style={{
              height: 32, padding: '0 12px', borderRadius: 999, border: '1px solid',
              borderColor: (category === '' && c === 'All') || category === c.toLowerCase() ? OGAPAY_BLUE : 'var(--border)',
              background: (category === '' && c === 'All') || category === c.toLowerCase() ? OGAPAY_BLUE : 'transparent',
              color: (category === '' && c === 'All') || category === c.toLowerCase() ? '#fff' : 'var(--text2)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
            <i className={CATEGORY_ICONS[c] || 'ti ti-box'} style={{ fontSize: 13 }} /> {c}
          </button>
        ))}
      </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {products.map(p => (
            <div key={p.id} style={{ ...S.card, cursor: 'pointer' }} onClick={() => onViewProduct(p)}>
              <div style={{ position: 'relative', height: 160, background: 'var(--bg2)' }}>
                <SafeImage src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {p.category && (
                  <span style={{ position: 'absolute', top: 8, left: 8, padding: '2px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 9, fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                    {p.category}
                  </span>
                )}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: OGAPAY_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 8, fontWeight: 800, overflow: 'hidden', flexShrink: 0 }}>
                    {p.sellerAvatar ? <img src={p.sellerAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : p.seller?.slice(0,2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{p.seller}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#f59e0b' }}>{p.rating > 0 ? '★' + p.rating.toFixed(1) : ''}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden', lineHeight: 1.4 }}>
                  {p.description}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#16a34a' }}>{p.currency || 'NGN'} {formatPay(p.price)}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontWeight: 600 }}>View →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: page <= 1 ? 'var(--text3)' : 'var(--text2)', fontSize: 11, fontWeight: 700, cursor: page <= 1 ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            Prev
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--text2)', padding: '0 8px' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
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
    { key: 'workers', label: 'Workers', icon: 'ti ti-users' },
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

  const showNav = ['store', 'workers', 'worker-portal'].includes(activeView)

  return (
    <Layout>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 20% 10%, rgba(25,28,107,0.10), transparent 50%),radial-gradient(circle at 80% 30%, rgba(20,184,166,0.08), transparent 50%),radial-gradient(circle at 50% 90%, rgba(153,69,255,0.06), transparent 50%)',
      }} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px', position: 'relative' as const, zIndex: 1 }}>
        {showNav && <StoreNav activeView={activeView} onChange={(v) => { setActiveView(v); if (v === 'worker-portal') navigate('/worker-portal') }} />}

        {activeView === 'store' && <StorePage onViewProduct={handleViewProduct} />}
        {activeView === 'workers' && <WorkersPage onViewWorker={handleViewWorker} />}
        {activeView === 'product' && <ProductDetailPage product={selectedProduct} onBack={handleBackToStore} />}
        {activeView === 'worker-profile' && <WorkerProfilePage worker={selectedWorker} onBack={handleBackToWorkers} />}
      </div>
    </Layout>
  )
}
