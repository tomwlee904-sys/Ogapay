// Test page for my-store-seller.test.cjs: the real My Store page (?page=mystore,
// &tab=reviews|earnings) or product page (?page=product) with the real lib/api
// apiRequest. window.fetch is a fake server that keeps every call in
// window.__calls, so nothing leaves the page.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MyStore from '../../src/pages/MyStore'
import StoreProduct from '../../src/pages/StoreProduct'

const w = window as any
w.__calls = []
w.__toasts = []
const reply = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
const ok = (data: any) => reply(200, { success: true, data })
const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

const product = {
  id: 'p1', name: 'Agent logo pack', description: 'Logos made by my agent.', price: 5000, currency: 'NGN', imageUrl: null, category: 'Graphics & Design',
  stock: null, isActive: true, status: 'Active', sales: 0, orders: 0, avgRating: 0, reviewsCount: 0, delivery: '3 days', revisions: 2, tags: [],
  priceOnRequest: false, sampleFiles: [], searchTags: '', productKind: 'PHYSICAL', createdVia: 'API', openOrders: 0,
}
const reviews = [
  { id: 'r1', userId: 'b1', username: 'tolu', avatarUrl: null, rating: 2, comment: 'File was broken', createdAt: day(1), sellerReply: null, sellerRepliedAt: null, item: { id: 'p1', name: 'Agent logo pack', deleted: false } },
  { id: 'r2', userId: 'b2', username: 'kemi', avatarUrl: null, rating: 5, comment: 'Great work', createdAt: day(2), sellerReply: 'Thank you!', sellerRepliedAt: day(1), item: { id: 'p1', name: 'Agent logo pack', deleted: false } },
]
const reviewOut = (r: any) => { const { item, ...rest } = r; return rest }

w.fetch = async (url: string, init: RequestInit = {}) => {
  const u = new URL(String(url))
  const p = u.pathname.replace(/^\/api\/v1/, '')
  const method = String(init.method || 'GET').toUpperCase()
  w.__calls.push({ path: p, method, query: u.search, body: init.body ? JSON.parse(String(init.body)) : null })
  if (p === '/store/my-visibility') return ok({ visible: true, reason: null })
  if (p === '/store/my-products') return ok({ products: [product], total: 1, sales: 0, revenue: 0, seller: { canPublish: true, needs: [] } })
  if (p === '/store/my-orders') return ok([])
  if (p === '/ai/search-tags') return ok({ tags: 'logo, flyer, poster', list: ['logo', 'flyer', 'poster'], ai: true })
  if (p === '/store/products' && method === 'POST') return reply(201, { success: true, data: { id: 'p2' } })
  if (p === '/store/my-reviews') {
    const stars = u.searchParams.get('stars')
    const list = stars === '1-2' ? reviews.filter((r) => r.rating <= 2) : reviews
    return ok({ reviews: list, summary: { total: 2, average: 3.5, last7Days: 2, stars: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 } }, pagination: { page: 1, limit: 20, total: list.length, pages: 1 } })
  }
  const rep = p.match(/^\/store\/reviews\/(\w+)\/reply$/)
  if (rep) {
    const r = reviews.find((x) => x.id === rep[1])!
    if (method === 'DELETE') { r.sellerReply = null; r.sellerRepliedAt = null }
    else { const b = JSON.parse(String(init.body)); if (!r.sellerReply) r.sellerRepliedAt = new Date().toISOString(); r.sellerReply = b.reply }
    return ok(reviewOut(r))
  }
  if (p === '/store/my-earnings') {
    const range = u.searchParams.get('range') || '30d'
    const today = new Date(Date.now() + 3600000).toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() + 3600000 - 86400000).toISOString().slice(0, 10)
    return ok({
      range, from: yesterday, to: today,
      days: [{ date: yesterday, currency: 'NGN', amount: 3000 }, { date: today, currency: 'NGN', amount: 1000 }],
      months: [{ month: today.slice(0, 7), currency: 'NGN', amount: 4000, sales: 2 }],
      totals: [{ currency: 'NGN', amount: 4000, sales: 2 }],
      sales: [
        { id: 's1', product: { id: 'p1', name: 'Agent logo pack' }, buyer: 'tolu', quantity: 1, currency: 'NGN', amount: 1000, partRefunded: false, paidAt: day(0) },
        { id: 's2', product: { id: 'p1', name: 'Agent logo pack' }, buyer: 'kemi', quantity: 1, currency: 'NGN', amount: 3000, partRefunded: true, paidAt: day(1) },
      ],
      pagination: { page: 1, limit: 20, total: 2, pages: 1 },
    })
  }
  if (p === '/store/p1') return ok({
    id: 'p1', title: 'Agent logo pack', name: 'Agent logo pack', description: 'Logos made by my agent.', price: 5000, currency: 'NGN', seller: 'ada', sellerId: 'u2',
    sellerAvatar: null, rating: 3.5, reviewsCount: 2, reviews: reviews.map(reviewOut), canReview: false, myReview: null, image: '', category: 'Graphics & Design',
    stock: null, isActive: true, priceOnRequest: false, sampleFiles: [], searchTags: '', createdVia: 'API', metadata: {}, createdAt: day(5),
    sellerInfo: { lastActiveAt: day(0), challengesWon: 0, compliments: 0, reviews: 2, newCreator: false },
  })
  return reply(404, { success: false, message: 'not stubbed: ' + p })
}

const qs = new URLSearchParams(location.search)
const start = qs.get('page') === 'product' ? '/store/p1' : `/my-store${qs.get('tab') ? `?tab=${qs.get('tab')}` : ''}`
createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={[start]}>
    <Routes>
      <Route path="/my-store" element={<MyStore />} />
      <Route path="/store/:id" element={<StoreProduct />} />
    </Routes>
  </MemoryRouter>,
)
