import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { apiRequest } from '../lib/api'
import type { Currency } from '../lib/currency'
import { displayCode, formatIn } from '../lib/money'
import { categoryLabel } from '../lib/categories'
import { rankName } from '../lib/requirements'
import { jobDeadline, deadlineLabel } from '../lib/deadline'
import { withdrawLimit } from '../lib/wallet'
import { useMoney } from '../lib/useMoney'
import InfoTip from '../components/InfoTip'
import EmailCodeBox from '../components/auth/EmailCodeBox'
import '../styles/dashboard.css'

// Dashboard, top to bottom: what needs you now (work to review, work to send),
// three numbers (balance, your level, OgaScore), then hiring (jobs you posted)
// beside earning (work you've taken, and jobs for you). Someone who only hires or
// only works gets that side alone; a new account gets two starter cards and the
// setup steps first. It used to be built for workers only, so posters saw "not
// working on anything" while their own jobs were one line at the top.
// Starter jobs (the Highlighted ones) are listed in full for anyone with fewer
// than STARTER_UNTIL finished jobs, the ones they can do right now first.
// Everything comes from one small request, GET /dashboard/home (it used to be
// about 9: the whole profile, every payment, every submission, 100 full jobs...),
// kept for a few minutes so coming back to the dashboard shows at once and
// refreshes quietly (login-24, dash-3, dash-4, dash-14).
// Hirers (they said "Hire", or they post and don't work) get the hiring side
// first and no worker cards (dash-8); admins get their queue instead of the
// setup cards (dash-21).

type Intent = 'EARN' | 'HIRE' | 'BOTH'
const INTENT_OPTS: { value: Intent; label: string; icon: string }[] = [
  { value: 'EARN', label: 'Earn money', icon: 'ti-coin' },
  { value: 'HIRE', label: 'Hire people', icon: 'ti-briefcase' },
  { value: 'BOTH', label: 'Both', icon: 'ti-arrows-exchange' },
]
type Me = { ogaScore?: number; gender?: string | null; signupIntent?: Intent | null; humanVerifiedAt?: string | null; country?: string; workerProfile?: { tasksCompleted?: number; level?: string } | null; kyc?: { status?: string; kycTier?: number; provider?: string | null; idType?: string | null } | null }
type Sub = {
  id: string; status: string; taskId: string; autoApproveAt?: string | null; submittedAt?: string | null
  task?: { id: string; title: string; reward: number | string; currency?: string; category?: string; expiresAt?: string | null; deadline?: string | null }
  isContest?: boolean; contestResult?: 'WON' | 'NOT_PLACED' | 'WAITING' | null
}
type Job = {
  id: string; title: string; reward: number | string; currency?: string; category?: string; posterId?: string; status?: string
  maxWorkers?: number; currentWorkers?: number; expiresAt?: string | null; deadline?: string | null
  submissions?: { status: string }[]
  // From /dashboard/home: entries waiting for review, without the entries
  toReview?: number
  // From /tasks?eligible=1: can you take it now, and if not, why (server codes)
  eligible?: boolean; whyNot?: string[]
  featured?: boolean; workerRequirement?: string | null; minJobsDone?: number; excludesTaskIds?: string[]
  isContest?: boolean; isSelection?: boolean; requiredCommunityId?: string | null; communityId?: string | null
}
// GET /dashboard/home (backend services/dashboard.service.js)
type AdminQueue = { withdrawals?: number; kyc?: number; level2?: number; storeReports?: number; flagged?: number; rankClaims?: number; needs2FA?: boolean }
type Home = {
  me: Me
  setup?: { hasBank?: boolean; hasWallet?: boolean }
  earned?: Record<string, number>
  work?: { total?: number; active?: Sub[]; kinds?: string[] }
  hiring?: { total?: number; liveTotal?: number; live?: Job[]; review?: Job[]; reviewTotal?: number }
  rank?: { level?: string; name?: string; canClaim?: boolean; claimPending?: boolean; next?: { level: string; name: string; jobsLeft: number; missing?: string[] } | null }
  jobs?: { pool?: Job[]; starters?: Job[] } | null
  jobsFailed?: boolean
  admin?: AdminQueue
}

