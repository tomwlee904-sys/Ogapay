import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

export default function ManageJobs() {
  const navigate = useNavigate()
  return (
    <Layout>
      <div style={{ padding: '28px 20px 60px', maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Manage Jobs</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
          View and manage all your posted jobs.
        </p>
      </div>
    </Layout>
  )
}
