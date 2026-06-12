import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { apiRequest } from '../lib/api'

const OGA_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" fill="none"><rect width="34" height="34" rx="6" fill="white"/><rect x="6.5" y="6.5" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 6.5H20.7C21.5 6.5 22.2 7.2 22.2 8V13.6H15V6.5Z" fill="black"/><path d="M23.4 6.5H26C29.2 6.5 31.2 8.5 31.2 11.7V13.6H23.4V6.5Z" fill="black"/><rect x="6.5" y="15" width="7.1" height="7.1" fill="black"/><rect x="15" y="15" width="7.1" height="7.1" fill="black"/><path d="M23.4 15H31.2V16.9C31.2 20.1 29.2 22.1 26 22.1H23.4V15Z" fill="black"/><rect x="6.5" y="23.4" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 23.4H20.7C21.5 23.4 22.2 24.1 22.2 24.9V29.2C22.2 30 21.5 30.7 20.7 30.7H15V23.4Z" fill="black"/></svg>`

interface NavbarProps {
  onMenuToggle: () => void
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const { isAuthed, user } = useAuth()
  const { theme, toggle } = useTheme()
  const balance = user?.wallet?.NGN?.balance ?? 0
  const formattedBalance = balance.toLocaleString()
  const [unreadNotifs, setUnreadNotifs] = useState(0)

  useEffect(() => {
    if (!isAuthed) return
    let cancelled = false
    async function fetchUnread() {
      try {
        const data = await apiRequest<any>('/notifications?limit=10')
        const items = Array.isArray(data) ? data : data?.notifications ?? []
        if (!cancelled) setUnreadNotifs(items.filter((n: any) => !(n.read ?? n.isRead ?? false)).length)
      } catch {}
    }
    fetchUnread()
    const onFocus = () => fetchUnread()
    window.addEventListener('focus', onFocus)
    const interval = setInterval(fetchUnread, 30000)
    return () => { cancelled = true; window.removeEventListener('focus', onFocus); clearInterval(interval) }
  }, [isAuthed])

  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="brand" href="/">
          <span className="logo-mark" dangerouslySetInnerHTML={{ __html: OGA_LOGO }} />
          OgaPay
        </a>
        <div className="nav-links">
          <a className="nav-link" href="/"><i className="ti ti-home" />Home</a>
          <a className="nav-link" href="/tasks"><i className="ti ti-checklist" />Tasks</a>
          <a className="nav-link" href="/jobs"><i className="ti ti-briefcase" />Jobs</a>
          <a className="nav-link" href="/store"><i className="ti ti-building-store" />Store</a>

          <a className="nav-link" href="/faq"><i className="ti ti-help-circle" />FAQ</a>
        </div>
        <div className="nav-actions">
          {!isAuthed && (
            <>
              <a className="wallet-btn" href="/login"><i className="ti ti-login" /> Login</a>
            </>
          )}
          {isAuthed && (
            <a className="balance-chip" href="/wallet">
              BALANCE: &#8358;{formattedBalance}
            </a>
          )}
          {isAuthed && (
            <a className="icon-btn" href="/notifications" aria-label="Notifications" style={{ position: 'relative', textDecoration: 'none' }}>
              <i className="ti ti-bell" />
              {unreadNotifs > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#dc2626', color: '#fff',
                  fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>
              )}
            </a>
          )}
          <button className="icon-btn" id="themeToggle" onClick={toggle} aria-label="Toggle theme">
            <i className={`ti ${theme === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
          </button>
          <button className="icon-btn" id="menuBtn" onClick={onMenuToggle} aria-label="Open menu">
            <i className="ti ti-menu-2" />
          </button>
        </div>
      </div>
    </header>
  )
}
