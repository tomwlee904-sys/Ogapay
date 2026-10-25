import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
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

// Dashboard. Phone, top to bottom: your money (balance, level, OgaScore in one
// card), what needs you now (work to review, work to send, reviews to write),
// the next setup step, then real jobs. Desktop: the same main column with the
// money card in a side panel that stays in view. Someone who only hires or only
// works gets that side alone; a new account gets real jobs straight away (it
// used to get two promo cards and a 4-step checklist that filled the screen).
// Starter jobs (the Highlighted ones) are listed in full for anyone with fewer
// than STARTER_UNTIL finished jobs, the ones they can do right now first.
// A request that fails says so with Try again: it never shows "nothing here".

type Me = { ogaScore?: number | null; humanVerifiedAt?: string | null; workerProfile?: { tasksCompleted?: number; level?: string } | null; kyc?: { status?: string; kycTier?: number } | null }
type Sub = {
  id: string; status: string; taskId: string; autoApproveAt?: string | null; submittedAt?: string | null
  holdEndsAt?: string | null
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
type Step = { key: string; done: boolean; label: string; sub: string; to?: string; cta?: string; action?: 'mail' }

// The ₦1,000 first job bonus (backend wallet.service rewardSignupBonus): paid once
// someone is verified by NIN or ID AND has finished their first paid job
const FIRST_JOB_BONUS = 1000

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'LEGEND']
const LIVE = ['OPEN', 'IN_PROGRESS', 'COOLING_DOWN', 'DRAFT']
const STATUS: Record<string, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', COOLING_DOWN: 'Wrapping up', DRAFT: 'Draft' }
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const when = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
// "Sat 14:30": when a held place is freed
const at = (d: string) => new Date(d).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
const toReviewOn = (j: Job) => (j.submissions || []).filter((s) => s.status === 'SUBMITTED').length
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const STARTER_UNTIL = 5
const placesLeft = (j: Job) => Math.max(0, (Number(j.maxWorkers) || 1) - (Number(j.currentWorkers) || 0))

