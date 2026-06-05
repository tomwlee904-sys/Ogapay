import { useState } from 'react'

const categories = ['All', 'News', 'Businesses', 'Freelancers', 'Case Studies']

const posts = [
  { id: 1, category: 'Freelancers', title: 'How Nigerian freelancers are earning 5x more with OgaPay tasks', excerpt: 'Discover how thousands of earners across West Africa are turning micro-tasks into meaningful income.', author: 'OgaPay Team', authorInitials: 'OG', date: 'June 4, 2026', readTime: '5 min read', color: '#534AB7', icon: '🚀' },
  { id: 2, category: 'News', title: 'OgaPay launches instant wallet-to-bank withdrawals across 12 African countries', excerpt: 'Earners can now withdraw directly to their local bank accounts in seconds.', author: 'OgaPay Team', authorInitials: 'OG', date: 'June 3, 2026', readTime: '3 min read', color: '#185FA5', icon: '💳' },
  { id: 3, category: 'Businesses', title: "How small businesses use OgaPay's store to reach 50,000+ active buyers", excerpt: 'A deep dive into how merchants are growing revenue with the OgaPay marketplace.', author: 'Adaeze N.', authorInitials: 'AN', date: 'June 1, 2026', readTime: '6 min read', color: '#3B6D11', icon: '🏪' },
  { id: 4, category: 'Freelancers', title: 'Top 10 task categories paying the most on OgaPay this month', excerpt: "From social media tasks to crypto verification — here's where the money is.", author: 'Emeka J.', authorInitials: 'EJ', date: 'May 28, 2026', readTime: '4 min read', color: '#854F0B', icon: '📊' },
  { id: 5, category: 'Case Studies', title: "From zero to ₦800k/month: Chukwudi's story using the OgaPay worker portal", excerpt: "One earner's journey from side hustle to full-time income on OgaPay.", author: 'Fatima B.', authorInitials: 'FB', date: 'May 25, 2026', readTime: '8 min read', color: '#993556', icon: '📈' },
  { id: 6, category: 'News', title: "OgaPay communities hit 200,000 members — here's what's driving the growth", excerpt: "How peer-to-peer communities inside OgaPay became the platform's fastest growing feature.", author: 'OgaPay Team', authorInitials: 'OG', date: 'May 22, 2026', readTime: '3 min read', color: '#534AB7', icon: '👥' },
  { id: 7, category: 'Freelancers', title: 'OgaPay Vault explained: how to save and grow your earnings safely', excerpt: 'Everything you need to know about putting your OgaPay earnings to work.', author: 'Ngozi A.', authorInitials: 'NA', date: 'May 19, 2026', readTime: '5 min read', color: '#0F6E56', icon: '🔐' },
  { id: 8, category: 'Case Studies', title: '5 businesses that scaled to 7 figures using OgaPay campaigns', excerpt: 'Real numbers, real results from brands that bet on OgaPay early.', author: 'Fatima B.', authorInitials: 'FB', date: 'May 15, 2026', readTime: '6 min read', color: '#993556', icon: '🎯' },
]

const badgeColors: Record<string, { bg: string; color: string }> = {
  News: { bg: '#E6F1FB', color: '#185FA5' },
  Businesses: { bg: '#EAF3DE', color: '#3B6D11' },
  Freelancers: { bg: '#EEEDFE', color: '#534AB7' },
  'Case Studies': { bg: '#FBEAF0', color: '#993556' },
}

