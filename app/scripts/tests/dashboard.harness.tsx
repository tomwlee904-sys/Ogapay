// Test page for dashboard.test.cjs: the real Dashboard (with the real top bar and
// menu) against a fake server (window.fetch), so nothing leaves the page.
// ?case= picks who is signed in and how the server answers.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
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

type Case = { me?: any; profile?: any; subs?: any[]; created?: any[]; jobs?: any[]; balances?: any; pref?: string; failing?: string[]; slow?: Record<string, number> }
const CASES: Record<string, Case> = {
  // Their work and jobs don't load (no connection): never the new-account screen
  fail: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: { NGN: { balance: 2000, lockedBalance: 0, available: 2000 } }, failing: ['/tasks/my/submissions', '/tasks/my/created'] },
  // Their work answers slowly: the page waits, it doesn't say "nothing"
  slow: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: { NGN: { balance: 0, lockedBalance: 0, available: 0 } }, slow: { '/tasks/my/submissions': 2500 } },
  // Only the job list fails
  jobsfail: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: {}, failing: ['/tasks'] },
  // Fails once, then works: the quiet second try fixes it with no error shown
  flaky: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: {}, failing: ['/tasks/my/submissions#once'] },
  vet: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: { NGN: { balance: 3000, lockedBalance: 0, available: 3000 }, USDC: { balance: 2, lockedBalance: 0, available: 2 }, GHS: { balance: 0, lockedBalance: 0, available: 0 } } },
  kofi: { me: KOFI, profile: KOFI_ME, subs: [], created: [], jobs: KOFI_JOBS, pref: 'GHS', balances: { NGN: { balance: 0, lockedBalance: 0, available: 0 }, GHS: { balance: 40, lockedBalance: 0, available: 40 } } },
  // Verified by NIN, no job done yet
  nin: { me: { ...KOFI, id: 'u-ada', firstName: 'Ada' }, profile: { ...KOFI_ME, kyc: { status: 'APPROVED', kycTier: 1, provider: 'nin', idType: 'NIN' } }, subs: [], created: [], jobs: KOFI_JOBS, balances: { NGN: { balance: 0, lockedBalance: 0, available: 0 } } },
  // Not verified, money only in cedis: the verify row names the cedis
  unverified: { me: { ...VET, kycStatus: null, kycTier: 0 }, profile: { ...VET_ME, kyc: null }, subs: VET_SUBS, created: [], jobs: VET_JOBS, pref: 'GHS', balances: { GHS: { balance: 25, lockedBalance: 0, available: 25 } } },
  poster: { me: { ...VET, id: 'u-boss' }, profile: VET_ME, subs: [], created: POSTER_JOBS, jobs: VET_JOBS, balances: {} },
  visitor: {},
  // A new worker (no job done) whose one job in review is "Open starter": their
  // work fails to load, so we can't tell which jobs they took
  failnew: { me: { ...KOFI, id: 'u-ada', firstName: 'Ada' }, profile: { ...KOFI_ME, kyc: { status: 'APPROVED', kycTier: 1, provider: 'nin', idType: 'NIN' } }, subs: [sub('s9', 'SUBMITTED', { id: 'easy', title: 'Open starter', reward: 300, currency: 'NGN' })], created: [], jobs: KOFI_JOBS, balances: {}, failing: ['/tasks/my/submissions'] },
  // Only the profile fails (OgaScore, first job tips)
  mefail: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: {}, failing: ['/users/me'] },
  // Only the earnings fail
  earnfail: { me: VET, profile: VET_ME, subs: VET_SUBS, created: [], jobs: VET_JOBS, balances: {}, failing: ['/users/me/earnings'] },
  // A new member who hasn't said their gender: the women-only starter can be unlocked in Settings
  nogender: { me: KOFI, profile: { ...KOFI_ME, gender: null }, subs: [], created: [], jobs: KOFI_JOBS, pref: 'GHS', balances: {} },
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

w.fetch = async (url: string, init: RequestInit = {}) => {
  const u = new URL(String(url))
  const p = u.pathname.replace(/^\/api\/v1/, '')
  const auth = new Headers(init.headers).get('Authorization')
  w.__calls.push({ path: p, query: u.search, auth })
  if (!w.__heal && (c.failing || []).includes(p)) return down()
  if ((c.failing || []).includes(p + '#once') && !failedOnce.has(p)) { failedOnce.add(p); return down() }
  const delay = c.slow?.[p] || 0
  if (p === '/users/me') return ok(c.profile, delay)
  if (p === '/users/me/earnings') return ok({ earned: { NGN: 5000 } }, delay)
  if (p === '/tasks/my/submissions') return ok({ submissions: c.subs || [] }, delay)
  if (p === '/tasks/my/created') return ok(c.created || [], delay)
  if (p === '/tasks') return ok(c.jobs || [], delay)
  if (p === '/wallet/banks') return ok([])
  if (p === '/scores/me') return ok({ rank: { canClaim: false } })
  if (p === '/warnings/me') return ok({ warnings: [], suspended: false })
  return ok({})
}

function Where() {
  const loc = useLocation()
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
