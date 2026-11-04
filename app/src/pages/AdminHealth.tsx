import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

/* Admin: health. One read-only page to spot bot and farm attacks early
   (backend GET /admin/health, services/health.service.js): sign-ups per hour,
   accounts sharing an IP or a browser, copied proofs, farm flags and linked
   accounts, withdrawals by new accounts, and failed sign-ins. Alerts at the top
   say in plain words what is over the limits. Nothing here changes any data. */

type Bucket = { at: string; count: number }
type IpRow = { ip: string; count: number; newAccounts: number; usernames: string[]; newestAccountAt: string | null; newestAccountAgeHours: number | null }
type BrowserRow = IpRow & { userAgent: string }
type DeviceRow = { deviceId: string; count: number; usernames: string[]; newestAccountAgeHours: number | null }
type JobRef = { id: string; title: string }
type Health = {
  at: string
  alerts: string[]
  signups: { hours: Bucket[]; lastHour: number; today: number; todayPerHour: number; avgPerHour7d: number; last7d: number; spike: boolean }
  sharedIps: IpRow[]
  sharedDevices: { browsers: BrowserRow[]; devices: DeviceRow[] }
  topIps: IpRow[]
  duplicateProofs: {
    sameText: { text: string; count: number; jobCount: number; workers: string[]; jobs: JobRef[] }[]
    sameFile: { file: string; count: number; jobCount: number; workers: string[]; jobs: JobRef[] }[]
    reusedFile: { file: string; worker: string | null; jobCount: number; jobs: JobRef[] }[]
  }
  farm: {
    openFlags: number; openAlerts: number
    topAlerts: { alertId: string; createdAt: string; reasons: string[]; usernames: string[] }[]
    linkedGroups: number; linkedGroupsWithPending: number
    topLinkedGroups: { reasons: string[]; usernames: string[]; accounts: number; pendingAmount: number }[]
  }
  withdrawalBurst: {
    count: number
    totals: { currency: string; count: number; amount: number }[]
    accounts: { username: string; accountAgeHours: number | null; count: number; amount: number; currencies: string[] }[]
  }
  failedLogins: {
    total24h: number; lastHour: number; hours: Bucket[]
    topIps: { ip: string; count: number; emails: number; lastAt: string }[]
    topEmails: { email: string; count: number; ips: number; reasons: string[]; lastAt: string }[]
  }
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`
const money = (n: number, currency: string) => (currency === 'NGN' ? naira(n) : `${n.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${currency}`)
const age = (h: number | null) => (h == null ? '-' : h < 1 ? 'under 1 hour' : h < 48 ? `${h} ${h === 1 ? 'hour' : 'hours'}` : `${Math.round(h / 24)} days`)
const time = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
const hourLabel = (d: string) => new Date(d).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
const REASONS: Record<string, string> = {
  UNKNOWN_EMAIL: 'No account', WRONG_PASSWORD: 'Wrong password', BANNED: 'Banned account', WRONG_2FA_CODE: 'Wrong 2FA code', WRONG_EMAIL_CODE: 'Wrong email code',
}

function Users({ names, max = 10 }: { names: string[]; max?: number }) {
  if (!names.length) return <>-</>
  return (
    <span className="ah-users">
      {names.slice(0, max).map((u) => <Link key={u} to={`/user/${encodeURIComponent(u)}`}>@{u}</Link>)}
      {names.length > max && <small>+{names.length - max} more</small>}
    </span>
  )
}

function Jobs({ jobs }: { jobs: JobRef[] }) {
  if (!jobs.length) return <>-</>
  return <span className="ah-jobs">{jobs.map((j) => <Link key={j.id} to={`/tasks/${j.id}`}>{j.title}</Link>)}</span>
}

// A simple bar row: one bar per hour, the tallest is full height
function Bars({ hours, label }: { hours: Bucket[]; label: string }) {
  const top = Math.max(0, ...hours.map((b) => b.count))
  const max = Math.max(1, top)
  return (
    <div className="ah-bars-wrap">
      <div className="ah-bars" role="img" aria-label={label}>
        {hours.map((b) => (
          <div key={b.at} className="ah-bar" title={`${hourLabel(b.at)}: ${b.count}`}>
            <span style={{ height: `${Math.max(b.count ? 4 : 0, (b.count / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="ah-bars-axis">
        <span>{hours.length ? hourLabel(hours[0].at) : ''}</span>
        <span>Most in an hour: {top}</span>
        <span>Now</span>
      </div>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="ah-none">{children}</p>
}

export default function AdminHealth() {
  const [data, setData] = useState<Health | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true); setError('')
    try { setData(await apiRequest<Health>('/admin/health')) } catch (e: any) { setError(e?.message || 'Could not load the health panel') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const s = data?.signups
  const p = data?.duplicateProofs
  const f = data?.farm
  const w = data?.withdrawalBurst
  const fl = data?.failedLogins

  return (
    <Layout sidebar>
      <style>{`
        .ah{max-width:1100px;margin:0 auto;padding:28px 24px 64px;display:flex;flex-direction:column;gap:14px}
        .ah-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
        .ah-head h1{font-size:28px;font-weight:600;letter-spacing:-.02em;margin:0 0 4px}
        .ah-head p{color:var(--text2);font-size:14px;margin:0;max-width:640px;line-height:1.5}
        .ah-head-right{display:flex;align-items:center;gap:10px}
        .ah-head-right small{color:var(--text2);font-size:12px}
        .ah-card{padding:18px 20px;display:flex;flex-direction:column;gap:12px;min-width:0}
        .ah-card h2{font-size:16px;font-weight:600;margin:0}
        .ah-card h3{font-size:13px;font-weight:600;margin:6px 0 0;color:var(--text2)}
        .ah-card-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
        .ah-card-head a{font-size:13px;white-space:nowrap}
        .ah-sub{color:var(--text2);font-size:13px;margin:0;line-height:1.5}
        .ah-alerts{border-color:color-mix(in srgb,var(--red) 45%,var(--border));background:color-mix(in srgb,var(--red) 7%,var(--card))}
        .ah-alerts h2{color:var(--red);display:flex;align-items:center;gap:8px}
        .ah-alerts ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:14px;line-height:1.5}
        .ah-ok{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--text2)}
        .ah-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
        .ah-stat{border:1px solid var(--border);border-radius:12px;padding:10px 12px}
        .ah-stat small{display:block;font-size:12px;color:var(--text2)}
        .ah-stat b{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}
        .ah-stat.hot{border-color:var(--red)}
        .ah-stat.hot b{color:var(--red)}
        .ah-bars{display:flex;align-items:flex-end;gap:2px;height:90px;border-bottom:1px solid var(--border)}
        .ah-bar{flex:1 1 0;min-width:0;height:100%;display:flex;align-items:flex-end}
        .ah-bar span{display:block;width:100%;background:var(--accent);border-radius:2px 2px 0 0}
        .ah-bar:last-child span{background:#f59e0b}
        .ah-bars-axis{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--text3);margin-top:4px}
        .ah-table{width:100%;overflow-x:auto}
        .ah-table table{width:100%;border-collapse:collapse;font-size:13px;min-width:600px}
        .ah-table th{font-size:11px;font-weight:500;color:var(--text3);text-align:left;padding:6px 8px;border-bottom:1px solid var(--border)}
        .ah-table td{padding:8px;border-bottom:1px solid var(--border);vertical-align:top}
        .ah-table tr:last-child td{border-bottom:0}
        .ah-num{font-variant-numeric:tabular-nums;white-space:nowrap}
        .ah-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;word-break:break-all}
        .ah-ua{color:var(--text2);font-size:12px;word-break:break-word;max-width:320px}
        .ah-users,.ah-jobs{display:flex;flex-wrap:wrap;gap:4px 10px}
        .ah-users small{color:var(--text2)}
        .ah-jobs a{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ah-quote{color:var(--text2);font-style:italic;word-break:break-word;max-width:420px}
        .ah-new{color:#b45309;font-weight:600}
        .ah-none{color:var(--text2);font-size:13px;margin:0}
        .ah-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .ah-tags{display:flex;flex-wrap:wrap;gap:6px}
        .ah-tags span{font-size:12px;padding:3px 9px;border-radius:999px;background:color-mix(in srgb,#f59e0b 14%,transparent);color:var(--text)}
        .ah-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
        .ah-list li{border-top:1px solid var(--border);padding-top:10px;display:flex;flex-direction:column;gap:6px;font-size:13px}
        .ah-list li:first-child{border-top:0;padding-top:0}
        .ah-empty{padding:48px 20px;text-align:center;color:var(--text2);font-size:14px}
        @media (max-width:860px){.ah-grid{grid-template-columns:1fr}}
        @media (max-width:640px){.ah{padding:20px 16px 56px}.ah-card{padding:16px}.ah-bars{gap:1px}}
      `}</style>
      <div className="ah">
        <div className="ah-head">
          <div>
            <h1>Health</h1>
            <p>Signs of bots and farms: sign-ups per hour, accounts sharing an IP or a browser, copied proofs, farm flags, withdrawals by new accounts and failed sign-ins. Nothing on this page changes anything.</p>
          </div>
          <div className="ah-head-right">
            {data && <small>Updated {time(data.at)}</small>}
            <button className="ui-btn ui-btn-ghost" onClick={load} disabled={loading}><i className="ti ti-refresh" /> {loading && data ? 'Refreshing…' : 'Refresh'}</button>
          </div>
        </div>

        {loading && !data ? <div className="ah-empty">Loading…</div>
          : error && !data ? <div className="ah-empty" role="alert">{error}</div>
          : data && s && p && f && w && fl && (
            <>
              {error && <div className="ah-sub" role="alert">{error}</div>}

              {/* ── Alerts ── */}
              {data.alerts.length ? (
                <section className="ah-card ui-card ah-alerts" aria-labelledby="ah-alerts-h">
                  <h2 id="ah-alerts-h"><i className="ti ti-alert-triangle" /> {data.alerts.length === 1 ? '1 thing to check' : `${data.alerts.length} things to check`}</h2>
                  <ul>{data.alerts.map((a) => <li key={a}>{a}</li>)}</ul>
                </section>
              ) : (
                <section className="ah-card ui-card"><div className="ah-ok"><i className="ti ti-circle-check" /> Nothing is over the limits right now.</div></section>
              )}

              {/* ── Sign-ups ── */}
              <section className="ah-card ui-card" aria-labelledby="ah-signups-h">
                <h2 id="ah-signups-h">Sign-ups per hour (last 48 hours)</h2>
                <div className="ah-stats">
                  <div className={`ah-stat${s.spike ? ' hot' : ''}`}><small>Last hour</small><b>{s.lastHour}</b></div>
                  <div className="ah-stat"><small>Today (Lagos)</small><b>{s.today}</b></div>
                  <div className="ah-stat"><small>An hour today</small><b>{s.todayPerHour}</b></div>
                  <div className="ah-stat"><small>An hour, 7-day average</small><b>{s.avgPerHour7d}</b></div>
                  <div className="ah-stat"><small>Last 7 days</small><b>{s.last7d}</b></div>
                </div>
                <Bars hours={s.hours} label="Sign-ups per hour for the last 48 hours" />
                <p className="ah-sub">An alert shows when the last hour is more than 3 times the 7-day average and at least 10.</p>
              </section>

              {/* ── Shared IPs ── */}
              <section className="ah-card ui-card" aria-labelledby="ah-ips-h">
                <h2 id="ah-ips-h">Accounts sharing an IP (last 24 hours)</h2>
                <p className="ah-sub">IPs that 3 or more accounts signed in from. Phone networks put many people on one IP, so look at how new the accounts are.</p>
                {!data.sharedIps.length ? <Empty>No IP was used by 3 or more accounts.</Empty> : (
                  <div className="ah-table">
                    <table>
                      <thead><tr><th>IP</th><th>Accounts</th><th>Under 7 days old</th><th>Newest account</th><th>Usernames</th></tr></thead>
                      <tbody>
                        {data.sharedIps.map((r) => (
                          <tr key={r.ip}>
                            <td className="ah-mono">{r.ip}</td>
                            <td className="ah-num">{r.count}</td>
                            <td className={`ah-num${r.newAccounts >= 3 ? ' ah-new' : ''}`}>{r.newAccounts}</td>
                            <td className="ah-num">{age(r.newestAccountAgeHours)} old</td>
                            <td><Users names={r.usernames} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* ── Same browser / device ── */}
              <section className="ah-card ui-card" aria-labelledby="ah-dev-h">
                <h2 id="ah-dev-h">Same browser or device (last 24 hours)</h2>
                <p className="ah-sub">3 or more accounts on the same browser and the same IP, or one paired device used by 2 or more accounts.</p>
                {!data.sharedDevices.browsers.length && !data.sharedDevices.devices.length ? <Empty>No browser or device was shared.</Empty> : (
                  <div className="ah-table">
                    <table>
                      <thead><tr><th>IP and browser</th><th>Accounts</th><th>Under 7 days old</th><th>Newest account</th><th>Usernames</th></tr></thead>
                      <tbody>
                        {data.sharedDevices.browsers.map((r) => (
                          <tr key={`${r.ip}|${r.userAgent}`}>
                            <td><div className="ah-mono">{r.ip}</div><div className="ah-ua">{r.userAgent}</div></td>
                            <td className="ah-num">{r.count}</td>
                            <td className={`ah-num${r.newAccounts ? ' ah-new' : ''}`}>{r.newAccounts}</td>
                            <td className="ah-num">{age(r.newestAccountAgeHours)} old</td>
                            <td><Users names={r.usernames} /></td>
                          </tr>
                        ))}
                        {data.sharedDevices.devices.map((r) => (
                          <tr key={r.deviceId}>
                            <td><div>Paired device</div><div className="ah-ua ah-mono">{r.deviceId}</div></td>
                            <td className="ah-num">{r.count}</td>
                            <td className="ah-num">-</td>
                            <td className="ah-num">{age(r.newestAccountAgeHours)} old</td>
                            <td><Users names={r.usernames} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* ── Top IPs ── */}
              <section className="ah-card ui-card" aria-labelledby="ah-top-h">
                <h2 id="ah-top-h">Top 10 IPs by accounts (last 24 hours)</h2>
                {!data.topIps.length ? <Empty>No sign-ins in the last 24 hours.</Empty> : (
                  <div className="ah-table">
                    <table>
                      <thead><tr><th>IP</th><th>Accounts</th><th>Under 7 days old</th><th>Usernames</th></tr></thead>
                      <tbody>
                        {data.topIps.map((r) => (
                          <tr key={r.ip}>
                            <td className="ah-mono">{r.ip}</td>
                            <td className="ah-num">{r.count}</td>
                            <td className="ah-num">{r.newAccounts}</td>
                            <td><Users names={r.usernames} max={5} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* ── Duplicate proofs ── */}
              <section className="ah-card ui-card" aria-labelledby="ah-dup-h">
                <h2 id="ah-dup-h">Copied proofs (last 7 days)</h2>
                <p className="ah-sub">The same screenshot file or the same text (40 characters or more) sent by different workers, and one worker sending the same file to several jobs. Text the job gives workers to post, and default names like image.jpg, are left out.</p>

                <h3>Same file, different workers</h3>
                {!p.sameFile.length ? <Empty>None.</Empty> : (
                  <ul className="ah-list">
                    {p.sameFile.map((r) => (
                      <li key={r.file}>
                        <div><span className="ah-mono">{r.file}</span> · <b>{r.count} workers</b>, {r.jobCount === 1 ? '1 job' : `${r.jobCount} jobs`}</div>
                        <Users names={r.workers} />
                        <Jobs jobs={r.jobs} />
                      </li>
                    ))}
                  </ul>
                )}

                <h3>Same text, different workers</h3>
                {!p.sameText.length ? <Empty>None.</Empty> : (
                  <ul className="ah-list">
                    {p.sameText.map((r) => (
                      <li key={r.text}>
                        <div className="ah-quote">"{r.text}{r.text.length >= 300 ? '…' : ''}"</div>
                        <div><b>{r.count} workers</b>, {r.jobCount === 1 ? '1 job' : `${r.jobCount} jobs`}</div>
                        <Users names={r.workers} />
                        <Jobs jobs={r.jobs} />
                      </li>
                    ))}
                  </ul>
                )}

                <h3>One worker, the same file on several jobs</h3>
                {!p.reusedFile.length ? <Empty>None.</Empty> : (
                  <ul className="ah-list">
                    {p.reusedFile.map((r) => (
                      <li key={`${r.worker}|${r.file}`}>
                        <div>{r.worker ? <Link to={`/user/${encodeURIComponent(r.worker)}`}>@{r.worker}</Link> : 'A worker'} · <span className="ah-mono">{r.file}</span> · <b>{r.jobCount} jobs</b></div>
                        <Jobs jobs={r.jobs} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="ah-grid">
                {/* ── Farm watch and linked accounts ── */}
                <section className="ah-card ui-card" aria-labelledby="ah-farm-h">
                  <div className="ah-card-head">
                    <h2 id="ah-farm-h">Farm watch and linked accounts</h2>
                    <Link to="/admin/linked-accounts">Open Linked accounts →</Link>
                  </div>
                  <div className="ah-stats">
                    <div className={`ah-stat${f.openFlags ? ' hot' : ''}`}><small>Open farm flags</small><b>{f.openFlags}</b></div>
                    <div className="ah-stat"><small>Linked groups</small><b>{f.linkedGroups}</b></div>
                    <div className={`ah-stat${f.linkedGroupsWithPending ? ' hot' : ''}`}><small>With withdrawals waiting</small><b>{f.linkedGroupsWithPending}</b></div>
                  </div>
                  {!!f.topAlerts.length && (
                    <>
                      <h3>Latest farm flags</h3>
                      <ul className="ah-list">
                        {f.topAlerts.map((a) => (
                          <li key={a.alertId}>
                            <div className="ah-tags">{a.reasons.map((r) => <span key={r}>{r}</span>)}</div>
                            <Users names={a.usernames} />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {!!f.topLinkedGroups.length && (
                    <>
                      <h3>Linked groups</h3>
                      <ul className="ah-list">
                        {f.topLinkedGroups.map((g) => (
                          <li key={g.usernames.join()}>
                            <div className="ah-tags">{g.reasons.map((r) => <span key={r}>{r}</span>)}</div>
                            <div>{g.accounts} accounts{g.pendingAmount > 0 && <> · <span className="ah-new">{naira(g.pendingAmount)} waiting</span></>}</div>
                            <Users names={g.usernames} />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {!f.topAlerts.length && !f.topLinkedGroups.length && <Empty>No open flags or linked accounts.</Empty>}
                </section>

                {/* ── Withdrawals by new accounts ── */}
                <section className="ah-card ui-card" aria-labelledby="ah-wd-h">
                  <div className="ah-card-head">
                    <h2 id="ah-wd-h">Withdrawals by new accounts (last 24 hours)</h2>
                    <Link to="/admin/withdrawals">Open Withdrawals →</Link>
                  </div>
                  <p className="ah-sub">Withdrawals asked for by accounts less than 7 days old.</p>
                  <div className="ah-stats">
                    <div className={`ah-stat${w.count >= 5 ? ' hot' : ''}`}><small>Withdrawals</small><b>{w.count}</b></div>
                    {w.totals.map((t) => <div key={t.currency} className="ah-stat"><small>Total {t.currency}</small><b>{money(t.amount, t.currency)}</b></div>)}
                  </div>
                  {!w.accounts.length ? <Empty>None.</Empty> : (
                    <div className="ah-table">
                      <table style={{ minWidth: 380 }}>
                        <thead><tr><th>Account</th><th>Account age</th><th>Withdrawals</th><th>Amount</th></tr></thead>
                        <tbody>
                          {w.accounts.map((a) => (
                            <tr key={a.username}>
                              <td><Link to={`/user/${encodeURIComponent(a.username)}`}>@{a.username}</Link></td>
                              <td className="ah-num">{age(a.accountAgeHours)}</td>
                              <td className="ah-num">{a.count}</td>
                              <td className="ah-num">{a.currencies.length === 1 ? money(a.amount, a.currencies[0]) : a.amount.toLocaleString('en-NG')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>

              {/* ── Failed sign-ins ── */}
              <section className="ah-card ui-card" aria-labelledby="ah-fail-h">
                <h2 id="ah-fail-h">Failed sign-ins (last 24 hours)</h2>
                <p className="ah-sub">A wrong password, an email with no account, a banned account, or a wrong 2FA or email code. Passwords are never saved.</p>
                <div className="ah-stats">
                  <div className="ah-stat"><small>Last 24 hours</small><b>{fl.total24h}</b></div>
                  <div className={`ah-stat${fl.lastHour >= 50 ? ' hot' : ''}`}><small>Last hour</small><b>{fl.lastHour}</b></div>
                </div>
                <Bars hours={fl.hours} label="Failed sign-ins per hour for the last 24 hours" />
                <div className="ah-grid">
                  <div>
                    <h3>Top IPs</h3>
                    {!fl.topIps.length ? <Empty>None.</Empty> : (
                      <div className="ah-table">
                        <table style={{ minWidth: 300 }}>
                          <thead><tr><th>IP</th><th>Fails</th><th>Emails tried</th><th>Last</th></tr></thead>
                          <tbody>
                            {fl.topIps.map((r) => (
                              <tr key={r.ip}>
                                <td className="ah-mono">{r.ip}</td>
                                <td className={`ah-num${r.count >= 20 ? ' ah-new' : ''}`}>{r.count}</td>
                                <td className="ah-num">{r.emails}</td>
                                <td className="ah-num">{time(r.lastAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3>Top emails tried</h3>
                    {!fl.topEmails.length ? <Empty>None.</Empty> : (
                      <div className="ah-table">
                        <table style={{ minWidth: 340 }}>
                          <thead><tr><th>Email</th><th>Fails</th><th>IPs</th><th>Why</th></tr></thead>
                          <tbody>
                            {fl.topEmails.map((r) => (
                              <tr key={r.email}>
                                <td className="ah-mono">{r.email}</td>
                                <td className={`ah-num${r.count >= 10 ? ' ah-new' : ''}`}>{r.count}</td>
                                <td className="ah-num">{r.ips}</td>
                                <td>{r.reasons.map((x) => REASONS[x] || x).join(', ')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
      </div>
    </Layout>
  )
}
