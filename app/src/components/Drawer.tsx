import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { openSignIn } from '../lib/signin'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { useCurrency } from '../context/CurrencyContext'
import { sized } from '../lib/img'
import { displayPref } from '../lib/money'
import { useUnreadCount } from '../lib/shared'
import CurrencySwitch from './CurrencySwitch'
import { useMyWarnings } from './WarningBanner'

interface DrawerProps {
  open: boolean
  onClose: () => void
}

const under = (pathname: string, p: string) => pathname === p || pathname.startsWith(p + '/')

type ItemProps = { to: string; icon: string; title: string; desc: string; sub?: boolean; count?: number; exact?: boolean }

// One menu entry. The page you're on is marked (aria-current, styled in
// nav.css); sub: the smaller icon used inside a group; count: an unread badge.
function DrawerItem({ to, icon, title, desc, sub, count, exact, pathname, onClose }: ItemProps & { pathname: string; onClose: () => void }) {
  const here = exact ? pathname === to : under(pathname, to)
  return (
    <Link
      className="oga-drawer-item"
      to={to}
      onClick={onClose}
      aria-current={here ? 'page' : undefined}
      aria-label={count ? `${title}, ${count} unread` : undefined}
    >
      <span className={'oga-drawer-icon' + (sub ? ' oga-drawer-icon--sub' : '')}><i className={`ti ti-${icon}`} /></span>
      <span><strong>{title}</strong><small>{desc}</small></span>
      {!!count && <span className="oga-drawer-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
    </Link>
  )
}

function DrawerGroup({ label, icon, subtitle, children, defaultOpen }: { label: string; icon: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className={`oga-drawer-group ${open ? 'open' : ''}`}>
      <div className="oga-drawer-item oga-drawer-group-toggle" onClick={() => setOpen(!open)} role="button" tabIndex={0} aria-expanded={open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open) } }}>
        <span className="oga-drawer-icon"><i className={`ti ti-${icon}`} /></span>
        <span><strong>{label}</strong>{subtitle && <small>{subtitle}</small>}</span>
        <i className="ti ti-chevron-down oga-drawer-chevron" aria-hidden="true" />
      </div>
      <div className="oga-drawer-subnav">{children}</div>
    </div>
  )
}

