import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE } from '../lib/api'

const WORKSPACES: Record<string, { label: string; icon: string; desc: string; color: string }> = {
  social: { label: 'Social Workspace', icon: 'brand-x', desc: 'Social media tasks — follows, likes, shares, comments', color: '#1F8CFF' },
  writing: { label: 'Writing Workspace', icon: 'pencil', desc: 'Content writing, copywriting, translations, articles', color: '#7c3aed' },
  design: { label: 'Design Workspace', icon: 'photo', desc: 'Graphic design, UI/UX, video editing, animations', color: '#EC4899' },
  testing: { label: 'App Testing Workspace', icon: 'device-mobile', desc: 'App testing, QA, beta testing, bug reporting', color: '#059669' },
  research: { label: 'Research Workspace', icon: 'search', desc: 'Web research, data collection, market analysis', color: '#d97706' },
  development: { label: 'Dev Workspace', icon: 'code', desc: 'Software development, smart contracts, automation', color: '#2563eb' },
}

const CATEGORY_MAP: Record<string, string> = {
  social: 'Social',
  writing: 'Content',
  design: 'Design',
  testing: 'Testing',
  research: 'Research',
  development: 'Development',
}

export default function WorkerWorkspace() {
  const { category } = useParams()
  const navigate = useNavigate()
  const ws = category ? WORKSPACES[category] : null
  const apiCategory = category ? CATEGORY_MAP[category] : null
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ws || !apiCategory) { setLoading(false); return }
    ;(async () => {
      try {
        const res = await fetch(API_BASE + '/tasks?category=' + encodeURIComponent(apiCategory))
        const json = await res.json()
        if (json.success) {
          setTasks(Array.isArray(json.data) ? json.data : json.data?.tasks || json.data?.data || [])
        } else {
          setTasks([])
        }
      } catch { setError('Failed to load tasks') }
      setLoading(false)
    })()
  }, [category])

  if (!ws) {
    return (
      <Layout>
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Workspace not found</h2>
          <p style={{ fontSize: 14, color: 'var(--text3)', margin: '0 0 20px' }}>Available: Social, Writing, Design</p>
          <button onClick={() => navigate('/worker-portal')} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Back to Worker Portal</button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <style>{`
        .ws-header{background:${ws.color};padding:36px 32px;border-radius:16px;margin-bottom:24px;color:#fff}
        .ws-header h1{font-size:28px;font-weight:900;margin:0 0 6px}
        .ws-header p{font-size:14px;opacity:.85;margin:0}
        .ws-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
        .ws-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;cursor:pointer;transition:all .2s}
        .ws-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08);transform:translateY(-2px)}
        .ws-card-title{font-size:15px;font-weight:700;color:var(--text);margin:0 0 6px}
        .ws-card-meta{font-size:12px;color:var(--text3);display:flex;gap:12px;flex-wrap:wrap}
        .ws-card-reward{font-size:16px;font-weight:800;color:${ws.color}}
        .ws-empty{padding:60px 24px;text-align:center;color:var(--text3)}
        @media(max-width:600px){.ws-header{padding:24px 20px}.ws-header h1{font-size:22px}.ws-grid{grid-template-columns:1fr}}
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 0' }}>
        <div className="ws-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <i className={`ti ti-${ws.icon}`} style={{ fontSize: 24 }} />
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', opacity: .8 }}>WORKSPACE</span>
          </div>
          <h1>{ws.label}</h1>
          <p>{ws.desc}</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: ws.color, borderRadius: '50%', animation: 'spin .6s linear infinite', margin: '0 auto 12px' }} />
            Loading tasks...
          </div>
        ) : error ? (
          <div className="ws-empty"><i className="ti ti-alert-circle" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />{error}</div>
        ) : tasks.length === 0 ? (
          <div className="ws-empty">
            <i className="ti ti-briefcase-off" style={{ fontSize: 40, display: 'block', marginBottom: 12, color: 'var(--text3)' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)', margin: '0 0 4px' }}>No {ws.label} tasks yet</h3>
            <p style={{ fontSize: 13, margin: '0 0 16px' }}>Check back later or browse other categories.</p>
            <button onClick={() => navigate('/tasks?category=' + apiCategory)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: ws.color, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Browse All Tasks</button>
          </div>
        ) : (
          <div className="ws-grid">
            {tasks.map((task: any) => (
              <div key={task.id || task._id} className="ws-card" onClick={() => navigate('/tasks/' + (task.id || task._id))}>
                <div className="ws-card-title">{task.title}</div>
                <div className="ws-card-reward">{task.reward ? `${task.reward} ${task.currency || 'SOL'}` : 'See reward'}</div>
                <div className="ws-card-meta">
                  {task.category && <span><i className="ti ti-tag" style={{fontSize:11}} /> {task.category}</span>}
                  {task.maxWorkers && <span><i className="ti ti-users" style={{fontSize:11}} /> {task.maxWorkers} slots</span>}
                  {task.status && <span style={{color: task.status === 'OPEN' ? '#16a34a' : 'var(--text3)'}}>{task.status}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
