import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useTheme } from '../context/ThemeContext'
import { useCurrency } from '../context/CurrencyContext'
import { apiRequest } from '../lib/api'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { Logo } from './Logo'
import { openSignIn } from '../lib/signin'

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
  const { convert } = useCurrency()
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  const { balances: walletBalances } = useWalletBalance()
  const portfolioUsd = walletBalances
    ? Object.entries(walletBalances).reduce((sum, [currency, entry]) => {
        if (WALLET_CURRENCIES.includes(currency as any) && entry) {
          return sum + convert(entry.balance, currency as any, 'USDC')
        }
        return sum
      }, 0)
    : 0
  const balanceText = `$${(portfolioUsd < 0.01 ? 0 : portfolioUsd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  useEffect(() => {
    if (!isAuthed) return
    let cancelled = false
    async function fetchUnread() {
      try {
        const data = await apiRequest<any>('/notifications?limit=10')
        const items = Array.isArray(data) ? data : data?.notifications ?? []
        if (!cancelled) setUnreadNotifs(items.filter((n: any) => !(n.read ?? n.isRead ?? false)).length)
      } catch { toast('Failed to load notifications', 'error'); }
    }
    fetchUnread()
    const onFocus = () => fetchUnread()
    window.addEventListener('focus', onFocus)
    const interval = setInterval(fetchUnread, 30000)
    return () => { cancelled = true; window.removeEventListener('focus', onFocus); clearInterval(interval) }
  }, [isAuthed])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav${scrolled ? ' scrolled' : ''}`} ref={navRef}>
      <style>{`
        @media(max-width:768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: flex !important; }
        }
        @media(min-width:769px) {
          .nav-mobile { display: none !important; }
        }
      `}</style>

      {/* ── Desktop ── */}
      <div className="nav-inner nav-desktop">
        <Link className="brand" to="/">
          <span className="logo-mark"><OgaLogo /></span>
          OgaPay
        </Link>
        <div className="nav-links">
          <NavLink className="nav-link" to="/tasks"><i className="ti ti-briefcase" />Earn</NavLink>
          <NavLink className="nav-link" to="/create"><i className="ti ti-square-plus" />Create</NavLink>
          <NavLink className="nav-link" to="/store"><i className="ti ti-building-store" />Store</NavLink>
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
              <button className="balance-display" onClick={() => navigate('/wallet')} aria-label={`Wallet, ${balanceText}`}>
                {balanceText}
              </button>
              <button className="profile-btn" onClick={() => navigate('/profile')} aria-label="Profile">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.displayName || user.username} />
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
        <Link to="/" className="flex items-center no-underline gap-1.5" style={{textDecoration:'none',color:'inherit',fontWeight:800,fontSize:16}}>
          <Logo size={28} />
          <span>OgaPay</span>
        </Link>
        <div className="nav-mobile-actions flex items-center">
          {!isLoading && isAuthed ? (
            <button className="balance-display" onClick={() => navigate('/wallet')} aria-label={`Wallet, ${balanceText}`}>
              {balanceText}
            </button>
          ) : (
            <button className="icon-btn" onClick={() => openSignIn({ redirect: '/wallet' })} aria-label="Wallet">
              <i className="ti ti-wallet" />
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
