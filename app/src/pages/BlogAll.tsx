import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
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
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null); setError('')
    const qs = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) })
    if (q) qs.set('q', q)
    apiRequest<any>(`/blog?${qs}`, { auth: false })
      .then((d) => setData({ posts: d?.posts || [], total: d?.total ?? (d?.posts || []).length, pages: d?.pages || 1 }))
      .catch((e) => setError(e?.message || 'Could not load the blog'))
  }, [page, q])

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
        .ba-page{max-width:calc(1000px + 2 * var(--gutter));margin:0 auto;padding:24px var(--gutter) 48px;color:var(--text)}
        .ba-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}
        .ba-head h1{font-size:24px;font-weight:800;margin:0}
        .ba-head p{margin:4px 0 0;font-size:13px;color:var(--text2)}
        .ba-links{display:flex;gap:14px;font-size:13px;font-weight:700}
        .ba-links a{color:var(--text);min-height:44px;display:inline-flex;align-items:center}
        .ba-search{display:flex;gap:8px;margin-bottom:20px}
        .ba-search input{flex:1;min-width:0;height:44px;padding:0 14px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:14px;font-family:inherit}
        .ba-search button{height:44px;padding:0 18px;border-radius:10px;border:none;background:#0a0a0a;color:#fff;font-weight:700;font-size:14px;cursor:pointer}
        .ba-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        @media(max-width:900px){.ba-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.ba-grid{grid-template-columns:1fr}}
        .ba-card{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit}
        .ba-cover{aspect-ratio:16/9;background:var(--bg2);overflow:hidden}
        .ba-cover img{width:100%;height:100%;object-fit:cover;display:block}
        .ba-body{padding:14px;display:flex;flex-direction:column;gap:6px;flex:1}
        .ba-cat{font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em}
        .ba-title{font-size:16px;font-weight:750;line-height:1.35;margin:0}
        .ba-ex{font-size:13px;color:var(--text2);line-height:1.5;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        .ba-meta{margin-top:auto;font-size:12px;color:var(--text3)}
        .ba-empty{padding:40px 16px;text-align:center;color:var(--text2);border:1px dashed var(--border);border-radius:14px}
        .ba-count{font-size:13px;color:var(--text2);margin:0 0 12px}
      `}</style>
      <div className="ba-page">
        <div className="ba-head">
          <div>
            <h1>All blogs</h1>
            <p>Every article from the OgaPay community, newest first.</p>
          </div>
          <div className="ba-links">
            <Link to="/blog">Blog home</Link>
            <Link to="/blog/my">My blogs</Link>
            <Link to="/blog/write">+ Write</Link>
          </div>
        </div>

        <form className="ba-search" role="search" onSubmit={(e) => { e.preventDefault(); go({ q: typed.trim(), page: 1 }) }}>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Search titles, summaries and tags" aria-label="Search the blog" maxLength={80} />
          <button type="submit">Search</button>
        </form>

        {error ? <div className="ba-empty">{error}</div> : data === null ? <div className="ba-empty">Loading…</div> : data.posts.length === 0 ? (
          <div className="ba-empty">{q ? `No articles match "${q}".` : 'No articles yet.'}</div>
        ) : (
          <>
            <p className="ba-count">{data.total.toLocaleString()} article{data.total === 1 ? '' : 's'}{q ? ` matching "${q}"` : ''}</p>
            <div className="ba-grid">
              {data.posts.map((p) => (
                <Link key={p.id} to={`/blog/${p.slug}`} className="ba-card">
                  <div className="ba-cover">{p.coverImage && <img src={sized(p.coverImage, 640)} alt="" loading="lazy" />}</div>
                  <div className="ba-body">
                    {p.category && <span className="ba-cat">{p.category}</span>}
                    <h2 className="ba-title">{p.title}</h2>
                    {p.excerpt && <p className="ba-ex">{p.excerpt}</p>}
                    <span className="ba-meta">{author(p)} · {date(p)} · {p.viewCount.toLocaleString()} views</span>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
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
