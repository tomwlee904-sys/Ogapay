// Test page for contest-pick.test.cjs: the real contest box from the job page
// (ContestPanel) with the real lib/api apiRequest. window.fetch is a fake server
// that follows contest.service award / awardNow, so nothing leaves the page.
//   ?places=12        how many places (all the same prize, ₦7,000)
//   &awarded=1        places already awarded early (1st to @ada, 2nd to @p2 ...)
//   &entries=14       entries waiting (sent, not rejected): @e1, @e2 ... oldest first
//   &ended=1          entries have closed (the pick); otherwise open (Award now)
//   &closed=3,7       those waiting entries (@e3, @e7) are from closed accounts
//   &sendBanned=1     the entries list says which accounts are closed (worker.isBanned);
//                     otherwise it doesn't, as the server's list doesn't yet
//   &offline=1        every request fails like fetch does offline (window.__offline)
// window.__reload() reloads the contest as the job page does.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import ContestPanel from '../../src/components/ContestPanel'
import { ToastProvider } from '../../src/components/Toast'

const w = window as any
const qs = new URLSearchParams(location.search)
const places = Number(qs.get('places') || 12)
const awarded = Number(qs.get('awarded') || 0)
const waiting = Number(qs.get('entries') || 0)
const ended = qs.get('ended') === '1'
const closed = new Set((qs.get('closed') || '').split(',').filter(Boolean).map(Number))
const sendBanned = qs.get('sendBanned') === '1'
const API = 'https://api.example.test/api/v1'
const day = 86400e3
const endsAt = new Date(Date.now() + (ended ? -day : 8 * day)).toISOString()

w.__prizes = Array(places).fill(7000)
w.__paidAt = null
// Every entry: the ones that won early (APPROVED, with a place) and the ones waiting
w.__subs = [
  ...Array.from({ length: awarded }, (_, i) => ({ id: `w${i + 1}`, status: 'APPROVED', place: i + 1, worker: { username: i === 0 ? 'ada' : `p${i + 1}` }, submittedAt: new Date(Date.now() - (200 - i) * 60e3).toISOString() })),
  ...Array.from({ length: waiting }, (_, i) => ({ id: `s${i + 1}`, status: 'SUBMITTED', place: null, proof: `https://example.test/post/${i + 1}`, worker: { username: `e${i + 1}` }, banned: closed.has(i + 1), submittedAt: new Date(Date.now() - (100 - i) * 60e3).toISOString() })),
  { id: 'r1', status: 'REJECTED', place: null, worker: { username: 'nope' }, submittedAt: new Date(Date.now() - 50 * 60e3).toISOString() },
]
w.__calls = []
w.__confirm = true
w.__refuse = '' // a refusal the fake server gives to the next pick
w.__offline = qs.get('offline') === '1'
w.confirm = (msg: string) => { w.__asked = msg; return w.__confirm }

const winners = () => w.__subs.filter((s: any) => s.place != null).sort((a: any, b: any) => a.place - b.place)
  .map((s: any) => ({ place: s.place, prize: w.__prizes[s.place - 1], username: s.worker.username }))
const info = () => ({
  prizes: w.__prizes.slice(), entryTarget: null, entries: w.__subs.filter((s: any) => ['SUBMITTED', 'APPROVED'].includes(s.status)).length,
  winnersDueAt: null, winnersPaidAt: w.__paidAt, winners: winners(), randomDraw: false, draw: null, feePercent: 10,
})
const reply = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any) => reply(200, { success: true, data })
const bad = (message: string) => reply(400, { success: false, message })

