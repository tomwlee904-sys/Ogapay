// Stand-in for vault-launch.test.cjs: the page frame. The Vault page and lib/api are real.
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) { return <main style={{ padding: '16px' }}>{children}</main> }
