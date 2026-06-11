import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

const C = {
  text: 'var(--text)', text2: 'var(--text2)', text3: 'var(--text3)',
  card: 'var(--card)', border: 'var(--border)', bg: 'var(--bg)', bg2: 'var(--bg2)', accent: '#191C6B',
}

const JOB_TYPE_COLORS = {
  'Full-Time': '#191C6B', 'Part-Time': '#f59e0b', 'Contract': '#16a34a',
  'Internship': '#06b6d4', 'Remote': '#8b5cf6',
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('job_listings')
          .select('*')
          .eq('id', id)
          .single()
        if (fetchError) throw fetchError
        setJob(data)
      } catch (err) {
        setError(err.message || 'Job not found')
      }
      setLoading(false)
    })()
  }, [id])

  const isOwner = authUser?.id && job?.employer_id === authUser.id

  const handleToggleStatus = async () => {
    if (!job || !isOwner) return
    const newStatus = job.status === 'active' ? 'closed' : 'active'
    setClosing(true)
    try {
      const { error: updateError } = await supabase
        .from('job_listings')
        .update({ status: newStatus })
        .eq('id', job.id)
      if (updateError) throw updateError
      setJob(prev => ({ ...prev, status: newStatus }))
    } catch {}
    setClosing(false)
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 20px', textAlign: 'center', color: C.text3 }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24, display: 'block', marginBottom: 8 }} />
          Loading...
        </div>
      </Layout>
    )
  }

  if (error || !job) {
    return (
      <Layout>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
          <i className="ti ti-briefcase-off" style={{ fontSize: 48, color: C.text3, display: 'block', marginBottom: 12 }} />
          <p style={{ color: C.text2, fontSize: 14 }}>{error || 'This job listing could not be found.'}</p>
          <button onClick={() => navigate('/jobs')}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 10, background: C.accent, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Browse Jobs
          </button>
        </div>
      </Layout>
    )
  }

  const deadlineDate = job.application_deadline ? new Date(job.application_deadline) : null
  const isExpired = deadlineDate && deadlineDate < new Date()

  return (
    <Layout>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 60px' }}>
        <button onClick={() => navigate('/jobs')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, color: C.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', padding: 0, fontFamily: 'inherit' }}>
          <i className="ti ti-arrow-left" /> Back to Jobs
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          {job.company_logo_url ? (
            <img src={job.company_logo_url} alt="" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'contain', background: C.bg2, border: '1px solid ' + C.border }} />
          ) : (
            <div style={{ width: 60, height: 60, borderRadius: 12, background: C.accent, display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 900, color: '#fff' }}>
              {job.company_name?.slice(0, 2).toUpperCase() || '?'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 900, margin: 0 }}>{job.job_title}</h1>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: (JOB_TYPE_COLORS[job.job_type] || C.accent) + '18', color: JOB_TYPE_COLORS[job.job_type] || C.accent }}>{job.job_type}</span>
              {job.status !== 'active' && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>{job.status.toUpperCase()}</span>
              )}
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text2, margin: 0 }}>{job.company_name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 13, color: C.text3, flexWrap: 'wrap' }}>
              {job.location && <span><i className="ti ti-map-pin" style={{ marginRight: 4 }} />{job.location}</span>}
              {job.salary_range && <span><i className="ti ti-currency-naira" style={{ marginRight: 4 }} />{job.salary_range}</span>}
              {deadlineDate && <span><i className="ti ti-calendar" style={{ marginRight: 4 }} />{isExpired ? 'Expired' : formatDate(job.application_deadline)}</span>}
            </div>
          </div>
        </div>

        {/* Owner controls */}
        {isOwner && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button onClick={handleToggleStatus} disabled={closing}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid ' + C.border, background: C.card, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {closing ? '...' : job.status === 'active' ? 'Close Listing' : 'Reopen Listing'}
            </button>
          </div>
        )}

        {/* Description */}
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Job Description</div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{job.job_description}</div>
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Requirements</div>
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{job.requirements}</div>
          </div>
        )}

        {/* Apply */}
        <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>How to Apply</div>
          {job.application_link ? (
            <a href={job.application_link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, background: C.accent, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit' }}>
              <i className="ti ti-external-link" /> Apply on External Site
            </a>
          ) : (
            <p style={{ fontSize: 13, color: C.text3, margin: 0 }}>
              No application link provided. Contact the employer through OgaPay for more information.
            </p>
          )}
        </div>
      </div>
    </Layout>
  )
}
