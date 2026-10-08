import { useState, useEffect, useRef, ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import Navbar from './Navbar'
import Drawer from './Drawer'
import Sidebar from './Sidebar'
import Footer from './Footer'
import BottomNav from './BottomNav'
import JobAlertToast from './JobAlertToast'

interface LayoutProps {
  children: ReactNode
  sidebar?: boolean
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
      <BottomNav />
      <div className="toast" id="appToast" />
      <JobAlertToast />
    </>
  )
}
