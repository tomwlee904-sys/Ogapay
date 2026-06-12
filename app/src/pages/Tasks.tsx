import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { supabase } from '../lib/supabaseClient'
import { SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader"

const OGAPAY_BLUE = '#191C6D'

const CATEGORY_MAP: Record<string, string> = {
  'ALL': 'All', 'ALL': 'All', 'OPEN': 'Open', 'TRENDING': 'Trending',
  'SOCIAL': 'Social', 'CONTENT': 'Content', 'DESIGN': 'Design',
  'VIDEO': 'Video', 'TESTING': 'Testing', 'DATA': 'Data',
  'DEVELOPMENT': 'Development', 'RESEARCH': 'Research',
  'SURVEY': 'Research', 'JOBS & HIRING': 'Jobs & Hiring',
}

const CATEGORIES = ['All', 'Trending', 'New', 'Social', 'Content', 'Testing', 'Design', 'Video', 'Data', 'Research', 'Development', 'Jobs & Hiring']

function formatAddress(addr: string) {
  if (!addr) return ''
  return addr.slice(0, 2).toUpperCase()
}

function formatTime(sec: number) {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatReward(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

// ─── Job Detail Modal ────────────────────────────────────────────────
function JobDetailModal({ job, onClose, onApply }: { job: any; onClose: () => void; onApply: (jid: string) => void }) {
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')
  const [applyLink, setApplyLink] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [notes, setNotes] = useState('')
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (job.deadline) {
      const calc = () => {
        const diff = new Date(job.deadline).getTime() - Date.now()
        if (diff <= 0) { setTimeLeft('Expired'); return }
        const d = Math.floor(diff / 86400000)
        const h = Math.floor((diff % 86400000) / 3600000)
        setTimeLeft(`${d}d ${h}h`)
      }
      calc(); const int = setInterval(calc, 60000)
      return () => clearInterval(int)
    }
  }, [job.deadline])

  const handleApply = async () => {
    setSubmitted(false)
    try {
      await apiRequest('/tasks/' + job.id + '/apply', { method: 'POST', body: {} })
      setSubmitted(true)
      setShowApplyModal(false)
      onApply(job.id)
    } catch { alert('Failed to apply') }
  }

  const handleSubmitProof = async () => {
    try {
      await apiRequest('/tasks/' + job.id + '/submit', {
        method: 'POST',
        body: { message: applyMsg, link: applyLink, notes },
      })
      setSubmitted(true)
      setShowApplyModal(false)
    } catch { alert('Failed to submit') }
  }

  if (!job) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(25,28,107,0.08)', color: OGAPAY_BLUE, fontSize: 10, fontWeight: 700 }}>{job.category || job.taskCategory || 'Task'}</span>
              {job.featured && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: 10, fontWeight: 700 }}>Featured</span>}
            </div>
            <h2 style={{ fontFamily: 'Outfit', fontSize: 18, fontWeight: 900, margin: 0 }}>{job.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Creator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: OGAPAY_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 }}>
            {job.creatorAvatar ? <img src={job.creatorAvatar} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:10}} /> : formatAddress(job.creatorName || job.creator?.username || job.creator || '')}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{job.creatorName || job.creator?.username || job.creator || 'Anonymous'}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{job.creatorLabel || 'Poster'}</div>
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 16px' }}>{job.description}</p>

        {/* Reward + slots */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)', marginBottom: 2 }}>Reward</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>
              {job.reward || job.amount || 0}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{(job.rewardCurrency || job.currency || 'USD')}</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text3)', marginBottom: 2 }}>Slots</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{job.slotsRemaining || job.slots || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{job.slots ? `${job.slots - (job.slotsRemaining || 0)} filled` : 'Unlimited'}</div>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {job.timeEstimate && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-clock" style={{fontSize:12}} />{job.timeEstimate}</span>}
          {job.difficulty && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-speedometer" style={{fontSize:12}} />{job.difficulty}</span>}
          {job.rankRequired && job.rankRequired !== 'None' && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(31,140,255,0.08)', border: '1px solid rgba(31,140,255,0.15)', color: '#1F8CFF', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-medal" style={{fontSize:12}} />{job.rankRequired}</span>}
          {timeLeft && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', color: timeLeft === 'Expired' ? '#dc2626' : '#f59e0b', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-alert-circle" style={{fontSize:12}} />{timeLeft}</span>}
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Requirements</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{job.requirements}</div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowApplyModal(true)} style={{ flex: 1, height: 40, borderRadius: 9, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <i className="ti ti-send" /> Apply Now
          </button>
          <button style={{ height: 40, width: 40, borderRadius: 9, border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--text2)', fontSize: 16 }}>
            <i className="ti ti-bookmark" />
          </button>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowApplyModal(false)}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 440, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: 16, fontWeight: 900, margin: '0 0 12px' }}>{submitted ? 'Submitted ✓' : 'Apply for Task'}</h3>
            {!submitted ? (
              <>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>{job.title}</p>
                <textarea value={applyMsg} onChange={e => setApplyMsg(e.target.value)} placeholder="Message (optional)" style={{ width: '100%', minHeight: 80, padding: 10, border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                <input value={applyLink} onChange={e => setApplyLink(e.target.value)} placeholder="Link / proof URL (optional)" style={{ width: '100%', height: 38, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" style={{ width: '100%', minHeight: 60, padding: 10, border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
                <button onClick={handleSubmitProof} style={{ width: '100%', height: 40, borderRadius: 9, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Submit Proof
                </button>
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>Your application has been submitted. You can track its status in your dashboard.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Bootstrap fetchTasks from cache ──────────────────────────────
let tasksCache: { data: any[]; timestamp: number } | null = null
const CACHE_TTL = 30000

async function fetchTasks(category?: string) {
  const cacheKey = category || 'all'
  const now = Date.now()
  if (tasksCache && tasksCache.timestamp + CACHE_TTL > now) {
    return tasksCache.data
  }
  const url = category && category !== 'All' && category !== 'Trending' && category !== 'New'
    ? '/tasks?category=' + encodeURIComponent(category.toUpperCase())
    : '/tasks'
  try {
    const data = await apiRequest<any>(url).catch(() => null)
    const fallback = Array.isArray(data) ? data : data?.data || data?.tasks || data?.jobs || []
    tasksCache = { data: fallback, timestamp: now }
    return fallback
  } catch {
    return []
  }
}

// ─── TaskCard component (30babac UI style) ───────────────────────
function TaskCard({ job, onView, onToggleBookmark, bookmarked }: {
  job: any
  onView: (j: any) => void
  onToggleBookmark: (id: string) => void
  bookmarked: boolean
}) {
  const slotsTotal = job.slots || job.maxSlots || 100
  const slotsFilled = job.slotsFilled || job.filled || 0
  const progress = slotsTotal > 0 ? (slotsFilled / slotsTotal) * 100 : 0
  const creatorName = job.creatorName || job.creator?.username || job.creator || 'Anonymous'
  const openSlots = slotsTotal - slotsFilled

  return (
    <div style={{
      background: 'var(--card, #1e1f25)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.06)', cursor: 'pointer',
    }} onClick={() => onView(job)}>
      {/* ── LISTED BY — Boxed Header ── */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Listed By</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: OGAPAY_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0, overflow: 'hidden' }}>
            {job.creatorAvatar ? <img src={job.creatorAvatar} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : formatAddress(creatorName)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{creatorName}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{job.creatorLabel || 'Poster'}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); onToggleBookmark(job.id); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: bookmarked ? OGAPAY_BLUE : 'var(--text3)', fontSize: 16, padding: 4 }}>
            <i className={`ti ${bookmarked ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
          </button>
        </div>
      </div>

      {/* Meta pills */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px 0', flexWrap: 'wrap' }}>
        {job.category && (
          <span style={{ padding: '2px 7px', borderRadius: 5, background: 'rgba(25,28,107,0.08)', color: OGAPAY_BLUE, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-tag" style={{fontSize:10}} /> {job.category}
          </span>
        )}
        {job.platform && (
          <span style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-device-laptop" style={{fontSize:10}} /> {job.platform}
          </span>
        )}
        {job.timeEstimate && (
          <span style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
            <i className="ti ti-clock" style={{fontSize:10}} /> {job.timeEstimate}
          </span>
        )}
      </div>

      {/* Description */}
      <div style={{ padding: '10px 14px' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: 15, fontWeight: 800, margin: '0 0 4px' }}>{job.title}</h3>
        <p style={{ fontSize: 12, color: 'var(--text2)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
          {job.description}
        </p>
      </div>

      {/* Reward */}
      <div style={{ padding: '0 14px 10px' }}>
        <div style={{ background: 'var(--bg, #141518)', borderRadius: 8, padding: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Reward</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>{job.reward || job.amount || 0}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{job.rewardCurrency || job.currency || 'USD'}</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, padding: '0 14px 10px', flexWrap: 'wrap' }}>
        {job.featured && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-star" /> Featured</span>}
        {job.verificationRequired && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(22,163,74,0.12)', color: '#16a34a', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-shield-check" /> Verified</span>}
        {job.difficulty && (
          <span style={{ padding: '3px 8px', borderRadius: 5, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-speedometer" /> {job.difficulty}
          </span>
        )}
        {job.rankRequired && job.rankRequired !== 'None' && (
          <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(31,140,255,0.08)', color: '#1F8CFF', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <i className="ti ti-medal" /> {job.rankRequired}
          </span>
        )}
      </div>

      {/* ── PROGRESS SECTION ── */}
      <div style={{ padding: '0 14px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span>Progress</span>
          <span>{slotsFilled}/{slotsTotal}</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: OGAPAY_BLUE, width: `${Math.min(progress, 100)}%`, transition: 'width .3s' }} />
        </div>
      </div>

      {/* ── STATUS ROW — Single inline line ── */}
      <div style={{ padding: '0 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap', fontSize: 11 }}>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>● Submissions {slotsFilled}</span>
          <span style={{ color: '#6366f1', fontWeight: 600 }}>● Open {openSlots}</span>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>● Status Open</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px' }}>
        <button onClick={e => { e.stopPropagation(); onView(job); }}
          style={{ flex: 1, height: 34, borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text2)', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <i className="ti ti-eye" style={{fontSize:13}} /> View
        </button>
        <button onClick={e => { e.stopPropagation(); onView(job); }}
          style={{ flex: 1, height: 34, borderRadius: 8, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <i className="ti ti-send" style={{fontSize:13}} /> Apply Now
        </button>
      </div>
    </div>
  )
}

// MAIN TASKS PAGE
// ═══════════════════════════════════════════════
export default function Tasks() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [jobs, setJobs] = useState<any[]>([])
  const [jobListings, setJobListings] = useState<any[]>([])
  const [jobListingsLoading, setJobListingsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const initialCategory = searchParams.get('category') || 'All'
  const [filter, setFilter] = useState(initialCategory)
  const [bookmarked, setBookmarked] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ogapay_bookmarked') || '[]') } catch { return [] }
  })
  const [selectedJob, setSelectedJob] = useState<any>(null)

  useEffect(() => { injectSkeletonStyles() }, [])

  useEffect(() => {
    setLoading(true)
    fetchTasks(filter).then(data => {
      setJobs(data || [])
      setLoading(false)
    })
  }, [filter])

  useEffect(() => {
    // Check URL params for selected job
    const id = searchParams.get('job')
    if (id) {
      const found = jobs.find(j => j.id === id)
      if (found) { setSelectedJob(found); return }
      // Fetch directly if not in loaded jobs
      apiRequest<any>('/tasks/' + id).then(res => {
        const j = res?.data || res
        if (j?.id) setSelectedJob(j)
      }).catch(() => {})
    }
  }, [searchParams, jobs])

  const toggleBookmark = (id: string) => {
    setBookmarked(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem('ogapay_bookmarked', JSON.stringify(next))
      return next
    })
  }

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    if (!q) return true
    return (j.title || '').toLowerCase().includes(q)
      || (j.description || '').toLowerCase().includes(q)
      || (j.creatorName || j.creator?.username || j.creator || '').toLowerCase().includes(q)
  })

  const fetchJobListings = async () => {
    setJobListingsLoading(true)
    try {
      const res = await apiRequest<any>('/tasks?status=OPEN')
      const d = Array.isArray(res) ? res : res?.data || res?.tasks || []
      setJobListings(d)
    } catch {} finally { setJobListingsLoading(false) }
  }

  useEffect(() => {
    if (filter === 'Jobs & Hiring') fetchJobListings()
  }, [filter])

  return (
    <Layout>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 20% 10%, rgba(25,28,107,0.10), transparent 50%),radial-gradient(circle at 80% 30%, rgba(20,184,166,0.08), transparent 50%),radial-gradient(circle at 50% 90%, rgba(153,69,255,0.06), transparent 50%)',
      }} />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px', position: 'relative' as const, zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, margin: '0 0 4px' }}>Tasks</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, margin: 0 }}>Browse available tasks and earn rewards</p>
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {CATEGORIES.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 999, border: '1px solid', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              background: filter === f ? '#191C6D' : 'transparent',
              borderColor: filter === f ? '#191C6D' : 'var(--border)',
              color: filter === f ? '#fff' : 'var(--text2)',
            }}>
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card)', marginBottom: 20 }}>
          <i className="ti ti-search" style={{ color: 'var(--text3)', fontSize: 16 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' }} />
        </div>

        {/* Job Listings tab content */}
        {filter === 'Jobs & Hiring' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Job Listings</span>
              <button onClick={() => navigate('/post-job')} style={{ height: 34, padding: '0 14px', borderRadius: 8, background: '#191C6D', color: '#fff', border: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                <i className="ti ti-plus" /> Post a Job
              </button>
            </div>
            {jobListingsLoading ? (
              <SkeletonPage />
            ) : jobListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text2)', fontSize: 13 }}>
                <i className="ti ti-briefcase-off" style={{ fontSize: 32, color: 'var(--text3)', marginBottom: 8, display: 'block' }} />
                No job listings currently
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {jobListings.map((j: any) => (
                  <div key={j.id} style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: 14, cursor: 'pointer' }}
                    onClick={() => navigate('/jobs/' + j.id)}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{j.jobTitle || j.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{j.companyName || j.creatorName}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {j.jobType && <span style={{ padding: '2px 8px', borderRadius: 5, background: 'rgba(25,28,107,0.08)', color: '#191C6D', fontSize: 10, fontWeight: 700 }}>{j.jobType}</span>}
                      {j.location && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{j.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Regular task grid */}
        {filter !== 'Jobs & Hiring' && (
          loading ? (
            <SkeletonPage />
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
              <i className="ti ti-search-off" style={{ fontSize: 36, color: 'var(--text3)', marginBottom: 12, display: 'block' }} />
              <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, margin: '0 0 4px' }}>No tasks found</h3>
              <p style={{ fontSize: 13, margin: 0 }}>Try adjusting your search or filter</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {filtered.map(job => (
                <TaskCard
                  key={job.id}
                  job={job}
                  onView={setSelectedJob}
                  onToggleBookmark={toggleBookmark}
                  bookmarked={bookmarked.includes(job.id)}
                />
              ))}
            </div>
          )
        )}

        {/* Job detail modal */}
        {selectedJob && (
          <JobDetailModal
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onApply={(jid) => {
              setSelectedJob(null)
              navigate('/jobs/' + jid)
            }}
          />
        )}
      </div>
    </Layout>
  )
}
