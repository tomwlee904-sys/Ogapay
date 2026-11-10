// Test page for profile-public.test.cjs: the real public profile page
// (UserProfile.tsx) with lib/api, lib/img and lib/money real, against a fake
// server in window.fetch. Each answer can be held back (window.__release) or
// made to fail (window.__failNext), so the test sees the loading and error
// looks. Nothing leaves the page.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import UserProfile from 'profile-under-test'

const w = window as any
const reply = (status: number, body: any) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const ok = (data: any) => reply(200, { success: true, data })

const OURS = 'https://ourproj.supabase.co/storage/v1/object/public/task-proofs/portfolio/u1/1-'
const PROFILE = {
  id: 'u1', username: 'ada', firstName: 'Ada', lastName: 'O.', isPublic: true, createdAt: '2026-01-05T09:00:00Z',
  // A picture on someone's own server: must not be loaded
  avatarUrl: 'https://tracker.example.com/me.png',
  preferences: { showEarnings: true },
  workerProfile: { tasksCompleted: 23, totalRatings: 23, avgRating: 4.5, earned: [{ currency: 'NGN', amount: 5000 }, { currency: 'USDC', amount: 12.5 }] },
  // No products, two portfolio items: the page opens on Portfolio
  _count: { storeItems: 0, portfolioItems: 2, communityMemberships: 0, complimentsReceived: 0 },
}
const review = (page: number, i: number) => ({
  id: `job-${page}-${i}`, kind: 'job', rating: 5, date: '2026-10-01T09:00:00Z', subject: { title: `Job ${page}-${i}` },
  text: i === 1 ? null : `Review ${page}-${i}`,
  reviewer: i === 2 ? { username: null, name: 'Closed account', avatarUrl: null } : { username: `poster${i}`, name: `Poster ${i}`, avatarUrl: null },
})
const reviewPage = (page: number) => ({
  average: 4.5, total: 23, last7Days: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 3, 5: 20 },
  jobs: { average: 4.5, total: 23 }, products: { average: 0, total: 0 },
  reviews: Array.from({ length: page === 3 ? 3 : 10 }, (_, i) => review(page, i)), page, totalPages: 3,
})
const PORTFOLIO = [
  // Added with "Upload file" before the fix: the picture is the url, no imageUrl
  { id: 'p1', title: 'Logo work', description: null, url: OURS + 'logo.png', imageUrl: null, mediaType: 'image', position: 0 },
  // From another website: a picture and a video that must not load
  { id: 'p2', title: 'Outside clip', description: null, url: 'https://tracker.example.com/clip.mp4', imageUrl: 'https://tracker.example.com/pic.png', mediaType: 'video', position: 1 },
]

w.__calls = []
const held: Record<string, () => void> = {}
w.__hold = new Set<string>((new URLSearchParams(location.search).get('hold') || '').split(',').filter(Boolean))
w.__release = (k: string) => { w.__hold.delete(k); held[k]?.() }
w.__failNext = new Set<string>((new URLSearchParams(location.search).get('fail') || '').split(',').filter(Boolean))

w.fetch = async (url: string) => {
  const u = new URL(String(url))
  const p = u.pathname.replace(/^\/api\/v1/, '')
  w.__calls.push(p + u.search)
  const key = p.startsWith('/users/public/ada/') ? p.split('/')[4] : p === '/users/ada' ? 'profile' : p
  if (w.__hold.has(key)) await new Promise<void>((r) => { held[key] = r })
  // A failed load: once (or for one review page, "reviews:3")
  const page = Number(u.searchParams.get('page') || 0)
  for (const f of [key, `${key}:${page}`]) if (w.__failNext.has(f)) { w.__failNext.delete(f); return reply(500, { success: false, message: 'Server error' }) }
  if (key === 'profile') return ok(PROFILE)
  if (key === 'reviews') return ok(reviewPage(page || 1))
  if (key === 'products') return ok([])
  if (key === 'portfolio') return ok(PORTFOLIO)
  if (key === 'blogs') return ok([{ id: 'b1', slug: 'my-first-post', title: 'My first post', excerpt: 'Hello', publishedAt: '2026-10-01T09:00:00Z' }])
  if (key === 'communities') return ok([])
  return reply(404, { success: false, message: 'not stubbed: ' + p })
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/user/ada']}>
    <Routes><Route path="/user/:username" element={<UserProfile />} /></Routes>
  </MemoryRouter>,
)
