// Test page for vault-launch.test.cjs: the real Vault page with the real lib/api
// apiRequest. window.fetch is a fake server, so nothing leaves the page.
// window.__vault (set before the page loads, via ?mode=) is what GET /vault returns.
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import Vault from 'vault-under-test'

const w = window as any
const params = new URLSearchParams(location.search)
const mode = params.get('mode') || 'prelaunch'
const H = 3600000
const now = Date.now()
// Before launch: launch is 15 Dec 2026 11:00Z unless the test sets ?launchIn=<ms>
const launchAt = params.get('launchIn') ? new Date(now + Number(params.get('launchIn'))).toISOString() : '2026-12-15T11:00:00.000Z'

w.__vault = mode === 'prelaunch'
  ? { pool: { totalNgp: 48250.5, totalPay: 0, lastDistributionAt: null, nextDistributionAt: launchAt }, totalDistributedNgp: 0, totalDistributedPay: 0, distributionCount: 0, eligibleCount: 12, paySupply: 50000, nextDistributionAt: launchAt, nextRunAt: launchAt, launchAt, launched: false }
  : mode === 'launched'
    ? { pool: { totalNgp: 3100, totalPay: 0, lastDistributionAt: new Date(now - 2 * H).toISOString(), nextDistributionAt: new Date(now + 3 * H).toISOString() }, totalDistributedNgp: 48250, totalDistributedPay: 0, distributionCount: 1, eligibleCount: 12, paySupply: 50000, nextDistributionAt: new Date(now + 3 * H).toISOString(), nextRunAt: new Date(now + 3 * H).toISOString(), launchAt: '2026-12-15T11:00:00.000Z', launched: true }
    // An older server: no launchAt / launched
    : { pool: { totalNgp: 900 }, totalDistributedNgp: 100, distributionCount: 2, eligibleCount: 3, paySupply: 10, nextRunAt: new Date(now + 3 * H).toISOString() }
w.__vaultCalls = 0
w.__launchedAfter = Number(params.get('flipAfter') || 0) // GET /vault starts saying launched after this many calls

const reply = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any) => reply(200, { success: true, data })

w.fetch = async (url: string) => {
  const p = new URL(String(url)).pathname.replace(/^\/api\/v1/, '')
  if (p === '/vault') {
    w.__vaultCalls += 1
    if (w.__launchedAfter && w.__vaultCalls > w.__launchedAfter) return ok({ ...w.__vault, launched: true, nextRunAt: new Date(Date.now() + 12 * H).toISOString() })
    return ok(w.__vault)
  }
  if (p === '/vault/contributions') return ok([{ id: 'c1', at: new Date(now - 600000).toISOString(), amountNgp: 1500, reason: 'Job fee', ref: '#abcd1234' }])
  if (p === '/vault/trend') return ok(Array.from({ length: 30 }, (_, i) => ({ day: new Date(now - (29 - i) * 86400000).toISOString().slice(0, 10), distributedNgp: 0, revenueNgp: i > 26 ? 1500 : 0 })))
  return reply(404, { success: false, message: 'not found' })
}

createRoot(document.getElementById('root')!).render(<MemoryRouter><Vault /></MemoryRouter>)
