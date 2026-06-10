import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader"
import TaskCard from '../components/TaskCard'

const API_CATEGORIES: Record<string, string> = {
  'SOCIAL_MEDIA': 'Social',
  'SURVEY': 'Research',
  'CONTENT': 'Content',
  'DESIGN': 'Design',
  'TESTING': 'Testing',
  'DATA': 'Data',
  'VIDEO': 'Video',
  'DEVELOPMENT': 'Development',
  'OTHER': 'Other',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  'Easy': '#16a34a',
  'Medium': '#F59E0B',
  'Hard': '#DC2626',
}

function mapApiTask(t: any) {
  const cat = API_CATEGORIES[t.category] || 'Other'
  const diff = t.estimatedTime ? (t.estimatedTime <= 10 ? 'Easy' : t.estimatedTime <= 30 ? 'Medium' : 'Hard') : 'Easy'
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    creator: t.poster?.username || 'OgaPay',
    creatorLabel: t.poster?.posterProfile?.isVerified ? 'Verified' : 'User',
    platform: t.tags?.[0] || 'Web',
    category: cat,
    difficulty: diff,
    reward: Number(t.reward),
    rewardCurrency: t.currency,
    usdValue: 0,
    slots: t.maxWorkers || 1,
    filled: t.currentWorkers || 0,
    timeEstimate: t.estimatedTime ? t.estimatedTime + ' min' : '—',
    verificationRequired: !!t.proofRequired,
    rankRequired: 'None',
    color: DIFFICULTY_COLORS[diff] || '#16a34a',
    featured: false,
    _raw: t,
  }
}

