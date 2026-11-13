// Test page for admin-kyc-level2.test.cjs: the real Admin > Identity checks page
// (AdminKyc) with the real lib/api apiRequest. window.fetch is a fake server that
// follows kycManual.service listRequests / reviewRequest, so nothing leaves the page.
//   ?n=123   waiting Level 2 requests: @m1 (oldest) ... @m123 (newest)
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import AdminKyc from '../../src/pages/AdminKyc'

const w = window as any
const qs = new URLSearchParams(location.search)
const n = Number(qs.get('n') || 123)
const base = Date.now() - 3 * 86400e3
w.__reqs = Array.from({ length: n }, (_, i) => ({
  id: `r${i + 1}`, status: 'PENDING', idType: 'NIN', idTypeName: 'National ID (NIN slip or card)', idNumber: String(10000000000 + i),
  createdAt: new Date(base + i * 60e3).toISOString(), reviewedAt: null, reason: null,
  user: { id: `u${i + 1}`, username: `m${i + 1}`, name: `Member ${i + 1}`, joined: new Date(base).toISOString(), level: 1, levelBy: 'bank-name', country: 'NG' },
  countryWarning: null, idFrontUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
}))
w.__calls = []
const reply = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any) => reply(200, { success: true, data })

w.fetch = async (url: string, init: RequestInit = {}) => {
  const u = new URL(String(url))
  const p = u.pathname.replace(/^\/api\/v1/, '')
  const method = String(init.method || 'GET').toUpperCase()
  w.__calls.push({ path: p, method, query: Object.fromEntries(u.searchParams) })
  if (p === '/kyc/admin/pending') return ok({ records: [], total: 0, page: 1, pages: 1, counts: {} })
  if (p === '/kyc/admin/level2' && method === 'GET') {
    const q = u.searchParams
    const status = (q.get('status') || 'PENDING').toUpperCase()
    const order = q.get('order') || (status === 'PENDING' ? 'oldest' : 'newest')
    const page = Math.max(1, Number(q.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(q.get('limit')) || 50))
    let rows = w.__reqs.filter((r: any) => status === 'ALL' || r.status === status)
    rows = rows.slice().sort((a: any, b: any) => (order === 'oldest' ? 1 : -1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)))
    const slice = rows.slice((page - 1) * limit, page * limit)
    return ok({ requests: slice, total: rows.length, page, limit, hasMore: (page - 1) * limit + slice.length < rows.length })
  }
  const m = p.match(/^\/kyc\/admin\/level2\/(.+)$/)
  if (m && method === 'PATCH') {
    const r = w.__reqs.find((x: any) => x.id === m[1])
    if (!r || r.status !== 'PENDING') return reply(409, { success: false, message: 'This request was already decided' })
    const body = JSON.parse(String(init.body))
    r.status = body.action === 'approve' ? 'APPROVED' : 'REJECTED'
    return ok({ id: r.id, status: r.status })
  }
  return reply(404, { success: false, message: 'not faked: ' + p })
}

createRoot(document.getElementById('root')!).render(<MemoryRouter><AdminKyc /><i id="ready" /></MemoryRouter>)
