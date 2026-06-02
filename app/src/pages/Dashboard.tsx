import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

export default function Dashboard() {
  const { isAuthed } = useAuth()

  if (!isAuthed) {
    return (
      <Layout sidebar={false}>
        <div className="loading"><div className="spinner" /> Sign in to view your dashboard</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="sec">
        <div className="hero">
          <div className="greeting">Welcome back!</div>
          <h1>Dashboard</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        <StatCard icon="ti ti-wallet" color="#7C3AED" value="&#8358;0.00" label="Total Earned" />
        <StatCard icon="ti ti-coin" color="#2563EB" value="&#8358;0.00" label="Available Balance" />
        <StatCard icon="ti ti-clock" color="#f5b301" value="&#8358;0.00" label="Pending" />
        <StatCard icon="ti ti-trending-up" color="#16a34a" value="&#8358;0.00" label="This Month" />
      </div>

      {/* Wallet Overview */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-wallet" /> Wallet Overview</h2></div>
        <div className="grid-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <ActionCard icon="ti ti-plus-circle" label="Deposit" color="#7C3AED" href="/app/wallet" />
          <ActionCard icon="ti ti-logout" label="Withdraw" color="#2563EB" href="/app/wallet" />
          <ActionCard icon="ti ti-transfer" label="Transfer" color="#16a34a" href="/app/wallet" />
        </div>
      </div>

      {/* Active Tasks */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-player-play" /> Active Tasks</h2></div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 40 }}>
          <i className="ti ti-briefcase" style={{ fontSize: 32, color: 'var(--text3)', marginBottom: 12, display: 'block' }} />
          <div style={{ fontSize: 14, color: 'var(--text2)' }}>No active tasks yet</div>
          <a href="/app/tasks" className="cc-btn" style={{ marginTop: 12, display: 'inline-flex' }}>Browse Tasks</a>
        </div>
      </div>

      {/* Recommended Tasks */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-star" /> Recommended Tasks</h2></div>
        <div className="gig-list">
          <div className="gig-item">
            <div className="gig-info">
              <div className="gi-title">Social Media Engagement</div>
              <div className="gi-meta">
                <span><i className="ti ti-coin" /> &#8358;500</span>
                <span><i className="ti ti-clock" /> ~10 min</span>
              </div>
            </div>
            <button className="gig-apply">Start</button>
          </div>
          <div className="gig-item">
            <div className="gig-info">
              <div className="gi-title">App Testing - UI Feedback</div>
              <div className="gi-meta">
                <span><i className="ti ti-coin" /> &#8358;1,200</span>
                <span><i className="ti ti-clock" /> ~25 min</span>
              </div>
            </div>
            <button className="gig-apply">Start</button>
          </div>
          <div className="gig-item">
            <div className="gig-info">
              <div className="gi-title">Content Review</div>
              <div className="gi-meta">
                <span><i className="ti ti-coin" /> &#8358;800</span>
                <span><i className="ti ti-clock" /> ~15 min</span>
              </div>
            </div>
            <button className="gig-apply">Start</button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-activity" /> Recent Activity</h2></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Activity</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Today</td><td><strong>No recent activity</strong></td><td className="amt">—</td><td>—</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

function StatCard({ icon, color, value, label }: { icon: string; color: string; value: string; label: string }) {
  return (
    <div className="stat-card">
      <div className="sc-icon" style={{ background: `${color}15`, color }}>
        <i className={icon} />
      </div>
      <div className="sc-val">{value}</div>
      <div className="sc-label">{label}</div>
    </div>
  )
}

function ActionCard({ icon, label, color, href }: { icon: string; label: string; color: string; href: string }) {
  return (
    <a href={href} className="qaction" style={{ flexDirection: 'row', gap: 12, padding: '16px 14px' }}>
      <span className="qa-icon" style={{ background: `${color}15`, color, width: 40, height: 40, borderRadius: 10, fontSize: 18 }}>
        <i className={icon} />
      </span>
      <span className="qa-label" style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
    </a>
  )
}
