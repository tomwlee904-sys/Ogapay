import { useAuth } from '../context/AuthContext'

export default function Sidebar() {
  const { isAuthed } = useAuth()
  if (!isAuthed) return null

  return (
    <aside className="sidebar">
      <div className="sidebar-nav">
        <div className="sidebar-section">Main</div>
        <a className="sidebar-link" href="/dashboard"><i className="ti ti-dashboard" /> Dashboard</a>
        <a className="sidebar-link" href="/my-tasks"><i className="ti ti-checklist" /> My Tasks</a>
        <a className="sidebar-link" href="/tasks"><i className="ti ti-checklist" /> Tasks</a>
        <a className="sidebar-link" href="/store"><i className="ti ti-building-store" /> Store</a>
        <a className="sidebar-link" href="/wurker-apply"><i className="ti ti-user-plus" /> Wurker Apply</a>
        <a className="sidebar-link" href="/worker-portal"><i className="ti ti-briefcase" /> Worker Portal</a>
        <a className="sidebar-link" href="/job-monitor"><i className="ti ti-monitor" /> Job Monitor</a>
        <a className="sidebar-link" href="/communities"><i className="ti ti-users" /> Communities</a>
        <a className="sidebar-link" href="/earnings"><i className="ti ti-coin" /> Earnings</a>
        <a className="sidebar-link" href="/leaderboard"><i className="ti ti-trophy" /> Leaderboard</a>

        <div className="sidebar-section">Finance</div>
        <a className="sidebar-link" href="/wallet"><i className="ti ti-wallet" /> Wallet</a>
        <a className="sidebar-link" href="/referrals"><i className="ti ti-affiliate" /> Referrals</a>

        <div className="sidebar-section">Account</div>
        <a className="sidebar-link" href="/profile"><i className="ti ti-user" /> Profile</a>
        <a className="sidebar-link" href="/notifications"><i className="ti ti-bell" /> Notifications</a>
        <a className="sidebar-link" href="/settings"><i className="ti ti-settings" /> Settings</a>
        <a className="sidebar-link" href="/faq"><i className="ti ti-help-circle" /> FAQ</a>
      </div>
    </aside>
  )
}
