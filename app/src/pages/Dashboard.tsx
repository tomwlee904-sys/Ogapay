import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { apiRequest } from '../lib/api'
import { sharedGet } from '../lib/shared'
import { categoryLabel } from '../lib/categories'
import { rankName } from '../lib/requirements'
import { jobDeadline, deadlineLabel } from '../lib/deadline'
import { withdrawLimit } from '../lib/wallet'
import { useMoney } from '../lib/useMoney'
import InfoTip from '../components/InfoTip'
import '../styles/dashboard.css'

// Dashboard, top to bottom: what needs you now (work to review, work to send),
// three numbers (balance, your level, OgaScore), then hiring (jobs you posted)
// beside earning (work you've taken, and jobs for you). Someone who only hires or
// only works gets that side alone; a new account gets two starter cards and the
// setup steps first. It used to be built for workers only, so posters saw "not
// working on anything" while their own jobs were one line at the top.
// Starter jobs (the Highlighted ones) are listed in full for anyone with fewer
// than STARTER_UNTIL finished jobs, the ones they can do right now first.

type Intent = 'EARN' | 'HIRE' | 'BOTH'
const INTENT_OPTS: { value: Intent; label: string; icon: string }[] = [
  { value: 'EARN', label: 'Earn money', icon: 'ti-coin' },
  { value: 'HIRE', label: 'Hire people', icon: 'ti-briefcase' },
  { value: 'BOTH', label: 'Both', icon: 'ti-arrows-exchange' },
]
type Me = { ogaScore?: number; signupIntent?: Intent | null; humanVerifiedAt?: string | null; workerProfile?: { tasksCompleted?: number; level?: string } | null; kyc?: { status?: string; kycTier?: number } | null }
type Sub = {
  id: string; status: string; taskId: string; autoApproveAt?: string | null; submittedAt?: string | null
  task?: { id: string; title: string; reward: number | string; currency?: string; expiresAt?: string | null; deadline?: string | null }
  isContest?: boolean; contestResult?: 'WON' | 'NOT_PLACED' | 'WAITING' | null
}
type Job = {
  id: string; title: string; reward: number | string; currency?: string; category?: string; posterId?: string; status?: string
  maxWorkers?: number; currentWorkers?: number; expiresAt?: string | null; deadline?: string | null
  submissions?: { status: string }[]
  featured?: boolean; workerRequirement?: string | null; minJobsDone?: number; excludesTaskIds?: string[]
  isContest?: boolean; isSelection?: boolean; requiredCommunityId?: string | null; communityId?: string | null
}

// The ₦1,000 first job bonus (backend wallet.service rewardSignupBonus): paid once
// someone is verified by NIN or ID AND has finished their first paid job
const FIRST_JOB_BONUS = 1000

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'LEGEND']
const LIVE = ['OPEN', 'IN_PROGRESS', 'COOLING_DOWN', 'DRAFT']
const STATUS: Record<string, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', COOLING_DOWN: 'Wrapping up', DRAFT: 'Draft' }
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const when = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
const toReviewOn = (j: Job) => (j.submissions || []).filter((s) => s.status === 'SUBMITTED').length
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const STARTER_UNTIL = 5
const placesLeft = (j: Job) => Math.max(0, (Number(j.maxWorkers) || 1) - (Number(j.currentWorkers) || 0))

