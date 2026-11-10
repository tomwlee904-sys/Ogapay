// Test page for profile-page.test.cjs: the real public profile page
// (/user/:username) against a fake server (window.fetch), so nothing leaves the
// page. ?case= picks who is signed in and which address is opened.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import UserProfile from 'profile-under-test'
// @ts-ignore resolved by esbuild alias
import { SIGN_IN_EVENT } from 'signin-lib-under-test'

const w = window as any
const reply = (status: number, body: any, delay = 0) => new Promise<Response>((r) => setTimeout(() => r(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })), delay))
const ok = (data: any, delay = 0) => reply(200, { success: true, data }, delay)
const notFound = () => reply(404, { success: false, message: 'User not found' })

const ADA = {
  id: 'u-ada', username: 'ada', firstName: 'Ada', lastName: 'Obi', avatarUrl: null, createdAt: '2025-01-05T00:00:00Z',
  coverUrl: 'https://cdn.example.test/cover.jpg', bio: 'I design logos.', isPublic: true,
  links: { website: 'https://ada.example.test/work', x: 'ada_dev', telegram: 'ada_tg', discord: 'ada.dev' }, website: 'https://ada.example.test/work',
  lastActive: 'today', contests: { entered: 4, wins: 1 }, creatorVerified: true,
  audiences: [{ platform: 'INSTAGRAM', platformName: 'Instagram', handle: 'ada_ig', followers: 12000, tier: 'Micro' }],
  x: null, xScore: null, preferences: { showEarnings: false, showRank: false },
  workerProfile: { tasksCompleted: 3, successRate: 75, avgRating: 4.5, totalRatings: 2, skills: [], categories: [] },
  _count: { storeItems: 25, blogPosts: 7, communityMemberships: 0, complimentsReceived: 2 },
}
const PLAIN = { ...ADA, id: 'u-plain', username: 'plain', firstName: 'Plain', links: null, website: null, coverUrl: null, lastActive: null, contests: { entered: 0, wins: 0 }, creatorVerified: false, audiences: [], _count: { storeItems: 0, blogPosts: 0, communityMemberships: 0, complimentsReceived: 0 } }
const product = (id: string, extra: any) => ({ id, title: `Product ${id}`, excerpt: `About ${id}`, priceOnRequest: false, price: 5000, currency: 'NGN', image: '', category: 'design', stock: null, rating: 0, reviewsCount: 0, delivery: null, revisions: null, createdAt: '2026-10-01T00:00:00Z', ...extra })
const post = (i: number) => ({ id: `b${i}`, title: `Post ${i}`, excerpt: `Excerpt ${i}`, slug: `post-${i}`, coverImage: i % 2 ? `https://cdn.example.test/c${i}.jpg` : null, publishedAt: '2026-10-01T00:00:00Z' })
const REVIEWS = { average: 4.5, total: 1, distribution: { 4: 1 }, jobs: { average: 4, total: 1 }, products: { average: 0, total: 0 },
  reviews: [{ id: 'job-1', kind: 'job', rating: 4, text: null, date: '2026-10-02T00:00:00Z', subject: { id: 't1', title: 'Logo job' }, reviewer: { username: 'bola', name: 'Bola', avatarUrl: null } }] }

const CASES: Record<string, { path: string; me?: any }> = {
  visitor: { path: '/user/ada' },
  linked: { path: '/user/ada?tab=reviews' },
  member: { path: '/user/ada', me: { id: 'u-bola', username: 'bola', role: 'WORKER' } },
  own: { path: '/user/ada', me: { id: 'u-ada', username: 'Ada', role: 'WORKER' } },
  private: { path: '/user/shy' },
  missing: { path: '/user/ghost' },
  plain: { path: '/user/plain' },
  copyfail: { path: '/user/ada' },
}
const name = new URLSearchParams(location.search).get('case') || 'visitor'
const c = CASES[name]
w.__me = c.me || null
w.__calls = []
w.__signins = []
w.__profileAnsweredAt = 0
try { localStorage.clear(); if (c.me) localStorage.setItem('ogapay_access_token', 'tok-' + c.me.username) } catch { /* file page */ }
window.addEventListener(SIGN_IN_EVENT, (e) => { w.__signins.push((e as CustomEvent).detail) })
// Copying is blocked in this case
Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t: string) => (name === 'copyfail' ? Promise.reject(new Error('blocked')) : (w.__copied = t, Promise.resolve())) } })

w.fetch = async (url: string, init: RequestInit = {}) => {
  const u = new URL(String(url))
  const p = u.pathname.replace(/^\/api\/v1/, '')
  const q = u.searchParams
  const auth = new Headers(init.headers).get('Authorization')
  w.__calls.push({ path: p, query: u.search, auth, at: performance.now() })
  // The profile answers late, so we can see the sections didn't wait for it
  if (p === '/users/ada') return ok(ADA, 300).then((r) => { w.__profileAnsweredAt = performance.now(); return r })
  if (p === '/users/plain') return ok(PLAIN)
  if (p === '/users/shy') return ok({ username: 'shy', isPublic: false })
  if (p.startsWith('/users/public/ada/')) {
    const what = p.split('/').pop()
    // 25 on sale: a full first page of 24, then 1
    if (what === 'products') return ok(q.get('page') === '2' ? [product('p25', {})]
      : [product('p1', { priceOnRequest: true, price: null }), product('p2', { stock: 0 }), ...Array.from({ length: 22 }, (_, i) => product(`p${i + 3}`, {}))])
    if (what === 'blogs') {
      const page = Number(q.get('page') || 1)
      return ok({ posts: page === 1 ? [1, 2, 3, 4, 5].map(post) : [6, 7].map(post), page, totalPages: 2, total: 7 })
    }
    if (what === 'reviews') return ok(REVIEWS)
    return ok([])
  }
  if (p.startsWith('/users/public/plain/')) return ok(p.endsWith('/blogs') ? { posts: [], page: 1, totalPages: 1, total: 0 } : p.endsWith('/reviews') ? { average: 0, total: 0, distribution: {}, reviews: [] } : [])
  if (p.endsWith('/compliment')) return ok({ complimented: false, count: 2 })
  return notFound()
}

function Where() {
  const loc = useLocation()
  return <p id="loc">{loc.pathname + loc.search}</p>
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={[c.path]}>
    <Where />
    <Routes>
      <Route path="/user/:username" element={<UserProfile />} />
      <Route path="*" element={<p id="elsewhere">elsewhere</p>} />
    </Routes>
  </MemoryRouter>,
)
