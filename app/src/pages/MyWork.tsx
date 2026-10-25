import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useMoney } from '../lib/useMoney'
import '../styles/my-tasks.css'

// "My work" (/my-work): jobs you were picked or hired for (Selection jobs and
// private hires) and store orders you have to deliver, in Pending and Completed.
// Like wurk.fun's My Wurk. Server: GET /tasks/my/work (jobWork.service.js).

type Item = {
  kind: 'JOB' | 'ORDER'; id: string; title: string; amount: number; currency: string
  type: string; status: string; statusText: string; pending: boolean
  with?: { username?: string; name?: string } | null; date: string; link: string
}
type Work = { pending: Item[]; completed: Item[]; counts: { pending: number; completed: number } }

const when = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function MyWork() {
  const show = useMoney()
  const [work, setWork] = useState<Work | null>(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<'pending' | 'completed'>('pending')
  const load = useCallback(() => {
    setFailed(false)
    apiRequest<Work>('/tasks/my/work').then((d) => setWork(d || { pending: [], completed: [], counts: { pending: 0, completed: 0 } })).catch(() => setFailed(true))
  }, [])
  useEffect(() => { load() }, [load])

  const list = work ? work[tab] : []
  return (
    <Layout>
      <div className="ui-page mt2-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">Your assignments</span>
            <h1 className="ui-title">My work</h1>
            <p className="ui-sub">Jobs you were picked or hired for, and store orders you have to deliver.</p>
          </div>
          <div className="ui-actions">
            <button className="ui-btn ui-btn-ghost" onClick={() => { setWork(null); load() }}><i className="ti ti-refresh" /> Refresh</button>
            <Link className="ui-btn ui-btn-ghost" to="/my-tasks"><i className="ti ti-list-check" /> My tasks</Link>
          </div>
        </div>

        <div className="mt2-tabs" role="tablist" aria-label="Show">
          {(['pending', 'completed'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`ui-chip${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
              {t === 'pending' ? 'Pending' : 'Completed'}<em>{work ? work.counts[t] : '…'}</em>
            </button>
          ))}
        </div>

        {failed ? (
          <div className="ui-empty" style={{ marginTop: 16 }}><p style={{ margin: '0 0 14px' }}>We couldn't load your work.</p><button className="ui-btn ui-btn-dark" onClick={load}>Try again</button></div>
        ) : work === null ? <div className="ui-sk" style={{ height: 200, marginTop: 16 }} /> : list.length === 0 ? (
          <div className="ui-empty" style={{ marginTop: 16 }}>
            <p style={{ margin: '0 0 14px' }}>{tab === 'pending'
              ? 'Nothing waiting for you. When a poster picks you for a Selection job, hires you, or someone orders from your store, it shows here.'
              : 'Finished jobs and orders show here.'}</p>
            <Link className="ui-btn ui-btn-dark" to="/tasks">Explore jobs</Link>
          </div>
        ) : (
          <ul className="ui-card mt2-list">
            {list.map((i) => (
              <li key={i.kind + i.id}>
                <Link to={i.link}>
                  <div className="mt2-t">
                    <strong>{i.title}</strong>
                    <span className="mt2-meta">{i.type}{i.with?.username ? ` · ${i.kind === 'ORDER' ? 'bought by' : 'from'} @${i.with.username}` : ''}</span>
                    <span className="mt2-detail">{when(i.date)}</span>
                  </div>
                  <div className="mt2-r">
                    <b>{show(i.amount, i.currency, { exact: true })}</b>
                    <em className={i.pending ? (i.statusText === 'Send your work' || /^New order/.test(i.statusText) ? 'todo' : 'wait') : i.status === 'APPROVED' || i.status === 'COMPLETED' ? 'ok' : i.status === 'REJECTED' || i.status === 'CANCELLED' ? 'bad' : ''}>{i.statusText}</em>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  )
}
