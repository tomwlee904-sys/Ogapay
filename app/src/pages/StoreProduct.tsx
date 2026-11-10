import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
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
import { sized } from '../lib/img'
import { ModerateBar, ReportProductSheet } from '../components/StoreModeration'
import { useToast } from '../context/ToastContext'
import { storeCategoryLink } from '../lib/storeCategories'

interface ReviewItem {
  id: string
  userId: string
  username: string
  avatarUrl: string | null
  rating: number
  comment: string | null
  createdAt: string
  // The seller's answer (2026-11-10)
  sellerReply?: string | null
  sellerRepliedAt?: string | null
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
  categoryGroup?: string // the listed category it shows under ("Other" for an older unlisted one)
  stock: number | null
  isActive: boolean
  createdAt: string
  metadata?: Record<string, any>
  official?: boolean // sold by OgaPay itself (perks)
  createdVia?: string | null // 'API': listed by an agent with an API key (2026-11-10)
  priceOnRequest?: boolean
  sampleFiles?: { url: string; name: string; type: string; size: number | null }[]
  // The seller card. bio and the job numbers come with it (2026-11-10: they took a
  // second /users call); a private profile leaves them out.
  sellerInfo?: {
    lastActiveAt: string | null; challengesWon: number; compliments: number; reviews: number; newCreator: boolean
    bio?: string | null; tasksCompleted?: number; successRate?: number | null; avgRating?: number; totalRatings?: number; level?: string | null; memberSince?: string
  } | null
  canReview?: boolean // the signed-in member bought it and the order is finished (2026-11-08)
  myReview?: { rating: number; comment: string | null } | null // their review, to change it
  // Seller and staff only (2026-11-10): why buyers can't see it, and OgaPay's reason
  hiddenBecause?: 'removed' | 'private' | 'review' | 'draft' | null
  delistReason?: string | null
  // Admins and store moderators: open reports and the removal
  moderation?: { delistedAt: string | null; delistReason: string | null; openReports: number } | null
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

// What staff are told when buyers can't see a product (2026-11-10)
const HIDDEN_STAFF: Record<string, string> = {
  removed: "Removed by OgaPay. Buyers can't see it.",
  private: "The seller's profile is private, so buyers can't see it.",
  review: "The seller's account is being checked, so buyers can't see it.",
  draft: "The seller hid this. Buyers can't see it.",
}

// The product page's styles, shared by the page and its loading skeleton
const SP_CSS = `
        .sp-page{padding-top:24px}
        .sp-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
        .sp-top button{display:inline-flex;align-items:center;gap:6px;background:none;border:0;cursor:pointer;font:500 13px var(--font);color:var(--text2);padding:4px 0;min-height:36px}
        .sp-top button:hover{color:var(--text)}
        .sp-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start;margin-top:18px}
        .sp-side{position:sticky;top:calc(var(--nav-h,64px) + 18px);display:flex;flex-direction:column;gap:14px}
        .sp-media{aspect-ratio:16/10;border-radius:var(--r-card);border:1px solid var(--border);background:var(--card2);overflow:hidden}
        .sp-media .o-cover{height:100%;aspect-ratio:auto;border-radius:0}
        .sp-media .o-cover-tile{width:88px;height:88px;border-radius:24px;font-size:38px}
        .sp-about{padding:22px;margin-top:14px}
        .sp-about h2{font-size:var(--fs-h2);font-weight:600;margin:0 0 12px;letter-spacing:-.02em}
        .sp-price{padding:16px}
        .sp-price-head{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:500;margin-bottom:12px}
        .sp-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:var(--r-xs);background:#edf8f0;border:1px solid #c1dfcb;color:#17805c;font-size:11px;font-weight:500}
        [data-theme="dark"] .sp-pill{background:#0f1e17;border-color:#1f4433;color:#6ee7b7}
        .sp-pill span{width:5px;height:5px;border-radius:50%;background:#17805c}
        .sp-pill-off{background:rgba(220,38,38,.08);border-color:rgba(220,38,38,.25);color:#dc2626}
        .sp-total{padding:16px}
                .sp-facts{display:flex;flex-direction:column;gap:12px;padding:16px 4px;margin-bottom:14px;border-bottom:1px solid var(--border)}
        .sp-facts div{display:flex;justify-content:space-between;align-items:center;font-size:13px}
        .sp-facts span{display:inline-flex;align-items:center;gap:8px;color:var(--text2)}
        .sp-facts b{font-weight:600}
        .sp-protect{display:flex;gap:8px;margin:12px 2px 0;font-size:12px;line-height:1.5;color:var(--text2)}.sp-protect i{font-size:15px;color:var(--green);flex-shrink:0;margin-top:1px}
        .sp-report{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-height:40px;margin-top:8px;background:none;border:0;cursor:pointer;font:500 12px var(--font);color:var(--text2)}
        .sp-report:hover{color:var(--text)}
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
        .sp-stats span{font:400 11px var(--font-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--text2)}
        .sp-stats b{font-size:16px;font-weight:600}
        .sp-reviews{padding:22px;margin-top:14px}
        .sp-review{border-top:1px solid var(--border);padding:14px 0}
        .sp-review:first-of-type{border-top:0}
        .sp-reply{margin:10px 0 0 38px;padding:10px 12px;border-radius:10px;background:var(--card2);border:1px solid var(--border)}
        .sp-reply span{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--text2)}
        .sp-reply p{margin:4px 0 0;font-size:13px;line-height:1.6;color:var(--text);overflow-wrap:anywhere;white-space:pre-line}
        @media(max-width:767px){.sp-reply{margin-left:0}}
        .sp-agent{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;border:1px solid var(--border);background:var(--card2);font-size:11px;font-weight:600;color:var(--text2);vertical-align:middle}
        .sp-trust{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--text2)}
        .sp-trust li{display:flex;align-items:center;gap:8px}.sp-trust i{font-size:15px;color:var(--text3)}
        .sp-new{display:inline-flex;padding:2px 8px;border-radius:999px;background:var(--card2);border:1px solid var(--border);color:var(--text)!important;font-weight:500}
        .sp-files{padding:22px;margin-top:14px}
        .sp-files h2{font-size:15px;font-weight:600;margin:0 0 10px}
        .sp-file{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--border);color:var(--text);text-decoration:none;min-height:44px}
        .sp-file:first-of-type{border-top:0}
        .sp-file i{font-size:20px;color:var(--text2);flex-shrink:0}
        .sp-file span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
        .sp-file small{color:var(--text3);font-size:12px}
        .sp-file-media{margin:6px 0 10px}
        .sp-file-media audio,.sp-file-media video{width:100%;border-radius:10px;max-height:320px}
        .sp-file-media img{max-width:100%;border-radius:10px;display:block}
        .sp-desc{font-size:14px;line-height:1.7;color:var(--text2);overflow-wrap:anywhere}
        .sp-desc table{border-collapse:collapse;width:100%;display:block;overflow-x:auto}
        .sp-desc td,.sp-desc th{border:1px solid var(--border);padding:6px 8px}
        .sp-desc pre{overflow-x:auto;background:var(--card2);padding:10px;border-radius:8px}
        .sp-desc img{max-width:100%}
        .sp-mobile-only{display:none}
        @media(max-width:900px){
          .sp-layout{grid-template-columns:minmax(0,1fr)} /* minmax: a long name in a review can't widen the column past the phone (2026-11-08) */
          .sp-side{position:static}
          .sp-desktop-only{display:none}
          .sp-mobile-only{display:flex;flex-direction:column;gap:14px;margin-top:14px}
        }
`

export default function StoreProduct() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const { user } = useAuth()
  const { sol } = useLivePrice()
  const { convert } = useCurrency()
  const { toast } = useToast()
  const [reporting, setReporting] = useState(false)

