import { lazy, ReactNode } from 'react'
import ProtectedRoute from '../components/ProtectedRoute'
import type { RouteConfig } from './PublicRoutes'

const Admin = lazy(() => import('../pages/Admin'))

function AG({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export const adminRoutes: RouteConfig[] = [
  { path: '/admin', element: <AG><Admin /></AG> },
  { path: '/admin/*', element: <AG><Admin /></AG> },
]
