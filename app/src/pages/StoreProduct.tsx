import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useLivePrice } from '../hooks/useLivePrice'
import { useCurrency } from '../context/CurrencyContext'
import { CURRENCY_SYMBOLS, Currency } from '../lib/currency'
import Avatar from '../components/Avatar'
import StarRating from '../components/StarRating'
import DescriptionRenderer from '../components/DescriptionRenderer'
import SellerCard from '../components/SellerCard'
import { SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader";

interface ReviewItem {
  id: string
  userId: string
  username: string
  avatarUrl: string | null
  rating: number
  comment: string | null
  createdAt: string
}

interface StoreProductData {
  id: string
  title: string
  name: string
  description: string
  price: number
  currency: Currency
  seller: string
  sellerId: string
  sellerAvatar: string | null
  rating: number
  reviewsCount: number
  reviews: ReviewItem[]
  image: string
  category: string
  stock: number | null
  isActive: boolean
  createdAt: string
  metadata?: Record<string, any>
}

interface SellerProfile {
  id: string
  username: string
  firstName?: string
  avatarUrl?: string | null
  bio?: string | null
  rating?: number
  reviews?: number
  tasksCompleted?: number
  successRate?: number
  productCount?: number
  level?: string
  skills?: string[]
  memberSince?: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function formatPrice(price: number, currency: Currency): string {
  const sym = CURRENCY_SYMBOLS[currency] || ''
  if (currency === 'NGN') return `${sym}${Math.round(price).toLocaleString('en-US')}`
  return `${sym}${price.toFixed(price < 1 ? 4 : 2)}`
}

function formatAlt(price: number, currency: string, solRate: number): string {
  if (currency === 'SOL') return `\u2248 ${formatPrice(price * solRate, 'NGN')}`
  return `\u2248 ${formatPrice(price / solRate, 'SOL')}`
}

// ── Inject skeleton styles on mount ──
export default function StoreProduct() {
  useEffect(() => { injectSkeletonStyles(); }, []);
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { sol } = useLivePrice()
  const { convert } = useCurrency()

  const [product, setProduct] = useState<StoreProductData | null>(null)
  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchased, setPurchased] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  const isOwner = user && product && user.id === product.sellerId
  const isSoldOut = product && product.stock !== null && product.stock <= 0

  const fetchProduct = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiRequest<StoreProductData>('/store/' + id, { method: 'GET', auth: false })
      setProduct(data)
    } catch (err: any) {
      setError(err?.message || 'Product not found')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchSeller = useCallback(async (username: string) => {
    try {
      const data = await apiRequest<any>('/users/' + username, { auth: false })
      if (data?.id) {
        setSeller({
          id: data.id,
          username: data.username,
          firstName: data.firstName,
          avatarUrl: data.avatarUrl,
          bio: data.workerProfile?.bio || null,
          rating: data.workerProfile?.avgRating,
          reviews: data.workerProfile?.totalRatings,
          tasksCompleted: data.workerProfile?.tasksCompleted,
          successRate: data.workerProfile?.successRate,
          level: data.workerProfile?.level,
          skills: data.workerProfile?.skills,
          memberSince: data.createdAt,
        })
      }
    } catch (e: any) { console.error(e) }
  }, [])

  useEffect(() => { fetchProduct() }, [fetchProduct])
  useEffect(() => {
    if (product?.seller) fetchSeller(product.seller)
  }, [product?.seller, fetchSeller])

  useEffect(() => {
    if (!product) return
    document.title = `${product.title} | OgaPay Store`
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', (product.description || '').slice(0, 160))
  }, [product])

  const handlePurchase = async () => {
    if (!user) { navigate('/login?redirect=/store/' + id); return }
    if (!product) return
    setPurchasing(true)
    setPurchaseError(null)
    try {
      await apiRequest('/store/' + product.id + '/purchase', { method: 'POST' })
      setPurchased(true)
    } catch (err: any) {
      setPurchaseError(err?.message || 'Purchase failed')
    } finally { setPurchasing(false) }
  }

  const handleSubmitReview = async () => {
    if (reviewRating < 1 || !product) return
    setSubmittingReview(true)
    try {
      await apiRequest('/store/' + product.id + '/reviews', {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      })
      setReviewRating(0)
      setReviewComment('')
      fetchProduct()
    } catch (e: any) { console.error(e) } finally { setSubmittingReview(false) }
  }

  if (loading) {
    return <SkeletonPage />
  }

  if (error || !product) {
    return (
      <Layout>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 36, color: 'var(--text3)', display: 'block', marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>{error || 'Product not found'}</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>This listing doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/store')} style={{ background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Back to Store
          </button>
        </div>
      </Layout>
    )
  }

  const p = product
  const cur = (p.currency || 'NGN') as string
  const money = (n: number) => Math.round(n).toLocaleString('en-US')
  const priceMain = cur === 'NGN' ? `₦${money(p.price)}` : cur === 'SOL' ? `${p.price} SOL` : `$${Number(p.price).toFixed(2)}`
  const priceAlt = cur === 'NGN'
    ? `≈ $${convert(p.price, 'NGN', 'USDC').toFixed(2)} USD`
    : `≈ ₦${money(convert(p.price, cur as any, 'NGN'))}`
  const delivery = p.metadata?.delivery || '3 days'
  const revisions = p.metadata?.revisions ?? 3
  const crumb = [p.category, p.metadata?.subcategory].filter(Boolean).join(' / ') || 'Store'

  const buyLabel = purchasing ? 'Processing…' : purchased ? 'Purchased' : isOwner ? 'Edit listing' : isSoldOut ? 'Sold out' : 'Buy now'
  const onBuy = () => {
    if (isOwner) return navigate('/my-store')
    if (!user) return navigate('/login?redirect=/store/' + p.id)
    navigate('/store/pay/' + p.id)
  }

  const PriceCard = (
    <div className="ui-card sp-price">
      <div className="sp-price-head">
        <span>Your next project</span>
        {isSoldOut ? <span className="sp-pill sp-pill-off">Sold out</span> : <span className="sp-pill"><span />Active</span>}
      </div>
      <div className="hc-reward sp-total">
        <span className="ui-label" style={{ margin: 0 }}>Total price</span>
        <div className="hc-amt"><strong>{priceMain}</strong><span>{cur}</span></div>
        <span className="hc-alt">{priceAlt} <span style={{ fontFamily: 'inherit' }}>estimated</span></span>
      </div>
      <div className="sp-facts">
        <div><span><i className="ti ti-clock" />Delivery</span><b>{delivery}</b></div>
        <div><span><i className="ti ti-refresh" />Revisions</span><b>{revisions}</b></div>
      </div>
      {purchaseError && <div className="sp-note sp-note-err"><i className="ti ti-alert-circle" />{purchaseError}</div>}
      {purchased && <div className="sp-note sp-note-ok"><i className="ti ti-circle-check" />Purchase successful</div>}
      <button className="ui-btn ui-btn-dark ui-btn-lg" style={{ width: '100%' }} onClick={onBuy} disabled={purchasing || purchased || (!!isSoldOut && !isOwner)}>
        {buyLabel} {!purchased && !isSoldOut && <i className={isOwner ? 'ti ti-edit' : 'ti ti-arrow-right'} />}
      </button>
      {!isOwner && (
        <button className="ui-btn ui-btn-ghost ui-btn-lg" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate('/messages?user=' + p.seller)}>
          <i className="ti ti-message" /> Contact seller
        </button>
      )}
    </div>
  )

  const CreatorCard = (
    <div className="ui-card sp-creator">
      <span className="ui-label">Meet the creator</span>
      <button className="sp-creator-row" onClick={() => navigate('/user/' + p.seller)}>
        <Avatar src={p.sellerAvatar} name={p.seller} size={40} />
        <span style={{ minWidth: 0 }}>
          <b>{p.seller} <i className="ti ti-arrow-up-right" /></b>
          <span className="sp-rating">
            {p.reviewsCount > 0
              ? <><i className="ti ti-star-filled" style={{ color: '#bd8517' }} /> {Number(p.rating).toFixed(1)} <span>/ 5 · {p.reviewsCount} reviews</span></>
              : <span>New creator</span>}
          </span>
        </span>
      </button>
      {seller?.bio && <p className="sp-bio">{seller.bio}</p>}
      {seller && (
        <div className="sp-stats">
          <div><span>Tasks completed</span><b>{seller.tasksCompleted ?? 0}</b></div>
          <div><span>Success rate</span><b>{seller.successRate != null ? `${Math.round(seller.successRate)}%` : '—'}</b></div>
        </div>
      )}
    </div>
  )

  return (
    <Layout>
      <style>{`
        .sp-page{padding-top:24px}
        .sp-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
        .sp-top button{display:inline-flex;align-items:center;gap:6px;background:none;border:0;cursor:pointer;font:500 12px 'Geist',system-ui,sans-serif;color:var(--text2);padding:4px 0}
        .sp-top button:hover{color:var(--text)}
        .sp-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start;margin-top:18px}
        .sp-side{position:sticky;top:calc(var(--nav-h,64px) + 18px);display:flex;flex-direction:column;gap:14px}
        .sp-media{aspect-ratio:16/10;border-radius:20px;border:1px solid var(--border);background:var(--card2);overflow:hidden;display:grid;place-items:center;color:var(--text3);font-size:40px}
        .sp-media img{width:100%;height:100%;object-fit:cover;display:block}
        .sp-about{padding:22px;margin-top:14px}
        .sp-about h2{font-size:15px;font-weight:600;margin:0 0 12px;letter-spacing:-.01em}
        .sp-price{padding:16px}
        .sp-price-head{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:500;margin-bottom:12px}
        .sp-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:6px;background:#edf8f0;border:1px solid #c1dfcb;color:#17805c;font-size:10px;font-weight:500}
        .sp-pill span{width:5px;height:5px;border-radius:50%;background:#17805c}
        .sp-pill-off{background:rgba(220,38,38,.08);border-color:rgba(220,38,38,.25);color:#dc2626}
        .sp-total{padding:16px}
        .sp-total .hc-amt strong{font-size:34px}
        .sp-facts{display:flex;flex-direction:column;gap:12px;padding:16px 4px;margin-bottom:14px;border-bottom:1px solid var(--border)}
        .sp-facts div{display:flex;justify-content:space-between;align-items:center;font-size:12px}
        .sp-facts span{display:inline-flex;align-items:center;gap:8px;color:var(--text2)}
        .sp-facts b{font-weight:600}
        .sp-note{display:flex;align-items:center;gap:6px;font-size:12px;padding:10px 12px;border-radius:10px;margin-bottom:10px}
        .sp-note-err{background:rgba(220,38,38,.08);color:#dc2626}
        .sp-note-ok{background:rgba(var(--green-rgb),.1);color:var(--green)}
        .sp-creator{padding:16px}
        .sp-creator-row{display:flex;align-items:center;gap:12px;width:100%;background:none;border:0;padding:6px 0;cursor:pointer;text-align:left;font-family:inherit;color:var(--text)}
        .sp-creator-row b{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600}
        .sp-creator-row b i{font-size:13px;color:var(--text3)}
        .sp-rating{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text)}
        .sp-rating span{color:var(--text2)}
        .sp-bio{font-size:12.5px;line-height:1.6;color:var(--text2);margin:10px 0 0}
        .sp-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
        .sp-stats div{border:1px solid var(--border);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}
        .sp-stats span{font:400 9px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--text2)}
        .sp-stats b{font-size:16px;font-weight:600}
        .sp-reviews{padding:22px;margin-top:14px}
        .sp-review{border-top:1px solid var(--border);padding:14px 0}
        .sp-review:first-of-type{border-top:0}
        .sp-mobile-only{display:none}
        @media(max-width:900px){
          .sp-layout{grid-template-columns:1fr}
          .sp-side{position:static}
          .sp-desktop-only{display:none}
          .sp-mobile-only{display:flex;flex-direction:column;gap:14px;margin-top:14px}
        }
      `}</style>
      <div className="ui-page sp-page">
        <div className="sp-top">
          <button onClick={() => navigate(-1)}><i className="ti ti-arrow-left" />Back</button>
          <button onClick={() => navigate('/store')}>All products <i className="ti ti-arrow-up-right" /></button>
        </div>
        <span className="ui-eyebrow">{crumb}</span>
        <h1 className="ui-title">{p.title}</h1>

        <div className="sp-layout">
          <div>
            <div className="sp-media">
              {p.image ? <img src={p.image} alt={p.title} /> : <i className="ti ti-photo" />}
            </div>

            <div className="sp-mobile-only">{PriceCard}{CreatorCard}</div>

            <section className="ui-card sp-about">
              <h2>About this product</h2>
              <DescriptionRenderer text={p.description} />
            </section>

            <section className="ui-card sp-reviews">
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Reviews {p.reviewsCount > 0 && <span style={{ color: 'var(--text2)', fontWeight: 400 }}>· {p.reviewsCount}</span>}</h2>
              {p.reviews.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text2)', margin: '8px 0 0' }}>No reviews yet. Be the first to order.</p>
              ) : p.reviews.map(r => (
                <div key={r.id} className="sp-review">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar src={r.avatarUrl} name={r.username} size={28} />
                    <button onClick={() => navigate('/user/' + r.username)} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--text)', fontFamily: 'inherit' }}>{r.username}</button>
                    <span style={{ marginLeft: 'auto' }}><StarRating rating={r.rating} size={11} /></span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{timeAgo(r.createdAt)}</span>
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: 'var(--text2)', margin: '8px 0 0', lineHeight: 1.6 }}>{r.comment}</p>}
                </div>
              ))}

              {user && purchased && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Write a review</div>
                  <StarRating rating={reviewRating} size={22} interactive onChange={setReviewRating} />
                  <textarea className="ui-input" value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share your experience…"
                    style={{ height: 80, padding: '10px 12px', marginTop: 10, resize: 'vertical' }} />
                  <button className="ui-btn ui-btn-dark" style={{ marginTop: 10 }} onClick={handleSubmitReview} disabled={submittingReview || reviewRating < 1}>
                    {submittingReview ? 'Submitting…' : 'Submit review'}
                  </button>
                </div>
              )}
              {!user && (
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: '12px 0 0' }}>
                  <button onClick={() => navigate('/login?redirect=/store/' + id)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Log in</button> to leave a review.
                </p>
              )}
            </section>
          </div>

          <aside className="sp-side sp-desktop-only">
            {PriceCard}
            {CreatorCard}
          </aside>
        </div>
      </div>
    </Layout>
  )
}
