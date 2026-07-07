import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface DrawerProps {
  open: boolean
  onClose: () => void
}

function DrawerGroup({ label, icon, subtitle, children, defaultOpen }: { label: string; icon: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className={`oga-drawer-group ${open ? 'open' : ''}`}>
      <div className="oga-drawer-item oga-drawer-group-toggle" onClick={() => setOpen(!open)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open) } }}>
        <span className="oga-drawer-icon"><i className={`ti ti-${icon}`} /></span>
        <span><strong>{label}</strong>{subtitle && <small>{subtitle}</small>}</span>
        <i className="ti ti-chevron-down oga-drawer-chevron" />
      </div>
      <div className="oga-drawer-subnav">{children}</div>
    </div>
  )
}

export default function Drawer({ open, onClose }: DrawerProps) {
  const { isAuthed, logout, user } = useAuth()
  const navigate = useNavigate()

  const totalBalance = user?.wallet
    ? Object.values(user.wallet).reduce((sum, entry) => sum + (entry?.balance || 0), 0)
    : 0

  return (
    <div className={`mobile-menu ${open ? 'open' : ''}`} id="mobileMenu">
      <div className="mobile-overlay" onClick={onClose} />
      <div className="oga-drawer">
        {/* ── Header ── */}
        <div className="oga-drawer-head">
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: 18, color: 'var(--text)' }}>Menu</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>Browse OgaPay</div>
          </div>
          <button className="oga-drawer-close" onClick={onClose} aria-label="Close menu">
            <i className="ti ti-x" />
          </button>
        </div>

        {!isAuthed ? (
          <nav className="oga-drawer-nav oga-drawer-nav-guest" style={{ flex: '0 1 auto' }}>
            {/* ── Jobs ── */}
            <Link className="oga-drawer-item" to="/tasks" onClick={onClose}>
              <span className="oga-drawer-icon"><i className="ti ti-briefcase" /></span>
              <span><strong>Jobs</strong><small>Browse available tasks</small></span>
            </Link>

            {/* ── Store ── */}
            <Link className="oga-drawer-item" to="/store" onClick={onClose}>
              <span className="oga-drawer-icon"><i className="ti ti-building-store" /></span>
              <span><strong>Store</strong><small>Browse products &amp; services</small></span>
            </Link>

            {/* ── Communities ── */}
            <Link className="oga-drawer-item" to="/communities" onClick={onClose}>
              <span className="oga-drawer-icon"><i className="ti ti-users" /></span>
              <span><strong>Communities</strong><small>Discover communities</small></span>
            </Link>

            {/* ── Blog ── */}
            <Link className="oga-drawer-item" to="/blog" onClick={onClose}>
              <span className="oga-drawer-icon"><i className="ti ti-news" /></span>
              <span><strong>Blog</strong><small>News &amp; updates</small></span>
            </Link>

            {/* ── FAQ ── */}
            <Link className="oga-drawer-item" to="/faq" onClick={onClose}>
              <span className="oga-drawer-icon"><i className="ti ti-help-circle" /></span>
              <span><strong>FAQ</strong><small>Answers &amp; guides</small></span>
            </Link>

            {/* ── Support ── */}
            <Link className="oga-drawer-item" to="/support" onClick={onClose}>
              <span className="oga-drawer-icon"><i className="ti ti-headset" /></span>
              <span><strong>Support</strong><small>Contact support</small></span>
            </Link>

            {/* ── Bottom CTA ── */}
            <div className="oga-drawer-guest-cta" style={{ marginTop: 32 }}>
              <Link className="oga-drawer-guest-signin" to="/login" onClick={onClose}>
                Sign In
              </Link>
              <Link className="oga-drawer-guest-signup" to="/register" onClick={onClose}>
                Create free account
              </Link>
            </div>
          </nav>
        ) : (
          <>
            <nav className="oga-drawer-nav">
              {/* ── User Card ── */}
              <div className="oga-user-card" onClick={() => { onClose(); navigate('/profile'); }}>
                <div className="oga-user-card-avatar">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" />
                  ) : (
                    <span>{(user?.displayName || user?.username || '?').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="oga-user-card-info">
                  <div className="oga-user-card-name">{user?.displayName || user?.username || 'User'}</div>
                  <div className="oga-user-card-balance">
                    <i className="ti ti-wallet" style={{ fontSize: 12 }} />{' '}
                    {new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBalance)}{' '}
                    <span style={{ color: 'var(--text3)', fontWeight: 500 }}>total</span>
                  </div>
                </div>
                <i className="ti ti-chevron-right oga-user-card-chevron" />
              </div>

              <div className="oga-drawer-divider" />

              {/* ── Create Job ── */}
              <Link className="oga-drawer-item" to="/create" onClick={onClose}>
                <span className="oga-drawer-icon"><i className="ti ti-plus-circle" /></span>
                <span><strong>Create Job</strong><small>Post a new task</small></span>
              </Link>

              {/* ── Jobs (expandable) ── */}
              <DrawerGroup label="Jobs" icon="briefcase" subtitle="Browse and manage jobs">
                <Link className="oga-drawer-item" to="/tasks" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-checklist" /></span>
                  <span><strong>Browse Tasks</strong><small>Find work to do</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/my-jobs" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-briefcase" /></span>
                  <span><strong>My Jobs</strong><small>Manage your listings</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/manage-jobs" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-monitor" /></span>
                  <span><strong>Job Monitor</strong><small>Track submissions</small></span>
                </Link>
              </DrawerGroup>

              {/* ── Store (expandable) ── */}
              <DrawerGroup label="Store" icon="building-store" subtitle="Products and services">
                <Link className="oga-drawer-item" to="/store" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-building-store" /></span>
                  <span><strong>Browse Store</strong><small>Find products</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/my-store" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-store" /></span>
                  <span><strong>My Store</strong><small>Manage your shop</small></span>
                </Link>
              </DrawerGroup>

              {/* ── Communities ── */}
              <Link className="oga-drawer-item" to="/communities" onClick={onClose}>
                <span className="oga-drawer-icon"><i className="ti ti-users" /></span>
                <span><strong>Communities</strong><small>Manage communities</small></span>
              </Link>

              {/* ── Blog ── */}
              <Link className="oga-drawer-item" to="/blog" onClick={onClose}>
                <span className="oga-drawer-icon"><i className="ti ti-news" /></span>
                <span><strong>Blog</strong><small>News and updates</small></span>
              </Link>

              {/* ── Vault ── */}
              <Link className="oga-drawer-item" to="/vault" onClick={onClose}>
                <span className="oga-drawer-icon"><i className="ti ti-shield-lock" /></span>
                <span><strong>Vault</strong><small>Rewards and earnings</small></span>
              </Link>

              {/* ── Notifications ── */}
              <Link className="oga-drawer-item" to="/notifications" onClick={onClose}>
                <span className="oga-drawer-icon"><i className="ti ti-bell" /></span>
                <span><strong>Notifications</strong><small>Activity and alerts</small></span>
              </Link>

              {/* ── FAQ ── */}
              <Link className="oga-drawer-item" to="/faq" onClick={onClose}>
                <span className="oga-drawer-icon"><i className="ti ti-help-circle" /></span>
                <span><strong>FAQ</strong><small>Help center</small></span>
              </Link>

              {/* ── Support ── */}
              <Link className="oga-drawer-item" to="/support" onClick={onClose}>
                <span className="oga-drawer-icon"><i className="ti ti-headset" /></span>
                <span><strong>Support</strong><small>Contact support</small></span>
              </Link>

              <div className="oga-drawer-divider" />

              {/* ── Account ── */}
              <DrawerGroup label="Account" icon="user-circle" subtitle="Profile, dashboard, settings">
                <Link className="oga-drawer-item" to="/profile" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-user" /></span>
                  <span><strong>My Profile</strong><small>View and edit profile</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/dashboard" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-layout-dashboard" /></span>
                  <span><strong>Dashboard</strong><small>Your activity overview</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/settings" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-settings" /></span>
                  <span><strong>Settings</strong><small>Account preferences</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/messages" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-message" /></span>
                  <span><strong>Messages</strong><small>Your conversations</small></span>
                </Link>
              </DrawerGroup>

              {/* ── Logout ── */}
              <button className="oga-drawer-item oga-drawer-logout" onClick={() => { logout(); onClose(); navigate('/'); }}>
                <span className="oga-drawer-icon oga-drawer-icon-logout"><i className="ti ti-logout" /></span>
                <span><strong>Logout</strong><small>Sign out of your account</small></span>
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  )
}
