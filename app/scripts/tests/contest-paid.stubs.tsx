// Stand-ins for contest-paid.test.cjs: the page frame (menus and footer) and the
// signed-in poster. ManageJobs, Toast, lib/api and lib/contestPrizes are the real ones.
import type { ReactNode } from 'react'

export default function Layout({ children }: { children?: ReactNode }) {
  return <main>{children}</main>
}

export const useAuth = () => ({ user: { id: 'u1', username: 'shalom', role: 'USER' }, isAuthed: true })