  const [product, setProduct] = useState<StoreProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [reviewDone, setReviewDone] = useState(false)
  const shownId = useRef<string | null>(null)
  const prefilled = useRef<string | null>(null)

  const isOwner = user && product && user.id === product.sellerId
  const isSoldOut = product && product.stock !== null && product.stock <= 0
  // A product the seller hid still opens from old links: it can't be bought (2026-11-08)
  const isHidden = !!product && (product.isActive === false || !!product.hiddenBecause)
  const isStaff = !!user && (user.role === 'ADMIN' || !!user.isModerator)

  // Signed in, the answer also says whether this member can review it (canReview).
  // Only a new product shows the skeleton; reloading the same one (after a review,
  // or signing in) updates the page in place (2026-11-08)
  const fetchProduct = useCallback(async () => {
    if (!id) return
    if (shownId.current !== id) setLoading(true)
    setError(null)
    try {
      const data = await apiRequest<StoreProductData>('/store/' + id, { fresh: true })
      setProduct(data)
      shownId.current = id
    } catch (err: any) {
      if (shownId.current !== id) setError(err?.message || 'Product not found')
    } finally {
      setLoading(false)
    }
  }, [id, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchProduct() }, [fetchProduct])
  // Another product in the same page: its own review form, no thank-you from the
  // last one (2026-11-08)
  useEffect(() => {
    setReviewDone(false); setReviewError(''); setReviewRating(0); setReviewComment('')
  }, [id])

