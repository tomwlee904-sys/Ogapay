import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const categories = ['All', 'News', 'Businesses', 'Freelancers', 'Case Studies']

const samplePosts = [
  { id: 's1', category: 'Freelancers', title: 'How Nigerian freelancers are earning 5x more with OgaPay tasks', excerpt: 'Discover how thousands of earners across West Africa are turning micro-tasks into meaningful income.', author: 'OgaPay Team', authorInitials: 'OG', date: 'June 4, 2026', readTime: '5 min read', color: '#534AB7' },
  { id: 's2', category: 'News', title: 'OgaPay launches instant wallet-to-bank withdrawals across 12 African countries', excerpt: 'Earners can now withdraw directly to their local bank accounts in seconds.', author: 'OgaPay Team', authorInitials: 'OG', date: 'June 3, 2026', readTime: '3 min read', color: '#185FA5' },
  { id: 's3', category: 'Businesses', title: "How small businesses use OgaPay's store to reach 50,000+ active buyers", excerpt: 'A deep dive into how merchants are growing revenue with the OgaPay marketplace.', author: 'Adaeze N.', authorInitials: 'AN', date: 'June 1, 2026', readTime: '6 min read', color: '#3B6D11' },
  { id: 's4', category: 'Freelancers', title: 'Top 10 task categories paying the most on OgaPay this month', excerpt: "From social media tasks to crypto verification — here's where the money is.", author: 'Emeka J.', authorInitials: 'EJ', date: 'May 28, 2026', readTime: '4 min read', color: '#854F0B' },
  { id: 's5', category: 'Case Studies', title: "From zero to NGN800k/month: Chukwudi's story using the OgaPay worker portal", excerpt: "One earner's journey from side hustle to full-time income on OgaPay.", author: 'Fatima B.', authorInitials: 'FB', date: 'May 25, 2026', readTime: '8 min read', color: '#993556' },
  { id: 's6', category: 'News', title: "OgaPay communities hit 200,000 members — here's what's driving the growth", excerpt: "How peer-to-peer communities inside OgaPay became the platform's fastest growing feature.", author: 'OgaPay Team', authorInitials: 'OG', date: 'May 22, 2026', readTime: '3 min read', color: '#534AB7' },
  { id: 's7', category: 'Freelancers', title: 'OgaPay Vault explained: how to save and grow your earnings safely', excerpt: 'Everything you need to know about putting your OgaPay earnings to work.', author: 'Ngozi A.', authorInitials: 'NA', date: 'May 19, 2026', readTime: '5 min read', color: '#0F6E56' },
  { id: 's8', category: 'Case Studies', title: '5 businesses that scaled to 7 figures using OgaPay campaigns', excerpt: 'Real numbers, real results from brands that bet on OgaPay early.', author: 'Fatima B.', authorInitials: 'FB', date: 'May 15, 2026', readTime: '6 min read', color: '#993556' },
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
      style={{ background: '#3DAA6A', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', borderRadius: 0 }}
    >
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <button onClick={onNavigate} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          Grow Your Business <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>&rarr;</span>
        </button>
      </div>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: hovered ? 'rotate(360deg)' : 'rotate(0deg)', transition: hovered ? 'transform 1.2s cubic-bezier(0.4,0,0.2,1)' : 'transform 0.6s ease' }}>
          <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="28" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="#1B5E35" strokeWidth="28" strokeDasharray="340 452" strokeDashoffset="113" strokeLinecap="round" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="#A8E6C0" strokeWidth="28" strokeDasharray="68 452" strokeDashoffset="-227" strokeLinecap="round" />
          <circle cx="90" cy="90" r="72" fill="none" stroke="#FFF6D5" strokeWidth="28" strokeDasharray="44 452" strokeDashoffset="-27" strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>89.6k</div>
          <div style={{ fontSize: 10, opacity: .8 }}>MONTHLY</div>
        </div>
      </div>
    </div>
  )
}

