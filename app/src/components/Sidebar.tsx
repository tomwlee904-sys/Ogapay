import { useAuth } from '../context/AuthContext'

export default function Sidebar() {
  const { isAuthed } = useAuth()
  if (!isAuthed) return null

  return (
    <aside className="sidebar">
      <div className="sidebar-nav">
        <div className="sidebar-section">Main</div>
        <a className="sidebar-link" href="/tasks"><i className="ti ti-checklist" /> Tasks</a>
        <a className="sidebar-link" href="/store"><i className="ti ti-building-store" /> Store</a>
        <a className="sidebar-link" href="/worker-portal"><i className="ti ti-briefcase" /> Worker Portal</a>
        <a className="sidebar-link" href="/communities"><i className="ti ti-users" /> Communities</a>
        <a className="sidebar-link" href="/earnings"><i className="ti ti-coin" /> Earnings</a>
        <a className="sidebar-link" href="/leaderboard"><i className="ti ti-trophy" /> Leaderboard</a>
        <a className="sidebar-link" href="/campaigns"><i className="ti ti-megaphone" /> Campaigns</a>

        <div className="sidebar-section">Finance</div>
        <a className="sidebar-link" href="/wallet"><i className="ti ti-wallet" /> Wallet</a>
        <a className="sidebar-link" href="/referrals"><i className="ti ti-affiliate" /> Referrals</a>
        <a className="sidebar-link" href="/vault"><i className="ti ti-vault" /> Vault</a>

        <div className="sidebar-section">Account</div>
        <a className="sidebar-link" href="/profile"><i className="ti ti-user" /> Profile</a>
        <a className="sidebar-link" href="/notifications"><i className="ti ti-bell" /> Notifications</a>
        <a className="sidebar-link" href="/messages"><i className="ti ti-message" /> Messages</a>
        <a className="sidebar-link" href="/settings"><i className="ti ti-settings" /> Settings</a>
        <a className="sidebar-link" href="/faq"><i className="ti ti-help-circle" /> FAQ</a>
        <a className="sidebar-link" href="/support"><i className="ti ti-headset" /> Support</a>
        <a className="sidebar-link" href="/developer"><i className="ti ti-code" /> Developer API</a>
        <a className="sidebar-link" href="/roadmap"><i className="ti ti-map-pin" /> Roadmap</a>
      </div>
    </aside>
  )
}