// The last answer, kept while the site is open: coming back to the dashboard
// shows it at once (even on slow data) and asks again quietly when it's older
// than FRESH_MS. Only for the same account, and never older than KEEP_MS.
const FRESH_MS = 20000
const KEEP_MS = 10 * 60000
let lastHome: { userId: string; at: number; data: Home } | null = null
const keptHome = (userId?: string) => (userId && lastHome && lastHome.userId === userId && Date.now() - lastHome.at < KEEP_MS ? lastHome : null)

// The ₦1,000 first job bonus (backend wallet.service rewardSignupBonus): paid once
// someone is verified by NIN or ID AND has finished their first paid job
const FIRST_JOB_BONUS = 1000

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'LEGEND']
const STATUS: Record<string, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', COOLING_DOWN: 'Wrapping up', DRAFT: 'Draft' }
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const when = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
const toReviewOn = (j: Job) => j.toReview ?? (j.submissions || []).filter((s) => s.status === 'SUBMITTED').length
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const STARTER_UNTIL = 5
const placesLeft = (j: Job) => Math.max(0, (Number(j.maxWorkers) || 1) - (Number(j.currentWorkers) || 0))
// What stops a starter job that the person can fix themselves (verify, finish a
// job first, connect X or a wallet, say their gender): those starter jobs still
// show, tagged. Anything else (lives in another country, women-only, rank, a
// higher score or more followers...) hides the job: taking it would be refused.
const FIXABLE = new Set(['JOBS', 'KYC', 'KYC2', 'HUMAN', 'X', 'WALLET'])
// A failed load is tried once more after this long, then a Retry button shows
const RETRY_MS = 4000

