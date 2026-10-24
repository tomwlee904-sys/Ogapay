import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useTheme } from '../context/ThemeContext'
import { useCurrency } from '../context/CurrencyContext'
import { displayPref } from '../lib/money'
import { useUnreadCount } from '../lib/shared'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { Logo } from './Logo'
import { openSignIn } from '../lib/signin'
import { sized } from '../lib/img'
import { navSection, ownProfilePath, type NavSection } from './navTabs'

const WALLET_CURRENCIES = ['SOL', 'USDC', 'USDT', 'NGN'] as const

function OgaLogo() {
  const { theme } = useTheme()
  return (
    <span className="flex" style={{ color: theme === 'dark' ? '#fff' : '#000' }}>
      <Logo size={28} />
    </span>
  )
}

// Default avatar for people without a photo
function Silhouette() {
  return (
    <svg className="nav-silhouette" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="14" r="6.5" fill="currentColor" />
      <path d="M5 36c0-7.4 5.8-12 13-12s13 4.6 13 12z" fill="currentColor" />
    </svg>
  )
}

interface NavbarProps {
  onMenuToggle: () => void
}

// The top bar's links. dock: also in the bottom dock, so hidden on tablets
// where the dock shows (nav.css). Lit on the pages under them too (navTabs.ts).
const LINKS: { key: NavSection; to: string; icon: string; label: string; dock?: boolean }[] = [
  { key: 'jobs', to: '/tasks', icon: 'ti-briefcase', label: 'Jobs', dock: true },
  { key: 'create', to: '/create', icon: 'ti-square-plus', label: 'Create', dock: true },
  { key: 'store', to: '/store', icon: 'ti-building-store', label: 'Store', dock: true },
  { key: 'vault', to: '/vault', icon: 'ti-shield-lock', label: 'Vault' },
  { key: 'faq', to: '/faq', icon: 'ti-help-circle', label: 'FAQ' },
]

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { toast } = useToast()
  const { isAuthed, isLoading, user } = useAuth()
  const { theme, toggle } = useTheme()
  const { convert, preferredCurrency } = useCurrency()
  // Shared with the dock: one check for both (lib/shared)
  const unreadNotifs = useUnreadCount(isAuthed)
  const current = navSection(pathname, ownProfilePath(user?.username))
  const onAlerts = /^\/notifications\/?$/.test(pathname)
  // Members start from their dashboard; visitors from the homepage
  const home = isAuthed ? '/dashboard' : '/'
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  const { balances: walletBalances } = useWalletBalance()
  // The whole wallet in the display currency: naira (also for "Both") or dollars
  const inUsd = displayPref(preferredCurrency) === 'USDC'
  const total = walletBalances
    ? Object.entries(walletBalances).reduce((sum, [currency, entry]) => {
        if (WALLET_CURRENCIES.includes(currency as any) && entry) {
          const v = convert(entry.balance, currency as any, inUsd ? 'USDC' : 'NGN')
          return sum + (Number.isFinite(v) ? v : 0)
        }
        return sum
      }, 0)
    : 0
  // The pill is every wallet added up (naira + USDC/USDT/SOL converted), so it
  // can be more than the naira you can spend that the Dashboard and Wallet show.
  // It says "Total" and explains itself on hover.
  const balanceTip = `Total of all your wallets (naira, USDC, USDT and SOL) in ${inUsd ? 'dollars' : 'naira'}. Your spendable naira is on the Wallet page.`
  const balanceText = inUsd
    ? `$${(total < 0.01 ? 0 : total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₦${Math.round(Math.max(0, total)).toLocaleString('en-US')}`

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`} ref={navRef}>
      <style>{`
        @media(max-width:767px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: flex !important; }
        }
        @media(min-width:768px) {
          .nav-mobile { display: none !important; }
        }
      `}</style>

      {/* ── Desktop ── */}
      <div className="nav-inner nav-desktop">
        <Link className="brand" to={home} aria-label={isAuthed ? 'OgaPay: your dashboard' : 'OgaPay home'}>
          <span className="logo-mark"><OgaLogo /></span>
          OgaPay
        </Link>
        <div className="nav-links">
          {LINKS.map((l) => {
            const on = current === l.key
            return (
              <Link
                key={l.key}
                className={'nav-link' + (l.dock ? ' nav-link-dock' : '') + (on ? ' active' : '')}
                to={l.to}
                aria-current={on ? (pathname === l.to ? 'page' : 'true') : undefined}
              >
                <i className={`ti ${l.icon}`} aria-hidden="true" />{l.label}
              </Link>
            )
          })}
        </div>
        <div className="nav-actions">
          {isLoading && (
            <div className="w-9 h-9 grid place-items-center">
              <i className="ti ti-loader" style={{ fontSize: 18, animation: 'spin 1s linear infinite', color: 'var(--text3)' }} />
            </div>
          )}
          {!isLoading && isAuthed && (
            <>
              <button className="balance-display" onClick={() => navigate('/wallet')} aria-label={`Wallet: total of all your wallets, ${balanceText}`} title={balanceTip}>
                <small className="balance-total-label">Total</small> {balanceText}
              </button>
              {/* Alerts with the unread count; on phones and tablets it's the dock's Alerts tab (nav.css hides this there) */}
              <Link
                className={'icon-btn nav-bell' + (onAlerts ? ' on' : '')}
                to="/notifications"
                aria-label={unreadNotifs > 0 ? `Notifications, ${unreadNotifs} unread` : 'Notifications'}
                aria-current={onAlerts ? 'page' : undefined}
                title="Notifications"
              >
                <i className="ti ti-bell" aria-hidden="true" />
                {unreadNotifs > 0 && <span className="nav-badge" aria-hidden="true">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>}
              </Link>
              <button className="profile-btn" onClick={() => navigate('/profile')} aria-label="Profile">
                {user?.avatar ? (
                  <img src={sized(user.avatar, 36, true)} alt={user.displayName || user.username} />
                ) : (
                  <Silhouette />
                )}
              </button>
            </>
          )}
          {!isLoading && !isAuthed && (
            <>
              {/* nav-signin: the dock has Sign in where it shows, so nav.css hides this there */}
              <button type="button" className="nav-signin" onClick={() => openSignIn()}>Sign in</button>
              <button type="button" className="nav-signup" onClick={() => openSignIn({ view: 'signup' })}>Sign up</button>
            </>
          )}
          <button className="icon-btn" id="themeToggle" onClick={toggle} aria-label="Toggle theme">
            <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
          </button>
          <button className="icon-btn" id="menuBtn" onClick={onMenuToggle} aria-label="Open menu">
            <i className="ti ti-menu-2" />
          </button>
        </div>
      </div>
      {/* ── Mobile ── */}
      <div className="nav-mobile flex justify-between items-center w-full px-4 h-full">
        <Link to={home} aria-label={isAuthed ? 'OgaPay: your dashboard' : 'OgaPay home'} className="tap flex items-center no-underline gap-1.5" style={{textDecoration:'none',color:'inherit',fontWeight:800,fontSize:16}}>
          <Logo size={28} />
          <span>OgaPay</span>
        </Link>
        <div className="nav-mobile-actions flex items-center">
          {/* Nothing while a saved session is checked, so a member never sees Sign up flash */}
          {isLoading ? null : isAuthed ? (
            <button className="balance-display" onClick={() => navigate('/wallet')} aria-label={`Wallet: total of all your wallets, ${balanceText}`} title={balanceTip}>
              <small className="balance-total-label">Total</small> {balanceText}
            </button>
          ) : (
            // Sign in is the dock's last tab on phones
            <button type="button" className="nav-signup" onClick={() => openSignIn({ view: 'signup' })}>
              Sign up
            </button>
          )}
          <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
            <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
          </button>
          <button className="icon-btn" onClick={onMenuToggle} aria-label="Open menu">
            <i className="ti ti-menu-2" />
          </button>
        </div>
      </div>

    </header>
  )
}
