import Layout from '../components/Layout'

export default function WorkerPortal() {
  return (
    <Layout>
      <div className="bread"><a href="/app">Home</a> <i className="ti ti-chevron-right" style={{fontSize:10}} /> <span>Worker Portal</span></div>
      <div className="hero"><div className="greeting">Your workspace</div><h1>Worker Portal</h1></div>

      <div className="stats">
        <div className="stat-card"><div className="sc-icon" style={{background:'#7C3AED15',color:'#7C3AED'}}><i className="ti ti-checklist" /></div><div className="sc-val">0</div><div className="sc-label">Active Gigs</div></div>
        <div className="stat-card"><div className="sc-icon" style={{background:'#16a34a15',color:'#16a34a'}}><i className="ti ti-coin" /></div><div className="sc-val">&#8358;0</div><div className="sc-label">Earnings</div></div>
        <div className="stat-card"><div className="sc-icon" style={{background:'#2563EB15',color:'#2563EB'}}><i className="ti ti-clock" /></div><div className="sc-val">0</div><div className="sc-label">Hours</div></div>
        <div className="stat-card"><div className="sc-icon" style={{background:'#f5b30115',color:'#f5b301'}}><i className="ti ti-star" /></div><div className="sc-val">5.0</div><div className="sc-label">Rating</div></div>
      </div>

      {/* Connect wallet card */}
      <div className="connect-card">
        <div className="cc-icon"><i className="ti ti-plug-connected" /></div>
        <div className="cc-info"><strong>Connect your wallet</strong><span>Link your Solana or Naira wallet to receive payments instantly</span></div>
        <button className="cc-btn"><i className="ti ti-plug-connected" /> Connect</button>
      </div>

      {/* Earnings */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-coin" /> Earnings Breakdown</h2></div>
        <div className="earn-break">
          <div className="earn-item"><div className="ei-label">This Week</div><div className="ei-val">&#8358;0</div><div className="ei-sub">0 tasks completed</div></div>
          <div className="earn-item"><div className="ei-label">This Month</div><div className="ei-val">&#8358;0</div><div className="ei-sub">0 tasks completed</div></div>
          <div className="earn-item"><div className="ei-label">Pending Payout</div><div className="ei-val">&#8358;0</div><div className="ei-sub">Awaiting approval</div></div>
          <div className="earn-item"><div className="ei-label">Total Withdrawn</div><div className="ei-val">&#8358;0</div><div className="ei-sub">All time</div></div>
        </div>
      </div>

      {/* Available Gigs */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-briefcase" /> Available Gigs <span className="sec-badge">3</span></h2></div>
        <div className="search-bar"><i className="ti ti-search" /><input type="text" placeholder="Search gigs..." /></div>
        <div className="gig-list">
          {['Social Media Engagement', 'Product Review - Video', 'Community Moderation'].map((g,i) => (
            <div className="gig-item" key={i}>
              <div className="gig-info">
                <div className="gi-title">{g}</div>
                <div className="gi-meta"><span><i className="ti ti-coin" /> &#8358;{['500','2,000','1,200'][i]}</span><span><i className="ti ti-clock" /> ~{['10','30','20'][i]} min</span></div>
              </div>
              <button className="gig-apply" onClick={e=>{const t=e.currentTarget;t.textContent='Applied!';t.classList.add('applied');t.disabled=true}}>Apply</button>
            </div>
          ))}
        </div>
      </div>

      {/* Active Orders */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-truck-delivery" /> Active Orders <span className="sec-badge">0</span></h2></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Order</th><th>Client</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody><tr><td colSpan={4} style={{textAlign:'center',color:'var(--text3)',padding:24}}>No active orders</td></tr></tbody>
          </table>
        </div>
      </div>

      {/* Skills */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-tag" /> My Skills</h2></div>
        <div className="skills">
          {['Social Media','Content Writing','App Testing','UI Design','Community Mgmt','Data Entry'].map(s => (
            <span className="skill-tag" key={s}><i className="ti ti-bolt" />{s}</span>
          ))}
        </div>
      </div>

      {/* Performance */}
      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-trending-up" /> Performance</h2></div>
        <div className="metrics">
          <div className="metric-card"><div className="mc-val">0%</div><div className="mc-label">Completion</div></div>
          <div className="metric-card"><div className="mc-val">0%</div><div className="mc-label">Acceptance</div></div>
          <div className="metric-card"><div className="mc-val">—</div><div className="mc-label">Avg Response</div></div>
        </div>
      </div>
    </Layout>
  )
}
