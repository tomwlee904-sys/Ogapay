import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

// Only pages that exist (Users, Tasks, Disputes and Analytics had no page and
// just came back here)
const CARDS = [
  { to: '/admin/withdrawals', icon: 'ti-cash', title: 'Withdrawals', desc: 'Pay out and settle pending withdrawals' },
  { to: '/admin/linked-accounts', icon: 'ti-users-group', title: 'Linked accounts', desc: 'Accounts that share a bank, phone or ID: one person, one account' },
  { to: '/admin/kyc', icon: 'ti-id', title: 'Identity checks', desc: 'KYC waiting for review, and past approvals' },
  { to: '/admin/creators', icon: 'ti-speakerphone', title: 'Creator checks', desc: 'Follower counts waiting to be verified' },
  { to: '/admin/brands', icon: 'ti-rosette-discount-check', title: 'Business checks', desc: 'Posters asking for the Verified business badge' },
  { to: '/admin/moderation', icon: 'ti-flag', title: 'Moderation', desc: 'Submissions waiting over 24h' },
  { to: '/admin/updates', icon: 'ti-speakerphone', title: 'Platform updates', desc: 'Tell every user what is new, in their Notifications' },
  { to: '/admin/ranks', icon: 'ti-trophy', title: 'Rank claims', desc: 'Review rank-ups from accounts with warning signs' },
  { to: '/admin/warnings', icon: 'ti-alert-triangle', title: 'Warnings', desc: 'Warnings, appeals and members who cannot take jobs' },
  { to: '/admin/highlights', icon: 'ti-star', title: 'Highlighted jobs', desc: 'Jobs shown first on the homepage and jobs page' },
  { to: '/admin/support', icon: 'ti-lifebuoy', title: 'Support and reports', desc: 'Help centre tickets and reports, priority first' },
  { to: '/admin/blog', icon: 'ti-news', title: 'Blog', desc: 'Articles waiting for review, and publishing' },
  { to: '/admin/vault', icon: 'ti-building-bank', title: 'Vault', desc: 'Revenue pool, distributions and $PAY' },
]

// "What brings you to OgaPay?" answers (GET /admin/signup-intents)
type IntentCounts = { EARN: number; HIRE: number; BOTH: number; NONE: number; total: number }
const pct = (n: number, of: number) => (of ? ` (${Math.round((n / of) * 100)}%)` : '')
const intentLine = (c: IntentCounts) => {
  const answered = c.EARN + c.HIRE + c.BOTH
  return `Earn ${c.EARN}${pct(c.EARN, answered)} · Hire ${c.HIRE}${pct(c.HIRE, answered)} · Both ${c.BOTH}${pct(c.BOTH, answered)} · Not answered ${c.NONE}`
}

export default function Admin() {
  const { isAuthed } = useAuth()
  const [intents, setIntents] = useState<{ all: IntentCounts; last30Days: IntentCounts } | null>(null)
  useEffect(() => {
    if (isAuthed) apiRequest<{ all: IntentCounts; last30Days: IntentCounts }>('/admin/signup-intents').then(setIntents).catch(() => {})
  }, [isAuthed])

  if (!isAuthed) return null

  return (
    <Layout sidebar>
      <style>{`
        .admin-wrap{max-width:1100px;margin:0 auto;padding:28px 24px 60px}
        .admin-wrap h1{font-family:Inter,sans-serif;font-size:28px;font-weight:900;margin:0 0 4px}
        .admin-wrap p{color:var(--text2);font-size:14px;margin:0 0 24px}
        .admin-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
        .admin-card{display:block;color:inherit;text-decoration:none;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px;cursor:pointer;transition:border-color .13s}
        .admin-card:hover{border-color:var(--text2)}
        .admin-card i{font-size:24px;color:var(--accent);display:block;margin-bottom:10px}
        .admin-card h3{font-size:15px;font-weight:800;margin:0 0 4px}
        .admin-card p{font-size:12px;color:var(--text2);margin:0}
        .admin-intents{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 20px;margin:0 0 20px}
        .admin-intents h2{font-size:14px;font-weight:800;margin:0 0 8px}
        .admin-intents dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0;font-size:13px}
        .admin-intents dt{color:var(--text2)}
        .admin-intents dd{margin:0;font-variant-numeric:tabular-nums}
        .admin-intents small{display:block;margin-top:8px;font-size:12px;color:var(--text2)}
        @media (max-width:767px){.admin-intents dl{grid-template-columns:1fr;gap:2px}.admin-intents dd{margin-bottom:8px}}
      `}</style>
      <div className="admin-wrap">
        <h1>Admin</h1>
        <p>Money out, identity checks, moderation and content.</p>
        {intents && (
          <section className="admin-intents" aria-labelledby="admin-intents-h">
            <h2 id="admin-intents-h">Why members joined</h2>
            <dl>
              <dt>All members ({intents.all.total})</dt><dd>{intentLine(intents.all)}</dd>
              <dt>Joined in the last 30 days ({intents.last30Days.total})</dt><dd>{intentLine(intents.last30Days)}</dd>
            </dl>
            <small>Asked at sign-up (or once on the dashboard). Percentages are of those who answered. Closed accounts and admins aren't counted.</small>
          </section>
        )}
        <div className="admin-grid">
          {CARDS.map((c) => (
            <Link key={c.to} className="admin-card" to={c.to}>
              <i className={`ti ${c.icon}`} />
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}
