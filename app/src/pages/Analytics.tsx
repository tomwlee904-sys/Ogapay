// @ts-nocheck
import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const Icon = ({ n, s = 18, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
)

function computeChartData(transactions: any[], days: number, labelKey: string) {
  const now = Date.now()
  const dayMs = 86400000
  const buckets: { label: string; tasks: number; earnings: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * dayMs)
    const label = days === 7 ? d.toLocaleDateString('en', { weekday: 'short' }) : `${d.getDate()}/${d.getMonth() + 1}`
    buckets.push({ label, tasks: 0, earnings: 0 })
  }
  for (const t of transactions) {
    const d = new Date(t.createdAt || t.date).getTime()
    const idx = Math.floor((now - d) / dayMs)
    if (idx >= 0 && idx < days && (t.status === 'completed' || t.status === 'successful')) {
      buckets[days - 1 - idx].earnings += Number(t.amount || 0)
      buckets[days - 1 - idx].tasks += 1
    }
  }
  return buckets
}

export default function Analytics() {
  const [period, setPeriod] = useState('weekly')
  const [data, setData] = useState<{ label: string; tasks: number; earnings: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [successRate, setSuccessRate] = useState<number | null>(null)
  const [avgRating, setAvgRating] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [txData, dashData] = await Promise.all([
          apiRequest<any>('/users/transactions/history'),
          apiRequest<any>('/dashboard/summary').catch(() => null),
        ])
        const txs = Array.isArray(txData) ? txData : txData?.data || txData?.transactions || []
        const days = period === 'weekly' ? 7 : 30
        setData(computeChartData(txs, days, period === 'weekly' ? 'day' : 'month'))

        if (dashData?.metrics) {
          const { submissions, unreadNotifications } = dashData.metrics
          const completed = txs.filter((t: any) => t.status === 'completed' || t.status === 'successful').length
          const total = txs.length
          setSuccessRate(total > 0 ? Math.round((completed / total) * 100) : null)
        }
      } catch {}
      if (data.length === 0) setData([])
      setLoading(false)
    })()
  }, [period])

  const xKey = 'label'
  const totals = data.reduce((a, b) => ({ tasks: a.tasks + b.tasks, earnings: a.earnings + b.earnings }), { tasks: 0, earnings: 0 })

  return (
    <Layout>
      <style>{`
        .an-page{max-width:900px;margin:0 auto;padding:0 0 40px}
        .an-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
        .an-head h1{font-family:Outfit;font-size:24px;font-weight:900;margin:0}
        .an-period{display:flex;gap:4px;background:var(--bg2);border-radius:8px;padding:3px}
        .an-period button{padding:6px 14px;border-radius:6px;border:none;background:transparent;color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s}
        .an-period button.active{background:var(--card);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.08)}
        .an-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        @media(max-width:700px){.an-stats{grid-template-columns:repeat(2,1fr)}}
        .an-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px}
        .an-stat .s-icon{width:36px;height:36px;border-radius:8px;display:grid;place-items:center;margin-bottom:8px}
        .an-stat .s-val{font-family:Outfit;font-size:22px;font-weight:900}
        .an-stat .s-label{font-size:12px;color:var(--text2);margin-top:2px}
        .an-chart{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:24px}
        .an-chart h2{font-family:Outfit;font-size:15px;font-weight:800;margin:0 0 16px}
        .an-table{width:100%;border-collapse:collapse;font-size:13px}
        .an-table th{text-align:left;padding:10px 14px;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid var(--border)}
        .an-table td{padding:10px 14px;border-bottom:1px solid var(--border);color:var(--text2)}
        .an-table td strong{color:var(--text)}
      `}</style>

      <div className="an-page">
        <div className="an-head">
          <h1><Icon n="chart-bar" s={24} /> Analytics</h1>
          <div className="an-period">
            <button className={period === 'weekly' ? 'active' : ''} onClick={() => setPeriod('weekly')}>Weekly</button>
            <button className={period === 'monthly' ? 'active' : ''} onClick={() => setPeriod('monthly')}>Monthly</button>
          </div>
        </div>

        <div className="an-stats">
          {[
            { icon: 'checklist', color: '#191C6B', val: loading ? '...' : totals.tasks, label: 'Tasks Completed' },
            { icon: 'coin', color: '#16a34a', val: loading ? '...' : `NGN ${totals.earnings.toLocaleString()}`, label: 'Total Earnings' },
            { icon: 'trending-up', color: '#8B5CF6', val: loading ? '...' : successRate != null ? `${successRate}%` : '—', label: 'Success Rate' },
            { icon: 'star', color: '#F59E0B', val: loading ? '...' : avgRating != null ? avgRating.toFixed(1) : '—', label: 'Avg Rating' },
          ].map((s,i) => (
            <div className="an-stat" key={i}>
              <div className="s-icon" style={{background:`${s.color}18`,color:s.color}}><i className={`ti ti-${s.icon}`} /></div>
              <div className="s-val">{s.val}</div>
              <div className="s-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:24}}>
          <div className="an-chart">
            <h2><Icon n="checklist" s={16} /> Tasks</h2>
            <div style={{height:200}}>
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey={xKey} tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} />
                    <Bar dataKey="tasks" fill="#191C6B" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text2)',fontSize:13}}>
                  {loading ? 'Loading...' : 'No data yet'}
                </div>
              )}
            </div>
          </div>
          <div className="an-chart">
            <h2><Icon n="coin" s={16} /> Earnings</h2>
            <div style={{height:200}}>
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey={xKey} tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} />
                    <Line type="monotone" dataKey="earnings" stroke="#16a34a" strokeWidth={2} dot={{r:3}} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text2)',fontSize:13}}>
                  {loading ? 'Loading...' : 'No data yet'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="an-chart">
          <h2><Icon n="list" s={16} /> {period === 'weekly' ? 'Daily' : 'Daily'} Breakdown</h2>
          <table className="an-table">
            <thead><tr><th>Period</th><th>Tasks</th><th>Earnings</th><th>Avg per Task</th></tr></thead>
            <tbody>
              {data.length > 0 ? data.map((d,i) => (
                <tr key={i}>
                  <td><strong>{d[xKey]}</strong></td>
                  <td>{d.tasks}</td>
                  <td>NGN {d.earnings.toLocaleString()}</td>
                  <td>NGN {d.tasks > 0 ? Math.round(d.earnings / d.tasks).toLocaleString() : '0'}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={{textAlign:'center',color:'var(--text2)',padding:24}}>No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
