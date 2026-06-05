import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const categories = ['All', 'News', 'Businesses', 'Freelancers', 'Case Studies']

const posts = [
  { id: 1, category: 'Freelancers', title: 'How Nigerian freelancers are earning 5x more with OgaPay tasks', excerpt: 'Discover how thousands of earners across West Africa are turning micro-tasks into meaningful income.', author: 'OgaPay Team', authorInitials: 'OG', date: 'June 4, 2026', readTime: '5 min read', color: '#534AB7' },
  { id: 2, category: 'News', title: 'OgaPay launches instant wallet-to-bank withdrawals across 12 African countries', excerpt: 'Earners can now withdraw directly to their local bank accounts in seconds.', author: 'OgaPay Team', authorInitials: 'OG', date: 'June 3, 2026', readTime: '3 min read', color: '#185FA5' },
  { id: 3, category: 'Businesses', title: "How small businesses use OgaPay's store to reach 50,000+ active buyers", excerpt: 'A deep dive into how merchants are growing revenue with the OgaPay marketplace.', author: 'Adaeze N.', authorInitials: 'AN', date: 'June 1, 2026', readTime: '6 min read', color: '#3B6D11' },
  { id: 4, category: 'Freelancers', title: 'Top 10 task categories paying the most on OgaPay this month', excerpt: "From social media tasks to crypto verification — here's where the money is.", author: 'Emeka J.', authorInitials: 'EJ', date: 'May 28, 2026', readTime: '4 min read', color: '#854F0B' },
  { id: 5, category: 'Case Studies', title: "From zero to ₦800k/month: Chukwudi's story using the OgaPay worker portal", excerpt: "One earner's journey from side hustle to full-time income on OgaPay.", author: 'Fatima B.', authorInitials: 'FB', date: 'May 25, 2026', readTime: '8 min read', color: '#993556' },
  { id: 6, category: 'News', title: "OgaPay communities hit 200,000 members — here's what's driving the growth", excerpt: "How peer-to-peer communities inside OgaPay became the platform's fastest growing feature.", author: 'OgaPay Team', authorInitials: 'OG', date: 'May 22, 2026', readTime: '3 min read', color: '#534AB7' },
  { id: 7, category: 'Freelancers', title: 'OgaPay Vault explained: how to save and grow your earnings safely', excerpt: 'Everything you need to know about putting your OgaPay earnings to work.', author: 'Ngozi A.', authorInitials: 'NA', date: 'May 19, 2026', readTime: '5 min read', color: '#0F6E56' },
  { id: 8, category: 'Case Studies', title: '5 businesses that scaled to 7 figures using OgaPay campaigns', excerpt: 'Real numbers, real results from brands that bet on OgaPay early.', author: 'Fatima B.', authorInitials: 'FB', date: 'May 15, 2026', readTime: '6 min read', color: '#993556' },
]

const badgeColors: Record<string, { bg: string; color: string }> = {
  News: { bg: '#E6F1FB', color: '#185FA5' },
  Businesses: { bg: '#EAF3DE', color: '#3B6D11' },
  Freelancers: { bg: '#EEEDFE', color: '#534AB7' },
  'Case Studies': { bg: '#FBEAF0', color: '#993556' },
}

