import { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { publicRoutes } from './routes/PublicRoutes'
import { authRoutes } from './routes/AuthRoutes'
import { adminRoutes } from './routes/AdminRoutes'

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
                {publicRoutes.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
                {authRoutes.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
                {adminRoutes.map(r => <Route key={r.path} path={r.path} element={r.element} />)}
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
