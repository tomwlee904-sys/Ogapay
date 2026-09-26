import { Link } from 'react-router-dom'
import '../../styles/profile-own.css'

type QL = { icon: string; label: string; desc: string; to: string }

// Grouped like wurk.fun's profile: what you do to earn, to hire, and about you
// (Only pages backed by real data. My Store, Find Workers and Write a Blog come back when those pages are rebuilt.)
export default function ProfileQuickLinks({ username }: { username?: string }) {
  const groups: { title: string; links: QL[] }[] = [
    {
      title: 'Earn',
      links: [
        { icon: 'briefcase', label: 'Available Jobs', desc: 'Browse jobs you can do', to: '/jobs' },
        { icon: 'clipboard-list', label: 'My Work', desc: 'Jobs you applied to and submitted', to: '/my-tasks' },
        { icon: 'activity', label: 'Job Monitor', desc: 'Follow new and eligible jobs', to: '/job-monitor' },
        { icon: 'coin', label: 'Earnings', desc: 'What you have earned', to: '/earnings' },
        { icon: 'lock', label: 'Vault', desc: 'Rewards and payout history', to: '/vault/history' },
      ],
    },
    {
      title: 'Job creators',
      links: [
        { icon: 'circle-plus', label: 'Create Job', desc: 'Publish a new job', to: '/create' },
        { icon: 'list-details', label: 'My Jobs', desc: 'Manage the jobs you created', to: '/manage-jobs' },
        { icon: 'shopping-bag', label: 'OgaPay Store', desc: 'Products and services', to: '/store' },
        { icon: 'speakerphone', label: 'Campaigns', desc: 'Run social campaigns', to: '/campaigns' },
      ],
    },
    {
      title: 'Profile & reputation',
      links: [
        { icon: 'message', label: 'Messages', desc: 'Your conversations', to: '/messages' },
        ...(username ? [{ icon: 'user-circle', label: 'Public Profile', desc: 'See what others see', to: `/user/${username}` }] : []),
        { icon: 'bookmark', label: 'Bookmarks', desc: 'Your saved jobs', to: '/bookmarks' },
        { icon: 'affiliate', label: 'Referrals', desc: 'Invite friends and earn', to: '/referrals' },
        { icon: 'settings', label: 'Account Settings', desc: 'Security and preferences', to: '/settings' },
      ],
    },
  ]

  return (
    <section className="po-card po-quick" aria-label="Quick links">
      <div className="po-quick-h"><i className="ti ti-bolt" /> Quick Links</div>
      <div className="po-quick-grid">
        {groups.map((g) => (
          <div className="po-quick-col" key={g.title}>
            <h4>{g.title}</h4>
            {g.links.map((l) => (
              <Link className="po-ql" to={l.to} key={l.label}>
                <span className="ic"><i className={`ti ti-${l.icon}`} /></span>
                <span className="mid"><b>{l.label}</b><small>{l.desc}</small></span>
                <i className="ti ti-chevron-right" />
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
