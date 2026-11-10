import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE } from '../lib/api'
import { useCurrency } from '../context/CurrencyContext'
import { HomeProductCard } from '../components/home/HomeCards'
import { useAuth } from '../context/AuthContext'
import { itemCategoryLabel } from '../components/ItemCover'
import { useStoreCategories } from '../lib/storeCategories'
import { inDisplay } from '../lib/money'

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
  // The listed category it shows under ("Other" for an older unlisted one)
  categoryGroup?: string
  featured?: boolean
  stock: number | null
  createdAt: string
}

// The last answers for each list page, kept while the app is open, so Back
// shows the list at once and refreshes it quietly (2026-11-10)
const LIST_FRESH_MS = 5 * 60 * 1000
const listCache = new Map<string, { items: StoreItem[]; total: number; at: number }>()
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
// Sort options the API understands (GET /store?sort=). 2026-11-10: the default
// is Recommended (featured products, then the store team's quality score, then
// stars); Random shuffles once per visit, so paging keeps the same order.
const STORE_SORTS: [string, string][] = [['', 'Recommended'], ['newest', 'Newest'], ['price_low', 'Price: low to high'], ['price_high', 'Price: high to low'], ['rating', 'Highest rated'], ['reviews', 'Most reviewed'], ['random', 'Random']]
const SORT_KEYS = STORE_SORTS.map(([v]) => v)
// Quick filters (2026-11-10): price in naira (the API compares every
// currency at today's rate), delivery time in days, and least average stars
const PRICES: { key: string; min?: number; max?: number }[] = [{ key: 'u5k', max: 5000 }, { key: '5k-20k', min: 5000, max: 20000 }, { key: '20k-100k', min: 20000, max: 100000 }, { key: 'o100k', min: 100000 }]
const DELIVERY: [string, string][] = [['1', 'Within 1 day'], ['3', 'Within 3 days'], ['7', 'Within a week']]
const RATINGS: [string, string][] = [['4', '4+ stars'], ['3', '3+ stars']]
// Random's order for this visit (kept for the tab, so Back finds the same order)
let visitSeed = ''
function randomSeed() {
  if (visitSeed) return visitSeed
  try { visitSeed = sessionStorage.getItem('ogapay_store_seed') || '' } catch { /* private mode */ }
  if (!visitSeed) {
    visitSeed = Math.random().toString(36).slice(2, 10)
    try { sessionStorage.setItem('ogapay_store_seed', visitSeed) } catch { /* private mode */ }
  }
  return visitSeed
}

