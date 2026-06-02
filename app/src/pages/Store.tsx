import Layout from '../components/Layout'

export default function Store() {
  return (
    <Layout>
      <div className="bread"><a href="/app">Home</a> <i className="ti ti-chevron-right" style={{fontSize:10}} /> <span>Store</span></div>
      <div className="hero"><div className="greeting">Marketplace</div><h1>Store</h1></div>

      <div className="search-bar"><i className="ti ti-search" /><input type="text" placeholder="Search products..." /></div>

      <div className="sec">
        <div className="sec-head"><h2><i className="ti ti-backpack" /> Featured Products</h2></div>
        <div className="gig-list">
          {['Social Media Growth Pack','App Testing Bundle','Content Creation Kit','Community Management Tool'].map((p,i) => (
            <div className="gig-item" key={i}>
              <div className="gig-info">
                <div className="gi-title">{p}</div>
                <div className="gi-meta"><span><i className="ti ti-coin" /> &#8358;{['5,000','3,500','8,000','6,500'][i]}</span></div>
              </div>
              <button className="gig-apply">Buy</button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