export default function Dashboard() {
  const { user } = useAuth()
  const { balances, error: balanceError, refresh: refreshBalance } = useWalletBalance()
  // Amounts follow the display currency; limits and "withdraw your ₦…" stay in naira
  const show = useMoney()
  const [me, setMe] = useState<Me | null>(null)
  // Starter jobs fold away so they don't fill the page; the choice is remembered
  const [starterOpen, setStarterOpen] = useState(() => { try { return localStorage.getItem('ogapay-starter-open') === '1' } catch { return false } })
  const toggleStarter = () => setStarterOpen((o) => { try { localStorage.setItem('ogapay-starter-open', o ? '0' : '1') } catch { /* private mode */ } return !o })
  // Setup shows only the next step until "See all steps" is tapped
  const [allSteps, setAllSteps] = useState(false)
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
  // Work you approved without stars (posters only), for "Needs your attention"
  const [toRate, setToRate] = useState(0)
  const [mail, setMail] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  // Which requests failed: their part of the page says so, with Try again
  const [failed, setFailed] = useState<{ me?: boolean; work?: boolean; jobs?: boolean }>({})

  const loadJobs = useCallback(() => {
    setFailed((f) => ({ ...f, jobs: false }))
    setJobs(null)
    apiRequest<Job[] | { tasks: Job[] }>('/tasks?limit=100')
      .then((d: any) => setJobs(Array.isArray(d) ? d : d?.tasks || []))
      .catch(() => setFailed((f) => ({ ...f, jobs: true })))
  }, [])

  const load = useCallback(() => {
    setFailed({})
    setMe(null); setEarned(null); setSubs(null); setCreated(null)
    apiRequest<Me>('/users/me').then(setMe).catch(() => { setMe({}); setFailed((f) => ({ ...f, me: true })) })
    // On a failure the link just says "Earnings", never "₦0 earned"
    apiRequest<{ totalEarned?: number; earned?: Record<string, number> }>('/users/me/earnings').then((d) => setEarned(d?.earned || { NGN: Number(d?.totalEarned || 0) })).catch(() => setEarned(null))
    apiRequest<{ submissions: Sub[] }>('/tasks/my/submissions').then((d) => setSubs(d?.submissions || [])).catch(() => setFailed((f) => ({ ...f, work: true })))
    apiRequest<Job[]>('/tasks/my/created?limit=100').then((d) => {
      const list = Array.isArray(d) ? d : []
      setCreated(list)
      if (list.length > 0) {
        apiRequest<{ items?: unknown[] }>('/tasks/my/to-rate').then((r) => setToRate(Array.isArray(r?.items) ? r.items.length : 0)).catch(() => {})
      }
    }).catch(() => setFailed((f) => ({ ...f, work: true })))
    loadJobs()
    // Saved banks (the old check read a profile field the bank form never sets)
    sharedGet<any[]>('/wallet/banks', 5000).then((d) => setHasBank(Array.isArray(d) && d.length > 0)).catch(() => {})
  }, [loadJobs])
  useEffect(() => { load() }, [load])

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
  const forYou = (jobs || []).filter((j) => j.posterId !== user.id && !taken.has(j.id) && !starterIds.has(j.id)).slice(0, 5)
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

  // Most valuable first: identity unlocks withdrawals and the bonus
  const steps: Step[] = [
    { key: 'id', done: kycOk, label: 'Verify your identity', sub: 'Free, takes a minute, and needed to withdraw. Verify with your NIN, then finish your first job to get your ₦1,000 first job bonus.', to: '/settings/verification', cta: 'Verify now' },
    { key: 'pay', done: !!(hasBank || user.walletAddress || user.bankAccount), label: 'Add a way to get paid', sub: 'A bank account or a Solana wallet for withdrawals.', to: '/wallet', cta: 'Open wallet' },
    { key: 'mail', done: !!user.isEmailVerified, label: 'Verify your email', sub: 'So you get job alerts and payment receipts.', action: 'mail' },
    { key: 'photo', done: !!(user.firstName && user.lastName && user.avatar), label: 'Add your name and a photo', sub: 'People trust those they can recognise.', to: '/edit-profile', cta: 'Edit profile' },
  ]
  const doneCount = steps.filter((s) => s.done).length
  const nextStep = steps.find((s) => !s.done)

  // Things waiting on you, most useful first
  const attention: { key: string; icon: string; text: string; to: string; cta: string }[] = [
    ...reviewJobs.slice(0, 3).map((j) => ({ key: `r-${j.id}`, icon: 'ti-inbox', text: `${plural(toReviewOn(j), 'submission', 'submissions')} to review on “${j.title}”`, to: `/manage-jobs?job=${j.id}`, cta: 'Review' })),
    ...working.slice(0, 3).map((s) => {
      const held = s.holdEndsAt && new Date(s.holdEndsAt).getTime() > Date.now() ? ` before ${at(s.holdEndsAt)}` : ''
      return { key: `w-${s.id}`, icon: 'ti-pencil', text: `Send your work for “${s.task?.title || 'your job'}”${held}`, to: `/tasks/${s.taskId}/submit`, cta: 'Open' }
    }),
    ...(toRate > 0 ? [{ key: 'rate', icon: 'ti-star', text: `${plural(toRate, 'review', 'reviews')} to write for people who worked for you`, to: '/reviews-to-write', cta: 'Rate' }] : []),
    // (a new account sees this in the setup step instead)
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

  // ── Your money: balance, level and OgaScore in one card ──
  const scoreValue = me === null ? <span className="ui-sk db-sk-num" aria-label="Loading" />
    : failed.me ? '–' : (me.ogaScore ?? 0)
  const scoreSub = me === null ? '' : failed.me ? "Couldn't load your score"
    : !me.ogaScore && jobsDone === 0 ? 'Finish a job to start your score'
      : `${rankLabel} · ${plural(jobsDone, 'job', 'jobs')} done`
  const money = (
    <section className="ui-card db-money" aria-label="Your money">
      <div className="db-bal">
        <span className="db-k">Available balance</span>
        {balances ? <b className="db-amt">{show(ngn)}</b>
          : balanceError ? (
            <span className="db-bal-err">Couldn't load your balance. <button type="button" className="db-textbtn tap" onClick={() => { refreshBalance() }}>Try again</button></span>
          ) : <span className="ui-sk db-sk-amt" aria-label="Loading" />}
        <div className="db-bal-btns">
          <Link className="ui-btn ui-btn-dark" to="/deposit"><i className="ti ti-plus" aria-hidden="true" /> Add money</Link>
          <Link className="ui-btn ui-btn-ghost" to="/wallet"><i className="ti ti-wallet" aria-hidden="true" /> Wallet</Link>
        </div>
      </div>
      <Link to={kycOk ? '/wallet' : '/settings/verification'} className="db-cell">
        <span className="db-k">Your level</span>
        <b>{kycOk ? `Level ${kycTier}` : 'Not verified'}</b>
        <small>{kycOk ? `Withdraw up to ${show(withdrawLimit(kycTier), 'NGN', { exact: true })} a day` : 'Verify to withdraw and send money'}</small>
      </Link>
      <Link to="/rank" className="db-cell">
        <span className="db-k">OgaScore</span>
        <b>{scoreValue}</b>
        {scoreSub && <small>{scoreSub}</small>}
      </Link>
    </section>
  )

  // ── Setup: the next step only, or all four ──
  const stepAction = (s: Step, primary: boolean) => {
    const cls = primary ? 'ui-btn ui-btn-dark db-step-go' : 'db-step-btn'
    if (s.action === 'mail') {
      return (
        <button type="button" className={cls} onClick={resend} disabled={mail === 'sending' || mail === 'sent'}>
          {mail === 'sending' ? 'Sending…' : mail === 'sent' ? 'Link sent. Check your inbox' : mail === 'failed' ? 'Couldn\'t send. Try again' : 'Send the link again'}
        </button>
      )
    }
    return <Link className={cls} to={s.to!}>{s.cta}</Link>
  }
  const shownSteps = allSteps ? steps : nextStep ? [nextStep] : []
  const setup = nextStep && (
    <section className="ui-card ui-card-pad db-setup" aria-labelledby="db-setup">
      <div className="db-sec-head"><h2 id="db-setup">Finish setting up</h2><span className="db-count">{doneCount} of {steps.length} done</span></div>
      <div className="db-bar" aria-hidden="true"><i style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
      <ul className={`db-steps${allSteps ? '' : ' one'}`}>
        {shownSteps.map((s) => (
          <li key={s.key} className={s.done ? 'done' : ''}>
            <span className="db-check" aria-hidden="true">{s.done ? <i className="ti ti-check" /> : null}</span>
            <div className="db-step-text">
              <strong>{s.done && <span className="db-sr">Done: </span>}{s.label}</strong>
              {!s.done && <span>{s.sub}</span>}
            </div>
            {!s.done && stepAction(s, !allSteps)}
          </li>
        ))}
      </ul>
      <button type="button" className="db-more" aria-expanded={allSteps} onClick={() => setAllSteps((v) => !v)}>
        {allSteps ? 'Show only the next step' : `See all ${steps.length} steps`} <i className={`ti ti-chevron-${allSteps ? 'up' : 'down'}`} aria-hidden="true" />
      </button>
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

  // Real jobs: title, category and places left, pay on the right
  const jobsList = failed.jobs ? (
    <div className="db-empty">We couldn't load jobs. <button type="button" className="db-textbtn tap" onClick={loadJobs}>Try again</button></div>
  ) : jobs === null ? <div className="ui-sk" style={{ height: 150 }} /> : forYou.length === 0 ? (
    <div className="db-empty">No open jobs right now. Check back soon.</div>
  ) : (
    <ul className="db-list db-jobs">
      {forYou.map((j) => (
        <li key={j.id}>
          <Link to={`/tasks/${j.id}`}>
            <div>
              <strong>{j.title}</strong>
              <span>{categoryLabel(j.category)} · {plural(placesLeft(j), 'place', 'places')} left</span>
            </div>
            <b>{show(Number(j.reward || 0), j.currency || 'NGN')}</b>
          </Link>
        </li>
      ))}
    </ul>
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
        <Link to="/earnings" className="tap">{earnedText}</Link>
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
                  <span>{s.status === 'PENDING' ? (s.isContest ? 'Send your entry before the contest ends' : 'Send your work when it\'s done') : s.isContest ? 'Entry sent · winners are picked after it ends' : s.autoApproveAt ? `In review · paid automatically ${when(s.autoApproveAt)} if not reviewed` : 'Waiting for review'}</span>
                </div>
                <em className={s.status === 'PENDING' ? 'todo' : 'wait'}>{s.status === 'PENDING' ? 'To do' : s.isContest ? 'Entered' : 'In review'}</em>
                <b>{s.isContest ? 'Up to ' : ''}{show(Number(s.task?.reward || 0), s.task?.currency || 'NGN')}</b>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="db-sub-head"><h3>Jobs for you</h3><Link to="/tasks" className="tap">See all jobs</Link></div>
      {jobsList}
    </section>
  )

  // New accounts: real jobs first, hiring as one line underneath
  const newWork = (
    <>
      <section className="ui-card ui-card-pad" aria-labelledby="db-forYou">
        <div className="db-sec-head"><h2 id="db-forYou">Jobs for you</h2><Link to="/tasks" className="tap">See all jobs</Link></div>
        {jobsList}
      </section>
      <p className="db-aside-link">Need work done? <Link to="/create">Post your first job</Link>. Your money is held safely until you approve the work.</p>
    </>
  )

  return (
    <Layout sidebar={false}>
      <div className="ui-page db-page">
        <div className="ui-head db-head">
          <h1 className="ui-title">{greeting()}, {user.firstName || user.username || 'there'}</h1>
          <div className="ui-actions">
            {user.role === 'ADMIN' && <Link className="ui-btn ui-btn-ghost" to="/admin"><i className="ti ti-shield-cog" aria-hidden="true" /> Admin panel</Link>}
            {/* Phone and tablet have Jobs and Create in the bottom bar */}
            <Link className="ui-btn ui-btn-dark db-desk" to="/tasks"><i className="ti ti-search" aria-hidden="true" /> Find work</Link>
            <Link className="ui-btn ui-btn-ghost db-desk" to="/create"><i className="ti ti-plus" aria-hidden="true" /> Post a job</Link>
          </div>
        </div>

        <div className="ui-split db-split">
          <aside className="ui-split-side ui-split-side-first db-side" aria-label="Your money">
            {money}
          </aside>

          <div className="db-main">
            {rankUp && (
              <section className="ui-card ui-card-pad db-rankup" aria-label="New rank available">
                <span className="db-attn-ic"><i className="ti ti-trophy" aria-hidden="true" /></span>
                <div><b>You qualify for {rankUp.name}</b><span>Claim your new rank to unlock more jobs and better-paying ones.</span></div>
                <Link className="ui-btn ui-btn-dark" to="/rank">Claim it</Link>
              </section>
            )}
            {attention.length > 0 && (
              <section className="ui-card ui-card-pad db-attn" aria-labelledby="db-attn">
                <div className="db-sec-head"><h2 id="db-attn">Needs your attention</h2>{moreReview > 0 && <Link to="/manage-jobs" className="tap">{plural(moreReview, 'more job', 'more jobs')} to review</Link>}</div>
                <ul>
                  {attention.map((a) => (
                    <li key={a.key}>
                      <span className="db-attn-ic"><i className={`ti ${a.icon}`} aria-hidden="true" /></span>
                      <span className="db-attn-text">{a.text}</span>
                      <Link className="db-step-btn" to={a.to}>{a.cta}</Link>
                    </li>
                  ))}
                </ul>
                {reviewJobs.length > 0 && <p className="db-attn-note">Work you don't review is approved and paid automatically after a few days.</p>}
              </section>
            )}
            {firstJobCard}

            {starterCard}
            {isNew && setup}

            {failed.work ? (
              <LoadError what="your jobs and work" onRetry={load} />
            ) : !loaded ? (
              <div className="ui-sk" style={{ height: 200 }} />
            ) : isNew ? newWork : (
              <div className={`db-pair${hires && works ? '' : ' single'}`}>
                {hires && hiring}
                {(works || !hires) && earning}
                {hires && !works && (
                  <p className="db-aside-link">Want to earn too? <Link to="/tasks">See jobs you can do</Link></p>
                )}
              </div>
            )}

            {!isNew && (loaded || failed.work) && setup}
          </div>
        </div>
      </div>
    </Layout>
  )
}
