// Stand-ins for support-ticket-link.test.cjs: the page frame (Navbar, menus)
// and this device's push alerts. Support, AuthContext, SignInHost, Toast and
// lib/api are real.
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return <main>{children}</main>
}

export const dropPushOnSignOut = async () => {}
