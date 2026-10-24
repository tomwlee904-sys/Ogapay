import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import JobListCard from '../components/JobListCard'
import JobsNav from '../components/JobsNav'
import LoadError from '../components/LoadError'
import { jobDeadline } from '../lib/deadline'
import InfoTip from '../components/InfoTip'
import { useMedia, PHONE } from '../hooks/useMedia'
import '../styles/jobs.css'

// ─── Bootstrap fetchTasks from cache ──────────────────────────────
const tasksCacheMap = new Map<string, { data: any[]; timestamp: number }>()
const CACHE_TTL = 30_000
const FOCUS_STALE_AGE = 5_000

export function invalidateTasksCache() {
  tasksCacheMap.clear()
}

// Signed in, the list is asked for with the sign-in and ?eligible=1 so each job says
// whether you can take it (for the "Available for me" switch); cached per person.
// A failed request throws (it used to return [], so a network error read as
// "No jobs match" and people thought there was no work).
async function fetchTasks(category?: string, userId?: string) {
  const cacheKey = `${userId || 'guest'}:${(category || 'all').toLowerCase()}`
  const now = Date.now()
  const cached = tasksCacheMap.get(cacheKey)
  if (cached && cached.timestamp + CACHE_TTL > now) return cached.data

  const url =
    category && !['all', 'trending', 'new'].includes(category.toLowerCase())
      ? '/tasks?limit=100&category=' + encodeURIComponent(category.toUpperCase())
      : '/tasks?limit=100'

  const data = await apiRequest<any>(userId ? url + '&eligible=1' : url, { auth: !!userId })
  const list = Array.isArray(data)
    ? data
    : data?.data || data?.tasks || data?.jobs || []
  tasksCacheMap.set(cacheKey, { data: list, timestamp: now })
  return list
}

// ─── Sort / filter: a dropdown from tablet up, a bottom sheet on phone ──────
// limit=100 (the API's most): sorting and filters run on this list, and the
// default page of 20 hid every job after the 20th
const SORTS: [string, string][] = [['default', 'Recommended'], ['reward', 'Reward'], ['newest', 'Newest'], ['closing', 'Closing time']]
// Requirement groups, as on the Create form (rank, identity check, one extra)
const REQS: [string, string][] = [['all', 'All'], ['open', 'Open to everyone'], ['identity', 'ID / Human verified'], ['x', 'X jobs'], ['community', 'Community'], ['audience', 'Creator jobs'], ['rank', 'Rank required']]

