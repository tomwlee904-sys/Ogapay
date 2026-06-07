import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CurrencyProvider, useCurrency } from './context/CurrencyContext'
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
const SubmissionPage = lazy(() => import('./pages/SubmissionPage'))
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
const About = lazy(() => import('./pages/About'))
const Workers = lazy(() => import('./pages/Workers'))
const Wurkers = lazy(() => import('./pages/Wurkers'))
const WorkerApply = lazy(() => import('./pages/WorkerApply'))
const WurkerApply = lazy(() => import('./pages/WurkerApply'))
const Writer = lazy(() => import('./pages/Writer'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Bookmarks = lazy(() => import('./pages/Bookmarks'))
const ManageJobs = lazy(() => import('./pages/ManageJobs'))
const UserProfile = lazy(() => import('./pages/UserProfile'))
const Admin = lazy(() => import('./pages/Admin'))

// ─── Loader ───
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#000638',
      padding: 40,
    }}>
      {/* Logo with spinning ring */}
      <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 24 }}>
        {/* Spinning ring */}
        <div style={{
          position: 'absolute', inset: -4,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#4F46E5',
          animation: 'splashSpin .8s linear infinite',
        }} />
        {/* Logo */}
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 34" fill="none" width="48" height="48">
            <rect width="34" height="34" rx="6" fill="white"/>
            <rect x="6.5" y="6.5" width="7.1" height="7.1" rx="1.3" fill="black"/>
            <path d="M15 6.5H20.7C21.5 6.5 22.2 7.2 22.2 8V13.6H15V6.5Z" fill="black"/>
            <path d="M23.4 6.5H26C29.2 6.5 31.2 8.5 31.2 11.7V13.6H23.4V6.5Z" fill="black"/>
            <rect x="6.5" y="15" width="7.1" height="7.1" fill="black"/>
            <rect x="15" y="15" width="7.1" height="7.1" fill="black"/>
            <path d="M23.4 15H31.2V16.9C31.2 20.1 29.2 22.1 26 22.1H23.4V15Z" fill="black"/>
            <rect x="6.5" y="23.4" width="7.1" height="7.1" rx="1.3" fill="black"/>
            <path d="M15 23.4H20.7C21.5 23.4 22.2 24.1 22.2 24.9V29.2C22.2 30 21.5 30.7 20.7 30.7H15V23.4Z" fill="black"/>
          </svg>
        </div>
      </div>
      {/* Brand name */}
      <h1 style={{
        fontFamily: "'Outfit', sans-serif",
        fontSize: 28,
        fontWeight: 900,
        color: '#ffffff',
        margin: '0 0 8px',
        letterSpacing: '-0.03em',
      }}>OgaPay</h1>
      {/* Loading dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F46E5', animation: 'splashDot 1.2s ease-in-out infinite', animationDelay: '0s' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366F1', animation: 'splashDot 1.2s ease-in-out infinite', animationDelay: '0.2s' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818CF8', animation: 'splashDot 1.2s ease-in-out infinite', animationDelay: '0.4s' }} />
      </div>
      <style>{`
        @keyframes splashSpin{to{transform:rotate(360deg)}}
        @keyframes splashDot{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}
      `}</style>
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
          <CurrencyProvider>
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
<Route path="/tasks/:id/submit" element={<AuthGuard><SubmissionPage /></AuthGuard>} />
            <Route path="/tasks/:id/submissions" element={<AuthGuard><JobDetail /></AuthGuard>} />
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
            <Route path="/manage-jobs" element={<AuthGuard><ManageJobs /></AuthGuard>} />
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
            <Route path="/about" element={<About />} />

            {/* ── Admin ── */}
            <Route path="/admin" element={<AuthGuard><Admin /></AuthGuard>} />
            <Route path="/admin/*" element={<AuthGuard><Admin /></AuthGuard>} />

            {/* ── Catch-all ── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </CurrencyProvider>
          </AuthProvider>
    </ThemeProvider>
  )
}
