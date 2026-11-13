// Stand-in for the app shell (Layout) in admin-kyc-level2.test.cjs: just the page.
import type { ReactNode } from 'react'
export default function Layout({ children }: { children?: ReactNode; sidebar?: boolean }) { return <>{children}</> }
