import { lazy } from 'react'
import { Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

// ─── Public lazy imports ───
const HomePage = lazy(() => import('../pages/HomePage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'))
const AuthCallback = lazy(() => import('../pages/AuthCallback'))
const Blog = lazy(() => import('../pages/Blog'))
const Tasks = lazy(() => import('../pages/Tasks'))
const SubmissionPage = lazy(() => import('../pages/SubmissionPage'))
const JobDetail = lazy(() => import('../pages/JobDetail'))
const Store = lazy(() => import('../pages/Store'))
const Communities = lazy(() => import('../pages/Communities'))
const CommunityDetail = lazy(() => import('../pages/CommunityDetail'))
const FAQ = lazy(() => import('../pages/FAQ'))
const Support = lazy(() => import('../pages/Support'))
const Vault = lazy(() => import('../pages/Vault'))
const Privacy = lazy(() => import('../pages/Privacy'))
const Terms = lazy(() => import('../pages/Terms'))
const Leaderboard = lazy(() => import('../pages/Leaderboard'))
const Wurkers = lazy(() => import('../pages/Wurkers'))
const Writer = lazy(() => import('../pages/Writer'))
const UserProfile = lazy(() => import('../pages/UserProfile'))
const Workers = lazy(() => import('../pages/Workers'))
const Roadmap = lazy(() => import('../pages/Roadmap'))
const NotFound = lazy(() => import('../pages/NotFound'))

function AuthGuard({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export function PublicRoutes() {
  return (
    <>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/tasks/:id/submit" element={<AuthGuard><SubmissionPage /></AuthGuard>} />
      <Route path="/tasks/:id/submissions" element={<AuthGuard><SubmissionPage /></AuthGuard>} />
      <Route path="/tasks/:id" element={<JobDetail />} />
      <Route path="/store" element={<Store />} />
      <Route path="/communities" element={<Communities />} />
      <Route path="/communities/:id" element={<CommunityDetail />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/support" element={<Support />} />
      <Route path="/vault" element={<Vault />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/wurkers" element={<Wurkers />} />
      <Route path="/writer" element={<Writer />} />
      <Route path="/user/:username" element={<UserProfile />} />
      <Route path="/workers" element={<Workers />} />
      <Route path="/wurker-apply" element={<Navigate to="/worker-apply" replace />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="*" element={<NotFound />} />
    </>
  )
}
