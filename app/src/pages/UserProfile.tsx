import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import ItemCover from '../components/ItemCover'
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom"
import Layout from "../components/Layout"
import InviteToCommunity from "../components/profile/InviteToCommunity"
import TransferModal from "../components/TransferModal"
import ReportUser from "../components/profile/ReportUser"
import { apiRequest } from "../lib/api"
import { closeAccount } from "../lib/adminClose"
import { useAuth } from "../context/AuthContext"
import { openSignIn } from "../lib/signin"
import "../styles/profile-public.css"
import { PremiumMark, VerifiedBusinessMark } from "../components/Perks";
import { sized, isOurMedia } from '../lib/img'
import { formatMoney } from '../lib/money'
import CreatorAudiences from "../components/profile/CreatorAudiences"
import InfoTip from '../components/InfoTip'
import ShareButton from '../components/ShareButton'
import { XProfileSummary } from '../components/profile/XProfile'
import type { XPublic } from '../lib/xprofile'
import { useMoney } from '../lib/useMoney'

type Tab = "store" | "portfolio" | "reviews" | "communities"
const TABS: Tab[] = ["store", "portfolio", "reviews", "communities"]

type Review = {
  id: string
  kind: "job" | "product"
  rating: number
  text: string | null
  date: string
  subject: { id?: string; title: string }
  // username is null for a closed or private account (no link)
  reviewer: { username: string | null; name: string; avatarUrl: string | null } | null
  // Rated by our team from the moderation queue, not by the job's poster
  byTeam?: boolean
}
type ReviewData = {
  average: number; total: number; distribution: Record<string, number>; reviews: Review[]
  jobs?: { average: number; total: number }; products?: { average: number; total: number }
  page?: number; totalPages?: number
}

// The parts of the page that load after the profile, each on its own, so a
// slow or failed one shows "Loading" or "Try again" instead of looking empty
type Section = "reviews" | "products" | "portfolio" | "blogs" | "communities"
type SectionStatus = "loading" | "ok" | "error"
const ALL_LOADING: Record<Section, SectionStatus> = { reviews: "loading", products: "loading", portfolio: "loading", blogs: "loading", communities: "loading" }
const REVIEWS_PER_PAGE = 10

function SectionState({ status, noun, onRetry }: { status: SectionStatus; noun: string; onRetry: () => void }) {
  if (status === "loading") {
    return (
      <div className="up-empty" role="status" aria-busy="true">
        <div className="up-skel" style={{ height: 12, width: 140, margin: "0 auto 10px" }} />
        Loading {noun}…
      </div>
    )
  }
  return (
    <div className="up-empty" role="alert">
      <i className="ti ti-cloud-off" />Couldn't load {noun}.
      <div style={{ marginTop: 10 }}><button type="button" className="up-btn" onClick={onRetry}>Try again</button></div>
    </div>
  )
}
type Blogs = { posts: any[]; page: number; totalPages: number; total: number }
const NO_BLOGS: Blogs = { posts: [], page: 1, totalPages: 1, total: 0 }
const NO_REVIEWS: ReviewData = { average: 0, total: 0, distribution: {}, reviews: [] }

const LEVEL_NAMES: Record<string, string> = {
  BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced", EXPERT: "Expert", LEGEND: "Legend",
}
const ACTIVE: Record<string, string> = { today: "Active today", week: "Active this week", month: "Active this month" }
const PRODUCTS_PAGE = 24
const BLOGS_PAGE = 5

const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) =>
  new Date(d).toLocaleDateString("en-US", opts)

// SVG stars: the icon font's filled variants aren't loaded
const STAR = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const row = (fill: string) => [0, 1, 2, 3, 4].map((i) => (
    <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} fill={fill} /></svg>
  ))
  const pct = Math.max(0, Math.min(5, value)) / 5 * 100
  return (
    <span className="up-stars" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      <span className="bg">{row("var(--border2)")}</span>
      <span className="fg" style={{ width: `${pct}%` }}>{row("#d4a017")}</span>
    </span>
  )
}

