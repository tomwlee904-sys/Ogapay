import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminShell, { AdminEmpty, AdminRefresh, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'

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
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true); setError('')
    try { setGroups((await apiRequest<{ groups: Group[] }>('/admin/linked-accounts')).groups || []); setCheckedAt(new Date()) } catch (e: any) { setError(e?.message || 'Could not load linked accounts') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <AdminShell
      section="linked"
      title="Linked accounts"
      sub="Possible duplicate accounts. Groups with money waiting come first."
      how={<>
        <p>Accounts that look like one person: they share a bank account, phone number or ID number, or have the same bank account name and a similar email or username.</p>
        <p>Each person may have one account. Closed accounts are left out. Check these before paying their <Link to="/admin/withdrawals">withdrawals</Link>.</p>
      </>}
      actions={<AdminRefresh onClick={load} loading={loading} />}
    >
      <style>{`
        .al-list{display:flex;flex-direction:column;gap:14px}
        .al-group{padding:18px 20px;display:flex;flex-direction:column;gap:12px;container-type:inline-size;container-name:al-group}
        .al-gh{display:flex;justify-content:space-between;align-items:flex-start;gap:8px 16px;flex-wrap:wrap}
        .al-reasons{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
        .al-reasons span{font-size:12.5px;padding:4px 10px;border-radius:var(--r-pill);background:color-mix(in srgb,var(--gold) 14%,transparent);color:var(--text)}
        .al-total{font-size:14px;font-weight:600;color:var(--adm-warn);font-variant-numeric:tabular-nums}
        .al-total.none{color:var(--text2);font-weight:500}
        .al-table{width:100%;overflow-x:auto}
        .al-table table{width:100%;border-collapse:collapse;font-size:13px;min-width:780px}
        .al-table th{font-size:12px;font-weight:500;color:var(--text2);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border)}
        .al-table td{padding:8px;border-bottom:1px solid var(--border);vertical-align:top}
        .al-table tr:last-child td{border-bottom:0}
        .al-table th:first-child,.al-table td:first-child{position:sticky;left:0;background:var(--card);z-index:1}
        .al-num{font-variant-numeric:tabular-nums;white-space:nowrap}
        .al-who b{display:block;font-weight:600}
        .al-who small{color:var(--text2);word-break:break-all}
        .al-tag{display:inline-block;font-size:12px;font-weight:600;padding:1px 7px;border-radius:var(--r-pill);background:color-mix(in srgb,var(--red) 12%,transparent);color:var(--red);margin-left:6px}
        .al-pending{color:var(--adm-warn);font-weight:600}
        .al-open{white-space:nowrap}
        .al-blocks{display:none;list-style:none;margin:0;padding:0;grid-template-columns:minmax(0,1fr);gap:10px}
        .al-acc{border:1px solid var(--border);border-radius:var(--r-md);padding:12px 14px;display:grid;gap:10px;min-width:0}
        .al-acc-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
        .al-acc-top b{font-weight:600;overflow-wrap:anywhere}
        .al-acc small{display:block;font-size:12.5px;font-weight:400;color:var(--text2);overflow-wrap:anywhere}
        .al-acc dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;margin:0;font-size:13px}
        .al-acc dl div{min-width:0}
        .al-acc dt{font-size:12px;color:var(--text2)}
        .al-acc dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
        .al-acc dd a{color:var(--text)}
        .al-acc .ui-btn{flex-shrink:0}
        @container al-group (max-width: 759px){
          .al-table{display:none}
          .al-blocks{display:grid}
        }
        @container al-group (min-width: 600px) and (max-width: 759px){
          .al-blocks{grid-template-columns:repeat(2,minmax(0,1fr))}
        }
        @media (max-width:767.98px){.al-group{padding:16px}}
      `}</style>

      {error ? <LoadError what="linked accounts" onRetry={load} />
        : loading && !groups ? <AdminSkeleton height={180} />
        : !groups?.length ? <AdminEmpty done title="No linked accounts found" at={checkedAt} />
        : (
          <div className="al-list">
            {groups.map((g) => {
              const waiting = g.accounts.reduce((n, a) => n + (a.pendingWithdrawals?.count || 0), 0)
              return (
                <article key={g.accounts.map((a) => a.id).join()} className="al-group ui-card">
                  <div className="al-gh">
                    <div className="al-reasons">{g.reasons.map((r) => <span key={r}>{r}</span>)}</div>
                    {g.pendingAmount > 0
                      ? <span className="al-total">{naira(g.pendingAmount)} waiting{waiting ? ` · ${waiting} ${waiting === 1 ? 'withdrawal' : 'withdrawals'}` : ''}</span>
                      : <span className="al-total none">No withdrawals waiting</span>}
                  </div>
                  <div className="al-table">
                    <table>
                      <thead>
                        <tr><th>Account</th><th>Pending withdrawals</th><th>Balance</th><th>Withdrawn</th><th>Level</th><th>Signed up</th><th>Referred by</th><th aria-label="Profile" /></tr>
                      </thead>
                      <tbody>
                        {g.accounts.map((a) => (
                          <tr key={a.id}>
                            <td className="al-who"><b>@{a.username}{a.banned && <span className="al-tag">Banned</span>}</b><small>{a.name ? `${a.name} · ` : ''}{a.email}</small></td>
                            <td className={`al-num${a.pendingWithdrawals.count ? ' al-pending' : ''}`}>{a.pendingWithdrawals.count ? `${a.pendingWithdrawals.count} · ${naira(a.pendingWithdrawals.amount)}` : 'None'}</td>
                            <td className="al-num">{naira(a.balance)}{a.held > 0 && <small style={{ display: 'block', color: 'var(--text2)' }}>{naira(a.held)} held</small>}</td>
                            <td className="al-num">{naira(a.totalWithdrawn)}</td>
                            <td>{a.level > 0 ? `Level ${a.level}` : 'None'}</td>
                            <td className="al-num">{day(a.createdAt)}</td>
                            <td>{a.referrer ? <Link to={`/user/${encodeURIComponent(a.referrer.username)}`}>@{a.referrer.username}</Link> : '-'}</td>
                            <td className="al-open"><Link className="ui-btn ui-btn-ghost ui-btn-sm" to={`/user/${encodeURIComponent(a.username)}`}><i className="ti ti-user" aria-hidden="true" /> Open</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ul className="al-blocks">
                    {g.accounts.map((a) => (
                      <li key={a.id} className="al-acc">
                        <div className="al-acc-top">
                          <div style={{ minWidth: 0 }}>
                            <b>@{a.username}{a.banned && <span className="al-tag">Banned</span>}</b>
                            <small>{a.name ? `${a.name} · ` : ''}{a.email}</small>
                          </div>
                          <Link className="ui-btn ui-btn-ghost ui-btn-sm" to={`/user/${encodeURIComponent(a.username)}`} aria-label={`Open @${a.username}`}><i className="ti ti-user" aria-hidden="true" /> Open</Link>
                        </div>
                        <dl>
                          <div><dt>Pending withdrawals</dt><dd className={a.pendingWithdrawals.count ? 'al-pending' : ''}>{a.pendingWithdrawals.count ? `${a.pendingWithdrawals.count} · ${naira(a.pendingWithdrawals.amount)}` : 'None'}</dd></div>
                          <div><dt>Balance</dt><dd>{naira(a.balance)}{a.held > 0 && <small>{naira(a.held)} held</small>}</dd></div>
                          <div><dt>Withdrawn</dt><dd>{naira(a.totalWithdrawn)}</dd></div>
                          <div><dt>Level</dt><dd>{a.level > 0 ? `Level ${a.level}` : 'None'}</dd></div>
                          <div><dt>Signed up</dt><dd>{day(a.createdAt)}</dd></div>
                          <div><dt>Referred by</dt><dd>{a.referrer ? <Link to={`/user/${encodeURIComponent(a.referrer.username)}`}>@{a.referrer.username}</Link> : '-'}</dd></div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </article>
              )
            })}
          </div>
        )}
    </AdminShell>
  )
}
