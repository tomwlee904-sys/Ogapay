import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function SidebarGroup({ label, icon, subtitle, defaultOpen = false, children }: { label: string; icon: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`sidebar-group ${open ? 'open' : ''}`}>
      <div className="sidebar-link sidebar-group-toggle" onClick={() => setOpen(!open)}>
        <i className={`ti ti-${icon}`} />
        <span>
          <strong>{label}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>
        <i className={`ti ti-chevron-down sidebar-chevron`} />
      </div>
      {open && <div className="sidebar-subnav">{children}</div>}
    </div>
  )
}

export default function Sidebar() {
  const { isAuthed, user, logout } = useAuth()
  const navigate = useNavigate()

  if (!isAuthed) {
    return (
      <aside className="sidebar">
        <div className="sidebar-head">
          <div>
            <div className="sidebar-brand">Menu</div>
            <div className="sidebar-subhead">Browse OgaPay</div>
          </div>
        </div>
        <div className="sidebar-nav">
          <div className="sidebar-section">EXPLORE</div>
          <Link className="sidebar-link" to="/tasks"><i className="ti ti-briefcase" /> <span><strong>Jobs</strong><small>Browse and track jobs</small></span></Link>
          <Link className="sidebar-link" to="/store"><i className="ti ti-building-store" /> <span><strong>Store</strong><small>Wurker tools and inbox</small></span></Link>
                  <Link className="sidebar-link" to="/notifications"><i className="ti ti-bell" /> <span><strong>Notifications</strong><small>Alerts &amp; updates</small></span></Link>
        <Link className="sidebar-link" to="/blog"><i className="ti ti-news" /> <span><strong>Blog</strong><small>Read articles and updates</small></span></Link>
          <Link className="sidebar-link" to="/vault"><i className="ti ti-lock" /> <span><strong>Vault</strong><small>Reward pool</small></span></Link>
          <Link className="sidebar-link" to="/faq"><i className="ti ti-help-circle" /> <span><strong>FAQ</strong><small>Answers and guides</small></span></Link>
          <Link className="sidebar-link" to="/support"><i className="ti ti-headset" /> <span><strong>Support</strong><small>Get help</small></span></Link>
          <div style={{ padding: '12px 10px', marginTop: 8 }}>
            <Link className="wallet-btn" to="/login" style={{ width: '100%', justifyContent: 'center' }}>
              <i className="ti ti-login" /> Login
            </Link>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div>
          <div className="sidebar-brand">Menu</div>
          <div className="sidebar-subhead">Browse OgaPay</div>
        </div>
      </div>
      <div className="sidebar-nav">
        <div className="sidebar-section">NAVIGATION</div>

        <Link className="sidebar-link" to="/create">
          <i className="ti ti-circle-plus" />
          <span><strong>Create Job</strong><small>Post a new task</small></span>
        </Link>

        <SidebarGroup label="Jobs" icon="briefcase" subtitle="Browse and track jobs" defaultOpen={false}>
          <Link className="sidebar-link" to="/tasks"><i className="ti ti-checklist" /> <span><strong>Browse Tasks</strong></span></Link>
          <Link className="sidebar-link" to="/my-jobs"><i className="ti ti-briefcase" /> <span><strong>My Jobs</strong></span></Link>
          <Link className="sidebar-link" to="/manage-jobs"><i className="ti ti-monitor" /> <span><strong>Job Monitor</strong></span></Link>
          <Link className="sidebar-link" to="/my-tasks"><i className="ti ti-clipboard-list" /> <span><strong>My Tasks</strong></span></Link>
          <Link className="sidebar-link" to="/bookmarks"><i className="ti ti-bookmark" /> <span><strong>Bookmarks</strong></span></Link>
          <Link className="sidebar-link" to="/leaderboard"><i className="ti ti-trophy" /> <span><strong>Leaderboard</strong></span></Link>
        </SidebarGroup>

        <SidebarGroup label="Store" icon="building-store" subtitle="Products and gigs" defaultOpen={false}>
          <Link className="sidebar-link" to="/store"><i className="ti ti-building-store" /> <span><strong>Store</strong></span></Link>
          <Link className="sidebar-link" to="/workers"><i className="ti ti-users" /> <span><strong>Workers</strong></span></Link>
          <Link className="sidebar-link" to="/my-store"><i className="ti ti-building-store" /> <span><strong>My Store</strong></span></Link>
          <Link className="sidebar-link" to="/worker-portal"><i className="ti ti-layout" /> <span><strong>Worker Portal</strong></span></Link>
          <Link className="sidebar-link" to="/messages"><i className="ti ti-message" /> <span><strong>Messages</strong></span></Link>
        </SidebarGroup>

        <Link className="sidebar-link" to="/communities"><i className="ti ti-users" /> <span><strong>Communities</strong><small>Join groups</small></span></Link>
        <Link className="sidebar-link" to="/blog"><i className="ti ti-news" /> <span><strong>Blog</strong><small>Read articles and updates</small></span></Link>
        <Link className="sidebar-link" to="/vault"><i className="ti ti-lock" /> <span><strong>Vault</strong><small>Reward pool</small></span></Link>
        <Link className="sidebar-link" to="/faq"><i className="ti ti-help-circle" /> <span><strong>FAQ</strong><small>Answers and guides</small></span></Link>
        <Link className="sidebar-link" to="/support"><i className="ti ti-headset" /> <span><strong>Support</strong><small>Get help</small></span></Link>

        <SidebarGroup label="Account" icon="user-circle" subtitle="Wallet, profile &amp; settings">
          <Link className="sidebar-link" to="/dashboard"><i className="ti ti-layout-dashboard" /> <span><strong>Dashboard</strong><small>Your overview</small></span></Link>
          <Link className="sidebar-link" to="/wallet"><i className="ti ti-wallet" /> <span><strong>Wallet</strong><small>Balance &amp; transactions</small></span></Link>
          <Link className="sidebar-link" to="/profile"><i className="ti ti-user" /> <span><strong>My Profile</strong><small>View your profile</small></span></Link>
          <Link className="sidebar-link" to="/settings"><i className="ti ti-settings" /> <span><strong>Settings</strong><small>KYC, security, preferences</small></span></Link>
          {(localStorage.getItem('ogapay_developer_mode') === 'true') && (
            <Link className="sidebar-link" to="/developer">
              <i className="ti ti-code" /> <span><strong>Developer API</strong><small>API keys &amp; docs</small></span>
            </Link>
          )}
          {(user?.role === 'ADMIN' || localStorage.getItem('ogapay_admin_session') === 'true') && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <div className="sidebar-section" style={{ fontSize: 10, marginBottom: 4 }}>ADMIN</div>
              <Link className="sidebar-link" to="/admin">
                <i className="ti ti-shield" /> <span><strong>Admin Panel</strong><small>Platform management</small></span>
              </Link>
              <Link className="sidebar-link" to="/admin/blog">
                <i className="ti ti-news" /> <span><strong>Blog Manager</strong><small>Manage blog posts</small></span>
              </Link>
            </div>
          )}
          <div className="sidebar-link" onClick={() => { logout(); navigate('/'); }} style={{ cursor: 'pointer' }}>
            <i className="ti ti-logout" /> <span><strong>Logout</strong><small>Sign out</small></span>
          </div>
        </SidebarGroup>
      </div>
    </aside>
  )
}
