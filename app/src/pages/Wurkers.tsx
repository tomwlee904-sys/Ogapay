// @ts-nocheck
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

const Icon = ({ n, s = 18, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
)

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function Wurkers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('rating')
  const [workers, setWorkers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: '50' })
        if (search.trim()) params.set('search', search.trim())
        params.set('sort', sort)
        const res = await apiRequest(`/store/workers?${params}`)
        setWorkers(Array.isArray(res) ? res : res?.data || [])
      } catch { setWorkers([]) }
      setLoading(false)
    })()
  }, [search, sort])

  return (
    <Layout>
      <style>{`
        .wk-page{max-width:900px;margin:0 auto;padding:0 0 40px}
        .wk-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
        .wk-head h1{font-family:Outfit;font-size:24px;font-weight:900;margin:0}
        .wk-head p{color:var(--text2);font-size:13px;margin:4px 0 0}
        .wk-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        .wk-search{height:40px;padding:0 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--card);color:var(--text);font-size:13px;outline:none;min-width:200px}
        .wk-search:focus{border-color:var(--accent)}
        .wk-sort{height:40px;padding:0 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--card);color:var(--text);font-size:12px;font-weight:600;cursor:pointer}
        .wk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
        .wk-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;cursor:pointer;transition:all .2s}
        .wk-card:hover{transform:translateY(-2px);border-color:var(--accent)}
        .wk-avatar{width:44px;height:44px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:14px;font-weight:800;flex-shrink:0;overflow:hidden}
        .wk-avatar img{width:100%;height:100%;object-fit:cover}
        .wk-card-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .wk-card-name{font-weight:700;font-size:14px}
        .wk-card-handle{font-size:12px;color:var(--text2)}
        .wk-card-skills{font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.4}
        .wk-card-stats{display:flex;gap:14px;font-size:11px;color:var(--text3);border-top:1px solid var(--border);padding-top:10px}
        .wk-card-stats span{display:flex;align-items:center;gap:4px}
        .avail-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px}
        .avail-dot.on{background:#16a34a}
        .avail-dot.off{background:#a1a1aa}
        .wk-empty{text-align:center;padding:48px;color:var(--text3)}
        .wk-loading{text-align:center;padding:48px;color:var(--text3);display:flex;align-items:center;justify-content:center;gap:8px}
      `}</style>

      <div className="wk-page">
        <div className="wk-head">
          <div>
            <h1><Icon n="users" s={24} /> Wurkers Directory</h1>
            <p>Browse verified workers available for tasks on OgaPay</p>
          </div>
        </div>

        <div className="wk-controls" style={{marginBottom:20}}>
          <input className="wk-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, username or skills..." />
          <select className="wk-sort" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="rating">Top Rated</option>
            <option value="active">Most Tasks</option>
            <option value="reputation">Highest Reputation</option>
          </select>
        </div>

        {loading ? (
          <div className="wk-loading"><span className="spinner" /> Loading workers...</div>
        ) : workers.length === 0 ? (
          <div className="wk-empty"><Icon n="users" s={32} c="var(--text3)" /><p>No workers found</p></div>
        ) : (
          <div className="wk-grid">
            {(workers || []).map(w => {
              const name = w.username || w.name || 'Worker'
              const initials = getInitials(name)
              const skills = Array.isArray(w.skills) ? w.skills.join(', ') : w.skills || 'General'
              return (
                <div className="wk-card" key={w.id} onClick={() => navigate('/profile')}>
                  <div className="wk-card-top">
                    <div className="wk-avatar">
                      {w.avatarUrl ? <img src={w.avatarUrl} alt={name} /> : initials}
                    </div>
                    <div>
                      <div className="wk-card-name">{name}</div>
                      <div className="wk-card-handle">@{w.username || name.toLowerCase().replace(/\s+/g, '_')}</div>
                    </div>
                  </div>
                  <div className="wk-card-skills">{skills}</div>
                  <div className="wk-card-stats">
                    <span><i className="ti ti-star" style={{color:'#f5b301'}} /> {w.rating || w.avgRating || '-'}</span>
                    <span><i className="ti ti-checklist" /> {w.tasksCompleted || 0} tasks</span>
                    <span><i className="ti ti-coin" /> {w.earnings ? `NGN ${Number(w.earnings).toLocaleString()}` : '—'}</span>
                  </div>
                  <div style={{marginTop:8,fontSize:11}}>
                    <span className={`avail-dot ${w.isAvailable ? 'on' : 'off'}`} />
                    {w.isAvailable ? 'Available for hire' : 'Not available'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
