import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

const filters = ['All', 'Trending', 'New', 'Crypto', 'Business', 'Content', 'Design', 'Marketing']

function getGradient(cat: string) {
  const g: Record<string, string> = { crypto: '#1a1a4e,#191C6B', design: '#4a1a4e,#EC4899', content: '#1a4e3a,#22C55E', marketing: '#4e3a1a,#F5B301', business: '#1a2a4e,#191C6B' }
  return g[cat] || '#1a1a4e,#191C6B'
}

export default function Communities() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user: authUser } = useAuth()
  const isMineRoute = location.pathname === '/communities/mine'
  const [tab, setTab] = useState<'mine' | 'all'>(isMineRoute ? 'mine' : 'all')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [communities, setCommunities] = useState<any[]>([])
  const [myCommunities, setMyCommunities] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [trending, setTrending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mineLoading, setMineLoading] = useState(false)

  useEffect(() => {
    async function fetchCommunities() {
      try {
        const json: any = await apiRequest('/communities')
        console.log('Communities response:', json)
        const data = json?.data || json
        const list = data?.communities || data?.data || (Array.isArray(json) ? json : [])
        setCommunities(list)
        setStats(data?.stats || null)
        setTrending(data?.trending || [])
      } catch {}
      setLoading(false)
    }
    fetchCommunities()
    const onFocus = () => fetchCommunities()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authUser])

  // Fetch My Communities
  useEffect(() => {
    async function fetchMyCommunities() {
      setMineLoading(true)
      try {
        const json: any = await apiRequest('/communities/mine/list')
        console.log('MyCommunities response:', json)
        const data = json?.data || json
        setMyCommunities(Array.isArray(data) ? data : data?.communities || [])
      } catch {}
      setMineLoading(false)
    }
    fetchMyCommunities()
  }, [authUser])

  const filtered = communities.filter(c => {
    if (filter === 'trending' && !c.trending) return false
    if (filter === 'new' && !c.trending) return false
    if (filter !== 'all' && filter !== 'trending' && filter !== 'new' && c.category !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (c.name || '').toLowerCase().includes(q) || (c.desc || c.description || '').toLowerCase().includes(q) || (c.badge || c.category || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <Layout>
      <style>{`
        .ch-hero{text-align:center;padding:20px 24px 36px;background:radial-gradient(ellipse at 50% 0%,rgba(31,140,255,.08) 0%,transparent 70%);border-radius:14px;margin-bottom:28px}
        .ch-hero h1{font-family:Outfit;font-size:38px;font-weight:900;margin:0 0 8px;background:linear-gradient(135deg,#fff 30%,#191C6B 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .ch-hero p{color:var(--text2);font-size:14px;max-width:500px;margin:0 auto 20px;line-height:1.6}
        .ch-search{display:flex;align-items:center;gap:0;max-width:500px;margin:0 auto;background:var(--card);border:1.5px solid var(--border);border-radius:12px;overflow:hidden;transition:all .2s}
        .ch-search:focus-within{border-color:#191C6B;box-shadow:0 0 0 3px rgba(31,140,255,.1)}
        .ch-search input{flex:1;border:0;background:transparent;color:var(--text);font-size:14px;padding:12px 16px;outline:none}
        .ch-search input::placeholder{color:var(--text3)}
        .ch-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
        @media(max-width:768px){.ch-stats{grid-template-columns:repeat(2,1fr)}}
        .ch-stat{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;text-align:center}
        .ch-stat .csi{width:34px;height:34px;border-radius:8px;background:rgba(31,140,255,.08);color:#191C6B;display:grid;place-items:center;margin:0 auto 6px;font-size:18px}
        .ch-stat .csn{font-family:Outfit;font-size:22px;font-weight:800}
        .ch-stat .csl{color:var(--text2);font-size:12px;margin-top:2px}
        .ch-filters{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}
        .ch-pill{height:32px;padding:0 14px;border-radius:999px;border:1px solid var(--border);background:var(--bg);color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:4px}
        .ch-pill:hover,.ch-pill.active{background:#191C6B;color:#fff;border-color:#191C6B}
        .ch-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:28px}
        @media(max-width:1024px){.ch-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:640px){.ch-grid{grid-template-columns:1fr}}
        .ch-card{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:all .3s;cursor:pointer;display:flex;flex-direction:column}
        .ch-card:hover{transform:translateY(-4px);border-color:#191C6B;box-shadow:0 8px 24px rgba(31,140,255,.1)}
        .ch-card .ccb{height:180px;position:relative;overflow:hidden;background-size:cover!important;background-position:center!important}
        .ch-card .cca{display:none}
        .ch-card .cc-body{padding:6px 14px 14px;flex:1;display:flex;flex-direction:column}
        .ch-card .cc-name{font-weight:700;font-size:15px;margin-bottom:2px}
        
        
        
        
        
        
        
        
        
        
        
        .ch-trend{display:flex;gap:14px;overflow-x:auto;padding:4px 0 16px;scroll-snap-type:x mandatory}
        .ch-trend::-webkit-scrollbar{height:4px}
        .ch-trend::-webkit-scrollbar-thumb{background:var(--border2);border-radius:999px}
        .ch-trend .ch-card{min-width:260px;scroll-snap-align:start}
        .sec-title{font-family:Outfit;font-size:18px;font-weight:800;margin:0 0 4px}
        .sec-sub{color:var(--text2);font-size:13px;margin:0 0 16px}
        .ch-empty{text-align:center;padding:48px 24px;color:var(--text2);font-size:14px}
        .ch-empty i{font-size:40px;display:block;margin-bottom:12px;color:var(--text3)}
      `}</style>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontFamily: 'inherit' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 16 }} /> Back
        </button>
        <h1 style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 800, margin: 0, textAlign: 'center', flex: 1 }}>
          <i className="ti ti-users" style={{ marginRight: 6 }} /> Communities
        </h1>
        <button onClick={() => navigate('/communities/create')} style={{ background: '#191C6B', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} /> Create Community
        </button>
      </div>

      {/* Tab toggle pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('mine')} style={{
          flex: 1, padding: '10px 0', borderRadius: 999,
          background: tab === 'mine' ? '#191C6B' : 'var(--card)',
          color: tab === 'mine' ? '#fff' : 'var(--text2)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          border: tab === 'mine' ? 'none' : '1px solid var(--border)',
        }}>
          👤 My Communities {myCommunities.length > 0 && <span style={{ opacity: 0.7 }}>({myCommunities.length})</span>}
        </button>
        <button onClick={() => setTab('all')} style={{
          flex: 1, padding: '10px 0', borderRadius: 999,
          background: tab === 'all' ? '#191C6B' : 'var(--card)',
          color: tab === 'all' ? '#fff' : 'var(--text2)',
          fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          border: tab === 'all' ? 'none' : '1px solid var(--border)',
        }}>
          👥 All Communities {communities.length > 0 && <span style={{ opacity: 0.7 }}>({communities.length})</span>}
        </button>
      </div>

      {tab === 'mine' && (
        <>
          {/* My Communities stat box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(31,140,255,0.08)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <i className="ti ti-users" style={{ fontSize: 20, color: '#191C6B' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{myCommunities.length}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.04em' }}>MY COMMUNITIES</div>
            </div>
          </div>

          {mineLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24, display: 'block', marginBottom: 8 }} />
              Loading your communities...
            </div>
          ) : myCommunities.length === 0 ? (
            <div className="ch-empty">
              <i className="ti ti-users" />
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Not a member of any communities</p>
              <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 20px' }}>Browse all communities to find ones to join.</p>
              <button onClick={() => setTab('all')} style={{ background: '#0d0f14', border: '1px solid #2a2d35', borderRadius: 10, padding: '12px 24px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                🔍 Browse All Communities
              </button>
            </div>
          ) : (
            <div className="ch-grid">
              {(myCommunities || []).map((m: any) => (
                <div className="ch-card" key={m.communityId} onClick={() => navigate('/communities/' + m.communityId)}>
                  <div className="ccb" style={{ height: 180, background: (m.coverImage || m.cover || m.coverUrl || m.image) ? undefined : `linear-gradient(135deg,${getGradient(m.category || m.accentColor?.replace('#','') || '')})`, backgroundImage: (m.coverImage || m.cover || m.coverUrl || m.image) ? `url(${m.coverImage || m.cover || m.coverUrl || m.image})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }} />
                  <div className="cc-body" style={{ padding: '14px' }}>
                    <div className="cc-name" style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: 'flex', gap: 12 }}><span><i className="ti ti-users" /> {(m.memberCount || 0).toLocaleString()} members</span></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#191C6B' }}>View &rarr;</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'all' && (
        <>
          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
            <div className="ch-search" style={{ flex: 1, maxWidth: 'none' }}>
              <i className="ti ti-search" style={{ fontSize: 16, color: 'var(--text3)', marginLeft: 14 }} />
              <input placeholder="Search communities..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {['All', 'Active', 'New'].map(f => (
                <button key={f} className={`ch-pill ${filter === f.toLowerCase() ? 'active' : ''}`} onClick={() => setFilter(f.toLowerCase())} style={{ padding: '0 10px', fontSize: 11 }}>{f}</button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="ch-stats" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap',marginBottom:24}}>
            <div style={{display:'flex',alignItems:'baseline',gap:8}}>
              <span style={{fontSize:36,fontWeight:900,color:'var(--text)',fontFamily:'Outfit,sans-serif'}}>{stats?.total?.toLocaleString() || '0'}</span>
              <span style={{fontSize:13,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.08em'}}>TOTAL COMMUNITIES</span>
            </div>
            <div style={{display:'flex',gap:20,fontSize:12,color:'var(--text2)'}}>
              <span><i className="ti ti-users" style={{marginRight:4}} /> {stats?.members?.toLocaleString() || '0'} members</span>
              <span><i className="ti ti-checklist" style={{marginRight:4}} /> {stats?.tasks?.toLocaleString() || '0'} tasks</span>
            </div>
          </div>

          {/* Trending */}
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
                    {(trending || []).map(c => {
                      const cv = c.coverImage || c.cover || c.coverUrl || c.image
                      return (
                      <div className="ch-card" key={c.id} style={{ minWidth: 260 }} onClick={() => navigate('/communities/' + c.id)}>
                        <div className="ccb" style={{ height: 180, background: cv ? undefined : `linear-gradient(135deg,${getGradient(c.category)})`, backgroundImage: cv ? `url(${cv})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        <div className="cc-body" style={{ padding: '14px' }}>
                          <div className="cc-name" style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: 'flex', gap: 12 }}><span><i className="ti ti-users" /> {(c.memberCount || c.members || 0).toLocaleString()} members</span></div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#191C6B' }}>View &rarr;</span></div>
                        </div>
                      </div>
                    )})}
                  </div>
                </>
              )}

              <div className="sec-title">All Communities</div>
              <div className="sec-sub">Discover and join communities that match your interests</div>

              {communities.length === 0 ? (
                <div className="ch-empty"><i className="ti ti-users" style={{ fontSize: 32, marginBottom: 8, display: 'block', color: 'var(--text3)' }} />No communities found.</div>
              ) : (
                <div className="ch-grid">
                  {(communities || []).map(c => {
                    const cv = c.coverImage || c.cover || c.coverUrl || c.image
                    const cNew = c.createdAt && (Date.now() - new Date(c.createdAt).getTime()) < 7 * 86400000
                    return (
                    <div className="ch-card" key={c.id} onClick={() => navigate('/communities/' + c.id)}>
                      <div className="ccb" style={{ height: 180, background: cv ? undefined : `linear-gradient(135deg,${getGradient(c.category)})`, backgroundImage: cv ? `url(${cv})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                        {cNew && <span style={{ position: 'absolute', top: 10, right: 10, background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999 }}>New</span>}
                      </div>
                      <div className="cc-body" style={{ padding: '14px' }}>
                        <div className="cc-name" style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8, display: 'flex', gap: 12 }}>
                          <span><i className="ti ti-users" /> {(c.memberCount || c.members || 0).toLocaleString()} members</span>
                          {(c.taskCount || c.tasks || 0) > 0 && <span><i className="ti ti-checklist" /> {(c.taskCount || c.tasks || 0).toLocaleString()} challenges</span>}
                        </div>
                        {c.description && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</div>}
                        {(c.rewards || 0) > 0 && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>NGN {(c.rewards || 0).toLocaleString()} distributed</div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#191C6B' }}>View &rarr;</span></div>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </>
          )}
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Layout>
  )
}
