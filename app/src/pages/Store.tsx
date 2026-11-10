import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, API_BASE } from '../lib/api'
import { useCurrency } from '../context/CurrencyContext'
import { HomeProductCard } from '../components/home/HomeCards'
import { useAuth } from '../context/AuthContext'
import { itemCategoryLabel } from '../components/ItemCover'

// 2026-11-10: the old buy-from-the-list modal is gone (nothing opened it any
// more, and it paid without the double-tap and price checks). Cards link to
// the product page, and checkout (StorePayment) is the only way to buy.

interface StoreItem {
  id: string
  title: string
  excerpt?: string
  description?: string
  price: number
  currency: string
  seller: string
  sellerAvatar: string | null
  rating: number
  reviewsCount: number
  image: string
  category: string
  stock: number | null
  createdAt: string
}

// The last answers for each list page, kept while the app is open, so Back
// shows the list at once and refreshes it quietly (2026-11-10)
const LIST_FRESH_MS = 5 * 60 * 1000
const listCache = new Map<string, { items: StoreItem[]; total: number; at: number }>()
let knownCategories: string[] = []
function freshListFor(query: string) {
  const hit = listCache.get(query)
  return hit && Date.now() - hit.at < LIST_FRESH_MS ? hit : null
}
function rememberList(query: string, items: StoreItem[], total: number) {
  listCache.delete(query)
  listCache.set(query, { items, total, at: Date.now() })
  if (listCache.size > 30) listCache.delete(listCache.keys().next().value as string)
}

// ═══════════════════════════════════════════════
// STORE PAGE (product grid with categories)
// ═══════════════════════════════════════════════
// Sort options the API understands (GET /store?sort=): default order is newest-first.
// 2026-11-08: "Quality" was the same as Newest, "Random" was a fixed order and
// "Highest rated" counted reviews, so only sorts the server really does are offered
const STORE_SORTS: [string, string][] = [['', 'Newest'], ['price_low', 'Price: low to high'], ['price_high', 'Price: high to low'], ['rating', 'Highest rated'], ['reviews', 'Most reviewed']]
const SORT_KEYS = STORE_SORTS.map(([v]) => v)

