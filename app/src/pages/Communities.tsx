import { useState, useEffect, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import { sized } from '../lib/img'

const filters = ['All', 'Trending', 'New', 'Crypto', 'Business', 'Content', 'Design', 'Marketing']

// The community's own cover picture; the colour gradient only when it has none
// (the cards used to ignore the cover, so every card was a black block)
function coverStyle(c: any): CSSProperties {
  const url = sized(c.coverImage || c.coverUrl, 400)
  return url
    ? { backgroundImage: `url("${String(url).replace(/"/g, '%22')}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    // no picture: a soft tint (the old gradient ran into the accent colour, which is black)
    : { background: 'linear-gradient(135deg, var(--bg2), color-mix(in srgb, var(--text) 12%, var(--bg2)))' }
}

function CardAvatar({ c }: { c: any }) {
  return <div className="cca">{c.iconUrl ? <img src={sized(c.iconUrl, 56, true)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : c.initials}</div>
}

export default function Communities() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [communities, setCommunities] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [trending, setTrending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // "My communities" (from the June page); /communities/mine opens it
  const location = useLocation()
  const signedIn = !!getAccessToken()
  const [tab, setTab] = useState<'all' | 'mine'>(location.pathname === '/communities/mine' ? 'mine' : 'all')
  const [mine, setMine] = useState<any[] | null>(null)

  useEffect(() => {
    async function fetchCommunities() {
      try {
        // (this used to call the production API directly, even from test builds)
        const data = await apiRequest<any>('/communities', { auth: false })
        setCommunities(data?.communities || [])
        setStats(data?.stats || null)
        setTrending(data?.trending || [])
      } catch {}
      setLoading(false)
    }
    fetchCommunities()
  }, [])

  useEffect(() => {
    if (tab !== 'mine' || !signedIn || mine) return
    apiRequest<any[]>('/communities/mine/list').then((d) => setMine(Array.isArray(d) ? d : [])).catch(() => setMine([]))
  }, [tab, signedIn, mine])

  const monthAgo = Date.now() - 30 * 86400000

  const filtered = communities.filter(c => {
    if (filter === 'trending' && !c.trending) return false
    if (filter === 'new' && new Date(c.createdAt).getTime() < monthAgo) return false
    if (filter !== 'all' && filter !== 'trending' && filter !== 'new' && c.category !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return `${c.name} ${c.desc || ''} ${c.badge || ''}`.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <Layout>
      <style>{`
        .ch-toolbar{display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap;margin:var(--sp-5) 0 var(--sp-4)}
        .ch-toolbar .ui-search{flex:1;max-width:360px;min-width:200px;margin-left:auto}
        .ch-count{margin:0 0 var(--sp-4)}
        .ch-tab{height:var(--ctl-h-sm);padding:0 14px;border-radius:var(--r-pill);border:1px solid var(--border);background:var(--card);color:var(--text2);font:500 13px var(--font);cursor:pointer;transition:border-color var(--t-fast) var(--ease)}
        .ch-tab:hover:not(.on){border-color:var(--border2);color:var(--text)}
        .ch-tab.on{background:var(--text);color:var(--bg);border-color:var(--text)}
        @media(max-width:640px){.ch-toolbar .ui-search{max-width:none;flex-basis:100%;order:3;margin-left:0}}
        .ch-mine{display:grid;gap:8px}
        .ch-mine-row{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:var(--r-md);cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%}
        .ch-mine-row:hover{border-color:var(--text3)}
        .ch-mine-av{width:40px;height:40px;border-radius:var(--r-ctl);display:grid;place-items:center;color:#fff;font-weight:800;overflow:hidden;flex-shrink:0}
        .ch-mine-av img{width:100%;height:100%;object-fit:cover}
        .ch-mine-t{flex:1;min-width:0}
        .ch-mine-t strong{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ch-mine-t span{font-size:12.5px;color:var(--text2)}
        .ch-role{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;border:1px solid var(--border);color:var(--text2)}
        .cc-desc{font-size:13px;color:var(--text2);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:2px 0 10px;min-height:calc(13px * 1.55 * 2)}
                .ch-filters{display:flex;gap:6px;margin-bottom:var(--sp-5);flex-wrap:wrap}
        .ch-pill{height:34px;padding:0 14px;border-radius:var(--r-pill);border:1px solid var(--border);background:var(--card);color:var(--text2);font:500 13px var(--font);cursor:pointer;transition:border-color var(--t-fast) var(--ease),background var(--t-fast) var(--ease);display:flex;align-items:center;gap:4px}
        .ch-pill:hover:not(.active){border-color:var(--border2);color:var(--text)}
        .ch-pill.active{background:var(--text);color:var(--bg);border-color:var(--text)}
        .ch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--sp-4);margin-bottom:var(--sp-6)}
        @media(max-width:1024px){.ch-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:640px){.ch-grid{grid-template-columns:1fr}}
                .ch-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-card);overflow:hidden;transition:border-color var(--t) var(--ease),box-shadow var(--t) var(--ease);cursor:pointer;display:flex;flex-direction:column;box-shadow:var(--sh-1)}
        .ch-card:hover{border-color:var(--border2);box-shadow:var(--sh-card)}
        .ch-card .ccb{height:120px;position:relative;overflow:hidden}
                .ch-card .cca{width:48px;height:48px;border-radius:var(--r-md);border:3px solid var(--card);background:var(--card2);display:grid;place-items:center;font-size:15px;font-weight:700;color:var(--text);margin-top:-24px;margin-left:20px;position:relative;z-index:1;overflow:hidden}
        .ch-card .cc-body{padding:10px 20px 20px;flex:1;display:flex;flex-direction:column}
        .ch-card .cc-name{font-weight:600;font-size:var(--fs-card);letter-spacing:-.015em;margin-bottom:6px}
        .ch-card .cc-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:var(--r-xs);font-size:11px;font-weight:500;background:var(--card2);border:1px solid var(--border);color:var(--text2);width:fit-content;margin-bottom:8px}
        .ch-card .cc-meta{display:flex;gap:12px;margin-bottom:8px;flex-wrap:wrap}
        .ch-card .cc-meta span{display:flex;align-items:center;gap:4px;color:var(--text2);font-size:13px}
        .ch-card .cc-r{color:var(--text2);font-size:12px;margin-bottom:8px}
        .ch-card .cc-r strong{color:var(--green)}
        .ch-card .cc-actions{display:flex;gap:8px;margin-top:auto}
                .ch-card .cc-actions button{flex:1;height:var(--ctl-h-sm);border-radius:var(--r-ctl);font:600 13px var(--font);transition:background var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease);cursor:pointer}
        .ch-join{border:1px solid var(--border);background:var(--card);color:var(--text)}
        .ch-join:hover{border-color:var(--text3);background:var(--card2)}
        .ch-preview{border:1px solid var(--border);background:transparent;color:var(--text2)}
        .ch-preview:hover{border-color:var(--accent);color:var(--accent)}
        .ch-trend{display:flex;gap:14px;overflow-x:auto;padding:4px 0 16px;scroll-snap-type:x mandatory}
        .ch-trend::-webkit-scrollbar{height:4px}
        .ch-trend::-webkit-scrollbar-thumb{background:var(--border2);border-radius:999px}
        .ch-trend .ch-card{min-width:260px;scroll-snap-align:start}
        .sec-title{font-family:var(--font);font-size:var(--fs-h2);font-weight:600;letter-spacing:-.02em;margin:0 0 4px}
        .sec-sub{color:var(--text2);font-size:13.5px;margin:0 0 var(--sp-4)}
        .ch-empty{text-align:center;padding:48px 24px;color:var(--text2);font-size:14px}
      `}</style>

      <div className="ui-page">
      <header className="ui-head">
        <div>
          <h1 className="ui-title" style={{ marginTop: 0 }}>Communities</h1>
          <p className="ui-sub">Groups working and earning together on OgaPay. Join one to see its members' jobs first.</p>
        </div>
        <div className="ui-actions">
          <button className="ui-btn ui-btn-dark" onClick={() => (signedIn ? navigate('/communities/create') : openSignIn({ redirect: '/communities/create' }))}><i className="ti ti-plus" /> Create community</button>
        </div>
      </header>
      <div className="ch-toolbar">
        <button className={`ch-tab${tab === 'all' ? ' on' : ''}`} onClick={() => setTab('all')}>All communities</button>
        <button className={`ch-tab${tab === 'mine' ? ' on' : ''}`} onClick={() => (signedIn ? setTab('mine') : openSignIn({ redirect: '/communities/mine' }))}>My communities</button>
        <div className="ui-search" role="search">
          <i className="ti ti-search" />
          <input className="ui-input" type="search" placeholder="Search communities" aria-label="Search communities" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {tab === 'all' && stats && <p className="ui-count ch-count"><b>{(stats.total || 0).toLocaleString()}</b> communities · <b>{(stats.members || 0).toLocaleString()}</b> members</p>}

      {tab === 'mine' ? (
        mine === null ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading your communities…</div>
        ) : mine.length === 0 ? (
          <div className="ch-empty"><i className="ti ti-users" style={{ fontSize: 32, marginBottom: 8, display: 'block', color: 'var(--text3)' }} />You haven't joined any communities yet. <button className="ch-tab" style={{ marginTop: 12 }} onClick={() => setTab('all')}>Browse communities</button></div>
        ) : (
          <div className="ch-mine">
            {mine.map((m) => (
              <button key={m.communityId} className="ch-mine-row" onClick={() => navigate('/communities/' + (m.slug || m.communityId))}>
                <span className="ch-mine-av" style={{ background: m.accentColor || 'var(--text)' }}>{m.iconUrl ? <img src={sized(m.iconUrl, 40, true)} alt="" /> : (m.name || '?').slice(0, 2).toUpperCase()}</span>
                <span className="ch-mine-t"><strong>{m.name}</strong><span>{(m.memberCount || 0).toLocaleString()} member{m.memberCount === 1 ? '' : 's'}{m.isPublic ? '' : ' · private'}</span></span>
                <span className="ch-role">{m.role === 'OWNER' ? 'Owner' : m.role === 'ADMIN' ? 'Admin' : m.role === 'MODERATOR' ? 'Moderator' : 'Member'}</span>
              </button>
            ))}
          </div>
        )
      ) : <>
      <div className="ch-filters">
        {filters.map(f => (
          <button key={f} className={`ch-pill ${filter === f.toLowerCase() ? 'active' : ''}`} onClick={() => setFilter(f.toLowerCase())}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24, display: 'block', marginBottom: 8 }} />
          Loading communities...
        </div>
      ) : (
        <>
          {trending.length > 0 && (
            <>
              <div className="sec-title">Trending Communities</div>
              <div className="sec-sub">Most active communities this week</div>
              <div className="ch-trend">
                {trending.map(c => (
                  <div className="ch-card" key={c.id} style={{ minWidth: 260 }} onClick={() => navigate('/communities/' + c.id)}>
                    <div className="ccb" style={coverStyle(c)} />
                    <CardAvatar c={c} />
                    <div className="cc-body">
                      <div className="cc-name">{c.name}</div>
                      <div className="cc-badge">{c.badge}</div>
                      <div className="cc-meta"><span><i className="ti ti-users" /> {c.members?.toLocaleString()}</span></div>
                      <button className="ch-join" style={{ marginTop: 'auto', height: 30, fontSize: 11 }} onClick={(e) => { e.stopPropagation(); navigate('/communities/' + c.id) }}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="sec-title">All Communities</div>
          <div className="sec-sub">Discover and join communities that match your interests</div>

          {filtered.length === 0 ? (
            <div className="ch-empty"><i className="ti ti-users" style={{ fontSize: 32, marginBottom: 8, display: 'block', color: 'var(--text3)' }} />No communities found. Try a different filter.</div>
          ) : (
            <div className="ch-grid">
              {filtered.map(c => (
                <div className="ch-card" key={c.id} onClick={() => navigate('/communities/' + c.id)}>
                  <div className="ccb" style={coverStyle(c)} />
                  <CardAvatar c={c} />
                  <div className="cc-body">
                    <div className="cc-name">{c.name}</div>
                    <div className="cc-badge">{c.badge}</div>
                    {c.desc && <div className="cc-desc">{c.desc}</div>}
                    <div className="cc-meta">
                      <span><i className="ti ti-users" /> {c.members?.toLocaleString()} member{c.members === 1 ? '' : 's'}</span>
                    </div>
                    <div className="cc-actions">
                      <button className="ch-join" onClick={(e) => { e.stopPropagation(); navigate('/communities/' + c.id) }}>View</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      </>}

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Layout>
  )
}
