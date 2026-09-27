import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { categoryLabel } from '../lib/categories'
import '../styles/my-tasks.css'

// Jobs you've taken as a worker and where each one stands. Rows open the submit
// page, which shows the next step (send work, wait for review, result). The old
// page had made-up "% complete" bars, no links and no page margins.

type Sub = {
  id: string; status: string; taskId: string; createdAt: string; submittedAt?: string | null; reviewedAt?: string | null
  autoApproveAt?: string | null; posterNotes?: string | null
  task?: { id: string; title: string; reward: number | string; currency?: string; category?: string; poster?: { username?: string | null } }
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'To do', cls: 'todo' }, SUBMITTED: { label: 'In review', cls: 'wait' },
  APPROVED: { label: 'Paid', cls: 'ok' }, REJECTED: { label: 'Not approved', cls: 'bad' },
  DISPUTED: { label: 'In dispute', cls: 'wait' }, EXPIRED: { label: 'Slot released', cls: '' },
}
const TABS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'todo', label: 'To do', test: (s: Sub) => s.status === 'PENDING' },
  { id: 'review', label: 'In review', test: (s: Sub) => s.status === 'SUBMITTED' || s.status === 'DISPUTED' },
  { id: 'paid', label: 'Paid', test: (s: Sub) => s.status === 'APPROVED' },
  { id: 'closed', label: 'Not approved', test: (s: Sub) => s.status === 'REJECTED' || s.status === 'EXPIRED' },
]

const money = (n: number, cur = 'NGN') => cur === 'NGN' ? `₦${Math.round(n).toLocaleString('en-US')}` : `$${n.toFixed(2)}`
const day = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
const when = (d?: string | null) => d ? new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

function detail(s: Sub) {
  switch (s.status) {
    case 'PENDING': return 'Send your work when it\'s done'
    case 'SUBMITTED': return s.autoApproveAt ? `Sent ${day(s.submittedAt || s.createdAt)} · paid automatically ${when(s.autoApproveAt)} if not reviewed` : `Sent ${day(s.submittedAt || s.createdAt)}`
    case 'APPROVED': return `Approved${s.reviewedAt ? ` ${day(s.reviewedAt)}` : ''}`
    case 'REJECTED': return `Not approved${s.reviewedAt ? ` ${day(s.reviewedAt)}` : ''}`
    case 'EXPIRED': return 'No work was sent in time, so the slot was released'
    case 'DISPUTED': return 'Our team is reviewing this'
    default: return ''
  }
}

export default function MyTasks() {
  const [subs, setSubs] = useState<Sub[] | null>(null)
  const [earned, setEarned] = useState(0)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    apiRequest<{ submissions: Sub[]; stats?: { totalEarned?: number } }>('/tasks/my/submissions')
      .then((d) => { setSubs(d?.submissions || []); setEarned(Number(d?.stats?.totalEarned || 0)) })
      .catch(() => setSubs([]))
  }, [])

  const list = subs || []
  const shown = list.filter((TABS.find((t) => t.id === tab) || TABS[0]).test)
  const count = (id: string) => list.filter(TABS.find((t) => t.id === id)!.test).length

  return (
    <Layout>
      <div className="ui-page mt2-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">Working</span>
            <h1 className="ui-title">My tasks</h1>
            <p className="ui-sub">Jobs you've taken and where each one stands.</p>
          </div>
          <Link className="ui-btn ui-btn-dark" to="/tasks"><i className="ti ti-search" /> Find work</Link>
        </div>

        {subs === null ? <div className="ui-sk" style={{ height: 240, marginTop: 24 }} /> : list.length === 0 ? (
          <div className="ui-empty" style={{ marginTop: 24 }}>
            <p style={{ margin: '0 0 14px' }}>You haven't taken any jobs yet.</p>
            <Link className="ui-btn ui-btn-dark" to="/tasks">Browse jobs</Link>
          </div>
        ) : (
          <>
            <div className="mt2-sum">
              <div><b>{count('todo')}</b><span>to do</span></div>
              <div><b>{count('review')}</b><span>in review</span></div>
              <div><b>{count('paid')}</b><span>paid</span></div>
              <div><b>{money(earned)}</b><span>earned</span></div>
            </div>

            <div className="mt2-tabs" role="tablist" aria-label="Filter">
              {TABS.map((t) => {
                const n = count(t.id)
                if (t.id !== 'all' && n === 0) return null
                return <button key={t.id} role="tab" aria-selected={tab === t.id} className={`ui-chip${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>{t.label}<em>{n}</em></button>
              })}
            </div>

            <ul className="ui-card mt2-list">
              {shown.map((s) => {
                const st = STATUS[s.status] || { label: s.status.toLowerCase(), cls: '' }
                return (
                  <li key={s.id}>
                    <Link to={`/tasks/${s.taskId}/submit`}>
                      <div className="mt2-t">
                        <strong>{s.task?.title || 'Job'}</strong>
                        <span className="mt2-meta">{categoryLabel(s.task?.category)}{s.task?.poster?.username ? ` · @${s.task.poster.username}` : ''}</span>
                        <span className="mt2-detail">{detail(s)}</span>
                        {s.status === 'REJECTED' && s.posterNotes && <span className="mt2-note">“{s.posterNotes}”</span>}
                      </div>
                      <div className="mt2-r">
                        <b className={s.status === 'APPROVED' ? 'paid' : ''}>{money(Number(s.task?.reward || 0), s.task?.currency)}</b>
                        <em className={st.cls}>{st.label}</em>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </Layout>
  )
}
