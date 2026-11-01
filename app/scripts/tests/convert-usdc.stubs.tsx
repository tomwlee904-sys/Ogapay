// Stand-ins for convert-usdc.test.cjs: the page frame and the signed-in person.
// The pages under test, their sheets and lib/api are the real ones.
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) { return <main>{children}</main> }
export const useAuth = () => ({
  isAuthed: true,
  user: { id: 'u1', username: 'ada' },
  refreshUser: () => { const w = window as any; w.__refreshUser = (w.__refreshUser || 0) + 1 },
})
export const useWalletBalance = () => ({ refresh: () => {} })
