import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

export default function Profile() {
  const { isAuthed } = useAuth()

  if (!isAuthed) {
    return (
      <Layout sidebar={false}>
        <div className="loading"><div className="spinner" /> Sign in to view your profile</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="sec">
        <div className="hero">
          <h1>Profile</h1>
        </div>
      </div>

      {/* Profile Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, padding: 24, borderRadius: 'var(--radius)', background: 'var(--card)', border: '1px solid var(--border)', marginBottom: 18 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg2)', display: 'grid', placeItems: 'center', border: '3px solid var(--accent)', flexShrink: 0 }}>
          <i className="ti ti-user" style={{ fontSize: 32, color: 'var(--text3)' }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Outfit', fontSize: 20 }}>User Name</h2>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>@username</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="skill-tag"><i className="ti ti-map-pin" /> Lagos, Nigeria</span>
            <span className="skill-tag"><i className="ti ti-mail" /> user@email.com</span>
            <span className="skill-tag"><i className="ti ti-calendar" /> Joined Mar 2025</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat-card"><div className="sc-icon" style={{ background: '#7C3AED15', color: '#7C3AED' }}><i className="ti ti-checklist" /></div><div className="sc-val">0</div><div className="sc-label">Tasks Done</div></div>
        <div className="stat-card"><div className="sc-icon" style={{ background: '#16a34a15', color: '#16a34a' }}><i className="ti ti-coin" /></div><div className="sc-val">&#8358;0</div><div className="sc-label">Total Earned</div></div>
        <div className="stat-card"><div className="sc-icon" style={{ background: '#2563EB15', color: '#2563EB' }}><i className="ti ti-affiliate" /></div><div className="sc-val">0</div><div className="sc-label">Referrals</div></div>
        <div className="stat-card"><div className="sc-icon" style={{ background: '#f5b30115', color: '#f5b301' }}><i className="ti ti-star" /></div><div className="sc-val">0</div><div className="sc-label">Reputation</div></div>
      </div>

      {/* Quick Links */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-link" /> Quick Links</h2></div>
        <div className="qactions" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <QAction icon="ti ti-checklist" label="Browse Tasks" href="/app/tasks" color="#7C3AED" />
          <QAction icon="ti ti-wallet" label="My Wallet" href="/app/wallet" color="#2563EB" />
          <QAction icon="ti ti-building-store" label="My Store" href="/app/my-store" color="#16a34a" />
          <QAction icon="ti ti-plus-circle" label="Post a Task" href="/app/tasks/new" color="#f5b301" />
          <QAction icon="ti ti-users" label="Communities" href="/app/communities" color="#7C3AED" />
          <QAction icon="ti ti-settings" label="Settings" href="/app/settings" color="#dc2626" />
        </div>
      </div>

      {/* Referral */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-affiliate" /> Referral Program</h2></div>
        <div className="stat-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Share your referral link and earn rewards</div>
          <div className="search-bar" style={{ marginBottom: 0 }}>
            <input type="text" value="https://ogapay.app/ref/your-code" readOnly />
            <button className="cc-btn" style={{ flexShrink: 0, height: 32, padding: '0 12px', fontSize: 11 }}>Copy</button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function QAction({ icon, label, href, color }: { icon: string; label: string; href: string; color: string }) {
  return (
    <a className="qaction" href={href}>
      <span className="qa-icon" style={{ background: `${color}15`, color, width: 40, height: 40, borderRadius: 10, fontSize: 18 }}>
        <i className={icon} />
      </span>
      <span className="qa-label" style={{ fontSize: 12, color: 'var(--text)' }}>{label}</span>
    </a>
  )
}
