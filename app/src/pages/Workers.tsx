import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import '../styles/workers.css'
import { PremiumMark } from '../components/Perks'
import { sized } from '../lib/img'

// Find workers. Ported from the June page (the live one showed six made-up people).
// Fixed on the way: its page count never worked because the API helper drops
// pagination info (now "Load more"), and skill filters only matched exact spelling.

type Worker = {
  id: string; username: string; name?: string; avatarUrl?: string | null; bio: string
  rating: number; reviews: number; level: string; skills: string[]; tasksCompleted: number; successRate: number; isAvailable: boolean
  premium?: boolean; frame?: boolean
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
  const [reload, setReload] = useState(0)

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
      .catch(() => { if (live) setErr(true) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sort, reload])

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
      <div className="ui-page">
        <header className="ui-head">
          <div>
            <h1 className="ui-title">Find workers</h1>
            <p className="ui-sub">See each person's track record, then hire them directly.</p>
          </div>
        </header>

        <div className="wk2-tools">
          <form className="wk2-bar" role="search" onSubmit={(e) => { e.preventDefault(); set('search', input.trim()) }}>
            <label className="wk2-search">
              <i className="ti ti-search" aria-hidden="true" />
              <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Name, skill or bio" aria-label="Search workers by name, skill or bio" />
              {input && <button type="button" onClick={() => { setInput(''); set('search', '') }} aria-label="Clear search"><i className="ti ti-x" /></button>}
            </label>
          </form>
          <select className="ui-select wk2-sort" value={sort} onChange={(e) => set('sort', e.target.value === 'reputation' ? '' : e.target.value)} aria-label="Sort workers">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div className="wk2-skills" role="group" aria-label="Filter by skill">
            <button type="button" aria-pressed={!category} className={`wk2-skill tap${!category ? ' on' : ''}`} onClick={() => set('category', '')}>All</button>
            {SKILLS.map((s) => {
              const on = category.toLowerCase() === s.toLowerCase()
              return <button key={s} type="button" aria-pressed={on} className={`wk2-skill tap${on ? ' on' : ''}`} onClick={() => set('category', s.toLowerCase())}>{s}</button>
            })}
          </div>
        </div>

        {err ? (
          <LoadError what="workers" onRetry={() => setReload((r) => r + 1)} />
        ) : workers === null ? (
          <div className="wk2-grid" aria-busy="true" aria-label="Loading workers">
            {[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 220 }} />)}
          </div>
        ) : workers.length === 0 ? (
          <div className="ui-empty">
            <strong>No workers match{search ? ` "${search}"` : ''}{category ? ` in ${category}` : ''}</strong>
            Try another skill or other words.
            {(search || category) && <div style={{ marginTop: 14 }}><button type="button" className="ui-btn ui-btn-ghost" onClick={() => { setInput(''); setParams(sort !== 'reputation' ? { sort } : {}, { replace: true }) }}>Clear filters</button></div>}
          </div>
        ) : (
          <>
            <div className="wk2-grid">
              {workers.map((w) => {
                const name = w.name || w.username
                return (
                  <section key={w.id} className="ui-card wk2-card">
                    <Link to={`/user/${w.username}`} className="wk2-top">
                      <span className={`wk2-av${w.frame ? ' oga-frame' : ''}`}>{w.avatarUrl ? <img src={sized(w.avatarUrl, 56, true)} alt="" loading="lazy" /> : initials(name)}</span>
                      <span className="wk2-id">
                        <strong>{name}{w.premium && <PremiumMark />}</strong>
                        <small>@{w.username}{w.level ? ` · ${level(w.level)}` : ''}</small>
                      </span>
                      {w.isAvailable && <span className="wk2-dot" title="Available for work" />}
                    </Link>
                    {w.bio && <p className="wk2-bio">{w.bio}</p>}
                    {w.skills.length > 0 && (
                      <div className="wk2-chips">
                        {w.skills.slice(0, 3).map((s) => <span key={s} className="wk2-chip">{s}</span>)}
                        {w.skills.length > 3 && <span className="wk2-chip">+{w.skills.length - 3}</span>}
                      </div>
                    )}
                    <div className="wk2-stats">
                      <span>{w.reviews > 0 ? <><Star /> {Number(w.rating).toFixed(1)} <em>({w.reviews})</em></> : <em>No reviews yet</em>}</span>
                      <span><b>{w.tasksCompleted}</b> job{w.tasksCompleted === 1 ? '' : 's'} done</span>
                      {w.tasksCompleted > 0 && <span><b>{Math.round(Number(w.successRate) || 0)}%</b> approved</span>}
                    </div>
                    <Link className="ui-btn ui-btn-ghost wk2-hire wk2-on-top" to={`/user/${w.username}/hire`} aria-label={`Hire ${name}`}>Hire</Link>
                  </section>
                )
              })}
            </div>
            {more && (
              <div className="wk2-more">
                <button type="button" className="ui-btn ui-btn-ghost" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
