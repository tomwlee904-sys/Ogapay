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

// Tile 1: Join The Community — photo of woman at cozy desk
function JoinCommunityTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 200 }}
    >
      {/* Warm cozy desk scene */}
      <svg width="100%" height="100%" viewBox="0 0 700 220" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        {/* Warm background wall */}
        <rect width="700" height="220" fill="#F5EDD6" />
        {/* Window light */}
        <rect x="30" y="0" width="120" height="160" rx="4" fill="#D8EAF5" opacity="0.6" />
        <rect x="35" y="5" width="110" height="150" rx="3" fill="#C8DFF0" opacity="0.5" />
        <line x1="90" y1="5" x2="90" y2="155" stroke="#B0CBE0" strokeWidth="2" opacity="0.7" />
        <line x1="35" y1="80" x2="145" y2="80" stroke="#B0CBE0" strokeWidth="2" opacity="0.7" />
        {/* Plants on windowsill */}
        <rect x="38" y="145" width="18" height="14" rx="2" fill="#8B6914" />
        <ellipse cx="47" cy="138" rx="14" ry="18" fill="#2D7A2D" />
        <ellipse cx="53" cy="133" rx="10" ry="14" fill="#3D9A3D" />
        <rect x="65" y="148" width="14" height="12" rx="2" fill="#8B6914" />
        <ellipse cx="72" cy="142" rx="10" ry="13" fill="#2D8A2D" />
        {/* Desk surface */}
        <rect x="0" y="165" width="700" height="20" rx="0" fill="#C8A05A" />
        <rect x="0" y="182" width="700" height="38" fill="#B8904A" />
        {/* Laptop */}
        <rect x="280" y="110" width="160" height="54" rx="6" fill="#2A2A2A" />
        <rect x="286" y="116" width="148" height="44" rx="3" fill="#121566" />
        {/* Screen glow */}
        <rect x="290" y="119" width="80" height="10" rx="2" fill="rgba(255,120,60,0.6)" opacity="0.8" />
        <rect x="290" y="132" width="100" height="6" rx="2" fill="rgba(100,180,255,0.5)" />
        <rect x="290" y="141" width="60" height="6" rx="2" fill="rgba(100,180,255,0.3)" />
        <rect x="250" y="163" width="220" height="5" rx="2" fill="#444" />
        {/* Laptop stand */}
        <rect x="330" y="163" width="60" height="4" rx="2" fill="#888" />
        {/* Notebook and pen */}
        <rect x="150" y="152" width="80" height="16" rx="2" fill="#2A2A2A" />
        <rect x="153" y="155" width="74" height="10" rx="1" fill="#333" />
        <line x1="235" y1="154" x2="248" y2="162" stroke="#C0A060" strokeWidth="3" strokeLinecap="round" />
        {/* Coffee mug */}
        <rect x="460" y="148" width="36" height="20" rx="4" fill="#F0EDE8" />
        <path d="M496 153 Q508 153 508 160 Q508 167 496 167" stroke="#DDD" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Candle */}
        <rect x="140" y="145" width="20" height="22" rx="3" fill="#2A2A2A" />
        <ellipse cx="150" cy="143" rx="4" ry="6" fill="#FF8C00" opacity="0.9" />
        <ellipse cx="150" cy="141" rx="2" ry="4" fill="#FFD700" opacity="0.8" />
        {/* Person — seen from back, natural hair, cream sweater */}
        {/* Chair */}
        <rect x="310" y="175" width="100" height="8" rx="4" fill="#CCCCCC" />
        <rect x="330" y="183" width="60" height="37" rx="3" fill="#DDDDDD" />
        {/* Body/sweater */}
        <rect x="295" y="90" width="130" height="80" rx="12" fill="#F0EDE5" />
        {/* Floral design on back */}
        <ellipse cx="390" cy="120" rx="18" ry="22" fill="none" stroke="#CCBBAA" strokeWidth="1.5" opacity="0.6" />
        <circle cx="390" cy="108" r="4" fill="#D4A0A0" opacity="0.5" />
        <circle cx="402" cy="120" r="3" fill="#D4A0A0" opacity="0.4" />
        <circle cx="378" cy="120" r="3" fill="#D4A0A0" opacity="0.4" />
        {/* Arms */}
        <rect x="268" y="100" width="32" height="65" rx="12" fill="#F0EDE5" />
        <rect x="420" y="100" width="32" height="65" rx="12" fill="#F0EDE5" />
        {/* Neck & head */}
        <rect x="345" y="68" width="30" height="26" rx="8" fill="#5C3A1E" />
        {/* Natural curly hair */}
        <ellipse cx="360" cy="62" rx="32" ry="28" fill="#1A0E08" />
        <ellipse cx="338" cy="54" rx="16" ry="18" fill="#1A0E08" />
        <ellipse cx="382" cy="54" rx="16" ry="18" fill="#1A0E08" />
        <ellipse cx="360" cy="40" rx="20" ry="16" fill="#2A1A10" />
        {/* Hair scrunchie/band */}
        <ellipse cx="362" cy="42" rx="8" ry="5" fill="#333" />
        {/* Earring */}
        <circle cx="330" cy="76" r="4" fill="#D4AA50" />
        {/* Headphones on pegboard */}
        <rect x="580" y="20" width="80" height="120" rx="4" fill="#D4C4A0" opacity="0.5" />
        <path d="M595 35 Q620 25 645 35" stroke="#333" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="595" cy="40" r="8" fill="#333" />
        <circle cx="645" cy="40" r="8" fill="#333" />
        {/* Pin board photos */}
        <rect x="578" y="55" width="38" height="28" rx="2" fill="#A0B0C0" opacity="0.7" />
        <rect x="622" y="58" width="34" height="26" rx="2" fill="#B0C0A0" opacity="0.7" />
        {/* "Keep going" note */}
        <rect x="590" y="90" width="50" height="30" rx="2" fill="#F5F5F0" />
        <line x1="596" y1="100" x2="634" y2="100" stroke="#999" strokeWidth="1.5" />
        <line x1="596" y1="107" x2="630" y2="107" stroke="#999" strokeWidth="1.5" />
        <line x1="596" y1="114" x2="620" y2="114" stroke="#999" strokeWidth="1.5" />
        {/* Pencil cup */}
        <rect x="490" y="145" width="28" height="22" rx="3" fill="#F0EDE8" />
        <line x1="496" y1="138" x2="494" y2="148" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" />
        <line x1="502" y1="136" x2="500" y2="148" stroke="#333" strokeWidth="3" strokeLinecap="round" />
        <line x1="508" y1="139" x2="506" y2="148" stroke="#4A90D9" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, background: hovered ? 'rgba(18,21,102,0.18)' : 'transparent', transition: 'background 0.3s' }} />
      <div style={{ position: 'absolute', top: 14, left: 14 }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
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
      style={{ background: '#4A1B3A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 180 }}
    >
      <div style={{ position: 'absolute', top: 14, left: 14 }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
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

// Tile 3: Grow Your Business — spinning donut on #121566
function GrowBusinessTile({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ background: '#121566', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', height: '100%', minHeight: 180 }}
    >
      <div style={{ position: 'absolute', top: 14, left: 14 }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
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
      style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', background: '#FFD6D6', height: '100%', minHeight: 200 }}
    >
      <svg width="100%" height="100%" viewBox="0 0 700 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <rect width="700" height="300" fill="#FFE8E8" />
        <ellipse cx="420" cy="180" rx="220" ry="160" fill="#E8789A" />
        <ellipse cx="380" cy="200" rx="180" ry="130" fill="#D4567A" />
        <path d="M380 120 Q400 140 390 160 Q380 180 400 200" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M395 115 Q410 130 408 148" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="80" cy="220" rx="120" ry="90" fill="#2D8A2D" transform="rotate(-20 80 220)" />
        <ellipse cx="60" cy="240" rx="90" ry="70" fill="#3DAA3D" transform="rotate(-15 60 240)" />
        <ellipse cx="620" cy="240" rx="100" ry="70" fill="#2D8A2D" />
        <ellipse cx="640" cy="250" rx="80" ry="60" fill="#4ABB4A" />
        <ellipse cx="150" cy="280" rx="80" ry="50" fill="#ADDD5A" transform="rotate(10 150 280)" />
        <ellipse cx="550" cy="285" rx="70" ry="45" fill="#ADDD5A" transform="rotate(-10 550 285)" />
        <g transform="translate(280, 120)">
          <rect x="18" y="30" width="28" height="36" rx="5" fill="#2D8A2D" />
          <rect x="22" y="34" width="8" height="12" rx="2" fill="#E8789A" />
          <rect x="34" y="34" width="8" height="12" rx="2" fill="#E8789A" />
          <rect x="10" y="24" width="32" height="40" rx="6" fill="#E8956A" />
          <path d="M42 32 Q60 28 72 22" stroke="#E8956A" strokeWidth="10" fill="none" strokeLinecap="round" />
          <rect x="68" y="10" width="30" height="22" rx="3" fill="#ADDD5A" />
          <path d="M72 16 Q80 20 88 16" stroke="#2D3A1E" strokeWidth="1.5" fill="none" />
          <path d="M72 21 Q80 25 88 21" stroke="#2D3A1E" strokeWidth="1.5" fill="none" />
          <circle cx="26" cy="14" r="14" fill="#5C3A1E" />
          <path d="M12 12 Q14 2 26 0 Q38 2 40 12" fill="#2D1A0E" />
        </g>
        <circle cx="500" cy="40" r="3" fill="white" opacity="0.8" />
        <circle cx="480" cy="60" r="2" fill="white" opacity="0.6" />
        <circle cx="520" cy="55" r="2" fill="white" opacity="0.7" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(18,21,102,0.1)', opacity: hovered ? 1 : 0, transition: 'opacity 0.3s' }} />
      <div style={{ position: 'absolute', top: 14, left: 14 }}>
        <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
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
  const [allPosts, setAllPosts] = useState<any[]>([])
  const navigate = useNavigate()
  const { isAuthed } = useAuth()

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
        <style>{`
          .blog-nav-link:hover { color: #121566 !important; }
          .blog-cat-btn:hover { background: #f0f0f0 !important; }
        `}</style>

        {/* Nav — minimal like Fiverr blog */}
        <nav style={{ borderBottom: '1px solid #e5e5e5', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', gap: 16, background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => setShowArticles(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <span style={{ background: '#7F77DD', color: '#fff', fontSize: 13, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>OgaPay</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>blog.</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 360, border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', background: '#fafafa' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" style={{ verticalAlign: 'middle', flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input
              placeholder="Search by topic or keyword"
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#333', width: '100%' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setShowArticles(true)}
            />
          </div>
          <button onClick={() => setShowArticles(true)} style={{ background: '#121566', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Search</button>
          {/* Hamburger — right side like Fiverr */}
          <div style={{ marginLeft: 'auto' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          </div>
        </nav>

        {/* HERO — full width, #121566 background, centered text */}
        <div style={{ background: '#121566', padding: '5rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle background circles */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
          <h1 style={{ fontSize: 52, fontWeight: 700, color: '#fff', lineHeight: 1.15, marginBottom: 28, position: 'relative', maxWidth: 600, margin: '0 auto 28px' }}>
            Spark Your Next{' '}
            <span style={{ color: '#ADDD5A', fontStyle: 'italic' }}>Breakthrough</span>
          </h1>
          <button
            onClick={() => setShowArticles(true)}
            style={{ background: '#ADDD5A', color: '#1a2a00', border: 'none', borderRadius: 8, padding: '14px 40px', fontSize: 15, fontWeight: 700, cursor: 'pointer', position: 'relative' }}
          >
            View All Articles
          </button>
        </div>

        {/* 4 CATEGORY TILES — stacked full width like Fiverr */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Tile 1: Join The Community */}
          <div style={{ height: 220, position: 'relative' }}>
            <JoinCommunityTile onClick={() => { setActiveCategory('All'); setShowArticles(true) }} />
          </div>

          {/* Tiles 2+3: side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 220 }}>
            <StartSellingTile onClick={() => { setActiveCategory('Freelancers'); setShowArticles(true) }} />
            <GrowBusinessTile onClick={() => { setActiveCategory('Businesses'); setShowArticles(true) }} />
          </div>

          {/* Tile 4: Get Inspired */}
          <div style={{ height: 240, position: 'relative' }}>
            <GetInspiredTile onClick={() => { setActiveCategory('Freelancers'); setShowArticles(true) }} />
          </div>
        </div>

        {/* FOOTER — 3 columns like Fiverr */}
        <footer style={{ borderTop: '1px solid #e5e5e5', padding: '3rem 2rem', marginTop: '2rem' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Categories</p>
              {['News', 'Businesses', 'Freelancers', 'Case Studies'].map(cat => (
                <p key={cat} style={{ marginBottom: 10 }}>
                  <button className="blog-cat-btn" onClick={() => { setActiveCategory(cat); setShowArticles(true) }} style={{ background: 'none', border: 'none', fontSize: 13, color: '#555', cursor: 'pointer', padding: 0, textAlign: 'left' }}>{cat}</button>
                </p>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>About</p>
              {['About OgaPay', 'Careers', 'Press & News', 'Privacy Policy', 'Terms of Service'].map(item => (
                <p key={item} style={{ marginBottom: 10 }}>
                  <a href="/" style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>{item}</a>
                </p>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 16 }}>Support</p>
              {['Help & Support', 'Trust & Safety', 'OgaPay Guides', 'Go to OgaPay.com'].map(item => (
                <p key={item} style={{ marginBottom: 10 }}>
                  <a href="/" style={{ fontSize: 13, color: '#555', textDecoration: 'none' }}>{item}</a>
                </p>
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 1000, margin: '2rem auto 0', paddingTop: '1.5rem', borderTop: '1px solid #e5e5e5', fontSize: 12, color: '#999' }}>
            © 2026 OgaPay. All rights reserved.
          </div>
        </footer>
      </div>
    )
  }

  // Articles view
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
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ fontSize: 13, padding: '5px 14px', borderRadius: 20, border: '0.5px solid', borderColor: activeCategory === cat ? '#121566' : 'transparent', background: activeCategory === cat ? '#EEEDFE' : 'transparent', color: activeCategory === cat ? '#121566' : '#666', cursor: 'pointer', fontWeight: activeCategory === cat ? 600 : 400 }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAuthed && <button onClick={() => navigate('/blog/write')} style={{ fontSize: 13, background: '#121566', color: '#fff', padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ Write Article</button>}
            <a href="/" style={{ fontSize: 13, background: '#121566', color: '#fff', padding: '6px 16px', borderRadius: 20, textDecoration: 'none', fontWeight: 500 }}>Go to OgaPay →</a>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>
            {activeCategory === 'All' ? 'All articles' : activeCategory}
            <span style={{ fontSize: 13, color: '#666', marginLeft: 8 }}>({(filteredArticles || []).length})</span>
          </span>
          <button onClick={() => setShowArticles(false)} style={{ fontSize: 13, color: '#121566', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to home</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {(filteredArticles || []).map((post: any) => {
            const badge = badgeColors[post.category] || { bg: '#EEEDFE', color: '#534AB7' }
            return (
              <div key={post.id} style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: 160, background: post.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                </div>
                <div style={{ padding: '1rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>
                    {post.category}
                    {post.isUserPost && <span style={{ fontSize: 9, background: badge.color, color: badge.bg, borderRadius: 99, padding: '1px 5px' }}>Member</span>}
                  </span>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.5, marginBottom: 10 }}>{post.title}</p>
                  <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 10 }}>{post.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', flexWrap: 'wrap' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#121566', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>{post.authorInitials}</div>
                    <span>{post.author}</span>
                    <span>·</span>
                    <span>{post.date}</span>
                    <span>·</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Newsletter */}
        <div style={{ background: '#121566', borderRadius: 16, padding: '2rem', textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Stay in the loop</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: '1.25rem' }}>Get the latest OgaPay tips, earnings stories, and platform updates.</p>
          {subscribed ? (
            <p style={{ color: '#ADDD5A', fontWeight: 600, fontSize: 14 }}>✓ You're subscribed!</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input type="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && email.trim() && setSubscribed(true)}
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 20, border: 'none', fontSize: 13, background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }} />
              <button onClick={() => email.trim() && setSubscribed(true)} style={{ background: '#ADDD5A', color: '#1a2a00', border: 'none', padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Subscribe</button>
            </div>
          )}
        </div>

        {/* Footer in articles view */}
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
