import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import Footer from "../components/Footer"
import Drawer from "../components/Drawer"
import { apiRequest } from "../lib/api"

const categories = ['All', 'News', 'Businesses', 'Freelancers', 'Case Studies']

const badgeColors: Record<string, { bg: string; color: string }> = {
  News: { bg: '#E6F1FB', color: '#185FA5' },
  Businesses: { bg: '#EAF3DE', color: '#3B6D11' },
  Freelancers: { bg: '#EEEDFE', color: '#534AB7' },
  'Case Studies': { bg: '#FBEAF0', color: '#993556' },
}

// Tile 1: Join The Community — photo of woman at cozy desk
function JoinCommunityTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 300 }}
    >
      <img src="/assets/join-community.jpg" alt="Join the Community" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(10,10,10,0.18)' : 'transparent', transition: 'background 0.3s' }} />
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
          Join The Community <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
    </div>
  )
}

// Tile 2: Start Selling — earner cards (kept from original)
function StartSellingTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ background: '#4A1B3A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 280 }}
    >
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          Start Selling <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
      {/* Card behind-left */}
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#E8A0B4', borderRadius: 10, transform: hovered ? 'rotate(-12deg) translate(-60px, 10px)' : 'rotate(-6deg) translate(-20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} /><div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} /></div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div>
        </div>
      </div>
      {/* Card behind-right */}
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#F2C4D0', borderRadius: 10, transform: hovered ? 'rotate(12deg) translate(60px, 10px)' : 'rotate(6deg) translate(20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.25)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} /><div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} /></div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div>
        </div>
      </div>
      {/* Front card */}
      <div style={{ position: 'relative', zIndex: 5, background: '#0a0a0a', borderRadius: 10, width: 140, height: 175, border: '3px solid #0a0a0a', transform: hovered ? 'scale(1.06) translateY(-6px)' : 'scale(1)', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '0.5rem' }}>
          <div style={{ height: 90, background: '#ffffff', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🧑🏾‍💻</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>OG</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Chukwudi</span>
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>5 ★</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}><div style={{ width: '80%', height: '100%', background: '#ffffff', borderRadius: 2 }} /></div>
        </div>
      </div>
    </div>
  )
}

// Tile 3: Grow Your Business — spinning donut on #0a0a0a
function GrowBusinessTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 280 }}
    >
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          Grow Your Business <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg
          width="180" height="180" viewBox="0 0 180 180"
          style={{ transform: hovered ? 'rotate(360deg)' : 'rotate(0deg)', transition: hovered ? 'transform 1.2s cubic-bezier(0.4,0,0.2,1)' : 'transform 0.6s ease' }}
        >
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="28" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="28"
            strokeDasharray="340 452" strokeDashoffset="113" strokeLinecap="round" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="28"
            strokeDasharray="68 452" strokeDashoffset="-227" strokeLinecap="round" />
          <circle cx="90" cy="90" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="18" />
          <circle cx="90" cy="90" r="44" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="18"
            strokeDasharray="220 276" strokeDashoffset="69" strokeLinecap="round" />
          <circle cx="90" cy="90" r="24" fill="rgba(255,255,255,0.15)" />
          <text x="90" y="96" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">↗</text>
        </svg>
      </div>
    </div>
  )
}

