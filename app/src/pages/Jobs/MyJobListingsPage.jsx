import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

const C = {
  text: 'var(--text)', text2: 'var(--text2)', text3: 'var(--text3)',
  card: 'var(--card)', border: 'var(--border)', bg: 'var(--bg)', bg2: 'var(--bg2)', accent: 'var(--accent)',
}

export default function MyJobListingsPage() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState(null)

  useEffect(() => {
    if (!authUser?.id) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('job_listings')
          .select('*')
          .eq('employer_id', authUser.id)
          .order('created_at', { ascending: false })
        if (!error && data) setJobs(data)
      } catch {}
      setLoading(false)
    })()
  }, [authUser?.id])

  const handleToggleStatus = async (job) => {
    const newStatus = job.status === 'active' ? 'closed' : 'active'
    setTogglingId(job.id)
    try {
      const { error } = await supabase
        .from('job_listings')
        .update({ status: newStatus })
        .eq('id', job.id)
      if (!error) {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: newStatus } : j))
      }
    } catch {}
    setTogglingId(null)
  }

  const activeCount = jobs.filter(j => j.status === 'active').length
  const closedCount = jobs.filter(j => j.status === 'closed').length

  return (
    <Layout>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 26, fontWeight: 900, margin: '0 0 4px' }}>My Job Listings</h1>
            <p style={{ color: C.text3, fontSize: 13, margin: 0 }}>Manage your posted job listings</p>
          </div>
          <button onClick={() => navigate('/post-job')}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
            <i className="ti ti-plus" /> Post New Job
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>{jobs.length}</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Total Listings</div>
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--green)' }}>{activeCount}</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Active</div>
          </div>
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text3 }}>{closedCount}</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Closed</div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: C.text3 }}>
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24, display: 'block', marginBottom: 8 }} />
            Loading...
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <i className="ti ti-briefcase-off" style={{ fontSize: 48, color: C.text3, display: 'block', marginBottom: 12 }} />
            <p style={{ color: C.text2, fontSize: 14, marginBottom: 4 }}>You haven't posted any jobs yet.</p>
            <p style={{ color: C.text3, fontSize: 12, marginBottom: 20 }}>Post your first job listing to get started.</p>
            <button onClick={() => navigate('/post-job')}
              style={{ padding: '10px 24px', borderRadius: 10, background: C.accent, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Post a Job
            </button>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobs.map(job => (
              <div key={job.id} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                {job.company_logo_url ? (
                  <img src={job.company_logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: C.bg2, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: C.accent, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                    {job.company_name?.slice(0, 2).toUpperCase() || '?'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{job.job_title}</div>
                  <div style={{ fontSize: 12, color: C.text2 }}>{job.company_name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--accent)18', color: 'var(--accent)' }}>{job.job_type}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: job.status === 'active' ? 'rgba(22,163,74,0.12)' : C.bg2, color: job.status === 'active' ? 'var(--green)' : C.text3 }}>
                      {job.status}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => navigate('/jobs/' + job.id)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid ' + C.border, background: C.card, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    View
                  </button>
                  <button onClick={() => handleToggleStatus(job)} disabled={togglingId === job.id}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid ' + C.border, background: job.status === 'active' ? 'rgba(239,68,68,0.08)' : 'rgba(22,163,74,0.08)', color: job.status === 'active' ? '#ef4444' : 'var(--green)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {togglingId === job.id ? '...' : job.status === 'active' ? 'Close' : 'Reopen'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
