// Test page for convert-usdc.test.cjs: the real Wallet page (?page=wallet) or
// Admin page (?page=admin) with the real lib/api apiRequest. window.fetch is a
// fake server, so nothing leaves the page.
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import Wallet from 'wallet-under-test'
// @ts-ignore resolved by esbuild alias
import Admin from 'admin-under-test'

const w = window as any
const PAUSED = "Converting is paused for a few minutes because we can't get a fresh naira price. Your USDC is safe. Please try again shortly."
const RATE = 1344.28
const q = (a: number, rate = RATE) => ({ usdcAmount: a, rate, ngnAmount: Math.floor(a * rate * 100 + 1e-6) / 100, available: w.__usdc })
const reply = (status: number, body: any, delay = 0) =>
  new Promise<Response>((r) => setTimeout(() => r(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })), delay))
const ok = (data: any) => reply(200, { success: true, data })
const down = () => reply(500, { success: false, message: 'Something went wrong on our side' })

// What the fake server does; the test changes these while it runs
w.__usdc = 150 // USDC available
w.__quoteMode = 'ok' // ok | paused | slowFirst
w.__convertMode = 'ok' // ok | notEnough | rateChanged | paused | timeout
w.__balanceMode = 'ok' // ok | fail (balance and summary both fail)
w.__calls = []
w.PAUSED = PAUSED

const CONV = {
  allTime: { count: 41, usdc: 1250.5, ngn: 1679040.12 },
  last7d: { count: 6, usdc: 210.25, ngn: 282634.67 },
  last30d: { count: 9, usdc: 320, ngn: 430169.6 },
  usdcInMemberWallets: 842.123456,
  recent: [{ at: new Date(Date.now() - 180000).toISOString(), username: 'ada', usdc: 100, ngn: 134428, rate: RATE, how: 'manual' }],
}

w.fetch = async (url: string, init: RequestInit = {}) => {
  const u = new URL(String(url))
  const p = u.pathname.replace(/^\/api\/v1/, '')
  const method = String(init.method || 'GET').toUpperCase()
  w.__calls.push({ path: p, method, body: init.body })
  if (p === '/wallet/balance') return w.__balanceMode === 'fail' ? down() : ok({
    NGN: { balance: 2500, lockedBalance: 0, available: 2500 },
    USDC: { balance: w.__usdc, lockedBalance: 0, available: w.__usdc },
  })
  if (p === '/wallet/summary') return w.__balanceMode === 'fail' ? down() : ok({ NGN: { deposited: 2500, earned: 0, withdrawn: 0, withdrawing: 0 } })
  if (p === '/wallet/banks') return ok([])
  if (p === '/users/transactions/history') return ok([])
  if (p === '/wallet/convert/quote') {
    const a = Number(u.searchParams.get('amount'))
    if (w.__quoteMode === 'paused') return reply(503, { success: false, message: PAUSED })
    if (w.__quoteMode === 'slowFirst' && a === 1) return reply(200, { success: true, data: q(a) }, 1500)
    return ok(q(a))
  }
  if (p === '/wallet/convert' && method === 'POST') {
    const b = JSON.parse(String(init.body))
    switch (w.__convertMode) {
      case 'notEnough': return reply(400, { success: false, message: 'Not enough USDC available. Some may be held for a job or a withdrawal.' })
      case 'rateChanged': return reply(409, { success: false, message: "The rate changed. You'd now get ₦134,000.00. Check and confirm again.", data: q(b.amount, 1340) })
      case 'paused': return reply(503, { success: false, message: PAUSED })
      case 'timeout': return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
      default: return ok({ reference: 'OGA-CONV-TEST', usdcAmount: b.amount, ngnAmount: b.expectedNgn, rate: RATE })
    }
  }
  if (p === '/admin/conversions') return ok(CONV)
  if (p === '/admin/signup-intents') return ok({ all: { EARN: 1, HIRE: 0, BOTH: 0, NONE: 0, total: 1 }, last30Days: { EARN: 1, HIRE: 0, BOTH: 0, NONE: 0, total: 1 } })
  return reply(404, { success: false, message: 'not stubbed: ' + p })
}

const page = new URLSearchParams(location.search).get('page')
createRoot(document.getElementById('root')!).render(<MemoryRouter>{page === 'admin' ? <Admin /> : <Wallet />}</MemoryRouter>)
