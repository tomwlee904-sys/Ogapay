import Layout from '../components/Layout'

export default function Notifications() {
  return (
    <Layout>
      <div className="hero"><div className="greeting">Updates</div><h1>Notifications</h1></div>
      <div className="search-bar" style={{marginBottom:16}}><i className="ti ti-filter" /><input type="text" placeholder="Filter notifications..." /></div>
      <div className="gig-list">
        {['Welcome to OgaPay! Start exploring tasks.','New task available in your area.','Your withdrawal of ₦5,000 has been processed.'].map((n,i) => (
          <div className="gig-item" key={i}>
            <div className="gig-info"><div className="gi-title" style={{fontSize:12}}>{n}</div><div className="gi-meta"><span>{['2m ago','1h ago','1d ago'][i]}</span></div></div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
