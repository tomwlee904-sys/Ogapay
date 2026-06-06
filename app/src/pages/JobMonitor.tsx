import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

/* ─── Helpers ─── */
const CATEGORIES: Record<string, string> = {
  SOCIAL_MEDIA: 'Social', SURVEY: 'Research', CONTENT: 'Content',
  DESIGN: 'Design', TESTING: 'Testing', DATA: 'Data', VIDEO: 'Video', OTHER: 'Other',
}

const DIFF_COLORS: Record<string, string> = {
  Easy: '#16a34a', Medium: '#F59E0B', Hard: '#DC2626', Expert: '#DC2626',
}

function mapTask(t: any) {
  const cat = CATEGORIES[t.category] || 'Other'
  const diff = t.estimatedTime ? (t.estimatedTime <= 10 ? 'Easy' : t.estimatedTime <= 30 ? 'Medium' : t.estimatedTime <= 60 ? 'Hard' : 'Expert') : 'Easy'
  return {
    id: t.id, title: t.title, description: t.description, instructions: t.instructions || '',
    creator: t.poster?.username || 'OgaPay',
    creatorLabel: t.poster?.posterProfile?.isVerified ? 'Verified' : 'User',
    platform: t.tags?.[0] || 'Web', category: cat, difficulty: diff,
    reward: Number(t.reward), currency: t.currency || 'NGN',
    slots: t.maxWorkers || 1, filled: t.currentWorkers || 0,
    timeEstimate: t.estimatedTime ? t.estimatedTime + ' min' : '—',
    proofRequired: !!t.proofRequired, color: DIFF_COLORS[diff] || '#16a34a',
    featured: t.poster?.posterProfile?.isVerified || false,
    createdAt: t.createdAt,
  }
}

