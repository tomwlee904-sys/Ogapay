import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

const STATUS_MAP: Record<string, string> = {
  APPLIED: 'In Progress',
  PENDING: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

const COLOR_MAP: Record<string, string> = {
  APPLIED: '#191C6B',
  PENDING: '#F59E0B',
  APPROVED: '#16a34a',
  REJECTED: '#DC2626',
}

const PROGRESS_MAP: Record<string, number> = {
  APPLIED: 40,
  PENDING: 70,
  APPROVED: 100,
  REJECTED: 100,
}

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'in progress', label: 'In Progress' },
  { id: 'under review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.floor(hrs / 24)
  return days + 'd ago'
}

export default function MyTasks() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const token = localStorage.getItem('ogapay_access_token')
        if (!token) { setLoading(false); return }
        const res = await fetch(API_BASE + '/tasks/my/submissions', {
          headers: { 'Authorization': 'Bearer ' + token },
        })
        const json = await res.json()
        if (json.success && json.data) {
          setSubmissions(json.data)
        }
      } catch {
        const el = document.getElementById('appToast')
        if (el) { el.textContent = 'Failed to load submissions'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
      } finally { setLoading(false) }
    }
    fetchSubmissions()
  }, [])

  const filtered = tab === 'all'
    ? submissions
    : submissions.filter(s => {
        const display = STATUS_MAP[s.status] || s.status
        return display.toLowerCase() === tab
      })

  return (
    <Layout>
      <style>{`
        .mt-hero{margin-bottom:20px}
        .mt-hero h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0 0 4px}
        .mt-hero p{color:var(--text2);font-size:14px;margin:0}
        .mt-tabs{display:flex;gap:4px;margin-bottom:14px;flex-wrap:wrap}
        .mt-tab{padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}
        .mt-tab:hover,.mt-tab.active{border-color:var(--accent);color:var(--accent);background:rgba(31,140,255,.08)}
        .mt-list{display:grid;gap:6px}
        .mt-item{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:12px;transition:all .2s}
        .mt-item:hover{border-color:var(--border2)}
        .mt-icon{width:36px;height:36px;border-radius:9px;display:grid;place-items:center;flex-shrink:0;font-size:16px}
        .mt-info{flex:1;min-width:0}
        .mt-title{font-weight:700;font-size:13px;margin-bottom:4px}
        .mt-progress{height:4px;border-radius:2px;background:var(--bg2);overflow:hidden;margin-bottom:4px;max-width:200px}
        .mt-progress .mt-pf{height:100%;border-radius:2px;transition:width .3s}
        .mt-meta{font-size:11px;color:var(--text3);display:flex;gap:10px}
        .mt-right{text-align:right;flex-shrink:0}
        .mt-reward{font-weight:700;font-size:14px;margin-bottom:4px}
        .mt-status{padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700;display:inline-block}
        .mt-empty{text-align:center;padding:48px 20px;color:var(--text2)}
        .mt-empty i{font-size:36px;color:var(--text3);margin-bottom:12px;display:block}
      `}</style>

      <div className="mt-hero">
        <h1>My Tasks</h1>
        <p>Track your submitted tasks and their status</p>
      </div>

      <div className="mt-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`mt-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="mt-empty">
          <i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} />
          <p style={{fontSize:13,margin:0}}>Loading your submissions...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-empty">
          <i className="ti ti-checklist" />
          <h3 style={{fontFamily:'Outfit',fontWeight:800,margin:'0 0 4px',color:'var(--text)'}}>No submissions yet</h3>
          <p style={{fontSize:13,margin:0}}>Apply to tasks and submit your work to see them here</p>
          <a href="/tasks" style={{display:'inline-flex',marginTop:12,height:36,padding:'0 16px',borderRadius:8,border:0,background:'var(--accent)',color:'#fff',fontWeight:700,fontSize:12,alignItems:'center',gap:6,textDecoration:'none'}}>Browse Tasks</a>
        </div>
      ) : (
        <div className="mt-list">
          {filtered.map((s: any) => {
            const status = STATUS_MAP[s.status] || s.status
            const color = COLOR_MAP[s.status] || '#191C6B'
            const progress = PROGRESS_MAP[s.status] || 50
            return (
              <div className="mt-item" key={s.id} onClick={() => navigate('/tasks/' + (s.task?.id || s.taskId))} style={{cursor:'pointer'}}>
                <div className="mt-icon" style={{background: `${color}15`, color}}>
                  <i className="ti ti-file-text" />
                </div>
                <div className="mt-info">
                  <div className="mt-title">{s.task?.title || 'Task'}</div>
                  <div className="mt-progress">
                    <div className="mt-pf" style={{width: progress + '%', background: color}} />
                  </div>
                  <div className="mt-meta">
                    <span>{timeAgo(s.createdAt)}</span>
                    <span>{progress}% complete</span>
                  </div>
                </div>
                <div className="mt-right">
                  <div className="mt-reward">{s.task?.currency || 'NGN'} {Number(s.task?.reward || 0).toLocaleString()}</div>
                  <span className="mt-status" style={{background: `${color}15`, color}}>{status}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Layout>
  )
}
