import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import '../styles/profile-public.css'
import '../styles/workers.css'

// Find workers. Ported from the June page (the live one showed six made-up people).
// Fixed on the way: its page count never worked because the API helper drops
// pagination info (now "Load more"), and skill filters only matched exact spelling.

type Worker = {
  id: string; username: string; name?: string; avatarUrl?: string | null; bio: string
  rating: number; reviews: number; level: string; skills: string[]; tasksCompleted: number; successRate: number; isAvailable: boolean
}

const SKILLS = ['Writing', 'Design', 'Social media', 'Marketing', 'Video', 'Translation', 'Data entry', 'Development', 'Research']
const SORTS = [
  { value: 'reputation', label: 'Best reputation' },
  { value: 'rating', label: 'Top rated' },
  { value: 'active', label: 'Most jobs done' },
  { value: 'newest', label: 'Newest' },
]
const PAGE = 12
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
const level = (l: string) => (l ? l.charAt(0) + l.slice(1).toLowerCase() : '')

function Star() {
  return <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f5a524" d="M12 17.3l6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7l-7.1.6 5.4 4.7-1.6 7z" /></svg>
}

export default function Workers() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const search = params.get('search') || ''
  const sort = params.get('sort') || 'reputation'
  const [input, setInput] = useState(search)
  const [workers, setWorkers] = useState<Worker[] | null>(null)
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [err, setErr] = useState(false)

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true })
  }

  const fetchPage = (p: number) => {
    const q = new URLSearchParams({ limit: String(PAGE), page: String(p), sort })
    if (search) q.set('search', search)
    if (category) q.set('category', category)
    return apiRequest<Worker[]>(`/store/workers?${q}`, { auth: false }).then((d) => (Array.isArray(d) ? d : []))
  }

  useEffect(() => {
    let live = true
    setWorkers(null); setErr(false); setPage(1)
    fetchPage(1)
      .then((list) => { if (live) { setWorkers(list); setMore(list.length === PAGE) } })
      .catch(() => { if (live) { setWorkers([]); setErr(true) } })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sort])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const list = await fetchPage(page + 1)
      setWorkers((w) => [...(w || []), ...list.filter((x) => !(w || []).some((y) => y.id === x.id))])
      setPage(page + 1)
      setMore(list.length === PAGE)
    } catch { setMore(false) }
    setLoadingMore(false)
  }

  return (
    <Layout>
      <div className="up-wrap">
        <div className="wk2-head">
          <div>
            <h1>Find workers</h1>
            <p>Browse people on OgaPay, see their track record, and hire them directly.</p>
          </div>
        </div>

        <form className="wk2-bar" onSubmit={(e) => { e.preventDefault(); set('search', input.trim()) }}>
          <label className="wk2-search">
            <i className="ti ti-search" />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search by name, skill or bio" aria-label="Search workers" />
            {input && <button type="button" onClick={() => { setInput(''); set('search', '') }} aria-label="Clear search"><i className="ti ti-x" /></button>}
          </label>
          <select className="wk2-sort" value={sort} onChange={(e) => set('sort', e.target.value === 'reputation' ? '' : e.target.value)} aria-label="Sort workers">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </form>

        <div className="wk2-skills" role="group" aria-label="Filter by skill">
          <button className={`wk2-skill${!category ? ' on' : ''}`} onClick={() => set('category', '')}>All</button>
          {SKILLS.map((s) => (
            <button key={s} className={`wk2-skill${category.toLowerCase() === s.toLowerCase() ? ' on' : ''}`} onClick={() => set('category', s.toLowerCase())}>{s}</button>
          ))}
        </div>

        {workers === null ? (
          <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
        ) : err ? (
          <div className="up-empty"><i className="ti ti-cloud-off" />Couldn't load workers. Refresh to try again.</div>
        ) : workers.length === 0 ? (
          <div className="up-empty"><i className="ti ti-user-search" />No workers match{search ? ` "${search}"` : ''}{category ? ` in ${category}` : ''}.</div>
        ) : (
          <>
            <div className="wk2-grid">
              {workers.map((w) => {
                const name = w.name || w.username
                return (
                  <section key={w.id} className="up-card wk2-card">
                    <Link to={`/user/${w.username}`} className="wk2-top">
                      <span className="wk2-av">{w.avatarUrl ? <img src={w.avatarUrl} alt="" loading="lazy" /> : initials(name)}</span>
                      <span className="wk2-id">
                        <strong>{name}</strong>
                        <small>@{w.username}{w.level ? ` · ${level(w.level)}` : ''}</small>
                      </span>
                      {w.isAvailable && <span className="wk2-dot" title="Available for work" />}
                    </Link>
                    <p className="wk2-bio">{w.bio}</p>
                    {w.skills.length > 0 && (
                      <div className="up-chips wk2-chips">
                        {w.skills.slice(0, 4).map((s) => <span key={s} className="up-chip">{s}</span>)}
                        {w.skills.length > 4 && <span className="up-chip">+{w.skills.length - 4}</span>}
                      </div>
                    )}
                    <div className="wk2-stats">
                      <span>{w.reviews > 0 ? <><Star /> {Number(w.rating).toFixed(1)} <em>({w.reviews})</em></> : <em>No reviews yet</em>}</span>
                      <span><b>{w.tasksCompleted}</b> job{w.tasksCompleted === 1 ? '' : 's'} done</span>
                      {w.tasksCompleted > 0 && <span><b>{Math.round(Number(w.successRate) || 0)}%</b> approved</span>}
                    </div>
                    <div className="wk2-actions">
                      <Link className="up-btn" to={`/user/${w.username}`}>Profile</Link>
                      <Link className="up-btn primary" to={`/user/${w.username}/hire`}>Hire</Link>
                    </div>
                  </section>
                )
              })}
            </div>
            {more && (
              <div className="wk2-more">
                <button className="up-btn" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
