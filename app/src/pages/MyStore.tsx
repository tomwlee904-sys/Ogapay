import Layout from '../components/Layout'

export default function MyStore() {
  return (
    <Layout>
      <div className="bread"><a href="/app">Home</a> <i className="ti ti-chevron-right" style={{fontSize:10}} /> <span>My Store</span></div>
      <div className="hero"><div className="greeting">Your marketplace</div><h1>My Store</h1></div>
      <div className="stats">
        <div className="stat-card"><div className="sc-icon" style={{background:'#7C3AED15',color:'#7C3AED'}}><i className="ti ti-building-store" /></div><div className="sc-val">0</div><div className="sc-label">Products</div></div>
        <div className="stat-card"><div className="sc-icon" style={{background:'#16a34a15',color:'#16a34a'}}><i className="ti ti-coin" /></div><div className="sc-val">&#8358;0</div><div className="sc-label">Sales</div></div>
      </div>
      <div className="stat-card" style={{textAlign:'center',padding:40}}>
        <i className="ti ti-building-store" style={{fontSize:32,color:'var(--text3)',marginBottom:12,display:'block'}} />
        <div style={{fontSize:14,color:'var(--text2)'}}>Your store is empty</div>
        <button className="cc-btn" style={{marginTop:12}}>Add Product</button>
      </div>
    </Layout>
  )
}
