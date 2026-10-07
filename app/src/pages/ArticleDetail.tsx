import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { apiRequest } from '../lib/api'
import Footer from '../components/Footer'
import Drawer from '../components/Drawer'
import { sized } from '../lib/img'
import BlogReactions from '../components/BlogReactions'
import { renderBlog } from '../lib/blogMarkdown'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function estimateReadTime(content: string) {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
  return `${Math.max(1, Math.ceil(words / 200))} min read`
}

const renderContent = (text: string) => ({ __html: renderBlog(text || '') })

const SHARE_TARGETS: { label: string; icon: JSX.Element; href?: (url: string, text: string) => string }[] = [
  { label: 'Copy link', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg> },
  { label: 'Share on X', href: (u, t) => `https://twitter.com/intent/tweet?text=${t}&url=${u}`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg> },
  { label: 'Share on LinkedIn', href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" /></svg> },
  { label: 'Share on Facebook', href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}`, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46h1.6V4.46A21 21 0 0 0 14.27 4.3c-2.3 0-3.87 1.4-3.87 3.97v2.23H7.8v3h2.6V21h3.1z" /></svg> },
]

export default function ArticleDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [post, setPost] = useState<any>(null)
  const loadedSlug = useRef<string | null>(null)
  const [related, setRelated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug || loadedSlug.current === slug) return
    setLoading(true)
    apiRequest<any>(`/blog/${slug}`)
      .then(data => {
        setPost(data)
        loadedSlug.current = data?.slug || null
        // An old or alternative link: show the post's own address (without loading it twice)
        if (data?.slug && data.slug !== slug) navigate(`/blog/${data.slug}`, { replace: true })
        return apiRequest<any>(`/blog?category=${data.category}&limit=3`)
      })
      .then(data => setRelated((data.posts || []).filter((p: any) => p.slug !== slug).slice(0, 3)))
      .catch(() => navigate('/blog'))
      .finally(() => setLoading(false))
  }, [slug, navigate])

  useEffect(() => {
    const onScroll = () => {
      const winScroll = window.scrollY
      const height = document.documentElement.scrollHeight - window.innerHeight
      setProgress(height > 0 ? (winScroll / height) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!slug) return
    const stored = JSON.parse(localStorage.getItem('ogapay_bookmarked_posts') || '[]')
    setBookmarked(stored.includes(slug))
  }, [slug])

  if (loading) {
    return (
      <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 808, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ height: 34, width: 130, background: 'var(--bg2)', borderRadius: 999, marginBottom: 28 }} />
          <div style={{ height: 36, width: '85%', background: 'var(--bg2)', borderRadius: 6, marginBottom: 14 }} />
          <div style={{ height: 14, width: '60%', background: 'var(--bg2)', borderRadius: 4, marginBottom: 24 }} />
          <div style={{ aspectRatio: '16 / 9', background: 'var(--bg2)', borderRadius: 12, marginBottom: 32 }} />
          {[1,2,3,4,5].map(i => <div key={i} style={{ height: 14, width: '100%', background: 'var(--bg2)', borderRadius: 4, marginBottom: 10 }} />)}
        </div>
      </div>
    )
  }

  if (!post) return null

  const authorName = post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : 'OgaPay'
  const initials = ((post.author?.firstName?.[0] || '') + (post.author?.lastName?.[0] || '')) || 'OG'
  const badgeColors: Record<string, { bg: string; color: string }> = {
    News: { bg: '#E6F1FB', color: '#185FA5' },
    Businesses: { bg: '#EAF3DE', color: '#3B6D11' },
    Freelancers: { bg: '#EEEDFE', color: '#534AB7' },
    'Case Studies': { bg: '#FBEAF0', color: '#993556' },
  }
  const avatar = post.author?.avatarUrl
  const published = post.publishedAt ? formatDate(post.publishedAt) : post.date

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) { await navigator.share({ title: post.title, url }); return }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* closed the share sheet */ }
  }

  const toggleBookmark = () => {
    if (!slug) return
    const stored = JSON.parse(localStorage.getItem('ogapay_bookmarked_posts') || '[]')
    if (stored.includes(slug)) {
      localStorage.setItem('ogapay_bookmarked_posts', JSON.stringify(stored.filter((s: string) => s !== slug)))
      setBookmarked(false)
    } else {
      stored.push(slug)
      localStorage.setItem('ogapay_bookmarked_posts', JSON.stringify(stored))
      setBookmarked(true)
    }
  }

  return (
    <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <style>{`
        .ad-nav-link:hover { color: var(--accent) !important; }
        .ad-bar { padding: 0.875rem 2.5rem; }
        .ad-wrap { max-width: 808px; margin: 0 auto; padding: 32px 24px 60px; width: 100%; box-sizing: border-box; }
        .ad-top { display: flex; gap: 8px; margin-bottom: 28px; }
        .ad-pill { height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--card); color: var(--text); font-size: 13px; font-weight: 500; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: border-color .15s, background .15s; }
        .ad-pill:hover { border-color: var(--text3); }
        .ad-pill:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
        .ad-pill.icon { width: 36px; padding: 0; justify-content: center; }
        .ad-crumbs { font: 400 11px var(--font-mono, ui-monospace, monospace); color: var(--text3); margin-bottom: 18px; display: flex; gap: 6px; }
        .ad-crumbs a { color: var(--text3); text-decoration: none; }
        .ad-crumbs a:hover { color: var(--text); }
        .ad-author { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .ad-author img, .ad-av { width: 36px; height: 36px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
        .ad-av { background: var(--bg2); color: var(--text); display: grid; place-items: center; font-size: 12px; font-weight: 700; }
        .ad-author b { display: block; font-size: 14px; font-weight: 600; color: var(--text); }
        .ad-author span { display: block; font-size: 12px; color: var(--text3); }
        .ad-title { font-size: 36px; font-weight: 650; line-height: 1.17; letter-spacing: -0.035em; margin: 0 0 12px; color: var(--text); text-wrap: balance; }
        .ad-sub { font-size: 15px; line-height: 1.65; color: var(--text2); margin: 0 0 12px; }
        .ad-meta { font: 400 11px var(--font-mono, ui-monospace, monospace); color: var(--text3); margin-bottom: 28px; }
        .ad-foot { border-top: 1px solid var(--border); margin-top: 48px; padding-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .ad-share { display: flex; gap: 8px; }
        .ad-cover { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); background: var(--bg2); margin-bottom: 36px; }
        @media (max-width: 640px) {
          .ad-bar { padding: 0.75rem 1rem; }
          .ad-wrap { padding: 20px 16px 48px; }
          .ad-title { font-size: 28px; }
          .ad-cover { margin-bottom: 28px; }
        }
        .ad-content h2 { font-size: 22px; font-weight: 650; letter-spacing: -0.02em; line-height: 1.3; margin: 36px 0 12px; color: var(--text); }
        .ad-content h3 { font-size: 17px; font-weight: 650; line-height: 1.4; margin: 26px 0 8px; color: var(--text); }
        .ad-content p { font-size: 16px; line-height: 1.8; margin: 0 0 16px; color: var(--text); }
        .ad-content strong { font-weight: 650; color: var(--text); }
        .ad-content ul, .ad-content ol { padding-left: 24px; margin: 0 0 16px; }
        .ad-content li { font-size: 16px; line-height: 1.75; margin-bottom: 6px; color: var(--text); }
        .ad-content blockquote { border-left: 3px solid var(--border); margin: 24px 0; padding: 4px 0 4px 18px; color: var(--text2); }
        .ad-content img { max-width: 100%; border-radius: 12px; margin: 24px 0; }
        .ad-content figure { margin: 28px 0 30px; }
        .ad-content figure img { display: block; width: 100%; height: auto; margin: 0; border-radius: 12px; border: 1px solid var(--border); }
        .ad-content figcaption { margin-top: 10px; font-size: 13px; line-height: 1.5; color: var(--text3); text-align: center; }
        .ad-content a { color: var(--accent); text-decoration: underline; }
        .ad-content pre { background: #1a1a2e; color: #e4e4e4; padding: 16px 20px; border-radius: 12px; overflow-x: auto; -webkit-overflow-scrolling: touch; font-size: 13px; line-height: 1.6; margin: 20px 0; }
        .ad-content code { background: rgba(var(--accent-rgb),0.08); padding: 2px 6px; border-radius: 4px; font-size: 14px; }
      `}</style>

      <div style={{ position: 'fixed', top: 0, left: 0, height: 3, background: 'var(--accent)', zIndex: 9999, width: `${progress}%`, transition: 'width 0.1s' }} />

      <nav className="ad-bar" style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 20, background: 'var(--card)', position: 'sticky', top: 0, zIndex: 100 }}>
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

      <article className="ad-wrap">
        <div className="ad-top">
          <button className="ad-pill" onClick={() => navigate('/blog')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back to blog
          </button>
          <button className="ad-pill" onClick={share} aria-label="Share this article">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
            {copied ? 'Link copied' : 'Share'}
          </button>
        </div>

        <nav className="ad-crumbs" aria-label="Breadcrumb">
          <a href="/blog" onClick={(e) => { e.preventDefault(); navigate('/blog') }}>Blog</a>
          <span>/</span>
          <span>{post.category}</span>
        </nav>

        <div className="ad-author">
          {avatar ? <img src={sized(avatar, 36, true)} alt="" /> : <div className="ad-av">{initials}</div>}
          <div>
            <b>{authorName}</b>
            {post.author?.username && <span>@{post.author.username}</span>}
          </div>
        </div>

        <h1 className="ad-title">{post.title}</h1>
        {post.excerpt && <p className="ad-sub">{post.excerpt}</p>}
        <div className="ad-meta">Published on {published} · {estimateReadTime(post.content || '')}</div>

        {post.coverImage && (
          <img className="ad-cover" src={sized(post.coverImage, 760)} alt="" width={1600} height={900} />
        )}

        <div className="ad-content" dangerouslySetInnerHTML={renderContent(post.content)} />

        <div className="ad-foot">
          <div className="ad-author" style={{ marginBottom: 0 }}>
            {avatar ? <img src={sized(avatar, 36, true)} alt="" /> : <div className="ad-av">{initials}</div>}
            <div>
              <b>{authorName}</b>
              <span>{post.author?.username ? `@${post.author.username}` : 'OgaPay Contributor'}</span>
            </div>
          </div>
          <div className="ad-share">
            {SHARE_TARGETS.map(({ label, icon, href }) => (
              <button key={label} className="ad-pill icon" aria-label={label} title={label} onClick={() => {
                const url = window.location.href
                if (!href) { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {}); return }
                window.open(href(encodeURIComponent(url), encodeURIComponent(post?.title || '')), '_blank', 'noopener')
              }}>
                {!href && copied ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg> : icon}
              </button>
            ))}
            <button className="ad-pill icon" onClick={toggleBookmark} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this article'} title={bookmarked ? 'Bookmarked' : 'Bookmark'} aria-pressed={bookmarked}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
        </div>

        {/* Likes, comments and tips */}
        {slug && <BlogReactions slug={slug} post={post} />}
      </article>

      {related.length > 0 && (
        <div style={{ maxWidth: 1060, margin: '0 auto', padding: '0 24px 40px', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Related articles</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {related.map((rp: any) => {
              const b = badgeColors[rp.category] || { bg: 'var(--accent)', color: 'var(--accent)' }
              const na = rp.author ? `${rp.author.firstName || ''} ${rp.author.lastName || ''}`.trim() : 'OgaPay'
              const inits = ((rp.author?.firstName?.[0] || '') + (rp.author?.lastName?.[0] || '')) || 'OG'
              return (
                <div key={rp.id} onClick={() => navigate(`/blog/${rp.slug}`)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ aspectRatio: '16 / 9', background: rp.coverColor || 'var(--accent)', backgroundImage: rp.coverImage ? `url(${sized(rp.coverImage, 360)})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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