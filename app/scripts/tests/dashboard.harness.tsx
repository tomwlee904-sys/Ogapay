// Test page for dashboard.test.cjs: the real Dashboard (with the real top bar and
// menu) against a fake server (window.fetch), so nothing leaves the page.
// ?case= picks who is signed in and how the server answers.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import Dashboard from 'dashboard-under-test'
// @ts-ignore resolved by esbuild alias
import Navbar from 'navbar-under-test'
// @ts-ignore resolved by esbuild alias
import Drawer from 'drawer-under-test'

const w = window as any
const reply = (status: number, body: any, delay = 0) => new Promise<Response>((r) => setTimeout(() => r(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })), delay))
const ok = (data: any, delay = 0) => reply(200, { success: true, data }, delay)
const down = () => Promise.reject(new TypeError('Failed to fetch'))

const job = (id: string, extra: any = {}) => ({
  id, title: `Job ${id}`, reward: 500, currency: 'NGN', category: 'SOCIAL_MEDIA', posterId: 'u-team', status: 'OPEN',
  maxWorkers: 10, currentWorkers: 0, expiresAt: null, deadline: null, featured: false, eligible: true, ...extra,
})
const sub = (id: string, status: string, task: any) => ({ id, status, taskId: task.id, submittedAt: status === 'PENDING' ? null : '2026-11-09T10:00:00Z', autoApproveAt: null, task })

// A busy worker: 40 jobs done, work in progress
const VET = { id: 'u-vet', username: 'vet', firstName: 'Tunde', lastName: 'Ade', avatar: 'a.png', isEmailVerified: true, kycStatus: 'APPROVED', kycTier: 1, role: 'WORKER' }
const VET_ME = { ogaScore: 61, signupIntent: 'EARN', workerProfile: { tasksCompleted: 40, level: 'INTERMEDIATE' }, kyc: { status: 'APPROVED', kycTier: 1, provider: 'nin', idType: 'NIN' } }
const VET_SUBS = [sub('s1', 'PENDING', { id: 't-w1', title: 'Write a review', reward: 800, currency: 'NGN', category: 'WRITING' }), sub('s2', 'SUBMITTED', { id: 't-w2', title: 'Logo idea', reward: 1200, currency: 'NGN', category: 'WRITING' })]
// A new man in Ghana, Level 1 by the bank check only
const KOFI = { id: 'u-kofi', username: 'kofi', firstName: 'Kofi', lastName: 'Mensah', avatar: null, isEmailVerified: true, kycStatus: 'APPROVED', kycTier: 1, role: 'WORKER' }
const KOFI_ME = { ogaScore: 10, gender: 'M', signupIntent: 'EARN', workerProfile: { tasksCompleted: 0, level: 'BEGINNER' }, kyc: { status: 'APPROVED', kycTier: 1, provider: 'bank-name', idType: 'BANK' } }
const KOFI_JOBS = [
  job('ng', { title: 'Nigeria only starter', featured: true, reward: 1500, eligible: false, whyNot: ['COUNTRY'] }),
  job('women', { title: 'Women only starter', featured: true, reward: 1400, eligible: false, whyNot: ['GENDER'] }),
  job('kyc2', { title: 'Level 2 starter', featured: true, reward: 900, workerRequirement: 'KYC2', eligible: false, whyNot: ['KYC2'] }),
  job('later', { title: 'After one job starter', featured: true, reward: 800, minJobsDone: 1, eligible: false, whyNot: ['JOBS'] }),
  job('easy', { title: 'Open starter', featured: true, reward: 300 }),
  // Fixed in Settings: connect X or a wallet (shown, tagged "Set up")
  job('xjob', { title: 'Connect X starter', featured: true, reward: 2000, eligible: false, whyNot: ['X'] }),
  job('wjob', { title: 'Wallet starter', featured: true, reward: 700, eligible: false, whyNot: ['WALLET'] }),
  // Not a quick fix: a blue tick, a higher OgaScore, more followers (hidden)
  job('blue', { title: 'Blue tick starter', featured: true, reward: 600, eligible: false, whyNot: ['X_BLUE'] }),
  job('score', { title: 'High score starter', featured: true, reward: 600, eligible: false, whyNot: ['OGASCORE'] }),
  job('aud', { title: 'Big audience starter', featured: true, reward: 600, eligible: false, whyNot: ['AUDIENCE'] }),
  job('rank', { title: 'Rank 3 job', reward: 9000, eligible: false, whyNot: ['RANK'] }),
  job('plain', { title: 'Plain job', reward: 400 }),
]
// The worker's "Jobs for you": writing first (the kind they do), then the best paid
const VET_JOBS = [
  job('n1', { title: 'Newest social job', reward: 300, category: 'SOCIAL_MEDIA' }),
  job('n2', { title: 'Big rank job', reward: 20000, category: 'WRITING', eligible: false, whyNot: ['RANK'] }),
  job('n3', { title: 'Women only job', reward: 7000, category: 'SOCIAL_MEDIA', eligible: false, whyNot: ['GENDER'] }),
  job('n4', { title: 'Small writing job', reward: 200, category: 'WRITING' }),
  job('n5', { title: 'Big writing job', reward: 2500, category: 'WRITING' }),
  job('n6', { title: 'Full job', reward: 9000, category: 'WRITING', maxWorkers: 2, currentWorkers: 2 }),
  job('n7', { title: 'Mid social job', reward: 1000, category: 'SOCIAL_MEDIA' }),
  job('n8', { title: 'Cheap social job', reward: 100, category: 'SOCIAL_MEDIA' }),
  job('t-w1', { title: 'Write a review', reward: 800, category: 'WRITING' }),
]
const POSTER_JOBS = [
  { id: 'p1', title: 'Follow us on X', status: 'OPEN', maxWorkers: 50, currentWorkers: 20, reward: 100, currency: 'NGN', toReview: 3 },
  { id: 'p2', title: 'Old finished job', status: 'COMPLETED', maxWorkers: 5, currentWorkers: 5, reward: 100, currency: 'NGN', toReview: 1 },
  { id: 'p3', title: 'Quiet job', status: 'OPEN', maxWorkers: 5, currentWorkers: 1, reward: 100, currency: 'NGN', toReview: 0 },
]

