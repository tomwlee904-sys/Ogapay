import { lazy } from 'react'
import { Route } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

const Admin = lazy(() => import('../pages/Admin'))

function AuthGuard({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export function AdminRoutes() {
  return (
    <>
      <Route path="/admin" element={<AuthGuard><Admin /></AuthGuard>} />
      <Route path="/admin/*" element={<AuthGuard><Admin /></AuthGuard>} />
    </>
  )
}
