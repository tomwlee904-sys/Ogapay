import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import Layout from "../components/Layout"
import InviteToCommunity from "../components/profile/InviteToCommunity"
import { apiRequest } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { openSignIn } from "../lib/signin"
import "../styles/profile-public.css"

type Tab = "store" | "portfolio" | "reviews" | "communities"

type Review = {
  id: string
  kind: "job" | "product"
  rating: number
  text: string | null
  date: string
  subject: { id?: string; title: string }
  reviewer: { username: string; name: string; avatarUrl: string | null } | null
}
type ReviewData = { average: number; total: number; distribution: Record<string, number>; reviews: Review[] }

const LEVEL_NAMES: Record<string, string> = {
  BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced", EXPERT: "Expert", LEGEND: "Legend",
}

const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) =>
  new Date(d).toLocaleDateString("en-US", opts)
const money = (n: number, cur = "NGN") =>
  cur === "NGN" ? "₦" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }) : `${Number(n).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${cur}`

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

  const [profile, setProfile] = useState<any>(null)
  const [state, setState] = useState<"loading" | "ok" | "private" | "missing" | "error">("loading")
  const [reviews, setReviews] = useState<ReviewData | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [blogs, setBlogs] = useState<any[]>([])
  const [communities, setCommunities] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>("store")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    let live = true
    setState("loading")
    setProfile(null)
    setReviews(null); setProducts([]); setPortfolio([]); setBlogs([]); setCommunities([])
    const get = <T,>(path: string, fallback: T) => apiRequest<T>(path, { auth: false }).catch(() => fallback)
    const u = encodeURIComponent(username)

    apiRequest<any>(`/users/${u}`, { auth: false })
      .then((p) => {
        if (!live) return
        if (p?.isPublic === false) { setProfile(p); setState("private"); return }
        setProfile(p)
        setState("ok")
        Promise.all([
          get<ReviewData | null>(`/users/public/${u}/reviews?limit=50`, null),
          get<any[]>(`/users/public/${u}/products`, []),
          get<any[]>(`/users/public/${u}/portfolio`, []),
          get<any[]>(`/users/public/${u}/blogs`, []),
          get<any[]>(`/users/public/${u}/communities`, []),
        ]).then(([r, pr, pf, bl, cm]) => {
          if (!live) return
          setReviews(r)
          setProducts(Array.isArray(pr) ? pr : [])
          setPortfolio(Array.isArray(pf) ? pf : [])
          setBlogs(Array.isArray(bl) ? bl : [])
          setCommunities(Array.isArray(cm) ? cm : [])
          // Open on the first tab that has something to show
          if (!(Array.isArray(pr) && pr.length)) {
            if (Array.isArray(pf) && pf.length) setTab("portfolio")
            else if (r?.total) setTab("reviews")
          }
        })
      })
      .catch((e) => { if (live) setState(/not found/i.test(e?.message || "") ? "missing" : "error") })
    return () => { live = false }
  }, [username])

  const first = profile?.firstName || ""
  const last = profile?.lastName || ""
  const name = [first, last].filter(Boolean).join(" ") || profile?.username || username
  const handle = profile?.username || username
  const isMe = !!me?.username && me.username.toLowerCase() === handle.toLowerCase()
  const wp = profile?.workerProfile || {}
  const counts = profile?._count || {}
  const avg = reviews?.total ? reviews.average : Number(wp.avgRating || 0)
  const reviewTotal = reviews?.total ?? Number(wp.totalRatings || 0)

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

  // ── States ─────────────────────────────────────────────────────────────
  if (state !== "ok") {
    return (
      <Layout>
        <div className="up-wrap">
          <div className="up-crumb">
            <button onClick={() => navigate(-1)}><i className="ti ti-arrow-left" /> Back</button>
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
  const stats: { icon: string; label: string; value: string; sub?: string }[] = [
    { icon: "ti-briefcase", label: "Jobs done", value: String(wp.tasksCompleted ?? 0), sub: wp.tasksCompleted ? `${Math.round(wp.successRate || 0)}% success rate` : undefined },
    profile?.preferences?.showRank
      ? { icon: "ti-trophy", label: "Rank", value: LEVEL_NAMES[wp.level] || "Beginner", sub: `OgaScore ${profile?.ogaScore ?? 0}` }
      : { icon: "ti-calendar", label: "Member since", value: fmtDate(profile.createdAt, { month: "short", year: "numeric" }) },
    { icon: "ti-building-store", label: "Products", value: String(counts.storeItems ?? products.length) },
    { icon: "ti-users", label: "Communities", value: String(counts.communityMemberships ?? communities.length) },
  ]
  if (profile?.preferences?.showEarnings && wp.totalEarned != null) {
    stats.push({ icon: "ti-coin", label: "Earned", value: money(Number(wp.totalEarned)) })
  }

  const skills: string[] = Array.isArray(wp.skills) ? wp.skills : []
  const categories: string[] = Array.isArray(wp.categories) ? wp.categories.map((c: string) => c.replace(/_/g, " ").toLowerCase()) : []
  const hasAbout = skills.length > 0 || categories.length > 0 || wp.isAvailable

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: "store", label: "Store", icon: "ti-building-store", count: products.length },
    { key: "portfolio", label: "Portfolio", icon: "ti-photo", count: portfolio.length },
    { key: "reviews", label: "Reviews", icon: "ti-message-star", count: reviewTotal },
    { key: "communities", label: "Communities", icon: "ti-users", count: communities.length },
  ]

  return (
    <Layout>
      <div className="up-wrap">
        <div className="up-crumb">
          <button onClick={() => navigate(-1)}><i className="ti ti-arrow-left" /> Back</button>
          <span>Public profile</span>
        </div>

        {/* ── Header ── */}
        <section className="up-card up-head">
          <div className="up-id">
            {profile.avatarUrl
              ? <img className="up-avatar" src={profile.avatarUrl} alt="" />
              : <div className="up-avatar">{(first[0] || handle[0] || "?").toUpperCase()}{last[0]?.toUpperCase() || ""}</div>}
            <div style={{ minWidth: 0 }}>
              <div className="up-eyebrow">Creator profile</div>
              <div className="up-name">
                <h1>{name}</h1>
                {profile.humanVerified && <span className="up-badge ok"><i className="ti ti-fingerprint" /> Human verified</span>}
                {profile.kycVerified && <span className="up-badge ok"><i className="ti ti-shield-check" /> ID verified</span>}
              </div>
              <div className="up-handle">@{handle} · Joined {fmtDate(profile.createdAt, { month: "long", year: "numeric" })}</div>
              {profile.bio && <p className="up-bio">{profile.bio}</p>}
              <div className="up-actions">
                {isMe ? (
                  <Link className="up-btn primary" to="/profile"><i className="ti ti-pencil" /> Edit profile</Link>
                ) : (
                  <Link className="up-btn primary" to={`/user/${handle}/hire`}><i className="ti ti-briefcase" /> Hire</Link>
                )}
                {!isMe && <button className="up-btn" onClick={invite}><i className="ti ti-user-plus" /> Invite</button>}
                <button className="up-btn" onClick={share}><i className={`ti ${shared ? "ti-check" : "ti-share"}`} /> {shared ? "Link copied" : "Share"}</button>
              </div>
            </div>
          </div>

          <div className="up-rating">
            <div className="up-eyebrow">Average rating</div>
            <div className="n">{avg.toFixed(1)}<small>/ 5</small></div>
            <Stars value={avg} />
            <div className="c">{reviewTotal} {reviewTotal === 1 ? "review" : "reviews"}</div>
          </div>

          <div className="up-stats">
            {stats.map((s) => (
              <div className="up-stat" key={s.label}>
                <div className="l"><i className={`ti ${s.icon}`} /> {s.label}</div>
                <div className="v">{s.value}</div>
                {s.sub && <div className="s">{s.sub}</div>}
              </div>
            ))}
          </div>
        </section>

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
            {products.length === 0 ? (
              <div className="up-empty"><i className="ti ti-building-store" />No products yet.</div>
            ) : (
              <div className="up-grid">
                {products.map((p) => (
                  <Link className="up-card up-item" to={`/store/${p.id}`} key={p.id}>
                    <div className="img">{p.image ? <img src={p.image} alt="" loading="lazy" /> : <i className="ti ti-package" />}</div>
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
                        <b>{money(p.price, p.currency)}</b>
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
            {portfolio.length === 0 ? (
              <div className="up-empty"><i className="ti ti-photo" />No portfolio items yet.</div>
            ) : (
              <div className="up-grid">
                {portfolio.map((it) => (
                  <div className="up-card up-item" key={it.id}>
                    {it.imageUrl && <div className="img"><img src={it.imageUrl} alt="" loading="lazy" /></div>}
                    <div className="body">
                      <h3>{it.title}</h3>
                      {it.description && <p>{it.description}</p>}
                      {it.url && (
                        <div className="foot">
                          <a href={it.url} target="_blank" rel="noopener noreferrer nofollow">Open link <i className="ti ti-external-link" /></a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "reviews" && (
          <section>
            <div className="up-sec-h"><h2>Reviews</h2><p>Ratings from job creators and store buyers.</p></div>
            {!reviews || reviews.total === 0 ? (
              <div className="up-empty"><i className="ti ti-message-star" />No reviews yet.</div>
            ) : (
              <>
                <div className="up-card up-rev-sum">
                  <div>
                    <div className="n">{reviews.average.toFixed(1)}</div>
                    <Stars value={reviews.average} />
                    <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{reviews.total} {reviews.total === 1 ? "review" : "reviews"}</div>
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
                {reviews.reviews.map((r) => (
                  <article className="up-card up-rev" key={r.id}>
                    <div className="who">
                      {r.reviewer?.avatarUrl ? <img src={r.reviewer.avatarUrl} alt="" /> : <span className="ph">{(r.reviewer?.name || "?")[0].toUpperCase()}</span>}
                      <div style={{ minWidth: 0 }}>
                        {r.reviewer ? <Link to={`/user/${r.reviewer.username}`}>{r.reviewer.name}</Link> : <b>OgaPay user</b>}
                        <small>{fmtDate(r.date)}</small>
                      </div>
                      <span style={{ marginLeft: "auto" }}><Stars value={r.rating} /></span>
                    </div>
                    <div className="subj">
                      {r.kind === "product" ? "Bought " : "Job: "}
                      {r.kind === "product" && r.subject.id ? <Link to={`/store/${r.subject.id}`}>{r.subject.title}</Link> : r.subject.title}
                    </div>
                    {r.text && <p>{r.text}</p>}
                  </article>
                ))}
              </>
            )}
          </section>
        )}

        {tab === "communities" && (
          <section>
            <div className="up-sec-h"><h2>Communities</h2><p>Where {first || handle} hangs out.</p></div>
            {communities.length === 0 ? (
              <div className="up-empty"><i className="ti ti-users" />Not in any community yet.</div>
            ) : (
              <div className="up-list">
                {communities.map((c) => (
                  <Link className="up-card up-row" to={`/communities/${c.id}`} key={c.id}>
                    <div className="ic" style={{ background: c.accentColor || "var(--text)" }}>
                      {c.coverImage ? <img src={c.coverImage} alt="" loading="lazy" /> : c.initials}
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
          {blogs.length === 0 ? (
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

      {inviteOpen && <InviteToCommunity username={handle} name={first || handle} onClose={() => setInviteOpen(false)} />}
    </Layout>
  )
}
