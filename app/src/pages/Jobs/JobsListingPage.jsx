import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

const C = {
  text: 'var(--text)', text2: 'var(--text2)', text3: 'var(--text3)',
  card: 'var(--card)', border: 'var(--border)', bg: 'var(--bg)', bg2: 'var(--bg2)', accent: 'var(--accent)',
}

export default function JobsListingPage() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  useEffect(() => {
    ;(async () => {
      try {
        let query = supabase
          .from('job_listings')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        const { data, error } = await query
        if (!error && data) setJobs(data)
      } catch {}
      setLoading(false)
    })()
  }, [])

  const jobTypes = ['All', 'Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote']

  const filtered = jobs.filter(job => {
    if (typeFilter !== 'All' && job.job_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return job.job_title?.toLowerCase().includes(q) ||
             job.company_name?.toLowerCase().includes(q) ||
             job.location?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <Layout>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 60px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Jobs & Hiring</h1>
            <p style={{ color: C.text3, fontSize: 13, margin: 0 }}>Find your next opportunity</p>
          </div>
          {authUser?.id && (
            <button onClick={() => navigate('/post-job')}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: C.accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
              <i className="ti ti-plus" /> Post a Job
            </button>
          )}
        </div>

        {/* Search + Filter */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.text3 }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs, companies, locations..."
              style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1.5px solid ' + C.border, borderRadius: 10, background: C.bg, color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {jobTypes.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{
                padding: '6px 14px', borderRadius: 99, border: '1px solid ' + C.border,
                background: typeFilter === t ? C.accent : 'transparent',
                color: typeFilter === t ? '#fff' : C.text2,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all .15s',
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: C.text3 }}>
            <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24, display: 'block', marginBottom: 8 }} />
            Loading jobs...
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <i className="ti ti-briefcase-off" style={{ fontSize: 48, color: C.text3, display: 'block', marginBottom: 12 }} />
            <p style={{ color: C.text2, fontSize: 14, marginBottom: 4 }}>{search || typeFilter !== 'All' ? 'No jobs match your filters.' : 'No job listings yet.'}</p>
            <p style={{ color: C.text3, fontSize: 12, marginBottom: 20 }}>Be the first to post a job on OgaPay.</p>
            {authUser?.id && (
              <button onClick={() => navigate('/post-job')}
                style={{ padding: '10px 24px', borderRadius: 10, background: C.accent, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Post a Job
              </button>
            )}
          </div>
        )}

        {/* Job grid */}
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {filtered.map(job => (
              <div key={job.id} onClick={() => navigate('/jobs/' + job.id)}
                style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all .2s', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {/* Company + Title */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {job.company_logo_url ? (
                      <img src={job.company_logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', background: C.bg2 }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: C.accent, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                        {job.company_name?.slice(0, 2).toUpperCase() || '?'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.job_title}</div>
                      <div style={{ fontSize: 12, color: C.text2 }}>{job.company_name}</div>
                    </div>
                  </div>
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--accent)18', color: 'var(--accent)' }}>{job.job_type}</span>
                    {job.location && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: C.bg2, color: C.text3 }}>{job.location}</span>}
                    {job.salary_range && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: C.bg2, color: C.text3 }}>{job.salary_range}</span>}
                  </div>
                  {/* Description */}
                  <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.5, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {job.job_description}
                  </p>
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid ' + C.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: C.text3 }}>
                    {job.application_deadline ? 'Due ' + new Date(job.application_deadline).toLocaleDateString() : 'No deadline'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>View & Apply →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
