import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { apiRequest } from '../lib/api'
import { categoryLabel } from '../lib/categories'
import { rankName } from '../lib/requirements'
import { jobDeadline, deadlineLabel } from '../lib/deadline'
import { withdrawLimit } from '../lib/wallet'
import { useMoney } from '../lib/useMoney'
import '../styles/dashboard.css'

// Dashboard, top to bottom: what needs you now (work to review, work to send),
// three numbers (balance, your level, OgaScore), then hiring (jobs you posted)
// beside earning (work you've taken, and jobs for you). Someone who only hires or
// only works gets that side alone; a new account gets two starter cards and the
// setup steps first. It used to be built for workers only, so posters saw "not
// working on anything" while their own jobs were one line at the top.

type Me = { ogaScore?: number; workerProfile?: { tasksCompleted?: number; level?: string } | null; kyc?: { status?: string; kycTier?: number } | null }
type Sub = { id: string; status: string; taskId: string; autoApproveAt?: string | null; task?: { id: string; title: string; reward: number | string; currency?: string } }
type Job = {
  id: string; title: string; reward: number | string; currency?: string; category?: string; posterId?: string; status?: string
  maxWorkers?: number; currentWorkers?: number; expiresAt?: string | null; deadline?: string | null
  submissions?: { status: string }[]
}

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'LEGEND']
const LIVE = ['OPEN', 'IN_PROGRESS', 'COOLING_DOWN', 'DRAFT']
const STATUS: Record<string, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', COOLING_DOWN: 'Wrapping up', DRAFT: 'Draft' }
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const when = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
const toReviewOn = (j: Job) => (j.submissions || []).filter((s) => s.status === 'SUBMITTED').length
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export default function Dashboard() {
  const { user } = useAuth()
  const { balances } = useWalletBalance()
  // Amounts follow the display currency; limits and "withdraw your ₦…" stay in naira
  const show = useMoney()
  const [me, setMe] = useState<Me | null>(null)
  const [earned, setEarned] = useState<number | null>(null)
  const [subs, setSubs] = useState<Sub[] | null>(null)
  const [created, setCreated] = useState<Job[] | null>(null)
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [hasBank, setHasBank] = useState(false)
  const [mail, setMail] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')

  useEffect(() => {
    apiRequest<Me>('/users/me').then(setMe).catch(() => setMe({}))
    apiRequest<{ totalEarned?: number }>('/users/me/earnings').then((d) => setEarned(Number(d?.totalEarned || 0))).catch(() => setEarned(0))
    apiRequest<{ submissions: Sub[] }>('/tasks/my/submissions').then((d) => setSubs(d?.submissions || [])).catch(() => setSubs([]))
    apiRequest<Job[]>('/tasks/my/created?limit=100').then((d) => setCreated(Array.isArray(d) ? d : [])).catch(() => setCreated([]))
    apiRequest<Job[] | { tasks: Job[] }>('/tasks?limit=12').then((d: any) => setJobs(Array.isArray(d) ? d : d?.tasks || [])).catch(() => setJobs([]))
    // Saved banks (the old check read a profile field the bank form never sets)
    apiRequest<any[]>('/wallet/banks').then((d) => setHasBank(Array.isArray(d) && d.length > 0)).catch(() => {})
  }, [])

  if (!user) return <Layout><div className="ui-page"><div className="ui-sk" style={{ height: 200 }} /></div></Layout>

  const ngn = balances?.NGN?.available ?? 0
  const mine = created || []
  const live = mine.filter((j) => LIVE.includes(String(j.status || 'OPEN')))
  const reviewJobs = mine.filter((j) => toReviewOn(j) > 0)
  const working = (subs || []).filter((s) => s.status === 'PENDING')
  const waiting = (subs || []).filter((s) => s.status === 'SUBMITTED')
  const active = [...working, ...waiting]
  // Not your own jobs, and not ones you've already taken part in
  const taken = new Set((subs || []).map((s) => s.taskId))
  const forYou = (jobs || []).filter((j) => j.posterId !== user.id && !taken.has(j.id)).slice(0, 4)
  const rank = me?.workerProfile?.level
  const rankLabel = rank ? rankName(LEVELS.indexOf(rank) + 1) : 'Beginner'
  const kycTier = (me?.kyc?.status || user.kycStatus) === 'APPROVED' ? Number(me?.kyc?.kycTier ?? user.kycTier ?? 0) : 0
  const kycOk = kycTier >= 1

  const loaded = subs !== null && created !== null
  const hires = mine.length > 0
  const works = (subs || []).length > 0
  const isNew = loaded && !hires && !works

  const steps = [
    { done: !!(user.firstName && user.lastName && user.avatar), label: 'Add your name and a photo', sub: 'People trust those they can recognise.', to: '/edit-profile', cta: 'Edit profile' },
    { done: !!user.isEmailVerified, label: 'Verify your email', sub: 'So you get job alerts and payment receipts.', action: 'mail' as const },
    { done: !!(hasBank || user.walletAddress || user.bankAccount), label: 'Add a way to get paid', sub: 'A bank account or a Solana wallet for withdrawals.', to: '/wallet', cta: 'Open wallet' },
    { done: kycOk, label: 'Verify your identity', sub: 'Needed to withdraw and send money, and some jobs ask for it.', to: '/settings/verification', cta: 'Verify' },
  ]
  const doneCount = steps.filter((s) => s.done).length

  // Things waiting on you, most useful first
  const attention: { key: string; icon: string; text: string; to: string; cta: string }[] = [
    ...reviewJobs.slice(0, 3).map((j) => ({ key: `r-${j.id}`, icon: 'ti-inbox', text: `${plural(toReviewOn(j), 'submission', 'submissions')} to review on “${j.title}”`, to: `/manage-jobs?job=${j.id}`, cta: 'Review' })),
    ...working.slice(0, 3).map((s) => ({ key: `w-${s.id}`, icon: 'ti-pencil', text: `Send your work for “${s.task?.title || 'your job'}”`, to: `/tasks/${s.taskId}/submit`, cta: 'Open' })),
    // (a new account sees this in the setup steps right below instead)
    ...(!kycOk && ngn > 0 && !isNew ? [{ key: 'kyc', icon: 'ti-id', text: `Verify your identity to withdraw your ${show(ngn, 'NGN', { exact: true })}`, to: '/settings/verification', cta: 'Verify' }] : []),
  ]
  const moreReview = reviewJobs.length - 3

  const resend = async () => {
    setMail('sending')
    try {
      await apiRequest('/auth/resend-verification', { method: 'POST' })
      setMail('sent')
    } catch { setMail('failed') }
  }

  const setup = doneCount < steps.length && (
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
  )

  const hiring = (
    <section className="ui-card ui-card-pad db-role">
      <div className="db-role-label">Hiring</div>
      <div className="db-sec-head"><h2>Your jobs</h2><Link to="/manage-jobs" className="tap">Manage jobs</Link></div>
      {live.length === 0 ? (
        <div className="db-empty">None of your jobs are open right now. <Link to="/create">Post a job</Link></div>
      ) : (
        <ul className="db-list">
          {[...live].sort((a, b) => toReviewOn(b) - toReviewOn(a)).slice(0, 5).map((j) => {
            const review = toReviewOn(j)
            const slots = Number(j.maxWorkers) || 1
            const left = Math.max(0, slots - (Number(j.currentWorkers) || 0))
            const dl = jobDeadline(j)
            return (
              <li key={j.id}>
                <Link to={`/manage-jobs?job=${j.id}`}>
                  <div>
                    <strong>{j.title}</strong>
                    <span>{left} of {slots} {slots === 1 ? 'place' : 'places'} left{dl.state === 'none' ? '' : ` · ${deadlineLabel(dl)}`}</span>
                  </div>
                  {review > 0 ? <em className="wait">{review} to review</em> : <em className="todo">{STATUS[String(j.status)] || 'Open'}</em>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )

  const earning = (
    <section className="ui-card ui-card-pad db-role">
      <div className="db-role-label">Earning</div>
      <div className="db-sec-head">
        <h2>Your work</h2>
        <Link to="/earnings">{earned === null ? 'Earnings' : `${show(earned)} earned`}</Link>
      </div>
      {active.length === 0 ? (
        <div className="db-empty">You're not working on anything right now.</div>
      ) : (
        <ul className="db-list">
          {active.slice(0, 4).map((s) => (
            <li key={s.id}>
              <Link to={`/tasks/${s.taskId}/submit`}>
                <div>
                  <strong>{s.task?.title || 'Job'}</strong>
                  <span>{s.status === 'PENDING' ? 'Send your work when it\'s done' : s.autoApproveAt ? `In review · paid automatically ${when(s.autoApproveAt)} if not reviewed` : 'Waiting for review'}</span>
                </div>
                <em className={s.status === 'PENDING' ? 'todo' : 'wait'}>{s.status === 'PENDING' ? 'To do' : 'In review'}</em>
                <b>{show(Number(s.task?.reward || 0), s.task?.currency || 'NGN')}</b>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="db-sub-head"><span>Jobs for you</span><Link to="/tasks">See all jobs</Link></div>
      {jobs === null ? <div className="ui-sk" style={{ height: 90 }} /> : forYou.length === 0 ? (
        <div className="db-empty">No open jobs right now. Check back soon.</div>
      ) : (
        <div className="db-jobs">
          {forYou.map((j) => (
            <Link key={j.id} to={`/tasks/${j.id}`} className="db-job">
              <span className="db-job-cat">{categoryLabel(j.category)}</span>
              <strong>{j.title}</strong>
              <b>{show(Number(j.reward || 0), j.currency || 'NGN')}</b>
            </Link>
          ))}
        </div>
      )}
    </section>
  )

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

        <div className="db-stack">
          {attention.length > 0 && (
            <section className="ui-card ui-card-pad db-attn" aria-labelledby="db-attn">
              <div className="db-sec-head"><h2 id="db-attn">Needs your attention</h2>{moreReview > 0 && <Link to="/manage-jobs">{plural(moreReview, 'more job', 'more jobs')} to review</Link>}</div>
              <ul>
                {attention.map((a) => (
                  <li key={a.key}>
                    <span className="db-attn-ic"><i className={`ti ${a.icon}`} /></span>
                    <span className="db-attn-text">{a.text}</span>
                    <Link className="db-step-btn" to={a.to}>{a.cta}</Link>
                  </li>
                ))}
              </ul>
              {reviewJobs.length > 0 && <p className="db-attn-note">Work you don't review is approved and paid automatically after a few days.</p>}
            </section>
          )}

          {isNew && setup}

          <div className="db-snap">
            <Link to="/wallet" className="db-stat"><span>Balance</span><b>{show(ngn)}</b><small>Open wallet →</small></Link>
            <Link to="/wallet" className="db-stat">
              <span>Your level</span>
              <b>{kycOk ? `Level ${kycTier}` : 'Not verified'}</b>
              <small>{kycOk ? `Withdraw up to ${show(withdrawLimit(kycTier), 'NGN', { exact: true })} each time` : 'Verify to withdraw and send money'}</small>
            </Link>
            <Link to="/rank" className="db-stat"><span>OgaScore</span><b>{me?.ogaScore ?? '…'}</b><small>{rankLabel} · {plural(me?.workerProfile?.tasksCompleted ?? 0, 'job', 'jobs')} done</small></Link>
          </div>

          {!loaded ? (
            <div className="ui-sk" style={{ height: 200, borderRadius: 20 }} />
          ) : isNew ? (
            <div className="db-pair">
              <Link to="/tasks" className="ui-card ui-card-pad db-start">
                <span className="db-start-ic"><i className="ti ti-search" /></span>
                <strong>Find your first job</strong>
                <span>Paid tasks you can do from your phone: testing, writing, design and more. Get paid in naira or USDC.</span>
                <em>Browse jobs <i className="ti ti-arrow-right" /></em>
              </Link>
              <Link to="/create" className="ui-card ui-card-pad db-start">
                <span className="db-start-ic"><i className="ti ti-plus" /></span>
                <strong>Post your first job</strong>
                <span>Describe the work, set a reward and how many people you need. The money is held safely until you approve the work.</span>
                <em>Post a job <i className="ti ti-arrow-right" /></em>
              </Link>
            </div>
          ) : (
            <div className={`db-pair${hires && works ? '' : ' single'}`}>
              {hires && hiring}
              {(works || !hires) && earning}
              {hires && !works && (
                <p className="db-aside-link">Want to earn too? <Link to="/tasks">See jobs you can do</Link></p>
              )}
            </div>
          )}

          {!isNew && setup}
        </div>
      </div>
    </Layout>
  )
}