w.fetch = async (url: string, init: RequestInit = {}) => {
  const u = new URL(String(url))
  const p = u.pathname.replace(/^\/api\/v1/, '')
  const method = String(init.method || 'GET').toUpperCase()
  const body = init.body ? JSON.parse(String(init.body)) : null
  w.__calls.push({ path: p, method, body })
  if (w.__offline) throw new TypeError('Failed to fetch')
  if (p === '/tasks/t1' && method === 'GET') return ok({ contest: info() })
  // The server's list: worker.isBanned only once it sends it (&sendBanned=1)
  if (p === '/tasks/t1/submissions') {
    return ok(w.__subs.map(({ banned, ...s }: any) => ({ ...s, worker: { ...s.worker, ...(sendBanned && { isBanned: !!banned }) } })))
  }
  const early = w.__subs.filter((s: any) => s.place != null).length
  // Award one entry the next place while entries are open (contest.service awardNow)
  if (p === '/tasks/t1/winners/now' && method === 'POST') {
    if (ended) return bad('Entries have closed: pick the winners for the places left instead.')
    if (w.__paidAt) return reply(409, { success: false, message: 'The winners of this contest were already paid' })
    if (early >= places) return reply(409, { success: false, message: 'Every place has already been awarded' })
    const e = w.__subs.find((s: any) => s.id === body.submissionId)
    if (!e) return reply(404, { success: false, message: 'Entry not found in this contest' })
    if (e.place != null || e.status === 'APPROVED') return reply(409, { success: false, message: 'This entry has already won a place' })
    if (e.status !== 'SUBMITTED') return bad('Only entries that were sent and not rejected can win')
    if (e.banned) return bad("This entry's account is closed, so it can't win")
    e.status = 'APPROVED'; e.place = early + 1
    const finished = e.place >= places
    if (finished) w.__paidAt = new Date().toISOString()
    return ok({ submissionId: e.id, place: e.place, prize: w.__prizes[e.place - 1], placesLeft: places - e.place, finished })
  }
  // Rank the winners after entries close: one entry per place left, in order (contest.service award)
  if (p === '/tasks/t1/winners' && method === 'POST') {
    if (w.__refuse) { const m = w.__refuse; w.__refuse = ''; return bad(m) }
    if (!ended) return bad('Entries are open. Pick the winners after that.')
    if (w.__paidAt) return reply(409, { success: false, message: 'The winners of this contest were already paid' })
    const ids: string[] = Array.isArray(body?.winners) ? body.winners.map(String) : []
    // Entries from closed accounts can't win (contest.service award: eligible)
    const eligible = w.__subs.filter((s: any) => s.status === 'SUBMITTED' && !s.banned)
    const left = places - early
    const need = Math.min(left, eligible.length)
    if (new Set(ids).size !== ids.length) return bad('Each entry can win only one place')
    if (ids.length !== need) return bad(need === left ? `Pick ${need} winners, one for each prize` : `There are ${eligible.length} entries you haven't rejected, so pick all ${need} of them`)
    const picked = ids.map((id) => eligible.find((s: any) => s.id === id))
    if (picked.some((s) => !s)) return bad("One of the picked entries can't win (rejected, or not part of this contest)")
    picked.forEach((s: any, i: number) => { s.status = 'APPROVED'; s.place = early + i + 1 })
    w.__paidAt = new Date().toISOString()
    return ok({ winners: picked.map((s: any) => ({ submissionId: s.id, place: s.place, prize: w.__prizes[s.place - 1] })), refunded: 0 })
  }
  return reply(404, { success: false, message: 'not stubbed: ' + p })
}

const convert = (a: number, from: string, to: string) => (from === to ? a : from === 'NGN' ? a / 1500 : to === 'NGN' ? a * 1500 : a)

function App() {
  const [contest, setContest] = useState(info)
  // A reload that fails keeps the page as it was, as the job page does
  const reload = () => { fetch(`${API}/tasks/t1`).then((r) => r.json()).then((j) => setContest(j.data.contest)).catch(() => {}) }
  w.__reload = reload
  return (
    <ContestPanel jobId="t1" contest={contest} currency="NGN" endsAt={endsAt}
      canManage canRaise={false} convert={convert} onPaid={reload} />
  )
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/tasks/t1']}>
    <ToastProvider><App /></ToastProvider>
  </MemoryRouter>,
)