type Case = { me?: any; profile?: any; subs?: any[]; created?: any[]; jobs?: any[]; starters?: any[]; balances?: any; pref?: string; failing?: string[]; slow?: Record<string, number>; failingQuery?: string
  // GET /dashboard/home extras: the job lists failed on the server, the admin queue, rank, how many jobs wait for review in all
  jobsFailed?: boolean; admin?: any; rank?: any; reviewTotal?: number; earned?: any; setup?: any }
// A Ghanaian, not verified yet, no job done
const AMA = { id: 'u-ama', username: 'ama', firstName: 'Ama', lastName: 'Owusu', avatar: null, isEmailVerified: true, kycStatus: null, kycTier: 0, role: 'WORKER', country: 'GH' }
const AMA_ME = { ogaScore: 0, gender: 'F', signupIntent: 'EARN', country: 'GH', workerProfile: { tasksCompleted: 0, level: 'BEGINNER' }, kyc: null }
const CASES: Record<string, Case> = {
  // Their work and jobs don't load (no connection): never the new-account screen
  fail: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: { NGN: { balance: 2000, lockedBalance: 0, available: 2000 } }, failing: ['/dashboard/home'] },
  // Their work answers slowly: the page waits, it doesn't say "nothing"
  slow: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: { NGN: { balance: 0, lockedBalance: 0, available: 0 } }, slow: { '/dashboard/home': 2500 } },
  // Only the job list fails
  jobsfail: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: {}, jobsFailed: true },
  // Fails once, then works: the quiet second try fixes it with no error shown
  flaky: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: {}, failing: ['/dashboard/home#once'] },
  vet: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: { NGN: { balance: 3000, lockedBalance: 0, available: 3000 }, USDC: { balance: 2, lockedBalance: 0, available: 2 }, GHS: { balance: 0, lockedBalance: 0, available: 0 } } },
  kofi: { me: KOFI, profile: KOFI_ME, subs: [], created: [], jobs: KOFI_JOBS, pref: 'GHS', balances: { NGN: { balance: 0, lockedBalance: 0, available: 0 }, GHS: { balance: 40, lockedBalance: 0, available: 40 } } },
  // Verified by NIN, no job done yet
  nin: { me: { ...KOFI, id: 'u-ada', firstName: 'Ada' }, profile: { ...KOFI_ME, kyc: { status: 'APPROVED', kycTier: 1, provider: 'nin', idType: 'NIN' } }, subs: [], created: [], jobs: KOFI_JOBS, balances: { NGN: { balance: 0, lockedBalance: 0, available: 0 } } },
  // Bank Level 1 who later passed the ID check: Level 2 but idType still 'BANK'
  bank2: { me: { ...KOFI, id: 'u-bola', firstName: 'Bola', kycTier: 2 }, profile: { ...KOFI_ME, kyc: { status: 'APPROVED', kycTier: 2, provider: 'didit', idType: 'BANK' } }, subs: [], created: [], jobs: KOFI_JOBS, balances: { NGN: { balance: 0, lockedBalance: 0, available: 0 } } },
  // Not verified, money only in cedis: the verify row names the cedis
  unverified: { me: { ...VET, kycStatus: null, kycTier: 0 }, profile: { ...VET_ME, kyc: null }, subs: VET_SUBS, created: [], jobs: VET_JOBS, pref: 'GHS', balances: { GHS: { balance: 25, lockedBalance: 0, available: 25 } } },
  poster: { me: { ...VET, id: 'u-boss' }, profile: VET_ME, subs: [], created: POSTER_JOBS, jobs: VET_JOBS, balances: {} },
  visitor: {},
  // A new worker (no job done) whose one job in review is "Open starter": their
  // work fails to load, so we can't tell which jobs they took
  failnew: { me: { ...KOFI, id: 'u-ada', firstName: 'Ada' }, profile: { ...KOFI_ME, kyc: { status: 'APPROVED', kycTier: 1, provider: 'nin', idType: 'NIN' } }, subs: [sub('s9', 'SUBMITTED', { id: 'easy', title: 'Open starter', reward: 300, currency: 'NGN' })], created: [], jobs: KOFI_JOBS, balances: {}, failing: ['/dashboard/home'] },
  // dash-8: came to hire, posts jobs, no work taken: hiring first, no worker cards
  hirer: { me: { ...KOFI, id: 'u-hire', firstName: 'Chidi', kycStatus: null, kycTier: 0 }, profile: { ...KOFI_ME, signupIntent: 'HIRE', kyc: null }, subs: [], created: POSTER_JOBS, jobs: KOFI_JOBS, balances: {} },
  // ...said "Hire" but hasn't posted, and took one job once
  hirenew: { me: { ...KOFI, id: 'u-hire2', firstName: 'Chidi' }, profile: { ...KOFI_ME, signupIntent: 'HIRE' }, subs: [sub('s7', 'APPROVED', { id: 'x1', title: 'Old job', reward: 100, currency: 'NGN' })], created: [], jobs: KOFI_JOBS, balances: {} },
  // dash-19: Ghana, not verified, no job done
  ama: { me: AMA, profile: AMA_ME, subs: [], created: [], jobs: KOFI_JOBS.filter((j) => j.id !== 'ng'), pref: 'GHS', balances: { GHS: { balance: 0, lockedBalance: 0, available: 0 } } },
  // dash-12: a new worker with one job taken, not sent yet
  firstdup: { me: { ...KOFI, id: 'u-ada', firstName: 'Ada' }, profile: { ...KOFI_ME, kyc: { status: 'APPROVED', kycTier: 1, provider: 'nin', idType: 'NIN' } }, subs: [sub('s8', 'PENDING', { id: 'easy', title: 'Open starter', reward: 300, currency: 'NGN' })], created: [], jobs: KOFI_JOBS, balances: {} },
  // dash-15: entries wait on 7 jobs (old ones included): 3 listed, "4 more jobs to review"
  bigposter: { me: { ...VET, id: 'u-big' }, profile: VET_ME, subs: [], created: [...POSTER_JOBS, { id: 'p4', title: 'Job four', status: 'OPEN', maxWorkers: 5, currentWorkers: 1, reward: 100, currency: 'NGN', toReview: 2 }], reviewTotal: 7, jobs: VET_JOBS, balances: {} },
  // dash-21: an admin, and an admin without two-factor
  admin: { me: { ...VET, id: 'u-admin', role: 'ADMIN' }, profile: { ...VET_ME, workerProfile: { tasksCompleted: 0, level: 'BEGINNER' } }, subs: [], created: [], jobs: KOFI_JOBS, balances: {}, admin: { withdrawals: 4, kyc: 2, level2: 1, storeReports: 0, flagged: 3, rankClaims: 1 } },
  admin2fa: { me: { ...VET, id: 'u-admin', role: 'ADMIN' }, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: {}, admin: { needs2FA: true } },
  // dash-13: the wallet hasn't answered yet
  nobalance: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: null },
  // A new member who hasn't said their gender: the women-only starter can be unlocked in Settings
  nogender: { me: KOFI, profile: { ...KOFI_ME, gender: null }, subs: [], created: [], jobs: KOFI_JOBS, pref: 'GHS', balances: {} },
  // dash-10: 100 newer ordinary jobs fill the main list; the starter jobs only come from ?featured=1
  busy: { me: KOFI, profile: KOFI_ME, subs: [], created: [], jobs: Array.from({ length: 100 }, (_, i) => job(`b${i}`, { title: `Busy job ${i}`, reward: 50 })), starters: KOFI_JOBS.filter((j) => j.featured), pref: 'GHS', balances: {} },
  // ?featured=1 fails: the starter jobs found in the main list still show
  starterfail: { me: KOFI, profile: KOFI_ME, subs: [], created: [], jobs: KOFI_JOBS, starters: [], pref: 'GHS', balances: {} },
  // Email not verified yet (email-verify.test.cjs): the code is typed on the dashboard
  mailcheck: { me: { ...VET, email: 'tunde@mail.ng', isEmailVerified: false }, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: {} },
  // ...and the server says wait (a code was just sent)
  mailwait: { me: { ...VET, email: 'tunde@mail.ng', isEmailVerified: false }, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: {} },
  // A wallet account with no email yet
  walletnew: { me: { ...VET, email: '', hasEmail: false, isEmailVerified: false }, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: {} },
}
const name = new URLSearchParams(location.search).get('case') || 'vet'
const c = CASES[name]
w.__me = c.me || null
w.__pref = c.pref || 'NGN'
w.__balances = c.balances ?? null
w.__calls = []
w.__heal = false
const failedOnce = new Set<string>()
try { localStorage.clear(); if (c.me) localStorage.setItem('ogapay_access_token', 'tok-' + c.me.username) } catch { /* file page */ }

