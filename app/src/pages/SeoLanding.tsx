import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import { HomeJobCard } from '../components/home/HomeCards'
import { useCurrency } from '../context/CurrencyContext'
import { apiRequest } from '../lib/api'
import { SEO_PAGES, seoPageFor } from '../lib/seoPages'
import NotFound from './NotFound'

// A landing page for one search (lib/seoPages.ts): what the work is, the open
// jobs that match, a short FAQ and links to the other pages
export default function SeoLanding() {
  const { pathname } = useLocation()
  const page = seoPageFor(pathname)
  const { convert } = useCurrency()
  const [jobs, setJobs] = useState<any[] | null>(null)

  useEffect(() => {
    if (!page) return
    document.title = page.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', page.description)
    let alive = true
    setJobs(null)
    const url = '/tasks?limit=12' + (page.category ? '&category=' + page.category : '')
    apiRequest<any>(url, { auth: false })
      .then((d) => { if (alive) setJobs(Array.isArray(d) ? d : d?.data || d?.tasks || []) })
      .catch(() => { if (alive) setJobs([]) })
    return () => { alive = false }
  }, [page?.path])

  if (!page) return <NotFound />
  const more = page.category ? `/tasks?category=${page.category}` : '/tasks'

  return (
    <Layout>
      <style>{`
        .seo-intro{max-width:720px;display:grid;gap:12px;font-size:var(--fs-body);line-height:1.7;color:var(--text)}
        .seo-intro p{margin:0}
        .seo-h2{font-size:20px;font-weight:600;letter-spacing:-.02em;margin:36px 0 14px}
        .seo-faq{max-width:720px;display:grid;gap:10px}
        .seo-faq details{border:1px solid var(--border);border-radius:var(--r-md,12px);background:var(--card);padding:14px 16px}
        .seo-faq summary{cursor:pointer;font-weight:600;font-size:15px}
        .seo-faq details p{margin:10px 0 0;font-size:15px;line-height:1.65;color:var(--text2)}
        .seo-links{display:flex;flex-wrap:wrap;gap:8px}
        .seo-links a{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border:1px solid var(--border);border-radius:999px;color:var(--text);text-decoration:none;font-size:14px}
        .seo-links a:hover{border-color:var(--text3)}
      `}</style>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">{page.eyebrow}</span>
            <h1 className="ui-title">{page.h1}</h1>
          </div>
        </div>
        <div className="seo-intro">{page.intro.map((p, i) => <p key={i}>{p}</p>)}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
          <Link className="ui-btn ui-btn-dark" to={more}>See all open jobs</Link>
          <Link className="ui-btn ui-btn-ghost" to="/login">Create a free account</Link>
        </div>

        <h2 className="seo-h2">Open now</h2>
        {jobs === null
          ? <div className="ui-grid-3">{[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 420 }} />)}</div>
          : jobs.length === 0
            ? <div className="ui-empty"><strong>No jobs like this are open right now</strong>New jobs are posted every day. <Link to="/tasks">See all open jobs</Link></div>
            : <div className="ui-grid-3">{jobs.slice(0, 9).map((job) => <HomeJobCard key={job.id} task={job} convert={convert} />)}</div>}

        <h2 className="seo-h2">Questions</h2>
        <div className="seo-faq">
          {page.faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>

        <h2 className="seo-h2">More ways to earn</h2>
        <nav className="seo-links" aria-label="More pages">
          {SEO_PAGES.filter((p) => p.path !== page.path).map((p) => <Link key={p.path} to={p.path}>{p.tab}</Link>)}
          <Link to="/blog">Guides on the blog</Link>
          <Link to="/faq">FAQ</Link>
        </nav>
      </div>
    </Layout>
  )
}
