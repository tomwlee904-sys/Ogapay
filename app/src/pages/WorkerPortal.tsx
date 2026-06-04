import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const navItems = [
  { icon: 'ti ti-building-store', label: 'My Store' },
  { icon: 'ti ti-article', label: 'My Blogs' },
  { icon: 'ti ti-briefcase', label: 'My Work' },
  { icon: 'ti ti-message', label: 'Messages' },
  { icon: 'ti ti-users', label: 'Communities' },
  { icon: 'ti ti-file-check', label: 'My Submissions' },
  { icon: 'ti ti-pencil', label: 'Reviews to Write' },
  { icon: 'ti ti-star', label: 'My Reviews' },
  { icon: 'ti ti-eye', label: 'View My Profile' },
]

const stats = [
  { icon: 'ti ti-star', color: '#1F8CFF', count: 124, label: 'Reviews' },
  { icon: 'ti ti-zap', color: '#F59E0B', count: 8, label: 'Challenges Participated' },
  { icon: 'ti ti-trophy', color: '#16a34a', count: 12, label: 'Won' },
  { icon: 'ti ti-heart', color: '#EC4899', count: 34, label: 'Compliments' },
  { icon: 'ti ti-users', color: '#2563EB', count: 15, label: 'Communities' },
  { icon: 'ti ti-gift', color: '#1F8CFF', count: 28, label: 'Tips Received' },
  { icon: 'ti ti-file-text', color: '#F59E0B', count: 6, label: 'Blogs' },
]

export default function WorkerPortal() {
  const navigate = useNavigate()

  return (
    <Layout>
      <style>{`
        .wp-page{max-width:800px;margin:0 auto;padding:0 0 40px}

        /* Nav Grid */
        .wp-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid var(--border);margin-bottom:24px}
        .wp-nav-grid-2{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border);margin-bottom:24px}
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

        /* Breadcrumb */
        .wp-bread{font-size:12px;color:var(--text3);margin-bottom:12px;display:flex;align-items:center;gap:6px}
        .wp-bread span{cursor:pointer;color:var(--text2)}
        .wp-bread span:hover{color:var(--accent)}
        .wp-bread .current{color:var(--text2);font-weight:600}

        /* Hero */
        .wp-hero h1{font-size:22px;font-weight:800;margin:0 0 16px;color:var(--text)}

        /* Stats Summary */
        .wp-stats-row{display:flex;gap:20px;margin-bottom:24px;flex-wrap:wrap}
        .wp-stats-row span{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text3)}
        .wp-stats-row i{font-size:14px;color:var(--text3)}

        /* Profile Card */
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

        /* Stats List */
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
            <div key={i} className="wp-nav-tile" style={{ borderRight: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <i className={t.icon} />
              <span>{t.label}</span>
            </div>
          ))}
        </div>
        <div className="wp-nav-grid-2">
          {navItems.slice(5).map((t, i) => (
            <div key={i} className="wp-nav-tile" style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <i className={t.icon} />
              <span>{t.label}</span>
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
