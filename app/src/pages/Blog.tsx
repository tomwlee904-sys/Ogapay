import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Layout from "../components/Layout"
import LoadError from "../components/LoadError"
import BlogNav from "../components/BlogNav"
import { apiRequest } from "../lib/api"
import { openSignIn } from "../lib/signin"
import { sized } from '../lib/img'

const categories = ['All', 'News', 'Businesses', 'Freelancers', 'Case Studies']
// The index shows the top few; every article is on /blog/all
const SHOW = 9

/* Explore OgaPay: four link tiles to the rest of the site. Each tile is one
   link (it used to be a clickable box holding a button that navigated too, so
   one tap went to the page twice and Back stayed there). The pictures are
   illustrations with their own colours; the labels use theme colours. */
function Tile({ to, label, className, children }: { to: string; label: string; className?: string; children: React.ReactNode }) {
  return (
    <Link to={to} className={`bl-tile${className ? ` ${className}` : ''}`}>
      {children}
      <span className="bl-tile-label">{label} <b aria-hidden="true">→</b></span>
    </Link>
  )
}

function StartSellingArt() {
  const card = (cls: string) => (
    <span className={`bl-ss-card ${cls}`}>
      <span className="bl-ss-pic" />
      <span className="bl-ss-line"><span className="bl-ss-dot" /><span className="bl-ss-bar" /></span>
    </span>
  )
  return (
    <span className="bl-art" aria-hidden="true">
      {card('l')}
      {card('r')}
      <span className="bl-ss-front">
        <span className="bl-ss-fpic"><i className="ti ti-user-code" /></span>
        <span className="bl-ss-line"><span className="bl-ss-dot" /><span className="bl-ss-bar" /></span>
        <span className="bl-ss-progress"><span /></span>
      </span>
    </span>
  )
}

