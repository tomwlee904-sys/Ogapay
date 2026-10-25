import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

// "My reviews": the stars and notes posters gave on my work, and buyers on my
// store products, with totals (like wurk's My reviews). Until now these only
// showed on the public profile, so a private profile never saw them.

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
function Stars({ value }: { value: number }) {
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={14} height={14} viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} fill={i <= Math.round(value) ? '#d4a017' : 'var(--border2, #ccc)'} /></svg>
      ))}
    </span>
  )
}
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function MyReviews() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setError('')
    apiRequest<Data>(`/users/me/reviews?page=${page}&limit=20`)
      .then((d) => { if (live) setData(d) })
      .catch((e) => { if (live) setError(e?.message || 'Could not load your reviews') })
    return () => { live = false }
  }, [page])

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">Working</span>
            <h1 className="ui-title">My reviews</h1>
            <p className="ui-sub">What posters said about your work, and buyers about your products.</p>
          </div>
          <Link className="ui-btn" to="/my-tasks"><i className="ti ti-list-check" /> My tasks</Link>
        </div>

        {error && <div className="ui-empty" style={{ marginTop: 24 }}>{error}</div>}
        {!data && !error && <div className="ui-sk" style={{ height: 240, marginTop: 24 }} />}

        {data && (
          <>
            <div className="mr-sum">
              <div><b>{data.total}</b><span>total reviews</span></div>
              <div><b>{data.total ? data.average.toFixed(1) : '–'}</b><span>average rating</span></div>
              <div><b>{data.last7Days}</b><span>in the last 7 days</span></div>
              <div><b>{data.jobs.total}</b><span>job ratings{data.jobs.total ? ` · ${data.jobs.average.toFixed(1)} avg` : ''}</span></div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: '10px 0 18px' }}>
              Job ratings count towards your rank. Store reviews ({data.products.total}) show on your products.
            </p>

            {data.total === 0 ? (
              <div className="ui-empty">
                <p style={{ margin: '0 0 14px' }}>No reviews yet. Posters can rate your work when they approve it.</p>
                <Link className="ui-btn ui-btn-dark" to="/tasks">Find work</Link>
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
                <button className="ui-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <span>Page {data.page} of {data.totalPages}</span>
                <button className="ui-btn" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        .mr-sum{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:24px}
        .mr-sum div{padding:14px 16px;border:1px solid var(--border);border-radius:16px;background:var(--card)}
        .mr-sum b{display:block;font-size:22px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums}
        .mr-sum span{font-size:12px;color:var(--text2)}
        .mr-list{list-style:none;margin:0;padding:4px 18px}
        .mr-list li{padding:14px 0;border-bottom:1px solid var(--border)}
        .mr-list li:last-child{border-bottom:0}
        .mr-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .mr-top small{margin-left:auto;color:var(--text3);font-size:12px}
        .mr-subj{font-size:13px;color:var(--text2);margin-top:4px;overflow-wrap:anywhere}
        .mr-list p{margin:6px 0 0;font-size:14px;overflow-wrap:anywhere}
        .mr-pages{display:flex;align-items:center;justify-content:center;gap:12px;margin:18px 0}
        .mr-pages .ui-btn{min-height:44px}
        @media(max-width:767px){.mr-sum{grid-template-columns:repeat(2,minmax(0,1fr))}.mr-list{padding:4px 14px}}
      `}</style>
    </Layout>
  )
}
