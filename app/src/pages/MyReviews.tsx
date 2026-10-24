import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import WorkNav from '../components/WorkNav'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import '../styles/my-tasks.css'

// "My reviews": the stars and notes posters gave on my work, and buyers on my
// store products, with totals (like wurk's My reviews). Until now these only
// showed on the public profile, so a private profile never saw them.
// The rating card (average, stars, the 5-to-1 bars) leads: first on phone,
// the side panel on desktop.

type Review = {
  id: string; kind: 'job' | 'product'; rating: number; text: string | null; date: string
  subject: { id?: string; title?: string }
  reviewer: { username: string; name: string; avatarUrl?: string | null } | null
  byTeam?: boolean
}
type Data = {
  average: number; total: number; last7Days: number; distribution: Record<string, number>
  jobs: { average: number; total: number }; products: { average: number; total: number }
  reviews: Review[]; page: number; totalPages: number
}

const STAR = 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} fill={i <= Math.round(value) ? 'var(--gold)' : 'var(--border2)'} /></svg>
      ))}
    </span>
  )
}
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function MyReviews() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  // Bumped by Try again to run the request again
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    setFailed(false)
    apiRequest<Data>(`/users/me/reviews?page=${page}&limit=20`)
      .then((d) => { if (live) setData(d) })
      .catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [page, attempt])

  const dist = data?.distribution || {}
  const most = Math.max(1, ...[1, 2, 3, 4, 5].map((n) => Number(dist[n] || 0)))

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">Working</span>
            <h1 className="ui-title">My reviews</h1>
            <p className="ui-sub">What posters said about your work, and buyers about your products.</p>
          </div>
          {user?.username && (
            <div className="ui-actions">
              <Link className="ui-btn ui-btn-ghost ui-btn-sm" to={`/user/${encodeURIComponent(user.username)}`}><i className="ti ti-user" aria-hidden="true" /> Public profile</Link>
            </div>
          )}
        </div>
        <WorkNav />

        {failed && !data ? (
          <div className="mt2-body"><LoadError what="your reviews" onRetry={() => setAttempt((n) => n + 1)} /></div>
        ) : !data ? (
          <div className="ui-sk mt2-body" style={{ height: 240 }} />
        ) : (
          <div className="ui-split mt2-body">
            <aside className="ui-split-side ui-split-side-first" aria-label="Your rating">
              <section className="ui-card mr-hero">
                <div className="mr-avg">
                  <span className="mr-avg-num">{data.total ? data.average.toFixed(1) : '–'}</span>
                  <div>
                    <Stars value={data.total ? data.average : 0} size={18} />
                    <small>{data.total ? `from ${data.total} ${data.total === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}</small>
                  </div>
                </div>
                <ul className="mr-dist" aria-label="Reviews by stars">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const c = Number(dist[n] || 0)
                    return (
                      <li key={n}>
                        <span>{n} ★</span>
                        <span className="mr-bar"><i style={{ width: `${(c / most) * 100}%` }} /></span>
                        <span>{c}</span>
                      </li>
                    )
                  })}
                </ul>
                <div className="mr-facts">
                  <div><span>Last 7 days</span><b>{data.last7Days}</b></div>
                  <div><span>Job ratings</span><b>{data.jobs.total}{data.jobs.total ? ` · ${data.jobs.average.toFixed(1)}★` : ''}</b></div>
                </div>
                <p className="mr-note">Job ratings count towards your rank. Store reviews ({data.products.total}) show on your products.</p>
              </section>
            </aside>

            <div className="mt2-main">
              {failed && <div style={{ marginBottom: 12 }}><LoadError what="this page of reviews" onRetry={() => setAttempt((n) => n + 1)} /></div>}
              {data.total === 0 ? (
                <div className="ui-empty">
                  <strong>No reviews yet</strong>
                  Posters can rate your work when they approve it. Their stars and notes show here.
                  <div style={{ marginTop: 14 }}><Link className="ui-btn ui-btn-dark" to="/tasks">Find work</Link></div>
                </div>
              ) : (
                <ul className="ui-card mr-list">
                  {data.reviews.map((r) => (
                    <li key={r.id}>
                      <div className="mr-top">
                        {r.byTeam ? <b>OgaPay team</b> : r.reviewer ? <Link to={`/user/${r.reviewer.username}`}>{r.reviewer.name}</Link> : <b>OgaPay user</b>}
                        <Stars value={r.rating} />
                        <small>{day(r.date)}</small>
                      </div>
                      <div className="mr-subj">
                        {r.kind === 'product' ? 'Product: ' : 'Job: '}
                        {r.kind === 'product' && r.subject.id ? <Link to={`/store/${r.subject.id}`}>{r.subject.title}</Link>
                          : r.kind === 'job' && r.subject.id ? <Link to={`/tasks/${r.subject.id}`}>{r.subject.title}</Link>
                            : r.subject.title}
                      </div>
                      {r.text && <p>{r.text}</p>}
                    </li>
                  ))}
                </ul>
              )}

              {data.totalPages > 1 && (
                <div className="mr-pages">
                  <button type="button" className="ui-btn ui-btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                  <span>Page {data.page} of {data.totalPages}</span>
                  <button type="button" className="ui-btn ui-btn-ghost" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
