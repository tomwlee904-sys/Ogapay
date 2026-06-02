import Layout from '../components/Layout'

export default function MyTasks() {
  return (
    <Layout>
      <div className="hero"><h1>My Tasks</h1></div>
      <div className="stat-card" style={{textAlign:'center',padding:40}}>
        <i className="ti ti-checklist" style={{fontSize:32,color:'var(--text3)',marginBottom:12,display:'block'}} />
        <div style={{fontSize:14,color:'var(--text2)'}}>You haven't taken any tasks yet</div>
        <a className="cc-btn" href="/app/tasks" style={{marginTop:12,display:'inline-flex'}}>Browse Tasks</a>
      </div>
    </Layout>
  )
}
