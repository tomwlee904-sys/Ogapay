import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Layout from './Layout'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../context/AuthContext'

// Admin pages: signed in, and the account's role is ADMIN. The API checks the
// role on every admin request too; this keeps everyone else off empty admin
// screens. (There used to be a separate "admin login" with a password written
// into the site's code; admins now sign in like everyone else.)
function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user && user.role !== 'ADMIN') {
    return (
      <Layout>
        <div className="ui-page">
          <div className="ui-empty">
            <p style={{ margin: '0 0 14px' }}>This area is for OgaPay admins.</p>
            <Link className="ui-btn ui-btn-ghost" to="/dashboard">Go to your dashboard</Link>
          </div>
        </div>
      </Layout>
    )
  }
  return <>{children}</>
}

export default function AdminGuard({ children }: { children: ReactNode }) {
  return <ProtectedRoute><AdminOnly>{children}</AdminOnly></ProtectedRoute>
}
