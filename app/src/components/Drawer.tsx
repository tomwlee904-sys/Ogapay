import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { openSignIn } from '../lib/signin'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { useCurrency } from '../context/CurrencyContext'
import { sized } from '../lib/img'
import { displayPref } from '../lib/money'
import CurrencySwitch from './CurrencySwitch'
import { InstallMenuItem } from './InstallApp'

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
  // Settings > Developer: "Show Developer API in the menu"
  const readDev = () => { try { return localStorage.getItem('ogapay_developer_mode') === 'true' } catch { return false } }
  const [devMode, setDevMode] = useState(readDev)
  useEffect(() => {
    const sync = () => setDevMode(readDev())
    window.addEventListener('ogapay:devmode', sync); window.addEventListener('storage', sync)
    return () => { window.removeEventListener('ogapay:devmode', sync); window.removeEventListener('storage', sync) }
  }, [])
  const { isAuthed, logout, user } = useAuth()
  const navigate = useNavigate()

  // Same figure as the balance in the header: all wallets in the display
  // currency, naira (also for "Both") or dollars.
  const { balances } = useWalletBalance()
  const { convert, preferredCurrency } = useCurrency()
  const inUsd = displayPref(preferredCurrency) === 'USDC'
  const totalBalance = balances
    ? (['SOL', 'USDC', 'USDT', 'NGN'] as const).reduce((sum, c) => { const v = balances[c] ? convert(balances[c]!.balance, c as any, inUsd ? 'USDC' : 'NGN') : 0; return sum + (Number.isFinite(v) ? v : 0) }, 0)
    : 0

  return (
    <div className={`mobile-menu ${open ? 'open' : ''}`} id="mobileMenu">
      <div className="mobile-overlay" onClick={onClose} />
      <div className="oga-drawer">
        {/* ── Header ── */}
        <div className="oga-drawer-head">
          <div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 900, fontSize: 18, color: 'var(--text)' }}>Menu</div>
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

            {/* ── Vault ── */}
            <Link className="oga-drawer-item" to="/vault" onClick={onClose}>
              <span className="oga-drawer-icon"><i className="ti ti-shield-lock" /></span>
              <span><strong>Vault</strong><small>Reward pool</small></span>
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

            <InstallMenuItem onDone={onClose} />

            <CurrencySwitch />

            {/* ── Bottom CTA ── */}
            <div className="oga-drawer-guest-cta" style={{ marginTop: 24 }}>
              <button type="button" className="oga-drawer-guest-signin" onClick={() => { onClose(); openSignIn() }}>
                Sign In
              </button>
              <button type="button" className="oga-drawer-guest-signup" onClick={() => { onClose(); openSignIn({ view: 'signup' }) }}>
                Create free account
              </button>
            </div>
          </nav>
        ) : (
          <>
            <nav className="oga-drawer-nav">
              {/* ── User Card ── */}
              <div className="oga-user-row">
              <div className="oga-user-card" onClick={() => { onClose(); navigate('/profile'); }}>
                <div className="oga-user-card-avatar">
                  {user?.avatar ? (
                    <img src={sized(user.avatar, 48, true)} alt="" />
                  ) : (
                    <span>{(user?.displayName || user?.username || '?').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="oga-user-card-info">
                  <div className="oga-user-card-name">{user?.displayName || user?.username || 'User'}</div>
                  <div className="oga-user-card-balance">
                    <i className="ti ti-wallet" style={{ fontSize: 12 }} />{' '}
                    Balance: <b>{inUsd ? `$${totalBalance < 0.01 ? '0.00' : totalBalance.toFixed(2)}` : `₦${Math.round(Math.max(0, totalBalance)).toLocaleString('en-US')}`}</b>
                  </div>
                </div>
                <i className="ti ti-chevron-right oga-user-card-chevron" />
              </div>
                <button type="button" className="oga-topup" onClick={() => { onClose(); navigate('/deposit') }}>Top up</button>
              </div>

              <div className="oga-drawer-divider" />

              {/* ── Create Job ── */}
              <Link className="oga-drawer-item" to="/create" onClick={onClose}>
                <span className="oga-drawer-icon"><i className="ti ti-circle-plus" /></span>
                <span><strong>Create Job</strong><small>Post a new task</small></span>
              </Link>

              {/* ── Jobs (expandable) ── */}
              <DrawerGroup label="Jobs" icon="briefcase" subtitle="Find work and manage your jobs">
                <Link className="oga-drawer-item" to="/tasks" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-checklist" /></span>
                  <span><strong>Browse jobs</strong><small>Find work to do</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/bookmarks" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-bookmark" /></span>
                  <span><strong>Saved jobs</strong><small>Jobs you saved for later</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/my-tasks" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-list-check" /></span>
                  <span><strong>My tasks</strong><small>Jobs you've taken</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/job-monitor" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-activity" /></span>
                  <span><strong>Job monitor</strong><small>New jobs as they're posted</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/manage-jobs" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-briefcase" /></span>
                  <span><strong>My jobs</strong><small>Review work on jobs you posted</small></span>
                </Link>
              </DrawerGroup>

              {/* ── Store (expandable) ── */}
              <DrawerGroup label="Store" icon="building-store" subtitle="Products and services">
                <Link className="oga-drawer-item" to="/store" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-building-store" /></span>
                  <span><strong>Browse Store</strong><small>Find products</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/store/orders" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-receipt" /></span>
                  <span><strong>My orders</strong><small>What you bought</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/my-store" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-building-store" /></span>
                  <span><strong>My Store</strong><small>Manage your shop</small></span>
                </Link>
              </DrawerGroup>

              {/* ── Discover ── */}
              <DrawerGroup label="Discover" icon="compass" subtitle="People, rankings and what's next">
                <Link className="oga-drawer-item" to="/workers" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-user-search" /></span>
                  <span><strong>Find workers</strong><small>Hire people for your work</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/creators" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-speakerphone" /></span>
                  <span><strong>Creators</strong><small>Hire verified micro-influencers</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/leaderboard" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-trophy" /></span>
                  <span><strong>Leaderboard</strong><small>Top earners and posters</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/writer" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-pencil" /></span>
                  <span><strong>Writer workspace</strong><small>Writing jobs and tips</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/roadmap" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-map-2" /></span>
                  <span><strong>Roadmap</strong><small>What we're building next</small></span>
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

              <InstallMenuItem onDone={onClose} />

              <div className="oga-drawer-divider" />

              {/* ── Account ── */}
              {/* ── Admin (admins only) ── */}
              {user?.role === 'ADMIN' && (
                <Link className="oga-drawer-item" to="/admin" onClick={onClose}>
                  <span className="oga-drawer-icon"><i className="ti ti-shield-cog" /></span>
                  <span><strong>Admin panel</strong><small>Withdrawals, identity checks, moderation</small></span>
                </Link>
              )}

              <DrawerGroup label="Account" icon="user-circle" subtitle="Profile, dashboard, settings">
                <Link className="oga-drawer-item" to="/profile" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-user" /></span>
                  <span><strong>My Profile</strong><small>View and edit profile</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/dashboard" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-layout-dashboard" /></span>
                  <span><strong>Dashboard</strong><small>Your activity overview</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/wallet" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-wallet" /></span>
                  <span><strong>Wallet</strong><small>Balance, deposits and withdrawals</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/analytics" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-chart-bar" /></span>
                  <span><strong>Analytics</strong><small>Your earnings and activity</small></span>
                </Link>
                {devMode && (
                <Link className="oga-drawer-item" to="/developer" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-code" /></span>
                  <span><strong>Developer API</strong><small>Keys and docs</small></span>
                </Link>
                )}
                <Link className="oga-drawer-item" to="/settings" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-settings" /></span>
                  <span><strong>Settings</strong><small>Account preferences</small></span>
                </Link>
                <Link className="oga-drawer-item" to="/messages" onClick={onClose}>
                  <span className="oga-drawer-icon oga-drawer-icon--sub"><i className="ti ti-message" /></span>
                  <span><strong>Messages</strong><small>Your conversations</small></span>
                </Link>
              </DrawerGroup>

              <CurrencySwitch />

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
