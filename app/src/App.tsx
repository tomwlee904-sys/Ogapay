import { Suspense } from 'react'
import { lazyPage } from './lib/staleBuild'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CurrencyProvider } from './context/CurrencyContext'
import CanonicalUrl from './components/CanonicalUrl'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import SignInHost from './components/auth/SignInHost'
import { InstallHost } from './components/InstallApp'
import { PushHost } from './components/PushAlerts'
import PageLoader from './components/PageLoader'
import AdminGuard from './components/AdminGuard'
import { JobAlertProvider } from './contexts/JobAlertContext'
import { WalletBalanceProvider } from './context/WalletBalanceContext'

// ─── Lazy-loaded pages ───
const HomePage = lazyPage(() => import('./pages/HomePage'))
const LoginPage = lazyPage(() => import('./pages/LoginPage'))
const Dashboard = lazyPage(() => import('./pages/Dashboard'))
const Profile = lazyPage(() => import('./pages/Profile'))
const Wallet = lazyPage(() => import('./pages/Wallet'))
const Deposit = lazyPage(() => import('./pages/Deposit'))
const Earnings = lazyPage(() => import('./pages/Earnings'))
const Referrals = lazyPage(() => import('./pages/Referrals'))
const Settings = lazyPage(() => import('./pages/Settings'))
const Notifications = lazyPage(() => import('./pages/Notifications'))
const Messages = lazyPage(() => import('./pages/Messages'))
const MyTasks = lazyPage(() => import('./pages/MyTasks'))
const MyStore = lazyPage(() => import('./pages/MyStore'))
const Tasks = lazyPage(() => import('./pages/Tasks'))
const JobDetail = lazyPage(() => import('./pages/JobDetail'))
const Store = lazyPage(() => import('./pages/Store'))
const StoreProduct = lazyPage(() => import('./pages/StoreProduct'))
const StorePayment = lazyPage(() => import('./pages/StorePayment'))
const OrderConfirmation = lazyPage(() => import('./pages/OrderConfirmation'))
const StoreOrders = lazyPage(() => import('./pages/StoreOrders'))
const SubmissionPage = lazyPage(() => import('./pages/SubmissionPage'))
const SubmissionsRedirect = lazyPage(() => import('./pages/SubmissionPage').then((m) => ({ default: m.SubmissionsRedirect })))
const CreateJob = lazyPage(() => import('./pages/CreateJob'))
const WorkerPortal = lazyPage(() => import('./pages/WorkerPortal'))
const Communities = lazyPage(() => import('./pages/Communities'))
const CreateCommunity = lazyPage(() => import('./pages/CreateCommunity'))
const CommunityDetail = lazyPage(() => import('./pages/CommunityDetail'))
const FAQ = lazyPage(() => import('./pages/FAQ'))
const Support = lazyPage(() => import('./pages/Support'))
const Vault = lazyPage(() => import('./pages/Vault'))
const VaultHistory = lazyPage(() => import('./pages/VaultHistory'))
const NotFound = lazyPage(() => import('./pages/NotFound'))
const AuthCallback = lazyPage(() => import('./pages/AuthCallback'))
const VeryCallback = lazyPage(() => import('./pages/VeryCallback'))
const ForgotPassword = lazyPage(() => import('./pages/ForgotPassword'))
const VerifyEmailPage = lazyPage(() => import('./pages/VerifyEmailPage'))
const ResetPasswordPage = lazyPage(() => import('./pages/ResetPasswordPage'))
const Privacy = lazyPage(() => import('./pages/Privacy'))
const Terms = lazyPage(() => import('./pages/Terms'))
const Blog = lazyPage(() => import('./pages/Blog'))
const BlogEditor = lazyPage(() => import('./pages/BlogEditor'))
const ArticleDetail = lazyPage(() => import('./pages/ArticleDetail'))
const AdminBlog = lazyPage(() => import('./pages/AdminBlog'))
const Campaigns = lazyPage(() => import('./pages/Campaigns'))
const Leaderboard = lazyPage(() => import('./pages/Leaderboard'))
const JobMonitor = lazyPage(() => import('./pages/JobMonitor'))
const EditProfile = lazyPage(() => import('./pages/EditProfile'))
const TaskHistory = lazyPage(() => import('./pages/TaskHistory'))
const Developer = lazyPage(() => import('./pages/Developer'))
const Roadmap = lazyPage(() => import('./pages/Roadmap'))
const About = lazyPage(() => import('./pages/About'))
const ForBusinesses = lazyPage(() => import('./pages/ForBusinesses'))
const Socials = lazyPage(() => import('./pages/Socials'))
const License = lazyPage(() => import('./pages/License'))
const Copyright = lazyPage(() => import('./pages/Copyright'))
const Workers = lazyPage(() => import('./pages/Workers'))
const Creators = lazyPage(() => import('./pages/Creators'))
const WorkerWorkspace = lazyPage(() => import('./pages/WorkerWorkspace'))
const Writer = lazyPage(() => import('./pages/Writer'))
const Analytics = lazyPage(() => import('./pages/Analytics'))
const Bookmarks = lazyPage(() => import('./pages/Bookmarks'))
const ManageJobs = lazyPage(() => import('./pages/ManageJobs'))
const UserProfile = lazyPage(() => import('./pages/UserProfile'))
const HirePage = lazyPage(() => import('./pages/HirePage'))
const Admin = lazyPage(() => import('./pages/Admin'))
const AdminVault = lazyPage(() => import('./pages/AdminVault'))
const AdminModeration = lazyPage(() => import('./pages/AdminModeration'))
const AdminWithdrawals = lazyPage(() => import('./pages/AdminWithdrawals'))
const AdminKyc = lazyPage(() => import('./pages/AdminKyc'))
const AdminCreators = lazyPage(() => import('./pages/AdminCreators'))
const AdminHighlights = lazyPage(() => import('./pages/AdminHighlights'))
const AdminUpdates = lazyPage(() => import('./pages/AdminUpdates'))
const AdminSupport = lazyPage(() => import('./pages/AdminSupport'))
// /worker-portal/:category was a second, unlinked copy of the worker workspace
function WorkspaceRedirect() {
  const { category = '' } = useParams()
  return <Navigate to={`/worker/${category}`} replace />
}
const Docs = lazyPage(() => import('./pages/Docs'))
const DevicePairing = lazyPage(() => import('./pages/DevicePairing'))
const RankUpgrade = lazyPage(() => import("./pages/RankUpgrade"))

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
          <SignInHost />
          <InstallHost />
          <PushHost />
          <CanonicalUrl />
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/pair" element={<LoginPage />} />
            <Route path="/join" element={<LoginPage />} />
            <Route path="/ref/:code" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/verify/callback" element={<VeryCallback />} />
            <Route path="/blog" element={<Blog />} />
            {/* Old demo pages (sample content, not linked from the app) */}
            <Route path="/features" element={<Navigate to="/about" replace />} />
            <Route path="/feature-grid" element={<Navigate to="/about" replace />} />
            <Route path="/ecosystem" element={<Navigate to="/" replace />} />
            <Route path="/rank" element={<RankUpgrade />} />
            <Route path="/blog/:slug" element={<ArticleDetail />} />
            <Route path="/tasks" element={<Tasks />} />
