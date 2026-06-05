import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Tasks from './pages/Tasks'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import HomePage from './pages/HomePage'
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
import Blog from './pages/Blog'
import BlogEditor from './pages/BlogEditor'
import NotFound from './pages/NotFound'
import EditProfile from './pages/EditProfile'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:id" element={<Tasks />} />
          <Route path="/tasks/new" element={<CreateJob />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/worker-portal" element={<WorkerPortal />} />
          <Route path="/store" element={<Store />} />
          <Route path="/my-store" element={<MyStore />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/earnings" element={<Earnings />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/support" element={<Support />} />
          <Route path="/create" element={<CreateJob />} />
          <Route path="/createcustom" element={<CreateJob />} />
          <Route path="/createsocial" element={<CreateJob />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/write" element={<BlogEditor />} />
          <Route path="/blog/edit/:id" element={<BlogEditor />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
