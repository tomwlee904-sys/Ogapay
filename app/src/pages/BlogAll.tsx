import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import BlogNav from '../components/BlogNav'
import { apiRequest } from '../lib/api'
import { Pagination } from '../components/Pagination'
import { sized } from '../lib/img'

// /blog/all: every published article, 12 a page, with search. The main /blog page
// only shows the newest ones.
const PER_PAGE = 12

type Post = {
  id: string; title: string; excerpt?: string | null; slug: string; category?: string | null
  coverImage?: string | null; publishedAt?: string | null; createdAt: string; viewCount: number
  author?: { firstName?: string; lastName?: string; username?: string } | null
}

export default function BlogAll() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1)
  const q = params.get('q') || ''
  const [typed, setTyped] = useState(q)
  const [data, setData] = useState<{ posts: Post[]; total: number; pages: number } | null>(null)
  // A failed load shows "couldn't load" with Try again (it used to show the
  // browser's raw "Failed to fetch")
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let live = true
    setData(null); setFailed(false)
    const qs = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) })
    if (q) qs.set('q', q)
    apiRequest<any>(`/blog?${qs}`, { auth: false })
      .then((d) => { if (live) setData({ posts: d?.posts || [], total: d?.total ?? (d?.posts || []).length, pages: d?.pages || 1 }) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [page, q, reload])

  const go = (next: { page?: number; q?: string }) => {
    const p = new URLSearchParams()
    const nq = next.q ?? q
    if (nq) p.set('q', nq)
    if ((next.page ?? 1) > 1) p.set('page', String(next.page))
    setParams(p)
    window.scrollTo({ top: 0 })
  }

  const author = (p: Post) => p.author?.username ? `@${p.author.username}` : [p.author?.firstName, p.author?.lastName].filter(Boolean).join(' ') || 'OgaPay'
  const date = (p: Post) => new Date(p.publishedAt || p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Layout>
      <style>{`
        .ba-tools{display:flex;align-items:center;justify-content:space-between;gap:12px 16px;margin:20px 0}
        .ba-search{flex:1 1 auto;max-width:560px}
        .ba-search .ui-input{flex:1;min-width:0}
        .ba-count{margin:0;white-space:nowrap}
        .ba-card{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--border);border-radius:var(--r-card);overflow:hidden;text-decoration:none;color:inherit;transition:border-color var(--t-fast) var(--ease)}
        .ba-card:hover{border-color:var(--text3)}
        .ba-cover{aspect-ratio:16/9;background:var(--card2);overflow:hidden;display:grid;place-items:center}
        .ba-cover img{width:100%;height:100%;object-fit:cover;display:block}
        .ba-cover i{font-size:36px;color:var(--text3)}
        .ba-body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:6px;flex:1}
        .ba-cat{font-size:12px;font-weight:600;color:var(--text2)}
        .ba-title{font-size:16px;font-weight:600;line-height:1.4;margin:0;color:var(--text)}
        .ba-ex{font-size:13.5px;color:var(--text2);line-height:1.55;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        .ba-meta{margin-top:auto;padding-top:4px;font-size:12.5px;color:var(--text2)}
        @media (max-width:767.98px){
          .ba-tools{flex-direction:column;align-items:stretch;margin:16px 0}
          .ba-search{max-width:none}
        }
      `}</style>
      <div className="ui-page">
        <header className="ui-head">
          <div>
            <h1 className="ui-title">All articles</h1>
            <p className="ui-sub">Every article from the OgaPay community, newest first.</p>
          </div>
        </header>
        <BlogNav active="all" />

        <div className="ba-tools">
          <form className="ui-search ba-search" role="search" onSubmit={(e) => { e.preventDefault(); go({ q: typed.trim(), page: 1 }) }}>
            <i className="ti ti-search" aria-hidden="true" />
            <input className="ui-input" type="search" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search titles, summaries and tags" aria-label="Search the blog" maxLength={80} />
            <button type="submit" className="ui-search-btn" aria-label="Search"><i className="ti ti-arrow-right" aria-hidden="true" /></button>
          </form>
          {data && data.posts.length > 0 && (
            <p className="ui-count ba-count"><b>{data.total.toLocaleString()}</b> article{data.total === 1 ? '' : 's'}{q ? ` matching "${q}"` : ''}</p>
          )}
        </div>

        {failed ? (
          <LoadError what="the articles" onRetry={() => setReload((r) => r + 1)} />
        ) : data === null ? (
          <div className="ui-grid-3" aria-busy="true" aria-label="Loading articles">
            {[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 300 }} />)}
          </div>
        ) : data.posts.length === 0 ? (
          <div className="ui-empty">
            <strong>{q ? `No articles match "${q}"` : 'No articles yet'}</strong>
            {q ? 'Try other words, or clear the search.' : 'Articles from the community will show here.'}
            {q && <div style={{ marginTop: 14 }}><button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setTyped(''); go({ q: '', page: 1 }) }}>Clear search</button></div>}
          </div>
        ) : (
          <>
            <div className="ui-grid-3">
              {data.posts.map((p) => (
                <Link key={p.id} to={`/blog/${p.slug}`} className="ba-card">
                  <div className="ba-cover">{p.coverImage ? <img src={sized(p.coverImage, 640)} alt="" loading="lazy" /> : <i className="ti ti-book-2" aria-hidden="true" />}</div>
                  <div className="ba-body">
                    {p.category && <span className="ba-cat">{p.category}</span>}
                    <h2 className="ba-title">{p.title}</h2>
                    {p.excerpt && <p className="ba-ex">{p.excerpt}</p>}
                    <span className="ba-meta">{author(p)} · {date(p)} · {p.viewCount.toLocaleString()} views</span>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <Pagination
                page={page}
                totalPages={data.pages}
                firstItem={(page - 1) * PER_PAGE + 1}
                lastItem={(page - 1) * PER_PAGE + data.posts.length}
                totalItems={data.total}
                onPageChange={(n) => go({ page: n })}
              />
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
