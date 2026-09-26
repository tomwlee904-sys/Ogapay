import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import '../styles/profile-public.css'
import '../styles/analytics.css'

// Ported from the June analytics page. That version counted every wallet
// transaction (deposits, escrow) as earnings, only saw the last 20 of them and
// compared lowercase statuses the API never sends, so it always showed zero.
// The numbers now come from GET /analytics.

type Period = 'week' | 'month' | 'year'
type Row = { label: string; jobs: number; earnedNgn: number; spentNgn: number }
type Data = {
  totals: { jobsPaid: number; earnedNgn: number; otherCurrencyJobs: number; spentNgn: number; approvalRate: number | null; reviewed: number; avgRating: number | null; ratings: number }
  series: Row[]
  recent: { id: string; amount: number; currency: string; at: string; task: { id: string; title: string } }[]
}

const PERIODS: { id: Period; label: string; span: string }[] = [
  { id: 'week', label: 'Week', span: 'last 7 days' },
  { id: 'month', label: 'Month', span: 'last 30 days' },
  { id: 'year', label: 'Year', span: 'last 12 months' },
]
const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-US')
const money = (n: number, c: string) => (c === 'NGN' ? naira(n) : `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${c}`)
const tip = { contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }, labelStyle: { color: 'var(--text2)' } }

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('week')
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let live = true
    setData(null); setErr(false)
    apiRequest<Data>(`/analytics?period=${period}`)
      .then((d) => live && setData(d))
      .catch(() => live && setErr(true))
    return () => { live = false }
  }, [period])

  const span = PERIODS.find((p) => p.id === period)!.span
  const t = data?.totals
  const empty = !!data && data.series.every((r) => !r.jobs && !r.spentNgn)
  const tick = { fontSize: 11, fill: 'var(--text3)' }
  const interval = period === 'month' ? 4 : 0

  return (
    <Layout>
      <div className="up-wrap">
        <div className="an2-head">
          <div>
            <h1>Analytics</h1>
            <p>Your paid work and spending, {span}.</p>
          </div>
          <div className="up-tabs" role="tablist" aria-label="Period">
            {PERIODS.map((p) => (
              <button key={p.id} role="tab" aria-selected={period === p.id} className={`up-tab${period === p.id ? ' on' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
            ))}
          </div>
        </div>

        {err && <div className="up-empty"><i className="ti ti-cloud-off" />Couldn't load your analytics. Refresh to try again.</div>}

        <div className="an2-stats">
          <section className="up-card an2-stat">
            <div className="up-eyebrow">Earned</div>
            <b>{t ? naira(t.earnedNgn) : '…'}</b>
            <span>{t?.otherCurrencyJobs ? `+ ${t.otherCurrencyJobs} job${t.otherCurrencyJobs === 1 ? '' : 's'} paid in crypto` : 'from paid jobs'}</span>
          </section>
          <section className="up-card an2-stat">
            <div className="up-eyebrow">Jobs paid</div>
            <b>{t ? t.jobsPaid.toLocaleString() : '…'}</b>
            <span>jobs you were paid for</span>
          </section>
          <section className="up-card an2-stat">
            <div className="up-eyebrow">Approval rate</div>
            <b>{t ? (t.approvalRate != null ? `${t.approvalRate}%` : '—') : '…'}</b>
            <span>{t?.reviewed ? `of ${t.reviewed} reviewed submission${t.reviewed === 1 ? '' : 's'}` : 'no reviewed work yet'}</span>
          </section>
          <section className="up-card an2-stat">
            <div className="up-eyebrow">Rating</div>
            <b>{t ? (t.avgRating != null ? t.avgRating.toFixed(1) : '—') : '…'}</b>
            <span>{t?.ratings ? `from ${t.ratings} rating${t.ratings === 1 ? '' : 's'}` : 'no ratings yet'}</span>
          </section>
        </div>

        {t && t.spentNgn > 0 && (
          <section className="up-card an2-spent">
            <i className="ti ti-briefcase" />
            <span>Your jobs paid out <b>{naira(t.spentNgn)}</b> to workers ({span}).</span>
            <Link to="/manage-jobs">Manage jobs</Link>
          </section>
        )}

        {data && empty ? (
          <div className="up-empty an2-empty">
            <i className="ti ti-chart-bar" />
            No paid jobs {span}.
            <div><Link className="up-btn primary" to="/tasks">Find jobs</Link></div>
          </div>
        ) : (
          <div className="an2-charts">
            <section className="up-card an2-chart">
              <h2>Jobs paid</h2>
              <div className="an2-plot">
                {data ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} interval={interval} />
                      <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip {...tip} cursor={{ fill: 'var(--bg2)' }} formatter={(v: number) => [v, 'Jobs']} />
                      <Bar dataKey="jobs" fill="var(--text)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="an2-wait">Loading…</div>}
              </div>
            </section>
            <section className="up-card an2-chart">
              <h2>Naira earned</h2>
              <div className="an2-plot">
                {data ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} interval={interval} />
                      <YAxis tick={tick} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => (v >= 1000 ? `₦${+(v / 1000).toFixed(1)}k` : `₦${v}`)} />
                      <Tooltip {...tip} formatter={(v: number) => [naira(v), 'Earned']} />
                      <Line type="monotone" dataKey="earnedNgn" stroke="var(--green)" strokeWidth={2} dot={{ r: 2.5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="an2-wait">Loading…</div>}
              </div>
            </section>
          </div>
        )}

        {data && !empty && (
          <section className="up-card an2-sec">
            <h2>{period === 'year' ? 'By month' : 'By day'}</h2>
            <div className="an2-scroll">
              <table className="an2-table">
                <thead><tr><th>{period === 'year' ? 'Month' : 'Day'}</th><th>Jobs</th><th>Earned</th><th>Per job</th></tr></thead>
                <tbody>
                  {[...data.series].reverse().filter((r) => r.jobs > 0).map((r) => (
                    <tr key={r.label}>
                      <td>{r.label}</td>
                      <td>{r.jobs}</td>
                      <td className="amt">{naira(r.earnedNgn)}</td>
                      <td>{naira(r.earnedNgn / r.jobs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {data && data.recent.length > 0 && (
          <section className="up-card an2-sec">
            <h2>Recent payouts</h2>
            <div className="an2-recent">
              {data.recent.map((p) => (
                <Link key={p.id} to={`/tasks/${p.task.id}`} className="an2-pay">
                  <span className="t">{p.task.title}</span>
                  <span className="d">{new Date(p.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="a">+{money(p.amount, p.currency)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  )
}
