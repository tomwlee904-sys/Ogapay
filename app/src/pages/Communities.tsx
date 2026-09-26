import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'

const filters = ['All', 'Trending', 'New', 'Crypto', 'Business', 'Content', 'Design', 'Marketing']

function getGradient(cat: string) {
  const g: Record<string, string> = { crypto: '#0a0a0a,var(--accent)', design: '#4a1a4e,#EC4899', content: '#1a4e3a,#22C55E', marketing: '#4e3a1a,#F5B301', business: '#1a2a4e,var(--accent)' }
  return g[cat] || '#0a0a0a,var(--accent)'
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
        .ch-hero{text-align:center;padding:20px 24px 36px;background:radial-gradient(ellipse at 50% 0%,rgba(var(--accent-rgb),.08) 0%,transparent 70%);border-radius:14px;margin-bottom:28px}
        .ch-hero h1{font-family:Geist;font-size:38px;font-weight:900;margin:0 0 8px;color:var(--text);letter-spacing:-.04em;background-clip:text}
        .ch-hero p{color:var(--text2);font-size:14px;max-width:500px;margin:0 auto 20px;line-height:1.6}
        .ch-search{display:flex;align-items:center;gap:0;max-width:500px;margin:0 auto;background:var(--card);border:1.5px solid var(--border);border-radius:12px;overflow:hidden;transition:all .2s}
        .ch-search:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px rgba(var(--accent-rgb),.1)}
        .ch-search input{flex:1;border:0;background:transparent;color:var(--text);font-size:14px;padding:12px 16px;outline:none}
        .ch-search input::placeholder{color:var(--text3)}
        .ch-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:20px}
        .ch-tabs{display:flex;align-items:center;gap:8px;margin-bottom:18px;flex-wrap:wrap}
        .ch-tab{height:36px;padding:0 14px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text2);font:600 13px inherit;font-family:inherit;cursor:pointer}
        .ch-tab.on{background:var(--text);color:var(--bg);border-color:var(--text)}
        .ch-create{margin-left:auto;height:36px;padding:0 14px;border-radius:10px;border:0;background:var(--text);color:var(--bg);font:700 13px inherit;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
        .ch-mine{display:grid;gap:8px}
        .ch-mine-row{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--card);border:1px solid var(--border);border-radius:12px;cursor:pointer;text-align:left;font:inherit;color:inherit;width:100%}
        .ch-mine-row:hover{border-color:var(--text3)}
        .ch-mine-av{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;color:#fff;font-weight:800;overflow:hidden;flex-shrink:0}
        .ch-mine-av img{width:100%;height:100%;object-fit:cover}
        .ch-mine-t{flex:1;min-width:0}
        .ch-mine-t strong{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ch-mine-t span{font-size:12px;color:var(--text3)}
        .ch-role{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;border:1px solid var(--border);color:var(--text2)}
        .cc-desc{font-size:12px;color:var(--text2);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:2px 0 8px}
        .ch-stat{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center}
        .ch-stat .csi{width:34px;height:34px;border-radius:8px;background:rgba(var(--accent-rgb),.08);color:var(--accent);display:grid;place-items:center;margin:0 auto 6px;font-size:18px}
        .ch-stat .csn{font-family:Geist;font-size:22px;font-weight:800}
        .ch-stat .csl{color:var(--text2);font-size:12px;margin-top:2px}
        .ch-filters{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}
        .ch-pill{height:32px;padding:0 14px;border-radius:999px;border:1px solid var(--border);background:var(--bg);color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:4px}
        .ch-pill:hover,.ch-pill.active{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
        .ch-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
        @media(max-width:1024px){.ch-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:640px){.ch-grid{grid-template-columns:1fr}}
        .ch-card{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:all .3s;cursor:pointer;display:flex;flex-direction:column}
        .ch-card:hover{transform:translateY(-4px);border-color:var(--accent);box-shadow:0 8px 24px rgba(var(--accent-rgb),.1)}
        .ch-card .ccb{height:90px;position:relative;overflow:hidden}
        .ch-card .cca{width:48px;height:48px;border-radius:50%;border:3px solid var(--card);background:var(--bg2);display:grid;place-items:center;font-size:16px;font-weight:800;color:var(--accent);margin-top:-24px;margin-left:14px;position:relative;z-index:1}
        .ch-card .cc-body{padding:6px 14px 14px;flex:1;display:flex;flex-direction:column}
        .ch-card .cc-name{font-weight:700;font-size:15px;margin-bottom:2px}
        .ch-card .cc-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:rgba(var(--accent-rgb),.08);color:var(--accent);width:fit-content;margin-bottom:6px}
        .ch-card .cc-meta{display:flex;gap:12px;margin-bottom:8px;flex-wrap:wrap}
        .ch-card .cc-meta span{display:flex;align-items:center;gap:4px;color:var(--text2);font-size:12px}
        .ch-card .cc-r{color:var(--text2);font-size:12px;margin-bottom:8px}
        .ch-card .cc-r strong{color:var(--green)}
        .ch-card .cc-actions{display:flex;gap:8px;margin-top:auto}
        .ch-card .cc-actions button{flex:1;height:32px;border-radius:8px;font-size:11px;font-weight:700;transition:all .2s;cursor:pointer}
        .ch-join{border:1px solid var(--accent);background:transparent;color:var(--accent)}
        .ch-join:hover{background:var(--accent);color:var(--on-accent)}
        .ch-preview{border:1px solid var(--border);background:transparent;color:var(--text2)}
        .ch-preview:hover{border-color:var(--accent);color:var(--accent)}
        .ch-trend{display:flex;gap:14px;overflow-x:auto;padding:4px 0 16px;scroll-snap-type:x mandatory}
        .ch-trend::-webkit-scrollbar{height:4px}
        .ch-trend::-webkit-scrollbar-thumb{background:var(--border2);border-radius:999px}
        .ch-trend .ch-card{min-width:260px;scroll-snap-align:start}
        .sec-title{font-family:Geist;font-size:18px;font-weight:800;margin:0 0 4px}
        .sec-sub{color:var(--text2);font-size:13px;margin:0 0 16px}
        .ch-empty{text-align:center;padding:48px 24px;color:var(--text2);font-size:14px}
      `}</style>

      <div className="ch-hero">
        <h1>Communities</h1>
        <p>Discover and join vibrant communities. Connect with creators, earn rewards, and grow together.</p>
        <div className="ch-search">
          <input type="text" placeholder="Search communities..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={{ height: 44, padding: '0 18px', border: 0, background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <i className="ti ti-search" /> Search
          </button>
        </div>
      </div>

      <div className="ch-stats">
        {[
          { icon: 'ti ti-users', num: stats?.total?.toLocaleString() || '0', label: 'Communities' },
          { icon: 'ti ti-users-group', num: stats?.members?.toLocaleString() || '0', label: 'Active Members' },
        ].map((s, i) => (
          <div className="ch-stat" key={i}><div className="csi"><i className={s.icon} /></div><div className="csn">{s.num}</div><div className="csl">{s.label}</div></div>
        ))}
      </div>

      <div className="ch-tabs">
        <button className={`ch-tab${tab === 'all' ? ' on' : ''}`} onClick={() => setTab('all')}>All communities</button>
        <button className={`ch-tab${tab === 'mine' ? ' on' : ''}`} onClick={() => (signedIn ? setTab('mine') : openSignIn({ redirect: '/communities/mine' }))}>My communities</button>
        <button className="ch-create" onClick={() => (signedIn ? navigate('/communities/create') : openSignIn({ redirect: '/communities/create' }))}><i className="ti ti-plus" /> Create</button>
      </div>

      {tab === 'mine' ? (
        mine === null ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading your communities…</div>
        ) : mine.length === 0 ? (
          <div className="ch-empty"><i className="ti ti-users" style={{ fontSize: 32, marginBottom: 8, display: 'block', color: 'var(--text3)' }} />You haven't joined any communities yet. <button className="ch-tab" style={{ marginTop: 12 }} onClick={() => setTab('all')}>Browse communities</button></div>
        ) : (
          <div className="ch-mine">
            {mine.map((m) => (
              <button key={m.communityId} className="ch-mine-row" onClick={() => navigate('/communities/' + (m.slug || m.communityId))}>
                <span className="ch-mine-av" style={{ background: m.accentColor || 'var(--text)' }}>{m.iconUrl ? <img src={m.iconUrl} alt="" /> : (m.name || '?').slice(0, 2).toUpperCase()}</span>
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
                    <div className="ccb" style={{ background: `linear-gradient(135deg,${getGradient(c.category)})` }} />
                    <div className="cca">{c.initials}</div>
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
                  <div className="ccb" style={{ background: `linear-gradient(135deg,${getGradient(c.category)})` }} />
                  <div className="cca">{c.initials}</div>
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

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Layout>
  )
}
