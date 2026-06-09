import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { apiRequest } from "../lib/api"
import Footer from "../components/Footer"
import Drawer from "../components/Drawer"

const categories = ['All', 'News', 'Businesses', 'Freelancers', 'Case Studies']

const fallbackPosts: any[] = []

const badgeColors: Record<string, { bg: string; color: string }> = {
  News: { bg: '#E6F1FB', color: '#191C6B' },
  Businesses: { bg: '#EAF3DE', color: '#3B6D11' },
  Freelancers: { bg: '#191C6B', color: '#191C6B' },
  'Case Studies': { bg: '#FBEAF0', color: '#993556' },
}

function JoinCommunityTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 300 }}>
      <img src="/assets/join-community.jpg" alt="Join the Community" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(18,21,102,0.18)' : 'transparent', transition: 'background 0.3s' }} />
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
          Join The Community <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
    </div>
  )
}

function StartSellingTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick} style={{ background: '#4A1B3A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 280 }}>
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          Start Selling <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#E8A0B4', borderRadius: 10, transform: hovered ? 'rotate(-12deg) translate(-60px, 10px)' : 'rotate(-6deg) translate(-20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}><div style={{ height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: 6, marginBottom: 8 }} /><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} /><div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} /></div><div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div></div>
      </div>
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#F2C4D0', borderRadius: 10, transform: hovered ? 'rotate(12deg) translate(60px, 10px)' : 'rotate(6deg) translate(20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}><div style={{ height: 80, background: 'rgba(255,255,255,0.25)', borderRadius: 6, marginBottom: 8 }} /><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} /><div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} /></div><div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div></div>
      </div>
      <div style={{ position: 'relative', zIndex: 5, background: '#191C6B', borderRadius: 10, width: 140, height: 175, border: '3px solid #191C6B', transform: hovered ? 'scale(1.06) translateY(-6px)' : 'scale(1)', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '0.5rem' }}><div style={{ height: 90, background: '#ffffff', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🧑🏾‍💻</div><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 20, height: 20, borderRadius: '50%', background: '#191C6B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>OG</div><span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Chukwudi</span></div><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>5 ★</span></div><div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}><div style={{ width: '80%', height: '100%', background: '#ffffff', borderRadius: 2 }} /></div></div>
      </div>
    </div>
  )
}

function GrowBusinessTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick} style={{ background: '#191C6B', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 280 }}>
      <div style={{ position: 'absolute', top: 14, left: 14, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          Grow Your Business <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: hovered ? 'rotate(360deg)' : 'rotate(0deg)', transition: hovered ? 'transform 1.2s cubic-bezier(0.4,0,0.2,1)' : 'transform 0.6s ease' }}>
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="28" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="28" strokeDasharray="340 452" strokeDashoffset="113" strokeLinecap="round" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="28" strokeDasharray="68 452" strokeDashoffset="-227" strokeLinecap="round" />
          <circle cx="90" cy="90" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="18" />
          <circle cx="90" cy="90" r="44" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="18" strokeDasharray="220 276" strokeDashoffset="69" strokeLinecap="round" />
          <circle cx="90" cy="90" r="24" fill="rgba(255,255,255,0.15)" />
          <text x="90" y="96" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">↗</text>
        </svg>
      </div>
    </div>
  )
}

function GetInspiredTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#FFD6D6', height: '100%', minHeight: 300 }}>
      <img src="/assets/get-inspired.png" alt="Get Inspired" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(18,21,102,0.1)', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s' }} />
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
  const [subscribing, setSubscribing] = useState(false)
  const [search, setSearch] = useState('')
  const [apiPosts, setApiPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const navigate = useNavigate()
  const { isAuthed, user: authUser } = useAuth()
  const { theme, toggle } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [bookmarked, setBookmarked] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ogapay_bookmarked_posts') || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem('ogapay_bookmarked_posts', JSON.stringify(bookmarked))
  }, [bookmarked])

  const toggleBookmark = (id: string) => {
    setBookmarked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest<any>('/blog?limit=50')
        setApiPosts(res.posts || res.data || (Array.isArray(res) ? res : []))
      } catch { setApiPosts([]) }
      setLoading(false)
    })()
    const onFocus = () => {
      (async () => {
        try {
          const res = await apiRequest<any>('/blog?limit=50')
          setApiPosts(res.posts || res.data || (Array.isArray(res) ? res : []))
        } catch { setApiPosts([]) }
        setLoading(false)
      })()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authUser])

  const allPosts = apiPosts

  const filteredByCategory = showArticles && (activeCategory === 'All' ? allPosts : allPosts.filter((p: any) => p.category === activeCategory))

  const searchedArticles = search.trim()
    ? (filteredByCategory || []).filter((p: any) =>
        (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.excerpt || '').toLowerCase().includes(search.toLowerCase())
      )
    : filteredByCategory

  const popularArticles = [...allPosts]
    .sort((a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 3)

  const handleSubscribe = async () => {
    if (!email.trim()) return
    setSubscribing(true)
    try {
      await apiRequest('/blog/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email: email.trim() }) })
      setSubscribed(true)
    } catch {
      setSubscribed(true)
    }
    setSubscribing(false)
  }

  if (!showArticles) {
    return (
      <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <style>{`
          .blog-nav-link:hover { color: #191C6B !important; }
          .blog-cat-btn:hover { background: #f0f0f0 !important; }
          .blog-hero { background: #191C6B; min-height: 500px; padding: 80px 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; overflow: hidden; }
          @media (max-width: 768px) { .blog-hero { min-height: 360px; padding: 56px 24px; } }
        `}</style>
        <nav style={{ borderBottom: '1px solid #e5e5e5', padding: '0.875rem 2.5rem', display: 'flex', alignItems: 'center', gap: 20, background: 'var(--card)', position: 'sticky', top: 0, zIndex: 100 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ width: 28, height: 28, display: 'flex' }} dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" fill="none" width="28" height="28"><rect width="34" height="34" rx="6" fill="white"/><rect x="6.5" y="6.5" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 6.5H20.7C21.5 6.5 22.2 7.2 22.2 8V13.6H15V6.5Z" fill="black"/><path d="M23.4 6.5H26C29.2 6.5 31.2 8.5 31.2 11.7V13.6H23.4V6.5Z" fill="black"/><rect x="6.5" y="15" width="7.1" height="7.1" fill="black"/><rect x="15" y="15" width="7.1" height="7.1" fill="black"/><path d="M23.4 15H31.2V16.9C31.2 20.1 29.2 22.1 26 22.1H23.4V15Z" fill="black"/><rect x="6.5" y="23.4" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 23.4H20.7C21.5 23.4 22.2 24.1 22.2 24.9V29.2C22.2 30 21.5 30.7 20.7 30.7H15V23.4Z" fill="black"/></svg>` }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>OgaPay</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', background: 'var(--bg2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" style={{ verticalAlign: 'middle', flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input placeholder="Search by topic or keyword" style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#333', width: '100%' }} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && setShowArticles(true)} />
          </div>
          <button onClick={() => setShowArticles(true)} style={{ background: '#191C6B', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Search</button>
          <button onClick={toggle} style={{ background: "none", border: "1.5px solid #ddd", borderRadius: 8, width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer", color: "#333", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {theme === "dark" ? (<><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />)}
            </svg>
          </button>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          </div>
        </nav>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <div className="blog-hero">
          <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <h1 style={{ fontSize: 56, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 28, position: 'relative', maxWidth: 900, margin: '0 auto 32px' }}>
            Spark Your Next <span style={{ color: '#fff', fontStyle: 'italic' }}>Breakthrough</span>
          </h1>
          <button onClick={() => setShowArticles(true)} style={{ background: '#191C6B', color: '#fff', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '16px 48px', fontSize: 16, fontWeight: 700, cursor: 'pointer', position: 'relative' }}>View All Articles</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 500, position: 'relative' }}><JoinCommunityTile onClick={() => { setActiveCategory('All'); setShowArticles(true) }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 420 }}>
            <StartSellingTile onClick={() => { setActiveCategory('Freelancers'); setShowArticles(true) }} />
            <GrowBusinessTile onClick={() => { setActiveCategory('Businesses'); setShowArticles(true) }} />
          </div>
          <div style={{ height: 460, position: 'relative' }}><GetInspiredTile onClick={() => { setActiveCategory('Freelancers'); setShowArticles(true) }} /></div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <link rel="alternate" type="application/rss+xml" title="OgaPay Blog RSS" href="/blog/rss.xml" />
      <nav style={{ background: 'var(--card)', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ width: 26, height: 26, display: 'flex' }} dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" fill="none" width="26" height="26"><rect width="34" height="34" rx="6" fill="white"/><rect x="6.5" y="6.5" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 6.5H20.7C21.5 6.5 22.2 7.2 22.2 8V13.6H15V6.5Z" fill="black"/><path d="M23.4 6.5H26C29.2 6.5 31.2 8.5 31.2 11.7V13.6H23.4V6.5Z" fill="black"/><rect x="6.5" y="15" width="7.1" height="7.1" fill="black"/><rect x="15" y="15" width="7.1" height="7.1" fill="black"/><path d="M23.4 15H31.2V16.9C31.2 20.1 29.2 22.1 26 22.1H23.4V15Z" fill="black"/><rect x="6.5" y="23.4" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 23.4H20.7C21.5 23.4 22.2 24.1 22.2 24.9V29.2C22.2 30 21.5 30.7 20.7 30.7H15V23.4Z" fill="black"/></svg>` }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>OgaPay</span>
          </a>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ fontSize: 13, padding: '5px 14px', borderRadius: 20, border: '0.5px solid', borderColor: activeCategory === cat ? '#191C6B' : 'transparent', background: activeCategory === cat ? '#191C6B' : 'transparent', color: activeCategory === cat ? '#191C6B' : '#666', cursor: 'pointer', fontWeight: activeCategory === cat ? 600 : 400 }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/blog/rss.xml" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', color: '#666', cursor: 'pointer', textDecoration: 'none', padding: '6px 8px' }} title="RSS Feed">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="18" r="2"/><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/></svg>
            </a>
            {isAuthed && <button onClick={() => navigate('/blog/write')} style={{ fontSize: 13, background: '#191C6B', color: '#fff', padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Write Article</button>}
            <a href="/" style={{ fontSize: 13, background: '#191C6B', color: '#fff', padding: '6px 16px', borderRadius: 20, textDecoration: 'none', fontWeight: 500 }}>Go to OgaPay →</a>
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: '1.5px solid #ddd', borderRadius: 6, width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 2rem 0', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>
            {activeCategory === 'All' ? 'All articles' : activeCategory}
            <span style={{ fontSize: 13, color: '#666', marginLeft: 8 }}>({(searchedArticles || []).length})</span>
          </span>
          <button onClick={() => setShowArticles(false)} style={{ fontSize: 13, color: '#191C6B', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to home</button>
        </div>

        {popularArticles.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: '1rem' }}>Popular articles</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {popularArticles.map((post: any) => {
                const badge = badgeColors[post.category] || { bg: '#191C6B', color: '#191C6B' }
                const authorName = post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : post.authorName || 'OgaPay'
                const initials = post.authorInitials || ((post.author?.firstName?.[0] || '') + (post.author?.lastName?.[0] || '')) || 'OG'
                return (
                  <div key={`pop-${post.id}`} onClick={() => { if (post.slug) navigate(`/blog/${post.slug}`) }} style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
                    <div style={{ height: 140, background: post.color || post.coverColor || '#191C6B', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: post.coverImage ? `url(${post.coverImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      {!post.coverImage && <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
                    </div>
                    <div style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: 20, marginBottom: 6 }}>
                        {post.category}
                      </span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)' }}>
                        <span>{authorName}</span>
                        <span>·</span>
                        <span>{post.viewCount || 0} views</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: 'var(--card)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ height: 200, background: '#eee' }} />
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ height: 14, width: 80, background: '#eee', borderRadius: 99, marginBottom: 8 }} />
                  <div style={{ height: 16, width: '90%', background: '#eee', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 14, width: '70%', background: '#eee', borderRadius: 4, marginBottom: 10 }} />
                  <div style={{ height: 12, width: 120, background: '#eee', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {(searchedArticles || []).map((post: any) => {
              const badge = badgeColors[post.category] || { bg: '#191C6B', color: '#191C6B' }
              const authorName = post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : post.authorName || 'OgaPay'
              const initials = post.authorInitials || ((post.author?.firstName?.[0] || '') + (post.author?.lastName?.[0] || '')) || 'OG'
              const isBookmarked = bookmarked.includes(String(post.id))
              return (
                <div key={post.id} onClick={() => { if (post.slug) navigate(`/blog/${post.slug}`) }} style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s', position: 'relative' }}
                  onMouseEnter={e => { setHoveredCard(String(post.id)); e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { setHoveredCard(null); e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}>
                  <div style={{ height: 200, background: post.color || post.coverColor || '#191C6B', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: post.coverImage ? `url(${post.coverImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                    {!post.coverImage && (() => {
                      const cat = (post.category || '').toLowerCase();
                      const s = "rgba(255,255,255,0.3)";
                      if (cat === 'guides' || cat === 'tutorial') return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M12 6v7"/><path d="M9 9l3-3 3 3"/></svg>;
                      if (cat === 'features') return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
                      if (cat === 'updates' || cat === 'news') return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
                      if (cat === 'community') return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="9" r="3.5"/></svg>;
                      return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
                    })()}
                    <button onClick={e => { e.stopPropagation(); toggleBookmark(String(post.id)) }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: 6, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15, color: isBookmarked ? '#191C6B' : '#999', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                      {isBookmarked ? '\u2605' : '\u2606'}
                    </button>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 4, opacity: hoveredCard === String(post.id) ? 1 : 0, transition: 'opacity 0.2s' }}>
                      <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/blog/${post.slug}`) }} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: '#333' }} title="Copy link">
                        🔗
                      </button>
                      <button onClick={e => { e.stopPropagation(); window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(`${window.location.origin}/blog/${post.slug}`)}&text=${encodeURIComponent(post.title)}`, '_blank', 'noopener') }} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: '#333' }} title="Share on X">
                        𝕏
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '1.25rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>
                      {post.category}
                    </span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5, marginBottom: 10 }}>{post.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.excerpt}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)', flexWrap: 'wrap' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#191C6B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>{initials}</div>
                      <span>{authorName}</span>
                      <span>·</span>
                      <span>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : post.date}</span>
                      <span>·</span>
                      <span>{post.readTime || `${post.content ? Math.ceil(post.content.length / 500) : 1} min read`}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ background: '#191C6B', borderRadius: 16, padding: '2rem', textAlign: 'center', marginBottom: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Stay in the loop</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: '1.25rem' }}>Get the latest OgaPay tips, earnings stories, and platform updates.</p>
          {subscribed ? (
            <p style={{ color: '#ADDD5A', fontWeight: 600, fontSize: 14 }}>✓ You're subscribed!</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input type="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 20, border: 'none', fontSize: 13, background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }} />
              <button onClick={handleSubscribe} disabled={subscribing} style={{ background: '#ADDD5A', color: '#1a2a00', border: 'none', padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: subscribing ? 0.6 : 1 }}>Subscribe</button>
            </div>
          )}
        </div>
      </div>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Footer />
    </div>
  )
}
