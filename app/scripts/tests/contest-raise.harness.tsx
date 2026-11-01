// Test page for contest-raise.test.cjs: the real contest box from the job page
// (ContestPanel) with the real lib/api apiRequest. window.fetch is a fake
// server, so nothing leaves the page.
//   ?view=poster|admin|entrant  who is looking (poster by default)
//   &preset=blog|equal|usdc     blog: 5 places of ₦7,000, 1st awarded to @ada; equal: 2 of ₦5,000, none awarded;
//                               usdc: 2 places of 2.50 USDC, none awarded (use with &currency=USDC)
//   &currency=USDC              the contest's currency (NGN by default)
//   &pref=BOTH|USDC             the display currency setting (naira by default)
//   &ended=1                    entries have closed
//   &endsIn=1500                entries close this many ms after the page opens
//   &entry=1                    one entry (@bola) waiting, so Award now has something to award
//   &raise=1                    opened from Manage jobs (/tasks/t1?raise=1)
//   &fee=12                     the server says its fee is 12% (no fee: an older server, 10% is used)
// window.__reload() reloads the contest (as the job page does after an award or on focus);
// window.__search is the page's address query now (?raise=1 or '').
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import ContestPanel from '../../src/components/ContestPanel'
import { ToastProvider } from '../../src/components/Toast'

const w = window as any
const qs = new URLSearchParams(location.search)
const view = qs.get('view') || 'poster'
const preset = qs.get('preset') || 'blog'
const currency = qs.get('currency') || 'NGN'
const ended = qs.get('ended') === '1'
const feePercent = qs.get('fee') ? Number(qs.get('fee')) : null
const API = 'https://api.example.test/api/v1'
const day = 86400e3
const endsAt = new Date(Date.now() + (qs.get('endsIn') ? Number(qs.get('endsIn')) : ended ? -day : 8 * day)).toISOString()
w.__pref = qs.get('pref') || 'NGN'

// The contest on the fake server; the test changes w.__mode while it runs
w.__prizes = preset === 'equal' ? [5000, 5000] : preset === 'usdc' ? [2.5, 2.5] : [7000, 7000, 7000, 7000, 7000]
w.__winners = preset === 'blog' ? [{ place: 1, prize: 7000, username: 'ada' }] : []
w.__entries = qs.get('entry') === '1'
  ? [{ id: 's2', status: 'SUBMITTED', proof: 'https://example.test/post/2', worker: { username: 'bola' }, submittedAt: new Date(Date.now() - 3600e3).toISOString() }]
  : []
w.__mode = 'ok' // ok | broke | timeout | timeoutApplied | timeoutLate (saved w.__lateMs after the answer was lost)
w.__lateMs = 2500
w.__calls = []
w.__confirm = true
w.confirm = (msg: string) => { w.__asked = msg; return w.__confirm }

const info = () => ({
  prizes: w.__prizes.slice(), entryTarget: null, entries: 3, winnersDueAt: null, winnersPaidAt: null,
  winners: w.__winners.slice(), randomDraw: false, draw: null,
  ...(feePercent != null && { feePercent }),
})
// What the server holds for a raise: the extra plus its fee, to the kobo
const kobo = (n: number) => Math.round(n * 100) / 100
const held = (from: number[], to: number[]) => {
  const heldMore = kobo(to.reduce((s, p) => s + p, 0) - from.reduce((s, p) => s + p, 0))
  const fee = kobo((heldMore * (feePercent ?? 10)) / 100)
  return { heldMore, fee, total: kobo(heldMore + fee) }
}
const reply = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any) => reply(200, { success: true, data })
const aborted = () => Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
const naira = (n: number) => `₦${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

w.fetch = async (url: string, init: RequestInit = {}) => {
  const p = new URL(String(url)).pathname.replace(/^\/api\/v1/, '')
  const method = String(init.method || 'GET').toUpperCase()
  w.__calls.push({ path: p, method, body: init.body ? JSON.parse(String(init.body)) : null })
  if (p === '/tasks/t1' && method === 'GET') return ok({ contest: info() })
  if (p === '/tasks/t1/submissions') return ok(w.__entries.slice())
  // Award now: the entry gets the next place (as contest.service awardNow)
  if (p === '/tasks/t1/winners/now' && method === 'POST') {
    const id = JSON.parse(String(init.body)).submissionId
    const e = w.__entries.find((x: any) => x.id === id)
    if (!e) return reply(400, { success: false, message: 'That entry is no longer waiting' })
    const place = Math.max(0, ...w.__winners.map((x: any) => x.place)) + 1
    w.__winners = [...w.__winners, { place, prize: w.__prizes[place - 1], username: e.worker.username }]
    w.__entries = w.__entries.filter((x: any) => x.id !== id)
    return ok({ place })
  }
  if (p === '/tasks/t1/raise-prizes' && method === 'POST') {
    const next = JSON.parse(String(init.body)).prizes
    switch (w.__mode) {
      case 'broke': return reply(400, { success: false, message: 'Insufficient balance. Raising the prizes needs ₦53,900.00, available ₦10,000.00' })
      case 'timeout': return aborted()
      case 'timeoutApplied': w.__prizes = next; return aborted()
      case 'timeoutLate': setTimeout(() => { w.__prizes = next }, w.__lateMs); return aborted()
      default: {
        const from = w.__prizes
        // The server's refusals when the contest changed under the form (escrow.service raisePrizes)
        if (next.length < from.length) return reply(400, { success: false, message: `Give a prize for each of the ${from.length} places. Places can be added, not taken away.` })
        const changed = w.__winners.find((x: any) => next[x.place - 1] !== from[x.place - 1])
        if (changed) return reply(400, { success: false, message: `Place ${changed.place} was already awarded and paid ${naira(from[changed.place - 1])}, so its prize stays the same` })
        w.__prizes = next
        return ok({ taskId: 't1', from, to: next, ...held(from, next), notified: 3 })
      }
    }
  }
  return reply(404, { success: false, message: 'not stubbed: ' + p })
}

// ₦1,500 to the dollar, for the ≈ lines (as the stand-in display currency)
const convert = (a: number, from: string, to: string) => (from === to ? a : from === 'NGN' ? a / 1500 : to === 'NGN' ? a * 1500 : a)

function App() {
  const [contest, setContest] = useState(info)
  const reload = () => { fetch(`${API}/tasks/t1`).then((r) => r.json()).then((j) => setContest(j.data.contest)) }
  w.__reload = reload
  return (
    <ContestPanel jobId="t1" contest={contest} currency={currency} endsAt={endsAt}
      canManage={view === 'poster'} canRaise={view !== 'entrant'} raiseForPoster={view === 'admin'}
      convert={convert} onPaid={reload} />
  )
}

// The address the page is on now, so the test can see ?raise=1 dropped
function Where() {
  w.__search = useLocation().search
  return null
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={[`/tasks/t1${qs.get('raise') === '1' ? '?raise=1' : ''}`]}>
    <ToastProvider><App /><Where /></ToastProvider>
  </MemoryRouter>,
)
