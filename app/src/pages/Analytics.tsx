// @ts-nocheck
import { useState } from 'react'
import Layout from '../components/Layout'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const Icon = ({ n, s = 18, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
)

const weeklyData = [
  { day: 'Mon', tasks: 4, earnings: 2400 },
  { day: 'Tue', tasks: 6, earnings: 3600 },
  { day: 'Wed', tasks: 3, earnings: 1800 },
  { day: 'Thu', tasks: 8, earnings: 4800 },
  { day: 'Fri', tasks: 5, earnings: 3000 },
  { day: 'Sat', tasks: 2, earnings: 1200 },
  { day: 'Sun', tasks: 1, earnings: 600 },
]

const monthlyData = [
  { month: 'Jan', tasks: 45, earnings: 27000 },
  { month: 'Feb', tasks: 52, earnings: 31200 },
  { month: 'Mar', tasks: 38, earnings: 22800 },
  { month: 'Apr', tasks: 61, earnings: 36600 },
  { month: 'May', tasks: 48, earnings: 28800 },
  { month: 'Jun', tasks: 55, earnings: 33000 },
]

export default function Analytics() {
  const [period, setPeriod] = useState('weekly')
  const data = period === 'weekly' ? weeklyData : monthlyData
  const xKey = period === 'weekly' ? 'day' : 'month'

  const totals = { tasks: data.reduce((a,b) => a + b.tasks, 0), earnings: data.reduce((a,b) => a + b.earnings, 0) }

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
            { icon: 'checklist', color: '#1F8CFF', val: totals.tasks, label: 'Tasks Completed' },
            { icon: 'coin', color: '#16a34a', val: `NGN ${totals.earnings.toLocaleString()}`, label: 'Total Earnings' },
            { icon: 'trending-up', color: '#8B5CF6', val: '98%', label: 'Success Rate' },
            { icon: 'star', color: '#F59E0B', val: '4.8', label: 'Avg Rating' },
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={xKey} tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} />
                  <Bar dataKey="tasks" fill="#1F8CFF" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="an-chart">
            <h2><Icon n="coin" s={16} /> Earnings</h2>
            <div style={{height:200}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={xKey} tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize:10,fill:'var(--text3)'}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} />
                  <Line type="monotone" dataKey="earnings" stroke="#16a34a" strokeWidth={2} dot={{r:3}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="an-chart">
          <h2><Icon n="list" s={16} /> {period === 'weekly' ? 'Daily' : 'Monthly'} Breakdown</h2>
          <table className="an-table">
            <thead><tr><th>Period</th><th>Tasks</th><th>Earnings</th><th>Avg per Task</th></tr></thead>
            <tbody>
              {data.map((d,i) => (
                <tr key={i}>
                  <td><strong>{d[xKey]}</strong></td>
                  <td>{d.tasks}</td>
                  <td>NGN {d.earnings.toLocaleString()}</td>
                  <td>NGN {Math.round(d.earnings / d.tasks).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
