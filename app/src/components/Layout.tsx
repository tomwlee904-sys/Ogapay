import { useState, useEffect, useRef, ReactNode } from 'react'
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom'
import Navbar from './Navbar'
import Drawer from './Drawer'
import Sidebar from './Sidebar'
import Footer from './Footer'
import BottomNav from './BottomNav'
import JobAlertToast from './JobAlertToast'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  children: ReactNode
  sidebar?: boolean
}

function FAB() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const isAuthed = !!user

  const actions = [
    { icon: 'search', label: 'Browse Tasks', path: '/tasks' },
    { icon: 'plus', label: 'Create Task', path: '/create' },
    { icon: 'wallet', label: 'Wallet', path: '/wallet' },
    { icon: 'arrow-up', label: 'Withdraw', path: '/wallet' },
  ]

  return (
    <>
      <style>{`
        .fab-wrap{position:fixed;bottom:calc(var(--bottom-nav-h) + 12px + env(safe-area-inset-bottom,0px));right:16px;z-index:99;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
        .fab-btn{width:52px;height:52px;border-radius:50%;border:none;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(var(--accent-rgb),.35);transition:transform .2s;font-size:22px}
        .fab-btn:hover{transform:scale(1.08)}
        .fab-btn.open{transform:rotate(45deg)}
        .fab-actions{display:flex;flex-direction:column;gap:8px;align-items:flex-end}
        .fab-action{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border);border-radius:24px;padding:8px 16px 8px 12px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.1);white-space:nowrap;font-size:13px;font-weight:700;color:var(--text);transition:all .15s;font-family:inherit}
        .fab-action:hover{border-color:var(--accent);background:rgba(var(--accent-rgb),0.03)}
        .fab-action i{font-size:16px;color:var(--accent)}
        @media(min-width:769px){.fab-wrap{display:none}}
      `}</style>
      <div className="fab-wrap">
        {open && isAuthed && (
          <div className="fab-actions">
            {actions.map(a => (
              <div key={a.path} className="fab-action" onClick={() => { navigate(a.path); setOpen(false) }}>
                <i className={`ti ti-${a.icon}`} />
                {a.label}
              </div>
            ))}
          </div>
        )}
        <button className={`fab-btn${open ? ' open' : ''}`} onClick={() => { if (!isAuthed) { navigate('/login'); } else { setOpen(o => !o); }}}>
          <i className="ti ti-plus" />
        </button>
      </div>
      {open && isAuthed && <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:98 }} />}
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

  const location = useLocation()
  const navigationType = useNavigationType()
  const scrollRef = useRef<Record<string, number>>({})
  const scrollKey = location.pathname + location.search

  // Save scroll per route before navigating away
  useEffect(() => {
    return () => { scrollRef.current[scrollKey] = window.scrollY }
  }, [scrollKey])

  // Restore scroll on POP (back/forward) navigation only
  // Use a small delay so async content has time to render before restoring position
  useEffect(() => {
    if (navigationType !== 'POP') return
    const saved = scrollRef.current[scrollKey]
    if (saved) {
      setTimeout(() => window.scrollTo(0, saved), 30)
    }
  }, [scrollKey, navigationType])

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
      <BottomNav />
      <div className="toast" id="appToast" />
      <JobAlertToast />
    </>
  )
}