// Reading the account again: verified once the code (or the old link) went through
w.__verified = false
w.__fetchMe = async () => (w.__verified ? { ...w.__me, isEmailVerified: true, ...(w.__addedEmail && { email: w.__addedEmail, hasEmail: true }) } : null)

w.fetch = async (url: string, init: RequestInit = {}) => {
  const u = new URL(String(url))
  const p = u.pathname.replace(/^\/api\/v1/, '')
  const auth = new Headers(init.headers).get('Authorization')
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : null
  w.__calls.push({ path: p, query: u.search, auth, body })
  if (p === '/auth/verify-email/code/request') {
    if (name === 'mailwait') return reply(429, { success: false, message: 'We just sent a code. Wait a minute before asking for another.', errors: [{ code: 'RETRY_AFTER', retryAfter: 42 }] })
    return ok({ message: 'We sent a 6-digit code to tunde@mail.ng. It works for 10 minutes.' })
  }
  if (p === '/auth/verify-email/code/confirm' || p === '/auth/email/add/confirm') {
    if (body?.code !== '123456') return reply(401, { success: false, message: 'That code is wrong or has expired. Check the latest email, or ask for a new code.' })
    w.__verified = true
    if (p === '/auth/email/add/confirm') w.__addedEmail = body.email
    return ok(p === '/auth/email/add/confirm' ? { email: body.email, isEmailVerified: true } : { verified: true })
  }
  if (p === '/auth/email/add/request') return ok({ message: `We sent a 6-digit code to ${body?.email}.` })
  if (!w.__heal && (c.failing || []).includes(p)) return down()
  if (c.failingQuery && u.search.includes(c.failingQuery)) return down()
  if ((c.failing || []).includes(p + '#once') && !failedOnce.has(p)) { failedOnce.add(p); return down() }
  const delay = c.slow?.[p] || 0
  if (p === '/dashboard/home') return ok(homeOf(c), delay)
  if (p === '/users/me') return ok(c.profile, delay)
  if (p === '/users/me/earnings') return ok({ earned: { NGN: 5000 } }, delay)
  if (p === '/tasks/my/submissions') return ok({ submissions: c.subs || [] }, delay)
  if (p === '/tasks/my/created') return ok(c.created || [], delay)
  // ?featured=1: the starter jobs only (dash-10)
  if (p === '/tasks' && u.searchParams.get('featured') === '1') return ok(c.starters ?? (c.jobs || []).filter((j: any) => j.featured), delay)
  if (p === '/tasks') return ok(c.jobs || [], delay)
  if (p === '/wallet/banks') return ok([])
  if (p === '/scores/me') return ok({ rank: { canClaim: false } })
  if (p === '/warnings/me') return ok({ warnings: [], suspended: false })
  return ok({})
}

