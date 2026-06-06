import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'

// ─── Lazy-loaded pages ───
const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const Wallet = lazy(() => import('./pages/Wallet'))
const Earnings = lazy(() => import('./pages/Earnings'))
const Referrals = lazy(() => import('./pages/Referrals'))
const Settings = lazy(() => import('./pages/Settings'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Messages = lazy(() => import('./pages/Messages'))
const MyTasks = lazy(() => import('./pages/MyTasks'))
const MyStore = lazy(() => import('./pages/MyStore'))
const Tasks = lazy(() => import('./pages/Tasks'))
const JobDetail = lazy(() => import('./pages/JobDetail'))
const Store = lazy(() => import('./pages/Store'))
const CreateJob = lazy(() => import('./pages/CreateJob'))
const WorkerPortal = lazy(() => import('./pages/WorkerPortal'))
const Communities = lazy(() => import('./pages/Communities'))
const CommunityDetail = lazy(() => import('./pages/CommunityDetail'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Support = lazy(() => import('./pages/Support'))
const Vault = lazy(() => import('./pages/Vault'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogEditor = lazy(() => import('./pages/BlogEditor'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const JobMonitor = lazy(() => import('./pages/JobMonitor'))
const EditProfile = lazy(() => import('./pages/EditProfile'))
const TaskHistory = lazy(() => import('./pages/TaskHistory'))
const Developer = lazy(() => import('./pages/Developer'))
const Roadmap = lazy(() => import('./pages/Roadmap'))
const Workers = lazy(() => import('./pages/Workers'))
const Wurkers = lazy(() => import('./pages/Wurkers'))
const WorkerApply = lazy(() => import('./pages/WorkerApply'))
const WurkerApply = lazy(() => import('./pages/WurkerApply'))
const Writer = lazy(() => import('./pages/Writer'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Bookmarks = lazy(() => import('./pages/Bookmarks'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const Admin = lazy(() => import('./pages/Admin'))

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

// ─── Auth Guard ───
function AuthGuard({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/tasks" element={<Tasks />} />
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

            {/* ── Authenticated routes ── */}
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

            {/* ── Create job routes (collapsed) ── */}
            <Route path="/create" element={<AuthGuard><CreateJob /></AuthGuard>} />
            <Route path="/createcustom" element={<Navigate to="/create?type=custom" replace />} />
            <Route path="/createsocial" element={<Navigate to="/create?type=social" replace />} />
            <Route path="/tasks/new" element={<Navigate to="/create" replace />} />

            {/* ── Blog editor (auth-guarded) ── */}
            <Route path="/blog/write" element={<AuthGuard><BlogEditor /></AuthGuard>} />
            <Route path="/blog/edit/:id" element={<AuthGuard><BlogEditor /></AuthGuard>} />

            {/* ── Workers (renamed from Wurkers) ── */}
            <Route path="/workers" element={<Workers />} />
            <Route path="/wurker-apply" element={<Navigate to="/worker-apply" replace />} />

            {/* ── Developer & Roadmap ── */}
            <Route path="/developer" element={<AuthGuard><Developer /></AuthGuard>} />
            <Route path="/roadmap" element={<Roadmap />} />

            {/* ── Admin ── */}
            <Route path="/admin" element={<AuthGuard><Admin /></AuthGuard>} />
            <Route path="/admin/*" element={<AuthGuard><Admin /></AuthGuard>} />

            {/* ── Catch-all ── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  )
}
