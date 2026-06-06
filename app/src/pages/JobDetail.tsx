import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    fetch(`${API_BASE}/tasks/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) setJob(json.data.task || json.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <Layout><div style={{ padding: 40, textAlign: 'center' }}>Loading...</div></Layout>

  if (!job) return (
    <Layout>
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Task Not Found</h2>
        <button onClick={() => navigate('/tasks')}>Back to Tasks</button>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div style={{ maxWidth: 768, margin: '0 auto', padding: '20px 16px 120px' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1F8CFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>
              {job.poster?.username?.slice(0, 2).toUpperCase() || 'OP'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{job.title}</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text2)' }}>by {job.poster?.username || 'OgaPay'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(31,140,255,0.15)', color: '#1F8CFF', fontSize: 12, fontWeight: 700 }}>{job.category || 'General'}</span>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--bg2)', color: 'var(--text3)', fontSize: 12, fontWeight: 700 }}>Reward: {job.currency || 'NGN'} {Number(job.reward || 0).toLocaleString()}</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 20px' }}>{job.description || job.instructions || 'No description provided.'}</p>
          <button onClick={() => navigate(`/tasks/${id}/submit`)} style={{ height: 44, padding: '0 24px', borderRadius: 999, background: '#1F8CFF', color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Apply Now
          </button>
        </div>
      </div>
    </Layout>
  )
}