function DonutCard({ onNavigate }: { onNavigate: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: '#1F8CFF', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', borderRadius: 0 }}
    >
      {/* Hover button */}
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onNavigate} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          Grow Your Business <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>→</span>
        </button>
      </div>

      {/* Spinning donut */}
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg
          width="180" height="180" viewBox="0 0 180 180"
          style={{ transform: hovered ? 'rotate(360deg)' : 'rotate(0deg)', transition: hovered ? 'transform 1.2s cubic-bezier(0.4,0,0.2,1)' : 'transform 0.6s ease' }}
        >
          {/* Outer ring background */}
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="28" />
          {/* Dark green arc ~75% */}
          <circle cx="90" cy="90" r="72" fill="none" stroke="#1a5a9e" strokeWidth="28"
            strokeDasharray="340 452" strokeDashoffset="113" strokeLinecap="round" />
          {/* Light green arc ~15% */}
          <circle cx="90" cy="90" r="72" fill="none" stroke="#93C5FD" strokeWidth="28"
            strokeDasharray="68 452" strokeDashoffset="-227" strokeLinecap="round" />
          {/* Inner ring */}
          <circle cx="90" cy="90" r="44" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="18" />
          <circle cx="90" cy="90" r="44" fill="none" stroke="#1a5a9e" strokeWidth="18"
            strokeDasharray="220 276" strokeDashoffset="69" strokeLinecap="round" />
          {/* Center button */}
          <circle cx="90" cy="90" r="24" fill="#1a5a9e" />
          <text x="90" y="96" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">↗</text>
        </svg>
      </div>
    </div>
  )
}

function WorkerPhotoCard() {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#c8b89a' }}
    >
      {/* Simulated photo with illustration */}
      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #d4c4a8 0%, #b8a888 40%, #8B7355 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {/* Desk scene illustration */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '100%' }}>
          {/* Window light */}
          <div style={{ position: 'absolute', top: 0, left: '20%', width: '35%', height: '60%', background: 'rgba(255,255,230,0.25)', borderRadius: '0 0 50% 50%' }} />
          {/* Person silhouette */}
          <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', width: 80, height: 110 }}>
            {/* Head */}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#5C3A1E', margin: '0 auto 4px' }} />
            {/* Body */}
            <div style={{ width: 60, height: 60, background: '#f0ede8', borderRadius: '8px 8px 0 0', margin: '0 auto', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, opacity: 0.3, background: 'repeating-linear-gradient(45deg, #888 0px, #888 1px, transparent 1px, transparent 6px)' }} />
            </div>
          </div>
          {/* Desk */}
          <div style={{ position: 'absolute', bottom: '10%', left: '10%', right: '10%', height: 12, background: '#8B6914', borderRadius: 4 }} />
          {/* Laptop on desk */}
          <div style={{ position: 'absolute', bottom: '18%', left: '52%', width: 50, height: 36 }}>
            <div style={{ width: 50, height: 30, background: '#2D2D2D', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 38, height: 22, background: '#534AB7', borderRadius: 2, opacity: 0.9 }} />
            </div>
            <div style={{ width: 54, height: 4, background: '#444', borderRadius: '0 0 4px 4px', marginLeft: -2 }} />
          </div>
          {/* Plant */}
          <div style={{ position: 'absolute', bottom: '18%', right: '15%' }}>
            <div style={{ width: 20, height: 28, background: '#2D6A2D', borderRadius: '50% 50% 0 0' }} />
            <div style={{ width: 24, height: 16, background: '#8B6914', borderRadius: '0 0 4px 4px', marginLeft: -2 }} />
          </div>
        </div>
      </div>
      {/* Hover overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(83,74,183,0.15)', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s' }} />
    </div>
  )
}

function EarnerCard() {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: '#4A1B3A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
    >
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, textDecoration: 'none' }}>
          Start Earning <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '1px 5px', fontSize: 13 }}>→</span>
        </a>
      </div>
      {/* Card behind-left */}
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#E8A0B4', borderRadius: 10, transform: hovered ? 'rotate(-12deg) translate(-60px, 10px)' : 'rotate(-6deg) translate(-20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(255,255,255,0.15) 10px,rgba(255,255,255,0.15) 11px),repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(255,255,255,0.15) 10px,rgba(255,255,255,0.15) 11px)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} /><div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} /></div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div>
        </div>
      </div>
      {/* Card behind-right */}
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#F2C4D0', borderRadius: 10, transform: hovered ? 'rotate(12deg) translate(60px, 10px)' : 'rotate(6deg) translate(20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(255,255,255,0.2) 10px,rgba(255,255,255,0.2) 11px),repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(255,255,255,0.2) 10px,rgba(255,255,255,0.2) 11px)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.25)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} /><div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} /></div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div>
        </div>
      </div>
      {/* Front card */}
      <div style={{ position: 'relative', zIndex: 5, background: '#ADDD5A', borderRadius: 10, width: 140, height: 175, border: '3px solid #ADDD5A', transform: hovered ? 'scale(1.06) translateY(-6px)' : 'scale(1)', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '0.5rem' }}>
          <div style={{ height: 90, background: '#1a2a4a', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🧑🏾‍💻</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#7F77DD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>OG</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1a2a00' }}>Chukwudi</span>
            </div>
            <span style={{ fontSize: 10, color: '#3B6D11', fontWeight: 700 }}>5 ★</span>
          </div>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.15)', borderRadius: 2 }}><div style={{ width: '80%', height: '100%', background: '#1a2a4a', borderRadius: 2 }} /></div>
        </div>
      </div>
    </div>
  )
}

