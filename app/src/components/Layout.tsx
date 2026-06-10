import { useState, useEffect, ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import Drawer from './Drawer'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  children: ReactNode
  sidebar?: boolean
}

function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  if (!user) return null

  const tabs = [
    { icon: 'home', label: 'Home', path: '/dashboard' },
    { icon: 'briefcase', label: 'Tasks', path: '/tasks' },
    { icon: 'currency-naira', label: 'Wallet', path: '/wallet' },
    { icon: 'user', label: 'Profile', path: '/profile' },
    { icon: 'dots', label: 'More', path: '/worker-portal' },
  ]

  return (
    <>
      <style>{`
        .btb{position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--card);border-top:1px solid var(--border);display:flex;align-items:center;height:60px;padding:0 4px;padding-bottom:env(safe-area-inset-bottom)}
        .btb-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;padding:8px 4px;border-radius:10px;transition:background .15s;border:none;background:transparent;font-family:inherit}
        .btb-tab:hover{background:var(--bg2)}
        .btb-tab i{font-size:20px;color:var(--text3);transition:color .15s}
        .btb-tab span{font-size:10px;font-weight:700;color:var(--text3);transition:color .15s}
        .btb-tab.active i,.btb-tab.active span{color:#191C6B}
        .btb-tab.active{background:rgba(25,28,107,0.03)}
        @media(min-width:769px){.btb{display:none}}
        @media(max-width:768px){.app-layout{padding-bottom:60px!important}}
      `}</style>
      <div className="btb">
        {tabs.map(t => (
          <button
            key={t.path}
            className={`btb-tab${location.pathname === t.path || location.pathname.startsWith(t.path + '/') ? ' active' : ''}`}
            onClick={() => navigate(t.path)}
          >
            <i className={`ti ti-${t.icon}`} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function FAB() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  if (!user) return null

  const actions = [
    { icon: 'search', label: 'Browse Tasks', path: '/tasks' },
    { icon: 'plus', label: 'Create Task', path: '/create' },
    { icon: 'wallet', label: 'Wallet', path: '/wallet' },
    { icon: 'arrow-up', label: 'Withdraw', path: '/wallet' },
  ]

  return (
    <>
      <style>{`
        .fab-wrap{position:fixed;bottom:72px;right:16px;z-index:99;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
        .fab-btn{width:52px;height:52px;border-radius:50%;border:none;background:#191C6B;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(25,28,107,.35);transition:transform .2s;font-size:22px}
        .fab-btn:hover{transform:scale(1.08)}
        .fab-btn.open{transform:rotate(45deg)}
        .fab-actions{display:flex;flex-direction:column;gap:8px;align-items:flex-end}
        .fab-action{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border);border-radius:24px;padding:8px 16px 8px 12px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.1);white-space:nowrap;font-size:13px;font-weight:700;color:var(--text);transition:all .15s;font-family:inherit}
        .fab-action:hover{border-color:#191C6B;background:rgba(25,28,107,0.03)}
        .fab-action i{font-size:16px;color:#191C6B}
        @media(min-width:769px){.fab-wrap{display:none}}
      `}</style>
      <div className="fab-wrap">
        {open && (
          <div className="fab-actions">
            {actions.map(a => (
              <div key={a.path} className="fab-action" onClick={() => { navigate(a.path); setOpen(false) }}>
                <i className={`ti ti-${a.icon}`} />
                {a.label}
              </div>
            ))}
          </div>
        )}
        <button className={`fab-btn${open ? ' open' : ''}`} onClick={() => setOpen(o => !o)}>
          <i className="ti ti-plus" />
        </button>
      </div>
      {open && <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:98 }} />}
    </>
  )
}

export default function Layout({ children, sidebar = false }: LayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Save scroll position before page changes
  useEffect(() => {
    const saveScroll = () => sessionStorage.setItem('scrollY', String(window.scrollY))
    window.addEventListener('beforeunload', saveScroll)
    return () => window.removeEventListener('beforeunload', saveScroll)
  }, [])

  // Restore scroll position on mount
  useEffect(() => {
    const y = sessionStorage.getItem('scrollY')
    if (y) {
      const num = parseInt(y, 10)
      if (!isNaN(num)) requestAnimationFrame(() => window.scrollTo(0, num))
    }
  }, [])

  return (
    <>
      {!online && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#EF4444', color: '#fff', textAlign: 'center', padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
          <i className="ti ti-wifi-off" style={{ marginRight: 6 }} /> You are offline — some features may be unavailable
        </div>
      )}
      <Navbar onMenuToggle={() => setDrawerOpen(true)} />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="app-layout">
        <main className="main">
          <section className="page">
            {children}
          </section>
        </main>
        {sidebar && <Sidebar />}
      </div>
      <Footer />
      <FAB />
      <BottomTabBar />
      <div className="toast" id="appToast" />
    </>
  )
}
