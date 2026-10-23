import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
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

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isAuthed, isLoading, user } = useAuth()
  const { theme, toggle } = useTheme()
  const { convert, preferredCurrency } = useCurrency()
  // Shared with the dock: one check for both (lib/shared)
  const unreadNotifs = useUnreadCount(isAuthed)
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
        <Link className="brand" to="/">
          <span className="logo-mark"><OgaLogo /></span>
          OgaPay
        </Link>
        {/* nav-link-dock: also in the bottom dock, so hidden on tablets where the dock shows (nav.css) */}
        <div className="nav-links">
          <NavLink className="nav-link nav-link-dock" to="/tasks"><i className="ti ti-briefcase" />Jobs</NavLink>
          <NavLink className="nav-link nav-link-dock" to="/create"><i className="ti ti-square-plus" />Create</NavLink>
          <NavLink className="nav-link nav-link-dock" to="/store"><i className="ti ti-building-store" />Store</NavLink>
          <NavLink className="nav-link" to="/vault"><i className="ti ti-shield-lock" />Vault</NavLink>
          <NavLink className="nav-link" to="/faq"><i className="ti ti-help-circle" />FAQ</NavLink>
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
              <button className="profile-btn" onClick={() => navigate('/profile')} aria-label="Profile">
                {user?.avatar ? (
                  <img src={sized(user.avatar, 36, true)} alt={user.displayName || user.username} />
                ) : (
                  <Silhouette />
                )}
                {unreadNotifs > 0 && <span className="notif-dot" />}
              </button>
            </>
          )}
          {!isLoading && !isAuthed && (
            <button className="connect-btn" onClick={() => openSignIn()}>
              <i className="ti ti-wallet" />
              Sign in
            </button>
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
        <Link to="/" className="tap flex items-center no-underline gap-1.5" style={{textDecoration:'none',color:'inherit',fontWeight:800,fontSize:16}}>
          <Logo size={28} />
          <span>OgaPay</span>
        </Link>
        <div className="nav-mobile-actions flex items-center">
          {!isLoading && isAuthed ? (
            <button className="balance-display" onClick={() => navigate('/wallet')} aria-label={`Wallet: total of all your wallets, ${balanceText}`} title={balanceTip}>
              <small className="balance-total-label">Total</small> {balanceText}
            </button>
          ) : (
            <button className="connect-btn nav-mobile-signin" onClick={() => openSignIn()}>
              Sign in
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
