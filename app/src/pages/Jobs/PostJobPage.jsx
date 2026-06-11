import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { uploadImage } from '../../lib/upload'

const C = {
  text: 'var(--text)', text2: 'var(--text2)', text3: 'var(--text3)',
  card: 'var(--card)', border: 'var(--border)', bg: 'var(--bg)', bg2: 'var(--bg2)', accent: '#191C6B',
}

const JOB_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Remote']

export default function PostJobPage() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    job_title: '', company_name: '', job_type: 'Full-Time', location: '',
    salary_range: '', job_description: '', requirements: '', application_link: '',
    application_deadline: '',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.job_title.trim()) { setError('Job title is required'); return }
    if (!form.company_name.trim()) { setError('Company name is required'); return }
    if (!form.job_description.trim()) { setError('Job description is required'); return }
    if (!authUser?.id) { setError('You must be logged in'); return }

    setSubmitting(true)
    try {
      let logoUrl = null
      if (logoFile) logoUrl = await uploadImage(logoFile, 'company-logos')

      const { error: insertError } = await supabase.from('job_listings').insert({
        employer_id: authUser.id,
        job_title: form.job_title.trim(),
        company_name: form.company_name.trim(),
        company_logo_url: logoUrl,
        job_type: form.job_type,
        location: form.location.trim() || null,
        salary_range: form.salary_range.trim() || null,
        job_description: form.job_description.trim(),
        requirements: form.requirements.trim() || null,
        application_link: form.application_link.trim() || null,
        application_deadline: form.application_deadline || null,
        status: 'active',
      })
      if (insertError) throw insertError
      setSuccess(true)
      setTimeout(() => navigate('/jobs'), 2000)
    } catch (err) {
      setError(err.message || 'Failed to post job')
    }
    setSubmitting(false)
  }

  if (success) {
    return (
      <Layout>
        <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center', padding: '0 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(22,163,74,0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <i className="ti ti-check" style={{ fontSize: 28, color: '#16a34a' }} />
          </div>
          <h2 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 24, fontWeight: 900, margin: '0 0 8px' }}>Job Posted!</h2>
          <p style={{ color: C.text2, fontSize: 14, margin: '0 0 24px' }}>Your job listing is now live and visible to applicants.</p>
          <button onClick={() => navigate('/jobs')}
            style={{ padding: '12px 32px', borderRadius: 12, border: 'none', background: C.accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            View Job Listings
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 60px' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, color: C.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', padding: 0, fontFamily: 'inherit' }}>
          <i className="ti ti-arrow-left" /> Back
        </button>

        <h1 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 26, fontWeight: 900, margin: '0 0 4px' }}>Post a Job</h1>
        <p style={{ color: C.text3, fontSize: 13, margin: '0 0 28px' }}>List a job opening on OgaPay — no rewards, no submissions. Just a simple job board listing.</p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: 16 }} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>Company Logo</label>
            <div onClick={() => fileRef.current?.click()} style={{
              width: '100%', height: 120, borderRadius: 12, border: '1.5px dashed ' + C.border,
              background: C.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', position: 'relative',
            }}>
              {logoPreview ? (
                <img src={logoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center', color: C.text3 }}>
                  <i className="ti ti-upload" style={{ fontSize: 24, display: 'block', marginBottom: 4 }} />
                  <span style={{ fontSize: 12 }}>Click to upload company logo</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>Job Title <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" value={form.job_title} onChange={e => update('job_title', e.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.border, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>Company Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" value={form.company_name} onChange={e => update('company_name', e.target.value)}
              placeholder="e.g. Tech Corp Ltd"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.border, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>Job Type <span style={{ color: '#ef4444' }}>*</span></label>
              <select value={form.job_type} onChange={e => update('job_type', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.border, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}>
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>Location</label>
              <input type="text" value={form.location} onChange={e => update('location', e.target.value)}
                placeholder="e.g. Lagos, Nigeria"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.border, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>Salary Range</label>
              <input type="text" value={form.salary_range} onChange={e => update('salary_range', e.target.value)}
                placeholder="e.g. N150,000 - N250,000/month"
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.border, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>Application Deadline</label>
              <input type="date" value={form.application_deadline} onChange={e => update('application_deadline', e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.border, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>Job Description <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea value={form.job_description} onChange={e => update('job_description', e.target.value)}
              placeholder="Describe the role, responsibilities, and what the candidate will do..." rows={6}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.border, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>Requirements</label>
            <textarea value={form.requirements} onChange={e => update('requirements', e.target.value)}
              placeholder="List the skills, experience, and qualifications required..." rows={4}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.border, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text2, marginBottom: 6 }}>Application Link</label>
            <input type="url" value={form.application_link} onChange={e => update('application_link', e.target.value)}
              placeholder="https://forms.google.com/... or https://company.com/apply"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid ' + C.border, borderRadius: 10, background: C.bg, color: C.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <p style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>If you have an external application form, paste the link here.</p>
          </div>

          <button type="submit" disabled={submitting}
            style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: C.accent, color: '#fff', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {submitting ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Posting...</> : <><i className="ti ti-briefcase" /> Post Job</>}
          </button>
        </form>
      </div>
    </Layout>
  )
}
