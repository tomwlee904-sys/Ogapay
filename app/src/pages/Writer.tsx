// @ts-nocheck
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

const Icon = ({ n, s = 18, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
)

const templateIcons: Record<string, string> = {
  'Content Writing': 'edit',
  'Social Media': 'messages',
  'Graphic Design': 'photo',
  'Video Editing': 'video',
  'Data Entry': 'database',
  Research: 'search',
  'Web Development': 'code',
  Testing: 'bug',
  Community: 'users',
  Translation: 'language',
  Other: 'file-text',
}

export default function Writer() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<any[]>([])
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [tasksRes] = await Promise.all([
          apiRequest<any>('/tasks?limit=10&sortBy=createdAt&sortOrder=desc'),
        ])
        const tasks = Array.isArray(tasksRes) ? tasksRes : tasksRes?.data || tasksRes?.tasks || []

        const cats = new Map<string, number>()
        tasks.forEach(t => {
          const cat = t.category || 'Other'
          cats.set(cat, (cats.get(cat) || 0) + 1)
        })
        setTemplates(Array.from(cats.entries()).map(([cat, count]) => ({
          id: cat,
          title: cat.replace(/_/g, ' '),
          icon: templateIcons[cat] || 'file-text',
          tasks: count,
        })))

        setRecentJobs(tasks.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          budget: `${t.currency || 'NGN'} ${Number(t.reward || 0).toLocaleString()}`,
          slots: t.maxWorkers || t.remainingSlots || '—',
          time: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—',
        })))
      } catch {}
      setLoading(false)
    })()
  }, [])

  return (
    <Layout>
      <style>{`
        .wr-page{max-width:900px;margin:0 auto;padding:0 0 40px}
        .wr-hero{background:linear-gradient(135deg,#191C6B,#191C6B);border-radius:16px;padding:36px 32px;margin-bottom:28px;color:#fff}
        .wr-hero h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0 0 6px}
        .wr-hero p{font-size:14px;opacity:.85;margin:0;line-height:1.6;max-width:500px}
        .wr-section{margin-bottom:28px}
        .wr-section h2{font-family:Outfit;font-size:18px;font-weight:800;margin:0 0 14px;display:flex;align-items:center;gap:8px}
        .wr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
        .wr-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;transition:all .2s;cursor:pointer}
        .wr-card:hover{transform:translateY(-2px);border-color:var(--accent)}
        .wr-card-icon{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;margin-bottom:10px}
        .wr-card h3{font-size:14px;font-weight:800;margin:0 0 4px}
        .wr-card p{font-size:12px;color:var(--text2);margin:0 0 8px}
        .wr-card .meta{font-size:11px;color:var(--text3);display:flex;gap:12px}
        .wr-list{display:grid;gap:10px}
        .wr-list-item{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all .2s}
        .wr-list-item:hover{border-color:var(--accent)}
        .wr-list-item .l-title{font-size:13px;font-weight:700;margin-bottom:4px}
        .wr-list-item .l-meta{font-size:11px;color:var(--text3);display:flex;gap:10px}
        .wr-loading{text-align:center;padding:48px;color:var(--text2);display:flex;align-items:center;justify-content:center;gap:8px}
      `}</style>

      <div className="wr-page">
        <div className="wr-hero">
          <h1><Icon n="edit" s={24} c="#fff" /> Writer Workspace</h1>
          <p>Find writing tasks, manage your content projects, and earn from your words. Browse available writing jobs or create your own.</p>
        </div>

        {loading ? (
          <div className="wr-loading"><span className="spinner" /> Loading...</div>
        ) : (
          <>
            <div className="wr-section">
              <h2><Icon n="template" s={18} /> Active Categories</h2>
              <div className="wr-grid">
                {templates.map(t => (
                  <div className="wr-card" key={t.id} onClick={() => navigate('/tasks')}>
                    <div className="wr-card-icon" style={{background:'#191C6B18',color:'#191C6B'}}><i className={`ti ti-${t.icon}`} style={{fontSize:20}} /></div>
                    <h3>{t.title}</h3>
                    <p>{t.tasks} task{t.tasks !== 1 ? 's' : ''} available</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="wr-section">
              <h2><Icon n="clock" s={18} /> Recent Tasks</h2>
              <div className="wr-list">
                {recentJobs.map(j => (
                  <div className="wr-list-item" key={j.id} onClick={() => navigate(`/tasks/${j.id}`)}>
                    <div>
                      <div className="l-title">{j.title}</div>
                      <div className="l-meta">
                        <span><i className="ti ti-coin" /> {j.budget}</span>
                        <span><i className="ti ti-users" /> {j.slots} slots</span>
                        <span>{j.time}</span>
                      </div>
                    </div>
                    <i className="ti ti-arrow-right" style={{color:'var(--text3)',fontSize:16}} />
                  </div>
                ))}
                {recentJobs.length === 0 && (
                  <div style={{textAlign:'center',padding:24,color:'var(--text2)',fontSize:13}}>No recent tasks found</div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="wr-section">
          <h2><Icon n="book" s={18} /> Writing Resources</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[
              { icon: 'file-text', title: 'Style Guide', desc: 'OgaPay writing standards' },
              { icon: 'bookmark', title: 'Tips & Tricks', desc: 'Write better, earn more' },
              { icon: 'messages', title: 'Writer Community', desc: 'Join other writers' },
              { icon: 'help-circle', title: 'FAQ', desc: 'Common writing questions' },
            ].map(r => (
              <div className="wr-card" key={r.title} onClick={() => navigate('/faq')}>
                <div className="wr-card-icon" style={{background:'var(--bg2)',color:'var(--text2)'}}><i className={`ti ti-${r.icon}`} style={{fontSize:18}} /></div>
                <h3>{r.title}</h3>
                <p>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
