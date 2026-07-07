import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useTheme } from '../context/ThemeContext'
import { useCurrency } from '../context/CurrencyContext'
import { apiRequest } from '../lib/api'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { Logo } from './Logo'

const WALLET_CURRENCIES = ['SOL', 'USDC', 'USDT', 'NGN'] as const

function OgaLogo() {
  const { theme } = useTheme()
  return (
    <span className="flex" style={{ color: theme === 'dark' ? '#fff' : '#000' }}>
      <Logo size={28} />
    </span>
  )
}

interface NavbarProps {
  onMenuToggle: () => void
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const navigate = useNavigate()
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
          <Link className="nav-link" to="/tasks"><i className="ti ti-briefcase" />Earn</Link>
          <Link className="nav-link" to="/create"><i className="ti ti-plus-circle" />Create</Link>
          <Link className="nav-link" to="/store"><i className="ti ti-building-store" />Store</Link>
          {isAuthed && <Link className="nav-link" to="/vault"><i className="ti ti-shield-lock" />Vault</Link>}
          <Link className="nav-link" to="/faq"><i className="ti ti-help-circle" />FAQ</Link>
        </div>
        <div className="nav-actions">
          {isLoading && (
            <div className="w-9 h-9 grid place-items-center">
              <i className="ti ti-loader" style={{ fontSize: 18, animation: 'spin 1s linear infinite', color: 'var(--text3)' }} />
            </div>
          )}
          {!isLoading && isAuthed && (
            <>
              <button className="balance-display" onClick={() => navigate('/wallet')}>
                ${portfolioUsd < 0.01 ? '0.00' : portfolioUsd.toFixed(2)}
              </button>
              <button className="profile-btn" onClick={() => navigate('/profile')} aria-label="Profile">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.displayName || user.username} />
                ) : (
                  <span className="grid place-items-center w-full h-full text-xs font-extrabold bg-[--bg2] text-[--text2]">
                    {(user?.displayName || user?.username || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                {unreadNotifs > 0 && <span className="notif-dot" />}
              </button>
            </>
          )}
          {!isLoading && !isAuthed && (
            <button className="connect-btn" onClick={() => navigate('/login')}>
              <i className="ti ti-wallet" />
              Connect Wallet
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
        <div className="flex gap-[10px] items-center">
          <button className="icon-btn" onClick={() => navigate(isAuthed ? '/wallet' : '/login')} aria-label="Wallet" style={{ width: 34, height: 34 }}>
            <i className="ti ti-wallet" />
          </button>
          <button className="icon-btn w-[34px] h-[34px]" onClick={toggle} aria-label="Toggle theme">
            <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
          </button>
          <button className="icon-btn w-[34px] h-[34px]" onClick={onMenuToggle} aria-label="Open menu">
            <i className="ti ti-menu-2" />
          </button>
        </div>
      </div>

    </header>
  )
}
