import { useEffect, useRef, useState, type ReactNode } from "react"
import ItemCover from '../components/ItemCover'
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom"
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
import { XProfileSummary } from '../components/profile/XProfile'
import type { XPublic } from '../lib/xprofile'
import { useMoney } from '../lib/useMoney'

type Tab = "store" | "portfolio" | "reviews" | "communities"

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

const LEVEL_NAMES: Record<string, string> = {
  BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced", EXPERT: "Expert", LEGEND: "Legend",
}

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
  const { user: me } = useAuth()
  // Earnings and store prices follow the visitor's display currency
  const show = useMoney()

  const [profile, setProfile] = useState<any>(null)
  const [state, setState] = useState<"loading" | "ok" | "private" | "missing" | "error">("loading")
  const [reviews, setReviews] = useState<ReviewData | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [blogs, setBlogs] = useState<any[]>([])
  const [communities, setCommunities] = useState<any[]>([])
  // /user/<name>?tab=store opens that tab (Share my store, 2026-11-10)
  const [params] = useSearchParams()
  const askedTab = (["store", "portfolio", "reviews", "communities"] as Tab[]).find((t) => t === params.get("tab")) || null
  const [sec, setSec] = useState<Record<Section, SectionStatus>>(ALL_LOADING)
  const [reviewPage, setReviewPage] = useState(1)
  const [tab, setTab] = useState<Tab>(askedTab || "store")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)
  const [shared, setShared] = useState(false)

  // One section's data. Each call is numbered, so an older answer (another
  // profile, or a review page clicked past) never replaces a newer one.
  const reqs = useRef<Record<string, number>>({})
  const pendingPage = useRef(1)
  const loadSection = (s: Section, page = 1) => {
    const n = (reqs.current[s] = (reqs.current[s] || 0) + 1)
    if (s === "reviews") pendingPage.current = page
    const u = encodeURIComponent(username)
    setSec((x) => ({ ...x, [s]: "loading" }))
    const path = s === "reviews" ? `/users/public/${u}/reviews?page=${page}&limit=${REVIEWS_PER_PAGE}` : `/users/public/${u}/${s}`
    apiRequest<any>(path, { auth: false })
      .then((d) => {
        if (reqs.current[s] !== n) return
        if (s === "reviews") { setReviews(d); setReviewPage(page) }
        else {
          const list = Array.isArray(d) ? d : []
          if (s === "products") setProducts(list)
          else if (s === "portfolio") setPortfolio(list)
          else if (s === "blogs") setBlogs(list)
          else setCommunities(list)
        }
        setSec((x) => ({ ...x, [s]: "ok" }))
      })
      .catch(() => { if (reqs.current[s] === n) setSec((x) => ({ ...x, [s]: "error" })) })
  }

  useEffect(() => {
    let live = true
    setState("loading")
    setProfile(null)
    setReviews(null); setProducts([]); setPortfolio([]); setBlogs([]); setCommunities([])
    setSec(ALL_LOADING); setReviewPage(1)
    // Answers for the profile opened before this one are ignored
    for (const k of Object.keys(ALL_LOADING)) reqs.current[k] = (reqs.current[k] || 0) + 1

    apiRequest<any>(`/users/${encodeURIComponent(username)}`, { auth: false })
      .then((p) => {
        if (!live) return
        if (p?.isPublic === false) { setProfile(p); setState("private"); return }
        setProfile(p)
        setState("ok")
        // Open on the first tab with something in it, from the profile's own
        // counts, so the tab doesn't jump once the lists arrive (unless the
        // link asked for a tab)
        const c = p?._count || {}
        if (!askedTab) setTab(c.storeItems > 0 ? "store" : c.portfolioItems > 0 ? "portfolio" : p?.workerProfile?.totalRatings > 0 ? "reviews" : "store")
        for (const k of Object.keys(ALL_LOADING) as Section[]) loadSection(k)
      })
      .catch((e) => { if (live) setState(/not found/i.test(e?.message || "") ? "missing" : "error") })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

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
  const reviewTotal = reviews?.total ?? jobRatings
  // Store reviews have their own number
  const storeAvg = Number(reviews?.products?.average || 0)
  const storeTotal = Number(reviews?.products?.total || 0)

  useEffect(() => {
    document.title = state === "ok" ? `${name} (@${handle}) | OgaPay` : "Profile | OgaPay"
    return () => { document.title = "OgaPay" }
  }, [state, name, handle])

  const share = async () => {
    const url = `${window.location.origin}/user/${handle}`
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: `${name} on OgaPay`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch { /* cancelled */ }
  }

  const invite = () => {
    if (!me) { openSignIn({ redirect: `/user/${handle}` }); return }
    setInviteOpen(true)
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
    { icon: "ti-building-store", label: "Products", value: String(counts.storeItems ?? products.length) },
    { icon: "ti-users", label: "Communities", value: String(counts.communityMemberships ?? communities.length) },
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

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    // The profile's own counts until each list has loaded
    { key: "store", label: "Store", icon: "ti-building-store", count: sec.products === "ok" ? products.length : Number(counts.storeItems || 0) },
    { key: "portfolio", label: "Portfolio", icon: "ti-photo", count: sec.portfolio === "ok" ? portfolio.length : Number(counts.portfolioItems || 0) },
    { key: "reviews", label: "Reviews", icon: "ti-message-star", count: reviewTotal },
    { key: "communities", label: "Communities", icon: "ti-users", count: sec.communities === "ok" ? communities.length : Number(counts.communityMemberships || 0) },
  ]

  return (
    <Layout>
      <div className="up-wrap">
        <div className="up-crumb">
          <button className="tap" onClick={() => navigate(-1)}><i className="ti ti-arrow-left" aria-hidden="true" /> Back</button>
          <span>Public profile</span>
        </div>

        {/* ── Header ── */}
        <section className="up-card up-head">
          <div className="up-id">
            {isOurMedia(profile.avatarUrl, true)
              ? <img className={`up-avatar${profile.frame ? ' oga-frame' : ''}`} src={sized(profile.avatarUrl, 128, true)} alt="" />
              : <div className={`up-avatar${profile.frame ? ' oga-frame' : ''}`}>{(first[0] || handle[0] || "?").toUpperCase()}{last[0]?.toUpperCase() || ""}</div>}
            <div style={{ minWidth: 0 }}>
              <div className="up-eyebrow">Creator profile</div>
              <div className="up-name">
                <h1>{name}</h1>
                {profile.humanVerified && <span className="up-badge ok"><i className="ti ti-fingerprint" /> Human verified</span>}
                {profile.kycVerified && <span className="up-badge ok"><i className="ti ti-shield-check" /> ID verified</span>}
                {profile.posterProfile?.isVerified && <VerifiedBusinessMark label name={profile.posterProfile.verifiedName} />}
                {profile.premium && <PremiumMark label />}
              </div>
              <div className="up-handle">@{handle} · Joined {fmtDate(profile.createdAt, { month: "long", year: "numeric" })}</div>
              {profile.bio && <p className="up-bio">{profile.bio}</p>}
              {/* The longer "More about you" text from Edit profile */}
              {profile.about && (
                <details className="up-about">
                  <summary>More about {first || handle}</summary>
                  <p style={{ whiteSpace: "pre-line", margin: "6px 0 0", overflowWrap: "anywhere" }}>{profile.about}</p>
                </details>
              )}
              <div className="up-actions">
                {isMe ? (
                  <Link className="up-btn primary" to="/profile"><i className="ti ti-pencil" /> Edit profile</Link>
                ) : (
                  <Link className="up-btn primary" to={`/user/${handle}/hire`}><i className="ti ti-briefcase" /> Hire</Link>
                )}
                {!isMe && <button className="up-btn" onClick={invite}><i className="ti ti-user-plus" /> Invite</button>}
                {!isMe && <button className="up-btn" onClick={tip}><i className="ti ti-heart-handshake" /> Tip</button>}
                {!isMe && (
                  <button className={`up-btn up-compliment${complimented ? " on" : ""}`} onClick={compliment} aria-pressed={complimented} disabled={complimenting}>
                    <i className={`ti ${complimented ? "ti-heart-check" : "ti-heart"}`} /> {complimented ? "Complimented" : "Compliment"}
                  </button>
                )}
                <button className="up-btn" onClick={share}><i className={`ti ${shared ? "ti-check" : "ti-share"}`} /> {shared ? "Link copied" : "Share"}</button>
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

        {profile?.id && <CreatorAudiences userId={profile.id} />}

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

        {/* ── Tabs ── */}
        <div className="up-tabs-row">
          <div className="up-tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} className={`up-tab ${tab === t.key ? "on" : ""}`} onClick={() => setTab(t.key)}>
                <i className={`ti ${t.icon}`} /> {t.label} {t.count > 0 && <em>{t.count}</em>}
              </button>
            ))}
          </div>
          <button className="up-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><i className="ti ti-arrow-up" /> Profile</button>
        </div>

        {tab === "store" && (
          <section>
            <div className="up-sec-h"><h2>Products & services</h2><p>What {first || handle} offers in the OgaPay store.</p></div>
            {sec.products !== "ok" ? (
              <SectionState status={sec.products} noun="products" onRetry={() => loadSection("products")} />
            ) : products.length === 0 ? (
              <div className="up-empty"><i className="ti ti-building-store" />No products yet.</div>
            ) : (
              <div className="up-grid">
                {products.map((p) => (
                  <Link className="up-card up-item" to={`/store/${p.id}`} key={p.id}>
                    <div className="img"><ItemCover src={p.image} category={p.category} title={p.title} width={400} /></div>
                    <div className="body">
                      <div className="meta">{String(p.category || "").replace(/_/g, " ")} · {fmtDate(p.createdAt)}</div>
                      <h3>{p.title}</h3>
                      {p.description && <p>{p.description}</p>}
                      {(p.delivery || p.revisions != null) && (
                        <div className="meta" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                          {[p.delivery, p.revisions != null ? `${p.revisions} ${p.revisions === 1 ? 'revision' : 'revisions'}` : null].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      <div className="foot">
                        <b>{show(Number(p.price || 0), p.currency || "NGN")}</b>
                        {p.reviewsCount > 0 ? <span><Stars value={p.rating} /> <small style={{ color: "var(--text3)" }}>({p.reviewsCount})</small></span> : <span className="link">View details <i className="ti ti-arrow-right" /></span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "portfolio" && (
          <section>
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
          <section ref={reviewsRef} style={{ scrollMarginTop: 80 }}>
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
          <section>
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

        {/* ── Writing ── */}
        <section className="up-writing">
          <div className="up-eyebrow">Published writing</div>
          <div className="up-sec-h" style={{ marginTop: 4 }}><h2>From the creator</h2></div>
          {sec.blogs !== "ok" ? (
            <SectionState status={sec.blogs} noun="blogs" onRetry={() => loadSection("blogs")} />
          ) : blogs.length === 0 ? (
            <div className="up-empty"><i className="ti ti-writing" />No published blogs yet.</div>
          ) : (
            blogs.map((b) => (
              <Link className="up-post" to={`/blog/${b.slug || b.id}`} key={b.id}>
                <time>{fmtDate(b.publishedAt || b.createdAt)}</time>
                <div>
                  <h3>{b.title}</h3>
                  {b.excerpt && <p>{b.excerpt}</p>}
                  <span>Read story →</span>
                </div>
              </Link>
            ))
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
