import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { money } from '../lib/wallet'

/* Admin: highlighted jobs. A highlighted job carries the Highlighted badge and
   is shown first on the homepage and the jobs page (task.featured, set with
   PATCH /tasks/:id/feature). The top list is what's highlighted and still open;
   below, find an open job to highlight. A job bought a Boost in the Store shows
   "Boosted" instead while the boost lasts. */

interface Job {
  id: string; title: string; reward: number | string; currency: string; featured?: boolean
  maxWorkers?: number; currentWorkers?: number; status: string
  poster?: { username: string } | null
}

const placesLeft = (j: Job) => Math.max(0, (Number(j.maxWorkers) || 1) - (Number(j.currentWorkers) || 0))

function JobRow({ job, onToggle, busy }: { job: Job; onToggle: (j: Job) => void; busy: boolean }) {
  return (
    <li className="ah-row">
      <div className="ah-main">
        <Link to={`/tasks/${job.id}`} className="ah-title">{job.title}</Link>
        <span className="ah-meta">
          {job.poster?.username ? `@${job.poster.username} · ` : ''}{money(Number(job.reward) || 0, job.currency)} each · {placesLeft(job)} place{placesLeft(job) === 1 ? '' : 's'} left
        </span>
      </div>
      <button className={`ui-btn ${job.featured ? 'ui-btn-ghost' : 'ui-btn-dark'}`} onClick={() => onToggle(job)} disabled={busy}>
        <i className={`ti ${job.featured ? 'ti-x' : 'ti-star'}`} aria-hidden="true" /> {busy ? 'Saving…' : job.featured ? 'Remove highlight' : 'Highlight'}
      </button>
    </li>
  )
}

export default function AdminHighlights() {
  const [highlighted, setHighlighted] = useState<Job[] | null>(null)
  const [results, setResults] = useState<Job[] | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadHighlighted = async () => {
    try { setHighlighted(await apiRequest<Job[]>('/tasks/featured')) }
    catch (e: any) { setHighlighted([]); setError(e?.message || 'Could not load highlighted jobs') }
  }
  const find = async (q = search) => {
    try {
      const qs = new URLSearchParams({ status: 'OPEN', limit: '15', ...(q.trim() && { search: q.trim() }) })
      const r = await apiRequest<any>(`/tasks?${qs}`)
      setResults(Array.isArray(r) ? r : r?.items || r?.tasks || [])
    } catch (e: any) { setResults([]); setError(e?.message || 'Could not search jobs') }
  }
  useEffect(() => { loadHighlighted(); find('') }, [])

  const toggle = async (job: Job) => {
    setBusyId(job.id); setError(''); setNotice('')
    try {
      await apiRequest(`/tasks/${job.id}/feature`, { method: 'PATCH', body: JSON.stringify({ featured: !job.featured }) })
      setNotice(job.featured ? `"${job.title}" is no longer highlighted.` : `"${job.title}" is highlighted. It shows first on the homepage and the jobs page within a minute.`)
      setResults((l) => l && l.map((x) => (x.id === job.id ? { ...x, featured: !job.featured } : x)))
      await loadHighlighted()
    } catch (e: any) {
      setError(e?.message || 'Could not change the highlight')
    }
    setBusyId(null)
  }

  return (
    <Layout sidebar>
      <style>{`
        .ah{max-width:980px;margin:0 auto;padding:28px 24px 64px}
        .ah h1{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:0 0 4px}
        .ah-sub{color:var(--text2);font-size:14px;margin:0 0 20px;max-width:640px;line-height:1.55}
        .ah h2{font-size:16px;font-weight:600;margin:24px 0 10px}
        .ah-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
        .ah-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border:1px solid var(--border);border-radius:12px;background:var(--card)}
        .ah-main{display:flex;flex-direction:column;gap:3px;min-width:0}
        .ah-title{font-size:14px;font-weight:600;color:var(--text);text-decoration:none;overflow-wrap:anywhere}
        .ah-title:hover{text-decoration:underline}
        .ah-meta{font-size:12.5px;color:var(--text2)}
        .ah-row .ui-btn{flex-shrink:0;white-space:nowrap}
        .ah-empty{color:var(--text2);font-size:13px;padding:14px 16px;border:1px dashed var(--border);border-radius:12px}
        .ah-search{display:flex;gap:8px;margin-bottom:10px}
        .ah-search .ui-input{flex:1;min-width:0}
        .ah-notice{font-size:13px;color:var(--green);margin:0 0 10px}
        .ah-error{font-size:13px;color:var(--red,#dc2626);margin:0 0 10px}
        @media (max-width:560px){
          .ah{padding:20px 16px 56px}
          .ah-row{flex-direction:column;align-items:stretch}
          .ah-row .ui-btn{justify-content:center}
        }
      `}</style>
      <div className="ah">
        <h1>Highlighted jobs</h1>
        <p className="ah-sub">Highlighted jobs get the Highlighted badge and are shown first on the homepage and the jobs page. Highlight good, open jobs so new people find work quickly, and remove the highlight when a job is full.</p>
        {notice && <p className="ah-notice" role="status">{notice}</p>}
        {error && <p className="ah-error" role="alert">{error}</p>}

        <h2>Highlighted now{highlighted ? ` (${highlighted.length})` : ''}</h2>
        {highlighted === null ? <p className="ah-empty">Loading…</p>
          : highlighted.length === 0 ? <p className="ah-empty">No open job is highlighted.</p>
          : <ul className="ah-list">{highlighted.map((j) => <JobRow key={j.id} job={{ ...j, featured: true }} onToggle={toggle} busy={busyId === j.id} />)}</ul>}

        <h2>Find an open job to highlight</h2>
        <form className="ah-search" onSubmit={(e) => { e.preventDefault(); find() }}>
          <input className="ui-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search open jobs by title" aria-label="Search open jobs" />
          <button className="ui-btn ui-btn-ghost" type="submit"><i className="ti ti-search" aria-hidden="true" /> Search</button>
        </form>
        {results === null ? <p className="ah-empty">Loading…</p>
          : results.length === 0 ? <p className="ah-empty">No open jobs found.</p>
          : <ul className="ah-list">{results.map((j) => <JobRow key={j.id} job={j} onToggle={toggle} busy={busyId === j.id} />)}</ul>}
      </div>
    </Layout>
  )
}
