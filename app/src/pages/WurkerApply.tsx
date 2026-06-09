// @ts-nocheck
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'

const Icon = ({ n, s = 18, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
)

export default function WurkerApply() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ skills: '', experience: '', availability: 'part-time', portfolio: '', whyYou: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await apiRequest('/wurker/apply', {
        method: 'POST',
        body: { skills: form.skills, experience: form.experience, availability: form.availability, portfolio: form.portfolio, whyYou: form.whyYou }
      })
      setSubmitted(true)
    } catch (e) {
      const el = document.getElementById('appToast')
      if (el) { el.textContent = e?.message || 'Submission failed'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <Layout>
        <div style={{maxWidth:600,margin:'40px auto',textAlign:'center',padding:'0 20px'}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:'#16a34a18',display:'grid',placeItems:'center',margin:'0 auto 20px'}}>
            <i className="ti ti-circle-check" style={{fontSize:36,color:'#16a34a'}} />
          </div>
          <h1 style={{fontFamily:'Outfit',fontSize:24,fontWeight:800,margin:'0 0 8px'}}>Application Submitted!</h1>
          <p style={{color:'var(--text2)',fontSize:14,margin:'0 0 24px',lineHeight:1.6}}>
            Thanks for applying to become a Wurker on OgaPay. Our team will review your application and get back to you within 48 hours.
          </p>
          <button className="dash-btn" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
          <style>{`.dash-btn{display:inline-flex;align-items:center;gap:7px;height:42px;padding:0 24px;border-radius:10px;font-size:14px;font-weight:700;border:none;cursor:pointer;background:var(--text);color:var(--bg);font-family:inherit}`}</style>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <style>{`
        .wa-page{max-width:640px;margin:0 auto;padding:0 0 60px}
        .wa-progress{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:32px}
        .wa-step{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:800;border:2px solid var(--border);color:var(--text3);background:var(--card)}
        .wa-step.active{border-color:var(--accent);background:var(--accent);color:#fff}
        .wa-step.done{border-color:#16a34a;background:#16a34a;color:#fff}
        .wa-line{width:40px;height:2px;background:var(--border)}
        .wa-line.done{background:#16a34a}
        .wa-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:28px 30px}
        .wa-card h2{font-family:Outfit;font-size:20px;font-weight:800;margin:0 0 4px}
        .wa-card .sub{color:var(--text2);font-size:13px;margin:0 0 20px}
        .wa-label{font-size:12px;font-weight:700;color:var(--text2);display:block;margin-bottom:6px}
        .wa-input{width:100%;height:44px;padding:0 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg2);color:var(--text);font-size:13px;outline:none;font-family:inherit;margin-bottom:16px}
        .wa-input:focus{border-color:var(--accent)}
        .wa-textarea{width:100%;min-height:100px;padding:12px 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg2);color:var(--text);font-size:13px;outline:none;font-family:inherit;resize:vertical;margin-bottom:16px}
        .wa-textarea:focus{border-color:var(--accent)}
        .wa-select{width:100%;height:44px;padding:0 14px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg2);color:var(--text);font-size:13px;outline:none;font-family:inherit;margin-bottom:16px;cursor:pointer}
        .wa-btns{display:flex;gap:10px;margin-top:8px}
        .wa-btn{height:44px;padding:0 24px;border-radius:10px;font-size:14px;font-weight:700;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit}
        .wa-btn.primary{background:var(--text);color:var(--bg)}
        .wa-btn.primary:hover{opacity:.9}
        .wa-btn.outline{background:transparent;border:1.5px solid var(--border);color:var(--text2)}
        .wa-btn.outline:hover{border-color:var(--text2);color:var(--text)}
      `}</style>

      <div className="wa-page">
        <div className="wa-progress">
          {[1,2,3].map(s => (
            <span key={s}>
              <div className={`wa-step ${step === s ? 'active' : step > s ? 'done' : ''}`}>
                {step > s ? <i className="ti ti-check" style={{fontSize:12}} /> : s}
              </div>
              {s < 3 && <span className={`wa-line ${step > s ? 'done' : ''}`} />}
            </span>
          ))}
        </div>

        <div className="wa-card">
          {step === 1 && (
            <>
              <h2>Skills & Experience</h2>
              <p className="sub">Tell us about your skills and work experience.</p>
              <label className="wa-label">Your Skills</label>
              <input className="wa-input" value={form.skills} onChange={update('skills')} placeholder="e.g. Content Writing, Graphic Design, Data Entry" />
              <label className="wa-label">Years of Experience</label>
              <select className="wa-select" value={form.experience} onChange={update('experience')}>
                <option value="">Select experience level</option>
                <option value="beginner">Beginner (0-1 year)</option>
                <option value="intermediate">Intermediate (1-3 years)</option>
                <option value="advanced">Advanced (3-5 years)</option>
                <option value="expert">Expert (5+ years)</option>
              </select>
              <label className="wa-label">Portfolio Link (optional)</label>
              <input className="wa-input" value={form.portfolio} onChange={update('portfolio')} placeholder="https://your-portfolio.com" />
              <div className="wa-btns" style={{justifyContent:'flex-end'}}>
                <button className="wa-btn primary" onClick={() => setStep(2)}>Next <i className="ti ti-arrow-right" /></button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Availability & Motivation</h2>
              <p className="sub">Let us know your availability and why you want to join.</p>
              <label className="wa-label">Availability</label>
              <select className="wa-select" value={form.availability} onChange={update('availability')}>
                <option value="full-time">Full-time (40+ hrs/week)</option>
                <option value="part-time">Part-time (20-40 hrs/week)</option>
                <option value="weekend">Weekends only</option>
                <option value="flexible">Flexible</option>
              </select>
              <label className="wa-label">Why do you want to join OgaPay?</label>
              <textarea className="wa-textarea" value={form.whyYou} onChange={update('whyYou')} placeholder="Tell us why you'd be a great Wurker..." />
              <div className="wa-btns" style={{justifyContent:'space-between'}}>
                <button className="wa-btn outline" onClick={() => setStep(1)}><i className="ti ti-arrow-left" /> Back</button>
                <button className="wa-btn primary" onClick={() => setStep(3)}>Next <i className="ti ti-arrow-right" /></button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Review & Submit</h2>
              <p className="sub">Please review your application before submitting.</p>
              <div style={{background:'var(--bg2)',borderRadius:10,padding:16,marginBottom:20}}>
                {[
                  { label: 'Skills', val: form.skills },
                  { label: 'Experience', val: form.experience },
                  { label: 'Portfolio', val: form.portfolio || 'Not provided' },
                  { label: 'Availability', val: form.availability },
                  { label: 'Why you', val: form.whyYou || 'Not provided' },
                ].map((r,i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<4?'1px dashed var(--border)':'none',fontSize:13}}>
                    <span style={{color:'var(--text2)',fontWeight:600}}>{r.label}</span>
                    <span style={{fontWeight:700,textAlign:'right',maxWidth:'55%'}}>{r.val}</span>
                  </div>
                ))}
              </div>
              <div className="wa-btns" style={{justifyContent:'space-between'}}>
                <button className="wa-btn outline" onClick={() => setStep(2)}><i className="ti ti-arrow-left" /> Back</button>
                <button className="wa-btn primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} /> Submitting...</> : <><Icon n="send" s={16} /> Submit Application</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
