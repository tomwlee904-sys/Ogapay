import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

// Only pages that exist (Users, Tasks, Disputes and Analytics had no page and
// just came back here)
const CARDS = [
  { to: '/admin/withdrawals', icon: 'ti-cash', title: 'Withdrawals', desc: 'Pay out and settle pending withdrawals' },
  { to: '/admin/kyc', icon: 'ti-id', title: 'Identity checks', desc: 'KYC waiting for review, and past approvals' },
  { to: '/admin/moderation', icon: 'ti-flag', title: 'Moderation', desc: 'Submissions waiting over 24h' },
  { to: '/admin/blog', icon: 'ti-news', title: 'Blog', desc: 'Articles waiting for review, and publishing' },
  { to: '/admin/vault', icon: 'ti-building-bank', title: 'Vault', desc: 'Revenue pool, distributions and $PAY' },
]

export default function Admin() {
  const { isAuthed } = useAuth()

  if (!isAuthed) return null

  return (
    <Layout sidebar>
      <style>{`
        .admin-wrap{max-width:1100px;margin:0 auto;padding:28px 24px 60px}
        .admin-wrap h1{font-family:Geist,sans-serif;font-size:28px;font-weight:900;margin:0 0 4px}
        .admin-wrap p{color:var(--text2);font-size:14px;margin:0 0 24px}
        .admin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
        .admin-card{display:block;color:inherit;text-decoration:none;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;cursor:pointer;transition:border-color .13s}
        .admin-card:hover{border-color:var(--text2)}
        .admin-card i{font-size:24px;color:var(--accent);display:block;margin-bottom:10px}
        .admin-card h3{font-size:15px;font-weight:800;margin:0 0 4px}
        .admin-card p{font-size:12px;color:var(--text2);margin:0}
      `}</style>
      <div className="admin-wrap">
        <h1>Admin</h1>
        <p>Money out, identity checks, moderation and content.</p>
        <div className="admin-grid">
          {CARDS.map((c) => (
            <Link key={c.to} className="admin-card" to={c.to}>
              <i className={`ti ${c.icon}`} />
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}
