import Layout from '../components/Layout'

export default function Settings() {
  return (
    <Layout>
      <div className="hero"><h1>Settings</h1></div>
      <div className="stat-card" style={{padding:24,marginBottom:14}}>
        <h3 style={{margin:'0 0 16px',fontSize:15,fontWeight:700}}>Profile Settings</h3>
        <div style={{display:'grid',gap:14}}>
          {[{label:'Full Name',val:'User Name'},{label:'Username',val:'@username'},{label:'Email',val:'user@email.com'},{label:'Phone',val:'+234 800 000 0000'},{label:'Location',val:'Lagos, Nigeria'}].map(f => (
            <div key={f.label}>
              <label style={{fontSize:11,fontWeight:700,color:'var(--text3)',display:'block',marginBottom:4}}>{f.label}</label>
              <div className="search-bar" style={{marginBottom:0}}><input type="text" defaultValue={f.val} /></div>
            </div>
          ))}
          <button className="cc-btn" style={{height:40,marginTop:8}}>Save Changes</button>
        </div>
      </div>
    </Layout>
  )
}
