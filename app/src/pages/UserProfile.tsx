import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { API_BASE } from "../lib/api"
import Layout from "../components/Layout"
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



type Tab = "profile" | "store" | "portfolio" | "challenges" | "reviews"

export default function UserProfile() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  // Layout provides Navbar, Drawer, Sidebar, Footer
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [blogs, setBlogs] = useState<any[]>([])
  const [userCommunities, setUserCommunities] = useState<any[]>([])
  const [showOgaScoreInfo, setShowOgaScoreInfo] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("profile")

  useEffect(() => {
    if (!username) return
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/users/${username}`).then(r => r.json()).catch(() => ({ success: false })),
      fetch(`${API_BASE}/users/${username}/blogs`).then(r => r.json()).catch(() => ({ success: false })),
      fetch(`${API_BASE}/users/${username}/communities`).then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([profileData, blogsData, communitiesData]) => {
      if (profileData.success || profileData.data) {
        setProfile(profileData.data || profileData)
      }
      if (blogsData.success && blogsData.data) {
        setBlogs(blogsData.data)
      }
      if (communitiesData.success && Array.isArray(communitiesData.data)) {
        setUserCommunities(communitiesData.data)
      }
      setLoading(false)
    }).catch((e) => { console.error(e); toast('Failed to load profile', 'error'); setLoading(false); })
  }, [username])

  const first = profile?.firstName ?? profile?.first_name
  const last = profile?.lastName ?? profile?.last_name
  const initials = first && last
    ? (first[0] + last[0]).toUpperCase()
    : username ? username[0].toUpperCase() : "?"

  const displayName = [first, last].filter(Boolean).join(" ") || `@${username}`

  const avgRating = profile?.averageRating ?? profile?.average_rating ?? 0
  const reviewCount = profile?.reviews ?? 0

  const renderStars = (rating: number) => {
    return [1, 2, 3, 4, 5].map(n => (
      <i
        key={n}
        className={`ti ${rating >= n ? "ti-star-filled" : rating >= n - 0.5 ? "ti-star-half-filled" : "ti-star"}`}
        style={{ fontSize: 13, color: rating >= n - 0.5 ? "#f59e0b" : "var(--border)" }}
      />
    ))
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "profile", label: "Profile", icon: "ti-user" },
    { key: "store", label: "Store", icon: "ti-building-store" },
    { key: "portfolio", label: "Portfolio", icon: "ti-file-description" },
    { key: "challenges", label: "Challenges", icon: "ti-star" },
    { key: "reviews", label: "Reviews", icon: "ti-message" },
  ]

  const prefs = (profile as any)?.preferences || {}
  const showEarnings = prefs.showEarnings === true
  const showRank = prefs.showRank === true

  const perfStats = [
    { label: "Compliments", value: profile?.compliments ?? 0, icon: "ti-heart" },
    { label: "Challenges", value: profile?.challenges_participated ?? profile?.totalTasks ?? 0, icon: "ti-bolt" },
    { label: "Wins", value: profile?.challenges_won ?? 0, icon: "ti-trophy" },
    { label: "Communities", value: profile?.total_communities ?? userCommunities.length ?? 0, icon: "ti-users" },
    ...(showEarnings ? [{ label: "Earnings", value: profile?.totalEarned ? '₦' + Number(profile.totalEarned).toLocaleString() : '₦0', icon: "ti-currency-dollar" }] : []),
    ...(showRank ? [{ label: "Rank", value: (profile as any)?.workerProfile?.level || 'Beginner', icon: "ti-trophy" }] : []),
    ...(showRank ? [{ label: "OgaScore", value: ((profile as any)?.workerProfile?.reputationScore || 0).toFixed(1), icon: "ti-star" }] : []),
  ]

  // ─── Styles ────────────────────────────────────────────────────────────────

  const S = {
    cover: {
      height: 110,
      background: "var(--accent)",
      position: "relative" as const,
      overflow: "hidden",
    } as React.CSSProperties,
    coverDots: {
      position: "absolute" as const,
      inset: 0,
      opacity: 0.1,
      backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
      backgroundSize: "20px 20px",
    } as React.CSSProperties,
    card: {
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 16,
      overflow: "hidden",
    } as React.CSSProperties,
    avatarWrap: {
      display: "flex",
      alignItems: "flex-end",
      gap: 14,
      marginTop: -38,
      padding: "0 20px",
    } as React.CSSProperties,
    avatarImg: {
      width: 76,
      height: 76,
      borderRadius: "50%",
      border: "4px solid var(--card)",
      objectFit: "cover" as const,
    } as React.CSSProperties,
    avatarInitials: {
      width: 76,
      height: 76,
      borderRadius: "50%",
      border: "4px solid var(--card)",
      background: "var(--accent)",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      fontSize: 26,
      fontWeight: 700,
      flexShrink: 0,
    } as React.CSSProperties,
    profileBody: {
      padding: "14px 20px 0",
    } as React.CSSProperties,
    nameRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap" as const,
      marginTop: 44,
    } as React.CSSProperties,
    verifiedBadge: {
      fontSize: 10,
      fontWeight: 600,
      color: "#fff",
      background: "var(--accent)",
      padding: "2px 8px",
      borderRadius: 999,
    } as React.CSSProperties,
    perfGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 10,
      marginTop: 16,
      paddingTop: 16,
      borderTop: "1px solid var(--border)",
    } as React.CSSProperties,
    statCard: {
      background: "var(--bg)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "12px 10px",
      display: "flex",
      alignItems: "center",
      gap: 10,
    } as React.CSSProperties,
    statIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      background: "var(--card)",
      border: "1px solid var(--border)",
      display: "grid",
      placeItems: "center",
      flexShrink: 0,
    } as React.CSSProperties,
    tabsRow: {
      display: "flex",
      borderBottom: "1px solid var(--border)",
      marginTop: 18,
      overflowX: "auto" as const,
    } as React.CSSProperties,
    tabContent: {
      padding: "20px",
    } as React.CSSProperties,
    sectionCard: {
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: "16px 18px",
      marginBottom: 14,
    } as React.CSSProperties,
    sectionHead: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      fontWeight: 700,
      marginBottom: 14,
      color: "var(--text)",
    } as React.CSSProperties,
    blogCard: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 14px",
      background: "var(--bg)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      cursor: "pointer",
      marginBottom: 8,
    } as React.CSSProperties,
    communityCard: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      background: "var(--bg)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      cursor: "pointer",
      marginBottom: 8,
    } as React.CSSProperties,
    emptyState: {
      textAlign: "center" as const,
      padding: "32px 20px",
      color: "var(--text3)",
      fontSize: 13,
    } as React.CSSProperties,
    viewBtn: {
      fontSize: 12,
      fontWeight: 600,
      padding: "5px 12px",
      border: "1px solid var(--border)",
      borderRadius: 8,
      background: "transparent",
      color: "var(--accent)",
      cursor: "pointer",
      fontFamily: "inherit",
    } as React.CSSProperties,
  }

  // ─── Tab content renderers ─────────────────────────────────────────────────

  const renderProfileTab = () => (
    <>
      {/* About Me */}
      {profile.bio && (
        <div style={S.sectionCard}>
          <div style={S.sectionHead}>
            <i className="ti ti-pencil" style={{ fontSize: 15 }} />
            About Me
          </div>
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>{profile.bio}</p>
        </div>
      )}



      {/* Blog Posts */}
      <div style={S.sectionCard}>
        <div style={S.sectionHead}>
          <i className="ti ti-writing-sign" style={{ fontSize: 15 }} />
          {username}&apos;s blogs
        </div>
        {blogs.length === 0 ? (
          <div style={S.emptyState}>
            <i className="ti ti-file-text" style={{ fontSize: 30, display: "block", marginBottom: 8 }} />
            No published blogs yet
          </div>
        ) : (
          blogs.map((post: any) => (
            <div key={post.id} style={S.blogCard} onClick={() => navigate(`/blog`)}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{post.title}</div>
                {post.date && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{post.date}</div>}
              </div>
              <i className="ti ti-arrow-right" style={{ fontSize: 15, color: "var(--text3)" }} />
            </div>
          ))
        )}
      </div>

      {/* Communities */}
      <div style={S.sectionCard}>
        <div style={S.sectionHead}>
          <i className="ti ti-users" style={{ fontSize: 15 }} />
          Communities
        </div>
        {userCommunities.length === 0 ? (
          <div style={S.emptyState}>
            <i className="ti ti-users-group" style={{ fontSize: 30, display: "block", marginBottom: 8 }} />
            No communities yet
          </div>
        ) : (
          userCommunities.map((c: any) => (
            <div key={c.id} style={S.communityCard} onClick={() => navigate("/communities/" + c.id)}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: c.accentColor || c.accent_color || "var(--accent)",
                display: "grid", placeItems: "center",
                fontSize: 13, fontWeight: 700, color: "#fff",
                flexShrink: 0, overflow: "hidden",
              }}>
                {(c.coverImage || c.cover_image)
                  ? <img loading="lazy" src={c.coverImage || c.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : c.initials || c.name?.slice(0, 2)?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  {c.name}
                  {c.role === "OWNER" && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: "var(--accent)", padding: "2px 6px", borderRadius: 999, letterSpacing: "0.03em" }}>
                      OWNER
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{c.memberCount ?? c.member_count} members</div>
              </div>
              <button
                style={S.viewBtn}
                onClick={e => { e.stopPropagation(); navigate("/communities/" + c.id) }}
              >
                View
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )

  const renderStoreTab = () => (
    <div style={S.sectionCard}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={S.sectionHead}>
          <i className="ti ti-building-store" style={{ fontSize: 15 }} />
          {username}&apos;s Store
        </div>
        <button style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5, color: "var(--text2)", background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>
          <i className="ti ti-share" style={{ fontSize: 13 }} /> Share
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>Browse unique products and services</p>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <div style={S.emptyState}>
          <i className="ti ti-package" style={{ fontSize: 30, display: "block", marginBottom: 8 }} />
          No products available
        </div>
      </div>
    </div>
  )

  const renderPortfolioTab = () => (
    <div style={S.sectionCard}>
      <div style={S.sectionHead}>
        <i className="ti ti-briefcase" style={{ fontSize: 15 }} />
        Portfolio
      </div>
      <div style={S.emptyState}>
        <i className="ti ti-file-off" style={{ fontSize: 30, display: "block", marginBottom: 8 }} />
        No portfolio items yet
      </div>
    </div>
  )

  const renderChallengesTab = () => (
    <div style={S.sectionCard}>
      <div style={S.sectionHead}>
        <i className="ti ti-star" style={{ fontSize: 15 }} />
        Challenge Participations
      </div>
      <div style={S.emptyState}>
        <i className="ti ti-medal" style={{ fontSize: 30, display: "block", marginBottom: 8 }} />
        No challenge participations yet
      </div>
    </div>
  )

  const renderReviewsTab = () => (
    <div style={S.sectionCard}>
      <div style={S.sectionHead}>
        <i className="ti ti-message" style={{ fontSize: 15 }} />
        Reviews
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--border)" }}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, color: "var(--text)" }}>{avgRating.toFixed(1)}</div>
          <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "center" }}>{renderStars(avgRating)}</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>Based on {reviewCount} reviews</div>
        </div>
        <div style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map(n => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "var(--text2)", width: 8 }}>{n}</span>
              <div style={{ flex: 1, height: 4, borderRadius: 999, background: "var(--border)" }} />
              <span style={{ fontSize: 11, color: "var(--text3)" }}>0</span>
            </div>
          ))}
        </div>
      </div>
      <div style={S.emptyState}>
        <i className="ti ti-message-off" style={{ fontSize: 30, display: "block", marginBottom: 8 }} />
        No reviews yet
      </div>
    </div>
  )

  const tabRenderers: Record<Tab, () => React.ReactNode> = {
    profile: renderProfileTab,
    store: renderStoreTab,
    portfolio: renderPortfolioTab,
    challenges: renderChallengesTab,
    reviews: renderReviewsTab,
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <Layout>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px 60px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text3)" }}>
            <div style={{
              width: 32, height: 32,
              border: "3px solid var(--border)", borderTopColor: "var(--text)",
              borderRadius: "50%", animation: "spin .6s linear infinite",
              margin: "0 auto 12px",
            }} />
            <p style={{ fontSize: 13 }}>Loading profile...</p>
          </div>
        ) : profile ? (
          <>
            {/* ── Profile Card ── */}
            <div style={S.card}>
              {/* Cover */}
              <div style={{...S.cover, background: (profile.coverUrl || profile.cover_url) ? `url(${(profile.coverUrl || profile.cover_url)}) center/cover no-repeat` : 'var(--accent)'}}>
                {!(profile.coverUrl || profile.cover_url) && <div style={S.coverDots} />}
              </div>

              <div style={S.profileBody}>
                {/* Avatar + name row */}
                <div style={S.avatarWrap}>
                  {profile.avatarUrl || profile.pfp_url || profile.avatar ? (
                    <img src={profile.avatarUrl || profile.pfp_url || profile.avatar} alt={profile.firstName || username} loading="lazy" style={S.avatarImg} />
                  ) : (
                    <div style={S.avatarInitials}>{initials}</div>
                  )}
                </div>

                <div style={{ padding: "0 0 0 2px" }}>
                  <div style={S.nameRow}>
                    <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: "var(--text)" }}>
                      {displayName}
                    </h1>
                    {profile.verified_creator && (
                      <span style={S.verifiedBadge}><i className="ti ti-circle-check" style={{marginRight:3}} /> Verified Creator</span>
                    )}
                    {/* Invite button far right */}
                    <button
                      onClick={async () => {
                        const url = `${window.location.origin}/u/${username}`
                        try {
                          await navigator.clipboard.writeText(url)
                          setInviteCopied(true)
                          setTimeout(() => setInviteCopied(false), 2000)
                        } catch {}
                      }}
                      style={{
                        marginLeft: "auto", fontSize: 12, fontWeight: 600,
                        padding: "6px 16px", border: "1px solid var(--border)",
                        borderRadius: 8, background: "transparent",
                        color: "var(--text)", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {inviteCopied ? 'Copied!' : 'Invite'}
                    </button>
                  </div>
                  {profile.username && (
                    <p style={{ fontSize: 13, color: "var(--text2)", margin: "2px 0 0" }}>@{profile.username}</p>
                  )}

                  {/* Star rating */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                    <div style={{ display: "flex", gap: 2 }}>{renderStars(avgRating)}</div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{avgRating.toFixed(1)}</span>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>Average rating · {reviewCount} reviews</span>
                  </div>

                  {/* Bio short line */}
                  {profile.bio && (
                    <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>
                      {profile.bio}
                    </p>
                  )}
                </div>

                {/* Performance Overview */}
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 18, marginBottom: 10 }}>
                    Performance Overview
                  </div>
                  <div style={S.perfGrid}>
                    {perfStats.map(stat => (
                      <div key={stat.label} style={S.statCard}>
                        <div style={S.statIcon}>
                          <i className={`ti ${stat.icon}`} style={{ fontSize: 15, color: "var(--text2)" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{stat.value}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>{stat.label}{stat.label === 'Compliments' && <InfoBtn text="Compliments are positive feedback given by other users. They reflect your reputation and trustworthiness on the platform." />}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={S.tabsRow}>
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      fontSize: 13,
                      padding: "10px 16px",
                      cursor: "pointer",
                      border: "none",
                      background: "transparent",
                      color: activeTab === tab.key ? "var(--accent)" : "var(--text2)",
                      borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
                      fontWeight: activeTab === tab.key ? 700 : 400,
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      fontFamily: "inherit",
                    }}
                  >
                    <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={S.tabContent}>
                {tabRenderers[activeTab]()}
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <i className="ti ti-user-off" style={{ fontSize: 40, color: "var(--text3)", display: "block", marginBottom: 12 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>User not found</h2>
            <p style={{ fontSize: 13, color: "var(--text2)" }}>The user @{username} does not exist or their profile is private.</p>
            <button
              onClick={() => navigate("/")}
              style={{ marginTop: 16, background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Go Home
            </button>
          </div>
        )}
      </div>

      {/* Layout provides Drawer and Footer */}

      {/* OgaScore Info Modal */}
      {showOgaScoreInfo && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setShowOgaScoreInfo(false)}
        >
          <div
            style={{ background: "var(--card)", borderRadius: 14, padding: 24, maxWidth: 460, width: "90%", position: "relative" }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowOgaScoreInfo(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "var(--text2)" }}
            >
              <i className="ti ti-x" />
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>What is OgaScore?</h2>
            <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, marginBottom: 12 }}>
              OgaScore is your reputation score on OgaPay. It reflects your trust level and activity on the platform. A higher score unlocks premium communities and higher-paying tasks.
            </p>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 8 }}>How to increase your OgaScore:</div>
            <ul style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.8, paddingLeft: 18, margin: "0 0 4px" }}>
              <li>Connect social accounts (LinkedIn +10, X +8, GitHub +8, Google +5, Telegram +5)</li>
              <li>Complete KYC/BVN verification (+20)</li>
              <li>Complete tasks on time</li>
              <li>Fill in your profile (bio, avatar, skills)</li>
              <li>Connect a Solana wallet</li>
              <li>Refer friends to OgaPay</li>
            </ul>
          </div>
        </div>
      )}
    </Layout>
  )
}
