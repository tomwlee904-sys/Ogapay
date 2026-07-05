import { lazy, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import type { RouteConfig } from './PublicRoutes'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const Profile = lazy(() => import('../pages/Profile'))
const Wallet = lazy(() => import('../pages/Wallet'))
const Earnings = lazy(() => import('../pages/Earnings'))
const Referrals = lazy(() => import('../pages/Referrals'))
const Settings = lazy(() => import('../pages/Settings'))
const Notifications = lazy(() => import('../pages/Notifications'))
const Messages = lazy(() => import('../pages/Messages'))
const MyTasks = lazy(() => import('../pages/MyTasks'))
const MyStore = lazy(() => import('../pages/MyStore'))
const Campaigns = lazy(() => import('../pages/Campaigns'))
const JobMonitor = lazy(() => import('../pages/JobMonitor'))
const EditProfile = lazy(() => import('../pages/EditProfile'))
const TaskHistory = lazy(() => import('../pages/TaskHistory'))
const Bookmarks = lazy(() => import('../pages/Bookmarks'))
const Analytics = lazy(() => import('../pages/Analytics'))
const WorkerApply = lazy(() => import('../pages/WorkerApply'))
const WorkerPortal = lazy(() => import('../pages/WorkerPortal'))
const CreateJob = lazy(() => import('../pages/CreateJob'))
const BlogEditor = lazy(() => import('../pages/BlogEditor'))
const Developer = lazy(() => import('../pages/Developer'))

function AG({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export const authRoutes: RouteConfig[] = [
  { path: '/dashboard', element: <AG><Dashboard /></AG> },
  { path: '/profile', element: <AG><Profile /></AG> },
  { path: '/wallet', element: <AG><Wallet /></AG> },
  { path: '/earnings', element: <AG><Earnings /></AG> },
  { path: '/referrals', element: <AG><Referrals /></AG> },
  { path: '/worker-portal', element: <AG><WorkerPortal /></AG> },
  { path: '/settings', element: <AG><Settings /></AG> },
  { path: '/notifications', element: <AG><Notifications /></AG> },
  { path: '/messages', element: <AG><Messages /></AG> },
  { path: '/my-tasks', element: <AG><MyTasks /></AG> },
  { path: '/my-store', element: <AG><MyStore /></AG> },
  { path: '/campaigns', element: <AG><Campaigns /></AG> },
  { path: '/job-monitor', element: <AG><JobMonitor /></AG> },
  { path: '/edit-profile', element: <AG><EditProfile /></AG> },
  { path: '/task-history', element: <AG><TaskHistory /></AG> },
  { path: '/bookmarks', element: <AG><Bookmarks /></AG> },
  { path: '/analytics', element: <AG><Analytics /></AG> },
  { path: '/worker-apply', element: <AG><WorkerApply /></AG> },
  { path: '/create', element: <AG><CreateJob /></AG> },
  { path: '/createcustom', element: <Navigate to="/create?type=custom" replace /> },
  { path: '/createsocial', element: <Navigate to="/create?type=social" replace /> },
  { path: '/tasks/new', element: <Navigate to="/create" replace /> },
  { path: '/blog/write', element: <AG><BlogEditor /></AG> },
  { path: '/blog/edit/:id', element: <AG><BlogEditor /></AG> },
  { path: '/my-jobs', element: <Navigate to="/manage-jobs" replace /> },
  { path: '/developer', element: <AG><Developer /></AG> },
]