function EarnerCard() {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: '#4A1B3A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
    >
      {/* Start Selling button — appears on hover */}
      <div style={{
        position: 'absolute', top: 16, left: 16, zIndex: 10,
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'all 0.25s ease',
      }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, textDecoration: 'none' }}>
          Start Earning <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '1px 5px', fontSize: 13 }}>→</span>
        </a>
      </div>

      {/* Card behind-left (pink, rotated) */}
      <div style={{
        position: 'absolute',
        width: 130, height: 165,
        background: '#E8A0B4',
        borderRadius: 10,
        transform: hovered ? 'rotate(-12deg) translate(-60px, 10px)' : 'rotate(-6deg) translate(-20px, 4px)',
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        border: '2px solid rgba(255,255,255,0.2)',
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(255,255,255,0.15) 10px,rgba(255,255,255,0.15) 11px),repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(255,255,255,0.15) 10px,rgba(255,255,255,0.15) 11px)',
      }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
            <div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div>
        </div>
      </div>

      {/* Card behind-right (lighter pink, rotated other way) */}
      <div style={{
        position: 'absolute',
        width: 130, height: 165,
        background: '#F2C4D0',
        borderRadius: 10,
        transform: hovered ? 'rotate(12deg) translate(60px, 10px)' : 'rotate(6deg) translate(20px, 4px)',
        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        border: '2px solid rgba(255,255,255,0.2)',
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(255,255,255,0.2) 10px,rgba(255,255,255,0.2) 11px),repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(255,255,255,0.2) 10px,rgba(255,255,255,0.2) 11px)',
      }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.25)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
            <div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div>
        </div>
      </div>

      {/* Main front card (lime green) */}
      <div style={{
        position: 'relative', zIndex: 5,
        background: '#ADDD5A',
        borderRadius: 10,
        width: 140, height: 175,
        border: '3px solid #ADDD5A',
        transform: hovered ? 'scale(1.06) translateY(-6px)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: hovered ? '0 16px 40px rgba(0,0,0,0.4)' : '0 6px 20px rgba(0,0,0,0.25)',
      }}>
        <div style={{ padding: '0.5rem' }}>
          <div style={{ height: 90, background: '#2D3A1E', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🧑🏾‍💻</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#7F77DD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>OG</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1a2a00' }}>Chukwudi</span>
            </div>
            <span style={{ fontSize: 10, color: '#3B6D11', fontWeight: 700 }}>5 ★</span>
          </div>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.15)', borderRadius: 2 }}>
            <div style={{ width: '80%', height: '100%', background: '#2D3A1E', borderRadius: 2 }} />
          </div>
        </div>
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

  const filtered = posts.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory) &&
    (search === '' || p.title.toLowerCase().includes(search.toLowerCase()))
  )

  if (!showArticles) {
    return (
      <div style={{ fontFamily: 'inherit', background: '#fff', minHeight: '100vh' }}>
        <style>{`
          .blog-nav-link:hover { color: #534AB7 !important; }
        `}</style>

        {/* Nav */}
        <nav style={{ borderBottom: '1px solid #e5e5e5', padding: '0.875rem 2rem', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => {}} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ background: '#7F77DD', color: '#fff', fontSize: 13, padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>OgaPay</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>blog.</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 380, border: '1px solid #ddd', borderRadius: 6, padding: '6px 12px', background: '#fafafa' }}>
            <span style={{ fontSize: 14, color: '#aaa' }}>🔍</span>
            <input
              placeholder="Search by topic or keyword"
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#333', width: '100%' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setShowArticles(true)}
            />
          </div>
          <button onClick={() => setShowArticles(true)} style={{ background: '#7F77DD', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Search
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {['News', 'Businesses', 'Freelancers', 'Case Studies'].map(cat => (
              <span key={cat} className="blog-nav-link" style={{ fontSize: 14, color: '#333', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => { setActiveCategory(cat); setShowArticles(true) }}>{cat}</span>
            ))}
            <a href="/" style={{ fontSize: 13, border: '1px solid #333', borderRadius: 6, padding: '6px 14px', color: '#333', textDecoration: 'none', fontWeight: 500 }}>
              Go to OgaPay.com
            </a>
          </div>
        </nav>

        {/* Hero bento grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gridTemplateRows: '460px 300px', maxHeight: 760 }}>
          {/* Big hero left — spans both rows */}
          <div style={{ gridRow: '1 / 3', background: '#2D3A1E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(173,221,90,0.07)' }} />
            <div style={{ position: 'absolute', top: 40, right: 40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(127,119,221,0.08)' }} />
            <h1 style={{ fontSize: 52, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.15, marginBottom: 20, position: 'relative', maxWidth: 520 }}>
              Spark Your Next{' '}
              <span style={{ color: '#ADDD5A', fontStyle: 'italic' }}>Breakthrough</span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: 400, lineHeight: 1.7, marginBottom: 36, position: 'relative' }}>
              Tips, stories, and insights for earners, businesses, and freelancers building on OgaPay.
            </p>
            <button
              onClick={() => setShowArticles(true)}
              style={{ background: '#ADDD5A', color: '#1a2a00', border: 'none', borderRadius: 8, padding: '14px 36px', fontSize: 15, fontWeight: 700, cursor: 'pointer', position: 'relative', letterSpacing: '0.01em' }}
            >
              View All Articles
            </button>
          </div>

          {/* Top right — purple donut graphic */}
          <div style={{ background: '#7F77DD', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
            <div style={{ width: 170, height: 170, borderRadius: '50%', border: '32px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <div style={{ width: 106, height: 106, borderRadius: '50%', border: '22px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#534AB7' }}>↗</div>
              </div>
              {/* Accent dot */}
              <div style={{ position: 'absolute', top: -8, right: 8, width: 36, height: 36, borderRadius: '50%', background: '#ADDD5A' }} />
              <div style={{ position: 'absolute', bottom: 4, left: -4, width: 20, height: 20, borderRadius: '50%', background: '#2D3A1E' }} />
            </div>
          </div>

          {/* Bottom right — fan-out earner cards */}
          <EarnerCard />
        </div>
      </div>
    )
  }

  // Articles page
  return (
    <div style={{ fontFamily: 'inherit', background: 'var(--color-background-tertiary, #f5f5f3)', minHeight: '100vh' }}>
      <nav style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <button onClick={() => setShowArticles(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ background: '#7F77DD', color: '#fff', fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>OgaPay</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>blog.</span>
          </button>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ fontSize: 13, padding: '5px 14px', borderRadius: 20, border: '0.5px solid', borderColor: activeCategory === cat ? '#7F77DD' : 'transparent', background: activeCategory === cat ? '#EEEDFE' : 'transparent', color: activeCategory === cat ? '#534AB7' : 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: activeCategory === cat ? 600 : 400 }}>
                {cat}
              </button>
            ))}
          </div>
          <a href="/" style={{ fontSize: 13, background: '#7F77DD', color: '#fff', padding: '6px 16px', borderRadius: 20, textDecoration: 'none', fontWeight: 500 }}>Go to OgaPay →</a>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {activeCategory === 'All' ? 'All articles' : activeCategory}
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginLeft: 8 }}>({filtered.length})</span>
          </span>
          <button onClick={() => setShowArticles(false)} style={{ fontSize: 13, color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to home</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {filtered.map(post => {
            const badge = badgeColors[post.category] || { bg: '#EEEDFE', color: '#534AB7' }
            return (
              <div key={post.id} style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: 160, background: post.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{post.icon}</div>
                <div style={{ padding: '1rem' }}>
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>{post.category}</span>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.5, marginBottom: 10 }}>{post.title}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>{post.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#7F77DD', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>{post.authorInitials}</div>
                    <span>{post.author}</span><span>·</span><span>{post.date}</span><span>·</span><span>{post.readTime}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Newsletter */}
        <div style={{ background: '#534AB7', borderRadius: 16, padding: '2rem', textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Stay in the loop</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: '1.25rem' }}>Get the latest OgaPay tips, earnings stories, and platform updates.</p>
          {subscribed ? (
            <p style={{ color: '#ADDD5A', fontWeight: 600, fontSize: 14 }}>✓ You're subscribed!</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input type="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && email.trim() && setSubscribed(true)}
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 20, border: 'none', fontSize: 13, background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }} />
              <button onClick={() => email.trim() && setSubscribed(true)}
                style={{ background: '#ADDD5A', color: '#1a2a00', border: 'none', padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Subscribe</button>
            </div>
          )}
        </div>

        <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', flexWrap: 'wrap', gap: 8 }}>
          <span>© 2026 OgaPay. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 16 }}>
            {['News', 'Businesses', 'Freelancers', 'Case Studies'].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--color-text-secondary)', cursor: 'pointer', padding: 0 }}>{cat}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
