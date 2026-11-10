// Test page for store-product.test.cjs. ?case=product&id=…: the real product
// page at /store/:id; ?case=share: ShareButton on its own; ?case=cards: store
// cards for window.__cards. window.fetch is a fake server (window.__products,
// window.__related), so nothing leaves the page.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
// @ts-ignore resolved by esbuild alias
import StoreProduct from 'product-under-test'
// @ts-ignore resolved by esbuild alias
import ShareButton from 'share-under-test'
// @ts-ignore resolved by esbuild alias
import { HomeProductCard } from 'cards-under-test'
// @ts-ignore resolved by esbuild alias
import { ToastProvider } from 'toast-under-test'
// @ts-ignore resolved by esbuild alias
import StoreCreators from 'creators-under-test'

const w = window as any
w.__calls = w.__calls || []
const reply = (status: number, body: any) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

w.fetch = async (url: string, init: RequestInit = {}) => {
  const u = new URL(String(url))
  const p = u.pathname.replace(/^\/api\/v1/, '')
  w.__calls.push({ path: p, method: String(init.method || 'GET').toUpperCase(), query: u.search })
  if (p === '/store/categories') return reply(200, { success: true, data: w.__categories })
  if (p === '/store/sellers') return w.__sellersDown ? reply(500, { success: false, message: 'down' }) : reply(200, { success: true, data: w.__sellers || [], pagination: {} })
  const rel = p.match(/^\/store\/([^/]+)\/related$/)
  if (rel) return w.__related?.[rel[1]] ? reply(200, { success: true, data: w.__related[rel[1]] }) : reply(404, { success: false, message: 'Product not found' })
  const one = p.match(/^\/store\/([^/]+)$/)
  if (one) return w.__products?.[one[1]] ? reply(200, { success: true, data: w.__products[one[1]] }) : reply(404, { success: false, message: 'Product not found' })
  return reply(404, { success: false, message: 'not stubbed: ' + p })
}

function Where() {
  const loc = useLocation()
  return <div id="loc">{loc.pathname + loc.search}</div>
}

const q = new URLSearchParams(location.search)
const c = q.get('case')
createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <MemoryRouter initialEntries={[c === 'product' ? `/store/${q.get('id')}` : c === 'creators' ? '/store/creators' : '/']}>
      <Where />
      {c === 'product' && <Routes><Route path="/store/:id" element={<StoreProduct />} /><Route path="*" element={<div id="elsewhere" />} /></Routes>}
      {c === 'creators' && <Routes><Route path="/store/creators" element={<StoreCreators />} /><Route path="*" element={<div id="elsewhere" />} /></Routes>}
      {c === 'share' && <ShareButton url="https://ogapay.app/store/abc" title="Logo design" text="Logo design on OgaPay Store" />}
      {c === 'cards' && <div id="cards">{(w.__cards || []).map((it: any) => <div key={it.id} data-id={it.id}><HomeProductCard item={it} convert={(a: number) => a} /></div>)}</div>}
    </MemoryRouter>
  </ToastProvider>,
)
