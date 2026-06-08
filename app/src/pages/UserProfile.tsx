import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"
import Footer from "../components/Footer"
import Drawer from "../components/Drawer"

const API_BASE = "https://ogapay-production.up.railway.app/api/v1"

export default function UserProfile() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [blogs, setBlogs] = useState<any[]>([])

  useEffect(() => {
    if (!username) return
    setLoading(true)
    fetch(`${API_BASE}/users/public/${username}`)
      .then(r => r.json())
      .then(data => {
        if (data.success || data.data) {
          setProfile(data.data || data)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Fetch user blogs
    fetch(`${API_BASE}/users/public/${username}/blogs`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setBlogs(data.data)
        }
      })
      .catch(() => {})
  }, [username])

  const initials = profile?.firstName && profile?.lastName
    ? (profile.firstName[0] + profile.lastName[0]).toUpperCase()
    : username ? username[0].toUpperCase() : "?"

  return (
    <div data-theme={theme} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header className="nav">
        <div className="nav-inner">
          <a className="brand" href="/" style={{ color: "var(--text)" }}>OgaPay</a>
          <div style={{ fontSize: 13, color: "var(--text2)", marginLeft: 12 }}>
            {username && <>@{username}</>}
          </div>
          <div className="nav-actions" style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="icon-btn" onClick={toggle}><i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} /></button>
            <button className="icon-btn" onClick={() => setDrawerOpen(true)}><i className="ti ti-menu-2" /></button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px 60px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text3)" }}>
            <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--text)", borderRadius: "50%", animation: "spin .6s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 13 }}>Loading profile...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : profile ? (
          <>
            {/* Profile Card */}
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              {/* Cover */}
              <div style={{ height: 120, background: "linear-gradient(135deg, #191C6B, #191C6B)" }} />
              
              <div style={{ padding: "0 24px 24px" }}>
                {/* Avatar */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: -40 }}>
                  {profile.pfp_url ? (
                    <img src={profile.pfp_url} alt={profile.firstName || username} loading="lazy"
                      style={{ width: 72, height: 72, borderRadius: "50%", border: "4px solid var(--card)", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: "50%", border: "4px solid var(--card)", background: "#191C6B", color: "#fff", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 800 }}>
                      {initials}
                    </div>
                  )}
                  <div style={{ flex: 1, marginTop: 40 }}>
                    <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                      {profile.firstName} {profile.lastName}
                      {profile.verified_creator ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#191C6B", background: "#191C6B", padding: "2px 8px", borderRadius: 20, marginLeft: 8, verticalAlign: "middle" }}>✓ Verified Creator</span> : null}
                    </h1>
                    {profile.username && <p style={{ fontSize: 13, color: "var(--text2)", margin: "2px 0 0" }}>@{profile.username}</p>}
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginTop: 16, marginBottom: 0 }}>{profile.bio}</p>
                )}

                {/* Stats */}
                <div style={{ display: "flex", gap: 24, marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  {[
                    { label: "Challenges", value: profile.challenges_participated ?? profile.totalTasks ?? 0 },
                    { label: "Won", value: profile.challenges_won ?? 0 },
                    { label: "Reviews", value: profile.reviews ?? 0 },
                    { label: "Communities", value: profile.total_communities ?? 0 },
                  ].map(stat => (
                    <div key={stat.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{stat.value}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Blog Posts */}
            <div style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Blog Posts</h2>
              {blogs.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text3)", textAlign: "center", padding: "24px" }}>No blog posts yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {blogs.map((post: any) => (
                    <div key={post.id} style={{ padding: "14px 16px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer" }}
                      onClick={() => navigate(`/blog`)}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{post.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>{post.date || ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <i className="ti ti-user-off" style={{ fontSize: 40, color: "var(--text3)", display: "block", marginBottom: 12 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>User not found</h2>
            <p style={{ fontSize: 13, color: "var(--text2)" }}>The user @{username} does not exist or their profile is private.</p>
            <button onClick={() => navigate("/")} style={{ marginTop: 16, background: "var(--text)", color: "var(--bg)", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Go Home</button>
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Footer />
    </div>
  )
}
