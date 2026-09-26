import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { listSavedJobs, setSaved, type SavedJob } from '../lib/bookmarks'
import '../styles/profile-public.css'

const money = (n: number | string, cur = 'NGN') =>
  cur === 'NGN' ? '₦' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${cur}`

// Saved jobs (server-side, the same list the bookmark icons use)
export default function Bookmarks() {
  const [list, setList] = useState<SavedJob[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    listSavedJobs().then(setList).catch(() => { setError(true); setList([]) })
  }, [])

  const remove = async (taskId: string) => {
    const before = list
    setList((l) => l?.filter((b) => b.taskId !== taskId) || l)
    try { await setSaved(taskId, false) } catch { setList(before) }
  }

  return (
    <Layout>
      <div className="up-wrap" style={{ maxWidth: 860 }}>
        <div className="up-sec-h" style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 24 }}>Saved jobs</h2>
          <p>Jobs you bookmarked. Tap the bookmark on any job to add it here.</p>
        </div>

        {list === null ? (
          <div className="up-skel" style={{ height: 120 }} />
        ) : error ? (
          <div className="up-empty"><i className="ti ti-cloud-off" />Couldn't load your saved jobs. Refresh to try again.</div>
        ) : list.length === 0 ? (
          <div className="up-empty">
            <i className="ti ti-bookmark" />
            No saved jobs yet.
            <div style={{ marginTop: 14 }}><Link className="up-btn" to="/tasks">Browse jobs</Link></div>
          </div>
        ) : (
          <div className="up-list">
            {list.map((b) => {
              const t = b.task
              const open = ['OPEN', 'COOLING_DOWN'].includes(String(t?.status || ''))
              return (
                <div className="up-card up-row" key={b.id}>
                  <Link to={`/tasks/${b.taskId}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                    <b style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t?.title || 'Job no longer available'}</b>
                    <small>
                      {t ? <>{money(t.reward, t.currency)} · {String(t.category).replace(/_/g, ' ').toLowerCase()} · {open ? 'Open' : String(t.status).replace(/_/g, ' ').toLowerCase()}</> : 'Removed by the creator'}
                    </small>
                  </Link>
                  <button className="up-btn" style={{ height: 34, padding: '0 12px' }} onClick={() => remove(b.taskId)} aria-label={`Remove ${t?.title || 'job'} from saved`}>
                    <i className="ti ti-bookmark-off" /> Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
