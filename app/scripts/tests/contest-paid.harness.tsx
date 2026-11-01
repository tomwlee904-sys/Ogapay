// Test page for contest-paid.test.cjs: the real Manage jobs page (ManageJobs)
// with the real lib/api apiRequest. window.fetch is a fake server, so nothing
// leaves the page. The poster has two jobs:
//   c1  a contest of 5 x ₦7,000 + 7 x ₦5,000 (places added later), all 12 paid
//   j1  a normal job paying ₦500 per person, 4 approved
//   ?job=c1   opens the contest's drawer (as the links from the job page do)
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import ManageJobs from '../../src/pages/ManageJobs'
import { ToastProvider } from '../../src/components/Toast'

const w = window as any
const qs = new URLSearchParams(location.search)
w.__calls = []

const day = 86400e3
const worker = (n: number) => ({ id: `w${n}`, username: `writer${n}` })
const prizes = [...Array(5).fill(7000), ...Array(7).fill(5000)]
// The 12 winners (approved, with the place each won) and one entry that didn't place
const contestSubs = [
  ...prizes.map((_, i) => ({ id: `s${i + 1}`, status: 'APPROVED', place: i + 1, worker: worker(i + 1), submittedAt: new Date(Date.now() - 2 * day).toISOString() })),
  { id: 's13', status: 'SUBMITTED', place: null, worker: worker(13), submittedAt: new Date(Date.now() - day).toISOString() },
]
const jobSubs = [1, 2, 3, 4].map((n) => ({ id: `j${n}`, status: 'APPROVED', worker: worker(20 + n), submittedAt: new Date(Date.now() - day).toISOString() }))
const tasks = [
  { id: 'c1', title: 'Blog contest', status: 'OPEN', category: 'content', reward: '7000', currency: 'NGN', maxWorkers: 12,
    isContest: true, prizes, deadline: new Date(Date.now() + 9 * day).toISOString(), createdAt: new Date(Date.now() - 10 * day).toISOString(), submissions: contestSubs },
  { id: 'j1', title: 'Follow us on X', status: 'OPEN', category: 'social', reward: '500', currency: 'NGN', maxWorkers: 10,
    deadline: null, createdAt: new Date(Date.now() - 3 * day).toISOString(), submissions: jobSubs },
]

const reply = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any) => reply(200, { success: true, data })
w.fetch = async (url: string, init: RequestInit = {}) => {
  const u = new URL(String(url))
  const p = u.pathname.replace(/^\/api\/v1/, '')
  w.__calls.push({ path: p, method: String(init.method || 'GET').toUpperCase() })
  if (p === '/tasks/my/created') return ok(tasks)
  if (p === '/tasks/c1/submissions') return ok(contestSubs)
  if (p === '/tasks/j1/submissions') return ok(jobSubs)
  if (p === '/poster/blocked' || p === '/communities/mine/requirable' || p === '/poster/templates') return ok([])
  return reply(404, { success: false, message: 'not stubbed: ' + p })
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={[`/manage-jobs${qs.get('job') ? `?job=${qs.get('job')}` : ''}`]}>
    <ToastProvider><ManageJobs /></ToastProvider>
  </MemoryRouter>,
)