function EarnerCard() {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: '#4A1B3A', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', cursor: 'pointer', borderRadius: 0 }}>
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, opacity: hovered ? 1 : 0, transform: hovered ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 0.25s ease' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#1a1a1a', fontSize: 13, fontWeight: 600, padding: '7px 14px', borderRadius: 8, textDecoration: 'none' }}>
          Start Earning <span style={{ background: '#1a1a1a', color: '#fff', borderRadius: 4, padding: '1px 5px', fontSize: 13 }}>&rarr;</span>
        </a>
      </div>
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#E8A0B4', borderRadius: 10, transform: hovered ? 'rotate(-12deg) translate(-60px, 10px)' : 'rotate(-6deg) translate(-20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(255,255,255,0.15) 10px,rgba(255,255,255,0.15) 11px),repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(255,255,255,0.15) 10px,rgba(255,255,255,0.15) 11px)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
            <div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(80,20,40,0.8)', fontWeight: 600 }}>5 ★</div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 6, width: '70%' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', width: 130, height: 165, background: '#C4E0F9', borderRadius: 10, transform: hovered ? 'rotate(20deg) translate(60px, 10px)' : 'rotate(10deg) translate(20px, 4px)', transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)', border: '2px solid rgba(255,255,255,0.2)', backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 10px,rgba(255,255,255,0.15) 10px,rgba(255,255,255,0.15) 11px),repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(255,255,255,0.15) 10px,rgba(255,255,255,0.15) 11px)' }}>
        <div style={{ padding: '0.5rem', paddingTop: '0.75rem' }}>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
            <div style={{ height: 8, background: 'rgba(255,255,255,0.4)', borderRadius: 4, flex: 1 }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'rgba(10,40,80,0.7)', fontWeight: 600 }}>4.8 ★</div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 6, width: '50%' }} />
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '12px 18px', textAlign: 'center', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
        <div style={{ fontSize: 11, opacity: .7, marginBottom: 2, letterSpacing: 1 }}>EARN</div>
        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>NGN 2.8K</div>
        <div style={{ fontSize: 10, opacity: .6 }}>PER TASK</div>
      </div>
    </div>
  )
}

export default function Blog() {
  const navigate = useNavigate()
  const { isAuthed } = useAuth()
  const [activeCategory, setActiveCategory] = useState('All')
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [allPosts, setAllPosts] = useState<any[]>([])

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
    setAllPosts([...samplePosts, ...userPosts])
  }, [])

  const filtered = activeCategory === 'All' ? allPosts : allPosts.filter(p => p.category === activeCategory)

  return (
    <div style={{ background: '#f5f5f5' }}>
      {/* Nav */}
      <nav style={{ padding: '10px 0', borderBottom: '0.5px solid #e0e0e0', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/" style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}>OgaPay</a>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: activeCategory === cat ? 600 : 400, color: activeCategory === cat ? '#534AB7' : '#666', cursor: 'pointer', padding: '4px 8px' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAuthed && (
              <button onClick={() => navigate('/blog/write')} style={{ fontSize: 13, background: '#7F77DD', color: '#fff', padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Write Article
              </button>
            )}
            <a href="/" style={{ fontSize: 13, background: '#7F77DD', color: '#fff', padding: '6px 16px', borderRadius: 20, textDecoration: 'none', fontWeight: 500 }}>Go to OgaPay &rarr;</a>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>
            {activeCategory === 'All' ? 'All articles' : activeCategory}
            <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>({filtered.length})</span>
          </span>
          <button onClick={() => navigate('/')} style={{ fontSize: 13, color: '#534AB7', background: 'none', border: 'none', cursor: 'pointer' }}>&larr; Back to home</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {filtered.map(post => {
            const badge = badgeColors[post.category] || { bg: '#EEEDFE', color: '#534AB7' }
            return (
              <div key={post.id} style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}>
                <div style={{ height: 160, background: post.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <div style={{ padding: '1rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 20, marginBottom: 8 }}>
                    {post.category}
                    {post.isUserPost && <span style={{fontSize:9,background:badge.color,color:badge.bg,borderRadius:99,padding:'1px 6px'}}>Member</span>}
                  </span>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.5, marginBottom: 10 }}>{post.title}</p>
                  <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 10 }}>{post.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', flexWrap: 'wrap' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#7F77DD', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>{post.authorInitials}</div>
                    <span>{post.author}</span><span>&middot;</span><span>{post.date}</span><span>&middot;</span><span>{post.readTime}</span>
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
            <p style={{ color: '#ADDD5A', fontWeight: 600, fontSize: 14 }}>You're subscribed!</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, maxWidth: 420, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input type="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && email.trim() && setSubscribed(true)}
                style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 20, border: 'none', fontSize: 13, background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }} />
              <button onClick={() => email.trim() && setSubscribed(true)} style={{ background: '#ADDD5A', color: '#1a2a00', border: 'none', padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Subscribe</button>
            </div>
          )}
        </div>

        <div style={{ borderTop: '0.5px solid #e0e0e0', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#888', flexWrap: 'wrap', gap: 8 }}>
          <span>&copy; 2026 OgaPay. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 16 }}>
            {['News', 'Businesses', 'Freelancers', 'Case Studies'].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#888', cursor: 'pointer', padding: 0 }}>{cat}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