function StorePage({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth()
  const { convert, preferredCurrency } = useCurrency()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const limit = 12
  const category = searchParams.get('category') || ''
  const sub = searchParams.get('sub') || ''
  const search = searchParams.get('search') || ''
  // An old link's sort (stars_desc) falls back to the default
  const sort = SORT_KEYS.includes(searchParams.get('sort') || '') ? searchParams.get('sort') || '' : ''
  const price = PRICES.find((x) => x.key === searchParams.get('price'))
  const delivery = DELIVERY.find(([k]) => k === searchParams.get('delivery'))
  const rating = RATINGS.find(([k]) => k === searchParams.get('rating'))
  const page = Number(searchParams.get('page')) || 1
  const categories = useStoreCategories()

  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (sub) params.set('sub', sub)
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)
  if (sort === 'random') params.set('seed', randomSeed())
  if (price?.min) params.set('minPrice', String(price.min))
  if (price?.max) params.set('maxPrice', String(price.max))
  if (delivery) params.set('delivery', delivery[0])
  if (rating) params.set('rating', rating[0])
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

  const updateURL = (updates: Record<string, string | undefined>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      Object.entries(updates).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k) })
      return next
    }, { replace: false })
  }

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
      } catch (e) {
        if (ctl.signal.aborted || shown) return
        setError((e as any)?.message || 'Failed to load products')
      } finally { if (!ctl.signal.aborted) setLoading(false) }
    })()
    return () => ctl.abort()
  }, [query, reloadTick])

  // Back and Forward change the search in the address: the box follows (2026-11-10)
  useEffect(() => { setSearchInput(search) }, [search])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const submitSearch = (e?: React.FormEvent) => { e?.preventDefault(); updateURL({ search: searchInput.trim() || undefined, page: undefined }) }
  // The store's fixed categories (F1); an old link's unlisted one stays selectable
  const listed = categories.find((c) => c.name === category)
  const subs = listed?.subcategories || []
  const naira = (n: number) => inDisplay(n, 'NGN', preferredCurrency, convert, { short: true })
  const priceLabel = (x: (typeof PRICES)[number]) => (x.min && x.max ? `${naira(x.min)} – ${naira(x.max)}` : x.max ? `Under ${naira(x.max)}` : `Over ${naira(x.min || 0)}`)
  const sortLabel = STORE_SORTS.find(([v]) => v === sort)?.[1] || ''
  // What's narrowing the list, each with a × to drop it (F2)
  const active: { key: string; label: string; clear: Record<string, undefined> }[] = [
    ...(search ? [{ key: 'search', label: `Search: “${search}”`, clear: { search: undefined } }] : []),
    ...(category ? [{ key: 'category', label: itemCategoryLabel(category), clear: { category: undefined, sub: undefined } }] : []),
    ...(sub ? [{ key: 'sub', label: sub, clear: { sub: undefined } }] : []),
    ...(price ? [{ key: 'price', label: priceLabel(price), clear: { price: undefined } }] : []),
    ...(delivery ? [{ key: 'delivery', label: delivery[1], clear: { delivery: undefined } }] : []),
    ...(rating ? [{ key: 'rating', label: rating[1], clear: { rating: undefined } }] : []),
    ...(sort ? [{ key: 'sort', label: `Sort: ${sortLabel}`, clear: { sort: undefined } }] : []),
  ]
  const filtered = active.some((a) => a.key !== 'sort')
  const resetFilters = () => { setSearchInput(''); updateURL({ search: undefined, category: undefined, sub: undefined, price: undefined, delivery: undefined, rating: undefined, sort: undefined, page: undefined }) }
  const toggle = (key: string, value: string, on: boolean) => updateURL({ [key]: on ? undefined : value, page: undefined })

  return (
    <div className="ui-page">
      <style>{`
        .st-filter{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr);gap:var(--sp-4);padding:var(--sp-4);margin-top:var(--sp-5)}
        .st-filter.has-sub{grid-template-columns:minmax(0,1.4fr) repeat(3,minmax(0,1fr))}
        .st-row{display:flex;justify-content:space-between;align-items:center;gap:var(--sp-3);margin:var(--sp-5) 0 var(--sp-4)}
        .st-row a,.st-row button.link{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:var(--text);text-decoration:none;background:none;border:0;cursor:pointer;font-family:inherit;padding:6px 2px;min-height:40px}
        .st-quick{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:var(--sp-4)}
        .st-group{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
        .st-group>span{font-size:12px;font-weight:600;color:var(--text3);margin-right:2px}
        .st-quick .ui-chip,.st-active .ui-chip{height:auto;min-height:40px}
        .st-active{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:var(--sp-4)}
        .st-active .ui-chip{display:inline-flex;align-items:center;gap:6px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .st-active .ui-chip i{font-size:14px}
        .st-reset{background:none;border:0;padding:6px 4px;min-height:40px;font:600 13px var(--font);color:var(--text);text-decoration:underline;cursor:pointer}
        @media(max-width:860px){.st-filter,.st-filter.has-sub{grid-template-columns:1fr 1fr}.st-filter>:first-child{grid-column:1 / -1}}
        @media(max-width:520px){.st-filter{gap:10px var(--sp-3);padding:var(--sp-3)}.st-quick{gap:10px}}
      `}</style>

      <header className="ui-head">
        <div>
          <h1 className="ui-title" style={{ marginTop: 0 }}>Products</h1>
          <p className="ui-sub">Services, digital products and goods from OgaPay creators.</p>
        </div>
        <div className="ui-actions">
          <button className="ui-btn ui-btn-ghost" onClick={() => navigate('/store/creators')}>Browse creators <i className="ti ti-arrow-up-right" /></button>
          {user && <button className="ui-btn ui-btn-ghost" onClick={() => navigate('/store/orders')}>My orders <i className="ti ti-receipt" /></button>}
          {/* Admins and store moderators: the store queue (2026-11-10) */}
          {(user?.role === 'ADMIN' || user?.isModerator) && <button className="ui-btn ui-btn-ghost" onClick={() => navigate('/admin/store')}>Store queue <i className="ti ti-shield" /></button>}
          <button className="ui-btn ui-btn-dark" onClick={() => navigate(user ? '/my-store' : '/login?redirect=/my-store')}>My store <i className="ti ti-user" /></button>
        </div>
      </header>

      <form className={`ui-card st-filter${subs.length ? ' has-sub' : ''}`} onSubmit={submitSearch} role="search">
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
          <select id="st-cat" className="ui-select" value={category} onChange={e => updateURL({ category: e.target.value || undefined, sub: undefined, page: undefined })}>
            <option value="">All</option>
            {/* An old link's unlisted category (OgaPay's own items come with codes like BADGE) */}
            {category && !listed && <option value={category}>{itemCategoryLabel(category)}</option>}
            {categories.map(c => <option key={c.name} value={c.name}>{c.name}{c.count ? ` (${c.count})` : ''}</option>)}
          </select>
        </div>
        {subs.length > 0 && (
          <div>
            <label className="ui-label" htmlFor="st-sub">Subcategory</label>
            <select id="st-sub" className="ui-select" value={sub} onChange={e => updateURL({ sub: e.target.value || undefined, page: undefined })}>
              <option value="">All</option>
              {sub && !subs.includes(sub) && <option value={sub}>{sub}</option>}
              {subs.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="ui-label" htmlFor="st-sort">Sort by</label>
          <select id="st-sort" className="ui-select" value={sort} onChange={e => updateURL({ sort: e.target.value || undefined, page: undefined })}>
            {STORE_SORTS.map(([v, l]) => <option key={v || 'recommended'} value={v}>{l}</option>)}
          </select>
        </div>
      </form>

      <div className="st-quick" role="group" aria-label="Quick filters">
        <div className="st-group"><span>Price</span>
          {PRICES.map(x => <button key={x.key} type="button" className={`ui-chip${price?.key === x.key ? ' on' : ''}`} aria-pressed={price?.key === x.key} onClick={() => toggle('price', x.key, price?.key === x.key)}>{priceLabel(x)}</button>)}
        </div>
        <div className="st-group"><span>Delivery</span>
          {DELIVERY.map(([k, l]) => <button key={k} type="button" className={`ui-chip${delivery?.[0] === k ? ' on' : ''}`} aria-pressed={delivery?.[0] === k} onClick={() => toggle('delivery', k, delivery?.[0] === k)}>{l}</button>)}
        </div>
        <div className="st-group"><span>Rating</span>
          {RATINGS.map(([k, l]) => <button key={k} type="button" className={`ui-chip${rating?.[0] === k ? ' on' : ''}`} aria-pressed={rating?.[0] === k} onClick={() => toggle('rating', k, rating?.[0] === k)}>{l}</button>)}
        </div>
      </div>

      {active.length > 0 && (
        <div className="st-active" aria-label="Filters in use">
          {active.map(a => <button key={a.key} type="button" className="ui-chip on" aria-label={`Remove ${a.label}`} onClick={() => { if (a.key === 'search') setSearchInput(''); updateURL({ ...a.clear, page: undefined }) }}>{a.label}<i className="ti ti-x" aria-hidden="true" /></button>)}
          <button type="button" className="st-reset" onClick={resetFilters}>Reset filters</button>
        </div>
      )}

      <div className="st-row">
        <span className="ui-count"><b>{products.length ? (page - 1) * limit + products.length : 0}</b> of {total} products{filtered ? ' · Filtered' : ''}</span>
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
          <p style={{ margin: '6px 0 16px' }}>Try a different search or fewer filters.</p>
          <button className="ui-btn ui-btn-ghost" onClick={resetFilters}>Reset filters</button>
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
