import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../lib/api'
import Layout from '../components/Layout'

export default function WorkerPortal() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const workspaceItems = [
    { icon: 'ti ti-brand-x', label: 'Social', route: '/worker/social', color: '#1F8CFF' },
    { icon: 'ti ti-pencil', label: 'Writing', route: '/worker/writing', color: '#7c3aed' },
    { icon: 'ti ti-photo', label: 'Design', route: '/worker/design', color: '#EC4899' },
    { icon: 'ti ti-device-mobile', label: 'App Testing', route: '/worker/testing', color: '#059669' },
    { icon: 'ti ti-search', label: 'Research', route: '/worker/research', color: '#d97706' },
    { icon: 'ti ti-code', label: 'Dev', route: '/worker/development', color: '#2563eb' },
  ]

  const navItems = [
    { icon: 'ti ti-building-store', label: 'My Store', route: '/my-store' },
    { icon: 'ti ti-article', label: 'My Blogs', route: '/blog' },
    { icon: 'ti ti-briefcase', label: 'My Work', route: '/my-tasks' },
    { icon: 'ti ti-message', label: 'Messages', route: '/messages' },
    { icon: 'ti ti-users', label: 'Communities', route: '/communities' },
    { icon: 'ti ti-file-check', label: 'My Submissions', route: '/my-tasks' },
    { icon: 'ti ti-pencil', label: 'Reviews to Write', route: '/tasks' },
    { icon: 'ti ti-star', label: 'My Reviews', route: '/profile' },
    { icon: 'ti ti-eye', label: 'View My Profile', route: '/profile' },
  ]

  const [stats, setStats] = useState([
    { icon: 'ti ti-star', color: '#191C6B', count: 0, label: 'Reviews' },
    { icon: 'ti ti-zap', color: '#F59E0B', count: 0, label: 'Challenges Participated' },
    { icon: 'ti ti-trophy', color: '#16a34a', count: 0, label: 'Won' },
    { icon: 'ti ti-heart', color: '#EC4899', count: 0, label: 'Compliments' },
    { icon: 'ti ti-users', color: '#191C6B', count: 0, label: 'Communities' },
    { icon: 'ti ti-gift', color: '#191C6B', count: 0, label: 'Tips Received' },
    { icon: 'ti ti-file-text', color: '#F59E0B', count: 0, label: 'Blogs' },
  ])

  useEffect(() => {
    async function loadWorkerStats() {
      try {
        const token = localStorage.getItem('ogapay_access_token')
        if (!token) return
        const headers = { 'Authorization': 'Bearer ' + token }

        const [sumRes, subRes, commRes] = await Promise.all([
          fetch(API_BASE + '/dashboard/summary', { headers }).catch(() => null),
          fetch(API_BASE + '/tasks/my/submissions', { headers }).catch(() => null),
          fetch(API_BASE + '/communities/mine/list', { headers }).catch(() => null),
        ])

        // Parse dashboard summary
        let submissions = 0, reviews = 0
        if (sumRes && sumRes.ok) {
          const sumJson = await sumRes.json()
          if (sumJson.success && sumJson.data) {
            submissions = sumJson.data.metrics?.submissions || 0
          }
        }

        // Parse submissions for stats
        let approved = 0, rejected = 0, pending = 0
        if (subRes && subRes.ok) {
          const subJson = await subRes.json()
          const subs = subJson.data || subJson.submissions || []
          if (Array.isArray(subs)) {
            subs.forEach((s: any) => {
              if (s.status === 'APPROVED') approved++
              else if (s.status === 'REJECTED') rejected++
              else pending++
            })
          }
        }

        // Parse communities
        let communities = 0
        if (commRes && commRes.ok) {
          const commJson = await commRes.json()
          const comms = commJson.data || []
          if (Array.isArray(comms)) communities = comms.length
        }

        setStats([
          { icon: 'ti ti-star', color: '#191C6B', count: reviews || 0, label: 'Reviews' },
          { icon: 'ti ti-zap', color: '#F59E0B', count: submissions || 0, label: 'Tasks Done' },
          { icon: 'ti ti-trophy', color: '#16a34a', count: approved || 0, label: 'Approved' },
          { icon: 'ti ti-heart', color: '#EC4899', count: pending || 0, label: 'Pending Review' },
          { icon: 'ti ti-users', color: '#191C6B', count: communities || 0, label: 'Communities' },
          { icon: 'ti ti-gift', color: '#191C6B', count: 0, label: 'Tips Received' },
          { icon: 'ti ti-file-text', color: '#F59E0B', count: 0, label: 'Blogs' },
        ])
      } catch (e) {
        console.warn('Failed to load worker stats:', e)
      }
    }
    loadWorkerStats()
    const onFocus = () => loadWorkerStats()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authUser])

  return (
    <Layout>
      <style>{`
        .wp-page{max-width:800px;margin:0 auto;padding:0 0 40px}
        .wp-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--border);margin-bottom:24px}
        .wp-nav-grid-2{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border);margin-bottom:24px}
        .wp-workspace-label{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;display:flex;align-items:center;gap:6px}
        .wp-workspace-grid{display:grid;grid-template-columns:repeat(6,1fr);margin-bottom:24px;gap:8px}
        .wp-ws-tile{
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:14px 6px;gap:8px;cursor:pointer;
          border:1px solid var(--border);border-radius:10px;
          transition:all .2s;min-height:76px;background:var(--card);
        }
        .wp-ws-tile:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.06)}
        .wp-ws-tile i{font-size:20px}
        .wp-ws-tile span{font-size:10px;color:var(--text3);text-align:center;line-height:1.2;font-weight:600}
        @media(max-width:700px){.wp-workspace-grid{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:400px){.wp-workspace-grid{grid-template-columns:repeat(2,1fr)}}
        .wp-nav-tile{
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:20px 8px;gap:10px;cursor:pointer;
          border-right:1px solid var(--border);
          transition:all .15s;min-height:90px;
        }
        .wp-nav-tile:hover{background:var(--bg2)}
        .wp-nav-tile:last-child{border-right:none}
        .wp-nav-tile i{font-size:26px;color:var(--text3);transition:color .15s}
        .wp-nav-tile:hover i{color:var(--accent)}
        .wp-nav-tile span{font-size:11px;color:var(--text3);text-align:center;line-height:1.3;font-weight:600}
        .wp-bread{font-size:12px;color:var(--text3);margin-bottom:12px;display:flex;align-items:center;gap:6px}
        .wp-bread span{cursor:pointer;color:var(--text2)}
        .wp-bread span:hover{color:var(--accent)}
        .wp-bread .current{color:var(--text2);font-weight:600}
        .wp-hero h1{font-size:22px;font-weight:800;margin:0 0 16px;color:var(--text)}
        .wp-stats-row{display:flex;gap:20px;margin-bottom:24px;flex-wrap:wrap}
        .wp-stats-row span{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text3)}
        .wp-stats-row i{font-size:14px;color:var(--text3)}
        .wp-profile-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px}
        .wp-profile-top{display:flex;align-items:flex-start;gap:16px}
        .wp-avatar-box{width:72px;height:72px;border-radius:10px;background:var(--bg2);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--border)}
        .wp-avatar-box i{font-size:32px;color:var(--text3)}
        .wp-profile-info{flex:1;min-width:0}
        .wp-profile-name{font-size:18px;font-weight:800;color:var(--text);display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
        .wp-edit-btn{
          font-size:12px;padding:7px 14px;border-radius:8px;
          border:1px solid var(--border);background:var(--bg2);color:var(--text2);
          cursor:pointer;display:inline-flex;align-items:center;gap:6px;
          font-family:inherit;font-weight:600;white-space:nowrap;transition:all .15s;
        }
        .wp-edit-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--card)}
        .wp-bio-box{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px;margin-top:14px}
        .wp-bio-label{font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.06em;margin-bottom:6px;text-transform:uppercase}
        .wp-bio-text{font-size:13px;color:var(--text2);line-height:1.5}
        .wp-stats-list{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
        .wp-stat-row{
          display:flex;align-items:center;gap:14px;
          padding:15px 18px;border-bottom:1px solid var(--border);
          transition:background .15s;
        }
        .wp-stat-row:last-child{border-bottom:none}
        .wp-stat-row:hover{background:var(--bg2)}
        .wp-stat-icon{font-size:20px;width:24px;text-align:center}
        .wp-stat-count{font-size:16px;font-weight:800;color:var(--text);min-width:30px}
        .wp-stat-label{font-size:14px;color:var(--text2);font-weight:500}
        @media(max-width:600px){
          .wp-nav-grid{grid-template-columns:repeat(3,1fr)}
          .wp-nav-grid-2{grid-template-columns:repeat(3,1fr)}
          .wp-profile-top{flex-direction:column;align-items:center;text-align:center}
          .wp-profile-name{flex-direction:column;align-items:center}
          .wp-avatar-box{width:64px;height:64px}
        }
      `}</style>

      <div className="wp-page">
        {/* Navigation Tiles */}
        <div className="wp-nav-grid">
          {navItems.slice(0, 5).map((t, i) => (
            <div key={i} className="wp-nav-tile" onClick={() => navigate(t.route)} style={{ borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <i className={t.icon} />
              <span>{t.label}</span>
            </div>
          ))}
        </div>
        <div className="wp-nav-grid-2">
          {navItems.slice(5).map((t, i) => (
            <div key={i} className="wp-nav-tile" onClick={() => navigate(t.route)} style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <i className={t.icon} />
              <span>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Workspaces */}
        <div className="wp-workspace-label"><i className="ti ti-layout-grid" style={{fontSize:12}} /> Workspaces</div>
        <div className="wp-workspace-grid">
          {workspaceItems.map((w, i) => (
            <div key={i} className="wp-ws-tile" onClick={() => navigate(w.route)}>
              <i className={w.icon} style={{ color: w.color }} />
              <span>{w.label}</span>
            </div>
          ))}
        </div>

        {/* Breadcrumb */}
        <div className="wp-bread">
          <span onClick={() => navigate('/store')}>Dashboard</span>
          <i className="ti ti-chevron-right" style={{ fontSize: 10, color: 'var(--border2)' }} />
          <span className="current">Worker Portal</span>
        </div>

        {/* Welcome */}
        <div className="wp-hero">
          <h1>Welcome back</h1>
        </div>

        {/* Stats Summary */}
        <div className="wp-stats-row">
          <span><i className="ti ti-star" /> No wins yet</span>
          <span><i className="ti ti-users" /> No communities</span>
          <span><i className="ti ti-heart" /> No compliments</span>
        </div>


        {/* Profile Card */}
        <div className="wp-profile-card">
          <div className="wp-profile-top">
            <div className="wp-avatar-box">
              <i className="ti ti-user" />
            </div>
            <div className="wp-profile-info">
              <div className="wp-profile-name">
                No nickname yet
                <button className="wp-edit-btn" onClick={() => navigate('/edit-profile')}>
                  <i className="ti ti-pencil" style={{ fontSize: 13 }} /> Edit Profile
                </button>
              </div>
            </div>
          </div>
          <div className="wp-bio-box">
            <div className="wp-bio-label">Bio</div>
            <div className="wp-bio-text">No bio yet. Add one to tell others about yourself!</div>
          </div>
        </div>

        {/* Statistics List */}
        <div className="wp-stats-list">
          {stats.map((s, i) => (
            <div key={i} className="wp-stat-row">
              <i className={`${s.icon} wp-stat-icon`} style={{ color: s.color }} />
              <span className="wp-stat-count">{s.count}</span>
              <span className="wp-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
