import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import TaskCard from '../components/TaskCard'

const CATEGORIES = [
  { key: 'social', icon: 'ti ti-brand-twitter', label: 'Social Tasks', color: '#0ea5e9', bg: '#0ea5e915' },
  { key: 'writing', icon: 'ti ti-pencil', label: 'Writing', color: '#2563EB', bg: '#2563EB15' },
  { key: 'design', icon: 'ti ti-brush', label: 'Design', color: '#7c3aed', bg: '#7c3aed15' },
  { key: 'app-testing', icon: 'ti ti-device-mobile', label: 'App Testing', color: '#f59e0b', bg: '#f59e0b15' },
  { key: 'research', icon: 'ti ti-search', label: 'Research', color: '#16a34a', bg: '#16a34a15' },
  { key: 'dev', icon: 'ti ti-code', label: 'Dev Tasks', color: '#191C6B', bg: '#191C6B15' },
]

export default function WorkspacePortal() {
  const { category } = useParams()
  const navigate = useNavigate()
  const cat = CATEGORIES.find(c => c.key === category)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cat) { navigate('/worker-portal', { replace: true }); return }
    async function load() {
      try {
        const data = await apiRequest(`/tasks?category=${cat.key}&status=ACTIVE`)
        setTasks(Array.isArray(data) ? data : data?.tasks || [])
      } catch {}
      setLoading(false)
    }
    load()
  }, [cat, navigate])

  if (!cat) return null

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 30) return `${days}d ago`
    return new Date(d).toLocaleDateString()
  }

  return (
    <Layout>
      <style>{`
        .wp-hero{background:${cat.bg};border:1px solid ${cat.color}22;border-radius:14px;padding:24px 28px;margin-bottom:24px;display:flex;align-items:center;gap:16px}
        .wp-hero-icon{width:48px;height:48px;border-radius:12px;background:${cat.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .wp-hero-icon i{font-size:24px;color:${cat.color}}
        .wp-hero-info h1{font-size:20px;font-weight:800;margin:0 0 4px;color:var(--text)}
        .wp-hero-info p{font-size:13px;color:var(--text2);margin:0}
        .wp-task-list{display:flex;flex-direction:column;gap:10px}
        .wp-task-card{display:flex;align-items:center;gap:14px;padding:16px 18px;background:var(--card);border:1px solid var(--border);border-radius:12px;transition:all .2s}
        .wp-task-card:hover{border-color:${cat.color}44;transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.06)}
        .wp-task-info{flex:1;min-width:0}
        .wp-task-info h3{font-size:14px;font-weight:700;margin:0 0 4px;color:var(--text)}
        .wp-task-meta{display:flex;align-items:center;gap:12px;font-size:12px;color:var(--text3)}
        .wp-task-meta i{font-size:13px}
        .wp-task-reward{font-size:15px;font-weight:800;color:${cat.color};white-space:nowrap}
        .wp-task-apply{padding:8px 18px;border:0;border-radius:8px;background:${cat.color};color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;transition:opacity .2s}
        .wp-task-apply:hover{opacity:.85}
        .wp-empty{text-align:center;padding:60px 20px;color:var(--text3);font-size:14px}
        .wp-loading{text-align:center;padding:60px 20px;color:var(--text3);display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px}
        .wp-bread{font-size:12px;color:var(--text3);margin-bottom:16px;display:flex;align-items:center;gap:6px}
        .wp-bread span{cursor:pointer;color:var(--text2)}
        .wp-bread span:hover{color:var(--accent)}
        .wp-bread .current{color:var(--text2);font-weight:600}
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 0 40px' }}>
        {/* Breadcrumb */}
        <div className="wp-bread">
          <span onClick={() => navigate('/worker-portal')}>Worker Portal</span>
          <i className="ti ti-chevron-right" style={{ fontSize: 10, color: 'var(--border2)' }} />
          <span className="current">{cat.label}</span>
        </div>

        {/* Hero */}
        <div className="wp-hero">
          <div className="wp-hero-icon"><i className={cat.icon} /></div>
          <div className="wp-hero-info">
            <h1>{cat.label}</h1>
            <p>Browse and apply to available {cat.label.toLowerCase()} tasks</p>
          </div>
        </div>

        {/* Tasks */}
        {loading ? (
          <div className="wp-loading"><span className="spinner" /> Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="wp-empty">No tasks available in this category yet</div>
        ) : (
          <div className="wp-task-list">
            {tasks.map((t: any) => (
              <TaskCard key={t.id || t._id} task={t} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
