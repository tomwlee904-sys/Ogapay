import Layout from '../components/Layout'

export default function Vault() {
  return (
    <Layout>
      <div className="hero"><div className="greeting">Secure Storage</div><h1>Vault</h1></div>
      <div className="stats">
        <div className="stat-card"><div className="sc-icon" style={{background:'#7C3AED15',color:'#7C3AED'}}><i className="ti ti-vault" /></div><div className="sc-val">0</div><div className="sc-label">Documents</div></div>
        <div className="stat-card"><div className="sc-icon" style={{background:'#16a34a15',color:'#16a34a'}}><i className="ti ti-lock" /></div><div className="sc-val">0 MB</div><div className="sc-label">Storage Used</div></div>
      </div>
      <div className="gig-list">
        {['Business Permit','ID Document','KYC Verification'].map((d,i) => (
          <div className="gig-item" key={i}>
            <div className="gig-info"><div className="gi-title">{d}</div><div className="gi-meta"><span>Uploaded {['Mar 2025','Feb 2025','Jan 2025'][i]}</span></div></div>
            <button className="gig-apply">View</button>
          </div>
        ))}
      </div>
    </Layout>
  )
}
