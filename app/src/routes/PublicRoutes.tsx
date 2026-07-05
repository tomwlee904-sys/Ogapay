import { lazy, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

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

function AG({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export interface RouteConfig {
  path: string
  element: ReactNode
}

export const publicRoutes: RouteConfig[] = [
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <Navigate to="/login" replace /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '/blog', element: <Blog /> },
  { path: '/tasks', element: <Tasks /> },
  { path: '/tasks/:id/submit', element: <AG><SubmissionPage /></AG> },
  { path: '/tasks/:id/submissions', element: <AG><SubmissionPage /></AG> },
  { path: '/tasks/:id', element: <JobDetail /> },
  { path: '/store', element: <Store /> },
  { path: '/communities', element: <Communities /> },
  { path: '/communities/:id', element: <CommunityDetail /> },
  { path: '/faq', element: <FAQ /> },
  { path: '/support', element: <Support /> },
  { path: '/vault', element: <Vault /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/terms', element: <Terms /> },
  { path: '/leaderboard', element: <Leaderboard /> },
  { path: '/wurkers', element: <Wurkers /> },
  { path: '/writer', element: <Writer /> },
  { path: '/user/:username', element: <UserProfile /> },
  { path: '/workers', element: <Workers /> },
  { path: '/wurker-apply', element: <Navigate to="/worker-apply" replace /> },
  { path: '/roadmap', element: <Roadmap /> },
  { path: '*', element: <NotFound /> },
]
