import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { apiRequest } from '../lib/api'
import Footer from '../components/Footer'
import Drawer from '../components/Drawer'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function estimateReadTime(content: string) {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
  return `${Math.max(1, Math.ceil(words / 200))} min read`
}

function renderContent(text: string) {
  if (!text) return { __html: '' }
  let html = ''
  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) { html += `<h3>${line.replace('### ', '')}</h3>`; continue }
    if (line.startsWith('## '))  { html += `<h2>${line.replace('## ', '')}</h2>`; continue }
    if (line.startsWith('# '))   { html += `<h1>${line.replace('# ', '')}</h1>`; continue }
    if (line.startsWith('- '))   { html += `<li>${line.replace('- ', '')}</li>`; continue }
    if (line.startsWith('> '))   { html += `<blockquote>${line.replace('> ', '')}</blockquote>`; continue }
    if (line.trim() === '')      { html += '<br />'; continue }
    html += `<p>${line}</p>`
  }
  // Inline formatting
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
             .replace(/\*(.+?)\*/g, '<em>$1</em>')
             .replace(/`(.+?)`/g, '<code>$1</code>')
  return { __html: html }
}

export default function ArticleDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [post, setPost] = useState<any>(null)
  const [related, setRelated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    apiRequest<any>(`/blog/${slug}`)
      .then(data => {
        setPost(data)
        return apiRequest<any>(`/blog?category=${data.category}&limit=3`)
      })
      .then(data => setRelated((data.posts || []).filter((p: any) => p.slug !== slug).slice(0, 3)))
      .catch(() => navigate('/blog'))
      .finally(() => setLoading(false))
  }, [slug, navigate])

  if (loading) {
    return (
      <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
          <div style={{ height: 24, width: 200, background: '#eee', borderRadius: 4, marginBottom: 32 }} />
          <div style={{ height: 400, background: '#eee', borderRadius: 16, marginBottom: 32 }} />
          <div style={{ height: 32, width: '80%', background: '#eee', borderRadius: 4, marginBottom: 16 }} />
          <div style={{ height: 16, width: '60%', background: '#eee', borderRadius: 4, marginBottom: 24 }} />
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 14, width: '100%', background: '#eee', borderRadius: 4, marginBottom: 10 }} />)}
        </div>
      </div>
    )
  }

  if (!post) return null

  const authorName = post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : 'OgaPay'
  const initials = ((post.author?.firstName?.[0] || '') + (post.author?.lastName?.[0] || '')) || 'OG'
  const badgeColors: Record<string, { bg: string; color: string }> = {
    News: { bg: '#E6F1FB', color: '#191C6B' },
    Businesses: { bg: '#EAF3DE', color: '#3B6D11' },
    Freelancers: { bg: '#EEEDFE', color: '#534AB7' },
    'Case Studies': { bg: '#FBEAF0', color: '#993556' },
  }
  const badge = badgeColors[post.category] || { bg: '#191C6B', color: '#191C6B' }

  return (
    <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <style>{`
        .ad-nav-link:hover { color: #191C6B !important; }
        .ad-content h1 { font-size: 28px; font-weight: 800; margin: 32px 0 12px; line-height: 1.3; }
        .ad-content h2 { font-size: 22px; font-weight: 700; margin: 28px 0 10px; }
        .ad-content h3 { font-size: 18px; font-weight: 700; margin: 24px 0 8px; }
        .ad-content p { font-size: 16px; line-height: 1.8; margin: 0 0 16px; color: var(--text2); }
        .ad-content ul, .ad-content ol { padding-left: 24px; margin: 0 0 16px; }
        .ad-content li { font-size: 15px; line-height: 1.7; margin-bottom: 6px; color: var(--text2); }
        .ad-content blockquote { border-left: 4px solid #191C6B; margin: 24px 0; padding: 12px 20px; background: rgba(25,28,107,0.04); border-radius: 0 8px 8px 0; font-style: italic; color: var(--text2); }
        .ad-content img { max-width: 100%; border-radius: 12px; margin: 24px 0; }
        .ad-content a { color: #191C6B; text-decoration: underline; }
        .ad-content pre { background: #1a1a2e; color: #e4e4e4; padding: 16px 20px; border-radius: 12px; overflow-x: auto; font-size: 13px; line-height: 1.6; margin: 20px 0; }
        .ad-content code { background: rgba(25,28,107,0.08); padding: 2px 6px; border-radius: 4px; font-size: 14px; }
      `}</style>

      <nav style={{ borderBottom: '1px solid var(--border)', padding: '0.875rem 2.5rem', display: 'flex', alignItems: 'center', gap: 20, background: 'var(--card)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span style={{ width: 28, height: 28, display: 'flex' }} dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" fill="none" width="28" height="28"><rect width="34" height="34" rx="6" fill="white"/><rect x="6.5" y="6.5" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 6.5H20.7C21.5 6.5 22.2 7.2 22.2 8V13.6H15V6.5Z" fill="black"/><path d="M23.4 6.5H26C29.2 6.5 31.2 8.5 31.2 11.7V13.6H23.4V6.5Z" fill="black"/><rect x="6.5" y="15" width="7.1" height="7.1" fill="black"/><rect x="15" y="15" width="7.1" height="7.1" fill="black"/><path d="M23.4 15H31.2V16.9C31.2 20.1 29.2 22.1 26 22.1H23.4V15Z" fill="black"/><rect x="6.5" y="23.4" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 23.4H20.7C21.5 23.4 22.2 24.1 22.2 24.9V29.2C22.2 30 21.5 30.7 20.7 30.7H15V23.4Z" fill="black"/></svg>` }} />
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>OgaPay</span>
        </a>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggle} style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 8, width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--text)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {theme === "dark" ? (<><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>) : (<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />)}
            </svg>
          </button>
          <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
        </div>
      </nav>

      <article style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 60px', width: '100%', boxSizing: 'border-box' }}>
        <button onClick={() => navigate('/blog')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#191C6B', fontWeight: 600, padding: 0, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
          ← Back to blog
        </button>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: 20, marginBottom: 16 }}>
          {post.category}
        </span>

        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.2, margin: '0 0 16px', letterSpacing: '-0.02em' }}>{post.title}</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text3)', marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#191C6B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{initials}</div>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{authorName}</span>
          <span>·</span>
          <span>{post.publishedAt ? formatDate(post.publishedAt) : post.date}</span>
          <span>·</span>
          <span>{estimateReadTime(post.content || '')}</span>
        </div>

        <div style={{ height: 400, borderRadius: 16, overflow: 'hidden', marginBottom: 40, background: post.coverColor || '#191C6B', backgroundImage: post.coverImage ? `url(${post.coverImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          {!post.coverImage && (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(() => {
                const cat = (post.category || '').toLowerCase();
                const s = "rgba(255,255,255,0.2)";
                if (cat === 'guides' || cat === 'tutorial') return <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M12 6v7"/><path d="M9 9l3-3 3 3"/></svg>;
                if (cat === 'features') return <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
                if (cat === 'updates' || cat === 'news') return <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
                if (cat === 'community') return <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="9" r="3.5"/></svg>;
                return <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
              })()}
            </div>
          )}
        </div>

        <div className="ad-content" dangerouslySetInnerHTML={renderContent(post.content)} />

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 48, paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#191C6B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>{initials}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{authorName}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>OgaPay Contributor</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Copy Link', 'Share on X', 'Share on LinkedIn'].map(label => (
              <button key={label} onClick={() => { if (label === 'Copy Link') navigator.clipboard.writeText(window.location.href) }}
                style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 24px 40px', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Related articles</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {related.map((rp: any) => {
              const b = badgeColors[rp.category] || { bg: '#191C6B', color: '#191C6B' }
              const na = rp.author ? `${rp.author.firstName || ''} ${rp.author.lastName || ''}`.trim() : 'OgaPay'
              const inits = ((rp.author?.firstName?.[0] || '') + (rp.author?.lastName?.[0] || '')) || 'OG'
              return (
                <div key={rp.id} onClick={() => navigate(`/blog/${rp.slug}`)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ height: 160, background: rp.coverColor || '#191C6B', backgroundImage: rp.coverImage ? `url(${rp.coverImage})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!rp.coverImage && (() => {
                      const cat = (rp.category || '').toLowerCase();
                      const s = "rgba(255,255,255,0.3)";
                      if (cat === 'guides' || cat === 'tutorial') return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M12 6v7"/><path d="M9 9l3-3 3 3"/></svg>;
                      if (cat === 'features') return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
                      if (cat === 'updates' || cat === 'news') return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
                      if (cat === 'community') return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="9" r="3.5"/></svg>;
                      return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={s} strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
                    })()}
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, background: b.bg, color: b.color, padding: '2px 8px', borderRadius: 20, marginBottom: 6, display: 'inline-block' }}>{rp.category}</span>
                    <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, margin: '6px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rp.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)' }}>
                      <span>{na}</span> <span>·</span> <span>{rp.publishedAt ? formatDate(rp.publishedAt) : ''}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Footer />
    </div>
  )
}