function GrowBusinessArt() {
  return (
    <span className="bl-art" aria-hidden="true">
      <svg className="bl-donut" width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="28" />
        <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="28" strokeDasharray="340 452" strokeDashoffset="113" strokeLinecap="round" />
        <circle cx="90" cy="90" r="72" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="28" strokeDasharray="68 452" strokeDashoffset="-227" strokeLinecap="round" />
        <circle cx="90" cy="90" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="18" />
        <circle cx="90" cy="90" r="44" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="18" strokeDasharray="220 276" strokeDashoffset="69" strokeLinecap="round" />
        <circle cx="90" cy="90" r="24" fill="rgba(255,255,255,0.15)" />
        <text x="90" y="96" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">↗</text>
      </svg>
    </span>
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
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const navigate = useNavigate()
  const { isAuthed } = useAuth()

  // Published posts from the API. A failed request keeps the list "not loaded"
  // (it used to become an empty list, so the page said there were no stories).
  useEffect(() => {
    let live = true
    setFailed(false)
    apiRequest<any>('/blog?limit=100', { auth: false })
      .then((res) => { if (live) setAllPosts(res?.posts || []) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [reload])

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
  // Searching or picking a category shows every match; otherwise the top few
  const capped = !q && activeCategory === 'All' && filteredArticles.length > SHOW
  const shown = capped ? filteredArticles.slice(0, SHOW) : filteredArticles

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

  const loading = allPosts === null && !failed

  return (
    <Layout>
      <style>{`
        .bl-tools{display:flex;align-items:center;gap:12px;margin-top:20px}
        .bl-search{flex:1 1 auto;max-width:400px}
        .bl-sortrow{display:flex;align-items:center;gap:12px;flex:1 1 auto;min-width:0}
        .bl-count{margin-left:auto;white-space:nowrap}
        .bl-seg{display:flex;gap:4px;padding:4px;border:1px solid var(--border);border-radius:12px;background:var(--card)}
        .bl-seg button{height:34px;padding:0 14px;border:0;border-radius:8px;background:none;font:600 13px/1 var(--font);color:var(--text2);cursor:pointer;white-space:nowrap}
        .bl-seg button:hover:not(.on){color:var(--text)}
        .bl-seg button.on{background:var(--text);color:var(--bg)}
        .bl-chips{display:flex;gap:8px;margin-top:12px}
        .bl-chips button{flex-shrink:0;height:36px;padding:0 14px;border:1px solid var(--border);border-radius:999px;background:var(--card);font:500 13px/1 var(--font);color:var(--text2);cursor:pointer}
        .bl-chips button.on{background:var(--text);border-color:var(--text);color:var(--bg)}
        .bl-list{margin-top:20px}
        .bl-card{display:flex;flex-direction:column;overflow:hidden;background:var(--card);border:1px solid var(--border);border-radius:var(--r-card);text-decoration:none;color:inherit;transition:border-color var(--t-fast) var(--ease)}
        .bl-card:hover{border-color:var(--text3)}
        .bl-cover{aspect-ratio:16/9;background:var(--card2);display:grid;place-items:center;overflow:hidden}
        .bl-cover img{width:100%;height:100%;object-fit:cover;display:block}
        .bl-cover i{font-size:40px;color:var(--text3)}
        .bl-body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:8px;flex:1}
        .bl-cat{align-self:flex-start;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--card2);color:var(--text2)}
        .bl-ctitle{margin:0;font-size:16px;font-weight:600;line-height:1.4;color:var(--text)}
        .bl-ex{margin:0;font-size:13.5px;line-height:1.6;color:var(--text2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .bl-meta{margin-top:auto;display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12.5px;color:var(--text2)}
        .bl-meta img,.bl-av{width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0}
        .bl-av{background:var(--text);color:var(--bg);display:grid;place-items:center;font-size:9px;font-weight:600}
        .bl-more{display:flex;justify-content:center;margin-top:20px}
        .bl-explore{margin-top:56px}
        .bl-explore .ui-h2{margin-top:6px}
        .bl-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}
        .bl-tile{position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;overflow:hidden;isolation:isolate;border:1px solid var(--border);border-radius:var(--r-card);background:var(--card2);text-decoration:none;color:inherit}
        .bl-tile > img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .4s var(--ease)}
        .bl-tile:hover > img{transform:scale(1.04)}
        .bl-tile-label{position:absolute;left:12px;bottom:12px;z-index:2;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 12px 0 14px;border-radius:var(--r-ctl);background:var(--bg);color:var(--text);font:600 13px/1.2 var(--font);box-shadow:0 2px 8px rgba(0,0,0,.14)}
        .bl-tile-label b{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:var(--text);color:var(--bg);font-size:12px}
        .bl-tile:focus-visible .bl-tile-label{outline:2px solid var(--focus);outline-offset:2px}
        .bl-tile-sell{background:#4A1B3A}
        .bl-tile-grow{background:#0a0a0a}
        .bl-art{position:relative;display:grid;place-items:center;width:180px;height:180px;margin-bottom:44px;transform:scale(.85)}
        .bl-art > *{grid-area:1/1}
        .bl-ss-card,.bl-ss-front{display:flex;flex-direction:column;gap:8px;padding:8px;border-radius:10px;transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
        .bl-ss-card{width:130px;height:165px;border:2px solid rgba(255,255,255,.2)}
        .bl-ss-card.l{background:#E8A0B4;transform:rotate(-6deg) translate(-20px,4px)}
        .bl-ss-card.r{background:#F2C4D0;transform:rotate(6deg) translate(20px,4px)}
        .bl-tile:hover .bl-ss-card.l{transform:rotate(-12deg) translate(-60px,10px)}
        .bl-tile:hover .bl-ss-card.r{transform:rotate(12deg) translate(60px,10px)}
        .bl-ss-pic{height:80px;border-radius:6px;background:rgba(255,255,255,.22)}
        .bl-ss-line{display:flex;align-items:center;gap:4px}
        .bl-ss-dot{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.5);flex-shrink:0}
        .bl-ss-bar{height:8px;flex:1;border-radius:4px;background:rgba(255,255,255,.4)}
        .bl-ss-front{position:relative;z-index:1;width:140px;height:175px;background:#0a0a0a;border:3px solid #0a0a0a;box-shadow:0 6px 20px rgba(0,0,0,.25)}
        .bl-tile:hover .bl-ss-front{transform:scale(1.06) translateY(-6px)}
        .bl-ss-fpic{height:90px;border-radius:6px;background:#fff;display:grid;place-items:center;font-size:32px;color:#0a0a0a}
        .bl-ss-progress{height:4px;border-radius:2px;background:rgba(255,255,255,.2)}
        .bl-ss-progress span{display:block;width:80%;height:100%;border-radius:2px;background:#fff}
        .bl-donut{transition:transform .6s ease}
        .bl-tile:hover .bl-donut{transform:rotate(360deg);transition:transform 1.2s cubic-bezier(.4,0,.2,1)}
        .bl-news{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,420px);align-items:center;gap:16px 32px;margin-top:40px;padding:24px}
        .bl-news .ui-sub{margin-top:4px}
        .bl-news-form{display:flex;gap:8px}
        .bl-news-form .ui-input{flex:1;min-width:0}
        .bl-news-ok{margin:0;display:flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--green)}
        .bl-news .ui-error{grid-column:1/-1;margin:0}
        @media (max-width:1023.98px){
          .bl-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}
          .bl-tile{aspect-ratio:16/10}
          .bl-art{transform:scale(.75);margin-bottom:36px}
        }
        @media (max-width:767.98px){
          .bl-tools{flex-direction:column;align-items:stretch;margin-top:16px}
          .bl-search{max-width:none}
          .bl-chips{overflow-x:auto;scrollbar-width:none;margin-inline:calc(-1 * var(--gutter));padding-inline:var(--gutter);scroll-padding-inline:var(--gutter);-webkit-mask-image:linear-gradient(90deg,#000 85%,transparent);mask-image:linear-gradient(90deg,#000 85%,transparent)}
          .bl-chips::-webkit-scrollbar{display:none}
          .bl-list{margin-top:16px}
          .bl-explore{margin-top:40px}
          .bl-tiles{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:78%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;margin-inline:calc(-1 * var(--gutter));padding-inline:var(--gutter);scroll-padding-inline:var(--gutter)}
          .bl-tiles::-webkit-scrollbar{display:none}
          .bl-tile{aspect-ratio:auto;height:200px;scroll-snap-align:start}
          .bl-art{transform:scale(.62);margin-bottom:40px}
          .bl-news{grid-template-columns:minmax(0,1fr);padding:20px;margin-top:32px}
          .bl-news-form{flex-direction:column}
          .bl-news-form .ui-input{flex:none}
        }
        @media (prefers-reduced-motion:reduce){.bl-tile > img,.bl-ss-card,.bl-ss-front,.bl-donut{transition:none}}
      `}</style>

      <div className="ui-page">
        <header className="ui-head">
          <div>
            <h1 className="ui-title">Blog</h1>
            <p className="ui-sub">Guides, tips and earning stories from the OgaPay community.</p>
          </div>
        </header>
        <BlogNav active="home" />

        <div className="bl-tools">
          <label className="ui-search bl-search">
            <i className="ti ti-search" aria-hidden="true" />
            <input className="ui-input" type="search" placeholder="Search articles" aria-label="Search articles" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="bl-sortrow">
            <div className="bl-seg" role="group" aria-label="Sort articles">
              <button type="button" aria-pressed={sort === 'featured'} className={sort === 'featured' ? 'on' : ''} onClick={() => setSort('featured')}>Featured</button>
              <button type="button" aria-pressed={sort === 'newest'} className={sort === 'newest' ? 'on' : ''} onClick={() => setSort('newest')}>Newest</button>
            </div>
            {allPosts !== null && <span className="ui-count bl-count"><b>{filteredArticles.length}</b> {filteredArticles.length === 1 ? 'article' : 'articles'}</span>}
          </div>
        </div>

        {usedCategories.length > 1 && (
          <div className="bl-chips" role="group" aria-label="Category">
            {usedCategories.map((cat) => <button key={cat} type="button" className={`tap${activeCategory === cat ? ' on' : ''}`} aria-pressed={activeCategory === cat} onClick={() => setActiveCategory(cat)}>{cat}</button>)}
          </div>
        )}

        <div className="bl-list">
          {failed ? (
            <LoadError what="the articles" onRetry={() => setReload((r) => r + 1)} />
          ) : loading ? (
            <div className="ui-grid-3" aria-busy="true" aria-label="Loading articles">
              {[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 300 }} />)}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="ui-empty">
              <strong>{q ? `No articles match "${search.trim()}"` : posts.length === 0 ? 'No articles yet' : `No ${activeCategory} articles yet`}</strong>
              {q ? 'Try other words.' : 'Articles from the community will show here.'}
              <div style={{ marginTop: 14 }}>
                {q
                  ? <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setSearch('')}>Clear search</button>
                  : <button type="button" className="ui-btn ui-btn-ghost" onClick={write}><i className="ti ti-pencil" aria-hidden="true" /> Write the first one</button>}
              </div>
            </div>
          ) : (
            <>
              <div className="ui-grid-3">
                {shown.map((post: any) => {
                  const author = post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || post.author.username : 'OgaPay'
                  const initials = author.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'OG'
                  const date = new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  return (
                    <Link key={post.id} to={`/blog/${post.slug}`} className="bl-card">
                      <div className="bl-cover">
                        {post.coverImage
                          ? <img src={sized(post.coverImage, 640)} alt="" loading="lazy" />
                          : <i className="ti ti-book-2" aria-hidden="true" />}
                      </div>
                      <div className="bl-body">
                        {post.category && <span className="bl-cat">{post.category}</span>}
                        <h2 className="bl-ctitle">{post.title}</h2>
                        {post.excerpt && <p className="bl-ex">{post.excerpt}</p>}
                        <div className="bl-meta">
                          {post.author?.avatarUrl
                            ? <img src={sized(post.author.avatarUrl, 22, true)} alt="" />
                            : <span className="bl-av" aria-hidden="true">{initials}</span>}
                          <span>{author}</span>
                          <span aria-hidden="true">·</span>
                          <span>{date}</span>
                          {post.viewCount > 0 && <><span aria-hidden="true">·</span><span>{post.viewCount.toLocaleString()} views</span></>}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              {capped && (
                <div className="bl-more"><Link to="/blog/all" className="ui-btn ui-btn-ghost">See all articles <i className="ti ti-arrow-right" aria-hidden="true" /></Link></div>
              )}
            </>
          )}
        </div>

        {/* Explore OgaPay: links to the rest of the site */}
        <section className="bl-explore" aria-labelledby="bl-explore-h">
          <span className="ui-eyebrow">Explore OgaPay</span>
          <h2 id="bl-explore-h" className="ui-h2">Find your people. Grow your work.</h2>
          <div className="bl-tiles">
            <Tile to="/communities" label="Join the community">
              <img src="/assets/join-community.jpg" alt="" loading="lazy" />
            </Tile>
            <Tile to="/store" label="Start selling" className="bl-tile-sell"><StartSellingArt /></Tile>
            <Tile to="/create" label="Grow your business" className="bl-tile-grow"><GrowBusinessArt /></Tile>
            <Tile to="/writer" label="Get paid to write">
              <img src="/assets/get-inspired.png" alt="" loading="lazy" />
            </Tile>
          </div>
        </section>

        {/* Newsletter */}
        <section className="ui-card bl-news" aria-labelledby="bl-news-h">
          <div>
            <h2 id="bl-news-h" className="ui-h2">Stay in the loop</h2>
            <p className="ui-sub">OgaPay tips, earning stories and platform updates by email.</p>
          </div>
          {subscribed ? (
            <p className="bl-news-ok"><i className="ti ti-circle-check" aria-hidden="true" /> You're subscribed.</p>
          ) : (
            <form className="bl-news-form" noValidate onSubmit={(e) => { e.preventDefault(); subscribe() }}>
              <input className="ui-input" type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email address" />
              <button type="submit" className="ui-btn ui-btn-dark" disabled={subscribing}>{subscribing ? 'Subscribing…' : 'Subscribe'}</button>
            </form>
          )}
          {subError && <p className="ui-error" role="alert">{subError}</p>}
        </section>
      </div>
    </Layout>
  )
}
