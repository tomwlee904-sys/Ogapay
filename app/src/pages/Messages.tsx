import Layout from '../components/Layout'

export default function Messages() {
  return (
    <Layout>
      <div className="hero"><h1>Messages</h1></div>
      <div className="gig-list">
        {['No conversations yet'].map((m,i) => (
          <div className="gig-item" key={i}>
            <div className="gig-info"><div className="gi-title" style={{color:'var(--text3)',fontSize:13}}>{m}</div></div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
