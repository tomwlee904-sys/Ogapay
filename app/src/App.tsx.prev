import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CurrencyProvider } from './context/CurrencyContext'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import PageLoader from './components/PageLoader'
import { JobAlertProvider } from './contexts/JobAlertContext'
import { WalletBalanceProvider } from './context/WalletBalanceContext'

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
const StoreProduct = lazy(() => import('./pages/StoreProduct'))
const StorePayment = lazy(() => import('./pages/StorePayment'))
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'))
const SubmissionPage = lazy(() => import('./pages/SubmissionPage'))
const CreateJob = lazy(() => import('./pages/CreateJob'))
const WorkerPortal = lazy(() => import('./pages/WorkerPortal'))
const Communities = lazy(() => import('./pages/Communities'))
const CreateCommunity = lazy(() => import('./pages/CreateCommunity'))
const CommunityDetail = lazy(() => import('./pages/CommunityDetail'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Support = lazy(() => import('./pages/Support'))
const Vault = lazy(() => import('./pages/Vault'))
const Safe = lazy(() => import('./pages/Safe'))
const VaultHistory = lazy(() => import('./pages/VaultHistory'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const VeryCallback = lazy(() => import('./pages/VeryCallback'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogEditor = lazy(() => import('./pages/BlogEditor'))
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'))
const AdminBlog = lazy(() => import('./pages/AdminBlog'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const JobMonitor = lazy(() => import('./pages/JobMonitor'))
const EditProfile = lazy(() => import('./pages/EditProfile'))
const TaskHistory = lazy(() => import('./pages/TaskHistory'))
const Developer = lazy(() => import('./pages/Developer'))
const Roadmap = lazy(() => import('./pages/Roadmap'))
const UseCasePage = lazy(() => import('./pages/usecase'))
const About = lazy(() => import('./pages/About'))
const Workers = lazy(() => import('./pages/Workers'))
const WorkerWorkspace = lazy(() => import('./pages/WorkerWorkspace'))
const Writer = lazy(() => import('./pages/Writer'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Bookmarks = lazy(() => import('./pages/Bookmarks'))
const ManageJobs = lazy(() => import('./pages/ManageJobs'))
const PostJobPage = lazy(() => import('./pages/Jobs/PostJobPage'))

const JobsListingPage = lazy(() => import('./pages/Jobs/JobsListingPage'))

const JobDetailPage = lazy(() => import('./pages/JobDetail'))

const MyJobListingsPage = lazy(() => import('./pages/Jobs/MyJobListingsPage'))

const UserProfile = lazy(() => import('./pages/UserProfile'))
const Admin = lazy(() => import('./pages/Admin'))
const AdminVault = lazy(() => import('./pages/AdminVault'))
const AdminModeration = lazy(() => import('./pages/AdminModeration'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const WorkspacePortal = lazy(() => import('./pages/WorkspacePortal'))
const Docs = lazy(() => import('./pages/Docs'))
const LinkWallet = lazy(() => import('./pages/LinkWallet'))
const DevicePairing = lazy(() => import('./pages/DevicePairing'))
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'))
const FeatureGridPage = lazy(() => import('./pages/FeatureGridPage'))
const Ecosystem = lazy(() => import('./pages/Ecosystem'))
const RankUpgrade = lazy(() => import("./pages/RankUpgrade"))

// ─── Auth Guard ───
function AuthGuard({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
          <WalletBalanceProvider>
          <CurrencyProvider>
        <ToastProvider>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <JobAlertProvider>
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/verify/callback" element={<VeryCallback />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/features" element={<FeaturesPage />} />
<Route path="/feature-grid" element={<FeatureGridPage />} />
            <Route path="/ecosystem" element={<Ecosystem />} />
            <Route path="/rank" element={<RankUpgrade />} />
            <Route path="/blog/:slug" element={<ArticleDetail />} />
            <Route path="/tasks" element={<Tasks />} />
<Route path="/tasks/:id/submit" element={<AuthGuard><SubmissionPage /></AuthGuard>} />
            <Route path="/tasks/:id/submissions" element={<AuthGuard><SubmissionPage /></AuthGuard>} />
            <Route path="/jobs" element={<Navigate to="/tasks" replace />} />

            <Route path="/tasks/:id" element={<JobDetail />} />
            <Route path="/store/pay/:id" element={<AuthGuard><StorePayment /></AuthGuard>} />
            <Route path="/orders/:id" element={<AuthGuard><OrderConfirmation /></AuthGuard>} />
            <Route path="/store/:id" element={<StoreProduct />} />
            <Route path="/store" element={<Store />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/communities/create" element={<CreateCommunity />} />
            <Route path="/communities/:id" element={<CommunityDetail />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/support" element={<Support />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/vault/history" element={<VaultHistory />} />
            <Route path="/developer" element={<Developer />} />
            <Route path="/safe" element={<ProtectedRoute><Safe /></ProtectedRoute>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/writer" element={<Writer />} />
            <Route path="/user/:username" element={<UserProfile />} />

            {/* ── Authenticated routes ── */}
            <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
            <Route path="/wallet" element={<AuthGuard><Wallet /></AuthGuard>} />
            <Route path="/link-wallet" element={<AuthGuard><LinkWallet /></AuthGuard>} />
            <Route path="/pair-device" element={<AuthGuard><DevicePairing /></AuthGuard>} />
            <Route path="/earnings" element={<AuthGuard><Earnings /></AuthGuard>} />
            <Route path="/referrals" element={<AuthGuard><Referrals /></AuthGuard>} />
            <Route path="/worker-portal" element={<AuthGuard><WorkerPortal /></AuthGuard>} />
            <Route path="/worker-portal/:category" element={<AuthGuard><WorkspacePortal /></AuthGuard>} />
            <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
            <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
            <Route path="/messages" element={<AuthGuard><Messages /></AuthGuard>} />
            <Route path="/my-tasks" element={<AuthGuard><MyTasks /></AuthGuard>} />
            <Route path="/my-store" element={<AuthGuard><MyStore /></AuthGuard>} />
            <Route path="/campaigns" element={<AuthGuard><Campaigns /></AuthGuard>} />
            <Route path="/post-job" element={<Navigate to="/create" replace />} />

            <Route path="/my-jobs" element={<Navigate to="/manage-jobs" replace />} />

            <Route path="/job-monitor" element={<AuthGuard><JobMonitor /></AuthGuard>} />
            <Route path="/manage-jobs" element={<AuthGuard><ManageJobs /></AuthGuard>} />
            <Route path="/edit-profile" element={<AuthGuard><EditProfile /></AuthGuard>} />
            <Route path="/task-history" element={<AuthGuard><TaskHistory /></AuthGuard>} />
            <Route path="/bookmarks" element={<AuthGuard><Bookmarks /></AuthGuard>} />
            <Route path="/communities/mine" element={<AuthGuard><Communities /></AuthGuard>} />
            <Route path="/analytics" element={<AuthGuard><Analytics /></AuthGuard>} />
            <Route path="/worker/:category" element={<AuthGuard><WorkerWorkspace /></AuthGuard>} />

            {/* ── Create job routes (collapsed) ── */}
            <Route path="/create" element={<AuthGuard><CreateJob /></AuthGuard>} />
            <Route path="/createcustom" element={<Navigate to="/create?type=custom" replace />} />
            <Route path="/createsocial" element={<Navigate to="/create?type=social" replace />} />
            <Route path="/tasks/new" element={<Navigate to="/create" replace />} />

            {/* ── Blog editor (auth-guarded) ── */}
            <Route path="/blog/write" element={<AuthGuard><BlogEditor /></AuthGuard>} />
            <Route path="/blog/edit/:id" element={<AuthGuard><BlogEditor /></AuthGuard>} />

            {/* ── Workers ── */}
            <Route path="/workers" element={<Workers />} />

            {/* ── Developer & Roadmap ── */}
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/use-cases" element={<UseCasePage />} />
            <Route path="/about" element={<About />} />

            {/* ── Admin ── */}
            <Route path="/admin" element={<AuthGuard><Admin /></AuthGuard>} />
            <Route path="/admin/blog" element={<AuthGuard><AdminBlog /></AuthGuard>} />
            <Route path="/admin/vault" element={<AuthGuard><AdminVault /></AuthGuard>} />
            <Route path="/admin/moderation" element={<AuthGuard><AdminModeration /></AuthGuard>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/*" element={<AuthGuard><Admin /></AuthGuard>} />

            {/* ── Catch-all ── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </JobAlertProvider>
        </Suspense>
        </ErrorBoundary>
        </ToastProvider>
      </CurrencyProvider>
          </WalletBalanceProvider>
          </AuthProvider>
    </ThemeProvider>
  )
}
