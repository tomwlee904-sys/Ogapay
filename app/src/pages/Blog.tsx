import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Layout from "../components/Layout"
import { apiRequest } from "../lib/api"
import { openSignIn } from "../lib/signin"
import { sized } from '../lib/img'

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
      <img src="/assets/join-community.jpg" alt="Join the Community" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
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
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 <i className="ti ti-star" aria-hidden="true" style={{ fontSize: "0.95em", verticalAlign: "-0.1em" }} /></div>
        </div>
      </div>
      {/* Card behind-right */}
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#F2C4D0', borderRadius: 10, transform: hovered ? 'rotate(12deg) translate(60px, 10px)' : 'rotate(6deg) translate(20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.25)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} /><div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} /></div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 <i className="ti ti-star" aria-hidden="true" style={{ fontSize: "0.95em", verticalAlign: "-0.1em" }} /></div>
        </div>
      </div>
      {/* Front card */}
      <div style={{ position: 'relative', zIndex: 5, background: '#0a0a0a', borderRadius: 10, width: 140, height: 175, border: '3px solid #0a0a0a', transform: hovered ? 'scale(1.06) translateY(-6px)' : 'scale(1)', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '0.5rem' }}>
          <div style={{ height: 90, background: '#ffffff', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}><i className="ti ti-user-code" aria-hidden="true" style={{ color: '#0a0a0a' }} /></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>OG</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Chukwudi</span>
            </div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>5 <i className="ti ti-star" aria-hidden="true" style={{ fontSize: "0.95em", verticalAlign: "-0.1em" }} /></span>
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
      <img src="/assets/get-inspired.png" alt="Get Inspired" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
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
  const [sort, setSort] = useState<'featured' | 'newest'>('featured')
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [search, setSearch] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subError, setSubError] = useState('')
  const [allPosts, setAllPosts] = useState<any[] | null>(null)
  const navigate = useNavigate()
  const { isAuthed } = useAuth()

  // Published posts from the API (this page used to show eight made-up posts
  // plus drafts kept in the browser's localStorage)
  useEffect(() => {
    let live = true
    apiRequest<any>('/blog?limit=100', { auth: false })
      .then((res) => { if (live) setAllPosts(res?.posts || []) })
      .catch(() => { if (live) setAllPosts([]) })
    return () => { live = false }
  }, [])

  const posts = allPosts || []
  // Category chips only when posts actually have categories
  const usedCategories = categories.filter((c) => c === 'All' || posts.some((p: any) => p.category === c))
  const q = search.trim().toLowerCase()
  const when = (p: any) => new Date(p.publishedAt || p.createdAt || 0).getTime()
  const filteredArticles = posts
    .filter((p: any) => activeCategory === 'All' || p.category === activeCategory)
    .filter((p: any) => !q || `${p.title} ${p.excerpt || ''} ${(p.tags || []).join(' ')}`.toLowerCase().includes(q))
    .slice()
    .sort((a: any, b: any) => sort === 'newest' ? when(b) - when(a) : (b.viewCount || 0) - (a.viewCount || 0) || when(b) - when(a))

  const write = () => { if (isAuthed) navigate('/blog/write'); else openSignIn({ redirect: '/blog/write' }) }

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

  return (
    <Layout>
      <style>{`
        .bl{max-width:calc(var(--container) + 2 * var(--gutter));margin:0 auto;padding:var(--page-top) var(--gutter) 40px}
        .bl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}
        .bl-eyebrow{margin:0;font:400 9px/1.5 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.07em;text-transform:uppercase;color:var(--text3)}
        .bl-title{margin:8px 0 0;font-size:var(--fs-title);line-height:1.12;font-weight:600;letter-spacing:var(--tracking-tight);color:var(--text)}
        .bl-sub{margin:8px 0 0;font-size:13px;line-height:1.75;color:var(--text2)}
        .bl-write{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 14px;border:0;border-radius:10px;background:var(--text);color:var(--bg);font:500 12px/1 inherit;cursor:pointer;white-space:nowrap;flex-shrink:0;margin-top:24px}
        .bl-write i{font-size:15px}
        .bl-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:40px;padding-bottom:18px;border-bottom:1px solid var(--border)}
        .bl-bar h2{margin:0;font-size:18px;line-height:1.4;font-weight:600;letter-spacing:-.035em;color:var(--text)}
        .bl-count{display:block;margin-top:4px;font:400 10px/1.5 'JetBrains Mono',ui-monospace,monospace;color:var(--text3)}
        .bl-tools{display:flex;align-items:center;gap:10px}
        .bl-search{display:flex;align-items:center;gap:8px;height:44px;padding:0 12px;border:1px solid var(--border);border-radius:12px;background:var(--card);width:220px}
        .bl-search i{color:var(--text3);font-size:15px}
        .bl-search input{border:0;background:none;outline:none;font:400 12px inherit;color:var(--text);width:100%;min-width:0}
        .bl-seg{display:flex;gap:2px;padding:4px;border-radius:12px;background:var(--bg2)}
        .bl-seg button{height:36px;padding:0 15px;border:0;border-radius:8px;background:none;font:500 12px/1 inherit;color:var(--text2);cursor:pointer}
        .bl-seg button.on{background:var(--card);color:var(--text);box-shadow:0 1px 2px rgba(0,0,0,.06)}
        .bl-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:16px}
        .bl-chips button{height:32px;padding:0 12px;border:1px solid var(--border);border-radius:999px;background:none;font:500 12px/1 inherit;color:var(--text2);cursor:pointer}
        .bl-chips button.on{background:var(--text);border-color:var(--text);color:var(--bg)}
        .bl-tiles{margin-top:48px;border-radius:16px;overflow:hidden}
        @media (max-width:768px){
          .bl-head{flex-direction:column;gap:0}
          .bl-write{margin-top:16px}
          .bl-bar{flex-direction:column;align-items:stretch;margin-top:28px}
          .bl-tools{flex-direction:column;align-items:stretch}
          .bl-search{width:auto}
          .bl-seg button{flex:1}
          .bl-tiles .bl-pair{grid-template-columns:1fr !important;height:auto !important}
        }
      `}</style>

      <div className="bl">
        {/* Header, after wurk.fun's blog */}
        <header className="bl-head">
          <div>
            <p className="bl-eyebrow">The OgaPay blog</p>
            <h1 className="bl-title">Stories worth sharing.</h1>
            <p className="bl-sub">Ideas, guides and earning stories from the OgaPay community.</p>
          </div>
          <button className="bl-write" onClick={write}><i className="ti ti-pencil" /> Write a blog</button>
        </header>

        <div className="bl-bar">
          <div>
            <h2>{sort === 'featured' ? 'Featured blogs' : 'Newest blogs'}</h2>
            <span className="bl-count">{allPosts === null ? 'Loading…' : `${filteredArticles.length} ${filteredArticles.length === 1 ? 'story' : 'stories'}`}</span>
          </div>
          <div className="bl-tools">
            <label className="bl-search"><i className="ti ti-search" /><input placeholder="Search stories" aria-label="Search stories" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
            <div className="bl-seg" role="tablist" aria-label="Sort stories">
              <button role="tab" aria-selected={sort === 'featured'} className={sort === 'featured' ? 'on' : ''} onClick={() => setSort('featured')}>Featured</button>
              <button role="tab" aria-selected={sort === 'newest'} className={sort === 'newest' ? 'on' : ''} onClick={() => setSort('newest')}>Newest</button>
            </div>
          </div>
        </div>

        {usedCategories.length > 1 && (
          <div className="bl-chips">
            {usedCategories.map((cat) => <button key={cat} className={activeCategory === cat ? 'on' : ''} onClick={() => setActiveCategory(cat)}>{cat}</button>)}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          {allPosts === null ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text3)', fontSize: 14 }}>Loading stories…</div>
          ) : filteredArticles.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text2)', fontSize: 14, border: '1px dashed var(--border)', borderRadius: 16 }}>
              {q ? `No stories match "${search.trim()}".` : posts.length === 0 ? 'No stories yet.' : `No ${activeCategory} stories yet.`}
              <div style={{ marginTop: 12 }}><button onClick={write} style={{ fontSize: 13, background: 'var(--text)', color: 'var(--bg)', padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600 }}>Write the first one</button></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '1.5rem' }}>
              {filteredArticles.map((post: any) => {
                const badge = badgeColors[post.category] || { bg: '#EEEDFE', color: '#534AB7' }
                const author = post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || post.author.username : 'OgaPay'
                const initials = author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'OG'
                const date = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                return (
                  <a key={post.id} href={`/blog/${post.slug}`} onClick={(e) => { e.preventDefault(); navigate(`/blog/${post.slug}`) }} style={{ background: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ aspectRatio: '16 / 9', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {post.coverImage
                        ? <img src={sized(post.coverImage, 640)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                      {post.category && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>{post.category}</span>}
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.45, margin: '0 0 8px' }}>{post.title}</p>
                      {post.excerpt && <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 10px' }}>{post.excerpt}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', flexWrap: 'wrap' }}>
                        {post.author?.avatarUrl
                          ? <img src={sized(post.author.avatarUrl, 22, true)} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
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
          )}
        </div>

        {/* Explore tiles (kept from the old landing screen) */}
        <div className="bl-tiles" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 420, position: 'relative' }}>
            <JoinCommunityTile onClick={() => navigate('/communities')} />
          </div>
          <div className="bl-pair" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 360 }}>
            <StartSellingTile onClick={() => navigate('/store')} />
            <GrowBusinessTile onClick={() => navigate('/create')} />
          </div>
          <div style={{ height: 380, position: 'relative' }}>
            <GetInspiredTile onClick={() => { setSort('featured'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
          </div>
        </div>

        {/* Newsletter */}
        <div style={{ background: '#0a0a0a', borderRadius: 16, padding: '2rem', textAlign: 'center', marginTop: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Stay in the loop</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: '1.25rem' }}>Get the latest OgaPay tips, earnings stories, and platform updates.</p>
          {subscribed ? (
            <p style={{ color: '#ADDD5A', fontWeight: 600, fontSize: 14 }}><i className="ti ti-circle-check" aria-hidden="true" /> You're subscribed.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input type="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && subscribe()} aria-label="Email address"
                style={{ flex: 1, minWidth: 200, height: 'var(--ctl-h)', padding: '0 14px', borderRadius: 'var(--r-ctl)', border: '1px solid rgba(255,255,255,0.18)', fontSize: 14, background: 'rgba(255,255,255,0.1)', color: '#fff' }} />
              <button onClick={subscribe} disabled={subscribing} style={{ background: '#fff', color: '#0a0a0a', border: 'none', height: 'var(--ctl-h)', padding: '0 18px', borderRadius: 'var(--r-ctl)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{subscribing ? 'Subscribing…' : 'Subscribe'}</button>
            </div>
          )}
          {subError && <p style={{ color: '#fca5a5', fontSize: 13, margin: '10px 0 0' }}>{subError}</p>}
        </div>
      </div>
    </Layout>
  )
}
