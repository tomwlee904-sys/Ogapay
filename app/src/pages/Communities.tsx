import { useState, useEffect, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import CommunityTabs from '../components/community/CommunityTabs'
import { accentTile } from '../components/community/colors'
import { apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import { sized } from '../lib/img'

// Categories are chips; how the list is ordered is a select; the two toggles sit
// with the sort (in a Filters panel on phone). One control style per job.
const CATEGORIES = ['Crypto', 'Business', 'Content', 'Design', 'Marketing']
const SORTS: [string, string][] = [['', 'Busiest'], ['trending', 'Trending'], ['new', 'Newest']]

// The community's own cover picture; a soft tint when it has none
function coverStyle(c: any): CSSProperties {
  const url = sized(c.coverImage || c.coverUrl, 400)
  return url
    ? { backgroundImage: `url("${String(url).replace(/"/g, '%22')}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(135deg, var(--card2), color-mix(in srgb, var(--text) 12%, var(--card2)))' }
}

// One card: a compact row on phone (avatar, name, members and open jobs), a
// card with its cover from tablet up. The whole card is a link.
function CommunityCard({ c }: { c: any }) {
  return (
    <Link className="ch-card" to={'/communities/' + (c.slug || c.id)}>
      <div className="ccb" style={coverStyle(c)} />
      <div className="cca">{c.iconUrl ? <img src={sized(c.iconUrl, 56, true)} alt="" /> : c.initials}</div>
      <div className="cc-body">
        <div className="cc-name">{c.name}</div>
        {c.badge && <div className="cc-badge">{c.badge}</div>}
        {c.desc && <div className="cc-desc">{c.desc}</div>}
        <div className="cc-meta">
          <span><i className="ti ti-users" aria-hidden="true" /> {(c.members || 0).toLocaleString()} member{c.members === 1 ? '' : 's'}</span>
          {c.openJobs > 0 && <span><i className="ti ti-briefcase" aria-hidden="true" /> {c.openJobs} open job{c.openJobs === 1 ? '' : 's'}</span>}
        </div>
      </div>
      <i className="ti ti-chevron-right cc-go" aria-hidden="true" />
    </Link>
  )
}

export default function Communities() {
  const navigate = useNavigate()
  const location = useLocation()
  const signedIn = !!getAccessToken()
  // The tab is the address: /communities or /communities/mine
  const tab: 'all' | 'mine' = location.pathname === '/communities/mine' ? 'mine' : 'all'
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('')
  const [search, setSearch] = useState('')
  const [communities, setCommunities] = useState<any[] | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [trending, setTrending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [mine, setMine] = useState<any[] | null>(null)
  const [mineFailed, setMineFailed] = useState(false)
  // Like wurk: "Has open jobs" and "Last 30 days" filters, and 12 a page.
  const [hasJobs, setHasJobs] = useState(false)
  const [recent, setRecent] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Search waits until typing stops
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => { setPage(1) }, [category, sort, hasJobs, recent, query])

  useEffect(() => {
    if (tab !== 'all') return
    let live = true
    async function fetchCommunities() {
      setLoading(true); setFailed(false)
      const qs = new URLSearchParams({ page: String(page), limit: '12' })
      if (sort === 'new') qs.set('sort', 'newest')
      if (category) qs.set('category', category)
      if (hasJobs) qs.set('hasJobs', '1')
      if (recent) qs.set('recent', '1')
      if (query) qs.set('search', query)
      try {
        const data = await apiRequest<any>(`/communities?${qs}`, { auth: false })
        if (!live) return
        setCommunities(data?.communities || [])
        setStats(data?.stats || null)
        setTotalPages(Number(data?.totalPages) || 1)
        // Trending stays the first unfiltered page's pick
        if (!category && !sort && !hasJobs && !recent && !query && page === 1) setTrending(data?.trending || [])
      } catch {
        // A failed load shows Try again, never "No communities found"
        if (live) setFailed(true)
      }
      if (live) setLoading(false)
    }
    fetchCommunities()
    return () => { live = false }
  }, [tab, category, sort, hasJobs, recent, query, page, reload])

  useEffect(() => {
    if (tab !== 'mine' || !signedIn || mine) return
    setMineFailed(false)
    apiRequest<any[]>('/communities/mine/list').then((d) => setMine(Array.isArray(d) ? d : [])).catch(() => setMineFailed(true))
  }, [tab, signedIn, mine, reload])

  // "Trending" keeps the busiest first and only shows the ones the server marks trending
  const filtered = sort === 'trending' ? (communities || []).filter((c) => c.trending) : (communities || [])
  const anyFilter = !!(category || sort || hasJobs || recent || query)
  const filterCount = (sort ? 1 : 0) + (hasJobs ? 1 : 0) + (recent ? 1 : 0)
  const clearAll = () => { setCategory(''); setSort(''); setHasJobs(false); setRecent(false); setSearch(''); setQuery('') }
  const create = () => (signedIn ? navigate('/communities/create') : openSignIn({ redirect: '/communities/create' }))
  // Search filters your own list too
  const mineShown = (mine || []).filter((m) => !query || String(m.name || '').toLowerCase().includes(query.toLowerCase()))
  const showTrending = tab === 'all' && !anyFilter && page === 1 && trending.length > 0

  return (
    <Layout>
      <style>{`
        .ch-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;column-gap:var(--sp-4)}
        .ch-head > div:first-child{min-width:0}
        .ch-head .ui-actions{flex-shrink:0}
        .ch-short{display:none}
        .ch-toolbar{display:flex;align-items:center;gap:var(--sp-3);margin:var(--sp-5) 0 var(--sp-3)}
        .ch-views{flex-shrink:0}
        .ch-toolbar .ui-search{flex:1;max-width:360px;margin-left:auto}
        .ch-filterbtn{display:none}
        .ch-filters{display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-4)}
        .ch-cats{flex:1;min-width:0;padding-block:4px}
        .ch-cats .ui-chip{height:36px}
        .ch-opts{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .ch-opts .ui-select{width:auto;height:var(--ctl-h-sm);font-size:13px;padding:0 30px 0 12px;background-position:right 10px center}
        .ch-opts .ui-chip{height:36px;display:inline-flex;align-items:center;gap:6px}
        .ch-count{margin:0 0 var(--sp-3)}
        .ch-h2{margin:0 0 var(--sp-3);font-size:15px;font-weight:600;color:var(--text)}
        .ch-grid{margin-bottom:var(--sp-6)}
        .ch-card{position:relative;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--border);border-radius:var(--r-card);overflow:hidden;color:var(--text);text-decoration:none;box-shadow:var(--sh-1);transition:border-color var(--t) var(--ease),box-shadow var(--t) var(--ease)}
        .ch-card:hover{border-color:var(--border2);box-shadow:var(--sh-card)}
        .ch-card .ccb{height:120px}
        .ch-card .cca{width:48px;height:48px;border-radius:var(--r-md);border:3px solid var(--card);background:var(--card2);display:grid;place-items:center;font-size:15px;font-weight:700;color:var(--text);margin:-24px 0 0 20px;position:relative;z-index:1;overflow:hidden;flex-shrink:0}
        .ch-card .cca img{width:100%;height:100%;object-fit:cover}
        .ch-card .cc-body{padding:10px 20px 20px;flex:1;display:flex;flex-direction:column;min-width:0}
        .ch-card .cc-name{font-weight:600;font-size:var(--fs-card);letter-spacing:-.015em;margin-bottom:6px}
        .ch-card .cc-badge{display:inline-flex;padding:2px 8px;border-radius:var(--r-xs);font-size:12px;font-weight:500;background:var(--card2);border:1px solid var(--border);color:var(--text2);width:fit-content;margin-bottom:8px}
        .ch-card .cc-desc{font-size:13px;color:var(--text2);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:2px 0 10px}
        .ch-card .cc-meta{display:flex;gap:12px;flex-wrap:wrap;margin-top:auto}
        .ch-card .cc-meta span{display:flex;align-items:center;gap:4px;color:var(--text2);font-size:13px}
        .ch-card .cc-go{display:none}
        .ch-trend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--sp-4);margin-bottom:var(--sp-5)}
        .ch-trend .ch-card .cc-desc{display:none}
        .ch-mine{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .ch-mine-row{display:flex;align-items:center;gap:12px;padding:12px 14px;min-height:64px;background:var(--card);border:1px solid var(--border);border-radius:var(--r-md);text-decoration:none;color:inherit}
        .ch-mine-row:hover{border-color:var(--text3)}
        .ch-mine-av{width:40px;height:40px;border-radius:var(--r-ctl);display:grid;place-items:center;font-weight:800;overflow:hidden;flex-shrink:0}
        .ch-mine-av img{width:100%;height:100%;object-fit:cover}
        .ch-mine-t{flex:1;min-width:0}
        .ch-mine-t strong{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ch-mine-t span{font-size:12.5px;color:var(--text2)}
        .ch-role{font-size:12px;font-weight:600;padding:3px 8px;border-radius:999px;border:1px solid var(--border);color:var(--text2)}
        .ch-empty-acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px}
        @media(max-width:1023.98px){
          .ch-trend{display:flex;overflow-x:auto;scrollbar-width:none;scroll-snap-type:x proximity;padding-bottom:4px}
          .ch-trend .ch-card{flex:0 0 260px;scroll-snap-align:start}
          .ch-filters{flex-wrap:wrap}
        }
        @media(max-width:767.98px){
          .ch-head{align-items:center}
          .ch-head .ui-sub{grid-column:1 / -1}
          .ch-long{display:none}.ch-short{display:inline}
          .ch-toolbar{flex-wrap:wrap;margin-top:var(--sp-4)}
          .ch-views{width:100%}
          .ch-toolbar .ui-search{max-width:none;margin:0;flex:1 1 0}
          .ch-filterbtn{display:inline-flex;position:relative}
          .ch-filterbtn em{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--text);color:var(--bg);font:600 11px/18px var(--font);font-style:normal}
          .ch-cats{flex:1 1 100%;margin-inline:calc(-1 * var(--gutter));padding-inline:var(--gutter)}
          .ch-opts{display:none;flex:1 1 100%;flex-wrap:wrap;padding:12px;border:1px solid var(--border);border-radius:var(--r-card);background:var(--card)}
          .ch-opts.open{display:flex}
          .ch-opts .ui-select{flex:1 1 100%;height:var(--ctl-h)}
          .ch-opts .ui-chip{flex:1 1 0;justify-content:center;height:40px}
          .ch-mine{grid-template-columns:minmax(0,1fr)}
          /* Phone: compact rows, about five to a screen */
          .ch-grid .ch-card,.ch-trend .ch-card{flex-direction:row;align-items:center;gap:12px;padding:12px 14px;min-height:72px;border-radius:var(--r-md)}
          .ch-grid .ch-card .ccb,.ch-trend .ch-card .ccb{display:none}
          .ch-grid .ch-card .cca,.ch-trend .ch-card .cca{margin:0;border:1px solid var(--border);width:48px;height:48px}
          .ch-grid .ch-card .cc-body,.ch-trend .ch-card .cc-body{padding:0}
          .ch-grid .ch-card .cc-name,.ch-trend .ch-card .cc-name{margin:0 0 2px;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .ch-grid .ch-card .cc-badge,.ch-grid .ch-card .cc-desc,.ch-trend .ch-card .cc-badge{display:none}
          .ch-grid .ch-card .cc-meta span,.ch-trend .ch-card .cc-meta span{font-size:12.5px}
          .ch-grid .ch-card .cc-go{display:block;margin-left:auto;color:var(--text3);font-size:18px}
          .ch-trend .ch-card{flex:0 0 240px}
          .ch-grid{gap:8px}
        }
      `}</style>

      <div className="ui-page">
        <header className="ui-head ch-head">
          <div>
            <h1 className="ui-title" style={{ marginTop: 0 }}>Communities</h1>
            <p className="ui-sub">Groups working and earning together. Join one to see its jobs first.</p>
          </div>
          <div className="ui-actions">
            <button className="ui-btn ui-btn-ghost" onClick={create}><i className="ti ti-plus" /> <span className="ch-long">Create community</span><span className="ch-short">Create</span></button>
          </div>
        </header>

        <div className="ch-toolbar">
          <CommunityTabs active={tab} />
          <div className="ui-search" role="search">
            <i className="ti ti-search" aria-hidden="true" />
            <input className="ui-input" type="search" placeholder={tab === 'mine' ? 'Search your communities' : 'Search communities'} aria-label="Search communities" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {tab === 'all' && (
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-icon ch-filterbtn" aria-label="Sort and filters" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}>
              <i className="ti ti-adjustments-horizontal" aria-hidden="true" />{filterCount > 0 && <em>{filterCount}</em>}
            </button>
          )}
        </div>

        {tab === 'mine' ? (
          mine === null ? (
            mineFailed ? <LoadError what="your communities" onRetry={() => setReload((r) => r + 1)} /> : <div className="ch-mine">{[0, 1, 2, 3].map((i) => <div key={i} className="ui-sk" style={{ height: 64, borderRadius: 14 }} />)}</div>
          ) : mineShown.length === 0 ? (
            <div className="ui-empty" style={{ maxWidth: 480, margin: '0 auto' }}>
              {mine.length === 0 ? (
                <>
                  <strong>You haven't joined any communities yet</strong>
                  Join one to see its members' jobs first, or start your own.
                  <div className="ch-empty-acts">
                    <button className="ui-btn ui-btn-ghost" onClick={() => navigate('/communities', { replace: true })}>Browse communities</button>
                    <button className="ui-btn ui-btn-dark" onClick={create}><i className="ti ti-plus" /> Create community</button>
                  </div>
                </>
              ) : (
                <>
                  <strong>None of your communities match</strong>
                  <div className="ch-empty-acts"><button className="ui-btn ui-btn-ghost" onClick={() => { setSearch(''); setQuery('') }}>Clear search</button></div>
                </>
              )}
            </div>
          ) : (
            <div className="ch-mine">
              {mineShown.map((m) => (
                <Link key={m.communityId} className="ch-mine-row" to={'/communities/' + (m.slug || m.communityId)}>
                  <span className="ch-mine-av" style={accentTile(m.accentColor)}>{m.iconUrl ? <img src={sized(m.iconUrl, 40, true)} alt="" /> : (m.name || '?').slice(0, 2).toUpperCase()}</span>
                  <span className="ch-mine-t"><strong>{m.name}</strong><span>{(m.memberCount || 0).toLocaleString()} member{m.memberCount === 1 ? '' : 's'}{m.isPublic ? '' : ' · private'}</span></span>
                  <span className="ch-role">{m.role === 'OWNER' ? 'Owner' : m.role === 'ADMIN' ? 'Admin' : m.role === 'MODERATOR' ? 'Moderator' : 'Member'}</span>
                </Link>
              ))}
            </div>
          )
        ) : <>
          <div className="ch-filters">
            <div className="ui-scroll-row ch-cats" role="group" aria-label="Categories">
              <button type="button" className={`ui-chip${!category ? ' on' : ''}`} aria-pressed={!category} onClick={() => setCategory('')}>All</button>
              {CATEGORIES.map(f => (
                <button key={f} type="button" className={`ui-chip${category === f.toLowerCase() ? ' on' : ''}`} aria-pressed={category === f.toLowerCase()} onClick={() => setCategory(category === f.toLowerCase() ? '' : f.toLowerCase())}>{f}</button>
              ))}
            </div>
            <div className={`ch-opts${showFilters ? ' open' : ''}`}>
              <select className="ui-select" aria-label="Sort communities" value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map(([v, l]) => <option key={v || 'busiest'} value={v}>{l}</option>)}
              </select>
              <button type="button" className={`ui-chip${hasJobs ? ' on' : ''}`} aria-pressed={hasJobs} onClick={() => setHasJobs(!hasJobs)}><i className="ti ti-briefcase" aria-hidden="true" /> Has open jobs</button>
              <button type="button" className={`ui-chip${recent ? ' on' : ''}`} aria-pressed={recent} onClick={() => setRecent(!recent)}><i className="ti ti-clock" aria-hidden="true" /> Last 30 days</button>
            </div>
          </div>

          {failed ? (
            <LoadError what="communities" onRetry={() => setReload((r) => r + 1)} />
          ) : loading && communities === null ? (
            <div className="ui-grid-3 ch-grid">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="ui-sk" style={{ height: 220 }} />)}</div>
          ) : (
            <div aria-busy={loading}>
              {showTrending && (
                <>
                  <h2 className="ch-h2">Trending this week</h2>
                  <div className="ch-trend">
                    {trending.slice(0, 4).map(c => <CommunityCard key={c.id} c={c} />)}
                  </div>
                  <h2 className="ch-h2">All communities</h2>
                </>
              )}
              {stats && !showTrending && <p className="ui-count ch-count"><b>{(stats.total || 0).toLocaleString()}</b> communities · <b>{(stats.members || 0).toLocaleString()}</b> members</p>}

              {filtered.length === 0 ? (
                <div className="ui-empty">
                  {anyFilter ? (
                    <>
                      <strong>No communities match</strong>
                      Try another word or category.
                      <div className="ch-empty-acts"><button className="ui-btn ui-btn-ghost" onClick={clearAll}>Clear filters</button></div>
                    </>
                  ) : (
                    <>
                      <strong>No communities yet</strong>
                      Start the first one and invite people to work with you.
                      <div className="ch-empty-acts"><button className="ui-btn ui-btn-dark" onClick={create}><i className="ti ti-plus" /> Create community</button></div>
                    </>
                  )}
                </div>
              ) : (
                <div className="ui-grid-3 ch-grid">
                  {filtered.map(c => <CommunityCard key={c.id} c={c} />)}
                </div>
              )}
              {totalPages > 1 && (
                <nav className="ui-pager" aria-label="Pages">
                  <button className="ui-btn ui-btn-ghost" disabled={page <= 1} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0 }) }}><i className="ti ti-chevron-left" /> Previous</button>
                  <span>Page {page} of {totalPages}</span>
                  <button className="ui-btn ui-btn-ghost" disabled={page >= totalPages} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0 }) }}>Next <i className="ti ti-chevron-right" /></button>
                </nav>
              )}
            </div>
          )}
        </>}
      </div>
    </Layout>
  )
}
