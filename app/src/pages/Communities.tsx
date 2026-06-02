import Layout from '../components/Layout'

export default function Communities() {
  return (
    <Layout>
      <div className="bread"><a href="/app">Home</a> <i className="ti ti-chevron-right" style={{fontSize:10}} /> <span>Communities</span></div>
      <div className="hero"><div className="greeting">Connect &amp; Network</div><h1>Communities</h1></div>

      <div className="stats">
        <div className="stat-card"><div className="sc-icon" style={{background:'#7C3AED15',color:'#7C3AED'}}><i className="ti ti-users" /></div><div className="sc-val">0</div><div className="sc-label">Joined</div></div>
        <div className="stat-card"><div className="sc-icon" style={{background:'#16a34a15',color:'#16a34a'}}><i className="ti ti-flame" /></div><div className="sc-val">0</div><div className="sc-label">Trending</div></div>
        <div className="stat-card"><div className="sc-icon" style={{background:'#2563EB15',color:'#2563EB'}}><i className="ti ti-message" /></div><div className="sc-val">0</div><div className="sc-label">Messages</div></div>
        <div className="stat-card"><div className="sc-icon" style={{background:'#f5b30115',color:'#f5b301'}}><i className="ti ti-star" /></div><div className="sc-val">0</div><div className="sc-label">Campaigns</div></div>
      </div>

      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-flame" /> Trending Communities</h2></div>
        <div className="gig-list">
          {['Tech Builders Nigeria','Crypto & Web3 Enthusiasts','Freelancers Hub','Content Creators'].map((c,i) => (
            <div className="gig-item" key={i}>
              <div className="gig-info">
                <div className="gi-title">{c}</div>
                <div className="gi-meta"><span><i className="ti ti-users" /> {['2.4k','1.8k','3.2k','1.1k'][i]} members</span></div>
              </div>
              <button className="gig-apply">Join</button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
