import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { apiRequest, API_BASE, getAccessToken } from '../lib/api'
import { useLivePrice } from '../hooks/useLivePrice'
import Avatar from '../components/Avatar'
import StarRating from '../components/StarRating'
import DescriptionRenderer from '../components/DescriptionRenderer'
import SellerCard from '../components/SellerCard'

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
  currency: string
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

const CURRENCY_SYMBOLS: Record<string, string> = { NGN: 'NGN ', SOL: '\u25CE', USDC: '$' }

function formatPrice(price: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || ''
  if (currency === 'NGN') return `${sym}${Math.round(price).toLocaleString('en-US')}`
  return `${sym}${price.toFixed(price < 1 ? 4 : 2)}${currency === 'SOL' ? ' SOL' : ''}`
}

function formatAlt(price: number, currency: string, solRate: number): string {
  if (currency === 'SOL') return `\u2248 ${formatPrice(price * solRate, 'NGN')}`
  return `\u2248 ${formatPrice(price / solRate, 'SOL')} SOL`
}

export default function StoreProduct() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { sol } = useLivePrice()

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
      const token = getAccessToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = 'Bearer ' + token
      const res = await fetch(API_BASE + '/users/' + username, { headers })
      const json = await res.json()
      const data = json?.data || json
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
    } catch {}
  }, [])

  useEffect(() => { fetchProduct() }, [fetchProduct])
  useEffect(() => {
    if (product?.seller) fetchSeller(product.seller)
  }, [product?.seller, fetchSeller])

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
    } catch {} finally { setSubmittingReview(false) }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 0' }}>
          <style>{'@keyframes sk-pulse{0%,100%{opacity:1}50%{opacity:.35}}.sk{background:var(--border);border-radius:8px;animation:sk-pulse 1.4s ease-in-out infinite}'}</style>
          <div className="sk" style={{ height: 220, borderRadius: 14, marginBottom: 20 }} />
          <div className="sk" style={{ height: 28, width: '60%', marginBottom: 14 }} />
          <div className="sk" style={{ height: 16, width: '40%', marginBottom: 24 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[1, 2, 3].map(i => <div key={i} className="sk" style={{ height: 28, width: 100, borderRadius: 20 }} />)}
          </div>
          <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
            <div className="sk" style={{ width: 36, height: 36, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="sk" style={{ height: 16, width: '30%', marginBottom: 6 }} />
              <div className="sk" style={{ height: 14, width: '50%' }} />
            </div>
          </div>
          <div className="sk" style={{ height: 200, marginBottom: 20 }} />
        </div>
      </Layout>
    )
  }

  if (error || !product) {
    return (
      <Layout>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 36, color: 'var(--text3)', display: 'block', marginBottom: 12 }} />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>{error || 'Product not found'}</h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>This listing doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/store')} style={{ background: '#191C6B', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Back to Store
          </button>
        </div>
      </Layout>
    )
  }

  const p = product

  return (
    <Layout>
      <style>{'@keyframes sp-spin{to{transform:rotate(360deg)}}@media(min-width:900px){.sp-layout{display:grid;grid-template-columns:1fr 360px;gap:32px;align-items:start}}.sp-sticky{position:sticky;top:calc(var(--nav-h,64px) + 20px)}.sp-pricing-mobile{display:block}@media(min-width:900px){.sp-pricing-mobile{display:none}}.sp-desktop-pricing{display:none}@media(min-width:900px){.sp-desktop-pricing{display:block}}'}</style>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 0 40px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text3)', marginBottom: 16, flexWrap: 'wrap' }}>
          <span onClick={() => navigate('/store')} style={{ cursor: 'pointer', color: 'var(--text2)' }}>Store</span>
          <i className="ti ti-chevron-right" style={{ fontSize: 10 }} />
          <span onClick={() => navigate('/store?category=' + p.category)} style={{ cursor: 'pointer', color: 'var(--text2)' }}>{p.category || 'Uncategorized'}</span>
          <i className="ti ti-chevron-right" style={{ fontSize: 10 }} />
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{p.title}</span>
        </div>

        {/* Hero Banner */}
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 16, height: 220 }}>
          {p.image ? (
            <img src={p.image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)', color: 'var(--text3)', fontSize: 32 }}>
              <i className="ti ti-box" />
            </div>
          )}
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
            {isSoldOut ? (
              <span style={{ background: '#450a0a', color: '#ef4444', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>SOLD OUT</span>
            ) : (
              <span style={{ background: '#052e16', color: '#22c55e', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="sp-layout">
          {/* Left Column */}
          <div>
            {/* Title */}
            <h1 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px' }}>{p.title}</h1>

            {/* Badge row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-clock" style={{ fontSize: 12 }} /> Delivery: {p.metadata?.delivery || '3 days'}
              </span>
              <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-refresh" style={{ fontSize: 12 }} /> {p.metadata?.revisions || 3} Revisions
              </span>
              <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-folder" style={{ fontSize: 12 }} /> {p.category}{p.metadata?.subcategory ? ' / ' + p.metadata.subcategory : ''}
              </span>
            </div>

            {/* Seller row */}
            <div onClick={() => navigate('/user/' + p.seller)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 20, border: '1px solid transparent', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}>
              <Avatar src={p.sellerAvatar} name={p.seller} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{p.seller}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{seller?.bio || 'Store Seller'}</div>
              </div>
              <StarRating rating={p.rating} size={12} />
              <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>({p.reviewsCount})</span>
              <i className="ti ti-chevron-right" style={{ fontSize: 14, color: 'var(--text3)' }} />
            </div>

            {/* Pricing card - mobile */}
            <div className="sp-pricing-mobile" style={{ marginBottom: 20 }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
                <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 24, fontWeight: 800, color: '#191C6B' }}>{formatPrice(p.price, p.currency)}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{formatAlt(p.price, p.currency, sol.ngn)}</div>
                {purchaseError && <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 10, marginTop: 12, color: '#ef4444', fontSize: 12 }}><i className="ti ti-alert-circle" style={{ marginRight: 4 }} />{purchaseError}</div>}
                {purchased && <div style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: 10, marginTop: 12, color: '#22c55e', fontSize: 12, textAlign: 'center' }}><i className="ti ti-circle-check" style={{ marginRight: 4 }} />Purchase successful!</div>}
                <button onClick={isOwner ? () => navigate('/my-store') : handlePurchase} disabled={purchasing || !!purchased || !!isSoldOut}
                  style={{ width: '100%', height: 46, border: 'none', borderRadius: 12, background: isOwner ? 'var(--bg2)' : '#191C6B', color: isOwner ? 'var(--text)' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (purchasing || purchased || !!isSoldOut) ? 0.6 : 1 }}>
                  {purchasing ? <><i className="ti ti-loader" style={{ fontSize: 16, animation: 'sp-spin 1s linear infinite' }} /> Processing...</>
                  : purchased ? <><i className="ti ti-circle-check" style={{ fontSize: 16 }} /> Purchased</>
                  : isOwner ? <><i className="ti ti-edit" style={{ fontSize: 16 }} /> Edit Listing</>
                  : isSoldOut ? <><i className="ti ti-x-circle" style={{ fontSize: 16 }} /> Sold Out</>
                  : <><i className="ti ti-shopping-cart" style={{ fontSize: 16 }} /> Order Now</>}
                </button>
                <button onClick={() => navigate('/messages?user=' + p.seller)} style={{ width: '100%', height: 44, border: '1px solid var(--border)', borderRadius: 12, background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <i className="ti ti-message" style={{ fontSize: 15 }} /> Message Seller
                </button>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: 10 }}>DESCRIPTION</div>
              <DescriptionRenderer text={p.description} />
            </div>

            {/* Seller Profile Card */}
            {seller && (
              <div style={{ marginBottom: 28 }}>
                <SellerCard seller={seller} />
              </div>
            )}

            {/* Reviews */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.06em', marginBottom: 14 }}>REVIEWS</div>

              {p.reviews.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 20 }}>
                  No reviews yet. Be the first to order.
                </p>
              ) : (
                p.reviews.map(r => (
                  <div key={r.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar src={r.avatarUrl} name={r.username} size={32} />
                      <span onClick={() => navigate('/user/' + r.username)} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>{r.username}</span>
                      <span style={{ marginLeft: 'auto' }}><StarRating rating={r.rating} size={11} /></span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{timeAgo(r.createdAt)}</span>
                    </div>
                    {r.comment && <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 10 }}>{r.comment}</p>}
                  </div>
                ))
              )}

              {/* Review form */}
              {!user ? (
                <div style={{ textAlign: 'center', padding: 16, fontSize: 13, color: 'var(--text3)' }}>
                  <a href={'/login?redirect=/store/' + id} style={{ color: '#191C6B', fontWeight: 600 }}>Login</a> to leave a review.
                </div>
              ) : purchased ? (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginTop: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Write a Review</div>
                  <StarRating rating={reviewRating} size={24} interactive onChange={setReviewRating} />
                  <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share your experience\u2026" style={{ width: '100%', minHeight: 64, padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginTop: 10, outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={handleSubmitReview} disabled={submittingReview || reviewRating < 1} style={{ marginTop: 10, background: '#191C6B', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (submittingReview || reviewRating < 1) ? 0.5 : 1 }}>
                    {submittingReview ? 'Submitting\u2026' : 'Submit Review'}
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 16, fontSize: 13, color: 'var(--text3)' }}>
                  Purchase this service to leave a review.
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Pricing card (desktop sticky) */}
          <div className="sp-desktop-pricing">
            <div className="sp-sticky">
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 22 }}>
                <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: 24, fontWeight: 800, color: '#191C6B' }}>{formatPrice(p.price, p.currency)}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{formatAlt(p.price, p.currency, sol.ngn)}</div>
                {purchaseError && <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 10, marginTop: 12, color: '#ef4444', fontSize: 12 }}><i className="ti ti-alert-circle" style={{ marginRight: 4 }} />{purchaseError}</div>}
                {purchased && <div style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: 10, marginTop: 12, color: '#22c55e', fontSize: 12, textAlign: 'center' }}><i className="ti ti-circle-check" style={{ marginRight: 4 }} />Purchase successful!</div>}
                <button onClick={isOwner ? () => navigate('/my-store') : handlePurchase} disabled={purchasing || !!purchased || !!isSoldOut}
                  style={{ width: '100%', height: 46, border: 'none', borderRadius: 12, background: isOwner ? 'var(--bg2)' : '#191C6B', color: isOwner ? 'var(--text)' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (purchasing || purchased || !!isSoldOut) ? 0.6 : 1 }}>
                  {purchasing ? <><i className="ti ti-loader" style={{ fontSize: 16, animation: 'sp-spin 1s linear infinite' }} /> Processing...</>
                  : purchased ? <><i className="ti ti-circle-check" style={{ fontSize: 16 }} /> Purchased</>
                  : isOwner ? <><i className="ti ti-edit" style={{ fontSize: 16 }} /> Edit Listing</>
                  : isSoldOut ? <><i className="ti ti-x-circle" style={{ fontSize: 16 }} /> Sold Out</>
                  : <><i className="ti ti-shopping-cart" style={{ fontSize: 16 }} /> Order Now</>}
                </button>
                <button onClick={() => navigate('/messages?user=' + p.seller)} style={{ width: '100%', height: 44, border: '1px solid var(--border)', borderRadius: 12, background: 'transparent', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <i className="ti ti-message" style={{ fontSize: 15 }} /> Message Seller
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