// Names follow one word per thing: "job" (not task), the /tasks link is "Find
// jobs", sentence case. Members get the Dashboard, Notifications (with the
// unread count) and Messages at the top: on desktop there is no dock to reach
// them from. "Install the app" isn't listed: the install card offers itself
// (InstallHost). Vault is listed: on phones and tablets the top bar doesn't show it.
export default function Drawer({ open, onClose }: DrawerProps) {
  // Settings > Developer: "Show Developer API in the menu"
  const readDev = () => { try { return localStorage.getItem('ogapay_developer_mode') === 'true' } catch { return false } }
  const [devMode, setDevMode] = useState(readDev)
  // Warnings: only listed for members who have had one (shared with the banner's fetch)
  const myWarnings = useMyWarnings()
  const hasWarnings = !!myWarnings && (myWarnings.warnings.length > 0 || !!myWarnings.suspended)
  useEffect(() => {
    const sync = () => setDevMode(readDev())
    window.addEventListener('ogapay:devmode', sync); window.addEventListener('storage', sync)
    return () => { window.removeEventListener('ogapay:devmode', sync); window.removeEventListener('storage', sync) }
  }, [])
  const { isAuthed, logout, user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // The same unread count as the top bar and the dock (one shared check, lib/shared)
  const unread = useUnreadCount(isAuthed)

  // Escape closes the menu
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Same figure as the balance in the header: all wallets in the display
  // currency, naira (also for "Both") or dollars.
  const { balances } = useWalletBalance()
  const { convert, preferredCurrency } = useCurrency()
  const inUsd = displayPref(preferredCurrency) === 'USDC'
  const totalBalance = balances
    ? (['SOL', 'USDC', 'USDT', 'NGN'] as const).reduce((sum, c) => { const v = balances[c] ? convert(balances[c]!.balance, c as any, inUsd ? 'USDC' : 'NGN') : 0; return sum + (Number.isFinite(v) ? v : 0) }, 0)
    : 0

  const item = (p: ItemProps) => <DrawerItem {...p} pathname={pathname} onClose={onClose} />
  // A group opens by itself when you're on one of its pages
  const inAny = (paths: string[]) => paths.some((p) => under(pathname, p))

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
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        {!isAuthed ? (
          <nav className="oga-drawer-nav oga-drawer-nav-guest" style={{ flex: '0 1 auto' }}>
            {item({ to: '/tasks', icon: 'briefcase', title: 'Find jobs', desc: 'Paid work you can do today' })}
            {item({ to: '/store', icon: 'building-store', title: 'Store', desc: 'Products and services' })}
            {item({ to: '/communities', icon: 'users', title: 'Communities', desc: 'Groups with their own jobs' })}
            {item({ to: '/blog', icon: 'news', title: 'Blog', desc: 'News and guides' })}
            {item({ to: '/faq', icon: 'help-circle', title: 'FAQ', desc: 'Answers to common questions' })}
            {item({ to: '/support', icon: 'headset', title: 'Support', desc: 'Ask our team for help' })}

            <CurrencySwitch />

            {/* ── Bottom CTA ── */}
            <div className="oga-drawer-guest-cta" style={{ marginTop: 24 }}>
              <button type="button" className="oga-drawer-guest-signin" onClick={() => { onClose(); openSignIn() }}>
                Sign in
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
                    Total balance: <b>{inUsd ? `$${totalBalance < 0.01 ? '0.00' : totalBalance.toFixed(2)}` : `₦${Math.round(Math.max(0, totalBalance)).toLocaleString('en-US')}`}</b>
                  </div>
                </div>
                <i className="ti ti-chevron-right oga-user-card-chevron" />
              </div>
                <button type="button" className="oga-topup" onClick={() => { onClose(); navigate('/deposit') }}>Top up</button>
              </div>

              {/* ── Your places first ── */}
              {item({ to: '/dashboard', icon: 'layout-dashboard', title: 'Dashboard', desc: 'Your money, jobs and next steps' })}
              {item({ to: '/notifications', icon: 'bell', title: 'Notifications', desc: 'Updates on your jobs and money', count: unread })}
              {item({ to: '/messages', icon: 'message', title: 'Messages', desc: 'Chats with workers, buyers and sellers' })}

              <div className="oga-drawer-divider" />

              {item({ to: '/create', icon: 'circle-plus', title: 'Post a job', desc: 'Get work done, pay when you approve', exact: true })}

              {/* ── Jobs (expandable): doing work first, then the jobs you posted ── */}
              <DrawerGroup label="Jobs" icon="briefcase" subtitle="Find work and manage your jobs" defaultOpen={inAny(['/tasks', '/job-monitor', '/bookmarks', '/my-tasks', '/my-work', '/my-reviews', '/manage-jobs', '/campaigns', '/reviews-to-write'])}>
                {item({ sub: true, to: '/tasks', icon: 'checklist', title: 'Find jobs', desc: 'Paid work you can do today' })}
                {item({ sub: true, to: '/job-monitor', icon: 'activity', title: 'Job monitor', desc: "New jobs as they're posted" })}
                {item({ sub: true, to: '/bookmarks', icon: 'bookmark', title: 'Saved jobs', desc: 'Jobs you saved for later' })}
                {item({ sub: true, to: '/my-tasks', icon: 'list-check', title: "Jobs I'm doing", desc: 'Jobs you took and their payment' })}
                {item({ sub: true, to: '/my-work', icon: 'user-check', title: 'Hired & orders', desc: 'Work you were picked for, orders to deliver' })}
                {item({ sub: true, to: '/my-reviews', icon: 'star', title: 'My reviews', desc: 'What posters said about your work' })}
                {item({ sub: true, to: '/manage-jobs', icon: 'briefcase', title: 'Jobs I posted', desc: 'Review work and pay people' })}
                {item({ sub: true, to: '/campaigns', icon: 'speakerphone', title: 'Campaigns', desc: 'Jobs grouped under one budget' })}
                {item({ sub: true, to: '/reviews-to-write', icon: 'star', title: 'Reviews to write', desc: 'Rate people who worked for you' })}
              </DrawerGroup>

              {/* ── Store (expandable) ── */}
              <DrawerGroup label="Store" icon="building-store" subtitle="Products and services" defaultOpen={inAny(['/store', '/my-store', '/orders'])}>
                {item({ sub: true, to: '/store', icon: 'building-store', title: 'Browse store', desc: 'Find products and services', exact: true })}
                {item({ sub: true, to: '/store/orders', icon: 'receipt', title: 'My orders', desc: 'What you bought' })}
                {item({ sub: true, to: '/my-store', icon: 'building-store', title: 'My store', desc: 'Sell your products' })}
              </DrawerGroup>

              {/* ── Discover ── */}
              <DrawerGroup label="Discover" icon="compass" subtitle="People, rankings and what's next" defaultOpen={inAny(['/workers', '/creators', '/leaderboard', '/rank', '/writer', '/roadmap', '/vault'])}>
                {item({ sub: true, to: '/workers', icon: 'user-search', title: 'Find workers', desc: 'Hire people for your work' })}
                {item({ sub: true, to: '/creators', icon: 'speakerphone', title: 'Creators', desc: 'Hire verified micro-influencers' })}
                {item({ sub: true, to: '/leaderboard', icon: 'trophy', title: 'Leaderboard', desc: 'Top earners and posters' })}
                {item({ sub: true, to: '/rank', icon: 'award', title: 'Your rank', desc: 'Claim a new rank, see your X score' })}
                {item({ sub: true, to: '/writer', icon: 'pencil', title: 'Writer workspace', desc: 'Writing jobs and tips' })}
                {item({ sub: true, to: '/roadmap', icon: 'map-2', title: 'Roadmap', desc: "What we're building next" })}
                {item({ sub: true, to: '/vault', icon: 'shield-lock', title: 'Vault', desc: 'Your share of platform revenue' })}
              </DrawerGroup>

              {item({ to: '/communities', icon: 'users', title: 'Communities', desc: 'Join or start a community' })}
              {item({ to: '/blog', icon: 'news', title: 'Blog', desc: 'News and guides' })}
              {item({ to: '/faq', icon: 'help-circle', title: 'FAQ', desc: 'Answers to common questions' })}
              {item({ to: '/support', icon: 'headset', title: 'Support', desc: 'Ask our team for help' })}

              <div className="oga-drawer-divider" />

              {/* ── Admin (admins only) ── */}
              {user?.role === 'ADMIN' && item({ to: '/admin', icon: 'shield-cog', title: 'Admin panel', desc: 'Withdrawals, identity checks, moderation' })}

              {/* ── Account ── */}
              <DrawerGroup label="Account" icon="user-circle" subtitle="Profile, wallet, settings" defaultOpen={inAny(['/profile', '/edit-profile', '/wallet', '/deposit', '/earnings', '/referrals', '/analytics', '/developer', '/settings', '/warnings'])}>
                {item({ sub: true, to: '/profile', icon: 'user', title: 'My profile', desc: 'View and edit your profile' })}
                {item({ sub: true, to: '/wallet', icon: 'wallet', title: 'Wallet', desc: 'Balance, deposits and withdrawals' })}
                {item({ sub: true, to: '/earnings', icon: 'coin', title: 'Earnings', desc: 'What you earned and from where' })}
                {item({ sub: true, to: '/referrals', icon: 'user-plus', title: 'Referrals', desc: 'Invite friends, see your bonuses' })}
                {item({ sub: true, to: '/analytics', icon: 'chart-bar', title: 'Analytics', desc: 'Your earnings and activity' })}
                {devMode && item({ sub: true, to: '/developer', icon: 'code', title: 'Developer API', desc: 'Keys and docs' })}
                {item({ sub: true, to: '/settings', icon: 'settings', title: 'Settings', desc: 'Account, payments, alerts' })}
                {hasWarnings && item({ sub: true, to: '/warnings', icon: 'alert-triangle', title: 'Warnings', desc: 'Your warnings and appeals' })}
              </DrawerGroup>

              <CurrencySwitch />

              {/* ── Log out ── */}
              <button className="oga-drawer-item oga-drawer-logout" onClick={() => { logout(); onClose(); navigate('/'); }}>
                <span className="oga-drawer-icon oga-drawer-icon-logout"><i className="ti ti-logout" /></span>
                <span><strong>Log out</strong><small>Sign out of your account</small></span>
              </button>
            </nav>
          </>
        )}
      </div>
    </div>
  )
}