  // "Leave a review" on an order links here with #review
  const canReview = !!user && !!product?.canReview && !isOwner && !product.official
  // A member who already reviewed it sees their stars and words, to change them
  useEffect(() => {
    if (!product?.myReview || prefilled.current === product.id) return
    prefilled.current = product.id
    setReviewRating(Number(product.myReview.rating) || 0)
    setReviewComment(product.myReview.comment || '')
  }, [product])
  useEffect(() => {
    if (hash === '#review' && product) document.getElementById('review')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [hash, !!product, canReview]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleSubmitReview = async () => {
    if (reviewRating < 1 || !product) return
    setSubmittingReview(true); setReviewError('')
    try {
      await apiRequest('/store/' + product.id + '/reviews', {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      })
      // The form stays filled in: it's their review now, and they can change it
      prefilled.current = product.id
      setReviewDone(true)
      fetchProduct()
    } catch (e: any) {
      setReviewError(e?.message || "Your review couldn't be sent. Please try again.")
    } finally { setSubmittingReview(false) }
  }

  const goBack = () => {
    // Opened from a shared link there's no page before this one on OgaPay (2026-11-08)
    if (Number(window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate('/store')
  }

  if (loading) {
    // Inside the page frame (menu and dock stay) and shaped like the product page (2026-11-08)
    return (
      <Layout>
        <style>{SP_CSS}</style>
        <div className="ui-page sp-page" aria-busy="true" aria-label="Loading the product">
          <div className="sp-top"><div className="ui-sk" style={{ height: 20, width: 70 }} /><div className="ui-sk" style={{ height: 20, width: 110 }} /></div>
          <div className="ui-sk" style={{ height: 12, width: 120 }} />
          <div className="ui-sk" style={{ height: 30, width: 'min(420px, 80%)', marginTop: 10 }} />
          <div className="sp-layout">
            <div>
              <div className="sp-media ui-sk" style={{ border: 0 }} />
              <div className="sp-mobile-only"><div className="ui-sk" style={{ height: 330 }} /></div>
              <div className="ui-sk" style={{ height: 180, marginTop: 14 }} />
            </div>
            <aside className="sp-side sp-desktop-only">
              <div className="ui-sk" style={{ height: 330 }} />
              <div className="ui-sk" style={{ height: 160 }} />
            </aside>
          </div>
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
          <button onClick={() => navigate('/store')} style={{ background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Back to Store
          </button>
        </div>
      </Layout>
    )
  }

  const p = product
  // The seller's bio and job numbers (none for OgaPay's own items or a private profile)
  const seller = p.official ? null : p.sellerInfo
  const cur = (p.currency || 'NGN') as string
  const delivery = p.metadata?.delivery || '3 days'
  const revisions = p.metadata?.revisions ?? 3
  const crumb = [itemCategoryLabel(p.category, p.title), p.metadata?.subcategory].filter(Boolean).join(' / ') || 'Store'
  // The breadcrumb links to the store filtered to the category, then the
  // subcategory (F1, 2026-11-10). OgaPay's own items keep the plain label.
  const crumbCat = !p.official && p.categoryGroup ? p.categoryGroup : ''
  const crumbSub = crumbCat && crumbCat !== 'Other' ? p.metadata?.subcategory : ''
  const crumbLink = { color: 'inherit', textDecoration: 'none', display: 'inline-block', padding: '10px 0' }

  const onRequest = !!p.priceOnRequest
  const contactSeller = () => {
    if (!user) return navigate('/login?redirect=/store/' + p.id)
    navigate('/messages?user=' + encodeURIComponent(p.seller) + '&product=' + p.id)
  }
  const unavailable = !!isSoldOut || isHidden
  const buyLabel = isOwner ? 'Edit listing' : isHidden ? 'Not available' : isSoldOut ? 'Sold out' : onRequest ? 'Ask for a price' : 'Buy now'
  const onBuy = () => {
    if (isOwner) return navigate('/my-store')
    if (onRequest) return contactSeller()
    if (!user) return navigate('/login?redirect=/store/' + p.id)
    navigate('/store/pay/' + p.id)
  }

  const PriceCard = (
    <div className="ui-card sp-price">
      <div className="sp-price-head">
        <span>Your next project</span>
        {isHidden ? <span className="sp-pill sp-pill-off">Not available</span> : isSoldOut ? <span className="sp-pill sp-pill-off">Sold out</span> : <span className="sp-pill"><span />Active</span>}
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
      {isHidden && !isOwner && <div className="sp-note sp-note-err"><i className="ti ti-eye-off" />{isStaff && p.hiddenBecause ? HIDDEN_STAFF[p.hiddenBecause] : "The seller isn't selling this right now."}</div>}
      {/* Hidden products open only for their seller (and staff) since 2026-11-10; the seller is told why */}
      {isHidden && isOwner && (
        <div className="sp-note sp-note-err" style={{ alignItems: 'flex-start' }}>
          <i className="ti ti-eye-off" style={{ marginTop: 2 }} />
          <span>
            {p.hiddenBecause === 'removed' ? <>Removed by OgaPay: {p.delistReason || 'it broke the store rules'}. Only you can see this.</>
              : p.hiddenBecause === 'private' ? <>Buyers can't see this because your profile is private. <Link to="/edit-profile" style={{ color: 'inherit', fontWeight: 600 }}>Make it public</Link> to show your store.</>
              : p.hiddenBecause === 'review' ? <>Hidden from the store while our team checks your account.</>
              : <>Hidden from the store: only you can see this.</>}
          </span>
        </div>
      )}
      <button className="ui-btn ui-btn-dark ui-btn-lg" style={{ width: '100%' }} onClick={onBuy} disabled={unavailable && !isOwner}>
        {buyLabel} {(isOwner || !unavailable) && <i className={isOwner ? 'ti ti-edit' : 'ti ti-arrow-right'} />}
      </button>
      {!isOwner && !onRequest && !p.official && (
        <button className="ui-btn ui-btn-ghost ui-btn-lg" style={{ width: '100%', marginTop: 8 }} onClick={contactSeller}>
          <i className="ti ti-message" /> Contact seller
        </button>
      )}
      {!isOwner && !p.official && !onRequest && (
        <p className="sp-protect"><i className="ti ti-shield-check" aria-hidden="true" /> Buyer protection: your payment is held until you confirm you received the order.</p>
      )}
      {/* Report product (2026-11-10): buyers can flag a fake or a scam */}
      {!isOwner && !p.official && (
        <button type="button" className="sp-report" onClick={() => (user ? setReporting(true) : navigate('/login?redirect=/store/' + p.id))}>
          <i className="ti ti-flag" aria-hidden="true" /> Report this product
        </button>
      )}
    </div>
  )

  const Moderate = isStaff ? (
    <ModerateBar product={p} isAdmin={user?.role === 'ADMIN'} onChanged={(msg) => { toast(msg, 'success'); fetchProduct() }} />
  ) : null

  // OgaPay's own items: a fixed card, no profile link (2026-11-08)
  const CreatorCard = p.official ? (
    <div className="ui-card sp-creator">
      <span className="ui-label">Sold by</span>
      <div className="sp-creator-row" style={{ cursor: 'default' }}>
        <Avatar src={null} name="OgaPay" size={40} />
        <span style={{ minWidth: 0 }}>
          <b>Sold by OgaPay</b>
          <span className="sp-rating"><span>It takes effect as soon as you pay.</span></span>
        </span>
      </div>
    </div>
  ) : (
    <div className="ui-card sp-creator">
      <span className="ui-label">Meet the creator</span>
      <button className="sp-creator-row" onClick={() => navigate('/user/' + p.seller)}>
        <Avatar src={p.sellerAvatar} name={p.seller} size={40} />
        <span style={{ minWidth: 0 }}>
          <b>{p.seller} <i className="ti ti-arrow-up-right" /></b>
          <span className="sp-rating">
            {p.reviewsCount > 0
              ? <><i className="ti ti-star" style={{ color: '#bd8517' }} /> {Number(p.rating).toFixed(1)} <span>/ 5 · {p.reviewsCount} reviews</span></>
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
      {/* Comes with the product now, so there is nothing to wait for (2026-11-10) */}
      {seller && seller.tasksCompleted !== undefined && (
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
          <button onClick={goBack}><i className="ti ti-arrow-left" />Back</button>
          <button onClick={() => navigate('/store')}>All products <i className="ti ti-arrow-up-right" /></button>
        </div>
        {crumbCat ? (
          <nav className="ui-eyebrow" aria-label="Breadcrumb">
            <Link to={storeCategoryLink(crumbCat)} style={crumbLink}>{crumbCat}</Link>
            {crumbSub && <> / <Link to={storeCategoryLink(crumbCat, crumbSub)} style={crumbLink}>{crumbSub}</Link></>}
          </nav>
        ) : <span className="ui-eyebrow">{crumb}</span>}
        <h1 className="ui-title">{p.title}</h1>
        {p.createdVia === 'API' && <p style={{ margin: '6px 0 0' }}><span className="sp-agent" title="The seller listed this with an AI agent through the OgaPay API"><i className="ti ti-robot" aria-hidden="true" /> Listed by an agent</span></p>}

        <div className="sp-layout">
          <div>
            <div className="sp-media">
              <ItemCover src={p.image} category={p.category} title={p.title} alt={p.title} priority />
            </div>

            <div className="sp-mobile-only">{PriceCard}{CreatorCard}{Moderate}</div>

            <section className="ui-card sp-about">
              <h2>About this product</h2>
              <div className="sp-desc" dangerouslySetInnerHTML={{ __html: renderBlog(p.description || '') }} />
            </section>

            {p.sampleFiles && p.sampleFiles.length > 0 && (
              <section className="ui-card sp-files">
                <h2>Samples <span style={{ color: 'var(--text2)', fontWeight: 400 }}>· {p.sampleFiles.length}</span></h2>
                {p.sampleFiles.map((f, i) => (
                  <div key={i}>
                    {(f.type === 'audio' || f.type === 'video' || f.type === 'image') && (
                      <div className="sp-file-media">
                        {f.type === 'audio' ? <audio controls preload="none" src={f.url} aria-label={f.name} />
                          : f.type === 'video' ? <video controls preload="metadata" src={f.url} aria-label={f.name} />
                          : <img src={sized(f.url, 760)} alt={f.name} loading="lazy" decoding="async" />}
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
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Reviews {p.reviewsCount > 0 && <span style={{ color: 'var(--text2)', fontWeight: 400 }}>· {p.reviewsCount}</span>}</h2>
              {p.reviews.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text2)', margin: '8px 0 0' }}>{canReview ? 'No reviews yet. Be the first to review it.' : 'No reviews yet. Be the first to order.'}</p>
              ) : p.reviews.map(r => (
                <div key={r.id} className="sp-review">
                  {/* A long username shortens with "…" so the stars and date stay on a 360px phone (2026-11-08) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar src={r.avatarUrl} name={r.username} size={28} />
                    <button className="tap" onClick={() => navigate('/user/' + r.username)} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--text)', fontFamily: 'inherit' }}>{r.username}</button>
                    <span style={{ flexShrink: 0 }}><StarRating rating={r.rating} size={11} /></span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{timeAgo(r.createdAt)}</span>
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: 'var(--text2)', margin: '8px 0 0', lineHeight: 1.6 }}>{r.comment}</p>}
                  {r.sellerReply && (
                    <div className="sp-reply">
                      <span><i className="ti ti-message-reply" aria-hidden="true" /> Reply from {p.seller}{r.sellerRepliedAt ? ` · ${timeAgo(r.sellerRepliedAt)}` : ''}</span>
                      <p>{r.sellerReply}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Only for a member who bought it and finished the order (canReview from the server) (2026-11-08) */}
              {reviewDone && !canReview && <div className="sp-note sp-note-ok" style={{ marginTop: 10 }}><i className="ti ti-circle-check" />Thanks. Your review is posted.</div>}
              {canReview && (
                <div id="review" style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{p.myReview ? 'Your review' : 'Write a review'}</div>
                  {reviewDone && <div className="sp-note sp-note-ok"><i className="ti ti-circle-check" />Thanks. Your review is saved. You can change it here.</div>}
                  <StarRating rating={reviewRating} size={22} interactive onChange={setReviewRating} />
                  <textarea className="ui-input" value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share your experience…"
                    style={{ height: 80, padding: '10px 12px', marginTop: 10, resize: 'vertical' }} />
                  {reviewError && <div className="sp-note sp-note-err" role="alert" style={{ marginTop: 10, marginBottom: 0 }}><i className="ti ti-alert-circle" />{reviewError}</div>}
                  <button className="ui-btn ui-btn-dark" style={{ marginTop: 10 }} onClick={handleSubmitReview} disabled={submittingReview || reviewRating < 1}>
                    {submittingReview ? 'Submitting…' : p.myReview ? 'Update review' : 'Submit review'}
                  </button>
                </div>
              )}
              {!user && (
                <p style={{ fontSize: 12, color: 'var(--text2)', margin: '12px 0 0' }}>
                  <button className="tap" onClick={() => navigate('/login?redirect=/store/' + id)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Log in</button> to leave a review.
                </p>
              )}
            </section>
          </div>

          <aside className="sp-side sp-desktop-only">
            {PriceCard}
            {CreatorCard}
            {Moderate}
          </aside>
        </div>
      </div>
      {reporting && <ReportProductSheet product={p} onClose={() => setReporting(false)} />}
    </Layout>
  )
}
