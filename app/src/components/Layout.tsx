// Scroll position on page changes (top on open, kept on Back) is ScrollManager's job, in App
import { useState, useEffect, ReactNode } from 'react'
import Navbar from './Navbar'
import Drawer from './Drawer'
import Sidebar from './Sidebar'
import Footer, { CompactFooter } from './Footer'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BottomNav from './BottomNav'
import JobAlertToast from './JobAlertToast'
import WarningBanner from './WarningBanner'

interface LayoutProps {
  children: ReactNode
  sidebar?: boolean
}

// Pages for visitors (marketing, legal, help): these keep the full footer
const FULL_FOOTER = /^\/(about|hire|roadmap|socials|brand-kit|privacy|terms|license|copyright|developer|docs|join-test-team|rank)?$/

export default function Layout({ children, sidebar = false }: LayoutProps) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const fullFooter = !user || FULL_FOOTER.test(pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname)
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
            <WarningBanner />
            {children}
          </section>
        </main>
        {sidebar && <Sidebar />}
      </div>
      {fullFooter ? <Footer /> : <CompactFooter />}
      <BottomNav />
      <div className="toast" id="appToast" />
      <JobAlertToast />
    </>
  )
}
