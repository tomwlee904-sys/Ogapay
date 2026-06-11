import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

export default function Admin() {
  const { isAuthed } = useAuth()

  if (!isAuthed) return null

  return (
    <Layout sidebar>
      <style>{`
        .admin-wrap{max-width:1100px;margin:0 auto;padding:28px 24px 60px}
        .admin-wrap h1{font-family:Outfit,sans-serif;font-size:28px;font-weight:900;margin:0 0 4px}
        .admin-wrap p{color:var(--text2);font-size:14px;margin:0 0 24px}
        .admin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
        .admin-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;cursor:pointer;transition:border-color .13s}
        .admin-card:hover{border-color:var(--text2)}
        .admin-card i{font-size:24px;color:var(--accent);display:block;margin-bottom:10px}
        .admin-card h3{font-size:15px;font-weight:800;margin:0 0 4px}
        .admin-card p{font-size:12px;color:var(--text2);margin:0}
      `}</style>
      <div className="admin-wrap">
        <h1>Admin</h1>
        <p>Manage platform settings, users, tasks, and disputes.</p>
        <div className="admin-grid">
          <a className="admin-card" href="/admin/vault">
            <i className="ti ti-vault" />
            <h3>Vault</h3>
            <p>Revenue distribution & $PAY management</p>
          </a>
          <a className="admin-card" href="/admin/users">
            <i className="ti ti-users" />
            <h3>Users</h3>
            <p>Manage user accounts & roles</p>
          </a>
          <a className="admin-card" href="/admin/tasks">
            <i className="ti ti-checklist" />
            <h3>Tasks</h3>
            <p>Review & moderate tasks</p>
          </a>
          <a className="admin-card" href="/admin/disputes">
            <i className="ti ti-shield-off" />
            <h3>Disputes</h3>
            <p>Resolve open disputes</p>
          </a>
          <a className="admin-card" href="/admin/analytics">
            <i className="ti ti-chart-bar" />
            <h3>Analytics</h3>
            <p>Platform metrics & reports</p>
          </a>
        </div>
      </div>
    </Layout>
  )
}
