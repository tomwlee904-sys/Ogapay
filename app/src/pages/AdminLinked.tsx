import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { closeAccount } from '../lib/adminClose'

/* Admin: linked accounts. Groups of open accounts that look like one person:
   they share a bank account number (saved, used for Level 1, or withdrawn to),
   a phone number, an ID number, or the same bank account name and a similar
   email or username (backend services/linkedAccounts.service.js). Each person
   may have one account; check these before paying their withdrawals. */

type Account = {
  id: string; username: string; email: string; name: string; banned: boolean; level: number
  balance: number; held: number; createdAt: string; totalWithdrawn: number
  pendingWithdrawals: { count: number; amount: number }
  referrer: { id: string; username: string } | null
}
type Group = { reasons: string[]; accounts: Account[]; pendingAmount: number }

const naira = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function AdminLinked() {
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true); setError('')
    try { setGroups((await apiRequest<{ groups: Group[] }>('/admin/linked-accounts')).groups || []) } catch (e: any) { setError(e?.message || 'Could not load linked accounts') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <Layout sidebar>
      <style>{`
        .al{max-width:1100px;margin:0 auto;padding:28px 24px 64px;display:flex;flex-direction:column;gap:14px}
        .al-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
        .al-head h1{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:0 0 4px}
        .al-head p{color:var(--text2);font-size:14px;margin:0;max-width:640px;line-height:1.5}
        .al-group{padding:18px 20px;display:flex;flex-direction:column;gap:12px}
        .al-reasons{display:flex;flex-wrap:wrap;gap:6px}
        .al-reasons span{font-size:12px;padding:4px 10px;border-radius:999px;background:color-mix(in srgb,#f59e0b 14%,transparent);color:var(--text)}
        .al-table{width:100%;overflow-x:auto}
        .al-table table{width:100%;border-collapse:collapse;font-size:13px;min-width:820px}
        .al-table th{font-size:11px;font-weight:500;color:var(--text3);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border)}
        .al-table td{padding:8px;border-bottom:1px solid var(--border);vertical-align:top}
        .al-table tr:last-child td{border-bottom:0}
        .al-num{font-variant-numeric:tabular-nums;white-space:nowrap}
        .al-who b{display:block;font-weight:600}
        .al-who small{color:var(--text2);word-break:break-all}
        .al-tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:999px;background:color-mix(in srgb,var(--red) 12%,transparent);color:var(--red);margin-left:6px}
        .al-pending{color:#b45309;font-weight:600}
        .al-open{white-space:nowrap}
        .al-empty{padding:48px 20px;text-align:center;color:var(--text2);font-size:14px}
        @media (max-width:640px){.al{padding:20px 16px 56px}}
      `}</style>
      <div className="al">
        <div className="al-head">
          <div>
            <h1>Linked accounts</h1>
            <p>Accounts that look like one person: they share a bank account, phone number or ID number, or have the same bank account name and a similar email or username. Each person may have one account. Closed accounts are left out. Groups with money waiting to be paid come first.</p>
          </div>
          <button className="ui-btn ui-btn-ghost" onClick={load} disabled={loading}><i className="ti ti-refresh" /> Refresh</button>
        </div>

        {loading && !groups ? <div className="al-empty">Loading…</div>
          : error ? <div className="al-empty" role="alert">{error}</div>
          : !groups?.length ? <div className="al-empty">No linked accounts found.</div>
          : groups.map((g) => (
            <article key={g.accounts.map((a) => a.id).join()} className="al-group ui-card">
              <div className="al-reasons">{g.reasons.map((r) => <span key={r}>{r}</span>)}</div>
              <div className="al-table">
                <table>
                  <thead>
                    <tr><th>Account</th><th>Level</th><th>Balance</th><th>Signed up</th><th>Withdrawn</th><th>Pending withdrawals</th><th>Referred by</th><th /></tr>
                  </thead>
                  <tbody>
                    {g.accounts.map((a) => (
                      <tr key={a.id}>
                        <td className="al-who"><b>@{a.username}{a.banned && <span className="al-tag">Banned</span>}</b><small>{a.name ? `${a.name} · ` : ''}{a.email}</small></td>
                        <td>{a.level > 0 ? `Level ${a.level}` : 'None'}</td>
                        <td className="al-num">{naira(a.balance)}{a.held > 0 && <small style={{ display: 'block', color: 'var(--text2)' }}>{naira(a.held)} held</small>}</td>
                        <td className="al-num">{day(a.createdAt)}</td>
                        <td className="al-num">{naira(a.totalWithdrawn)}</td>
                        <td className={`al-num${a.pendingWithdrawals.count ? ' al-pending' : ''}`}>{a.pendingWithdrawals.count ? `${a.pendingWithdrawals.count} · ${naira(a.pendingWithdrawals.amount)}` : 'None'}</td>
                        <td>{a.referrer ? <Link to={`/user/${encodeURIComponent(a.referrer.username)}`}>@{a.referrer.username}</Link> : '-'}</td>
                        <td className="al-open"><Link className="ui-btn ui-btn-ghost" to={`/user/${encodeURIComponent(a.username)}`}><i className="ti ti-user" /> Open</Link>{!a.banned && <button type="button" className="ui-btn ui-btn-ghost" style={{ color: 'var(--red)', marginLeft: 6 }} onClick={async () => { if (await closeAccount(a.id, a.username)) load() }}><i className="ti ti-user-x" /> Close</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
      </div>
    </Layout>
  )
}
