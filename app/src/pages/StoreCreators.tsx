import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import '../styles/profile-public.css'
import '../styles/workers.css'
import { PremiumMark } from '../components/Perks'
import { itemCategoryLabel } from '../components/ItemCover'
import { sized } from '../lib/img'

// The store's creator directory (F5, 2026-11-10): "Browse creators" on the store
// used to open the job-worker list, where nobody's products showed. This lists
// people with a product on sale (GET /store/sellers), with their products,
// sales and reviews, and links to their store on their profile.
// Reuses the Find workers look (workers.css).

type Seller = {
  username: string; name?: string; avatarUrl?: string | null; bio: string; verified: 'id' | 'basic' | null
  productCount: number; salesCount: number; reviewsCount: number; rating: number; categories: string[]
  premium?: boolean; frame?: boolean
}

const SORTS = [
  { value: 'popular', label: 'Most sales' },
  { value: 'products', label: 'Most products' },
  { value: 'newest', label: 'Newest products' },
]
const VERIFIED: Record<string, string> = { id: 'ID verified', basic: 'Verified seller' }
const PAGE = 12
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`

function Star() {
  return <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f5a524" d="M12 17.3l6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7l-7.1.6 5.4 4.7-1.6 7z" /></svg>
}

export default function StoreCreators() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const search = params.get('search') || ''
  const sort = params.get('sort') || 'popular'
  const [input, setInput] = useState(search)
  const [sellers, setSellers] = useState<Seller[] | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [err, setErr] = useState(false)

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true })
  }

  useEffect(() => { document.title = 'Creators selling on OgaPay Store | OgaPay' }, [])

  // The store's categories for the chips. The answer is a list of names, or of
  // { name, subcategories } (both shapes are read)
  useEffect(() => {
    apiRequest<any>('/store/categories', { auth: false })
      .then((d) => {
        const list = Array.isArray(d) ? d : Array.isArray(d?.categories) ? d.categories : []
        setCategories(list.map((c: any) => (typeof c === 'string' ? c : c?.name)).filter((c: any) => typeof c === 'string' && c))
      })
      .catch(() => setCategories([]))
  }, [])

  const fetchPage = (p: number) => {
    const q = new URLSearchParams({ limit: String(PAGE), page: String(p) })
    if (sort !== 'popular') q.set('sort', sort)
    if (search) q.set('search', search)
    if (category) q.set('category', category)
    return apiRequest<Seller[]>(`/store/sellers?${q}`, { auth: false }).then((d) => (Array.isArray(d) ? d : []))
  }

  useEffect(() => {
    let live = true
    setSellers(null); setErr(false); setPage(1)
    fetchPage(1)
      .then((list) => { if (live) { setSellers(list); setMore(list.length === PAGE) } })
      .catch(() => { if (live) { setSellers([]); setErr(true) } })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sort])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const list = await fetchPage(page + 1)
      setSellers((s) => [...(s || []), ...list.filter((x) => !(s || []).some((y) => y.username === x.username))])
      setPage(page + 1)
      setMore(list.length === PAGE)
    } catch { setMore(false) }
    setLoadingMore(false)
  }

  return (
    <Layout>
      <div className="up-wrap">
        <div className="wk2-head">
          <div>
            <h1>Creators</h1>
            <p>People selling services and digital products on OgaPay Store. Open a creator to see everything they sell.</p>
          </div>
        </div>

        <form className="wk2-bar" onSubmit={(e) => { e.preventDefault(); set('search', input.trim()) }}>
          <label className="wk2-search">
            <i className="ti ti-search" />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search by name or username" aria-label="Search creators" />
            {input && <button type="button" onClick={() => { setInput(''); set('search', '') }} aria-label="Clear search"><i className="ti ti-x" /></button>}
          </label>
          <select className="wk2-sort" value={sort} onChange={(e) => set('sort', e.target.value === 'popular' ? '' : e.target.value)} aria-label="Sort creators">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </form>

        {categories.length > 0 && (
          <div className="wk2-skills" role="group" aria-label="Filter by category">
            <button className={`wk2-skill${!category ? ' on' : ''}`} onClick={() => set('category', '')}>All</button>
            {categories.map((c) => (
              <button key={c} className={`wk2-skill${category === c ? ' on' : ''}`} onClick={() => set('category', c)}>{itemCategoryLabel(c, '')}</button>
            ))}
          </div>
        )}

        {sellers === null ? (
          <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
        ) : err ? (
          <div className="up-empty"><i className="ti ti-cloud-off" />Couldn't load creators. Refresh to try again.</div>
        ) : sellers.length === 0 ? (
          <div className="up-empty"><i className="ti ti-user-search" />No creators match{search ? ` "${search}"` : ''}{category ? ` in ${itemCategoryLabel(category, '')}` : ''}.</div>
        ) : (
          <>
            <div className="wk2-grid">
              {sellers.map((s) => {
                const name = s.name || s.username
                const profile = `/user/${encodeURIComponent(s.username)}`
                return (
                  <section key={s.username} className="up-card wk2-card">
                    <Link to={profile} className="wk2-top">
                      <span className={`wk2-av${s.frame ? ' oga-frame' : ''}`}>{s.avatarUrl ? <img src={sized(s.avatarUrl, 56, true)} alt="" loading="lazy" /> : initials(name)}</span>
                      <span className="wk2-id">
                        <strong>{name}{s.premium && <PremiumMark />}</strong>
                        <small>@{s.username}</small>
                      </span>
                      {s.verified && <i className="ti ti-rosette-discount-check" role="img" aria-label={VERIFIED[s.verified]} title={VERIFIED[s.verified]} style={{ color: 'var(--green)', fontSize: 20, flexShrink: 0 }} />}
                    </Link>
                    {s.bio ? <p className="wk2-bio">{s.bio}</p> : <p className="wk2-bio" style={{ color: 'var(--text3)' }}>No bio yet.</p>}
                    {s.categories.length > 0 && (
                      <div className="up-chips wk2-chips">
                        {s.categories.map((c) => <span key={c} className="up-chip">{itemCategoryLabel(c, '')}</span>)}
                      </div>
                    )}
                    <div className="wk2-stats">
                      <span><b>{plural(s.productCount, 'product', 'products')}</b></span>
                      <span>{s.reviewsCount > 0 ? <><Star /> {Number(s.rating).toFixed(1)} <em>({s.reviewsCount})</em></> : <em>No reviews yet</em>}</span>
                      {s.salesCount > 0 && <span>{plural(s.salesCount, 'sale', 'sales')}</span>}
                    </div>
                    <div className="wk2-actions" style={{ gridTemplateColumns: '1fr' }}>
                      <Link className="up-btn primary" to={profile}>View store</Link>
                    </div>
                  </section>
                )
              })}
            </div>
            {more && (
              <div className="wk2-more">
                <button className="up-btn" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more'}</button>
              </div>
            )}
          </>
        )}

        <div className="wk2-more">
          <button className="up-btn" onClick={() => navigate('/store')}><i className="ti ti-arrow-left" /> Back to the store</button>
        </div>
      </div>
    </Layout>
  )
}