export default function UserProfile() {
  const { username = "" } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user: me } = useAuth()
  // Earnings and store prices follow the visitor's display currency
  const show = useMoney()
  // Your own page skips the 30-second cache signed-out visitors share, so your edits show at once
  const ownPage = !!me?.username && me.username.toLowerCase() === username.toLowerCase()

  const [profile, setProfile] = useState<any>(null)
  const [state, setState] = useState<"loading" | "ok" | "private" | "missing" | "error">("loading")
  const [reviews, setReviews] = useState<ReviewData | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [blogs, setBlogs] = useState<Blogs>(NO_BLOGS)
  const [communities, setCommunities] = useState<any[]>([])
  const [sec, setSec] = useState<Record<Section, SectionStatus>>(ALL_LOADING)
  const [reviewPage, setReviewPage] = useState(1)
  const [more, setMore] = useState<"" | "products" | "blogs">("")
  // ?tab=store (etc.) opens that tab, so a member can share "see my store"
  const linked = TABS.includes(params.get("tab") as Tab) ? params.get("tab") as Tab : null
  const [tab, setTabState] = useState<Tab>(linked || "store")
  // Set once the link or the visitor picked a tab: the page then stops choosing one
  const tabPicked = useRef(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)
  // The link to copy by hand when the browser won't copy it
  const [shareBox, setShareBox] = useState("")
  const nameRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => { if (linked) { tabPicked.current = true; setTabState(linked) } }, [linked])
  const setTab = (t: Tab) => {
    tabPicked.current = true
    setTabState(t)
    setParams((p) => { const n = new URLSearchParams(p); n.set("tab", t); return n }, { replace: true })
  }

  // One section's data. Each call is numbered, so an older answer (another
  // profile, or a review page clicked past) never replaces a newer one. It
  // resolves with the data (undefined when it failed or was overtaken).
  const reqs = useRef<Record<string, number>>({})
  const pendingPage = useRef(1)
  const loadSection = (s: Section, page = 1): Promise<any> => {
    const n = (reqs.current[s] = (reqs.current[s] || 0) + 1)
    if (s === "reviews") pendingPage.current = page
    const u = encodeURIComponent(username)
    setSec((x) => ({ ...x, [s]: "loading" }))
    const path = s === "reviews" ? `/users/public/${u}/reviews?page=${page}&limit=${REVIEWS_PER_PAGE}`
      : s === "products" ? `/users/public/${u}/products?limit=${PRODUCTS_PAGE}`
      : s === "blogs" ? `/users/public/${u}/blogs?page=1&limit=${BLOGS_PAGE}`
      : `/users/public/${u}/${s}`
    // Your own page is asked for signed in, past the 30-second shared cache
    return apiRequest<any>(path, { auth: ownPage })
      .then((d) => {
        if (reqs.current[s] !== n) return undefined
        if (s === "reviews") { setReviews(d || NO_REVIEWS); setReviewPage(page) }
        // An older server sends the posts as a plain list
        else if (s === "blogs") setBlogs(Array.isArray(d) ? { posts: d, page: 1, totalPages: 1, total: d.length } : d?.posts ? d : NO_BLOGS)
        else {
          const list = Array.isArray(d) ? d : []
          if (s === "products") setProducts(list)
          else if (s === "portfolio") setPortfolio(list)
          else setCommunities(list)
        }
        setSec((x) => ({ ...x, [s]: "ok" }))
        return d
      })
      .catch(() => { if (reqs.current[s] === n) setSec((x) => ({ ...x, [s]: "error" })); return undefined })
  }

  // Everything is asked for at once (2026-11-10: the sections waited for the
  // profile, about 1.7s before the tabs filled). The sections answer "not found"
  // for a private profile, and the page then shows only the private notice.
  useEffect(() => {
    let live = true
    setState("loading")
    setProfile(null)
    setReviews(null); setProducts([]); setPortfolio([]); setBlogs(NO_BLOGS); setCommunities([])
    setSec(ALL_LOADING); setReviewPage(1)
    setTabState(linked || "store")
    tabPicked.current = !!linked
    const u = encodeURIComponent(username)

    apiRequest<any>(`/users/${u}`, { auth: ownPage })
      .then((p) => {
        if (!live) return
        setProfile(p)
        setState(p?.isPublic === false ? "private" : "ok")
        // Open on the first tab with something in it, from the profile's own
        // counts, so the tab doesn't jump once the lists arrive (unless the
        // link or the visitor picked one)
        const c = p?._count || {}
        if (!tabPicked.current && p?.isPublic !== false) setTabState(c.storeItems > 0 ? "store" : c.portfolioItems > 0 ? "portfolio" : p?.workerProfile?.totalRatings > 0 ? "reviews" : "store")
      })
      .catch((e) => { if (live) setState(/not found/i.test(e?.message || "") ? "missing" : "error") })

    Promise.all((["reviews", "products", "portfolio", "blogs", "communities"] as Section[]).map((k) => loadSection(k)))
      .then(([r, pr, pf]) => {
        // No products: open on the portfolio or the reviews instead, unless a tab was picked
        if (!live || tabPicked.current || pr === undefined || (Array.isArray(pr) && pr.length)) return
        if (Array.isArray(pf) && pf.length) setTabState("portfolio")
        else if (r?.total) setTabState("reviews")
      })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, ownPage])

  // "Show more": the next page of products or posts
  const loadMore = async (what: "products" | "blogs") => {
    if (more) return
    setMore(what)
    const u = encodeURIComponent(username)
    try {
      if (what === "products") {
        const page = Math.floor(products.length / PRODUCTS_PAGE) + 1
        const next = await apiRequest<any[]>(`/users/public/${u}/products?limit=${PRODUCTS_PAGE}&page=${page}`, { auth: ownPage })
        const seen = new Set(products.map((p) => p.id))
        setProducts([...products, ...(Array.isArray(next) ? next.filter((p) => !seen.has(p.id)) : [])])
      } else {
        const next = await apiRequest<Blogs>(`/users/public/${u}/blogs?page=${blogs.page + 1}&limit=${BLOGS_PAGE}`, { auth: ownPage })
        const seen = new Set(blogs.posts.map((b) => b.id))
        if (next?.posts) setBlogs({ ...next, posts: [...blogs.posts, ...next.posts.filter((b) => !seen.has(b.id))] })
      }
    } catch { /* the button stays, to try again */ }
    setMore("")
  }

  // Reviews page by page (10 at a time), back to the top of the list
  const reviewsRef = useRef<HTMLElement>(null)
  const goReviews = (page: number) => {
    loadSection("reviews", page)
    reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const first = profile?.firstName || ""
  const last = profile?.lastName || ""
  const name = [first, last].filter(Boolean).join(" ") || profile?.username || username
  const handle = profile?.username || username
  const isMe = !!me?.username && me.username.toLowerCase() === handle.toLowerCase()
  const wp = profile?.workerProfile || {}
  const counts = profile?._count || {}
  // The headline is the job rating, the same one that counts for rank (and
  // that the person sees on their own profile). It used to mix in store
  // reviews, so visitors and the person saw different numbers.
  const avg = Number(wp.avgRating || 0)
  const jobRatings = Number(wp.totalRatings || 0)
  const reviewTotal = reviews ? reviews.total : jobRatings
  // Store reviews have their own number
  const storeAvg = Number((reviews && reviews.products?.average) || 0)
  const storeTotal = Number((reviews && reviews.products?.total) || 0)
  // The profile counts the products on sale; the list comes in pages
  const productCount = Number(counts.storeItems ?? (Array.isArray(products) ? products.length : 0))

  useEffect(() => {
    document.title = state === "ok" ? `${name} (@${handle}) | OgaPay`
      : state === "private" ? `@${handle} | OgaPay`
      : state === "missing" ? "User not found | OgaPay" : "Profile | OgaPay"
    return () => { document.title = "OgaPay" }
  }, [state, name, handle])

  // Private and missing profiles stay out of search results
  useEffect(() => {
    if (state !== "private" && state !== "missing") return
    const m = document.createElement("meta")
    m.name = "robots"; m.content = "noindex,nofollow"
    document.head.appendChild(m)
    return () => { m.remove() }
  }, [state])

  const invite = () => {
    if (!me) { openSignIn({ redirect: `/user/${handle}` }); return }
    setInviteOpen(true)
  }

  // Message: opens your chat with them (Messages starts one if there isn't one)
  const message = () => {
    if (!me) { openSignIn({ redirect: `/user/${handle}` }); return }
    navigate(`/messages?user=${encodeURIComponent(handle)}`)
  }

  // Report this user: reason + note to the admin queue
  const [reportOpen, setReportOpen] = useState(false)
  const report = () => {
    if (!me) { openSignIn({ redirect: `/user/${handle}` }); return }
    setReportOpen(true)
  }

  // Tip: send them naira from your wallet as a thank-you (needs Level 1; the
  // window says so if you aren't verified yet)
  const tip = () => {
    if (!me) { openSignIn({ redirect: `/user/${handle}` }); return }
    setTipOpen(true)
  }

  // Compliments (like wurk.fun's): one per person, counted on the profile
  const [compliments, setCompliments] = useState<number | null>(null)
  const [complimented, setComplimented] = useState(false)
  const [complimenting, setComplimenting] = useState(false)
  useEffect(() => { setCompliments(profile?._count?.complimentsReceived ?? null) }, [profile])
  useEffect(() => {
    setComplimented(false)
    if (!me || isMe || state !== "ok") return
    let live = true
    apiRequest<{ complimented: boolean; count: number }>(`/users/${encodeURIComponent(handle)}/compliment`)
      .then((r) => { if (live) { setComplimented(!!r?.complimented); if (typeof r?.count === "number") setCompliments(r.count) } })
      .catch(() => {})
    return () => { live = false }
  }, [me, isMe, state, handle])
  const compliment = async () => {
    if (!me) { openSignIn({ redirect: `/user/${handle}` }); return }
    if (complimenting) return
    setComplimenting(true)
    const was = complimented
    setComplimented(!was); setCompliments((c) => Math.max(0, (c ?? 0) + (was ? -1 : 1)))
    try {
      const r = await apiRequest<{ complimented: boolean; count: number }>(`/users/${encodeURIComponent(handle)}/compliment`, { method: was ? "DELETE" : "POST" })
      setComplimented(!!r?.complimented); if (typeof r?.count === "number") setCompliments(r.count)
    } catch {
      setComplimented(was); setCompliments((c) => Math.max(0, (c ?? 0) + (was ? 1 : -1)))
    }
    setComplimenting(false)
  }

  // Tabs: arrow keys, Home and End move between them
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab)
    const to = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length
      : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1
    if (to < 0) return
    e.preventDefault()
    setTab(TABS[to])
    document.getElementById(`up-tab-${TABS[to]}`)?.focus()
  }
  const backToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    nameRef.current?.focus({ preventScroll: true })
  }

  // ── States ─────────────────────────────────────────────────────────────
  if (state !== "ok") {
    return (
      <Layout>
        <div className="up-wrap">
          <div className="up-crumb">
            <button className="tap" onClick={() => navigate(-1)}><i className="ti ti-arrow-left" aria-hidden="true" /> Back</button>
            <span>Public profile</span>
          </div>
          {state === "loading" ? (
            <div className="up-card up-head" aria-busy="true">
              <div className="up-id">
                <div className="up-avatar up-skel" />
                <div><div className="up-skel" style={{ height: 12, width: 110 }} /><div className="up-skel" style={{ height: 26, width: 200, marginTop: 10 }} /><div className="up-skel" style={{ height: 14, width: "80%", marginTop: 14 }} /></div>
              </div>
            </div>
          ) : (
            <div className="up-card up-state">
              <i className={`ti ${state === "private" ? "ti-lock" : state === "missing" ? "ti-user-off" : "ti-cloud-off"}`} />
              <h2>{state === "private" ? "This profile is private" : state === "missing" ? "User not found" : "Couldn't load this profile"}</h2>
              <p>
                {state === "private" ? `@${handle} has chosen to keep their profile private.`
                  : state === "missing" ? `There's no OgaPay user called @${username}.`
                  : "Check your connection and try again."}
              </p>
              {state === "error"
                ? <button className="up-btn" onClick={() => window.location.reload()}>Try again</button>
                : <Link className="up-btn" to="/">Go home</Link>}
            </div>
          )}
        </div>
      </Layout>
    )
  }

  // ── Stats ──────────────────────────────────────────────────────────────
  // The join date is in the header, so compliments take the first spot (like wurk.fun)
  const contests = profile?.contests || { entered: 0, wins: 0 }
  const stats: { icon: string; label: string; value: string; sub?: string; tip?: ReactNode }[] = [
    { icon: "ti-heart", label: "Compliments", value: String(compliments ?? 0),
      tip: <p>How many people complimented this profile. Anyone signed in can give one compliment per profile, and take it back.</p> },
    { icon: "ti-briefcase", label: "Jobs done", value: String(wp.tasksCompleted ?? 0), sub: wp.tasksCompleted && wp.successRate != null ? `${Math.round(wp.successRate)}% success rate` : undefined,
      tip: <p>Jobs this person was paid for. The success rate is the share of their work that was approved (approved ÷ approved and rejected).</p> },
    ...(profile?.preferences?.showRank ? [{ icon: "ti-trophy", label: "Rank", value: LEVEL_NAMES[wp.level] || "Beginner", sub: `OgaScore ${profile?.ogaScore ?? 0}`,
      tip: <>
        <p><b>Rank</b> shows experience: Intermediate at 10 jobs, Advanced at 50 (4.0★), Expert at 200 (4.5★), Legend at 500 (4.8★). The rating must come from a number of different job posters (Advanced 5, Expert 20, Legend 50), and each poster counts once in it. People claim their new rank when they qualify, and some accounts are checked by our team first.</p>
        <p><b>OgaScore</b> (out of 66) comes from checks we verified: connected LinkedIn, X, GitHub, Google and Telegram, ID verification and Human verification. Some jobs need a minimum.</p>
      </> }] : []),
    ...(typeof profile?.xScore === "number" ? [{ icon: "ti-brand-x", label: "X score", value: `${profile.xScore}/100`,
      tip: <p>How much job posters can trust this person's X account, from things OgaPay checks: X connected, followers once checked, a blue tick, and their record on social-media jobs. Some jobs need a minimum.</p> }] : []),
    // Contests: shown once they entered one
    ...(contests.entered > 0 ? [{ icon: "ti-award", label: "Contests", value: String(contests.entered), sub: `${Math.round((contests.wins / contests.entered) * 100)}% win rate`,
      tip: <p>Contests this person entered, and the share they won a place in.</p> }] : []),
    ...(contests.wins > 0 ? [{ icon: "ti-medal", label: "Wins", value: String(contests.wins) }] : []),
    { icon: "ti-building-store", label: "Products", value: String(productCount) },
    { icon: "ti-users", label: "Communities", value: String(counts.communityMemberships ?? (Array.isArray(communities) ? communities.length : 0)) },
  ]
  // One total per currency they were paid in (naira first), never added together
  const earned: { currency: string; amount: number }[] = Array.isArray(wp.earned) ? wp.earned.filter((e: any) => Number(e?.amount) > 0) : []
  if (profile?.preferences?.showEarnings && earned.length) {
    stats.push({ icon: "ti-coin", label: "Earned", value: formatMoney(earned[0].amount, earned[0].currency),
      sub: earned.slice(1).map((e) => `+ ${formatMoney(e.amount, e.currency)}`).join(" ") || undefined,
      tip: <p>Money this person was paid for jobs, shown in each currency they were paid in.</p> })
  }

  const skills: string[] = Array.isArray(wp.skills) ? wp.skills : []
  const categories: string[] = Array.isArray(wp.categories) ? wp.categories.map((c: string) => c.replace(/_/g, " ").toLowerCase()) : []
  const hasAbout = skills.length > 0 || categories.length > 0 || wp.isAvailable
  const x: XPublic | null = profile?.x?.handle ? profile.x : null
  // A creator: a verified audience, or something in the store or the blog
  const isCreator = !!profile.creatorVerified || productCount > 0 || Number(counts.blogPosts || 0) > 0

  // Links from Edit profile. The server sends only safe values (an http(s)
  // website, plain usernames); the typed X handle is left out when X is connected.
  const lk = profile?.links || {}
  const links: { key: string; icon: string; label: string; href?: string }[] = [
    ...(lk.website ? [{ key: "web", icon: "ti-world", label: String(lk.website).replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""), href: lk.website }] : []),
    ...(lk.x && !x ? [{ key: "x", icon: "ti-brand-x", label: `@${lk.x}`, href: `https://x.com/${lk.x}` }] : []),
    ...(lk.telegram ? [{ key: "tg", icon: "ti-brand-telegram", label: `@${lk.telegram}`, href: `https://t.me/${lk.telegram}` }] : []),
    // Discord has no profile link: just the username
    ...(lk.discord ? [{ key: "dc", icon: "ti-brand-discord", label: lk.discord }] : []),
  ]

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    // The profile's own counts until each list has loaded
    { key: "store", label: "Store", icon: "ti-building-store", count: productCount },
    { key: "portfolio", label: "Portfolio", icon: "ti-photo", count: sec.portfolio === "ok" ? portfolio.length : Number(counts.portfolioItems || 0) },
    { key: "reviews", label: "Reviews", icon: "ti-message-star", count: reviewTotal },
    { key: "communities", label: "Communities", icon: "ti-users", count: sec.communities === "ok" ? communities.length : Number(counts.communityMemberships || 0) },
  ]
  const panel = (key: Tab) => ({ role: "tabpanel", id: `up-panel-${key}`, "aria-labelledby": `up-tab-${key}` })

  return (
    <Layout>
      <div className="up-wrap">
        <div className="up-crumb">
          <button className="tap" onClick={() => navigate(-1)}><i className="ti ti-arrow-left" aria-hidden="true" /> Back</button>
          <span>Public profile</span>
        </div>

        {/* Cover photo from Edit profile */}
        {profile.coverUrl && <div className="up-cover"><img src={sized(profile.coverUrl, 1024)} alt="" /></div>}

        {/* ── Header ── */}
        <section className="up-card up-head">
          <div className="up-id">
            {isOurMedia(profile.avatarUrl, true)
              ? <img className={`up-avatar${profile.frame ? ' oga-frame' : ''}`} src={sized(profile.avatarUrl, 128, true)} alt="" />
              : <div className={`up-avatar${profile.frame ? ' oga-frame' : ''}`}>{(first[0] || handle[0] || "?").toUpperCase()}{last[0]?.toUpperCase() || ""}</div>}
            <div style={{ minWidth: 0 }}>
              <div className="up-eyebrow">{isCreator ? "Creator profile" : "Member profile"}</div>
              <div className="up-name">
                <h1 ref={nameRef} tabIndex={-1}>{name}</h1>
                {profile.creatorVerified && <span className="up-badge ok"><i className="ti ti-rosette-discount-check" /> Verified creator</span>}
                {profile.humanVerified && <span className="up-badge ok"><i className="ti ti-fingerprint" /> Human verified</span>}
                {profile.kycVerified && <span className="up-badge ok"><i className="ti ti-shield-check" /> ID verified</span>}
                {profile.posterProfile?.isVerified && <VerifiedBusinessMark label name={profile.posterProfile.verifiedName} />}
                {profile.premium && <PremiumMark label />}
              </div>
              <div className="up-handle">
                @{handle} · Joined {fmtDate(profile.createdAt, { month: "long", year: "numeric" })}
                {ACTIVE[profile.lastActive] && <> · <span className="up-active">{ACTIVE[profile.lastActive]}</span></>}
              </div>
              {profile.bio && <p className="up-bio">{profile.bio}</p>}
              {links.length > 0 && (
                <div className="up-links">
                  {links.map((l) => l.href
                    ? <a key={l.key} className="up-link" href={l.href} target="_blank" rel="nofollow ugc noopener noreferrer"><i className={`ti ${l.icon}`} aria-hidden="true" /> {l.label}</a>
                    : <span key={l.key} className="up-link" title="Discord username"><i className={`ti ${l.icon}`} aria-hidden="true" /> {l.label}</span>)}
                </div>
              )}
              {/* The longer "More about you" text from Edit profile */}
              {profile.about && (
                <details className="up-about">
                  <summary>More about {first || handle}</summary>
                  <p style={{ whiteSpace: "pre-line", margin: "6px 0 0", overflowWrap: "anywhere" }}>{profile.about}</p>
                </details>
              )}
              <div className="up-actions">
                {isMe ? (
                  <Link className="up-btn primary" to="/edit-profile"><i className="ti ti-pencil" /> Edit profile</Link>
                ) : (
                  <Link className="up-btn primary" to={`/user/${handle}/hire`}><i className="ti ti-briefcase" /> Hire</Link>
                )}
                {!isMe && <button className="up-btn" onClick={message}><i className="ti ti-message" /> Message</button>}
                {!isMe && <button className="up-btn" onClick={invite}><i className="ti ti-user-plus" /> Invite</button>}
                {!isMe && <button className="up-btn" onClick={tip}><i className="ti ti-heart-handshake" /> Tip</button>}
                {!isMe && (
                  <button className={`up-btn up-compliment${complimented ? " on" : ""}`} onClick={compliment} aria-pressed={complimented} disabled={complimenting}>
                    <i className={`ti ${complimented ? "ti-heart-check" : "ti-heart"}`} /> {complimented ? "Complimented" : "Compliment"}
                  </button>
                )}
                {/* The device's share sheet, or copy the link (the box below when copying is blocked) */}
                <ShareButton className="up-btn" url={`${window.location.origin}/user/${handle}`} title={`${name} on OgaPay`} onCopyFailed={setShareBox} />
                {!isMe && <button className="up-btn" onClick={report}><i className="ti ti-flag" /> Report</button>}
                {/* Admins: warn this member for breaking the rules (Admin > Warnings) */}
                {!isMe && me?.role === "ADMIN" && (
                  <Link className="up-btn" to={`/admin/warnings?warn=${encodeURIComponent(handle)}`}><i className="ti ti-alert-triangle" /> Warn</Link>
                )}
                {!isMe && me?.role === "ADMIN" && profile?.id && (
                  <button className="up-btn" style={{ color: "var(--red)" }} onClick={async () => { if (await closeAccount(profile.id, profile.username || handle)) window.location.reload() }}><i className="ti ti-user-x" /> Close account</button>
                )}
                {/* Posters can ask for the Verified business badge (optional, Settings > Business) */}
                {isMe && !profile.posterProfile?.isVerified && (profile.posterProfile?.totalPosted || 0) > 0 && (
                  <Link className="up-btn" to="/settings/business"><i className="ti ti-rosette-discount-check" /> Get a Verified business badge</Link>
                )}
              </div>
              {/* Copying was blocked: the link to copy by hand */}
              {shareBox && (
                <div className="up-sharebox">
                  <label htmlFor="up-share-url">Copy this link</label>
                  <div>
                    <input id="up-share-url" className="ui-input" readOnly value={shareBox} autoFocus onFocus={(e) => e.currentTarget.select()} />
                    <button type="button" className="up-btn" onClick={() => setShareBox("")} aria-label="Close"><i className="ti ti-x" /></button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="up-rating">
            <div className="up-eyebrow">Average rating</div>
            <div className="n">{avg.toFixed(1)}<small>/ 5</small></div>
            <Stars value={avg} />
            <div className="c">{jobRatings} {jobRatings === 1 ? "job rating" : "job ratings"}</div>
          </div>

          <div className="up-stats">
            {stats.map((s) => (
              <div className="up-stat" key={s.label}>
                <div className="l"><i className={`ti ${s.icon}`} /> {s.label}{s.tip && <InfoTip label={`What is ${s.label}?`} title={s.label}>{s.tip}</InfoTip>}</div>
                <div className="v">{s.value}</div>
                {s.sub && <div className="s">{s.sub}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Their X account as X shows it (only when they connected X) */}
        {x && (
          <section className="up-card up-x" aria-labelledby="up-x-h">
            <h2 id="up-x-h"><i className="ti ti-brand-x" aria-hidden="true" /> On X</h2>
            <XProfileSummary handle={x.handle} profile={x} size={48} />
          </section>
        )}

        {profile?.id && <CreatorAudiences userId={profile.id} audiences={profile.audiences} />}

        {hasAbout && (
          <section className="up-card up-about">
            <h2>About</h2>
            {wp.isAvailable && <div className="up-avail">Available for work</div>}
            {skills.length > 0 && <div className="up-chips">{skills.map((s) => <span className="up-chip" key={s}>{s}</span>)}</div>}
            {categories.length > 0 && (
              <div className="up-chips" style={{ marginTop: skills.length ? 8 : 0 }}>
                {categories.map((c) => <span className="up-chip" key={c} style={{ textTransform: "capitalize" }}>{c}</span>)}
              </div>
            )}
          </section>
        )}

        {/* ── Tabs ── (?tab=store etc. in the address; arrow keys move between them) */}
        <div className="up-tabs-row">
          <div className="up-tabs" role="tablist" aria-label="Profile sections" onKeyDown={onTabKey}>
            {tabs.map((t) => (
              <button key={t.key} id={`up-tab-${t.key}`} role="tab" aria-selected={tab === t.key} aria-controls={`up-panel-${t.key}`} tabIndex={tab === t.key ? 0 : -1}
                className={`up-tab ${tab === t.key ? "on" : ""}`} onClick={() => setTab(t.key)}>
                <i className={`ti ${t.icon}`} /> {t.label} {t.count > 0 && <em>{t.count}</em>}
              </button>
            ))}
          </div>
          <button className="up-top" onClick={backToTop}><i className="ti ti-arrow-up" /> Back to top</button>
        </div>

        {tab === "store" && (
          <section {...panel("store")}>
            <div className="up-sec-h"><h2>Products & services</h2><p>What {first || handle} offers in the OgaPay store.</p></div>
            {sec.products !== "ok" ? (
              <SectionState status={sec.products} noun="products" onRetry={() => loadSection("products")} />
            ) : products.length === 0 ? (
              <div className="up-empty"><i className="ti ti-building-store" />No products yet.</div>
            ) : (
              <>
                <div className="up-grid">
                  {products.map((p) => (
                    <Link className="up-card up-item" to={`/store/${p.id}`} key={p.id}>
                      <div className="img"><ItemCover src={p.image} category={p.category} title={p.title} width={400} /></div>
                      <div className="body">
                        <div className="meta">
                          {String(p.category || "").replace(/_/g, " ")} · {fmtDate(p.createdAt)}
                          {/* No stock number means no limit */}
                          {p.stock === 0 ? <span className="up-stock out">Sold out</span> : <span className="up-stock">Available</span>}
                        </div>
                        <h3>{p.title}</h3>
                        {(p.excerpt ?? p.description) && <p>{p.excerpt ?? p.description}</p>}
                        {(p.delivery || p.revisions != null) && (
                          <div className="meta" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                            {[p.delivery, p.revisions != null ? `${p.revisions} ${p.revisions === 1 ? 'revision' : 'revisions'}` : null].filter(Boolean).join(' · ')}
                          </div>
                        )}
                        <div className="foot">
                          <b>{p.priceOnRequest ? "Price on request" : show(Number(p.price || 0), p.currency || "NGN")}</b>
                          {p.reviewsCount > 0 ? <span><Stars value={p.rating} /> <small style={{ color: "var(--text3)" }}>({p.reviewsCount})</small></span> : <span className="link">View details <i className="ti ti-arrow-right" /></span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                {/* More pages: the count says so and the last page was full */}
                {products.length < productCount && products.length % PRODUCTS_PAGE === 0 && (
                  <div className="up-more"><button className="up-btn" onClick={() => loadMore("products")} disabled={!!more}>{more === "products" ? "Loading…" : "Show more products"}</button></div>
                )}
              </>
            )}
          </section>
        )}

        {tab === "portfolio" && (
          <section {...panel("portfolio")}>
            <div className="up-sec-h"><h2>Portfolio</h2><p>A closer look at {first || handle}'s work.</p></div>
            {sec.portfolio !== "ok" ? (
              <SectionState status={sec.portfolio} noun="portfolio" onRetry={() => loadSection("portfolio")} />
            ) : portfolio.length === 0 ? (
              <div className="up-empty"><i className="ti ti-photo" />No portfolio items yet.</div>
            ) : (
              <div className="up-grid">
                {portfolio.map((it) => {
                  // A picture added with "Upload file" is the item's url (mediaType image).
                  // Only files in our storage are shown or played; anything else is a link.
                  const pic: string | null = it.imageUrl || (it.mediaType === "image" ? it.url : null)
                  const showPic = isOurMedia(pic)
                  const plays = !!it.url && isOurMedia(it.url) && (it.mediaType === "video" || it.mediaType === "audio")
                  const picIsUrl = showPic && it.url === pic
                  const link: string | null = it.url && !plays && !picIsUrl ? it.url : (!showPic && !it.url ? pic : null)
                  return (
                    <div className="up-card up-item" key={it.id}>
                      {showPic && <div className="img"><img src={sized(pic, 400)} alt="" loading="lazy" /></div>}
                      {/* Uploaded audio and video play here; a PDF opens in a new tab */}
                      {plays && it.mediaType === "video" && <video src={it.url} controls preload="metadata" playsInline style={{ width: "100%", display: "block", background: "#000", maxHeight: 280 }} />}
                      <div className="body">
                        <h3>{it.title}</h3>
                        {it.description && <p>{it.description}</p>}
                        {plays && it.mediaType === "audio" && <audio src={it.url} controls preload="none" style={{ width: "100%", marginTop: 8 }} />}
                        {link && (
                          <div className="foot">
                            {it.mediaType === "pdf"
                              ? <a href={link} target="_blank" rel="noopener noreferrer nofollow"><i className="ti ti-file-type-pdf" /> Open PDF</a>
                              : <a href={link} target="_blank" rel="noopener noreferrer nofollow">Open link <i className="ti ti-external-link" /></a>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {tab === "reviews" && (
          <section {...panel("reviews")} ref={reviewsRef} style={{ scrollMarginTop: 80 }}>
            <div className="up-sec-h"><h2>Reviews</h2><p>Ratings from job creators and store buyers.</p></div>
            {!reviews && sec.reviews !== "ok" ? (
              <SectionState status={sec.reviews} noun="reviews" onRetry={() => loadSection("reviews", reviewPage)} />
            ) : !reviews || reviews.total === 0 ? (
              <div className="up-empty"><i className="ti ti-message-star" />No reviews yet.</div>
            ) : (
              <>
                <div className="up-card up-rev-sum">
                  <div>
                    <div className="n">{(jobRatings > 0 || !storeTotal ? avg : storeAvg).toFixed(1)}</div>
                    <Stars value={jobRatings > 0 || !storeTotal ? avg : storeAvg} />
                    {jobRatings > 0 && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{jobRatings} {jobRatings === 1 ? "job rating" : "job ratings"}</div>}
                    {storeTotal > 0 && (
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
                        {jobRatings > 0 ? `Store reviews: ${storeAvg.toFixed(1)} (${storeTotal})` : `${storeTotal} ${storeTotal === 1 ? "store review" : "store reviews"}`}
                      </div>
                    )}
                  </div>
                  <div className="up-bars">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const c = reviews.distribution[n] || 0
                      return (
                        <div className="up-bar" key={n}>
                          <span>{n}</span>
                          <div><span style={{ width: `${reviews.total ? (c / reviews.total) * 100 : 0}%` }} /></div>
                          <span style={{ textAlign: "right" }}>{c}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Another page loading (or failed): the totals stay, the list waits */}
                {sec.reviews !== "ok" ? (
                  <SectionState status={sec.reviews} noun="reviews" onRetry={() => loadSection("reviews", pendingPage.current)} />
                ) : reviews.reviews.map((r) => (
                  <article className="up-card up-rev" key={r.id}>
                    <div className="who">
                      {r.byTeam ? <span className="ph" aria-hidden="true"><i className="ti ti-shield-check" /></span>
                        : isOurMedia(r.reviewer?.avatarUrl, true) ? <img src={sized(r.reviewer?.avatarUrl, 32, true)} alt="" /> : <span className="ph">{((r.reviewer?.name || "?").replace(/^@/, "")[0] || "?").toUpperCase()}</span>}
                      <div style={{ minWidth: 0 }}>
                        {/* A closed or private reviewer has no page to link to */}
                        {r.byTeam ? <b>OgaPay team</b> : r.reviewer?.username ? <Link to={`/user/${r.reviewer.username}`}>{r.reviewer.name}</Link> : <b>{r.reviewer?.name || "OgaPay user"}</b>}
                        <small>{fmtDate(r.date)}</small>
                      </div>
                      <span style={{ marginLeft: "auto" }}><Stars value={r.rating} /></span>
                    </div>
                    <div className="subj">
                      {r.kind === "product" ? "Bought " : "Job: "}
                      {r.kind === "product" && r.subject.id ? <Link to={`/store/${r.subject.id}`}>{r.subject.title}</Link> : r.subject.title}
                    </div>
                    {r.text ? <p>{r.text}</p> : <p className="up-rev-none">No written review provided.</p>}
                  </article>
                ))}
                {(reviews.totalPages || 1) > 1 && (
                  <nav className="up-pager" aria-label="Review pages">
                    <button type="button" className="up-btn" disabled={reviewPage <= 1 || sec.reviews === "loading"} onClick={() => goReviews(reviewPage - 1)}><i className="ti ti-chevron-left" /> Previous</button>
                    <span>Page {reviewPage} of {reviews.totalPages}</span>
                    <button type="button" className="up-btn" disabled={reviewPage >= (reviews.totalPages || 1) || sec.reviews === "loading"} onClick={() => goReviews(reviewPage + 1)}>Next <i className="ti ti-chevron-right" /></button>
                  </nav>
                )}
              </>
            )}
          </section>
        )}

        {tab === "communities" && (
          <section {...panel("communities")}>
            <div className="up-sec-h"><h2>Communities</h2><p>Where {first || handle} hangs out.</p></div>
            {sec.communities !== "ok" ? (
              <SectionState status={sec.communities} noun="communities" onRetry={() => loadSection("communities")} />
            ) : communities.length === 0 ? (
              <div className="up-empty"><i className="ti ti-users" />Not in any community yet.</div>
            ) : (
              <div className="up-list">
                {communities.map((c) => (
                  <Link className="up-card up-row" to={`/communities/${c.id}`} key={c.id}>
                    <div className="ic" style={{ background: c.accentColor || "var(--text)" }}>
                      {c.coverImage ? <img src={sized(c.coverImage, 160)} alt="" loading="lazy" /> : c.initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <b>{c.name}</b>
                      <small>{c.memberCount} {c.memberCount === 1 ? "member" : "members"}</small>
                    </div>
                    {c.role && c.role !== "MEMBER" && <span className="up-role">{c.role}</span>}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Writing ── (5 posts at a time) */}
        <section className="up-writing">
          <div className="up-eyebrow">Published writing</div>
          <div className="up-sec-h" style={{ marginTop: 4 }}><h2>From the creator</h2></div>
          {sec.blogs !== "ok" ? (
            <SectionState status={sec.blogs} noun="blogs" onRetry={() => loadSection("blogs")} />
          ) : blogs.posts.length === 0 ? (
            <div className="up-empty"><i className="ti ti-writing" />No published blogs yet.</div>
          ) : (
            <>
              {blogs.posts.map((b) => (
                <Link className={`up-post${b.coverImage ? " has-cover" : ""}`} to={`/blog/${b.slug || b.id}`} key={b.id}>
                  <time>{fmtDate(b.publishedAt || b.createdAt)}</time>
                  <div>
                    <h3>{b.title}</h3>
                    {b.excerpt && <p>{b.excerpt}</p>}
                    <span>Read story →</span>
                  </div>
                  {b.coverImage && <img className="up-post-cover" src={sized(b.coverImage, 200)} alt="" loading="lazy" />}
                </Link>
              ))}
              {blogs.page < blogs.totalPages && (
                <div className="up-more"><button className="up-btn" onClick={() => loadMore("blogs")} disabled={!!more}>{more === "blogs" ? "Loading…" : `Show more posts (${blogs.total - blogs.posts.length} more)`}</button></div>
              )}
            </>
          )}
        </section>
      </div>

      {reportOpen && profile?.id && <ReportUser userId={profile.id} username={profile.username || handle} onClose={() => setReportOpen(false)} />}
      {inviteOpen && <InviteToCommunity username={handle} name={first || handle} onClose={() => setInviteOpen(false)} />}
      {tipOpen && profile?.id && (
        <TransferModal tip onClose={() => setTipOpen(false)}
          to={{ id: profile.id, username: profile.username || handle,firstName: profile.firstName, lastName: profile.lastName, avatarUrl: profile.avatarUrl }} />
      )}
    </Layout>
  )
}
