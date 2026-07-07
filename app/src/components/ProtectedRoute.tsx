import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PageLoader from './PageLoader'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthed, isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  if (!isAuthed) return <Navigate to="/login" replace />
  return <>{children}</>
}
