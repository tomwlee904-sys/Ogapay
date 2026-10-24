import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import Layout from '../components/Layout'
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
  const [post, setPost] = useState<any>(null)
  const loadedSlug = useRef<string | null>(null)
  const [related, setRelated] = useState<any[]>([])
  // ok, or why there is no article: 'missing' (deleted or a wrong link) or
  // 'failed' (network or server trouble). Both stay on this address: a failed
  // load used to jump to /blog with no message, and Back led straight here again.
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'failed'>('loading')
  const [reload, setReload] = useState(0)
  const [progress, setProgress] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug || loadedSlug.current === slug) return
    setState('loading')
    setRelated([])
    apiRequest<any>(`/blog/${slug}`)
      .then(data => {
        if (!data) { setState('missing'); return }
        setPost(data)
        setState('ok')
        loadedSlug.current = data?.slug || null
        // An old or alternative link: show the post's own address (without loading it twice)
        if (data?.slug && data.slug !== slug) navigate(`/blog/${data.slug}`, { replace: true })
        // Related articles are extra: if they don't load, the list is left out
        apiRequest<any>(`/blog?category=${data.category}&limit=3`)
          .then(d => setRelated((d?.posts || []).filter((p: any) => p.slug !== slug && p.slug !== data.slug).slice(0, 3)))
          .catch(() => {})
      })
      .catch((e) => setState(/not found/i.test(e?.message || '') ? 'missing' : 'failed'))
  }, [slug, navigate, reload])

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

  // The article's own title in the browser tab and in shared links (og:title,
  // twitter:title), put back when leaving the article
  useEffect(() => {
    if (!post?.title) return
    const tags = ['meta[property="og:title"]', 'meta[name="twitter:title"]']
      .map((q) => document.head.querySelector<HTMLMetaElement>(q)).filter(Boolean) as HTMLMetaElement[]
    const before = tags.map((t) => t.content)
    document.title = `${post.title} | OgaPay Blog`
    tags.forEach((t) => { t.content = post.title })
    return () => { tags.forEach((t, i) => { t.content = before[i] }) }
  }, [post?.title])

  if (state === 'loading') {
    return (
      <Layout>
        <div className="ui-page">
          <div className="ui-narrow" aria-busy="true" aria-label="Loading the article">
            <div className="ui-sk" style={{ height: 44, width: 150, borderRadius: 999, marginBottom: 28 }} />
            <div className="ui-sk" style={{ height: 36, width: '85%', borderRadius: 6, marginBottom: 14 }} />
            <div className="ui-sk" style={{ height: 14, width: '60%', borderRadius: 4, marginBottom: 24 }} />
            <div className="ui-sk" style={{ aspectRatio: '16 / 9', borderRadius: 12, marginBottom: 32 }} />
            {[1,2,3,4,5].map(i => <div key={i} className="ui-sk" style={{ height: 14, width: '100%', borderRadius: 4, marginBottom: 10 }} />)}
          </div>
        </div>
      </Layout>
    )
  }

  if (state === 'missing' || state === 'failed' || !post) {
    const missing = state !== 'failed'
    return (
      <Layout>
        <div className="ui-page">
          <div className="ui-narrow">
            <Link to="/blog" className="ui-eyebrow tap"><i className="ti ti-arrow-left" aria-hidden="true" /> Blog</Link>
            <h1 className="ui-title">{missing ? "This article isn't available" : "We couldn't load this article"}</h1>
            <p className="ui-sub">{missing ? 'It may have been removed, or the link is wrong.' : 'Check your connection and try again. Nothing has changed on your account.'}</p>
            <div className="ui-actions" style={{ marginTop: 20 }}>
              {!missing && <button type="button" className="ui-btn ui-btn-dark" onClick={() => setReload(r => r + 1)}><i className="ti ti-refresh" aria-hidden="true" /> Try again</button>}
              <Link to="/blog" className={`ui-btn ${missing ? 'ui-btn-dark' : 'ui-btn-ghost'}`}>Browse the blog</Link>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const authorName = post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : 'OgaPay'
  const initials = ((post.author?.firstName?.[0] || '') + (post.author?.lastName?.[0] || '')) || 'OG'
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
    <Layout>
    <div className="ui-page" style={{ color: 'var(--text)' }}>
      <style>{`
        .ad-wrap { width: 100%; }
        .ad-top { display: flex; gap: 8px; margin-bottom: 24px; }
        .ad-pill { height: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--border); background: var(--card); color: var(--text); font-size: 13px; font-weight: 500; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: border-color .15s, background .15s; }
        .ad-pill:hover { border-color: var(--text3); }
        .ad-pill:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
        .ad-pill.icon { width: 40px; height: 40px; padding: 0; justify-content: center; }
        .ad-crumbs { font: 400 12px var(--font-mono, ui-monospace, monospace); color: var(--text2); margin-bottom: 18px; display: flex; gap: 6px; }
        .ad-crumbs a { color: var(--text2); text-decoration: none; }
        .ad-crumbs a:hover { color: var(--text); }
        .ad-author { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .ad-author img, .ad-av { width: 36px; height: 36px; border-radius: 10px; object-fit: cover; flex-shrink: 0; }
        .ad-av { background: var(--card2); color: var(--text); display: grid; place-items: center; font-size: 12px; font-weight: 700; }
        .ad-author b { display: block; font-size: 14px; font-weight: 600; color: var(--text); }
        .ad-author span { display: block; font-size: 12px; color: var(--text3); }
        .ad-title { font-size: var(--fs-title); font-weight: 600; line-height: 1.15; letter-spacing: -0.035em; margin: 0 0 12px; color: var(--text); text-wrap: balance; }
        .ad-sub { font-size: 15px; line-height: 1.65; color: var(--text2); margin: 0 0 12px; }
        .ad-meta { font: 400 12px var(--font-mono, ui-monospace, monospace); color: var(--text2); margin-bottom: 28px; }
        .ad-foot { border-top: 1px solid var(--border); margin-top: 48px; padding-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .ad-share { display: flex; gap: 8px; }
        .ad-cover { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); background: var(--card2); margin-bottom: 36px; }
        .ad-related { margin-top: 48px; }
        .ad-related .ui-h2 { margin-bottom: 16px; }
        .ad-rcard { display: flex; flex-direction: column; background: var(--card); border: 1px solid var(--border); border-radius: var(--r-card); overflow: hidden; text-decoration: none; color: inherit; transition: border-color var(--t-fast) var(--ease); }
        .ad-rcard:hover { border-color: var(--text3); }
        .ad-rcover { aspect-ratio: 16 / 9; background: var(--card2) center / cover no-repeat; display: grid; place-items: center; color: var(--text3); }
        .ad-rbody { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 6px; }
        .ad-rbody .ad-cat { align-self: flex-start; font-size: 12px; font-weight: 600; padding: 2px 9px; border-radius: 999px; background: var(--card2); color: var(--text2); }
        .ad-rbody strong { font-size: 14.5px; font-weight: 600; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .ad-rbody span { font-size: 12.5px; color: var(--text2); }
        @media (max-width: 767.98px) {
          .ad-cover { margin-bottom: 28px; }
          .ad-related { margin-top: 40px; }
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
        .ad-content pre code { background: none; padding: 0; color: inherit; font-size: 13px; }
        .ad-content .md-table { overflow-x: auto; margin: 20px 0; }
        .ad-content table { border-collapse: collapse; width: 100%; font-size: 14px; }
        .ad-content th, .ad-content td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; vertical-align: top; }
        .ad-content th { background: var(--card2); font-weight: 650; }
        .ad-content li.md-task { list-style: none; margin-left: -20px; }
        .ad-content del { color: var(--text3); }
      `}</style>

      <div style={{ position: 'fixed', top: 0, left: 0, height: 3, background: 'var(--accent)', zIndex: 9999, width: `${progress}%`, transition: 'width 0.1s' }} />


      <article className="ad-wrap ui-narrow">
        <div className="ad-top">
          <Link to="/blog" className="ad-pill" style={{ textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Back to blog
          </Link>
          <button className="ad-pill" onClick={share} aria-label="Share this article">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
            {copied ? 'Link copied' : 'Share'}
          </button>
        </div>

        <nav className="ad-crumbs" aria-label="Breadcrumb">
          <a href="/blog" className="tap" onClick={(e) => { e.preventDefault(); navigate('/blog') }}>Blog</a>
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
              <button key={label} className="ad-pill icon tap" aria-label={label} title={label} onClick={() => {
                const url = window.location.href
                if (!href) { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {}); return }
                window.open(href(encodeURIComponent(url), encodeURIComponent(post?.title || '')), '_blank', 'noopener')
              }}>
                {!href && copied ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg> : icon}
              </button>
            ))}
            <button className="ad-pill icon tap" onClick={toggleBookmark} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this article'} title={bookmarked ? 'Bookmarked' : 'Bookmark'} aria-pressed={bookmarked}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
        </div>

        {/* Likes, comments and tips */}
        {slug && <BlogReactions slug={slug} post={post} />}
      </article>

      {related.length > 0 && (
        <section className="ad-related" aria-labelledby="ad-related-h">
          <h2 id="ad-related-h" className="ui-h2">Related articles</h2>
          <div className="ui-grid-3">
            {related.map((rp: any) => {
              const na = rp.author ? `${rp.author.firstName || ''} ${rp.author.lastName || ''}`.trim() : 'OgaPay'
              return (
                <Link key={rp.id} to={`/blog/${rp.slug}`} className="ad-rcard">
                  <div className="ad-rcover" style={rp.coverImage ? { backgroundImage: `url(${sized(rp.coverImage, 360)})` } : undefined}>
                    {!rp.coverImage && <i className="ti ti-book-2" aria-hidden="true" style={{ fontSize: 34 }} />}
                  </div>
                  <div className="ad-rbody">
                    {rp.category && <span className="ad-cat">{rp.category}</span>}
                    <strong>{rp.title}</strong>
                    <span>{na}{rp.publishedAt ? ` · ${formatDate(rp.publishedAt)}` : ''}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

    </div>
    </Layout>
  )
}