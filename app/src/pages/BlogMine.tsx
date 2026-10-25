import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadError from '../components/LoadError'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

// /blog/my: the writer's own articles with All / Drafts / In review / Published
// tabs ("In review" = sent to an admin, not live yet), plus a title search.
type Mine = { id: string; title: string; slug: string; status: 'DRAFT' | 'PENDING' | 'PUBLISHED'; createdAt: string; publishedAt?: string | null; viewCount: number; category?: string | null }
type Tab = 'ALL' | 'DRAFT' | 'PENDING' | 'PUBLISHED'
const TABS: { key: Tab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'PENDING', label: 'In review' },
  { key: 'PUBLISHED', label: 'Published' },
]
const STATUS_LABEL = { DRAFT: 'Draft', PENDING: 'In review', PUBLISHED: 'Published' } as const

export default function BlogMine() {
  const [posts, setPosts] = useState<Mine[] | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('ALL')
  const [q, setQ] = useState('')

  useEffect(() => {
    apiRequest<any>('/blog/user/mine')
      .then((d) => setPosts(d?.posts || []))
      .catch((e) => { setError(e?.message || 'Could not load your articles') })
  }, [])

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { ALL: 0, DRAFT: 0, PENDING: 0, PUBLISHED: 0 }
    for (const p of posts || []) { c.ALL++; c[p.status]++ }
    return c
  }, [posts])

  const shown = (posts || []).filter((p) => (tab === 'ALL' || p.status === tab) && (!q.trim() || p.title.toLowerCase().includes(q.trim().toLowerCase())))
  const date = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Layout>
      <style>{`
        .bm-page{max-width:calc(820px + 2 * var(--gutter));margin:0 auto;padding:24px var(--gutter) 48px;color:var(--text)}
        .bm-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}
        .bm-head h1{font-size:24px;font-weight:800;margin:0}
        .bm-new{height:44px;padding:0 18px;border-radius:99px;background:#0a0a0a;color:#fff;font-weight:700;font-size:14px;display:inline-flex;align-items:center;text-decoration:none}
        .bm-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
        .bm-tab{min-height:40px;padding:0 14px;border-radius:99px;border:1.5px solid var(--border);background:transparent;color:var(--text2);font-weight:700;font-size:13px;cursor:pointer}
        .bm-tab.on{background:#0a0a0a;border-color:#0a0a0a;color:#fff}
        .bm-search{width:100%;height:44px;padding:0 14px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:14px;font-family:inherit;margin-bottom:14px;box-sizing:border-box}
        .bm-list{border:1px solid var(--border);border-radius:12px;background:var(--card)}
        .bm-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border);flex-wrap:wrap}
        .bm-row:last-child{border-bottom:0}
        .bm-t{flex:1;min-width:180px}
        .bm-t strong{display:block;font-size:15px}
        .bm-t span{font-size:12px;color:var(--text3)}
        .bm-pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;border:1px solid var(--border);color:var(--text2);white-space:nowrap}
        .bm-pill.pending{color:#b45309}
        .bm-pill.published{color:var(--green)}
        .bm-row a{font-size:13px;font-weight:700;color:var(--text);min-height:44px;display:inline-flex;align-items:center}
        .bm-empty{padding:36px 16px;text-align:center;color:var(--text2);border:1px dashed var(--border);border-radius:12px}
      `}</style>
      <div className="bm-page">
        <div className="bm-head">
          <h1>My blogs</h1>
          <span style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Link to="/blog/all" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>All blogs</Link>
            <Link to="/blog/write" className="bm-new">+ New article</Link>
          </span>
        </div>
        <div className="bm-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={`bm-tab${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>
        <input className="bm-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search my articles by title" aria-label="Search my articles" />
        {posts === null ? (error ? <LoadError what="your articles" onRetry={() => window.location.reload()} /> : <div className="bm-empty">Loading…</div>) : shown.length === 0 ? (
          <div className="bm-empty">
            {posts.length === 0 ? <>You haven't written anything yet. <Link to="/blog/write">Write your first article</Link>.</> : 'Nothing here.'}
          </div>
        ) : (
          <div className="bm-list">
            {shown.map((p) => (
              <div key={p.id} className="bm-row">
                <div className="bm-t">
                  <strong>{p.title}</strong>
                  <span>{p.status === 'PUBLISHED' && p.publishedAt ? `Published ${date(p.publishedAt)} · ${p.viewCount.toLocaleString()} views` : `Started ${date(p.createdAt)}`}</span>
                </div>
                <span className={`bm-pill ${p.status.toLowerCase()}`}>{STATUS_LABEL[p.status]}</span>
                {p.status === 'PUBLISHED' && <Link to={`/blog/${p.slug}`}>View</Link>}
                <Link to={`/blog/edit/${p.id}`}>Edit</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
