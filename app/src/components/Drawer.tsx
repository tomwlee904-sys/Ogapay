import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface DrawerProps {
  open: boolean
  onClose: () => void
}

export default function Drawer({ open, onClose }: DrawerProps) {
  const { isAuthed, logout } = useAuth()

  return (
    <div className={`mobile-menu ${open ? 'open' : ''}`} id="mobileMenu">
      <div className="mobile-overlay" onClick={onClose} />
      <div className="oga-drawer">
        <div className="oga-drawer-head">
          <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 17 }}>Menu</span>
          <button className="oga-drawer-close" data-close-menu onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Public nav */}
        <nav className="oga-drawer-nav public-only">
          <a className="oga-drawer-item" href="/tasks" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-checklist" /></span>
            <span><strong>Tasks</strong><small>Browse available tasks</small></span>
          </a>
          <a className="oga-drawer-item" href="/store" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-building-store" /></span>
            <span><strong>Store</strong><small>Browse products &amp; gigs</small></span>
          </a>
          <a className="oga-drawer-item" href="/blog" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-article" /></span>
            <span><strong>Blog</strong><small>Latest insights</small></span>
          </a>
          <a className="oga-drawer-item" href="/faq" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-help-circle" /></span>
            <span><strong>FAQ</strong><small>Frequently asked questions</small></span>
          </a>
          <a className="oga-drawer-item" href="/support" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-headset" /></span>
            <span><strong>Support</strong><small>Get help</small></span>
          </a>
          <div style={{ padding: '12px 10px', marginTop: 8 }}>
            <a className="wallet-btn" href="/login" style={{ width: '100%', justifyContent: 'center' }} onClick={onClose}>
              <i className="ti ti-login" /> Login
            </a>
          </div>
        </nav>

        {/* Authed nav */}
        <nav className="oga-drawer-nav authed-only">
          <a className="oga-drawer-item" href="/" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-dashboard" /></span>
            <span><strong>Home</strong><small>Back to homepage</small></span>
          </a>

          {/* Create Job */}
          <a className="oga-drawer-item" href="/create" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-plus-circle" /></span>
            <span><strong>Create Job</strong><small>Post a new task</small></span>
          </a>

          {/* Jobs accordion */}
          <DrawerGroup icon="ti ti-briefcase" label="Jobs" desc="Manage your tasks">
            <DrawerSub href="/job-monitor" label="Job Monitor" onClick={onClose} />
            <DrawerSub href="/jobs" label="Browse Jobs" onClick={onClose} />
            <DrawerSub href="/post-job" label="Post a Job" onClick={onClose} />
            <DrawerSub href="/my-jobs" label="My Listings" onClick={onClose} />
          </DrawerGroup>

          {/* Store accordion */}
          <DrawerGroup icon="ti ti-building-store" label="Store" desc="Marketplace">
            <DrawerSub href="/store" label="Store" onClick={onClose} />
            <DrawerSub href="/my-store" label="My Store" onClick={onClose} />
            <DrawerSub href="/my-tasks" label="My Work" onClick={onClose} />
            <DrawerSub href="/worker-portal" label="Worker Portal" onClick={onClose} />
          </DrawerGroup>

          <a className="oga-drawer-item" href="/campaigns" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-megaphone" /></span>
            <span><strong>Campaigns</strong><small>Marketing campaigns</small></span>
          </a>


          <a className="oga-drawer-item" href="/blog" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-article" /></span>
            <span><strong>Blog</strong><small>Latest insights</small></span>
          </a>
          <a className="oga-drawer-item" href="/vault" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-lock" /></span>
            <span><strong>Vault</strong><small>Revenue distribution &amp; earnings</small></span>
          </a>
          <a className="oga-drawer-item" href="/safe" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-vault" /></span>
            <span><strong>Safe</strong><small>Secure document storage</small></span>
          </a>
          <a className="oga-drawer-item" href="/notifications" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-bell" /></span>
            <span><strong>Notifications</strong><small>Alerts &amp; updates</small></span>
          </a>
          <a className="oga-drawer-item" href="/faq" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-help-circle" /></span>
            <span><strong>FAQ</strong><small>Frequently asked questions</small></span>
          </a>
          <a className="oga-drawer-item" href="/support" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-headset" /></span>
            <span><strong>Support</strong><small>Get help</small></span>
          </a>
        </nav>

        {/* Authed footer */}
        <div className="oga-drawer-foot authed-only">
          <div className="oga-drawer-foot-label">Account</div>
          <a className="oga-drawer-item" href="/profile" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-user" /></span>
            <span><strong>My Profile</strong><small>View and edit profile</small></span>
          </a>
          <a className="oga-drawer-item" href="/settings" onClick={onClose}>
            <span className="oga-drawer-icon"><i className="ti ti-settings" /></span>
            <span><strong>Settings</strong><small>Account preferences</small></span>
          </a>
          <button className="oga-drawer-item" onClick={() => { logout(); onClose(); window.location.href = '/' }}>
            <span className="oga-drawer-icon"><i className="ti ti-logout" /></span>
            <span><strong>Logout</strong><small>Sign out of your account</small></span>
          </button>
        </div>
      </div>
    </div>
  )
}

function DrawerGroup({ icon, label, desc, children }: { icon: string; label: string; desc: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={"oga-drawer-group" + (expanded ? " open" : "")}>
      <button className="oga-drawer-item oga-drawer-group-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <span className="oga-drawer-icon"><i className={icon} /></span>
        <span><strong>{label}</strong><small>{desc}</small></span>
        <i className="ti ti-chevron-down oga-drawer-chevron" />
      </button>
      <div className="oga-drawer-subnav" style={{ display: expanded ? 'grid' : 'none' }}>
        {children}
      </div>
    </div>
  )
}

function DrawerSub({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return <a href={href} onClick={onClick}><i className="ti ti-arrow-right" />{label}</a>
}