/* ─── Toast Notification ─── */
function JobToast({ job, alerts, onView, onDismiss }: { job: any; alerts: boolean; onView: () => void; onDismiss: () => void }) {
  if (!alerts || !job) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, maxWidth: 380, width: '100%', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1F8CFF18', color: '#1F8CFF', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0 }}>
          <i className="ti ti-bell-ringing" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>New task available</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>₦{Number(job.reward || 0).toLocaleString()} · {job.category || 'General'}</div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1 }}>
          <i className="ti ti-x" />
        </button>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
        <button onClick={onView} style={{ flex: 1, padding: '9px 0', background: 'none', border: 'none', color: '#1F8CFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRight: '1px solid var(--border)' }}>View Job</button>
        <button onClick={onDismiss} style={{ flex: 1, padding: '9px 0', background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Dismiss</button>
      </div>
    </div>
  )
}

/* ─── Job Monitor Page ─── */
export default function JobMonitor() {
  const navigate = useNavigate()
  const [allJobs, setAllJobs] = useState<any[]>([])
  const [latestJob, setLatestJob] = useState<any>(null)
  const [showToast, setShowToast] = useState(false)
  const [loading, setLoading] = useState(true)

  // Alert preferences
  const [alerts, setAlerts] = useState(() => {
    try { return localStorage.getItem('ogapay_jm_alerts') === 'true' } catch { return true }
  })
  const [sound, setSound] = useState(() => {
    try { return localStorage.getItem('ogapay_jm_sound') === 'true' } catch { return true }
  })
  const [notifCount, setNotifCount] = useState(0)

  // Applied & bookmarked
  const [appliedJobs, setAppliedJobs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ogapay_applied_jobs') || '[]') } catch { return [] }
  })
  const [bookmarked, setBookmarked] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ogapay_bookmarked_jobs') || '[]') } catch { return [] }
  })

  const pollingRef = useRef<any>(null)
  const lastIdRef = useRef<string>('')

  const saveAlerts = (v: boolean) => {
    setAlerts(v)
    localStorage.setItem('ogapay_jm_alerts', String(v))
  }
  const saveSound = (v: boolean) => {
    setSound(v)
    localStorage.setItem('ogapay_jm_sound', String(v))
  }

  // Fetch jobs + latest
  const fetchJobs = useCallback(async () => {
    try {
      const token = localStorage.getItem('ogapay_access_token')
      const res = await fetch(API_BASE + '/tasks?limit=50', {
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      })
      const json = await res.json()
      if (json.success && json.data) {
        const mapped = (json.data.tasks || json.data).map(mapTask)
        setAllJobs(mapped)
        const sorted = [...mapped].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        const latest = sorted[0]
        if (latest && latest.id !== lastIdRef.current) {
          lastIdRef.current = latest.id
          setLatestJob(latest)
          if (alerts) {
            setShowToast(true)
            setNotifCount(c => c + 1)
            if (sound) {
              try {
                const ctx = new AudioContext()
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.frequency.value = 800
                gain.gain.value = 0.15
                osc.start()
                osc.stop(ctx.currentTime + 0.15)
              } catch {}
            }
          }
        }
      }
    } catch {}
    setLoading(false)
  }, [alerts, sound])

  // Initial load + polling
  useEffect(() => {
    fetchJobs()
    pollingRef.current = setInterval(fetchJobs, 30000)
    return () => clearInterval(pollingRef.current)
  }, [fetchJobs])

  // Auto-hide toast
  useEffect(() => {
    if (showToast) {
      const t = setTimeout(() => setShowToast(false), 10000)
      return () => clearTimeout(t)
    }
  }, [showToast])

  const toggleBookmark = (jobId: string) => {
    const updated = bookmarked.includes(jobId)
      ? bookmarked.filter(id => id !== jobId)
      : [...bookmarked, jobId]
    setBookmarked(updated)
    localStorage.setItem('ogapay_bookmarked_jobs', JSON.stringify(updated))
  }

  const applyJob = async (job: any) => {
    if (appliedJobs.includes(job.id)) return
    try {
      const token = localStorage.getItem('ogapay_access_token')
      if (!token) { navigate('/login'); return }
      const res = await fetch(API_BASE + '/tasks/' + job.id + '/apply', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (json.success) {
        const updated = [...appliedJobs, job.id]
        setAppliedJobs(updated)
        localStorage.setItem('ogapay_applied_jobs', JSON.stringify(updated))
      }
    } catch {}
  }

  const activeJobs = allJobs.filter((j: any) => j.slots > j.filled)
  const appliedList = allJobs.filter((j: any) => appliedJobs.includes(j.id))
  const savedList = allJobs.filter((j: any) => bookmarked.includes(j.id))

  /* ── Render ── */
  return (
    <Layout>
      <style>{`
        .jm-container{max-width:1100px;margin:0 auto;padding:0 0 50px}
        .jm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px;flex-wrap:wrap}
        .jm-head h1{font-size:24px;font-weight:900;margin:0;color:var(--text);letter-spacing:-.03em}
        .jm-head p{font-size:13px;color:var(--text2);margin:4px 0 0}
        .jm-prefs{display:flex;gap:10px;flex-shrink:0}
        .jm-pref-btn{display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--card);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;color:var(--text2);transition:all .15s;font-family:inherit}
        .jm-pref-btn:hover{border-color:var(--text3)}
        .jm-pref-btn.active{color:var(--text);border-color:#1F8CFF;background:#1F8CFF0a}
        .jm-pref-btn .toggle-dot{width:18px;height:18px;border-radius:50%;border:2px solid var(--border3);display:grid;place-items:center;transition:all .2s}
        .jm-pref-btn.active .toggle-dot{border-color:#1F8CFF;background:#1F8CFF}
        .jm-pref-btn.active .toggle-dot:after{content:'';width:8px;height:8px;border-radius:50%;background:#fff}
        .jm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .jm-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 18px}
        .jm-stat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
        .jm-stat-icon{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;font-size:14px}
        .jm-stat-count{font-size:22px;font-weight:900;color:var(--text)}
        .jm-stat-label{font-size:11px;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
        .jm-latest{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:24px;cursor:pointer;transition:all .2s}
        .jm-latest:hover{border-color:#1F8CFF40;transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,0.04)}
        .jm-latest-head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em}
        .jm-latest-body{display:flex;gap:16px;padding:16px 18px;flex-wrap:wrap}
        .jm-latest-info{flex:1;min-width:200px}
        .jm-latest-info h2{font-size:16px;font-weight:700;margin:0 0 4px;color:var(--text)}
        .jm-latest-info p{font-size:12px;color:var(--text2);margin:0 0 8px;line-height:1.5}
        .jm-latest-meta{display:flex;gap:12px;flex-wrap:wrap}
        .jm-latest-meta span{font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px}
        .jm-latest-action{display:flex;flex-direction:column;gap:8px;align-items:flex-end;justify-content:center}
        .jm-section-title{font-size:15px;font-weight:700;color:var(--text);margin:0 0 12px;display:flex;align-items:center;gap:8px}
        .jm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:24px}
        .jm-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;cursor:pointer;transition:all .2s}
        .jm-card:hover{border-color:var(--border2);transform:translateY(-1px)}
        .jm-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px}
        .jm-card-title{font-size:13px;font-weight:700;color:var(--text);flex:1;line-height:1.3}
        .jm-card-badge{font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;flex-shrink:0;margin-top:2px}
        .jm-card-desc{font-size:11px;color:var(--text2);margin:0 0 8px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .jm-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid var(--border)}
        .jm-card-actions{display:flex;gap:6px}
        .jm-card-actions button{background:none;border:1px solid var(--border);border-radius:8px;padding:5px 8px;cursor:pointer;color:var(--text3);font-size:12px;transition:all .15s;display:flex;align-items:center;gap:4px}
        .jm-card-actions button:hover{color:var(--text);border-color:var(--text3)}
        .jm-card-actions button.applied{color:#16a34a;border-color:#16a34a40;background:#16a34a0a}
        .jm-card-actions button.saved{color:#1F8CFF;border-color:#1F8CFF40;background:#1F8CFF0a}
        .jm-empty{text-align:center;padding:40px 20px;color:var(--text3)}
        .jm-empty i{font-size:36px;opacity:.3;margin-bottom:10px;display:block}
        .jm-empty p{font-size:13px;margin:0}
        .jm-notif-badge{position:relative}
        .jm-notif-badge:after{content:attr(data-count);position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#DC2626;color:#fff;font-size:9px;font-weight:800;display:grid;place-items:center}
        @media(max-width:640px){.jm-stats{grid-template-columns:repeat(2,1fr)}.jm-head{flex-direction:column}}
      `}</style>

      <div className="jm-container">
        {/* Header */}
        <div className="jm-head">
          <div>
            <h1>Job Monitor</h1>
            <p>Track new tasks and manage your applications</p>
          </div>
          <div className="jm-prefs">
            <button className={"jm-pref-btn" + (alerts ? " active" : "")} onClick={() => saveAlerts(!alerts)}>
              <i className="ti ti-bell-ringing" />
              Alerts
              <span className="toggle-dot" />
            </button>
            <button className={"jm-pref-btn" + (sound ? " active" : "")} onClick={() => saveSound(!sound)}>
              <i className="ti ti-volume" />
              Sound
              <span className="toggle-dot" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="jm-stats">
          <div className="jm-stat">
            <div className="jm-stat-top">
              <div className="jm-stat-icon" style={{ background: '#1F8CFF12', color: '#1F8CFF' }}><i className="ti ti-briefcase" /></div>
            </div>
            <div className="jm-stat-count">{allJobs.length}</div>
            <div className="jm-stat-label">Total Jobs</div>
          </div>
          <div className="jm-stat">
            <div className="jm-stat-top">
              <div className="jm-stat-icon" style={{ background: '#16a34a12', color: '#16a34a' }}><i className="ti ti-clock" /></div>
            </div>
            <div className="jm-stat-count">{activeJobs.length}</div>
            <div className="jm-stat-label">Active</div>
          </div>
          <div className="jm-stat">
            <div className="jm-stat-top">
              <div className="jm-stat-icon" style={{ background: '#F59E0B12', color: '#F59E0B' }}><i className="ti ti-send" /></div>
            </div>
            <div className="jm-stat-count">{appliedList.length}</div>
            <div className="jm-stat-label">Applied</div>
          </div>
          <div className="jm-stat">
            <div className="jm-stat-top">
              <div className="jm-stat-icon" style={{ background: '#8B5CF612', color: '#8B5CF6' }}><i className="ti ti-bookmark" /></div>
            </div>
            <div className="jm-stat-count">{savedList.length}</div>
            <div className="jm-stat-label">Saved</div>
          </div>
        </div>

        {/* Latest Job */}
        {latestJob && (
          <div className="jm-latest" onClick={() => navigate('/tasks/' + latestJob.id)}>
            <div className="jm-latest-head">
              <i className="ti ti-sparkles" style={{ color: '#1F8CFF' }} /> Latest Task
            </div>
            <div className="jm-latest-body">
              <div className="jm-latest-info">
                <h2>{latestJob.title}</h2>
                <p>{latestJob.description || 'No description provided.'}</p>
                <div className="jm-latest-meta">
                  <span><i className="ti ti-coin" /> ₦{Number(latestJob.reward || 0).toLocaleString()}</span>
                  <span><i className="ti ti-tag" /> {latestJob.category || 'General'}</span>
                  <span><i className="ti ti-clock" /> {latestJob.timeEstimate}</span>
                  <span><i className="ti ti-users" /> {latestJob.slots - latestJob.filled} slots left</span>
                </div>
              </div>
              <div className="jm-latest-action">
                <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, background: '#16a34a0a', padding: '3px 8px', borderRadius: 20 }}>● New</span>
              </div>
            </div>
          </div>
        )}

        {/* Active Jobs */}
        <h3 className="jm-section-title"><i className="ti ti-briefcase" /> Available Jobs</h3>
        {loading ? (
          <div className="jm-empty"><p>Loading jobs...</p></div>
        ) : allJobs.length === 0 ? (
          <div className="jm-empty">
            <i className="ti ti-briefcase-off" />
            <p>No jobs available right now. Check back later.</p>
          </div>
        ) : (
          <div className="jm-grid">
            {allJobs.map((job: any) => {
              const isApplied = appliedJobs.includes(job.id)
              const isSaved = bookmarked.includes(job.id)
              return (
                <div key={job.id} className="jm-card" onClick={() => navigate('/tasks/' + job.id)}>
                  <div className="jm-card-top">
                    <div className="jm-card-title">{job.title}</div>
                    <span className="jm-card-badge" style={{ background: job.color + '18', color: job.color }}>{job.difficulty}</span>
                  </div>
                  <div className="jm-card-desc">{job.description || ''}</div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text3)', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span>₦{Number(job.reward || 0).toLocaleString()}</span>
                    <span>{job.category}</span>
                    <span>{job.timeEstimate}</span>
                  </div>
                  <div className="jm-card-footer">
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{job.creator}</div>
                    <div className="jm-card-actions" onClick={e => e.stopPropagation()}>
                      <button className={isApplied ? 'applied' : ''} onClick={() => navigate('/tasks/' + job.id)}>
                        <i className={`ti ${isApplied ? 'ti-check' : 'ti-send'}`} /> {isApplied ? 'Applied' : 'Apply'}
                      </button>
                      <button className={isSaved ? 'saved' : ''} onClick={() => toggleBookmark(job.id)}>
                        <i className={`ti ${isSaved ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Applied Jobs Section */}
        {appliedList.length > 0 && (
          <>
            <h3 className="jm-section-title"><i className="ti ti-send" /> Applied ({appliedList.length})</h3>
            <div className="jm-grid">
              {appliedList.map((job: any) => (
                <div key={job.id} className="jm-card" onClick={() => navigate('/tasks/' + job.id)}>
                  <div className="jm-card-top">
                    <div className="jm-card-title">{job.title}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', background: '#16a34a0a', padding: '2px 8px', borderRadius: 20 }}>
                      <i className="ti ti-check" /> Applied
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    <span>₦{Number(job.reward || 0).toLocaleString()}</span>
                    <span>{job.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Saved Jobs Section */}
        {savedList.length > 0 && (
          <>
            <h3 className="jm-section-title"><i className="ti ti-bookmark" /> Saved ({savedList.length})</h3>
            <div className="jm-grid">
              {savedList.map((job: any) => (
                <div key={job.id} className="jm-card" onClick={() => navigate('/tasks/' + job.id)}>
                  <div className="jm-card-top">
                    <div className="jm-card-title">{job.title}</div>
                    <button onClick={e => { e.stopPropagation(); toggleBookmark(job.id) }} style={{ background: 'none', border: 'none', color: '#1F8CFF', cursor: 'pointer', fontSize: 14 }}>
                      <i className="ti ti-bookmark-filled" />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    <span>₦{Number(job.reward || 0).toLocaleString()}</span>
                    <span>{job.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Toast Notification */}
      <JobToast job={latestJob} alerts={alerts} onView={() => { setShowToast(false); navigate('/tasks/' + (latestJob?.id || '')) }} onDismiss={() => setShowToast(false)} />
    </Layout>
  )
}
