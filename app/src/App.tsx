import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import Tasks from './pages/Tasks'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import HomePage from './pages/HomePage'
import JobMonitor from './pages/JobMonitor'
import Profile from './pages/Profile'
import Wallet from './pages/Wallet'
import WorkerPortal from './pages/WorkerPortal'
import Store from './pages/Store'
import Communities from './pages/Communities'
import Notifications from './pages/Notifications'
import Vault from './pages/Vault'
import Referrals from './pages/Referrals'
import Settings from './pages/Settings'
import Messages from './pages/Messages'
import MyStore from './pages/MyStore'
import MyTasks from './pages/MyTasks'
import FAQ from './pages/FAQ'
import Earnings from './pages/Earnings'
import Leaderboard from './pages/Leaderboard'
import Campaigns from './pages/Campaigns'
import Support from './pages/Support'
import CreateJob from './pages/CreateJob'
import CommunityDetail from './pages/CommunityDetail'
import Blog from './pages/Blog'
import BlogEditor from './pages/BlogEditor'
import NotFound from './pages/NotFound'
import EditProfile from './pages/EditProfile'
import AuthCallback from './pages/AuthCallback'
import ForgotPassword from './pages/ForgotPassword'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import TaskHistory from './pages/TaskHistory'

function AuthGuard({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:id" element={<Tasks />} />
          <Route path="/store" element={<Store />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/communities/:id" element={<CommunityDetail />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/support" element={<Support />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/blog/write" element={<BlogEditor />} />
          <Route path="/blog/edit/:id" element={<BlogEditor />} />

          {/* Authenticated routes */}
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
          <Route path="/create" element={<AuthGuard><CreateJob /></AuthGuard>} />
          <Route path="/createcustom" element={<AuthGuard><CreateJob /></AuthGuard>} />
          <Route path="/createsocial" element={<AuthGuard><CreateJob /></AuthGuard>} />
          <Route path="/tasks/new" element={<AuthGuard><CreateJob /></AuthGuard>} />
          <Route path="/edit-profile" element={<AuthGuard><EditProfile /></AuthGuard>} />
          <Route path="/task-history" element={<AuthGuard><TaskHistory /></AuthGuard>} />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
