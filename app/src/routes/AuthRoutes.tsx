import { lazy } from 'react'
import { Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'

// ─── Auth lazy imports ───
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

function AuthGuard({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export function AuthRoutes() {
  return (
    <>
      <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
      <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
      <Route path="/wallet" element={<AuthGuard><Wallet /></AuthGuard>} />
      <Route path="/earnings" element={<AuthGuard><Earnings /></AuthGuard>} />
      <Route path="/referrals" element={<AuthGuard><Referrals /></AuthGuard>} />
      <Route path="/worker-portal" element={<AuthGuard><WorkerPortal /></AuthGuard>} />
      <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
      <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
      <Route path="/messages" element={<AuthGuard><Messages /></AuthGuard>} />
      <Route path="/my-tasks" element={<AuthGuard><MyTasks /></AuthGuard>} />
      <Route path="/my-store" element={<AuthGuard><MyStore /></AuthGuard>} />
      <Route path="/campaigns" element={<AuthGuard><Campaigns /></AuthGuard>} />
      <Route path="/job-monitor" element={<AuthGuard><JobMonitor /></AuthGuard>} />
      <Route path="/edit-profile" element={<AuthGuard><EditProfile /></AuthGuard>} />
      <Route path="/task-history" element={<AuthGuard><TaskHistory /></AuthGuard>} />
      <Route path="/bookmarks" element={<AuthGuard><Bookmarks /></AuthGuard>} />
      <Route path="/analytics" element={<AuthGuard><Analytics /></AuthGuard>} />
      <Route path="/worker-apply" element={<AuthGuard><WorkerApply /></AuthGuard>} />
      <Route path="/create" element={<AuthGuard><CreateJob /></AuthGuard>} />
      <Route path="/createcustom" element={<Navigate to="/create?type=custom" replace />} />
      <Route path="/createsocial" element={<Navigate to="/create?type=social" replace />} />
      <Route path="/tasks/new" element={<Navigate to="/create" replace />} />
      <Route path="/blog/write" element={<AuthGuard><BlogEditor /></AuthGuard>} />
      <Route path="/blog/edit/:id" element={<AuthGuard><BlogEditor /></AuthGuard>} />
      <Route path="/my-jobs" element={<Navigate to="/manage-jobs" replace />} />
      <Route path="/developer" element={<AuthGuard><Developer /></AuthGuard>} />
    </>
  )
}