function StorePage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth()
  const { convert } = useCurrency()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const limit = 12
  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''
  // An old link's sort (stars_desc, random, newest) falls back to the default
  const sort = SORT_KEYS.includes(searchParams.get('sort') || '') ? searchParams.get('sort') || '' : ''
  const page = Number(searchParams.get('page')) || 1

  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  params.set('page', String(page))
  params.set('limit', String(limit))
  const query = params.toString()

  // Coming Back from a product, the last answer for this page shows at once
  // (it used to show skeleton cards and load again) (2026-11-10)
  const cached = freshListFor(query)
  const [products, setProducts] = useState<StoreItem[]>(cached?.items || [])
  const [total, setTotal] = useState(cached?.total || 0)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>(knownCategories)

  const updateURL = (updates: Record<string, string | undefined>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k) })
      return next
    }, { replace: false })
  }

  const addCategories = (list: string[]) => setAllCategories(prev => {
    const next = Array.from(new Set([...prev, ...list.filter(Boolean)])).sort()
    knownCategories = next
    return next
  })

  // Each change of filter, sort or page cancels the load before it, so a slow
  // older answer can't replace the newer one (2026-11-08). With a recent answer
  // on screen the load runs quietly: no skeleton, and a failure keeps it.
  const [reloadTick, setReloadTick] = useState(0)
  const fetchProducts = () => setReloadTick((n) => n + 1)
  useEffect(() => {
    const ctl = new AbortController()
    const shown = freshListFor(query)
    if (shown) { setProducts(shown.items); setTotal(shown.total); setLoading(false) } else setLoading(true)
    setError(null)
    ;(async () => {
      try {
        // Raw fetch: apiRequest unwraps `data` and drops `pagination`, which paging needs
        const res = await fetch(`${API_BASE}/store?${query}`, { signal: ctl.signal })
        const json = await res.json().catch(() => null)
        if (ctl.signal.aborted) return
        if (!res.ok) throw new Error(json?.message || 'Failed to load products')
        const items: StoreItem[] = Array.isArray(json?.data) ? json.data : []
        const count = Number(json?.pagination?.total ?? items.length)
        rememberList(query, items, count)
        setProducts(items)
        setTotal(count)
        addCategories(items.map(p => p.category))
      } catch (e) {
        if (ctl.signal.aborted || shown) return
        setError((e as any)?.message || 'Failed to load products')
      } finally { if (!ctl.signal.aborted) setLoading(false) }
    })()
    return () => ctl.abort()
  }, [query, reloadTick])

  // Every category with a listed product, not just the ones on this page (2026-11-08)
  useEffect(() => {
    apiRequest<{ categories?: string[] }>('/store/categories', { auth: false })
      .then((d) => { if (Array.isArray(d?.categories)) addCategories(d.categories) })
      .catch(() => { /* the list still fills from the products shown */ })
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const submitSearch = (e?: React.FormEvent) => { e?.preventDefault(); updateURL({ search: searchInput.trim() || undefined, page: undefined }) }

  return (
    <div className="ui-page">
      <style>{`
        .st-filter{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr);gap:var(--sp-4);padding:var(--sp-4);margin-top:var(--sp-5)}
        .st-row{display:flex;justify-content:space-between;align-items:center;gap:var(--sp-3);margin:var(--sp-5) 0 var(--sp-4)}
        .st-row a,.st-row button.link{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:var(--text);text-decoration:none;background:none;border:0;cursor:pointer;font-family:inherit;padding:6px 2px}
        @media(max-width:860px){.st-filter{grid-template-columns:1fr 1fr}.st-filter>:first-child{grid-column:1 / -1}}
        @media(max-width:520px){.st-filter{gap:10px var(--sp-3);padding:var(--sp-3)}}
      `}</style>

      <header className="ui-head">
        <div>
          <h1 className="ui-title" style={{ marginTop: 0 }}>Products</h1>
          <p className="ui-sub">Services and digital products from OgaPay creators.</p>
        </div>
        <div className="ui-actions">
          <button className="ui-btn ui-btn-ghost" onClick={() => navigate('/workers')}>Browse creators <i className="ti ti-arrow-up-right" /></button>
          {user && <button className="ui-btn ui-btn-ghost" onClick={() => navigate('/store/orders')}>My orders <i className="ti ti-receipt" /></button>}
          <button className="ui-btn ui-btn-dark" onClick={() => navigate(user ? '/my-store' : '/login?redirect=/my-store')}>My store <i className="ti ti-user" /></button>
        </div>
      </header>

      <form className="ui-card st-filter" onSubmit={submitSearch} role="search">
        <div>
          <label className="ui-label" htmlFor="st-search">Search products</label>
          <div className="ui-search">
            <input id="st-search" className="ui-input" style={{ paddingLeft: 14 }} placeholder="Design, writing, development..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)} />
            <button type="submit" className="ui-search-btn" aria-label="Search"><i className="ti ti-search" /></button>
          </div>
        </div>
        <div>
          <label className="ui-label" htmlFor="st-cat">Category</label>
          <select id="st-cat" className="ui-select" value={category} onChange={e => updateURL({ category: e.target.value || undefined, page: undefined })}>
            <option value="">All</option>
            {/* OgaPay's own items come with codes (BADGE, SERVICE); show their names */}
            {[...new Set([...allCategories, ...(category ? [category] : [])])].sort((a, b) => itemCategoryLabel(a).localeCompare(itemCategoryLabel(b))).map(c => <option key={c} value={c}>{itemCategoryLabel(c)}</option>)}
          </select>
        </div>
        <div>
          <label className="ui-label" htmlFor="st-sort">Sort by</label>
          <select id="st-sort" className="ui-select" value={sort} onChange={e => updateURL({ sort: e.target.value || undefined, page: undefined })}>
            {STORE_SORTS.map(([v, l]) => <option key={v || 'newest'} value={v}>{l}</option>)}
          </select>
        </div>
      </form>

      <div className="st-row">
        <span className="ui-count"><b>{products.length ? (page - 1) * limit + products.length : 0}</b> of {total} products</span>
        {/* Sell here: opens the Add product form in My store (it said "Create a job") */}
        <button className="link tap" type="button" onClick={() => navigate(user ? '/my-store?new=1' : `/login?redirect=${encodeURIComponent('/my-store?new=1')}`)}>Add a product <i className="ti ti-plus" /></button>
      </div>

      {error && (
        <div className="ui-empty" style={{ marginBottom: 16 }}>
          <b style={{ color: 'var(--text)' }}>Couldn't load products</b>
          <p style={{ margin: '6px 0 14px' }}>{error}</p>
          <button className="ui-btn ui-btn-ghost" onClick={fetchProducts}>Try again</button>
        </div>
      )}

      {loading ? (
        <div className="ui-grid-3">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="ui-sk" style={{ height: 460 }} />)}</div>
      ) : !error && products.length === 0 ? (
        <div className="ui-empty">
          <i className="ti ti-building-store" style={{ fontSize: 28, display: 'block', marginBottom: 10, color: 'var(--text3)' }} />
          <b style={{ color: 'var(--text)' }}>No products found</b>
          <p style={{ margin: '6px 0 16px' }}>Try a different search or category.</p>
          <button className="ui-btn ui-btn-ghost" onClick={() => { setSearchInput(''); updateURL({ search: undefined, category: undefined, page: undefined }) }}>Clear filters</button>
        </div>
      ) : (
        <div className="ui-grid-3">
          {products.map(p => <HomeProductCard key={p.id} item={p} convert={convert} />)}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="ui-pager" aria-label="Pages">
          <button className="ui-btn ui-btn-ghost" disabled={page <= 1} onClick={() => { updateURL({ page: page - 1 > 1 ? String(page - 1) : undefined }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><i className="ti ti-arrow-left" />Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button className="ui-btn ui-btn-ghost" disabled={page >= totalPages} onClick={() => { updateURL({ page: String(page + 1) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Next<i className="ti ti-arrow-right" /></button>
        </nav>
      )}
    </div>
  )
}

export default function Store() {
  const navigate = useNavigate()
  return (
    <Layout>
      <StorePage navigate={navigate} />
    </Layout>
  )
}