// Tile 4: Get Inspired — adventure illustration (kept from original)
function GetInspiredTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#FFD6D6', height: '100%', minHeight: 300 }}
    >
      <img src="/assets/get-inspired.png" alt="Get Inspired" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.1)', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s' }} />
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          Get Inspired <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
    </div>
  )
}

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [showArticles, setShowArticles] = useState(false)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [search, setSearch] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subError, setSubError] = useState('')
  const [allPosts, setAllPosts] = useState<any[] | null>(null)
  const navigate = useNavigate()
  const { isAuthed } = useAuth()
  const { theme, toggle } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Published posts from the API (this page used to show eight made-up posts
  // plus drafts kept in the browser's localStorage)
  useEffect(() => {
    let live = true
    apiRequest<any>('/blog?limit=100', { auth: false })
      .then((res) => { if (live) setAllPosts(res?.posts || []) })
      .catch(() => { if (live) setAllPosts([]) })
    return () => { live = false }
  }, [])

  const q = search.trim().toLowerCase()
  const filteredArticles = (allPosts || [])
    .filter((p: any) => activeCategory === 'All' || p.category === activeCategory)
    .filter((p: any) => !q || `${p.title} ${p.excerpt || ''} ${(p.tags || []).join(' ')}`.toLowerCase().includes(q))
  const popular = !q && activeCategory === 'All' && (allPosts || []).length >= 6
    ? [...(allPosts || [])].sort((a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 3)
    : []

  const subscribe = async () => {
    if (!email.trim() || subscribing) return
    setSubscribing(true); setSubError('')
    try {
      await apiRequest('/blog/newsletter/subscribe', { method: 'POST', auth: false, body: JSON.stringify({ email: email.trim() }) })
      setSubscribed(true)
    } catch (e: any) {
      setSubError(e?.message || "Couldn't subscribe. Try again.")
    }
    setSubscribing(false)
  }

  if (!showArticles) {
    return (
      <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <style>{`
          .blog-nav-link:hover { color: #0a0a0a !important; }
          .blog-cat-btn:hover { background: #f0f0f0 !important; }
          .blog-hero {
            background: #0a0a0a;
            min-height: 500px;
            padding: 80px 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          @media (max-width: 768px) {
            .blog-hero {
              min-height: 360px;
              padding: 56px 24px;
            }
          }
        `}</style>

        {/* Nav — minimal like Fiverr blog */}
        <nav style={{ borderBottom: '1px solid #e5e5e5', padding: '0.875rem 2.5rem', display: 'flex', alignItems: 'center', gap: 20, background: 'var(--card)', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => setShowArticles(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>blog.</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', background: 'var(--bg2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" style={{ verticalAlign: 'middle', flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input
              placeholder="Search by topic or keyword"
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#333', width: '100%' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setShowArticles(true)}
            />
          </div>
          <button onClick={() => setShowArticles(true)} style={{ background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Search</button>
          <button onClick={toggle} style={{ background: "none", border: "1.5px solid #ddd", borderRadius: 8, width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer", color: "#333", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {theme === "dark" ? (
                <><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>
              ) : (
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              )}
            </svg>
          </button>
          {/* Hamburger — right side like Fiverr */}
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          </div>
        </nav>

        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {/* HERO — full width, #0a0a0a background, centered text */}
        <div className="blog-hero">
          {/* Subtle background circles */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <h1 style={{ fontSize: 56, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 28, position: 'relative', maxWidth: 900, margin: '0 auto 32px' }}>
            Spark Your Next{' '}
            <span style={{ color: '#fff', fontStyle: 'italic' }}>Breakthrough</span>
          </h1>
          <button
            onClick={() => setShowArticles(true)}
            style={{ background: '#0a0a0a', color: '#fff', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '16px 48px', fontSize: 16, fontWeight: 700, cursor: 'pointer', position: 'relative' }}
          >
            View All Articles
          </button>
        </div>

        {/* 4 CATEGORY TILES — stacked full width like Fiverr */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Tile 1: Join The Community */}
          <div style={{ height: 500, position: 'relative' }}>
            <JoinCommunityTile onClick={() => { setActiveCategory('All'); setShowArticles(true) }} />
          </div>

          {/* Tiles 2+3: side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 420 }}>
            <StartSellingTile onClick={() => { setActiveCategory('Freelancers'); setShowArticles(true) }} />
            <GrowBusinessTile onClick={() => { setActiveCategory('Businesses'); setShowArticles(true) }} />
          </div>

          {/* Tile 4: Get Inspired */}
          <div style={{ height: 460, position: 'relative' }}>
            <GetInspiredTile onClick={() => { setActiveCategory('Freelancers'); setShowArticles(true) }} />
          </div>
        </div>

        <Footer />
      </div>
    )
  }

  // Articles view
  return (
    <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <nav style={{ background: 'var(--card)', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <button onClick={() => setShowArticles(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>blog.</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', background: 'var(--bg2)', minWidth: 0, flex: '1 1 200px', maxWidth: 320 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input placeholder="Search articles" aria-label="Search articles" value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', width: '100%', minWidth: 0 }} />
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ fontSize: 13, padding: '5px 14px', borderRadius: 20, border: '0.5px solid', borderColor: activeCategory === cat ? '#0a0a0a' : 'transparent', background: activeCategory === cat ? '#EEEDFE' : 'transparent', color: activeCategory === cat ? '#0a0a0a' : '#666', cursor: 'pointer', fontWeight: activeCategory === cat ? 600 : 400 }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAuthed && <button onClick={() => navigate('/blog/write')} style={{ fontSize: 13, background: '#0a0a0a', color: '#fff', padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Write Article</button>}
            <a href="/" style={{ fontSize: 13, background: '#0a0a0a', color: '#fff', padding: '6px 16px', borderRadius: 20, textDecoration: 'none', fontWeight: 500 }}>Go to OgaPay →</a>
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: '1.5px solid #ddd', borderRadius: 6, width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 2rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>
            {activeCategory === 'All' ? 'All articles' : activeCategory}
            <span style={{ fontSize: 13, color: 'var(--text3)', marginLeft: 8 }}>({filteredArticles.length})</span>
          </span>
          <button onClick={() => setShowArticles(false)} style={{ fontSize: 13, color: 'var(--text)', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to home</button>
        </div>

        {allPosts === null ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>Loading articles…</div>
        ) : filteredArticles.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text2)', fontSize: 14, border: '1px dashed var(--border)', borderRadius: 16, marginBottom: '1.5rem' }}>
            {q ? `No articles match "${search.trim()}".` : allPosts.length === 0 ? 'No articles yet. Check back soon.' : `No ${activeCategory} articles yet.`}
            {isAuthed && <div style={{ marginTop: 12 }}><button onClick={() => navigate('/blog/write')} style={{ fontSize: 13, background: 'var(--text)', color: 'var(--bg)', padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600 }}>Write the first one</button></div>}
          </div>
        ) : (
          <>
            {popular.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 1rem' }}>Most read</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {popular.map((post: any, i: number) => (
                    <button key={post.id} onClick={() => navigate(`/blog/${post.slug}`)} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left', background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text3)', lineHeight: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.45 }}>{post.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {filteredArticles.map((post: any) => {
                const badge = badgeColors[post.category] || { bg: '#EEEDFE', color: '#534AB7' }
                const author = post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || post.author.username : 'OgaPay'
                const initials = author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'OG'
                const date = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                return (
                  <a key={post.id} href={`/blog/${post.slug}`} onClick={(e) => { e.preventDefault(); navigate(`/blog/${post.slug}`) }} style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 200, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {post.coverImage
                        ? <img src={post.coverImage} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                      {post.category && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>{post.category}</span>}
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.45, margin: '0 0 8px' }}>{post.title}</p>
                      {post.excerpt && <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 10px' }}>{post.excerpt}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', flexWrap: 'wrap' }}>
                        {post.author?.avatarUrl
                          ? <img src={post.author.avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                          : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--text)', color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>{initials}</div>}
                        <span>{author}</span>
                        <span>·</span>
                        <span>{date}</span>
                        {post.viewCount > 0 && <><span>·</span><span>{post.viewCount.toLocaleString()} views</span></>}
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          </>
        )}

        {/* Newsletter */}
        <div style={{ background: '#0a0a0a', borderRadius: 16, padding: '2rem', textAlign: 'center', marginBottom: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Stay in the loop</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: '1.25rem' }}>Get the latest OgaPay tips, earnings stories, and platform updates.</p>
          {subscribed ? (
            <p style={{ color: '#ADDD5A', fontWeight: 600, fontSize: 14 }}>✓ You're subscribed!</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input type="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && subscribe()} aria-label="Email address"
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 20, border: 'none', fontSize: 13, background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }} />
              <button onClick={subscribe} disabled={subscribing} style={{ background: '#ADDD5A', color: '#1a2a00', border: 'none', padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{subscribing ? 'Subscribing…' : 'Subscribe'}</button>
            </div>
          )}
          {subError && <p style={{ color: '#fca5a5', fontSize: 13, margin: '10px 0 0' }}>{subError}</p>}
        </div>
        </div>

        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <Footer />
      </div>
  )
}