function SortFilterMenu({ sort, req, category, categories, count, onSort, onReq, onCategory, onClear }: {
  sort: string; req: string; category: string; categories: string[]; count: number
  onSort: (v: string) => void; onReq: (v: string) => void; onCategory: (v: string) => void; onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const phone = useMedia(PHONE)
  const ref = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || sheet.current?.contains(t)) return
      setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  // The sheet covers the page: keep the page behind it still and start on its close button
  useEffect(() => {
    if (!open || !phone) return
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    return () => { document.body.style.overflow = before }
  }, [open, phone])

  const sortLabel = SORTS.find(([v]) => v === sort)?.[1] || 'Recommended'
  const filterLabel = category !== 'All' ? category : REQS.find(([v]) => v === req)?.[1] || 'All'
  const active = Number(sort !== 'default') + Number(req !== 'all') + Number(category !== 'All')
  const item = (on: boolean, label: string, pick: () => void) => (
    <button key={label} type="button" className={`ui-menu-item${on ? ' on' : ''}`} aria-pressed={on} onClick={pick}>{label}</button>
  )
  const groups = (
    <>
      <div className="ui-menu-label">Sort</div>
      {SORTS.map(([v, l]) => item(sort === v, l, () => onSort(v)))}
      <div className="ui-menu-label" style={{ marginTop: 8 }}>Requirements</div>
      {REQS.map(([v, l]) => item(req === v, l, () => onReq(v)))}
      {categories.length > 1 && (
        <>
          <div className="ui-menu-label" style={{ marginTop: 8 }}>Category</div>
          <div className="tl-cats">
            {categories.map(c => item(category === c, c === 'All' ? 'All categories' : c, () => onCategory(c)))}
          </div>
        </>
      )}
    </>
  )
  return (
    <div className="ui-menu-wrap" ref={ref}>
      <button type="button" className="ui-menu-btn" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(o => !o)}>
        <span className="tl-mb-long"><span>Sort: <b>{sortLabel}</b></span> <span>Filter: <b>{filterLabel}</b></span></span>
        <span className="tl-mb-short"><i className="ti ti-adjustments-horizontal" aria-hidden="true" style={{ fontSize: 16, transform: 'none' }} /><b>Sort &amp; filter</b>{active > 0 && <span className="tl-mb-n" aria-label={`${active} set`}>{active}</span>}</span>
        <i className="ti ti-chevron-down" aria-hidden="true" />
      </button>
      {open && !phone && <div className="ui-menu" role="menu">{groups}</div>}
      {open && phone && createPortal(
        <>
          <div className="tl-sheet-bg" onClick={() => setOpen(false)} />
          <div className="tl-sheet" ref={sheet} role="dialog" aria-modal="true" aria-labelledby="tl-sheet-h">
            <div className="tl-sheet-head">
              <h2 id="tl-sheet-h">Sort and filter</h2>
              <button ref={closeBtn} type="button" className="ui-btn ui-btn-text ui-btn-icon" aria-label="Close" onClick={() => setOpen(false)}><i className="ti ti-x" aria-hidden="true" /></button>
            </div>
            <div className="tl-sheet-body">{groups}</div>
            <div className="tl-sheet-foot">
              {active > 0 && <button type="button" className="ui-btn ui-btn-ghost" onClick={onClear}>Clear</button>}
              <button type="button" className="ui-btn ui-btn-dark" onClick={() => setOpen(false)}>Show {count} {count === 1 ? 'job' : 'jobs'}</button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}

const CATEGORY_LABEL: Record<string, string> = {
  SOCIAL_MEDIA: 'Social media', DATA_ENTRY: 'Data entry', CONTENT_WRITING: 'Content writing', APP_TESTING: 'App testing',
  SURVEY: 'Survey', DESIGN: 'Design', TRANSLATION: 'Translation', WEB_RESEARCH: 'Web research', VIDEO_REVIEW: 'Video review', OTHER: 'Other',
}
const endOf = (j: any) => j.expiresAt || j.deadline || j.closesAt || j.endsAt
const openSlots = (j: any) => {
  if (j.isContest) return Infinity // contests take unlimited entries
  const max = Number(j.maxWorkers ?? j.slots ?? 0)
  if (!max) return Infinity
  const done = Number(j.submissionsCount ?? j._count?.submissions ?? j.currentWorkers ?? j.filled ?? 0)
  return max - done
}
const isClosed = (j: any) => { const e = endOf(j); return !!e && new Date(e).getTime() <= Date.now() }

export default function Tasks() {
  const { user } = useAuth()
  const { convert } = useCurrency()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // The list request failed (shown as "couldn't load", never as "no jobs")
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  // The page number is in the address too, so Back from a job returns to the same page
  const [page, setPage] = useState(() => Math.max(1, Math.floor(Number(searchParams.get('page'))) || 1))
  const perPage = 12
  const [category, setCategory] = useState(searchParams.get('category') || 'All')
  const [sort, setSort] = useState(searchParams.get('sort') || 'default')
  const [req, setReq] = useState(searchParams.get('req') || 'all')
  const [availableOnly, setAvailableOnly] = useState(searchParams.get('available') === '1')
  // Your place on each job you've taken: job id -> submission status
  const [mySubmissions, setMySubmissions] = useState<Record<string, string>>({})

  useEffect(() => {
    let alive = true
    setLoading(true)
    setLoadError(false)
    fetchTasks('all', user?.id)
      .then(data => { if (alive) setJobs(data || []) })
      .catch(() => { if (alive) setLoadError(true) })
      .finally(() => { if (alive) setLoading(false) })
    if (user) {
      // apiRequest already unwraps { data }: this is { submissions, buckets, stats }
      apiRequest('/tasks/my/submissions').catch(() => null).then((d: any) => {
        if (!alive || !d) return
        const list = Array.isArray(d) ? d : d?.submissions || []
        const byJob: Record<string, string> = {}
        for (const s of list) { const id = s.taskId || s.task?.id; if (id) byJob[id] = String(s.status || '') }
        setMySubmissions(byJob)
      })
    }
    return () => { alive = false }
  }, [user?.id, reloadKey])

  // Refresh when the tab regains focus (cache entries older than a few seconds).
  // A failed refresh keeps the list already on screen.
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now()
      tasksCacheMap.forEach((v, k) => { if (now - v.timestamp > FOCUS_STALE_AGE) tasksCacheMap.delete(k) })
      fetchTasks('all', user?.id).then(data => { setJobs(data || []); setLoadError(false) }).catch(() => {})
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user?.id])

  // ?job=<id> (links in notifications) opens the job's own page; the old
  // quick-view window showed a second, older design of the same job
  useEffect(() => {
    const id = searchParams.get('job')
    if (id) navigate('/tasks/' + encodeURIComponent(id), { replace: true })
  }, [searchParams, navigate])

  const categories = ['All', ...Array.from(new Set(jobs.map(j => j.category).filter(Boolean))).map((c: any) => CATEGORY_LABEL[c] || c)]
  const categoryKey = (label: string) => Object.keys(CATEGORY_LABEL).find(k => CATEGORY_LABEL[k] === label) || label

  // "Open right now": older jobs can have a past deadline but no expiry, so the API lists them
  const live = jobs.filter(j => jobDeadline(j).state !== 'ended')
  const filtered = live
    .filter(j => {
      const q = search.trim().toLowerCase()
      if (q) {
        const who = (j.poster?.username || j.creator?.username || j.creatorName || '').toLowerCase()
        if (!(j.title || '').toLowerCase().includes(q) && !(j.description || '').toLowerCase().includes(q) && !who.includes(q)) return false
      }
      if (category !== 'All' && j.category !== categoryKey(category)) return false
      const score = Number(j.minOgaScore ?? j.minSorsaScore ?? 0), rank = Number(j.minRank ?? 0)
      if (req === 'open' && (j.requiredCommunityId || score > 0 || rank > 1 || j.requiresWallet || j.requiresX || j.requiresXBlue || j.requiresLinkedin || j.workerRequirement || Number(j.minFollowers) > 0 || Number(j.minJobsDone) > 0 || Number(j.minXScore) > 0)) return false
      if (req === 'audience' && !(Number(j.minFollowers) > 0)) return false
      if (req === 'identity' && !['KYC', 'KYC2', 'HUMAN'].includes(j.workerRequirement)) return false
      if (req === 'x' && !(j.requiresX || j.requiresXBlue || Number(j.minXScore) > 0)) return false
      if (req === 'community' && !j.requiredCommunityId) return false
      if (req === 'rank' && rank <= 1) return false
      if (availableOnly) {
        // A place that expired (no work sent in time) can be taken again, so it doesn't count
        const mine = mySubmissions[j.id]
        if (openSlots(j) <= 0 || isClosed(j) || (mine && mine !== 'EXPIRED')) return false
        // The server's own check (requirements, blocked, similar job taken); only sent when signed in
        if (j.eligible === false) return false
      }
      return true
    })
    .sort((a, b) => {
      const time = (x: any) => new Date(x.createdAt || 0).getTime()
      if (sort === 'reward') return Number(b.reward ?? 0) - Number(a.reward ?? 0)
      if (sort === 'newest') return time(b) - time(a)
      if (sort === 'closing') {
        const ea = endOf(a) ? new Date(endOf(a)).getTime() : Infinity
        const eb = endOf(b) ? new Date(endOf(b)).getTime() : Infinity
        return ea - eb
      }
      // default: featured first, then still-open, then newest
      return Number(!!b.featured) - Number(!!a.featured) || Number(isClosed(a)) - Number(isClosed(b)) || time(b) - time(a)
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const shown = Math.min(page, totalPages) // an old address can name a page that no longer exists
  const paginated = filtered.slice((shown - 1) * perPage, shown * perPage)
  // A new search or filter starts again at page 1. Opening the list keeps the
  // page number from the address.
  const filterKey = [search, sort, req, category, availableOnly].join('|')
  const lastFilters = useRef(filterKey)
  useEffect(() => {
    if (lastFilters.current !== filterKey) { lastFilters.current = filterKey; setPage(1) }
  }, [filterKey])

  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      const set = (k: string, v: string, def: string) => { if (v && v !== def) next.set(k, v); else next.delete(k) }
      set('category', category, 'All'); set('search', search, ''); set('sort', sort, 'default'); set('req', req, 'all')
      set('available', availableOnly ? '1' : '', '')
      set('page', page > 1 ? String(page) : '', '')
      return next
    }, { replace: true })
  }, [category, search, sort, req, availableOnly, page, setSearchParams])

  const goPage = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  // Anything narrowing the list (the sort alone doesn't hide jobs)
  const filtering = !!search.trim() || req !== 'all' || category !== 'All' || availableOnly
  const clearAll = () => { setSearch(''); setReq('all'); setCategory('All'); setAvailableOnly(false) }
  const failed = loadError && jobs.length === 0

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head tl-head">
          <div>
            <h1 className="ui-title">Jobs</h1>
            <p className="ui-sub">Paid in Naira or USDC when your work is approved.</p>
          </div>
        </div>
        <JobsNav />

        {!failed && (
          <div className="tl-bar">
            <div className="ui-search tl-search" role="search">
              <i className="ti ti-search" aria-hidden="true" />
              <input className="ui-input" type="search" placeholder="Search jobs or creators" aria-label="Search jobs"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="tl-row2">
              <SortFilterMenu
                sort={sort} req={req} category={category} categories={categories} count={filtered.length}
                onSort={setSort} onReq={setReq} onCategory={setCategory}
                onClear={() => { setSort('default'); setReq('all'); setCategory('All') }}
              />
              {!loading && <span className="ui-count tl-count" aria-live="polite"><b>{filtered.length}</b> {filtered.length === 1 ? 'job' : 'jobs'}</span>}
              <span className="tl-avail">
                <label className="ui-switch">
                  Available for me
                  <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} />
                  <span className="ui-switch-track" aria-hidden="true" />
                </label>
                <InfoTip label="What does Available for me show?" title="Available for me">
                  <p>Only jobs you can take right now: still open, with a place free, not taken by you already, and with requirements you meet (like OgaScore, rank or a connected account).</p>
                </InfoTip>
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="ui-grid-3" aria-busy="true">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="ui-sk jl-sk" />)}</div>
        ) : failed ? (
          <div style={{ marginTop: 20 }}><LoadError what="jobs" onRetry={() => setReloadKey(k => k + 1)} /></div>
        ) : filtered.length === 0 && filtering ? (
          <div className="ui-empty">
            <i className="ti ti-search-off" aria-hidden="true" style={{ fontSize: 28, display: 'block', marginBottom: 10, color: 'var(--text3)' }} />
            <strong>No jobs match</strong>
            <p style={{ margin: '0 0 16px' }}>{availableOnly ? 'Turn off "Available for me" or change the filters.' : 'Try a different search or filter.'}</p>
            <button type="button" className="ui-btn ui-btn-ghost" onClick={clearAll}>Clear filters</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ui-empty">
            <i className="ti ti-briefcase" aria-hidden="true" style={{ fontSize: 28, display: 'block', marginBottom: 10, color: 'var(--text3)' }} />
            <strong>No open jobs right now</strong>
            <p style={{ margin: '0 0 16px' }}>New jobs are posted all the time. Job monitor can tell you the moment one appears.</p>
            <Link className="ui-btn ui-btn-dark" to="/job-monitor"><i className="ti ti-bell" aria-hidden="true" /> Get job alerts</Link>
          </div>
        ) : (
          <>
            <div className="ui-grid-3">
              {paginated.map(job => (
                <JobListCard key={job.id} task={job} convert={convert} myStatus={mySubmissions[job.id]} />
              ))}
            </div>
            {totalPages > 1 && (
              <nav className="ui-pager" aria-label="Pages">
                <button className="ui-btn ui-btn-ghost" disabled={shown === 1} onClick={() => goPage(shown - 1)}><i className="ti ti-arrow-left" />Previous</button>
                <span>Page {shown} of {totalPages}</span>
                <button className="ui-btn ui-btn-ghost" disabled={shown === totalPages} onClick={() => goPage(shown + 1)}>Next<i className="ti ti-arrow-right" /></button>
              </nav>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
