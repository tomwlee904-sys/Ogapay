import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadError from '../components/LoadError'
import Layout from '../components/Layout'
import BlogNav from '../components/BlogNav'
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
const NONE: Record<Tab, string> = { ALL: 'No articles yet.', DRAFT: 'You have no drafts.', PENDING: 'Nothing is waiting for review.', PUBLISHED: 'Nothing published yet.' }

export default function BlogMine() {
  const [posts, setPosts] = useState<Mine[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [tab, setTab] = useState<Tab>('ALL')
  const [q, setQ] = useState('')

  // Try again re-runs the request (it used to reload the whole page)
  useEffect(() => {
    let live = true
    setFailed(false)
    apiRequest<any>('/blog/user/mine')
      .then((d) => { if (live) setPosts(d?.posts || []) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [reload])

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
        .bm-tools{display:flex;align-items:center;justify-content:space-between;gap:12px 16px;margin:20px 0 16px}
        .bm-tabs{display:flex;gap:8px;min-width:0}
        .bm-tab{flex-shrink:0;height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--border);background:var(--card);color:var(--text2);font:500 13px/1 var(--font);cursor:pointer;white-space:nowrap}
        .bm-tab:hover:not(.on){color:var(--text);border-color:var(--border2)}
        .bm-tab em{font-style:normal;margin-left:5px;opacity:.65}
        .bm-tab.on{background:var(--text);border-color:var(--text);color:var(--bg)}
        .bm-search{flex:0 1 320px;min-width:0}
        .bm-list{border:1px solid var(--border);border-radius:var(--r-card);background:var(--card);overflow:hidden}
        .bm-row{display:grid;grid-template-columns:minmax(0,1fr) 110px 80px 130px auto;align-items:center;gap:12px;padding:10px 16px;border-top:1px solid var(--border)}
        .bm-row:first-child{border-top:0}
        .bm-th{padding-top:12px;padding-bottom:12px;font:500 var(--fs-label)/1.4 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--text2);background:var(--card2)}
        .bm-t{min-width:0}
        .bm-t strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:15px;font-weight:600;line-height:1.4;color:var(--text)}
        .bm-meta{display:none}
        .bm-col{font-size:13px;color:var(--text2);white-space:nowrap}
        .bm-pill{justify-self:start;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;white-space:nowrap;background:var(--card2);color:var(--text2)}
        .bm-pill.pending{color:var(--warn,#b45309);background:color-mix(in srgb,var(--warn,#b45309) 12%,transparent)}
        [data-theme="dark"] .bm-pill.pending{color:var(--warn,#fbbf24);background:color-mix(in srgb,var(--warn,#fbbf24) 14%,transparent)}
        .bm-pill.published{color:var(--green);background:color-mix(in srgb,var(--green) 14%,transparent)}
        .bm-acts{display:flex;align-items:center;justify-content:flex-end;gap:4px}
        @media (max-width:1023.98px){
          .bm-row{grid-template-columns:minmax(0,1fr) 110px 80px auto}
          .bm-col.date{display:none}
          .bm-th .date{display:none}
        }
        @media (max-width:767.98px){
          .bm-tools{flex-direction:column;align-items:stretch;margin:16px 0 12px}
          .bm-tabs{overflow-x:auto;scrollbar-width:none;margin-inline:calc(-1 * var(--gutter));padding-inline:var(--gutter);scroll-padding-inline:var(--gutter);-webkit-mask-image:linear-gradient(90deg,#000 85%,transparent);mask-image:linear-gradient(90deg,#000 85%,transparent)}
          .bm-tabs::-webkit-scrollbar{display:none}
          .bm-search{flex:none}
          .bm-th{display:none}
          .bm-row{grid-template-columns:minmax(0,1fr) auto;padding:12px 14px}
          .bm-row > .bm-pill,.bm-col{display:none}
          .bm-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;font-size:12.5px;color:var(--text2)}
          .bm-meta .bm-pill{display:inline-block}
        }
      `}</style>
      <div className="ui-page">
        <header className="ui-head">
          <div>
            <h1 className="ui-title">My articles</h1>
            <p className="ui-sub">Your drafts, the articles waiting for review and the ones that are live.</p>
          </div>
        </header>
        <BlogNav active="mine" />

        <div className="bm-tools">
          <div className="bm-tabs" role="group" aria-label="Filter by status">
            {TABS.map((t) => (
              <button key={t.key} type="button" aria-pressed={tab === t.key} className={`bm-tab tap${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}{posts !== null && <em>{counts[t.key]}</em>}
              </button>
            ))}
          </div>
          <div className="ui-search bm-search">
            <i className="ti ti-search" aria-hidden="true" />
            <input className="ui-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title" aria-label="Search my articles" />
          </div>
        </div>

        {failed ? (
          <LoadError what="your articles" onRetry={() => setReload((r) => r + 1)} />
        ) : posts === null ? (
          <div className="ui-sk" style={{ height: 180 }} aria-busy="true" aria-label="Loading your articles" />
        ) : posts.length === 0 ? (
          <div className="ui-empty">
            <strong>You haven't written anything yet</strong>
            Drafts, articles in review and published articles show here.
            <div style={{ marginTop: 14 }}><Link to="/blog/write" className="ui-btn ui-btn-dark"><i className="ti ti-pencil" aria-hidden="true" /> Write your first article</Link></div>
          </div>
        ) : shown.length === 0 ? (
          <div className="ui-empty">
            <strong>Nothing here</strong>
            {q.trim() ? `No articles here match "${q.trim()}".` : NONE[tab]}
          </div>
        ) : (
          <div className="bm-list" role="table" aria-label="My articles">
            <div className="bm-row bm-th" role="row">
              <span role="columnheader">Title</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Views</span>
              <span role="columnheader" className="date">Date</span>
              <span role="columnheader" aria-label="Actions" />
            </div>
            {shown.map((p) => {
              const when = p.status === 'PUBLISHED' && p.publishedAt ? `Published ${date(p.publishedAt)}` : `Started ${date(p.createdAt)}`
              return (
                <div key={p.id} className="bm-row" role="row">
                  <div className="bm-t" role="cell">
                    <strong>{p.title}</strong>
                    <span className="bm-meta">
                      <span className={`bm-pill ${p.status.toLowerCase()}`}>{STATUS_LABEL[p.status]}</span>
                      {when}{p.status === 'PUBLISHED' ? ` · ${p.viewCount.toLocaleString()} views` : ''}
                    </span>
                  </div>
                  <span className={`bm-pill ${p.status.toLowerCase()}`} role="cell">{STATUS_LABEL[p.status]}</span>
                  <span className="bm-col" role="cell">{p.status === 'PUBLISHED' ? p.viewCount.toLocaleString() : '—'}</span>
                  <span className="bm-col date" role="cell">{when}</span>
                  <div className="bm-acts" role="cell">
                    {p.status === 'PUBLISHED' && <Link to={`/blog/${p.slug}`} className="ui-btn ui-btn-text">View</Link>}
                    <Link to={`/blog/edit/${p.id}`} className="ui-btn ui-btn-ghost">Edit</Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
