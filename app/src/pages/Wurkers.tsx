// @ts-nocheck
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const Icon = ({ n, s = 18, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
)

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

const sampleWorkers = [
  { id: '1', name: 'Chioma Okafor', username: 'chioma_o', skills: 'Content Writing, Social Media', rating: 4.8, tasks: 127, earnings: 'NGN 45,200', avatar: 'CO', available: true },
  { id: '2', name: 'Emeka Nwosu', username: 'emeka_n', skills: 'Graphic Design, Video Editing', rating: 4.6, tasks: 89, earnings: 'NGN 32,100', avatar: 'EN', available: true },
  { id: '3', name: 'Blessing Adeyemi', username: 'blessing_a', skills: 'Data Entry, Research', rating: 4.9, tasks: 203, earnings: 'NGN 67,800', avatar: 'BA', available: true },
  { id: '4', name: 'Tunde Balogun', username: 'tunde_b', skills: 'Web Development, Testing', rating: 4.5, tasks: 56, earnings: 'NGN 18,400', avatar: 'TB', available: false },
  { id: '5', name: 'Aisha Mohammed', username: 'aisha_m', skills: 'Copywriting, Translation', rating: 4.7, tasks: 145, earnings: 'NGN 52,600', avatar: 'AM', available: true },
  { id: '6', name: 'David Eze', username: 'david_e', skills: 'Community Management, Moderation', rating: 4.4, tasks: 78, earnings: 'NGN 24,500', avatar: 'DE', available: true },
]

export default function Wurkers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('rating')

  const filtered = sampleWorkers
    .filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.username.toLowerCase().includes(search.toLowerCase()) || w.skills.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'tasks' ? b.tasks - a.tasks : sort === 'earnings' ? parseFloat(b.earnings.replace(/[^0-9]/g,'')) - parseFloat(a.earnings.replace(/[^0-9]/g,'')) : b.rating - a.rating)

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
        .wk-avatar{width:44px;height:44px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:14px;font-weight:800;flex-shrink:0}
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
            <option value="tasks">Most Tasks</option>
            <option value="earnings">Highest Earnings</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="wk-empty"><Icon n="users" s={32} c="var(--text3)" /><p>No workers found</p></div>
        ) : (
          <div className="wk-grid">
            {filtered.map(w => (
              <div className="wk-card" key={w.id} onClick={() => navigate('/profile')}>
                <div className="wk-card-top">
                  <div className="wk-avatar">{w.avatar}</div>
                  <div>
                    <div className="wk-card-name">{w.name}</div>
                    <div className="wk-card-handle">@{w.username}</div>
                  </div>
                </div>
                <div className="wk-card-skills">{w.skills}</div>
                <div className="wk-card-stats">
                  <span><i className="ti ti-star" style={{color:'#f5b301'}} /> {w.rating}</span>
                  <span><i className="ti ti-checklist" /> {w.tasks} tasks</span>
                  <span><i className="ti ti-coin" /> {w.earnings}</span>
                </div>
                <div style={{marginTop:8,fontSize:11}}>
                  <span className={`avail-dot ${w.available ? 'on' : 'off'}`} />
                  {w.available ? 'Available for hire' : 'Not available'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
