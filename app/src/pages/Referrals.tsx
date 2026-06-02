import Layout from '../components/Layout'

export default function Referrals() {
  return (
    <Layout>
      <div className="bread"><a href="/app">Home</a> <i className="ti ti-chevron-right" style={{fontSize:10}} /> <span>Referrals</span></div>
      <div className="hero"><div className="greeting">Earn by sharing</div><h1>Referrals</h1></div>

      <div className="stats">
        <div className="stat-card"><div className="sc-icon" style={{background:'#7C3AED15',color:'#7C3AED'}}><i className="ti ti-users" /></div><div className="sc-val">0</div><div className="sc-label">Referrals</div></div>
        <div className="stat-card"><div className="sc-icon" style={{background:'#16a34a15',color:'#16a34a'}}><i className="ti ti-coin" /></div><div className="sc-val">&#8358;0</div><div className="sc-label">Earnings</div></div>
      </div>

      <div className="stat-card" style={{padding:20,marginBottom:18}}>
        <div style={{fontSize:13,color:'var(--text2)',marginBottom:8}}>Share your referral link</div>
        <div className="search-bar" style={{marginBottom:0}}>
          <input type="text" value="https://ogapay.app/ref/your-code" readOnly />
          <button className="cc-btn" style={{flexShrink:0,height:32,padding:'0 12px',fontSize:11}}>Copy</button>
        </div>
      </div>
    </Layout>
  )
}
