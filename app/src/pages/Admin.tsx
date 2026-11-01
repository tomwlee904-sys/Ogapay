import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { naira, when } from '../lib/wallet'

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

// USDC members converted to naira (GET /admin/conversions). That USDC is now
// OgaPay's, in the platform Solana wallet, and is sold by hand to fund the naira
// they withdraw (2026-11-01)
type ConvTotals = { count: number; usdc: number; ngn: number }
type Conversions = {
  allTime: ConvTotals; last7d: ConvTotals; last30d: ConvTotals; usdcInMemberWallets: number
  recent: { at: string; username: string; usdc: number; ngn: number; rate: number; how: 'manual' | 'auto' }[]
}
const usdc = (n: number) => `${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC`
const convLine = (c?: ConvTotals) => {
  const n = Number(c?.count) || 0
  return `${usdc(c?.usdc ?? 0)} → ${naira(c?.ngn ?? 0)} (${n} ${n === 1 ? 'conversion' : 'conversions'})`
}

function ConversionsCard() {
  const [conv, setConv] = useState<Conversions | null>(null)
  const [error, setError] = useState('')
  const load = () => {
    setError('')
    apiRequest<Conversions>('/admin/conversions').then(setConv).catch((e: any) => setError(e?.message || "Couldn't load conversions"))
  }
  useEffect(load, [])

  return (
    <section className="admin-intents" aria-labelledby="admin-conv-h">
      <h2 id="admin-conv-h">USDC conversions</h2>
      {error ? (
        <small role="alert" style={{ marginTop: 0 }}>{error} <button type="button" className="admin-conv-retry" onClick={load}>Try again</button></small>
      ) : !conv ? (
        <small style={{ marginTop: 0 }}>Loading…</small>
      ) : (
        <>
          <dl>
            <dt>Last 7 days</dt><dd>{convLine(conv.last7d)}</dd>
            <dt>Last 30 days</dt><dd>{convLine(conv.last30d)}</dd>
            <dt>All time</dt><dd>{convLine(conv.allTime)}</dd>
          </dl>
          {/* Nothing records what has been sold, so the note says which figure to go by */}
          <small>Members' converted USDC now belongs to OgaPay in the platform Solana wallet. Sell about this much to cover the naira they can withdraw, counting only the USDC converted since you last sold (all time includes what you've already sold).</small>
          <dl style={{ marginTop: 12 }}>
            <dt>USDC still in member wallets</dt><dd>{usdc(conv.usdcInMemberWallets)}</dd>
          </dl>
          {!conv.recent?.length ? <small>No conversions yet.</small> : (
            <div className="admin-conv-table">
              <table>
                <thead>
                  <tr><th>When</th><th>Member</th><th className="r">USDC</th><th className="r">Naira</th><th className="r">Rate</th><th>How</th></tr>
                </thead>
                <tbody>
                  {conv.recent.map((r, i) => (
                    <tr key={`${r.at}-${r.username}-${i}`}>
                      <td>{when(r.at)}</td>
                      <td>{r.username ? <Link to={`/user/${encodeURIComponent(r.username)}`}>@{r.username}</Link> : '-'}</td>
                      <td className="r">{usdc(r.usdc)}</td>
                      <td className="r">{naira(r.ngn)}</td>
                      <td className="r">{naira(r.rate)}</td>
                      <td>{r.how === 'auto' ? 'Automatic' : 'By hand'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
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
        .admin-conv-table{overflow-x:auto;margin-top:12px}
        .admin-conv-table table{width:100%;border-collapse:collapse;font-size:13px;min-width:560px}
        .admin-conv-table th{font-size:11px;font-weight:500;color:var(--text3);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border)}
        .admin-conv-table td{padding:8px;border-bottom:1px solid var(--border);font-variant-numeric:tabular-nums;white-space:nowrap}
        .admin-conv-table tr:last-child td{border-bottom:0}
        .admin-conv-table .r{text-align:right}
        .admin-conv-retry{background:none;border:0;padding:0;color:var(--text);font:inherit;font-weight:700;text-decoration:underline;cursor:pointer}
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
        <ConversionsCard />
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
