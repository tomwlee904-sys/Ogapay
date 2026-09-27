import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { API_BASE, apiRequest } from '../lib/api'
import { categoryLabel } from '../lib/categories'
import { rankName } from '../lib/requirements'
import '../styles/dashboard.css'

// Dashboard: what needs you today, your numbers, your work in progress and a few
// jobs, plus one setup card while setup is unfinished. It used to read the balance
// from a field that's always empty (₦0), show two progress bars that disagreed,
// poll /users/me every 5 seconds and stack up to three banners, and it never told
// posters that work was waiting for them.

type Me = { ogaScore?: number; workerProfile?: { tasksCompleted?: number; level?: string } | null; kyc?: { status?: string; kycTier?: number } | null }
type Sub = { id: string; status: string; taskId: string; autoApproveAt?: string | null; task?: { id: string; title: string; reward: number | string; currency?: string } }
type Job = { id: string; title: string; reward: number | string; currency?: string; category?: string; posterId?: string; submissions?: { status: string }[] }

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'LEGEND']
const money = (n: number, cur = 'NGN') => cur === 'NGN' ? `₦${Math.round(n).toLocaleString('en-US')}` : `$${n.toFixed(2)}`
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const when = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''

export default function Dashboard() {
  const { user } = useAuth()
  const { balances } = useWalletBalance()
  const [me, setMe] = useState<Me | null>(null)
  const [earned, setEarned] = useState<number | null>(null)
  const [subs, setSubs] = useState<Sub[] | null>(null)
  const [created, setCreated] = useState<Job[]>([])
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [mail, setMail] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  useEffect(() => {
    apiRequest<Me>('/users/me').then(setMe).catch(() => setMe({}))
    apiRequest<{ totalEarned?: number }>('/users/me/earnings').then((d) => setEarned(Number(d?.totalEarned || 0))).catch(() => setEarned(0))
    apiRequest<{ submissions: Sub[] }>('/tasks/my/submissions').then((d) => setSubs(d?.submissions || [])).catch(() => setSubs([]))
    apiRequest<Job[]>('/tasks/my/created?limit=100').then((d) => setCreated(Array.isArray(d) ? d : [])).catch(() => setCreated([]))
    apiRequest<Job[] | { tasks: Job[] }>('/tasks?limit=12').then((d: any) => setJobs(Array.isArray(d) ? d : d?.tasks || [])).catch(() => setJobs([]))
  }, [])

  if (!user) return <Layout><div className="ui-page"><div className="ui-sk" style={{ height: 200 }} /></div></Layout>

  const ngn = balances?.NGN?.available ?? 0
  const toReview = created.reduce((n, j) => n + (j.submissions || []).filter((s) => s.status === 'SUBMITTED').length, 0)
  const working = (subs || []).filter((s) => s.status === 'PENDING')
  const waiting = (subs || []).filter((s) => s.status === 'SUBMITTED')
  const active = [...working, ...waiting]
  // Not your own jobs, and not ones you've already taken part in
  const taken = new Set((subs || []).map((s) => s.taskId))
  const forYou = (jobs || []).filter((j) => j.posterId !== user.id && !taken.has(j.id)).slice(0, 4)
  const level = me?.workerProfile?.level
  const levelName = level ? rankName(LEVELS.indexOf(level) + 1) : 'Beginner'
  const kycOk = (me?.kyc?.status || user.kycStatus) === 'APPROVED' && Number(me?.kyc?.kycTier ?? user.kycTier ?? 0) >= 1

  const steps = [
    { done: !!(user.firstName && user.lastName && user.avatar), label: 'Add your name and a photo', sub: 'Posters trust people they can recognise.', to: '/edit-profile', cta: 'Edit profile' },
    { done: user.isEmailVerified, label: 'Verify your email', sub: 'So you get job alerts and payment receipts.', action: 'mail' as const },
    { done: !!(user.bankAccount || user.walletAddress), label: 'Add a way to get paid', sub: 'A bank account or a Solana wallet for withdrawals.', to: '/wallet', cta: 'Open wallet' },
    { done: kycOk, label: 'Verify your identity', sub: 'Needed to withdraw, and some jobs ask for it.', to: '/settings/verification', cta: 'Verify' },
  ]
  const doneCount = steps.filter((s) => s.done).length

  const resend = async () => {
    setMail('sending')
    try {
      const r = await fetch(`${API_BASE}/auth/send-verification`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) })
      setMail(r.ok ? 'sent' : 'failed')
    } catch { setMail('failed') }
  }

  return (
    <Layout sidebar={false}>
      <div className="ui-page db-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">Dashboard</span>
            <h1 className="ui-title">{greeting()}, {user.firstName || user.username || 'there'}</h1>
          </div>
          <div className="ui-actions">
            {user.role === 'ADMIN' && <Link className="ui-btn ui-btn-ghost" to="/admin"><i className="ti ti-shield-cog" /> Admin panel</Link>}
            <Link className="ui-btn ui-btn-ghost" to="/tasks"><i className="ti ti-search" /> Find work</Link>
            <Link className="ui-btn ui-btn-dark" to="/create"><i className="ti ti-plus" /> Post a job</Link>
          </div>
        </div>

        {toReview > 0 && (
          <Link to="/manage-jobs" className="db-alert">
            <span className="db-alert-ic"><i className="ti ti-inbox" /></span>
            <span><b>{toReview === 1 ? '1 piece of work is' : `${toReview} pieces of work are`} waiting for your review.</b> Unreviewed work is approved and paid automatically after a few days.</span>
            <i className="ti ti-arrow-right" />
          </Link>
        )}

        <div className="db-stats">
          <Link to="/wallet" className="db-stat"><span>Balance</span><b>{money(ngn)}</b><small>available to use</small></Link>
          <Link to="/earnings" className="db-stat"><span>Earned from jobs</span><b>{earned === null ? '…' : money(earned)}</b><small>all time</small></Link>
          <Link to="/my-tasks" className="db-stat"><span>In progress</span><b>{subs === null ? '…' : active.length}</b><small>{waiting.length ? `${waiting.length} waiting for review` : 'jobs you\'ve taken'}</small></Link>
          <Link to="/rank" className="db-stat"><span>OgaScore</span><b>{me?.ogaScore ?? '…'}</b><small>{levelName} · {me?.workerProfile?.tasksCompleted ?? 0} jobs done</small></Link>
        </div>

        <div className="db-grid">
          <div className="db-main">
            <section className="ui-card ui-card-pad">
              <div className="db-sec-head"><h2>Your work</h2><Link to="/my-tasks">All my tasks</Link></div>
              {subs === null ? <div className="ui-sk" style={{ height: 80 }} /> : active.length === 0 ? (
                <div className="db-empty">You're not working on anything right now. <Link to="/tasks">Find a job</Link></div>
              ) : (
                <ul className="db-list">
                  {active.slice(0, 5).map((s) => (
                    <li key={s.id}>
                      <Link to={`/tasks/${s.taskId}/submit`}>
                        <div>
                          <strong>{s.task?.title || 'Job'}</strong>
                          <span>{s.status === 'PENDING' ? 'Send your work when it\'s done' : s.autoApproveAt ? `Waiting for review · paid automatically ${when(s.autoApproveAt)} if not reviewed` : 'Waiting for review'}</span>
                        </div>
                        <em className={s.status === 'PENDING' ? 'todo' : 'wait'}>{s.status === 'PENDING' ? 'To do' : 'In review'}</em>
                        <b>{money(Number(s.task?.reward || 0), s.task?.currency)}</b>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="ui-card ui-card-pad">
              <div className="db-sec-head"><h2>Jobs for you</h2><Link to="/tasks">See all jobs</Link></div>
              {jobs === null ? <div className="ui-sk" style={{ height: 120 }} /> : forYou.length === 0 ? (
                <div className="db-empty">No open jobs right now. Check back soon.</div>
              ) : (
                <div className="db-jobs">
                  {forYou.map((j) => (
                    <Link key={j.id} to={`/tasks/${j.id}`} className="db-job">
                      <span className="db-job-cat">{categoryLabel(j.category)}</span>
                      <strong>{j.title}</strong>
                      <b>{money(Number(j.reward || 0), j.currency)}</b>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="db-side">
            {doneCount < steps.length && (
              <section className="ui-card ui-card-pad">
                <div className="db-sec-head"><h2>Finish setting up</h2><span className="db-count">{doneCount} of {steps.length}</span></div>
                <div className="db-bar"><i style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
                <ul className="db-steps">
                  {steps.map((s) => (
                    <li key={s.label} className={s.done ? 'done' : ''}>
                      <span className="db-check">{s.done ? <i className="ti ti-check" /> : null}</span>
                      <div>
                        <strong>{s.label}</strong>
                        {!s.done && <span>{s.sub}</span>}
                        {!s.done && (s.action === 'mail'
                          ? <button className="db-step-btn" onClick={resend} disabled={mail === 'sending' || mail === 'sent'}>{mail === 'sending' ? 'Sending…' : mail === 'sent' ? 'Link sent. Check your inbox' : mail === 'failed' ? 'Couldn\'t send. Try again' : 'Send the link again'}</button>
                          : <Link className="db-step-btn" to={s.to!}>{s.cta}</Link>)}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="ui-card ui-card-pad">
              <div className="db-sec-head"><h2>Help</h2></div>
              <nav className="db-help">
                <Link to="/faq"><i className="ti ti-help-circle" /> How OgaPay works</Link>
                <Link to="/support"><i className="ti ti-headset" /> Contact support</Link>
                <a href="https://t.me/ogapay" target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" /> Telegram community</a>
              </nav>
            </section>
          </aside>
        </div>
      </div>
    </Layout>
  )
}