// GET /dashboard/home as the server builds it from the case (backend dashboard.service.js)
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'LEGEND']
const NAMES = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Legend']
const NEED = [0, 10, 50, 200, 500]
function homeOf(c: Case) {
  const all = c.subs || []
  const created = c.created || []
  const review = created.filter((j: any) => j.toReview > 0).sort((a: any, b: any) => b.toReview - a.toReview)
  const wp = c.profile?.workerProfile || {}
  const i = Math.max(0, LEVELS.indexOf(wp.level || 'BEGINNER'))
  return {
    me: c.profile,
    setup: c.setup || { hasBank: false, hasWallet: false },
    earned: c.earned || { NGN: 5000 },
    work: { total: all.length, active: all.filter((s: any) => ['PENDING', 'SUBMITTED'].includes(s.status)).slice(0, 10), kinds: [...new Set(all.map((s: any) => s.task?.category).filter(Boolean))] },
    hiring: { total: created.length, liveTotal: created.filter((j: any) => j.status !== 'COMPLETED').length, live: created.filter((j: any) => j.status !== 'COMPLETED'), review, reviewTotal: c.reviewTotal ?? review.length },
    rank: c.rank || { level: LEVELS[i], name: NAMES[i], canClaim: false, next: i < 4 ? { level: LEVELS[i + 1], name: NAMES[i + 1], jobsLeft: Math.max(0, NEED[i + 1] - (wp.tasksCompleted || 0)), missing: [] } : null },
    jobs: c.jobsFailed && !w.__heal ? null : { pool: c.jobs || [], starters: c.starters ?? (c.jobs || []).filter((j: any) => j.featured) },
    ...(c.jobsFailed && !w.__heal && { jobsFailed: true }),
    ...(c.admin && { admin: c.admin }),
  }
}

function Where() {
  const loc = useLocation()
  // Tests leave the dashboard and come back with window.__nav
  w.__nav = useNavigate()
  return <p id="loc">{loc.pathname + loc.search}</p>
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Where />
    <Navbar onMenuToggle={() => {}} />
    <Drawer open onClose={() => {}} />
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<p id="elsewhere">elsewhere</p>} />
    </Routes>
  </MemoryRouter>,
)