async function fetchTasks(category?: string) {
  try {
    let url = '/tasks'
    if (category && category !== 'All' && category !== 'Trending' && category !== 'New') {
      url += '?category=' + encodeURIComponent(category)
    }
    const data = await apiRequest<any>(url).catch(() => null)
    if (data) {
      const tasks = Array.isArray(data) ? data : (data.tasks || [])
      return tasks.map(mapApiTask)
    }
    return []
  } catch {
    const el = document.getElementById('appToast')
    if (el) { el.textContent = 'Failed to load tasks'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
    return []
  }
}

const jobFilters = ['All', 'Trending', 'New', 'Social', 'Content', 'Testing', 'Design', 'Video', 'Data', 'Research', 'Development']

const formatAddress = (name: string) => {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return initials
}

/* ─── Job Detail View ─── */
function JobDetailView({ job, onBack }: { job: any; onBack: () => void }) {
  const navigate = useNavigate()
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')
  const [applyLink, setApplyLink] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [notes, setNotes] = useState('')
  const [timeLeft, setTimeLeft] = useState('')

  // Countdown timer
  useEffect(() => {
    const deadline = new Date(Date.now() + 86400000)
    const tick = () => {
      const diff = deadline.getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(h + 'h ' + m + 'm ' + s + 's')
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [])

  const handleApply = async () => {
    if (!applyLink.trim()) { setApplyMsg('Please provide a submission link'); return }
    setApplyMsg('')
    try {
      await apiRequest('/tasks/' + job.id + '/apply', { method: 'POST' })
      await apiRequest('/tasks/' + job.id + '/submit', {
        method: 'POST',
        body: JSON.stringify({ proof: applyLink.trim(), workerNotes: notes || '' }),
      })
      
      setSubmitted(true)
      setTimeout(() => { setShowApplyModal(false); setSubmitted(false); setApplyLink(''); setApplyMsg('') }, 2000)
    } catch (err) {
      setApplyMsg(err.message)
    }
  }

  return (
    <Layout>
      <style>{/*css*/`
        .cd-page{max-width:860px;margin:0 auto;padding:0 0 50px}
        .cd-creator{display:flex;align-items:center;gap:14px;padding:18px 22px;background:var(--card);border:1px solid var(--border);border-radius:14px;margin-bottom:16px}
        .cd-creator-avatar{width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--bg2);display:grid;place-items:center;border:2px solid var(--border)}
        .cd-creator-avatar i{font-size:22px;color:var(--text3)}
        .cd-creator-info{flex:1;min-width:0}
        .cd-creator-name{font-size:16px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:8px}
        .cd-creator-handle{font-size:13px;color:var(--text2);font-weight:500}
        .cd-creator-wallet{font-family:monospace;font-size:11px;color:var(--text3);background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:3px 8px;display:inline-flex;align-items:center;gap:5px;cursor:pointer;margin-top:4px}
        .cd-creator-wallet:hover{color:var(--text)}
        .cd-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:16px}
        .cd-card-head{padding:20px 24px;border-bottom:1px solid var(--border)}
        .cd-title{font-size:22px;font-weight:800;margin:0 0 8px;color:var(--text);line-height:1.3}
        .cd-badge-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px}
        .cd-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px}
        .cd-badge.open{background:#052e16;color:#4ade80}
        .cd-badge.challenge{background:rgba(18,21,102,0.12);color:#c4b5fd}
        .cd-bounty{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:20px 24px;border-bottom:1px solid var(--border)}
        @media(max-width:600px){.cd-bounty{grid-template-columns:1fr}}
        .cd-bounty-item{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 18px}
        .cd-bounty-label{font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
        .cd-bounty-sol{font-family:"Outfit",sans-serif;font-size:24px;font-weight:900;color:var(--text)}
        .cd-bounty-sol span{color:var(--accent);font-size:16px}
        .cd-bounty-usd{font-size:12px;color:var(--text2);margin-top:2px}
        .cd-bounty-tag{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:rgba(18,21,102,0.12);color:#c4b5fd;margin-left:6px}
        .cd-deadline{display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid var(--border);background:var(--bg2)}
        .cd-deadline-icon{width:36px;height:36px;border-radius:50%;background:var(--card);border:1px solid var(--border);display:grid;place-items:center;flex-shrink:0}
        .cd-deadline-icon i{font-size:16px}
        .cd-deadline-info{flex:1}
        .cd-deadline-label{font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em}
        .cd-deadline-time{font-size:18px;font-weight:800;color:var(--text);font-family:"Outfit",sans-serif}
        .cd-deadline-time.urgent{color:#fb923c}
        .cd-detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:20px 24px;border-bottom:1px solid var(--border)}
        @media(max-width:600px){.cd-detail-grid{grid-template-columns:repeat(2,1fr)}}
        .cd-detail-label{font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
        .cd-detail-value{font-size:14px;font-weight:700;color:var(--text)}
        .cd-req-section{padding:20px 24px;border-bottom:1px solid var(--border)}
        .cd-req-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:6px}
        .cd-req-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .cd-req-item{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text2);padding:6px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:8px}
        .cd-req-item i{font-size:14px}
        .cd-desc{padding:20px 24px;border-bottom:1px solid var(--border)}
        .cd-desc-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px}
        .cd-desc-text{font-size:13px;color:var(--text2);line-height:1.7;white-space:pre-wrap}
        .cd-actions{padding:18px 24px;display:flex;gap:10px;flex-wrap:wrap}
        .cd-btn-primary{height:46px;padding:0 30px;border-radius:99px;border:none;background:#191C6B;color:#fff;font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:opacity .15s,transform .15s}
        .cd-btn-primary:hover{opacity:.9;transform:translateY(-1px)}
        .cd-btn-secondary{height:46px;padding:0 24px;border-radius:99px;border:1.5px solid var(--border);background:transparent;color:var(--text);font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:border-color .13s}
        .cd-btn-secondary:hover{border-color:var(--text)}
        .cd-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
        .cd-modal{background:var(--card);border:1px solid var(--border);border-radius:16px;max-width:480px;width:100%;max-height:90vh;overflow-y:auto}
        .cd-modal-head{padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
        .cd-modal-title{font-size:16px;font-weight:800;color:var(--text)}
        .cd-modal-close{width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer;display:grid;place-items:center}
        .cd-modal-body{padding:18px 20px}
        .cd-modal-label{font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px;display:block}
        .cd-modal-input{width:100%;height:42px;padding:0 14px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg2);color:var(--text);font-size:13px;outline:none;box-sizing:border-box;font-family:inherit}
        .cd-modal-input:focus{border-color:#191C6B}
        .cd-modal-textarea{width:100%;min-height:100px;padding:12px 14px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg2);color:var(--text);font-size:13px;outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;line-height:1.5}
        .cd-modal-textarea:focus{border-color:#191C6B}
        .cd-modal-actions{display:flex;gap:10px;margin-top:16px}
        .cd-submit-btn{height:42px;padding:0 24px;border-radius:99px;border:none;background:#191C6B;color:#fff;font-size:13px;font-weight:700;cursor:pointer;flex:1}
        .cd-submit-btn:disabled{opacity:.5;cursor:not-allowed}
        .cd-success{text-align:center;padding:32px 20px}
        .cd-success i{font-size:40px;color:#4ade80}
        .cd-success h3{font-size:18px;font-weight:800;color:var(--text);margin:12px 0 4px}
        .cd-success p{font-size:13px;color:var(--text2)}
        .cd-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--text2);cursor:pointer;border:none;background:none;padding:8px 0;margin-bottom:16px;transition:color .13s}
        .cd-back:hover{color:var(--text)}
      `}</style>
      <div className="cd-page">
        <button className="cd-back" onClick={onBack}><i className="ti ti-arrow-left" /> Back to Jobs</button>

        <div className="cd-creator">
          <div className="cd-creator-avatar"><i className="ti ti-user" /></div>
          <div className="cd-creator-info">
            <div className="cd-creator-name">
              {job.creator}
              <span style={{fontSize:11,fontWeight:600,color:'#191C6B',background:'rgba(18,21,102,0.12)',padding:'2px 8px',borderRadius:99}}>{job.creatorLabel}</span>
            </div>
            <div className="cd-creator-handle">@{job.creator.toLowerCase().replace(/\s+/g,'')}</div>
            <div className="cd-creator-wallet" onClick={() => {navigator.clipboard?.writeText('F48NUF...jemX')}}>
              F48NUF...jemX <i className="ti ti-copy" style={{fontSize:10}} />
            </div>
          </div>
          <button className="cd-btn-secondary" style={{height:34,padding:'0 14px',fontSize:11,flexShrink:0}}>
            <i className="ti ti-share" style={{fontSize:12}} /> Share
          </button>
        </div>

        <div className="cd-card">
          <div className="cd-card-head">
            <div className="cd-badge-row">
              <span className="cd-badge open"><span style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',display:'inline-block'}} /> Open</span>
              <span className="cd-badge challenge"><i className="ti ti-award" style={{fontSize:10}} /> Challenge</span>
            </div>
            <h1 className="cd-title">{job.title}</h1>
            <div style={{display:'flex',gap:10,fontSize:12,color:'var(--text2)',flexWrap:'wrap'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><i className="ti ti-tag" /> {job.category}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><i className="ti ti-device-laptop" /> {job.platform}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><i className="ti ti-clock" /> {job.timeEstimate}</span>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><i className="ti ti-shield" /> {job.difficulty}</span>
            </div>
          </div>

          <div className="cd-bounty">
            <div className="cd-bounty-item">
              <div className="cd-bounty-label">Reward per worker</div>
              <div className="cd-bounty-sol">{job.reward} <span>SOL</span></div>
              <div className="cd-bounty-usd">~ ${job.usdValue} USD</div>
            </div>
            <div className="cd-bounty-item">
              <div className="cd-bounty-label">Total bounty</div>
              <div className="cd-bounty-sol">{(job.reward * (job.slots || 1)).toFixed(3)} <span>SOL</span></div>
              <div className="cd-bounty-usd">
                ~ ${(job.usdValue * (job.slots || 1)).toFixed(2)} USD
                <span className="cd-bounty-tag"><i className="ti ti-coin" style={{fontSize:9}} /> OGA</span>
              </div>
            </div>
          </div>

          <div className="cd-deadline">
            <div className="cd-deadline-icon"><i className="ti ti-clock-hour-4" style={{color:'#fb923c'}} /></div>
            <div className="cd-deadline-info">
              <div className="cd-deadline-label">Selection deadline</div>
              <div className={timeLeft.includes('Ended') ? 'cd-deadline-time urgent' : 'cd-deadline-time'}>{timeLeft || 'Calculating...'}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="cd-bounty-label">Applicants</div>
              <div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>{job.filled}</div>
            </div>
          </div>

          <div className="cd-detail-grid">
            <div className="cd-detail-item">
              <div className="cd-detail-label">Slots</div>
              <div className="cd-detail-value">{job.filled}/{job.slots} filled</div>
            </div>
            <div className="cd-detail-item">
              <div className="cd-detail-label">Selection mode</div>
              <div className="cd-detail-value">Creator picks</div>
            </div>
            <div className="cd-detail-item">
              <div className="cd-detail-label">Difficulty</div>
              <div className="cd-detail-value">{job.difficulty}</div>
            </div>
            <div className="cd-detail-item">
              <div className="cd-detail-label">Category</div>
              <div className="cd-detail-value">{job.category}</div>
            </div>
            <div className="cd-detail-item">
              <div className="cd-detail-label">Max entries</div>
              <div className="cd-detail-value">Unlimited</div>
            </div>
            <div className="cd-detail-item">
              <div className="cd-detail-label">Rank required</div>
              <div className="cd-detail-value">{job.rankRequired || 'None'}</div>
            </div>
          </div>

          <div className="cd-req-section">
            <div className="cd-req-title"><i className="ti ti-shield-check" style={{color:'#191C6B'}} /> Requirements</div>
            <div className="cd-req-grid">
              <div className="cd-req-item"><i className="ti ti-circle-check" style={{color:job.verificationRequired?'#4ade80':'var(--text3)'}} /> Screenshot proof {job.verificationRequired ? 'required' : 'optional'}</div>
              <div className="cd-req-item"><i className="ti ti-user-check" style={{color:'var(--text3)'}} /> KYC verification optional</div>
              <div className="cd-req-item"><i className="ti ti-id" style={{color:'var(--text3)'}} /> Rank: {job.rankRequired || 'None'}</div>
              <div className="cd-req-item"><i className="ti ti-eye" style={{color:'var(--text3)'}} /> Submissions: visible to creator</div>
            </div>
          </div>

          <div className="cd-desc">
            <div className="cd-desc-title"><i className="ti ti-file-text" style={{color:'var(--text3)'}} /> Description</div>
            <div className="cd-desc-text">{job.description}</div>
          </div>

          <div className="cd-actions">
            <button className="cd-btn-primary" onClick={() => setShowApplyModal(true)}><i className="ti ti-send" /> Apply Now</button>
            <button className="cd-btn-secondary"><i className="ti ti-bookmark" /> Save</button>
            <button className="cd-btn-secondary"><i className="ti ti-flag" /> Report</button>
          </div>
        </div>
      </div>

      {showApplyModal && (
        <div className="cd-modal-overlay" onClick={() => {if(!submitted)setShowApplyModal(false)}}>
          <div className="cd-modal" onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div className="cd-success">
                <i className="ti ti-circle-check" />
                <h3>Application Submitted!</h3>
                <p>Your submission has been sent to the creator. You'll be notified when a decision is made.</p>
                <button className="cd-btn-primary" onClick={() => {setShowApplyModal(false);setSubmitted(false);setApplyLink('')}} style={{marginTop:16}}>Done</button>
              </div>
            ) : (
              <>
                <div className="cd-modal-head">
                  <span className="cd-modal-title">Apply for this task</span>
                  <button className="cd-modal-close" onClick={() => setShowApplyModal(false)}><i className="ti ti-x" /></button>
                </div>
                <div className="cd-modal-body">
                  <label className="cd-modal-label">Submission link *</label>
                  <input className="cd-modal-input" value={applyLink} onChange={e => setApplyLink(e.target.value)} placeholder="https://" style={{marginBottom:14}} />
                  <label className="cd-modal-label">Message (optional)</label>
                  <textarea className="cd-modal-textarea" value={applyMsg} onChange={e => setApplyMsg(e.target.value)} placeholder="Add a note to the creator..." />
                  {applyMsg && <div style={{fontSize:12,color:'#fb923c',marginTop:8}}><i className="ti ti-info-circle" /> Make sure your submission link is correct.</div>}
                  <div className="cd-modal-actions">
                    <button className="cd-btn-secondary" onClick={() => setShowApplyModal(false)} style={{flex:1}}>Cancel</button>
                    <button className="cd-submit-btn" onClick={handleApply} disabled={!applyLink.trim()}>Submit Application</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}

export default function Tasks() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const initialCategory = searchParams.get('category') || 'All'
  const [filter, setFilter] = useState(initialCategory)
  const [bookmarked, setBookmarked] = useState<string[]>([])
  const [selectedJob, setSelectedJob] = useState<any>(null)

  const location = useLocation()
  useEffect(() => { injectSkeletonStyles(); }, []);

  // Fetch tasks from API
  useEffect(() => {
    const load = () => {
      setLoading(true)
      fetchTasks(filter).then(data => {
        setJobs(data)
        setLoading(false)
      })
    }
    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [location.key, filter])

  // Load single job if id param present
  useEffect(() => {
    if (id) {
      // Try to find in loaded jobs first, then fetch directly
      const found = jobs.find(j => String(j.id) === String(id))
      if (found) {
        setSelectedJob(found)
      } else {
        // Fetch single task directly
        apiRequest<any>('/tasks/' + id)
          .then(data => {
            if (data) {
              setSelectedJob(mapApiTask(data))
            } else {
              setSelectedJob(null)
            }
          })
          .catch(() => setSelectedJob(null))
      }
    } else {
      setSelectedJob(null)
    }
  }, [id, jobs])

  const filtered = jobs.filter(job => {
    const matchSearch = search === '' || job.title.toLowerCase().includes(search.toLowerCase()) || job.description.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || filter === 'Trending' || filter === 'New' || job.category === filter
    return matchSearch && matchFilter
  })

  const toggleBookmark = (id: string) => {
    setBookmarked(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])
  }

  const totalRewards = jobs.reduce((sum, j) => sum + (j.reward || 0), 0)
  const totalSlots = jobs.reduce((sum, j) => sum + j.slots, 0)
  const totalFilled = jobs.reduce((sum, j) => sum + j.filled, 0)

  const [showDetail, setShowDetail] = useState(false)
  
  useEffect(() => {
    if (selectedJob) setShowDetail(true)
  }, [selectedJob])

  if (loading) {
    return (
      <Layout>
        <SkeletonPage />
      </Layout>
    );
  }

  if (showDetail && selectedJob) {
    return <JobDetailView job={selectedJob} onBack={() => { setShowDetail(false); navigate('/tasks') }} />
  }

  return (
    <Layout>
      <style>{`
        .page{max-width:100%!important;padding:0}
        .jobs-section{width:100%;max-width:1280px;margin:0 auto}
        .jobs-section .page-head{margin-bottom:1.25rem}
        .jobs-section .page-head h1{font-family:Outfit;font-size:1.75rem;font-weight:900;margin:0;letter-spacing:-.02em}
        .jobs-section .page-head p{color:var(--text2);font-size:.875rem;margin:.25rem 0 0;line-height:1.5}

        /* ── Stats Row ── */
        .jobs-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.5rem}
        .jobs-stat{background:var(--card);border:1px solid var(--border);border-radius:.75rem;padding:1rem 1.125rem;text-align:center;transition:all .2s}
        .jobs-stat:hover{box-shadow:var(--shadow-md);transform:translateY(-1px)}
        .jobs-stat .stat-val{font-family:Outfit;font-size:1.35rem;font-weight:900;letter-spacing:-.02em;line-height:1.2}
        .jobs-stat .stat-val.green{color:var(--green)}
        .jobs-stat .stat-val.accent{color:#191C6B}
        .jobs-stat .stat-val.gold{color:var(--gold)}
        .jobs-stat .stat-lbl{font-size:.68rem;color:var(--text2);margin-top:.15rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em}

        /* ── Filter Controls ── */
        .filter-controls{display:flex;align-items:center;gap:.75rem;margin-bottom:1.75rem;flex-wrap:wrap}
        .filter-toggle{display:flex;background:var(--bg2);border-radius:.625rem;padding:3px;border:1px solid var(--border);overflow-x:auto;flex-shrink:0}
        .filter-tab{padding:.5rem 1rem;border:0;border-radius:.5rem;background:transparent;color:var(--text2);font-size:.8125rem;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
        .filter-tab:hover{color:var(--text);background:var(--card)}
        .filter-tab.active{background:var(--card);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.06)}
        .filter-tab.active:after{content:'';display:block;height:2px;width:20px;background:#191C6B;border-radius:999px;margin:2px auto 0}
        .search-wrap{flex:1;min-width:180px;position:relative}
        .search-wrap input{width:100%;height:38px;padding:0 14px 0 38px;border:1.5px solid var(--border);border-radius:.625rem;background:var(--card);color:var(--text);font-size:.8125rem;outline:none;transition:border-color .2s}
        .search-wrap input:focus{border-color:#191C6B}
        .search-wrap input::placeholder{color:var(--text3)}
        .search-wrap .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:16px;pointer-events:none}

        .btn-create{display:inline-flex;align-items:center;gap:.5rem;padding:.625rem 1.125rem;background:linear-gradient(135deg,#191C6B,#191C6B);color:#fff;border:0;border-radius:.625rem;font-size:.8125rem;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap;box-shadow:0 4px 14px rgba(31,140,255,.25)}
        .btn-create:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(31,140,255,.3)}

        /* ── Jobs Grid ── */
        .jobs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:1.25rem}

        .job-card{background:var(--card);border:1px solid var(--border);border-radius:.875rem;overflow:hidden;transition:all .25s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;position:relative}
        .job-card:hover{transform:translateY(-3px);box-shadow:0 8px 30px rgba(0,0,0,.08),0 0 40px rgba(31,140,255,.04);border-color:rgba(31,140,255,.2)}
        [data-theme="dark"] .job-card:hover{border-color:rgba(167,139,250,.2);box-shadow:0 8px 30px rgba(0,0,0,.3),0 0 40px rgba(167,139,250,.04)}

        /* Creator row */
        .job-creator{display:flex;align-items:center;gap:.75rem;padding:.875rem 1rem .75rem;background:linear-gradient(135deg,var(--bg2),var(--card));border-bottom:1px solid var(--border);position:relative}
        .job-creator:after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#191C6B,transparent);opacity:.4}
        .jc-avatar{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:.65rem;font-weight:800;color:#fff;flex-shrink:0;background:linear-gradient(135deg,#191C6B,#191C6B)}
        .jc-info{flex:1;min-width:0}
        .jc-name{font-size:.8125rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .jc-label{font-size:.625rem;color:var(--text3);text-transform:uppercase;letter-spacing:.04em}
        .jc-bookmark{width:30px;height:30px;border-radius:.5rem;border:1px solid var(--border);background:var(--card);display:grid;place-items:center;color:var(--text3);cursor:pointer;transition:all .2s;flex-shrink:0;font-size:16px}
        .jc-bookmark:hover{border-color:#191C6B;color:#191C6B}
        .jc-bookmark.saved{background:#191C6B;color:#fff;border-color:#191C6B}

        /* Meta row */
        .job-meta{display:flex;align-items:center;gap:.5rem;padding:.5rem 1rem;border-bottom:1px solid var(--border);background:var(--bg2);font-size:.75rem;font-weight:600;color:var(--text2)}
        .job-meta .cat-pill{display:inline-flex;align-items:center;gap:.25rem;padding:2px 8px;border-radius:999px;font-size:.625rem;font-weight:800;background:rgba(31,140,255,.08);color:#191C6B}
        .job-meta .platform{display:flex;align-items:center;gap:.25rem;color:var(--text2)}

        /* Description */
        .job-desc-wrap{padding:.75rem 1rem;flex:1;display:flex;flex-direction:column}
        .job-desc-wrap h3{margin:0 0 .35rem;font-family:Outfit;font-size:.9375rem;font-weight:800;line-height:1.3}
        .job-desc{font-size:.8125rem;color:var(--text2);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:0}

        /* Reward section */
        .job-reward{position:relative;margin:.5rem 1rem .75rem;padding:.875rem;border-radius:.75rem;background:linear-gradient(135deg,rgba(22,163,74,.06),rgba(22,163,74,.03));border:1px solid rgba(22,163,74,.12);text-align:center;overflow:hidden;transition:all .2s}
        .job-reward:before{content:'';position:absolute;top:0;left:-100%;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(22,163,74,.3),transparent);animation:rewardShimmer 4s ease-in-out infinite}
        [data-theme="dark"] .job-reward{background:linear-gradient(135deg,rgba(74,222,128,.08),rgba(74,222,128,.04));border-color:rgba(74,222,128,.12)}
        .job-reward .rw-primary{display:flex;align-items:baseline;justify-content:center;gap:.35rem}
        .job-reward .rw-amount{font-family:Outfit;font-size:1.25rem;font-weight:900;color:var(--text);letter-spacing:-.02em}
        .job-reward .rw-sym{font-size:.875rem;font-weight:700;color:var(--green)}
        .job-reward .rw-usd{font-size:.8125rem;color:var(--text2);font-weight:600}
        .job-reward .rw-secondary{display:flex;align-items:center;justify-content:center;gap:.35rem;margin-top:.1rem;font-size:.75rem;color:var(--text2);font-weight:600}
        .job-reward .rw-label{font-size:.625rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-bottom:.15rem}

        /* Badges */
        .job-badges{display:flex;align-items:center;gap:.35rem;margin:0 1rem .625rem;flex-wrap:wrap}
        .job-badge{display:inline-flex;align-items:center;gap:.15rem;padding:2px 8px;border-radius:999px;font-size:.5625rem;font-weight:800;text-transform:uppercase;letter-spacing:.03em}
        .job-badge.featured{background:rgba(245,179,1,.1);color:var(--gold);border:1px solid rgba(245,179,1,.18)}
        .job-badge.verified{background:rgba(22,163,74,.08);color:var(--green);border:1px solid rgba(22,163,74,.15)}
        [data-theme="dark"] .job-badge.featured{background:rgba(251,191,36,.08);color:#fbbf24;border-color:rgba(251,191,36,.18)}
        [data-theme="dark"] .job-badge.verified{background:rgba(52,211,153,.08);color:#34d399;border-color:rgba(52,211,153,.15)}

        /* Progress */
        .job-progress{margin:0 1rem .625rem}
        .job-progress .pr-bar{height:5px;border-radius:999px;background:var(--bg2);overflow:hidden;border:1px solid var(--border)}
        .job-progress .pr-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#191C6B,#191C6B);transition:width .5s}
        .job-progress .pr-stats{display:flex;justify-content:space-between;font-size:.625rem;color:var(--text3);margin-top:2px;font-weight:600}

        /* Footer actions */
        .job-foot{margin-top:auto;display:flex;align-items:center;gap:.5rem;padding:.75rem 1rem;border-top:1px solid var(--border);background:var(--bg2)}
        .job-foot .btn{height:34px;font-size:.75rem;flex:1;border:1.5px solid var(--border);background:var(--card);color:var(--text);border-radius:.5rem;padding:0 .75rem;display:inline-flex;align-items:center;justify-content:center;gap:.35rem;font-weight:700;transition:all .15s;cursor:pointer}
        .job-foot .btn:hover{background:var(--bg2);border-color:var(--text2)}
        .job-foot .btn.primary{background:#191C6B;color:#fff;border-color:#191C6B}
        .job-foot .btn.primary:hover{opacity:.9}

        /* Empty state */
        .empty-state{text-align:center;padding:4rem 1rem;color:var(--text3)}
        .empty-state i{font-size:2.25rem;display:block;margin-bottom:.75rem}
        .empty-state h3{font-family:Outfit;font-weight:800;margin:0 0 .25rem;color:var(--text);font-size:1.125rem}
        .empty-state p{font-size:.875rem;margin:0;color:var(--text2);line-height:1.5}

        @keyframes rewardShimmer{0%{left:-100%}50%{left:100%}100%{left:100%}}

        @media(max-width:1024px){.jobs-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:768px){
          .jobs-grid{grid-template-columns:1fr}
          .jobs-stats{grid-template-columns:repeat(2,1fr)}
          .filter-controls{flex-direction:column;align-items:stretch}
          .filter-toggle{overflow-x:auto;-webkit-overflow-scrolling:touch}
          .search-wrap{min-width:0}
          .btn-create{width:100%;justify-content:center}
          .jobs-section .page-head h1{font-size:1.375rem}
          .jobs-stat .stat-val{font-size:1.125rem}
          .job-reward .rw-amount{font-size:1.125rem}
        }
      `}</style>

      <div className="jobs-section">
        {/* Page Header */}
        <div className="page-head">
          <div>
            <h1>Jobs</h1>
            <p>Browse available microtasks and earn crypto rewards. Complete tasks and get paid instantly.</p>
          </div>
          <button className="btn-create" onClick={() => navigate('/create')}>
            <i className="ti ti-plus" />
            Create Job
          </button>
        </div>

        {/* Stats Row */}
        <div className="jobs-stats">
          <div className="jobs-stat">
            <div className="stat-val green">${totalRewards.toFixed(0)}+</div>
            <div className="stat-lbl">Total Rewards</div>
          </div>
          <div className="jobs-stat">
            <div className="stat-val accent">{jobs.length}</div>
            <div className="stat-lbl">Active Jobs</div>
          </div>
          <div className="jobs-stat">
            <div className="stat-val gold">{totalSlots}</div>
            <div className="stat-lbl">Total Slots</div>
          </div>
          <div className="jobs-stat">
            <div className="stat-val" style={{ color: 'var(--green)' }}>{totalFilled}</div>
            <div className="stat-lbl">Filled</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="filter-controls">
          <div className="filter-toggle">
            {jobFilters.map(f => (
              <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="search-wrap">
            <i className="ti ti-search search-icon" />
            <input type="text" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Jobs Grid */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <i className="ti ti-search-off" />
            <h3>{filter !== 'All' && filter !== 'Trending' && filter !== 'New' ? `No ${filter} Tasks Available` : 'No jobs found'}</h3>
            <p>Try adjusting your search or filter to find what you're looking for.</p>
          </div>
        ) : (
          <div className="jobs-grid">
            {filtered.map(job => (
              <TaskCard key={job.id} task={job._raw} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