export default function Dashboard() {
  const { user, refreshUser } = useAuth()
  const { balances, error: balanceError } = useWalletBalance()
  // Amounts follow the display currency; limits and "withdraw your ₦…" stay in naira
  const show = useMoney()
  const { preferredCurrency, convert } = useCurrency()
  // The kept answer for this account shows at once (dash-14)
  const [home, setHome] = useState<Home | null>(() => keptHome(user?.id)?.data || null)
  // Starter jobs are open unless the person folded them away (dash-11); the choice is remembered
  const [starterOpen, setStarterOpen] = useState(() => { try { return localStorage.getItem('ogapay-starter-open') !== '0' } catch { return true } })
  const toggleStarter = () => setStarterOpen((o) => { try { localStorage.setItem('ogapay-starter-open', o ? '0' : '1') } catch { /* private mode */ } return !o })
  // Email not verified yet: coming back to this tab (say, after opening the old
  // link in the mail app) reads the account again, so the step ticks (dash-18)
  const emailPending = !!user && !user.isEmailVerified
  useEffect(() => {
    if (!emailPending) return
    const onBack = () => { if (document.visibilityState === 'visible') refreshUser() }
    document.addEventListener('visibilitychange', onBack)
    return () => document.removeEventListener('visibilitychange', onBack)
  }, [emailPending, refreshUser])
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

  // A slow or failed load never looks like an empty account (an active worker
  // used to be shown "Find your first job"): it keeps its loading shape, is tried
  // once more on its own, then says so with a Try again button. With a kept
  // answer on screen a failed refresh changes nothing.
  const [failed, setFailed] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const userId = user?.id
  const load = useCallback(() => {
    if (!userId) return Promise.resolve(false)
    return apiRequest<Home>('/dashboard/home').then((d) => {
      if (!d?.me) throw new Error('empty')
      lastHome = { userId, at: Date.now(), data: d }
      setHome(d); setFailed(false)
      return true
    }, () => false)
  }, [userId])
  useEffect(() => {
    if (!userId) return
    const kept = keptHome(userId)
    if (kept) setHome(kept.data)
    if (kept && Date.now() - kept.at < FRESH_MS) return
    let timer: ReturnType<typeof setTimeout> | undefined
    load().then((good) => {
      if (good || keptHome(userId)) return
      timer = setTimeout(() => { load().then((again) => { if (!again && !keptHome(userId)) setFailed(true) }) }, RETRY_MS)
    })
    return () => clearTimeout(timer)
  }, [userId, load])
  const retry = () => {
    setRetrying(true)
    load().then((good) => { if (!good && !home) setFailed(true) }).finally(() => setRetrying(false))
  }


  if (!user) return <Layout><div className="ui-page"><div className="ui-sk" style={{ height: 200 }} /></div></Layout>

  const me = home?.me || null
  const earned = home?.earned ?? null
  const subs = home ? home.work?.active || [] : null
  const jobs = home && home.jobs ? home.jobs.pool || [] : null
  const starterJobs = home?.jobs?.starters || null
  const ghana = (me?.country || user.country) === 'GH'
  // Admins (with two-factor on) get their queue; the worker setup cards aren't for them
  const adminQ = home?.admin && !home.admin.needs2FA ? home.admin : null

  // Every wallet you hold money in (naira, cedis, USDC...), not naira alone: a
  // Ghanaian with GH₵40 saw GH₵0 here while the top bar said GH₵40. One currency
  // shows as itself; several are added up in the display currency at today's
  // rates, each listed underneath ("₦3,000 + GH₵40.00").
  const dCode = displayCode(preferredCurrency)
  const held = Object.entries(balances || {}).filter(([, b]) => Number(b?.available) > 0)
    .sort(([a], [b]) => (a === 'NGN' ? -1 : b === 'NGN' ? 1 : a.localeCompare(b)))
  const heldIn = held.map(([c, b]) => (c === dCode ? Number(b.available) : convert(Number(b.available), c as Currency, dCode)))
  // Cedis as the top bar writes them (GH₵40.00)
  const own = (c: string, v: number) => (c === 'GHS' ? formatIn('GHS', v) : show(v, c, { exact: true }))
  // Until the wallet answers: a placeholder, never a flash of ₦0 (dash-13)
  const balanceText = !balances ? (balanceError ? '–' : '') : held.length === 0 ? show(0)
    : held.length === 1 ? (held[0][0] === dCode ? formatIn(dCode, Number(held[0][1].available)) : show(Number(held[0][1].available), held[0][0]))
      : heldIn.every((v) => Number.isFinite(v) && v > 0) ? formatIn(dCode, heldIn.reduce((a, b) => a + b, 0))
        : held.map(([c, b]) => own(c, Number(b.available))).join(' + ')
  const balanceParts = held.length > 1 ? held.map(([c, b]) => own(c, Number(b.available))).join(' + ') : ''
  const live = home?.hiring?.live || []
  // Every job with work waiting, however old (dash-15: only the newest 100 were checked)
  const reviewJobs = home?.hiring?.review || []
  // "₦3,200 earned": each currency's total added up in the display currency
  // (naira, dollars or cedis) at today's rates, like My tasks. Until a rate is
  // known, each currency its own total, naira first: "₦3,200 + 1.50 USDC earned"
  const earnedBy = Object.entries(earned || {}).filter(([, v]) => Number(v) > 0).sort(([a], [b]) => (a === 'NGN' ? -1 : b === 'NGN' ? 1 : a.localeCompare(b)))
  const code = displayCode(preferredCurrency)
  const earnedIn = earnedBy.map(([c, v]) => (c === code ? Number(v) : convert(Number(v), c as Currency, code)))
  const earnedText = earned === null ? 'Earnings'
    : earnedIn.every((v) => Number.isFinite(v) && v > 0) ? `${formatIn(code, earnedIn.reduce((a, b) => a + b, 0))} earned`
      : `${earnedBy.map(([c, v]) => show(Number(v), c, { exact: true })).join(' + ')} earned`
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
  // Not your own jobs, and not ones you've already taken part in (the server
  // already leaves out jobs you took; this also covers a kept answer)
  const taken = new Set((subs || []).map((s) => s.taskId))
  // The job list plus the starter jobs, each once
  const starterSeen = new Set((starterJobs || []).map((j) => j.id))
  const pool = [...(starterJobs || []), ...(jobs || []).filter((j) => !starterSeen.has(j.id))]
  // A similar job you've done (linked either way) can't be taken too
  const similarTaken = (j: Job) => (j.excludesTaskIds || []).some((id) => taken.has(id)) ||
    pool.some((o) => taken.has(o.id) && (o.excludesTaskIds || []).includes(j.id))
  const jobsDone = me?.workerProfile?.tasksCompleted ?? 0
  const open = (j: Job) => j.posterId !== user.id && !taken.has(j.id) && !similarTaken(j) && placesLeft(j) > 0 && jobDeadline(j).state !== 'ended'
  // GENDER can be fixed only by someone who hasn't said theirs yet
  const fixableOnly = (j: Job) => j.eligible !== false || (!!j.whyNot?.length && j.whyNot.every((c) => FIXABLE.has(c) || (c === 'GENDER' && !me?.gender)))
  const hires = (home?.hiring?.total ?? 0) > 0
  const works = (home?.work?.total ?? 0) > 0
  // A hirer: said "Hire", or posts jobs and doesn't work. Their side comes first,
  // and the worker cards (first job, starter jobs) aren't pushed at them (dash-8)
  const hirer = me?.signupIntent === 'HIRE' || (hires && !works)
  const workerCards = !!me && !adminQ && !hirer
  const starter = workerCards && jobsDone < STARTER_UNTIL
    ? pool.filter((j) => j.featured && open(j) && fixableOnly(j))
    : []
  const starterIds = new Set(starter.map((j) => j.id))
  // "Jobs for you": only jobs you can take now, the kinds of work you've done
  // before first, then the best paid (it used to be the 4 newest, any of them)
  const doneKinds = new Set([...(home?.work?.kinds || []), ...(subs || []).map((s) => s.task?.category)].filter(Boolean))
  const payNgn = (j: Job) => { const v = (j.currency || 'NGN') === 'NGN' ? Number(j.reward || 0) : convert(Number(j.reward || 0), (j.currency || 'NGN') as Currency, 'NGN'); return Number.isFinite(v) ? v : 0 }
  const forYou = (jobs || []).filter((j) => open(j) && j.eligible !== false && !starterIds.has(j.id))
    .map((j, i) => ({ j, i, kind: doneKinds.has(j.category) ? 1 : 0, pay: payNgn(j) }))
    .sort((a, b) => b.kind - a.kind || b.pay - a.pay || a.i - b.i).slice(0, 4).map((x) => x.j)
  const rankLabel = home?.rank?.name || (me?.workerProfile?.level ? rankName(LEVELS.indexOf(me.workerProfile.level) + 1) : 'Beginner')
  // "3 more jobs to Intermediate" (dash-17); past the jobs, the first thing still missing
  const next = home?.rank?.next
  const rankNext = !next ? '' : home?.rank?.canClaim ? `${next.name} is ready to claim`
    : home?.rank?.claimPending ? `${next.name}: claim being checked`
      : next.jobsLeft > 0 ? `${plural(next.jobsLeft, 'more job', 'more jobs')} to ${next.name}`
        : next.missing?.[0] ? `${next.name}: ${next.missing[0]}` : ''
  // A rank you can claim (services/rank.service.js): shown first on the dashboard
  const rankUp = home?.rank?.canClaim && next ? { name: next.name } : null
  const kycTier = (me?.kyc?.status || user.kycStatus) === 'APPROVED' ? Number(me?.kyc?.kycTier ?? user.kycTier ?? 0) : 0
  const kycOk = kycTier >= 1
  // Verified by NIN or ID (backend wallet.service verifiedById). The bank account
  // check is Level 1 too and lets you withdraw, but the ₦1,000 first job bonus and
  // sending money need NIN or ID: bank Level 1 used to show "Your ID is verified".
  // Level 2 always counts (a bank member who later sent an ID keeps idType 'BANK')
  const byId = kycOk && (kycTier >= 2 || (me?.kyc?.provider !== 'bank-name' && me?.kyc?.idType !== 'BANK'))
  // The ₦1,000 first job bonus, in cedis for Ghana (dash-19)
  const bonusGhs = convert(FIRST_JOB_BONUS, 'NGN', 'GHS')
  const bonus = ghana && Number.isFinite(bonusGhs) ? formatIn('GHS', bonusGhs) : show(FIRST_JOB_BONUS, 'NGN')
  // In Ghana there's no NIN or bank check: the Ghana Card (Level 2) is the ID
  const idWord = ghana ? 'your Ghana Card' : 'your NIN or ID photo'
  // What stands between you and a starter job (null: you can do it now)
  const stepFor = (j: Job): { text: string; tag: string; order: number } | null => {
    const need = Number(j.minJobsDone) || 0
    // The server's reasons (eligible=1) win over our own guess from the profile
    const why = j.whyNot || []
    if (why.includes('JOBS') && need <= jobsDone) return { text: 'Opens after more approved jobs', tag: 'Later', order: 2 }
    if (why.includes('KYC2') && kycTier >= 2) return { text: 'Send a photo of your ID first (Level 2)', tag: 'Verify ID', order: 1 }
    if (why.includes('KYC') && kycOk) return { text: 'Verify your ID first (Level 1)', tag: 'Verify ID', order: 1 }
    if (why.includes('HUMAN') && me?.humanVerifiedAt) return { text: 'Get Human Verified first, it takes a minute', tag: 'Verify', order: 1 }
    if (why.includes('X')) return { text: 'Connect your X account in Settings first', tag: 'Set up', order: 1 }
    if (why.includes('WALLET')) return { text: 'Connect a Solana wallet in Settings first', tag: 'Set up', order: 1 }
    if (why.includes('GENDER') && !me?.gender) return { text: 'Say your gender in Settings, Account first', tag: 'Set up', order: 1 }
    if (need > jobsDone) return { text: need === 1 ? 'Opens after your first approved job' : `Opens after ${need} approved jobs`, tag: 'Later', order: 2 }
    if (j.workerRequirement === 'KYC2' && kycTier < 2) return { text: ghana ? 'Send your Ghana Card first (Level 2)' : 'Send a photo of your ID first (Level 2)', tag: 'Verify ID', order: 1 }
    if (j.workerRequirement === 'KYC' && !kycOk) return { text: ghana ? 'Send your Ghana Card first' : 'Verify your ID first (Level 1)', tag: 'Verify ID', order: 1 }
    if (j.workerRequirement === 'HUMAN' && !me?.humanVerifiedAt) return { text: 'Get Human Verified first, it takes a minute', tag: 'Verify', order: 1 }
    return null
  }
  const starterSorted = starter.map((j) => ({ j, step: stepFor(j) })).sort((a, b) => (a.step?.order ?? 0) - (b.step?.order ?? 0))

  // "Your first job": for someone with no approved job yet, one clear job they can
  // take right now (the best-paying starter job they qualify for), the job's pay
  // plus the ₦1,000 first job bonus, and the two steps to get it. A job they've
  // already taken comes first (finish it), then a starter job, then any simple job.
  const simple = (j: Job) => !j.isContest && !j.isSelection && !j.requiredCommunityId && !j.communityId && (j.currency || 'NGN') === 'NGN'
    && open(j) && j.eligible !== false && !stepFor(j)
  const byPay = (a: Job, b: Job) => Number(b.reward || 0) - Number(a.reward || 0)
  const firstPick = pool.filter((j) => simple(j) && j.featured).sort(byPay)[0]
    || (jobs || []).filter((j) => simple(j) && Number(j.reward || 0) <= 2000).sort(byPay)[0]
  const firstActive = [...working, ...waiting][0]
  const showFirstJob = workerCards && jobsDone === 0 && (!!firstActive || !!firstPick)
  // One taken job shows once (dash-12): in "Your first job" when it's there,
  // otherwise in "Your work" (it used to be in both and in "Needs your attention")
  const workList = showFirstJob && firstActive ? active.filter((s) => s.id !== firstActive.id) : active

  const isNew = !!home && !hires && !works
  const retryBtn = (
    <button type="button" className="db-step-btn" onClick={retry} disabled={retrying}>{retrying ? 'Trying again…' : 'Try again'}</button>
  )

  // Short, and in the member's country's words (dash-19)
  const hasPayout = !!(home?.setup?.hasBank || home?.setup?.hasWallet || user.walletAddress || user.bankAccount)
  const steps = [
    { done: !!(user.firstName && user.lastName && user.avatar), label: 'Add your name and a photo', sub: 'People trust faces they recognise.', to: '/edit-profile', cta: 'Edit profile' },
    // A code by email, typed here (the old link keeps working). A wallet account adds its email first.
    { done: !!user.isEmailVerified, label: user.hasEmail === false ? 'Add your email' : 'Verify your email', sub: user.hasEmail === false ? 'For job alerts and receipts, and to sign in without your wallet.' : "For job alerts and receipts. We'll email you a 6-digit code.", action: 'mail' as const },
    // Hirers fund their jobs; workers need somewhere to withdraw to
    hirer
      ? { done: hires || held.length > 0, label: 'Add money to post a job', sub: "It's held safely until you approve the work.", to: '/deposit', cta: 'Add money' }
      : { done: hasPayout, label: 'Add a way to get paid', sub: ghana ? 'A mobile money number or a Solana wallet.' : 'A bank account or a Solana wallet.', to: '/wallet', cta: 'Open wallet' },
    { done: kycOk, label: 'Verify your identity', sub: hirer ? `Free with ${idWord}. Unlocks withdrawals and sending money.` : `Free with ${idWord}. Unlocks withdrawals and your ${bonus} first job bonus.`, to: '/settings/verification', cta: 'Verify' },
  ]
  const doneCount = steps.filter((s) => s.done).length

  // Things waiting on you, most useful first. Your own places to finish are in
  // "Your work" (or "Your first job") below, not here too (dash-12).
  const attention: { key: string; icon: string; text: string; to: string; cta: string }[] = [
    ...reviewJobs.slice(0, 3).map((j) => ({ key: `r-${j.id}`, icon: 'ti-inbox', text: `${plural(toReviewOn(j), 'submission', 'submissions')} to review on “${j.title}”`, to: `/manage-jobs?job=${j.id}`, cta: 'Review' })),
    // (a new account sees this in the setup steps right below instead)
    ...(!kycOk && held.length > 0 && !isNew ? [{ key: 'kyc', icon: 'ti-id', text: `Verify your identity to withdraw your ${balanceText}`, to: '/settings/verification', cta: 'Verify' }] : []),
  ]
  const moreReview = (home?.hiring?.reviewTotal ?? reviewJobs.length) - 3

  // "What brings you to OgaPay?" (only when the server says it isn't answered)
  const skipKey = `ogapay-intent-skip-${user.id}`
  const skipped = intentSkipped || (() => { try { return localStorage.getItem(skipKey) === '1' } catch { return false } })()
  const answerIntent = async (value: Intent) => {
    setIntentBusy(true); setIntentError('')
    try {
      await apiRequest('/users/me', { method: 'PATCH', body: JSON.stringify({ signupIntent: value }) })
      setHome((h) => {
        const n = h ? { ...h, me: { ...h.me, signupIntent: value } } : h
        if (n && lastHome?.userId === user.id) lastHome = { ...lastHome, data: n }
        return n
      })
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
                ? <EmailCodeBox mode={user.hasEmail === false ? 'add' : 'verify'} email={user.email} look="dashboard" />
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
          <p className="db-first-pay"><b>{show(Number(firstActive.task?.reward || 0), firstActive.task?.currency || 'NGN')}</b> + <b>{bonus}</b> first job bonus</p>
        </>
      ) : firstPick && (
        <>
          <h2 id="db-first">{firstPick.title}</h2>
          <p className="db-first-pay">Earn <b>{show(Number(firstPick.reward || 0), firstPick.currency || 'NGN')}</b> + <b>{bonus}</b> first job bonus</p>
        </>
      )}
      <ol className="db-first-steps">
        <li className={byId ? 'done' : ''}>
          <i className={`ti ${byId ? 'ti-circle-check' : 'ti-circle-number-1'}`} aria-hidden="true" />
          <span>{ghana ? (byId ? 'Verified with your ID' : 'Send your Ghana Card (free)')
            : byId ? 'Verified with your NIN or ID' : kycOk ? 'Bank check done, so you can withdraw. For the bonus, also send a photo of your ID (Level 2)' : 'Verify with your NIN or a photo of your ID (free)'}</span>
          {!byId && <Link className="db-step-btn" to="/settings/verification">Verify</Link>}
        </li>
        <li>
          <i className="ti ti-circle-number-2" aria-hidden="true" />
          <span>{firstActive ? (firstActive.status === 'SUBMITTED' ? "You've sent your work. You're paid when it's approved" : 'Do the job and send your proof') : 'Take the job, do it and send your proof'}</span>
          {firstActive
            ? (firstActive.status !== 'SUBMITTED' && <Link className="db-step-btn" to={`/tasks/${firstActive.taskId}/submit`}>Send work</Link>)
            : firstPick && <Link className="db-step-btn dark" to={`/tasks/${firstPick.id}`}>Take this job</Link>}
        </li>
      </ol>
      <p className="db-first-note">{ghana
        ? `The ${bonus} is added to your wallet with your first approved job, once your Ghana Card is checked.`
        : `The ${bonus} is added to your wallet with your first approved job, once you're verified with your NIN or ID. The bank account check alone doesn't count.`}</p>
    </section>
  )

  const starterCard = starterSorted.length > 0 && (
    <section className="ui-card ui-card-pad db-starter" aria-labelledby="db-starter">
      <div className="db-sec-head">
        <h2 id="db-starter">Starter jobs <InfoTip label="What are starter jobs?" title="Starter jobs">
          <p>Quick jobs from the OgaPay team to help you learn OgaPay and earn your first {ghana ? 'cedis' : 'naira'}. Do them in any order. Each one pays once, and it leaves this list when you've taken it.</p>
          <p>Send real proof: work that just copies the brief is rejected.</p>
        </InfoTip></h2>
        <button type="button" className="db-fold" onClick={toggleStarter} aria-expanded={starterOpen} aria-controls="db-starter-list">
          {starterOpen ? 'Hide' : `Show ${starterSorted.length}`} <i className={`ti ti-chevron-${starterOpen ? 'up' : 'down'}`} aria-hidden="true" />
        </button>
      </div>
      <p className="db-starter-sub">{plural(starterSorted.length, 'quick job', 'quick jobs')} to earn your first {ghana ? 'cedis' : 'naira'}. Each pays once.</p>
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
        <div className="db-empty">{hires ? 'None of your jobs are open right now.' : "You haven't posted a job yet."} <Link to="/create">Post a job</Link></div>
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
      ) : workList.length > 0 && (
        <ul className="db-list">
          {workList.slice(0, 4).map((s) => (
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
      {home?.jobsFailed ? (
        <div className="db-empty db-load-err" role="alert"><span>Couldn't load jobs. Check your connection.</span>{retryBtn}</div>
      ) : jobs === null ? <div className="ui-sk" style={{ height: 90 }} /> : forYou.length === 0 ? (
        <div className="db-empty">No jobs you can take right now. Check back soon.</div>
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

  // Hiring first for hirers (they said "Hire", or post and don't work); someone
  // who said "Hire" sees their jobs card even before posting (dash-8)
  const showHiring = hires || me?.signupIntent === 'HIRE'
  const showEarning = works || !showHiring

  // The admin queue (dash-21): what's waiting, with a link to each admin page.
  // Read-only counts; an admin without two-factor on is told to turn it on.
  const adminRows = adminQ ? [
    { key: 'wd', n: adminQ.withdrawals || 0, text: 'withdrawals to pay', to: '/admin/withdrawals' },
    { key: 'kyc', n: (adminQ.kyc || 0) + (adminQ.level2 || 0), text: 'ID checks to review', to: '/admin/kyc' },
    { key: 'sub', n: adminQ.flagged || 0, text: 'flagged entries to review', to: '/admin/moderation' },
    { key: 'store', n: adminQ.storeReports || 0, text: 'reported store products', to: '/admin/store' },
    { key: 'rank', n: adminQ.rankClaims || 0, text: 'rank claims to check', to: '/admin/ranks' },
  ] : []
  const adminCard = adminQ ? (
    <section className="ui-card ui-card-pad db-admin" aria-labelledby="db-admin">
      <div className="db-sec-head"><h2 id="db-admin">Admin queue</h2><Link to="/admin">Admin panel</Link></div>
      <ul className="db-list">
        {adminRows.map((r) => (
          <li key={r.key}>
            <Link to={r.to}>
              <div><strong>{r.n === 0 ? `No ${r.text}` : `${r.n} ${r.text}`}</strong></div>
              <em className={r.n > 0 ? 'wait' : 'later'}>{r.n > 0 ? 'Open' : 'All clear'}</em>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ) : home?.admin?.needs2FA ? (
    <section className="ui-card ui-card-pad db-attn" aria-label="Admin tools">
      <ul><li>
        <span className="db-attn-ic"><i className="ti ti-shield-lock" /></span>
        <span className="db-attn-text">Turn on two-factor sign-in to use the admin tools and see the admin queue.</span>
        <Link className="db-step-btn" to="/settings/security">Turn on</Link>
      </li></ul>
    </section>
  ) : null

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
          {adminCard}
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

          {/* Three numbers, compact on phones so your jobs show on the first screen (dash-22) */}
          <div className="db-snap">
            <Link to="/wallet" className="db-stat"><span>Balance</span><b>{balanceText || <i className="db-sk-num" aria-label="Loading" />}</b><small>{balanceParts || 'Open wallet →'}</small></Link>
            {/* Verification is its own thing, not the worker rank beside it (dash-16) */}
            <Link to="/settings/verification" className="db-stat">
              <span>Verification</span>
              <b>{!me && !user.kycStatus ? <i className="db-sk-num" aria-label="Loading" /> : kycOk ? 'Verified' : 'Not verified'}</b>
              <small>{!kycOk ? 'Verify to withdraw and send money'
                : ghana ? `ID Level ${kycTier} · withdraw to mobile money`
                  : `ID Level ${kycTier} · withdraw up to ${show(withdrawLimit(kycTier), 'NGN', { exact: true })} a day, paid Thursdays${byId ? '' : '. To send money, send a photo of your ID (Level 2)'}`}</small>
            </Link>
            <Link to="/rank" className="db-stat">
              <span>OgaScore</span>
              <b>{me ? me.ogaScore ?? 0 : failed ? '–' : <i className="db-sk-num" aria-label="Loading" />}</b>
              <small>{me ? `${rankLabel} rank · ${rankNext || plural(jobsDone, 'job', 'jobs') + ' done'}` : 'Your rank and jobs done'}</small>
            </Link>
          </div>

          {intentCard}
          {firstJobCard}
          {starterCard}
          {isNew && !adminQ && setup}

          {failed && !home ? (
            <section className="ui-card ui-card-pad db-load-err" role="alert">
              <div><strong>We couldn't load your dashboard</strong>
              <span>Nothing is lost. Check your connection and try again.</span></div>
              {retryBtn}
            </section>
          ) : !home ? (
            // The same shape as the cards that come (no jump when they arrive, dash-13)
            <div className="db-pair db-loading" aria-busy="true">
              <div className="ui-sk" style={{ height: 220, borderRadius: 20 }} />
              <div className="ui-sk" style={{ height: 220, borderRadius: 20 }} />
            </div>
          ) : isNew ? (
            <div className="db-pair">
              {/* Someone who came to hire sees "Post your first job" first */}
              {hirer && postFirst}
              <Link to="/tasks" className="ui-card ui-card-pad db-start">
                <span className="db-start-ic"><i className="ti ti-search" /></span>
                <strong>Find your first job</strong>
                <span>Paid tasks you can do from your phone: testing, writing, design and more. Get paid in {ghana ? 'cedis' : 'naira'} or USDC.</span>
                <em>Browse jobs <i className="ti ti-arrow-right" /></em>
              </Link>
              {!hirer && postFirst}
            </div>
          ) : (
            <div className={`db-pair${showHiring && showEarning ? '' : ' single'}`}>
              {showHiring && hiring}
              {showEarning && earning}
              {showHiring && !showEarning && (
                <p className="db-aside-link">Want to earn too? <Link to="/tasks">See jobs you can do</Link></p>
              )}
            </div>
          )}

          {!isNew && !adminQ && setup}
        </div>
      </div>
    </Layout>
  )
}
