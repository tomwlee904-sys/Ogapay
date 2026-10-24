import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useLivePrice } from '../hooks/useLivePrice'
import { useCurrency } from '../context/CurrencyContext'
import { CURRENCY_SYMBOLS, Currency } from '../lib/currency'
import Avatar from '../components/Avatar'
import StarRating from '../components/StarRating'
import { renderBlog } from '../lib/blogMarkdown'
import SellerCard from '../components/SellerCard'
import Money from '../components/Money'
import ItemCover, { itemCategoryLabel } from '../components/ItemCover'

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
  official?: boolean // sold by OgaPay itself (perks)
  priceOnRequest?: boolean
  sampleFiles?: { url: string; name: string; type: string; size: number | null }[]
  sellerInfo?: { lastActiveAt: string | null; challengesWon: number; compliments: number; reviews: number; newCreator: boolean } | null
}

// "Last active 6h ago"
function activeAgo(d: string | null | undefined): string {
  if (!d) return 'a while ago'
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  const days = Math.floor(mins / 1440)
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`
}
const FILE_ICON: Record<string, string> = { image: 'ti-photo', audio: 'ti-music', video: 'ti-movie', pdf: 'ti-file-type-pdf', text: 'ti-file-text' }
const fileSize = (n: number | null) => (!n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { sol } = useLivePrice()
  const { convert } = useCurrency()

  const [product, setProduct] = useState<StoreProductData | null>(null)
  const [seller, setSeller] = useState<SellerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
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
      // A missing listing and a failed request are different: only the server's
      // "not found" says the product is gone; anything else gets Try again
      const msg = String(err?.message || '')
      const network = err instanceof TypeError || /failed to fetch|network|load failed|timed out/i.test(msg)
      setNotFound(!network && /not found|unavailable|doesn't exist|invalid/i.test(msg))
      setError(msg || 'Product not found')
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

  // Phone: once the price card scrolls up out of view, a buy bar stays above the bottom bar
  const priceRef = useRef<HTMLDivElement>(null)
  const [priceGone, setPriceGone] = useState(false)
  useEffect(() => {
    const el = priceRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setPriceGone(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [product?.id, loading])

  // Loading keeps the top bar and dock (the page used to drop them, then pop them back)
  if (loading) {
    return (
      <Layout>
        <style>{SP_CSS}</style>
        <div className="ui-page sp-page" aria-busy="true">
          <div className="sp-top"><span className="ui-sk" style={{ width: 80, height: 18, borderRadius: 8 }} /></div>
          <div className="sp-layout">
            <div className="sp-main">
              <div className="sp-titleblock">
                <div className="ui-sk" style={{ height: 14, width: 160, borderRadius: 6 }} />
                <div className="ui-sk" style={{ height: 34, width: '70%', marginTop: 12, borderRadius: 8 }} />
              </div>
              <div className="ui-sk sp-media" />
            </div>
            <aside className="sp-side"><div className="ui-sk" style={{ height: 360 }} /></aside>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !product) {
    return (
      <Layout>
        <style>{SP_CSS}</style>
        <div className="ui-page sp-page">
          <div className="sp-top"><button className="tap" onClick={() => navigate('/store')}><i className="ti ti-arrow-left" />Store</button></div>
          <div className="ui-empty sp-state">
            <i className={`ti ${notFound ? 'ti-package-off' : 'ti-wifi-off'}`} aria-hidden="true" />
            <h1>{notFound ? "This product isn't listed any more" : "We couldn't load this product"}</h1>
            <p>{notFound ? 'The seller may have removed it. Have a look at what else is in the store.' : 'Check your connection and try again. Nothing has changed on your account.'}</p>
            <div className="ui-actions" style={{ justifyContent: 'center' }}>
              {!notFound && <button className="ui-btn ui-btn-dark" onClick={fetchProduct}><i className="ti ti-refresh" /> Try again</button>}
              <button className={`ui-btn ${notFound ? 'ui-btn-dark' : 'ui-btn-ghost'}`} onClick={() => navigate('/store')}>Browse the store</button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const p = product
  const cur = (p.currency || 'NGN') as string
  const delivery = p.metadata?.delivery || '3 days'
  const revisions = p.metadata?.revisions ?? 3
  const crumb = [itemCategoryLabel(p.category, p.title), p.metadata?.subcategory].filter(Boolean).join(' / ') || 'Store'

  const onRequest = !!p.priceOnRequest
  const contactSeller = () => {
    if (!user) return navigate('/login?redirect=/store/' + p.id)
    navigate('/messages?user=' + encodeURIComponent(p.seller) + '&product=' + p.id)
  }
  const buyLabel = purchasing ? 'Processing…' : purchased ? 'Purchased' : isOwner ? 'Edit listing' : isSoldOut ? 'Sold out' : onRequest ? 'Ask for a price' : 'Buy now'
  const onBuy = () => {
    if (isOwner) return navigate('/my-store')
    if (onRequest) return contactSeller()
    if (!user) return navigate('/login?redirect=/store/' + p.id)
    navigate('/store/pay/' + p.id)
  }

  const stockNote = isSoldOut ? 'Sold out' : p.stock != null && p.stock <= 5 ? `Only ${p.stock} left` : p.stock != null ? 'In stock' : 'Available'
  const PriceCard = (
    <div className="ui-card sp-price" ref={priceRef}>
      <div className="sp-price-head">
        <span className={`sp-pill${isSoldOut ? ' sp-pill-off' : ''}`}><span />{stockNote}</span>
      </div>
      <div className="hc-reward sp-total">
        <span className="ui-label" style={{ margin: 0 }}>{onRequest ? 'Price' : 'Total price'}</span>
        {onRequest
          ? <b style={{ display: 'block', fontSize: 24, fontWeight: 600, marginTop: 6 }}>Price on request</b>
          : <Money amount={Number(p.price || 0)} currency={cur} convert={convert} size={34} exact />}
        {onRequest && <small style={{ display: 'block', color: 'var(--text2)', marginTop: 6, fontSize: 12 }}>Message the seller with what you need. They'll reply with a price.</small>}
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
      {!isOwner && !onRequest && !p.official && (
        <button className="ui-btn ui-btn-ghost ui-btn-lg" style={{ width: '100%', marginTop: 8 }} onClick={contactSeller}>
          <i className="ti ti-message" /> Contact seller
        </button>
      )}
      {!isOwner && !p.official && !onRequest && (
        <p className="sp-protect"><i className="ti ti-shield-check" aria-hidden="true" /> Buyer protection: your payment is held until you confirm you received the order.</p>
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
              ? <><i className="ti ti-star" style={{ color: 'var(--gold)' }} /> {Number(p.rating).toFixed(1)} <span>/ 5 · {p.reviewsCount} reviews</span></>
              : p.sellerInfo?.newCreator !== false ? <span className="sp-new">New creator</span> : <span>No reviews on this product yet</span>}
          </span>
        </span>
      </button>
      {p.sellerInfo && (
        <ul className="sp-trust">
          <li><i className="ti ti-clock" aria-hidden="true" /> Last active {activeAgo(p.sellerInfo.lastActiveAt)}</li>
          <li><i className="ti ti-trophy" aria-hidden="true" /> {p.sellerInfo.challengesWon} {p.sellerInfo.challengesWon === 1 ? 'challenge' : 'challenges'} won</li>
          {p.sellerInfo.compliments > 0 && <li><i className="ti ti-heart" aria-hidden="true" /> {p.sellerInfo.compliments} {p.sellerInfo.compliments === 1 ? 'compliment' : 'compliments'}</li>}
        </ul>
      )}
      {seller?.bio && <p className="sp-bio">{seller.bio}</p>}
      {seller && (
        <div className="sp-stats">
          <div><span>Tasks completed</span><b>{seller.tasksCompleted ?? 0}</b></div>
          {/* A rate needs finished work behind it: "0%" read as a bad seller when there was none yet */}
          <div><span>Success rate</span><b>{(seller.tasksCompleted ?? 0) > 0 && seller.successRate != null ? `${Math.round(seller.successRate)}%` : <span style={{ font: 'inherit', fontSize: 13, letterSpacing: 0, textTransform: 'none', color: 'var(--text2)' }}>No jobs yet</span>}</b></div>
        </div>
      )}
    </div>
  )

  return (
    <Layout>
      <style>{SP_CSS}</style>
      <div className="ui-page sp-page">
        <div className="sp-top">
          <button className="tap" onClick={() => navigate(-1)}><i className="ti ti-arrow-left" />Back</button>
          <button className="tap" onClick={() => navigate('/store')}>All products <i className="ti ti-arrow-up-right" /></button>
        </div>

        <div className="sp-layout">
          <div className="sp-main">
            {/* Title and seller first; on phone the price card follows the picture */}
            <div className="sp-titleblock">
              <span className="ui-eyebrow">{crumb}</span>
              <h1 className="ui-title">{p.title}</h1>
              {p.official ? <span className="sp-seller"><b>From OgaPay</b></span> : (
                <Link to={'/user/' + p.seller} className="sp-seller">
                  <Avatar src={p.sellerAvatar} name={p.seller} size={24} />
                  <b>@{p.seller}</b>
                  {p.reviewsCount > 0
                    ? <span><i className="ti ti-star" aria-hidden="true" /> {Number(p.rating).toFixed(1)} · {p.reviewsCount} review{p.reviewsCount === 1 ? '' : 's'}</span>
                    : <span>New creator</span>}
                </Link>
              )}
            </div>
            <div className="sp-media">
              <ItemCover src={p.image} category={p.category} title={p.title} alt={p.title} />
            </div>

            <section className="ui-card sp-about">
              <h2 className="sp-h2">About this product</h2>
              <div className="sp-desc" dangerouslySetInnerHTML={{ __html: renderBlog(p.description || '') }} />
            </section>

            {p.sampleFiles && p.sampleFiles.length > 0 && (
              <section className="ui-card sp-files">
                <h2 className="sp-h2">Samples <span style={{ color: 'var(--text2)', fontWeight: 400 }}>· {p.sampleFiles.length}</span></h2>
                {p.sampleFiles.map((f, i) => (
                  <div key={i}>
                    {(f.type === 'audio' || f.type === 'video' || f.type === 'image') && (
                      <div className="sp-file-media">
                        {f.type === 'audio' ? <audio controls preload="none" src={f.url} aria-label={f.name} />
                          : f.type === 'video' ? <video controls preload="metadata" src={f.url} aria-label={f.name} />
                          : <img src={f.url} alt={f.name} loading="lazy" />}
                      </div>
                    )}
                    <a className="sp-file" href={f.url} target="_blank" rel="noopener noreferrer nofollow">
                      <i className={`ti ${FILE_ICON[f.type] || 'ti-file'}`} aria-hidden="true" />
                      <span>{f.name}</span>
                      <small>{fileSize(f.size)}</small>
                      <i className="ti ti-external-link" aria-hidden="true" style={{ fontSize: 15 }} />
                    </a>
                  </div>
                ))}
              </section>
            )}

            <section className="ui-card sp-reviews">
              <h2 className="sp-h2">Reviews {p.reviewsCount > 0 && <span style={{ color: 'var(--text2)', fontWeight: 400 }}>· {p.reviewsCount}</span>}</h2>
              {p.reviews.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text2)', margin: '8px 0 0' }}>No reviews yet. Be the first to order.</p>
              ) : p.reviews.map(r => (
                <div key={r.id} className="sp-review">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar src={r.avatarUrl} name={r.username} size={28} />
                    <button onClick={() => navigate('/user/' + r.username)} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--text)', fontFamily: 'inherit' }}>{r.username}</button>
                    <span style={{ marginLeft: 'auto' }}><StarRating rating={r.rating} size={11} /></span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{timeAgo(r.createdAt)}</span>
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
                  <button className="tap" onClick={() => navigate('/login?redirect=/store/' + id)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Log in</button> to leave a review.
                </p>
              )}
            </section>

            {CreatorCard}
          </div>

          {/* Only the price card stays in view on wider screens */}
          <aside className="sp-side">{PriceCard}</aside>
        </div>

        {priceGone && (
          <div className="ui-actionbar sp-buybar">
            <div className="ui-actionbar-text">
              {onRequest ? <b>Price on request</b> : <b><Money amount={Number(p.price || 0)} currency={cur} convert={convert} size={17} exact /></b>}
              {isSoldOut ? 'Sold out' : `Delivery ${delivery}`}
            </div>
            <button className="ui-btn ui-btn-dark ui-btn-lg" onClick={onBuy} disabled={purchasing || purchased || (!!isSoldOut && !isOwner)}>{buyLabel}</button>
          </div>
        )}
      </div>
    </Layout>
  )
}

// Product page styles (one copy, used by the loading, error and product views)
const SP_CSS = `
  .sp-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
  .sp-top button{display:inline-flex;align-items:center;gap:6px;background:none;border:0;cursor:pointer;font:500 13px var(--font);color:var(--text2);padding:0;min-height:44px}
  .sp-top button:hover{color:var(--text)}
  .sp-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;align-items:start}
  .sp-main{display:flex;flex-direction:column;gap:14px;min-width:0}
  .sp-side{position:sticky;top:calc(var(--nav-h) + 16px)}
  .sp-titleblock .ui-title{overflow-wrap:anywhere}
  .sp-seller{display:inline-flex;align-items:center;gap:8px;min-height:44px;margin-top:6px;font-size:13px;color:var(--text2);text-decoration:none;max-width:100%}
  .sp-seller b{color:var(--text);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sp-seller i{color:var(--gold)}
  .sp-media{aspect-ratio:16/10;border-radius:var(--r-card);border:1px solid var(--border);background:var(--card2);overflow:hidden}
  .sp-media .o-cover{height:100%;aspect-ratio:auto;border-radius:0}
  .sp-media .o-cover-tile{width:88px;height:88px;border-radius:24px;font-size:38px}
  .sp-about,.sp-files,.sp-reviews{padding:22px}
  .sp-h2{font-size:17px;font-weight:600;margin:0 0 12px;letter-spacing:-.02em;color:var(--text)}
  .sp-price{padding:16px}
  .sp-price-head{display:flex;justify-content:flex-end;align-items:center;margin-bottom:12px}
  .sp-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:var(--r-pill);background:color-mix(in srgb,var(--green) 14%,transparent);color:var(--green);font-size:12px;font-weight:600}
  .sp-pill span{width:6px;height:6px;border-radius:50%;background:currentColor}
  .sp-pill-off{background:color-mix(in srgb,var(--red) 12%,transparent);color:var(--red)}
  .sp-total{padding:16px}
  .sp-facts{display:flex;flex-direction:column;gap:12px;padding:16px 4px;margin-bottom:14px;border-bottom:1px solid var(--border)}
  .sp-facts div{display:flex;justify-content:space-between;align-items:center;font-size:13px}
  .sp-facts span{display:inline-flex;align-items:center;gap:8px;color:var(--text2)}
  .sp-facts b{font-weight:600}
  .sp-protect{display:flex;gap:8px;margin:12px 2px 0;font-size:12.5px;line-height:1.5;color:var(--text2)}.sp-protect i{font-size:15px;color:var(--green);flex-shrink:0;margin-top:1px}
  .sp-note{display:flex;align-items:center;gap:6px;font-size:13px;padding:10px 12px;border-radius:10px;margin-bottom:10px}
  .sp-note-err{background:color-mix(in srgb,var(--red) 10%,transparent);color:var(--red)}
  .sp-note-ok{background:color-mix(in srgb,var(--green) 12%,transparent);color:var(--green)}
  .sp-creator{padding:16px 22px}
  .sp-creator-row{display:flex;align-items:center;gap:12px;width:100%;background:none;border:0;padding:6px 0;min-height:44px;cursor:pointer;text-align:left;font-family:inherit;color:var(--text)}
  .sp-creator-row b{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600}
  .sp-creator-row b i{font-size:13px;color:var(--text3)}
  .sp-rating{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text)}
  .sp-rating span{color:var(--text2)}
  .sp-bio{font-size:13px;line-height:1.6;color:var(--text2);margin:10px 0 0}
  .sp-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
  .sp-stats div{border:1px solid var(--border);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}
  .sp-stats span{font:400 11px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--text2)}
  .sp-stats b{font-size:16px;font-weight:600}
  .sp-review{border-top:1px solid var(--border);padding:14px 0}
  .sp-review:first-of-type{border-top:0}
  .sp-trust{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--text2)}
  .sp-trust li{display:flex;align-items:center;gap:8px}.sp-trust i{font-size:15px;color:var(--text3)}
  .sp-new{display:inline-flex;padding:2px 8px;border-radius:999px;background:var(--card2);border:1px solid var(--border);color:var(--text)!important;font-weight:500}
  .sp-file{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--border);color:var(--text);text-decoration:none;min-height:44px}
  .sp-file:first-of-type{border-top:0}
  .sp-file i{font-size:20px;color:var(--text2);flex-shrink:0}
  .sp-file span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
  .sp-file small{color:var(--text3);font-size:12px}
  .sp-file-media{margin:6px 0 10px}
  .sp-file-media audio,.sp-file-media video{width:100%;border-radius:10px;max-height:320px}
  .sp-file-media img{max-width:100%;border-radius:10px;display:block}
  .sp-desc{font-size:14px;line-height:1.7;color:var(--text2);overflow-wrap:anywhere;max-width:72ch}
  .sp-desc table{border-collapse:collapse;width:100%;display:block;overflow-x:auto}
  .sp-desc td,.sp-desc th{border:1px solid var(--border);padding:6px 8px}
  .sp-desc pre{overflow-x:auto;background:var(--card2);padding:10px;border-radius:8px}
  .sp-desc img{max-width:100%}
  .sp-state{max-width:560px}
  .sp-state > i{display:block;font-size:32px;color:var(--text3);margin-bottom:10px}
  .sp-state h1{margin:0 0 6px;font-size:var(--fs-h2);font-weight:600;color:var(--text)}
  .sp-state p{margin:0 0 18px}
  .sp-buybar{margin-top:16px}
  .sp-buybar .ui-btn{flex-shrink:0}
  /* Tablet: picture and details beside a 300px price card */
  @media(max-width:1023.98px){.sp-layout{grid-template-columns:minmax(0,1fr) 300px;gap:16px}}
  /* Phone: one column; title, picture, price card, then the rest, each card once */
  @media(max-width:767.98px){
    .sp-layout{display:flex;flex-direction:column;align-items:stretch;gap:14px}
    .sp-main{display:contents}
    .sp-titleblock{order:-3}
    .sp-media{order:-2}
    .sp-side{order:-1;position:static}
    .sp-about,.sp-files,.sp-reviews,.sp-creator{padding:18px}
  }
  @media(min-width:768px){.sp-buybar{display:none}}
`