export default function Dashboard() {
  const { user } = useAuth()
  const { balances } = useWalletBalance()
  // Amounts follow the display currency; limits and "withdraw your ₦…" stay in naira
  const show = useMoney()
  const [me, setMe] = useState<Me | null>(null)
  // Starter jobs fold away so they don't fill the page; the choice is remembered
  const [starterOpen, setStarterOpen] = useState(() => { try { return localStorage.getItem('ogapay-starter-open') === '1' } catch { return false } })
  const toggleStarter = () => setStarterOpen((o) => { try { localStorage.setItem('ogapay-starter-open', o ? '0' : '1') } catch { /* private mode */ } return !o })
  // A rank you can claim (services/rank.service.js): shown first on the dashboard
  const [rankUp, setRankUp] = useState<{ name: string } | null>(null)
  useEffect(() => {
    apiRequest<any>('/scores/me').then((d) => setRankUp(d?.rank?.canClaim && d.rank.next ? { name: d.rank.next.name } : null)).catch(() => {})
  }, [])
  // Earned per currency: USDC is never added to the naira total
  const [earned, setEarned] = useState<Record<string, number> | null>(null)
  const [subs, setSubs] = useState<Sub[] | null>(null)
  const [created, setCreated] = useState<Job[] | null>(null)
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [hasBank, setHasBank] = useState(false)
  const [mail, setMail] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  // "What brings you to OgaPay?" for members who didn't answer at sign-up
  // (Google sign-ups, older accounts). Asked once; Skip hides it on this device.
  const [intentSkipped, setIntentSkipped] = useState(false)
  const [intentBusy, setIntentBusy] = useState(false)
  const [intentError, setIntentError] = useState('')
  // After answering or skipping, a short line takes the card's place and gets
  // focus, so keyboard and screen-reader users keep their place and hear it
  const [intentDone, setIntentDone] = useState<'saved' | 'skipped' | null>(null)
  const intentDoneRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (intentDone) intentDoneRef.current?.focus() }, [intentDone])

  useEffect(() => {
    apiRequest<Me>('/users/me').then(setMe).catch(() => setMe({}))
    apiRequest<{ totalEarned?: number; earned?: Record<string, number> }>('/users/me/earnings').then((d) => setEarned(d?.earned || { NGN: Number(d?.totalEarned || 0) })).catch(() => setEarned({}))
    apiRequest<{ submissions: Sub[] }>('/tasks/my/submissions').then((d) => setSubs(d?.submissions || [])).catch(() => setSubs([]))
    apiRequest<Job[]>('/tasks/my/created?limit=100').then((d) => setCreated(Array.isArray(d) ? d : [])).catch(() => setCreated([]))
    apiRequest<Job[] | { tasks: Job[] }>('/tasks?limit=100').then((d: any) => setJobs(Array.isArray(d) ? d : d?.tasks || [])).catch(() => setJobs([]))
    // Saved banks (the old check read a profile field the bank form never sets)
    sharedGet<any[]>('/wallet/banks', 5000).then((d) => setHasBank(Array.isArray(d) && d.length > 0)).catch(() => {})
  }, [])

  if (!user) return <Layout><div className="ui-page"><div className="ui-sk" style={{ height: 200 }} /></div></Layout>

  const ngn = balances?.NGN?.available ?? 0
  const mine = created || []
  const live = mine.filter((j) => LIVE.includes(String(j.status || 'OPEN')))
  const reviewJobs = mine.filter((j) => toReviewOn(j) > 0)
  // "₦3,200 earned", or "₦3,200 + 1.50 USDC earned": each currency its own total, naira first
  const earnedBy = Object.entries(earned || {}).filter(([, v]) => Number(v) > 0).sort(([a], [b]) => (a === 'NGN' ? -1 : b === 'NGN' ? 1 : a.localeCompare(b)))
  const earnedText = earned === null ? 'Earnings'
    : earnedBy.length > 1 ? `${earnedBy.map(([c, v]) => show(Number(v), c, { exact: true })).join(' + ')} earned`
      // Exact like My tasks: the money actually paid, never a converted figure
      : `${show(Number(earnedBy[0]?.[1] || 0), earnedBy[0]?.[0] || 'NGN', { exact: true })} earned`
  // A contest slot with no entry sent can't be sent once the end date passes
  // (the job stays open while the winners are picked), so it isn't "To do"
  const closedUnsent = (s: Sub) => {
    const e = s.task?.expiresAt || s.task?.deadline
    return !!s.isContest && !s.submittedAt && !!e && new Date(e).getTime() <= Date.now()
  }
  // Contest entries that didn't place are finished, not "in review" forever
  const working = (subs || []).filter((s) => s.status === 'PENDING' && s.contestResult !== 'NOT_PLACED' && !closedUnsent(s))
  const waiting = (subs || []).filter((s) => s.status === 'SUBMITTED' && s.contestResult !== 'NOT_PLACED')
  const active = [...working, ...waiting]
  // Not your own jobs, and not ones you've already taken part in
  const taken = new Set((subs || []).map((s) => s.taskId))
  // A similar job you've done (linked either way) can't be taken too
  const similarTaken = (j: Job) => (j.excludesTaskIds || []).some((id) => taken.has(id)) ||
    (jobs || []).some((o) => taken.has(o.id) && (o.excludesTaskIds || []).includes(j.id))
  const jobsDone = me?.workerProfile?.tasksCompleted ?? 0
  const starter = me && jobsDone < STARTER_UNTIL
    ? (jobs || []).filter((j) => j.featured && j.posterId !== user.id && !taken.has(j.id) && !similarTaken(j) && placesLeft(j) > 0 && jobDeadline(j).state !== 'ended')
    : []
  const starterIds = new Set(starter.map((j) => j.id))
  const forYou = (jobs || []).filter((j) => j.posterId !== user.id && !taken.has(j.id) && !starterIds.has(j.id)).slice(0, 4)
  const rank = me?.workerProfile?.level
  const rankLabel = rank ? rankName(LEVELS.indexOf(rank) + 1) : 'Beginner'
  const kycTier = (me?.kyc?.status || user.kycStatus) === 'APPROVED' ? Number(me?.kyc?.kycTier ?? user.kycTier ?? 0) : 0
  const kycOk = kycTier >= 1
  // What stands between you and a starter job (null: you can do it now)
  const stepFor = (j: Job): { text: string; tag: string; order: number } | null => {
    const need = Number(j.minJobsDone) || 0
    if (need > jobsDone) return { text: need === 1 ? 'Opens after your first approved job' : `Opens after ${need} approved jobs`, tag: 'Later', order: 2 }
    if (j.workerRequirement === 'KYC2' && kycTier < 2) return { text: 'Verify your ID with a selfie first (Level 2)', tag: 'Verify ID', order: 1 }
    if (j.workerRequirement === 'KYC' && !kycOk) return { text: 'Verify your ID first (Level 1)', tag: 'Verify ID', order: 1 }
    if (j.workerRequirement === 'HUMAN' && !me?.humanVerifiedAt) return { text: 'Get Human Verified first, it takes a minute', tag: 'Verify', order: 1 }
    return null
  }
  const starterSorted = starter.map((j) => ({ j, step: stepFor(j) })).sort((a, b) => (a.step?.order ?? 0) - (b.step?.order ?? 0))

  // "Your first job": for someone with no approved job yet, one clear job they can
  // take right now (the best-paying starter job they qualify for), the job's pay
  // plus the ₦1,000 first job bonus, and the two steps to get it. A job they've
  // already taken comes first (finish it), then a starter job, then any simple job.
  const simple = (j: Job) => !j.isContest && !j.isSelection && !j.requiredCommunityId && !j.communityId && (j.currency || 'NGN') === 'NGN'
    && j.posterId !== user.id && !taken.has(j.id) && !similarTaken(j) && placesLeft(j) > 0 && jobDeadline(j).state !== 'ended' && !stepFor(j)
  const byPay = (a: Job, b: Job) => Number(b.reward || 0) - Number(a.reward || 0)
  const firstPick = (jobs || []).filter((j) => simple(j) && j.featured).sort(byPay)[0]
    || (jobs || []).filter((j) => simple(j) && Number(j.reward || 0) <= 2000).sort(byPay)[0]
  const firstActive = [...working, ...waiting][0]
  const showFirstJob = !!me && jobsDone === 0 && (!!firstActive || !!firstPick)

  const loaded = subs !== null && created !== null
  const hires = mine.length > 0
  const works = (subs || []).length > 0
  const isNew = loaded && !hires && !works

  const steps = [
    { done: !!(user.firstName && user.lastName && user.avatar), label: 'Add your name and a photo', sub: 'People trust those they can recognise.', to: '/edit-profile', cta: 'Edit profile' },
    { done: !!user.isEmailVerified, label: 'Verify your email', sub: 'So you get job alerts and payment receipts.', action: 'mail' as const },
    { done: !!(hasBank || user.walletAddress || user.bankAccount), label: 'Add a way to get paid', sub: 'A bank account or a Solana wallet for withdrawals.', to: '/wallet', cta: 'Open wallet' },
    { done: kycOk, label: 'Verify your identity', sub: 'Free and takes a minute. You need it to withdraw and send money, and some jobs ask for it. Verify with your NIN, then finish your first job to get your ₦1,000 first job bonus. Withdrawals start at ₦5,000 (fee 1.5%, at least ₦100) and are paid every Thursday.', to: '/settings/verification', cta: 'Verify' },
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

  // "What brings you to OgaPay?" (only when the server says it isn't answered)
  const skipKey = `ogapay-intent-skip-${user.id}`
  const skipped = intentSkipped || (() => { try { return localStorage.getItem(skipKey) === '1' } catch { return false } })()
  const answerIntent = async (value: Intent) => {
    setIntentBusy(true); setIntentError('')
    try {
      await apiRequest('/users/me', { method: 'PATCH', body: JSON.stringify({ signupIntent: value }) })
      setMe((m) => ({ ...(m || {}), signupIntent: value }))
      setIntentDone('saved')
    } catch (e: any) { setIntentError(e?.message || "Couldn't save that. Please try again.") }
    setIntentBusy(false)
  }
  const skipIntent = () => { try { localStorage.setItem(skipKey, '1') } catch { /* private mode */ } setIntentSkipped(true); setIntentDone('skipped') }
  const intentCard = intentDone ? (
    <section className="ui-card ui-card-pad db-intent" aria-label="What brings you to OgaPay?">
      <p ref={intentDoneRef} tabIndex={-1} role="status" className="db-intent-done">
        <i className="ti ti-check" aria-hidden="true" />
        {intentDone === 'saved' ? 'Thanks, saved. You can still earn and hire either way.' : "OK, we won't ask again on this device."}
      </p>
    </section>
  ) : me?.signupIntent === null && !skipped && (
    <section className="ui-card ui-card-pad db-intent" aria-labelledby="db-intent">
      <div className="db-sec-head"><h2 id="db-intent">What brings you to OgaPay?</h2><button type="button" className="db-intent-skip" onClick={skipIntent}>Skip</button></div>
      <p className="db-intent-sub">One tap. You can earn and hire either way. This helps us show you the right things first.</p>
      <div className="db-intent-opts">
        {INTENT_OPTS.map((o) => (
          <button key={o.value} type="button" className="db-intent-opt" disabled={intentBusy} onClick={() => answerIntent(o.value)}>
            <i className={`ti ${o.icon}`} aria-hidden="true" /> {o.label}
          </button>
        ))}
      </div>
      {intentError && <p className="db-intent-err" role="alert">{intentError}</p>}
    </section>
  )

  const postFirst = (
    <Link to="/create" className="ui-card ui-card-pad db-start">
      <span className="db-start-ic"><i className="ti ti-plus" /></span>
      <strong>Post your first job</strong>
      <span>Describe the work, set a reward and how many people you need. The money is held safely until you approve the work.</span>
      <em>Post a job <i className="ti ti-arrow-right" /></em>
    </Link>
  )

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

  const firstJobCard = showFirstJob && (
    <section className="ui-card ui-card-pad db-first" aria-labelledby="db-first">
      <span className="db-first-tag">Your first job</span>
      {firstActive ? (
        <>
          <h2 id="db-first">Finish "{firstActive.task?.title || 'your job'}"</h2>
          <p className="db-first-pay"><b>{show(Number(firstActive.task?.reward || 0), firstActive.task?.currency || 'NGN')}</b> + <b>{show(FIRST_JOB_BONUS, 'NGN')}</b> first job bonus</p>
        </>
      ) : firstPick && (
        <>
          <h2 id="db-first">{firstPick.title}</h2>
          <p className="db-first-pay">Earn <b>{show(Number(firstPick.reward || 0), firstPick.currency || 'NGN')}</b> + <b>{show(FIRST_JOB_BONUS, 'NGN')}</b> first job bonus</p>
        </>
      )}
      <ol className="db-first-steps">
        <li className={kycOk ? 'done' : ''}>
          <i className={`ti ${kycOk ? 'ti-circle-check' : 'ti-circle-number-1'}`} aria-hidden="true" />
          <span>{kycOk ? 'Your ID is verified' : 'Verify your ID with your NIN (free, about a minute)'}</span>
          {!kycOk && <Link className="db-step-btn" to="/settings/verification">Verify</Link>}
        </li>
        <li>
          <i className="ti ti-circle-number-2" aria-hidden="true" />
          <span>{firstActive ? (firstActive.status === 'SUBMITTED' ? "You've sent your work. You're paid when it's approved" : 'Do the job and send your proof') : 'Take the job, do it and send your proof'}</span>
          {firstActive
            ? (firstActive.status !== 'SUBMITTED' && <Link className="db-step-btn" to={`/tasks/${firstActive.taskId}/submit`}>Send work</Link>)
            : firstPick && <Link className="db-step-btn dark" to={`/tasks/${firstPick.id}`}>Take this job</Link>}
        </li>
      </ol>
      <p className="db-first-note">The {show(FIRST_JOB_BONUS, 'NGN')} is added to your wallet with your first approved job, once your ID is verified.</p>
    </section>
  )

  const starterCard = starterSorted.length > 0 && (
    <section className="ui-card ui-card-pad db-starter" aria-labelledby="db-starter">
      <div className="db-sec-head">
        <h2 id="db-starter">Starter jobs <InfoTip label="What are starter jobs?" title="Starter jobs">
          <p>Quick jobs from the OgaPay team to help you learn OgaPay and earn your first naira. Do them in any order. Each one pays once, and it leaves this list when you've taken it.</p>
          <p>Send real proof: work that just copies the brief is rejected.</p>
        </InfoTip></h2>
        <button type="button" className="db-fold" onClick={toggleStarter} aria-expanded={starterOpen} aria-controls="db-starter-list">
          {starterSorted.length} for you <i className={`ti ti-chevron-${starterOpen ? 'up' : 'down'}`} aria-hidden="true" />
        </button>
      </div>
      {starterOpen && <ul className="db-list" id="db-starter-list">
        {starterSorted.map(({ j, step }) => (
          <li key={j.id}>
            <Link to={`/tasks/${j.id}`}>
              <div>
                <strong>{j.title}</strong>
                <span>{step ? step.text : `${plural(placesLeft(j), 'place', 'places')} left`}</span>
              </div>
              {step && <em className={step.order === 2 ? 'later' : 'wait'}>{step.tag}</em>}
              <b>{show(Number(j.reward || 0), j.currency || 'NGN')}</b>
            </Link>
          </li>
        ))}
      </ul>}
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
        <Link to="/earnings">{earnedText}</Link>
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
                  <span>{s.status === 'PENDING' ? (s.isContest ? 'Send your entry before the contest ends' : 'Send your work when it\'s done') : s.isContest ? 'Entry sent · winners are picked after it ends' : s.autoApproveAt ?`In review · paid automatically ${when(s.autoApproveAt)} if not reviewed` : 'Waiting for review'}</span>
                </div>
                <em className={s.status === 'PENDING' ? 'todo' : 'wait'}>{s.status === 'PENDING' ? 'To do' : s.isContest ? 'Entered' : 'In review'}</em>
                <b>{s.isContest ? 'Up to ' : ''}{show(Number(s.task?.reward || 0), s.task?.currency || 'NGN')}</b>
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
          {rankUp && (
            <section className="ui-card ui-card-pad db-rankup" aria-label="New rank available">
              <span className="db-attn-ic"><i className="ti ti-trophy" /></span>
              <div><b>You qualify for {rankUp.name}</b><span>Claim your new rank to unlock more jobs and better-paying ones.</span></div>
              <Link className="ui-btn ui-btn-dark" to="/rank">Claim it</Link>
            </section>
          )}
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

          {intentCard}
          {firstJobCard}
          {starterCard}
          {isNew && setup}

          <div className="db-snap">
            <Link to="/wallet" className="db-stat"><span>Balance</span><b>{show(ngn)}</b><small>Open wallet →</small></Link>
            <Link to="/wallet" className="db-stat">
              <span>Your level</span>
              <b>{kycOk ? `Level ${kycTier}` : 'Not verified'}</b>
              <small>{kycOk ? `Withdraw up to ${show(withdrawLimit(kycTier), 'NGN', { exact: true })} a day, paid Thursdays` : 'Verify to withdraw and send money'}</small>
            </Link>
            <Link to="/rank" className="db-stat"><span>OgaScore</span><b>{me?.ogaScore ?? '…'}</b><small>{rankLabel} · {plural(me?.workerProfile?.tasksCompleted ?? 0, 'job', 'jobs')} done</small></Link>
          </div>

          {/* a new member's two cards wait for /users/me too: their order depends on the answer */}
          {!loaded || (isNew && me === null) ? (
            <div className="ui-sk" style={{ height: 200, borderRadius: 20 }} />
          ) : isNew ? (
            <div className="db-pair">
              {/* Someone who came to hire sees "Post your first job" first */}
              {me?.signupIntent === 'HIRE' && postFirst}
              <Link to="/tasks" className="ui-card ui-card-pad db-start">
                <span className="db-start-ic"><i className="ti ti-search" /></span>
                <strong>Find your first job</strong>
                <span>Paid tasks you can do from your phone: testing, writing, design and more. Get paid in naira or USDC.</span>
                <em>Browse jobs <i className="ti ti-arrow-right" /></em>
              </Link>
              {me?.signupIntent !== 'HIRE' && postFirst}
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
