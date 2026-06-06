import { useState, ReactNode } from 'react'
import Navbar from './Navbar'
import Drawer from './Drawer'
import Sidebar from './Sidebar'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
  sidebar?: boolean
}

export default function Layout({ children, sidebar = false }: LayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
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
      <div className="toast" id="appToast" />
    </>
  )
}
