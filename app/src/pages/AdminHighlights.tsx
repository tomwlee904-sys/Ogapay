import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell, { AdminEmpty, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
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
      <button type="button" className="ui-btn ui-btn-ghost" onClick={() => onToggle(job)} disabled={busy} aria-label={`${job.featured ? 'Remove the highlight from' : 'Highlight'} ${job.title}`}>
        <i className={`ti ${job.featured ? 'ti-x' : 'ti-star'}`} aria-hidden="true" /> {busy ? 'Saving…' : job.featured ? 'Remove' : 'Highlight'}
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
  // A list that failed to load shows "couldn't load", never "none"
  const [hlFailed, setHlFailed] = useState(false)
  const [resFailed, setResFailed] = useState(false)

  const loadHighlighted = async () => {
    setHlFailed(false)
    try { setHighlighted(await apiRequest<Job[]>('/tasks/featured')) }
    catch { setHighlighted(null); setHlFailed(true) }
  }
  const find = async (q = search) => {
    setResFailed(false)
    try {
      const qs = new URLSearchParams({ status: 'OPEN', limit: '15', ...(q.trim() && { search: q.trim() }) })
      const r = await apiRequest<any>(`/tasks?${qs}`)
      setResults(Array.isArray(r) ? r : r?.items || r?.tasks || [])
    } catch { setResults(null); setResFailed(true) }
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
    <AdminShell
      section="highlights"
      title="Highlighted jobs"
      sub="Shown first, with a Highlighted badge, on the homepage and the jobs page."
      how={<p>Highlight good, open jobs so new people find work quickly, and remove the highlight when a job is full. A job that bought a Boost in the Store shows "Boosted" instead while the boost lasts.</p>}
    >
      <style>{`
        .ah-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:24px;align-items:start}
        @media (min-width:1024px){.ah-cols{grid-template-columns:minmax(0,5fr) minmax(0,7fr)}.ah-now{position:sticky;top:calc(var(--nav-h) + 16px)}}
        .ah-cols h2{margin:0 0 10px;font-size:17px;font-weight:600}
        .ah-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
        .ah-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--card)}
        .ah-main{display:flex;flex-direction:column;gap:3px;min-width:0}
        .ah-title{font-size:14px;font-weight:600;color:var(--text);text-decoration:none;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
        .ah-title:hover{text-decoration:underline}
        .ah-meta{font-size:12.5px;color:var(--text2)}
        .ah-row .ui-btn{flex-shrink:0}
        @media (max-width:767.98px){.ah-row .ui-btn{padding:0 12px}}
      `}</style>
      {notice && <div className="adm-msg" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss"><i className="ti ti-x" aria-hidden="true" /></button></div>}
      {error && <div className="adm-msg bad" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss"><i className="ti ti-x" aria-hidden="true" /></button></div>}

      <div className="ah-cols">
        <section className="ah-now" aria-labelledby="ah-now">
          <h2 id="ah-now">Highlighted now{highlighted && !hlFailed ? ` (${highlighted.length})` : ''}</h2>
          {hlFailed ? <LoadError what="highlighted jobs" onRetry={loadHighlighted} />
            : highlighted === null ? <AdminSkeleton rows={2} height={64} />
            : highlighted.length === 0 ? <AdminEmpty compact title="No open job is highlighted">Highlight one from the list.</AdminEmpty>
            : <ul className="ah-list">{highlighted.map((j) => <JobRow key={j.id} job={{ ...j, featured: true }} onToggle={toggle} busy={busyId === j.id} />)}</ul>}
        </section>

        <section aria-labelledby="ah-find">
          <h2 id="ah-find">Find an open job to highlight</h2>
          <form className="adm-search" role="search" onSubmit={(e) => { e.preventDefault(); find() }}>
            <div className="ui-search">
              <i className="ti ti-search" aria-hidden="true" />
              <input className="ui-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search open jobs" aria-label="Search open jobs by title" />
              <button className="ui-search-btn" type="submit" aria-label="Search"><i className="ti ti-arrow-right" aria-hidden="true" /></button>
            </div>
          </form>
          {resFailed ? <LoadError what="open jobs" onRetry={() => find()} />
            : results === null ? <AdminSkeleton rows={3} height={64} />
            : results.length === 0 ? <AdminEmpty compact title="No open jobs found" />
            : <ul className="ah-list">{results.map((j) => <JobRow key={j.id} job={j} onToggle={toggle} busy={busyId === j.id} />)}</ul>}
        </section>
      </div>
    </AdminShell>
  )
}