<Route path="/tasks/:id/submit" element={<AuthGuard><SubmissionPage /></AuthGuard>} />
            <Route path="/tasks/:id/submissions" element={<AuthGuard><SubmissionsRedirect /></AuthGuard>} />
            <Route path="/jobs" element={<Navigate to="/tasks" replace />} />

            <Route path="/tasks/:id" element={<JobDetail />} />
            <Route path="/store/pay/:id" element={<AuthGuard><StorePayment /></AuthGuard>} />
            <Route path="/store/orders" element={<AuthGuard><StoreOrders /></AuthGuard>} />
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
            <Route path="/safe" element={<Navigate to="/vault" replace />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/creators" element={<Creators />} />
            <Route path="/writer" element={<Writer />} />
            <Route path="/user/:username" element={<UserProfile />} />
            <Route path="/user/:username/hire" element={<HirePage />} />

            {/* ── Authenticated routes ── */}
            <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
            <Route path="/wallet" element={<AuthGuard><Wallet /></AuthGuard>} />
            <Route path="/deposit" element={<AuthGuard><Deposit /></AuthGuard>} />
            {/* Wallets are linked on the profile page (this page called endpoints that don't exist) */}
            <Route path="/link-wallet" element={<Navigate to="/profile" replace />} />
            <Route path="/pair-device" element={<AuthGuard><DevicePairing /></AuthGuard>} />
            <Route path="/earnings" element={<AuthGuard><Earnings /></AuthGuard>} />
            <Route path="/referrals" element={<AuthGuard><Referrals /></AuthGuard>} />
            <Route path="/worker-portal" element={<AuthGuard><WorkerPortal /></AuthGuard>} />
            <Route path="/worker-portal/:category" element={<WorkspaceRedirect />} />
            <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
            <Route path="/settings/:section" element={<AuthGuard><Settings /></AuthGuard>} />
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
            <Route path="/task-history" element={<Navigate to="/my-tasks" replace />} />
            <Route path="/bookmarks" element={<AuthGuard><Bookmarks /></AuthGuard>} />
            <Route path="/communities/mine" element={<AuthGuard><Communities /></AuthGuard>} />
            <Route path="/analytics" element={<AuthGuard><Analytics /></AuthGuard>} />
            <Route path="/worker/:category" element={<AuthGuard><WorkerWorkspace /></AuthGuard>} />

            {/* ── Create job routes (collapsed) ── */}
            <Route path="/create" element={<CreateJob />} />
            <Route path="/createcustom" element={<Navigate to="/create?type=custom" replace />} />
            <Route path="/createsocial" element={<Navigate to="/create?type=x" replace />} />
            <Route path="/tasks/new" element={<Navigate to="/create" replace />} />

            {/* ── Blog editor (auth-guarded) ── */}
            <Route path="/blog/write" element={<AuthGuard><BlogEditor /></AuthGuard>} />
            <Route path="/blog/edit/:id" element={<AuthGuard><BlogEditor /></AuthGuard>} />

            {/* ── Workers ── */}
            <Route path="/workers" element={<Workers />} />

            {/* ── Developer & Roadmap ── */}
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/hire" element={<ForBusinesses />} />
            <Route path="/socials" element={<Socials />} />
            <Route path="/license" element={<License />} />
            <Route path="/copyright" element={<Copyright />} />
            <Route path="/use-cases" element={<Navigate to="/hire" replace />} />
            <Route path="/about" element={<About />} />

            {/* ── Admin ── */}
            <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
            <Route path="/admin/blog" element={<AdminGuard><AdminBlog /></AdminGuard>} />
            <Route path="/admin/vault" element={<AdminGuard><AdminVault /></AdminGuard>} />
            <Route path="/admin/moderation" element={<AdminGuard><AdminModeration /></AdminGuard>} />
            <Route path="/admin/withdrawals" element={<AdminGuard><AdminWithdrawals /></AdminGuard>} />
            <Route path="/admin/kyc" element={<AdminGuard><AdminKyc /></AdminGuard>} />
            <Route path="/admin/creators" element={<AdminGuard><AdminCreators /></AdminGuard>} />
            <Route path="/admin/highlights" element={<AdminGuard><AdminHighlights /></AdminGuard>} />
            <Route path="/admin/updates" element={<AdminGuard><AdminUpdates /></AdminGuard>} />
            <Route path="/admin/support" element={<AdminGuard><AdminSupport /></AdminGuard>} />
            <Route path="/admin/login" element={<Navigate to="/login?redirect=/admin" replace />} />
            <Route path="/admin/*" element={<AdminGuard><Admin /></AdminGuard>} />

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
