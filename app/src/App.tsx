import { Suspense } from 'react'
import { Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PublicRoutes } from './routes/PublicRoutes'
import { AuthRoutes } from './routes/AuthRoutes'
import { AdminRoutes } from './routes/AdminRoutes'

// ─── Loader ───
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: 40,
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'pageLoaderSpin .6s linear infinite',
      }} />
      <style>{`@keyframes pageLoaderSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <PublicRoutes />
                <AuthRoutes />
                <AdminRoutes />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
