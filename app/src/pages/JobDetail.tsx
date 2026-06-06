import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'
const BRAND = '#1F8CFF'
const BRAND_RGB = '31,140,255'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

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
      {/* Sticky Nav Bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--card)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 34 34" fill="none"><rect width="34" height="34" rx="6" fill="white"/><rect x="6.5" y="6.5" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 6.5H20.7C21.5 6.5 22.2 7.2 22.2 8V13.6H15V6.5Z" fill="black"/><path d="M23.4 6.5H26C29.2 6.5 31.2 8.5 31.2 11.7V13.6H23.4V6.5Z" fill="black"/><rect x="6.5" y="15" width="7.1" height="7.1" fill="black"/><rect x="15" y="15" width="7.1" height="7.1" fill="black"/><path d="M23.4 15H31.2V16.9C31.2 20.1 29.2 22.1 26 22.1H23.4V15Z" fill="black"/><rect x="6.5" y="23.4" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 23.4H20.7C21.5 23.4 22.2 24.1 22.2 24.9V29.2C22.2 30 21.5 30.7 20.7 30.7H15V23.4Z" fill="black"/></svg>
            </div>
            <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: '-0.3px', color: 'var(--text)' }}>OgaPay</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setBookmarked(b => !b)} style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </button>
          <button onClick={() => setShowShare(true)} style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>

      {/* Main Content - same as working version */}
      <div style={{ maxWidth: 768, margin: '0 auto', padding: '20px 16px 120px' }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900 }}>
              {job.poster?.username?.slice(0, 2).toUpperCase() || 'OP'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{job.title}</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text2)' }}>by {job.poster?.username || 'OgaPay'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: `rgba(${BRAND_RGB},0.15)`, color: BRAND, fontSize: 12, fontWeight: 700 }}>{job.category || 'General'}</span>
            <span style={{ padding: '4px 12px', borderRadius: 999, background: 'var(--bg2)', color: 'var(--text3)', fontSize: 12, fontWeight: 700 }}>Reward: {job.currency || 'NGN'} {Number(job.reward || 0).toLocaleString()}</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 20px' }}>{job.description || job.instructions || 'No description provided.'}</p>
          <button onClick={() => navigate(`/tasks/${id}/submit`)} style={{ height: 44, padding: '0 24px', borderRadius: 999, background: BRAND, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Apply Now
          </button>
        </div>
      </div>

      {/* Share Panel */}
      {showShare && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowShare(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 380, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px 24px 0 0', padding: 20 }}>
            <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 12px', fontSize: 14 }}>Share this Job</p>
            <input readOnly value={`https://ogapay.vercel.app/tasks/${id}`} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 11, fontFamily: 'monospace', marginBottom: 12 }} />
            <button onClick={() => { navigator.clipboard?.writeText(`https://ogapay.vercel.app/tasks/${id}`); setShowShare(false) }} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: BRAND, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Copy Link</button>
          </div>
        </div>
      )}
    </Layout>
  )
}
