import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#191C6B', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--text2)', fontSize: 14, fontWeight: 600 }}>Loading...</span>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthed, isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  if (!isAuthed) return <Navigate to="/login" replace />
  return <>{children}</>
}
