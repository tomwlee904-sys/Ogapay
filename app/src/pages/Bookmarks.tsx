import { useEffect, useState } from 'react'
import { IconBookmarkFilled } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import JobsNav from '../components/JobsNav'
import LoadError from '../components/LoadError'
import Money from '../components/Money'
import { useToast } from '../components/Toast'
import { listSavedJobs, setSaved, type SavedJob } from '../lib/bookmarks'
import { categoryLabel } from '../lib/categories'
import '../styles/job-monitor.css'

const STATUS: Record<string, string> = { COMPLETED: 'Completed', CANCELLED: 'Cancelled', EXPIRED: 'Closed', DRAFT: 'Paused', DISPUTED: 'In dispute' }
const isOpen = (b: SavedJob) => ['OPEN', 'COOLING_DOWN'].includes(String(b.task?.status || ''))

// Saved jobs (server-side, the same list the bookmark icons use). Same page
// frame, header and job rows as Jobs and Job monitor; open jobs first.
export default function Bookmarks() {
  const { toast } = useToast()
  const [list, setList] = useState<SavedJob[] | null>(null)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // Rows taken off this visit: they stay in place with an Undo until you leave
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  useEffect(() => {
    let live = true
    setError(false)
    listSavedJobs()
      .then((l) => { if (live) setList(l) })
      .catch(() => { if (live) { setError(true); setList(null) } })
    return () => { live = false }
  }, [reloadKey])

  const remove = async (taskId: string) => {
    setRemoved((r) => new Set(r).add(taskId))
    try { await setSaved(taskId, false) } catch {
      setRemoved((r) => { const n = new Set(r); n.delete(taskId); return n })
      toast("Couldn't remove it from your saved jobs", 'error')
    }
  }
  const undo = async (taskId: string) => {
    setRemoved((r) => { const n = new Set(r); n.delete(taskId); return n })
    try { await setSaved(taskId, true) } catch {
      setRemoved((r) => new Set(r).add(taskId))
      toast("Couldn't save it again", 'error')
    }
  }

  const openJobs = (list || []).filter(isOpen)
  const closedJobs = (list || []).filter((b) => !isOpen(b))

  const row = (b: SavedJob) => {
    const t = b.task
    const title = t?.title || 'Job no longer available'
    if (removed.has(b.taskId)) {
      return (
        <li key={b.id} className="jm2-removed">
          <span>Removed from your saved jobs.</span>
          <button type="button" className="ui-btn ui-btn-text ui-btn-sm" onClick={() => undo(b.taskId)}>Undo</button>
        </li>
      )
    }
    const open = isOpen(b)
    return (
      <li key={b.id} className={open ? undefined : 'is-closed'}>
        <div className="jm2-t">
          {t ? <Link to={`/tasks/${b.taskId}`}>{title}</Link> : <a aria-disabled="true">{title}</a>}
          <span>{t ? <>{categoryLabel(t.category)} · {open ? 'Open' : STATUS[String(t.status)] || String(t.status).replace(/_/g, ' ').toLowerCase()}</> : 'Removed by the poster'}</span>
        </div>
        {t && <b className="jm2-pay"><Money amount={Number(t.reward || 0)} currency={t.currency || 'NGN'} size={15} positive={open} /></b>}
        <div className="jm2-acts">
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon" aria-label={`Remove ${title} from saved jobs`} onClick={() => remove(b.taskId)}>
            <IconBookmarkFilled size={16} aria-hidden="true" />
          </button>
          {t && <Link className="ui-btn ui-btn-ghost" to={`/tasks/${b.taskId}`}>{open ? 'Open' : 'View'}</Link>}
        </div>
      </li>
    )
  }

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <h1 className="ui-title" style={{ marginTop: 0 }}>Saved jobs</h1>
            <p className="ui-sub">Tap the bookmark on any job to keep it here.</p>
          </div>
        </div>
        <JobsNav />

        <div style={{ marginTop: 20 }}>
          {error ? (
            <LoadError what="your saved jobs" onRetry={() => setReloadKey((k) => k + 1)} />
          ) : list === null ? (
            <div className="ui-sk" style={{ height: 160 }} />
          ) : list.length === 0 ? (
            <div className="ui-empty">
              <i className="ti ti-bookmark" aria-hidden="true" style={{ fontSize: 28, display: 'block', marginBottom: 10, color: 'var(--text3)' }} />
              <strong>No saved jobs yet</strong>
              Tap the bookmark on a job to keep it here for later.
              <div style={{ marginTop: 16 }}><Link className="ui-btn ui-btn-dark" to="/tasks">Browse jobs</Link></div>
            </div>
          ) : (
            <>
              {openJobs.length > 0 ? <ul className="ui-card jm2-list">{openJobs.map(row)}</ul>
                : <div className="ui-empty" style={{ padding: '32px 24px' }}>None of your saved jobs are open any more. <Link to="/tasks" style={{ color: 'var(--text)', fontWeight: 600 }}>Browse open jobs</Link></div>}
              {closedJobs.length > 0 && (
                <>
                  <h2 className="jm2-group-h">No longer open</h2>
                  <ul className="ui-card jm2-list">{closedJobs.map(row)}</ul>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
