import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

interface LeaderEntry {
  rank: number
  name: string
  username: string
  avatarUrl?: string
  earnings: number
  tasks: number
}

interface MyRank {
  rank: number | null
  profile?: { totalEarned: number; tasksCompleted: number; reputationScore: number }
}

const periodTabs = ['Weekly', 'Monthly', 'All Time']

const categories = [
  { id: 'earners', icon: 'ti ti-coin', label: 'Top Earners', color: '#191C6B' },
  { id: 'posters', icon: 'ti ti-briefcase', label: 'Top Task Posters', color: '#191C6B' },
  { id: 'referrers', icon: 'ti ti-affiliate', label: 'Top Referrers', color: '#16a34a' },
  { id: 'leaders', icon: 'ti ti-users', label: 'Community Leaders', color: '#F59E0B' },
]

const achievements = [
  { icon: 'ti-diamond', name: 'Gold Earner', desc: 'Earn over NGN 100K' },
  { icon: 'ti-medal-2', name: 'Silver Earner', desc: 'Earn over NGN 50K' },
  { icon: 'ti-medal', name: 'Bronze Earner', desc: 'Earn over NGN 25K' },
  { icon: 'ti-flame', name: 'Top Referrer', desc: 'Refer 10+ users' },
  { icon: 'ti-bolt', name: 'Fast Worker', desc: 'Complete 50 tasks' },
  { icon: 'ti-crown', name: 'Community Leader', desc: 'Lead a community' },
]

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function Leaderboard() {
  const [period, setPeriod] = useState('Monthly')
  const [catTab, setCatTab] = useState('earners')
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [myRank, setMyRank] = useState<MyRank | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [lbData, meData] = await Promise.all([
          apiRequest<any>('/leaderboard'),
          apiRequest<MyRank>('/leaderboard/me').catch(() => null),
        ])
        const top = lbData?.topEarners || lbData?.data?.topEarners || (Array.isArray(lbData) ? lbData : [])
        setLeaders(top)
        if (meData) setMyRank(meData)
      } catch {}
      setLoading(false)
    })()
  }, [])

  const currentCat = categories.find(c => c.id === catTab) || categories[0]
  const top3 = leaders.slice(0, 3)
  const podium = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3

  const totalEarnings = leaders.reduce((s, u) => s + (u.earnings || 0), 0)
  const totalTasks = leaders.reduce((s, u) => s + (u.tasks || 0), 0)

  return (
    <Layout>
      <style>{`
        .lb-hero{text-align:center;padding:36px 20px 28px;margin-bottom:24px;background:linear-gradient(135deg,rgba(31,140,255,.08),rgba(37,99,235,.06),var(--card));border-radius:16px;border:1px solid var(--border);position:relative;overflow:hidden}
        .lb-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 40%,rgba(31,140,255,.12),transparent 60%),radial-gradient(ellipse at 70% 60%,rgba(37,99,235,.08),transparent 50%);pointer-events:none}
        .lb-hero-inner{position:relative;z-index:1}
        .lb-hero h1{font-family:Outfit;font-size:32px;font-weight:900;margin:0 0 6px}
        .lb-hero p{color:var(--text2);font-size:14px;margin:0 auto;max-width:480px}
        .lb-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}
        @media(max-width:600px){.lb-stats{grid-template-columns:repeat(2,1fr)}}
        .lb-stat{text-align:center;padding:14px;background:var(--card);border:1px solid var(--border);border-radius:12px}
        .lb-stat .lb-num{font-family:Outfit;font-size:22px;font-weight:900;color:var(--accent)}
        .lb-stat .lb-lbl{font-size:11px;color:var(--text2);margin-top:2px;font-weight:600}
        .lb-period{display:flex;gap:4px;background:var(--bg2);border-radius:10px;padding:4px;width:fit-content;margin:0 auto 20px}
        .lb-period button{padding:7px 16px;border:0;border-radius:8px;background:transparent;color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s}
        .lb-period button.active{background:var(--card);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.06)}
        .lb-podium{display:grid;grid-template-columns:1fr 1.2fr 1fr;align-items:end;gap:10px;margin-bottom:24px}
        @media(max-width:600px){.lb-podium{grid-template-columns:1fr;gap:8px}.lb-podium .first{order:-1}}
        .lb-pcard{text-align:center;padding:18px 12px;border-radius:14px;background:var(--card);border:1px solid var(--border);transition:all .3s}
        .lb-pcard:hover{transform:translateY(-3px)}
        .lb-pcard.first{background:linear-gradient(180deg,rgba(245,179,1,.08),transparent);border-color:rgba(245,179,1,.25);padding:24px 14px}
        .lb-pcard.first .lb-av{width:52px;height:52px;font-size:20px}
        .lb-pcard .lb-av{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-weight:900;color:#fff;font-family:Outfit;font-size:18px;overflow:hidden}
        .lb-pcard .lb-av img{width:100%;height:100%;object-fit:cover}
        .lb-pcard .lb-pname{font-weight:800;font-size:13px}
        .lb-pcard .lb-pearn{font-size:15px;font-weight:900;color:var(--accent);margin-top:2px}
        .lb-pcard .lb-prank{font-size:11px;color:var(--text3);margin-bottom:4px}
        .lb-pcard.first .lb-prank{color:var(--gold);font-weight:700}
        .lb-cats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px}
        @media(max-width:600px){.lb-cats{grid-template-columns:1fr}}
        .lb-cat{border:1px solid var(--border);border-radius:14px;background:var(--card);overflow:hidden}
        .lb-cat-head{display:flex;align-items:center;gap:8px;padding:12px 14px 8px}
        .lb-cat-head i{font-size:18px}
        .lb-cat-head h3{font-family:Outfit;font-size:13px;font-weight:800;margin:0}
        .lb-cat-list{padding:0 14px 12px}
        .lb-cat-row{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px}
        .lb-cat-rr{width:20px;font-weight:800;color:var(--text3);text-align:center}
        .lb-cat-av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0;overflow:hidden}
        .lb-cat-av img{width:100%;height:100%;object-fit:cover}
        .lb-cat-name{flex:1;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .lb-cat-sc{font-weight:800;color:var(--accent)}
        .lb-user-card{background:linear-gradient(135deg,var(--card),var(--bg2));border:1px solid var(--border);border-radius:14px;padding:20px;margin-bottom:24px}
        .lb-user-card h3{font-family:Outfit;font-size:15px;font-weight:900;margin:0 0 12px;display:flex;align-items:center;gap:8px}
        .lb-ur-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}
        @media(max-width:500px){.lb-ur-grid{grid-template-columns:repeat(2,1fr)}}
        .lb-ur-item{text-align:center}
        .lb-ur-item .urv{font-family:Outfit;font-size:18px;font-weight:900}
        .lb-ur-item .url{font-size:10px;color:var(--text2);margin-top:2px;font-weight:600}
        .lb-progress{height:6px;border-radius:99px;background:var(--bg2);overflow:hidden}
        .lb-progress .lb-bar{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .6s;width:65%}
        .lb-next{font-size:11px;color:var(--text2);margin-top:4px;text-align:right}
        .lb-ach{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px}
        @media(max-width:500px){.lb-ach{grid-template-columns:repeat(2,1fr)}}
        .lb-ach-item{text-align:center;padding:14px 10px;background:var(--card);border:1px solid var(--border);border-radius:12px;transition:all .2s}
        .lb-ach-item:hover{transform:translateY(-2px)}
        .lb-ach-item .achi{font-size:24px;margin-bottom:4px;display:block}
        .lb-ach-item .achn{font-weight:800;font-size:11px}
        .lb-ach-item .achd{font-size:9px;color:var(--text3);margin-top:2px}
      `}</style>

      <div className="lb-hero">
        <div className="lb-hero-inner">
          <h1>Leaderboard</h1>
          <p>Discover the top earners, task creators, referrers, and community leaders on OgaPay</p>
        </div>
      </div>

      <div className="lb-stats">
        {[
          { num: loading ? '...' : `NGN ${(totalEarnings / 1000).toFixed(1)}M`, label: 'Total Rewards Paid' },
          { num: loading ? '...' : totalTasks.toLocaleString(), label: 'Tasks Completed' },
          { num: loading ? '...' : leaders.length.toString(), label: 'Workers' },
          { num: loading ? '...' : `${leaders.filter(u => u.earnings > 0).length}`, label: 'Active Earners' },
        ].map((s, i) => (
          <div className="lb-stat" key={i}>
            <div className="lb-num">{s.num}</div>
            <div className="lb-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="lb-period">
        {periodTabs.map(p => (
          <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>{p}</button>
        ))}
      </div>

      <div className="lb-podium">
        {podium.length > 0 ? podium.map((u, i) => {
          const initials = getInitials(u.name)
          const rank = i === 1 ? 1 : i === 0 ? 2 : 3
          return (
            <div key={i} className={`lb-pcard ${i === 1 ? 'first' : ''}`}>
              <div className="lb-prank">#{rank}</div>
              <div className="lb-av" style={{ background: '#191C6B' }}>
                {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} /> : initials}
              </div>
              <div className="lb-pname">{u.name}</div>
              <div className="lb-pearn">NGN {u.earnings?.toLocaleString()}</div>
            </div>
          )
        }) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 24, color: 'var(--text2)' }}>
            {loading ? 'Loading...' : 'No ranked workers yet'}
          </div>
        )}
      </div>

      <div className="lb-cats">
        {(categories || []).map(c => (
          <div className="lb-cat" key={c.id}>
            <div className="lb-cat-head">
              <i className={c.icon} style={{color: c.color}} />
              <h3>{c.label}</h3>
            </div>
            <div className="lb-cat-list">
              {leaders.slice(0, 5).map((u, i) => {
                const initials = getInitials(u.name)
                return (
                  <div className="lb-cat-row" key={i}>
                    <span className="lb-cat-rr">#{i + 1}</span>
                    <div className="lb-cat-av" style={{background: '#191C6B'}}>
                      {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} /> : initials}
                    </div>
                    <span className="lb-cat-name">{u.name}</span>
                    <span className="lb-cat-sc">NGN {u.earnings?.toLocaleString()}</span>
                  </div>
                )
              })}
              {leaders.length === 0 && <div style={{padding: 12, color: 'var(--text2)', fontSize: 12, textAlign: 'center'}}>No data yet</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="lb-user-card">
        <h3><i className="ti ti-trophy" style={{color:'var(--accent)'}} /> My Ranking</h3>
        <div className="lb-ur-grid">
          {[
            { val: myRank?.rank != null ? `#${myRank.rank}` : '#--', label: 'Position' },
            { val: myRank?.profile ? `NGN ${myRank.profile.totalEarned?.toLocaleString()}` : 'NGN 0', label: 'Earnings' },
            { val: myRank?.profile ? `${myRank.profile.tasksCompleted}` : '0', label: 'Tasks Done' },
            { val: '—', label: 'Referrals' },
          ].map((r, i) => (
            <div className="lb-ur-item" key={i}>
              <div className="urv">{r.val}</div>
              <div className="url">{r.label}</div>
            </div>
          ))}
        </div>
        <div className="lb-progress"><div className="lb-bar" /></div>
        <div className="lb-next">Complete more tasks to climb the leaderboard</div>
      </div>

      <div className="lb-ach">
        {achievements.map((a, i) => (
          <div className="lb-ach-item" key={i}>
            <div className="achi"><i className={a.icon} style={{fontSize:24}} /></div>
            <div className="achn">{a.name}</div>
            <div className="achd">{a.desc}</div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