function AdventureCard({ onNavigate }: { onNavigate: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#FFD6D6' }}
      onClick={onNavigate}
    >
      {/* Illustrated adventure scene */}
      <svg width="100%" height="100%" viewBox="0 0 700 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        {/* Sky */}
        <rect width="700" height="300" fill="#FFE8E8" />
        {/* Pink mountain */}
        <ellipse cx="420" cy="180" rx="220" ry="160" fill="#E8789A" />
        <ellipse cx="380" cy="200" rx="180" ry="130" fill="#D4567A" />
        {/* Wavy path on mountain */}
        <path d="M380 120 Q400 140 390 160 Q380 180 400 200" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M395 115 Q410 130 408 148" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Left big green leaf */}
        <ellipse cx="80" cy="220" rx="120" ry="90" fill="#2D8A2D" transform="rotate(-20 80 220)" />
        <ellipse cx="60" cy="240" rx="90" ry="70" fill="#3DAA3D" transform="rotate(-15 60 240)" />
        {/* Right green bush */}
        <ellipse cx="620" cy="240" rx="100" ry="70" fill="#2D8A2D" />
        <ellipse cx="640" cy="250" rx="80" ry="60" fill="#4ABB4A" />
        {/* Lime green leaves foreground */}
        <ellipse cx="150" cy="280" rx="80" ry="50" fill="#ADDD5A" transform="rotate(10 150 280)" />
        <ellipse cx="550" cy="285" rx="70" ry="45" fill="#ADDD5A" transform="rotate(-10 550 285)" />
        {/* Person */}
        <g transform="translate(280, 120)">
          {/* Backpack */}
          <rect x="18" y="30" width="28" height="36" rx="5" fill="#2D8A2D" />
          <rect x="22" y="34" width="8" height="12" rx="2" fill="#E8789A" />
          <rect x="34" y="34" width="8" height="12" rx="2" fill="#E8789A" />
          {/* Body */}
          <rect x="10" y="24" width="32" height="40" rx="6" fill="#E8956A" />
          {/* Arm reaching */}
          <path d="M42 32 Q60 28 72 22" stroke="#E8956A" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Hand with map */}
          <rect x="68" y="10" width="30" height="22" rx="3" fill="#ADDD5A" />
          <path d="M72 16 Q80 20 88 16" stroke="#2D3A1E" strokeWidth="1.5" fill="none" />
          <path d="M72 21 Q80 25 88 21" stroke="#2D3A1E" strokeWidth="1.5" fill="none" />
          {/* Head */}
          <circle cx="26" cy="14" r="14" fill="#5C3A1E" />
          {/* Hair */}
          <path d="M12 12 Q14 2 26 0 Q38 2 40 12" fill="#2D1A0E" />
        </g>
        {/* Stars */}
        <circle cx="500" cy="40" r="3" fill="white" opacity="0.8" />
        <circle cx="480" cy="60" r="2" fill="white" opacity="0.6" />
        <circle cx="520" cy="55" r="2" fill="white" opacity="0.7" />
      </svg>

      {/* Hover overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(83,74,183,0.12)', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s' }} />

      {/* Hover label */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.25s ease' }}>
        <span style={{ background: '#fff', color: '#534AB7', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8 }}>Explore Freelancers →</span>
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
  const [allPosts, setAllPosts] = useState<any[]>([])
  const filteredPosts = posts.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory) &&
    (search === '' || p.title.toLowerCase().includes(search.toLowerCase()))
  )

  useEffect(() => {
    const userPosts = (() => {
      try {
        const stored = JSON.parse(localStorage.getItem('ogapay_user_posts') || '[]')
        return stored
          .filter((p: any) => p.status === 'published')
          .map((p: any) => ({
            id: `u${p.id}`,
            category: p.category,
            title: p.title,
            excerpt: p.body.split('\n').find((l: string) => l.trim() && !l.startsWith('-') && !l.startsWith('#')) || p.body.substring(0, 120),
            author: p.authorName,
            authorInitials: p.authorInitials,
            date: p.date,
            readTime: p.body.length > 500 ? `${Math.ceil(p.body.length / 500)} min read` : '1 min read',
            color: p.coverColor,
            isUserPost: true,
          }))
      } catch { return [] }
    })()
    setAllPosts([...posts, ...userPosts])
  }, [])

  const filteredArticles = showArticles && (activeCategory === 'All' ? allPosts : allPosts.filter(p => p.category === activeCategory))

  if (!showArticles) {
    return (
      <div style={{ fontFamily: 'inherit', background: '#fff', minHeight: '100vh', color: '#1a1a1a' }}>
        <style>{`.blog-nav-link:hover{color:#534AB7!important}`}</style>

        {/* Nav */}
        <nav style={{ borderBottom: '1px solid #e5e5e5', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#7F77DD', color: '#fff', fontSize: 13, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>OgaPay</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>blog.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 380, border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', background: '#fafafa' }}>
            <span style={{ fontSize: 14, color: '#aaa' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" style={{verticalAlign:"middle"}}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></span>
            <input placeholder="Search by topic or keyword" style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#333', width: '100%' }} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && setShowArticles(true)} />
          </div>
          <button onClick={() => setShowArticles(true)} style={{ background: '#7F77DD', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Search</button>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {['News', 'Businesses', 'Freelancers', 'Case Studies'].map(cat => (
              <span key={cat} className="blog-nav-link" style={{ fontSize: 14, color: '#333', cursor: 'pointer', fontWeight: 500 }} onClick={() => { setActiveCategory(cat); setShowArticles(true) }}>{cat}</span>
            ))}
            <a href="/" style={{ fontSize: 13, border: '1px solid #333', borderRadius: 6, padding: '6px 14px', color: '#333', textDecoration: 'none', fontWeight: 500 }}>Go to OgaPay.com</a>
          </div>
        </nav>

        {/* Bento grid — 4 panels like Fiverr */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gridTemplateRows: '420px 300px', gap: 0, maxHeight: 720 }}>

          {/* LEFT big hero — spans both rows */}
          <div style={{ gridRow: '1 / 3', background: '#1a2a4a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(31,140,255,0.06)' }} />
            <div style={{ position: 'absolute', top: 40, right: 40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(31,140,255,0.08)' }} />
            <h1 style={{ fontSize: 52, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.15, marginBottom: 20, position: 'relative', maxWidth: 520 }}>
              Spark Your Next{' '}
              <span style={{ color: '#1F8CFF', fontStyle: 'italic' }}>Breakthrough</span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 400, lineHeight: 1.7, marginBottom: 36, position: 'relative' }}>
              Tips, stories, and insights for earners, businesses, and freelancers building on OgaPay.
            </p>
            <button onClick={() => setShowArticles(true)} style={{ background: '#1F8CFF', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 36px', fontSize: 15, fontWeight: 700, cursor: 'pointer', position: 'relative' }}>
              View All Articles
            </button>
          </div>

          {/* TOP RIGHT — spinning donut */}
          <DonutCard onNavigate={() => { setActiveCategory('Businesses'); setShowArticles(true) }} />

          {/* BOTTOM RIGHT — split into worker photo + earner cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
            <WorkerPhotoCard />
            <EarnerCard />
          </div>
        </div>

        {/* BOTTOM FULL WIDTH — adventure illustration */}
        <div style={{ height: 300 }}>
          <AdventureCard onNavigate={() => { setActiveCategory('Freelancers'); setShowArticles(true) }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'inherit', background: '#f5f5f3', minHeight: '100vh', color: '#1a1a1a' }}>
      <nav style={{ background: '#fff', borderBottom: '0.5px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <button onClick={() => setShowArticles(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ background: '#7F77DD', color: '#fff', fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>OgaPay</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>blog.</span>
          </button>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ fontSize: 13, padding: '5px 14px', borderRadius: 20, border: '0.5px solid', borderColor: activeCategory === cat ? '#7F77DD' : 'transparent', background: activeCategory === cat ? '#EEEDFE' : 'transparent', color: activeCategory === cat ? '#534AB7' : '#666', cursor: 'pointer', fontWeight: activeCategory === cat ? 600 : 400 }}>
                {cat}
              </button>
            ))}
          </div>
          {isAuthed && <button onClick={() => navigate('/blog/write')} style={{ fontSize: 13, background: '#7F77DD', color: '#fff', padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 500 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:4}}><path d="M12 5v14M5 12h14"/></svg>Write Article</button>}<a href="/" style={{ fontSize: 13, background: '#7F77DD', color: '#fff', padding: '6px 16px', borderRadius: 20, textDecoration: 'none', fontWeight: 500 }}>Go to OgaPay →</a>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>
            {activeCategory === 'All' ? 'All articles' : activeCategory}
            <span style={{ fontSize: 13, color: '#666', marginLeft: 8 }}>({filteredArticles.length})</span>
          </span>
          <button onClick={() => setShowArticles(false)} style={{ fontSize: 13, color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to home</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {filteredArticles.map(post => {
            const badge = badgeColors[post.category] || { bg: '#EEEDFE', color: '#534AB7' }
            return (
              <div key={post.id} style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: 160, background: post.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
                <div style={{ padding: '1rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>{post.category}{post.isUserPost && <span style={{fontSize:9,background:badge.color,color:badge.bg,borderRadius:99,padding:'1px 5px'}}>Member</span>}</span>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.5, marginBottom: 10 }}>{post.title}</p>
                  <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 10 }}>{post.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#7F77DD', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>{post.authorInitials}</div>
                    <span>{post.author}</span><span>·</span><span>{post.date}</span><span>·</span><span>{post.readTime}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ background: '#534AB7', borderRadius: 16, padding: '2rem', textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Stay in the loop</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: '1.25rem' }}>Get the latest OgaPay tips, earnings stories, and platform updates.</p>
          {subscribed ? (
            <p style={{ color: '#1F8CFF', fontWeight: 600, fontSize: 14 }}>✓ You're subscribed!</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input type="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && email.trim() && setSubscribed(true)}
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 20, border: 'none', fontSize: 13, background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }} />
              <button onClick={() => email.trim() && setSubscribed(true)} style={{ background: '#1F8CFF', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Subscribe</button>
            </div>
          )}
        </div>

        <div style={{ borderTop: '0.5px solid #e0e0e0', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#666', flexWrap: 'wrap', gap: 8 }}>
          <span>© 2026 OgaPay. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 16 }}>
            {['News', 'Businesses', 'Freelancers', 'Case Studies'].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#666', cursor: 'pointer', padding: 0 }}>{cat}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
