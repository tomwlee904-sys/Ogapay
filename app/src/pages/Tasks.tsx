import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Modal from '../components/Modal'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useApi } from '../lib/useApi'
import { useTheme } from '../context/ThemeContext'
import { useCurrency } from '../context/CurrencyContext'
import { SkeletonPage, injectSkeletonStyles } from "../components/SkeletonLoader"
import ApplyModal from '../components/ApplyModal'

const OGAPAY_BLUE = 'var(--accent)'

const FIXED_CATEGORIES = ['All', 'Trending', 'New', 'Jobs & Hiring']

const SORT_LABELS: Record<string, string> = {
  'newest': 'Newest', 'highest-reward': 'Highest Reward',
  'lowest-reward': 'Lowest Reward', 'oldest': 'Oldest',
}

const CATEGORY_ICONS: Record<string, string> = {
  'All': 'ti ti-layout-grid',
  'Trending': 'ti ti-trending-up', 'New': 'ti ti-sparkles',
  'Social': 'ti ti-share', 'Content': 'ti ti-edit',
  'Design': 'ti ti-palette', 'Video': 'ti ti-video',
  'Testing': 'ti ti-checklist', 'Data': 'ti ti-database',
  'Research': 'ti ti-search', 'Development': 'ti ti-code',
  'Jobs & Hiring': 'ti ti-briefcase',
}

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


// ── Info tooltip ─────────────────────────────────────────────────────
function InfoBtn({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", marginLeft: 4, verticalAlign: "middle" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.stopPropagation(); setShow(s => !s) }}>
      <i className="ti ti-info-circle" style={{ fontSize: 12, color: "var(--text3)", cursor: "pointer" }} />
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", background: "var(--text)", color: "var(--card)",
          fontSize: 11, lineHeight: 1.5, padding: "6px 10px", borderRadius: 8,
          whiteSpace: "normal", width: 220, zIndex: 99, pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

// ─── Job Detail Modal ────────────────────────────────────────────────
function JobDetailModal({ job, onClose, onApply }: { job: any; onClose: () => void; onApply: (jid: string) => void }) {
  const { user } = useAuth()
  const { toast: showToast } = useToast()
  const { rates } = useCurrency()
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [applySubmitting, setApplySubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [notes, setNotes] = useState('')
  const [timeLeft, setTimeLeft] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportCategory, setReportCategory] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [reportMsg, setReportMsg] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [showSubmissions, setShowSubmissions] = useState(false)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)

  const isMyTask = user?.id && (job._raw?.poster?.id || job.poster?.id) === user.id

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

  // Reset all form state when switching to a different job
  useEffect(() => {
    setShowApplyModal(false)
    setSubmitted(false)
    setNotes('')
    setShowReportModal(false)
    setReportCategory('')
    setReportDesc('')
    setReportMsg('')
    setReportSubmitting(false)
    setShowSubmissions(false)
    setSubmissions([])
    setSubmissionsLoading(false)
  }, [job.id])

  const handleSubmitReport = async () => {
    if (!reportCategory) { setReportMsg('Please select a category'); return }
    if (!reportDesc.trim()) { setReportMsg('Please describe the issue'); return }
    if (!job?.id) { setReportMsg('Invalid task'); return }
    setReportMsg('')
    setReportSubmitting(true)
    try {
      await apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify({ category: reportCategory, description: reportDesc, targetType: 'task', targetId: job.id }),
      })
      setReportMsg('Report submitted. Our team will review it within 24 hours.')
      setReportCategory('')
      setReportDesc('')
      setReportSubmitting(false)
      setTimeout(() => { setShowReportModal(false); setReportMsg('') }, 2500)
    } catch (err: any) {
      setReportMsg(err?.message || 'Failed to submit report')
      setReportSubmitting(false)
    }
  }

  const handleViewSubmissions = async () => {
    if (showSubmissions) { setShowSubmissions(false); return }
    setShowSubmissions(true)
    if (!job?.id) return
    setSubmissionsLoading(true)
    try {
      const res = await apiRequest<any>('/tasks/' + job.id + '/submissions')
      const list = Array.isArray(res) ? res : res?.data || res?.submissions || []
      setSubmissions(list)
    } catch {
      setSubmissions([])
    } finally {
      setSubmissionsLoading(false)
    }
  }

  if (!job) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(var(--accent-rgb),0.08)', color: OGAPAY_BLUE, fontSize: 10, fontWeight: 700 }}>{job.category || job.taskCategory || 'Task'}</span>
              {job.featured && <span style={{ padding: '3px 8px', borderRadius: 5, background: 'rgba(245,158,11,0.12)', color: 'var(--gold)', fontSize: 10, fontWeight: 700 }}>Featured</span>}
            </div>
            <h2 style={{ fontFamily: 'Outfit', fontSize: 18, fontWeight: 900, margin: 0 }}>{job.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-x" />
          </button>
        </div>

  
        {/* ── DARK MODE OVERRIDES ── */}
        <style>{`
          [data-theme="dark"] .ngn-shimmer {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            background: none !important;
            animation: none !important;
          }
          [data-theme="dark"] .task-reward-box {
            background: #1e1e1e !important;
            border: 1.5px solid rgba(255,255,255,0.08) !important;
            box-shadow: none !important;
          }
          [data-theme="dark"] .task-card-hover {
            background: #141414 !important;
            border-color: var(--border, #2a2a2a) !important;
            box-shadow: 0 4px 24px rgba(0,0,0,0.25) !important;
          }
        `}</style>

      {/* ── LISTED BY ── */}
        <div className='listed-by-header' style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 14px', marginBottom: 12, background: 'linear-gradient(135deg, rgba(59,91,219,0.24) 0%, rgba(255,255,255,0.45) 50%, rgba(16,185,129,0.24) 100%)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: OGAPAY_BLUE, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, overflow: 'hidden', flexShrink: 0, border: '2px solid white' }}>
              {(job.poster?.avatarUrl || job.poster?.avatar || job.creatorAvatar) ? <img src={job.poster?.avatarUrl || job.poster?.avatar || job.creatorAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : formatAddress(job.creatorName || job.creator?.username || job.creator || '')}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Listed by</div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{job.creatorName || job.creator?.username || job.creator || 'Anonymous'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setShowReportModal(true)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              <i className="ti ti-flag" style={{ fontSize: 14 }} /> Report
            </button>
            <span style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <button title={`Task ID: ${job.id || ''}`} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              <i className="ti ti-info-circle" style={{ fontSize: 14 }} /> Info
            </button>
            <span style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <button style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <i className="ti ti-bookmark" />
            </button>
          </div>
        </div>

        {/* ── CONFIGURATION + PARTICIPATION ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {/* Configuration */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              <i className="ti ti-adjustments" style={{ fontSize: 14 }} /> Configuration
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, color: job.status === 'OPEN' ? 'var(--accent)' : 'var(--text)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: job.status === 'OPEN' ? 'var(--accent)' : 'var(--text3)', display: 'inline-block' }} />
                  {job.status === 'OPEN' ? 'Open' : (job.status || 'Closed')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Type</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{job.category || job.taskCategory || 'General'}</div>
              </div>
              {job.difficulty && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Difficulty</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{job.difficulty}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Closes In</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: timeLeft === 'Expired' ? 'var(--red)' : 'var(--gold)' }}>{timeLeft || '—'}</div>
              </div>
            </div>
          </div>

          {/* Participation */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              <i className="ti ti-users" style={{ fontSize: 14 }} /> Participation
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Community</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{job.community || 'All'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Max Slots</div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{job.slots || 'Unlimited'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Capacity</div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  {job.slots ? `${job.slots - (job.slotsRemaining ?? 0)} / ${job.slots}` : 'Unlimited'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 2 }}>Open Slots</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: OGAPAY_BLUE }}>{job.slotsRemaining ?? job.slots ?? 'Unlimited'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── REWARD ── */}
        <div style={{ position: 'relative', background: 'linear-gradient(135deg, rgba(var(--accent-rgb),0.07) 0%, rgba(var(--accent-rgb),0.02) 100%)', border: '1px solid rgba(var(--accent-rgb),0.15)', borderRadius: 14, padding: '22px 20px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', width: 46, height: 46, borderRadius: 12, background: 'rgba(var(--accent-rgb),0.1)', display: 'grid', placeItems: 'center' }}>
            <i className="ti ti-currency-naira" style={{ fontSize: 22, color: OGAPAY_BLUE }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Reward Per Task</div>
          <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'Outfit', color: OGAPAY_BLUE, lineHeight: 1 }}>
            ₦{Number(job.reward || job.amount || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, marginTop: 6 }}>
            ${(Number(job.reward || job.amount || 0) * rates.NGN).toFixed(2)} USD <InfoBtn text="Approximate value in USD based on current exchange rates. Actual rates may vary." />
          </div>
        </div>

        {/* ── DESCRIPTION ── */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
            <i className="ti ti-file-text" style={{ fontSize: 14 }} /> Description
          </div>
          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>{job.description}</p>
        </div>

        {/* ── REQUIREMENTS ── */}
        {job.requirements && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
              <i className="ti ti-checklist" style={{ fontSize: 14 }} /> Requirements
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>{job.requirements}</div>
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!isMyTask && (
            <button onClick={() => { setShowApplyModal(true); setSubmitted(false) }} style={{ flex: '1 1 140px', height: 46, borderRadius: 12, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <i className="ti ti-edit" /> Apply
            </button>
          )}
          <button onClick={handleViewSubmissions} style={{ flex: '1 1 140px', height: 46, borderRadius: 12, background: OGAPAY_BLUE, color: '#fff', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <i className="ti ti-eye" /> View Submissions
          </button>
        </div>

        {/* ── SUBMISSIONS PANEL ── */}
        {showSubmissions && (
          <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Submissions</div>
            {submissionsLoading ? (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Loading...</div>
            ) : submissions.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>No submissions yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {submissions.map((s: any) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '8px 10px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 700 }}>{s.worker?.username || formatAddress(s.workerAddress || s.userId || '')}</span>
                    <span style={{ color: 'var(--text3)', fontWeight: 600 }}>{s.status || 'Pending'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <ApplyModal
        open={showApplyModal}
        onClose={() => { setShowApplyModal(false); setSubmitted(false) }}
        jobId={job.id}
        jobTitle={job.title}
        reward={job.reward}
        currency={job.currency || 'NGN'}
        onApplied={(jid) => { if (jid) setSubmissions(prev => [...prev, jid]) }}
      />

      {/* Report Modal */}
      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,0.5)' }} onClick={() => { if(!reportSubmitting) setShowReportModal(false) }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 440, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: 16, fontWeight: 900, margin: '0 0 12px' }}>Report Task</h3>
            {reportMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 12, fontWeight: 600,
                background: reportMsg.includes('submitted') ? 'rgba(var(--accent-rgb),0.08)' : 'rgba(var(--red-rgb),0.1)',
                color: reportMsg.includes('submitted') ? 'var(--accent)' : 'var(--red)' }}>
                {reportMsg}
              </div>
            )}
            <select value={reportCategory} onChange={e => setReportCategory(e.target.value)} style={{ width: '100%', height: 38, padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}>
              <option value="">Select a category</option>
              <option value="spam">Spam</option>
              <option value="scam">Scam / Fraud</option>
              <option value="inappropriate">Inappropriate Content</option>
              <option value="misleading">Misleading Information</option>
              <option value="other">Other</option>
            </select>
            <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} placeholder="Describe the issue in detail..." rows={4} style={{ width: '100%', minHeight: 80, padding: 10, border: '1.5px solid var(--border)', borderRadius: 9, background: 'var(--bg)', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowReportModal(false); setReportMsg('') }} style={{ flex: 1, height: 40, borderRadius: 9, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleSubmitReport} disabled={!reportCategory || !reportDesc.trim() || reportSubmitting} style={{ flex: 1, height: 40, borderRadius: 9, border: 'none', background: !reportCategory || !reportDesc.trim() || reportSubmitting ? 'var(--border)' : 'var(--red)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: !reportCategory || !reportDesc.trim() || reportSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Bootstrap fetchTasks from cache ──────────────────────────────
const tasksCacheMap = new Map<string, { data: any[]; timestamp: number }>()
const CACHE_TTL = 30_000
const FOCUS_STALE_AGE = 5_000

export function invalidateTasksCache() {
  tasksCacheMap.clear()
}

async function fetchTasks(category?: string) {
  const cacheKey = (category || 'all').toLowerCase()
  const now = Date.now()
  const cached = tasksCacheMap.get(cacheKey)
  if (cached && cached.timestamp + CACHE_TTL > now) return cached.data

  const url =
    category && !['all', 'trending', 'new'].includes(category.toLowerCase())
      ? '/tasks?category=' + encodeURIComponent(category.toUpperCase())
      : '/tasks'

  try {
    const data = await apiRequest<any>(url, { auth: false })
    const list = Array.isArray(data)
      ? data
      : data?.data || data?.tasks || data?.jobs || []
    tasksCacheMap.set(cacheKey, { data: list, timestamp: now })
    return list
  } catch {
    return []
  }
}

// ─── Tasks data with SWR ────────────────────────────────────────
function useTasksData(category?: string) {
  const url = category && !['all', 'trending', 'new'].includes((category || '').toLowerCase())
    ? '/tasks?category=' + encodeURIComponent(category.toUpperCase())
    : '/tasks'
  return useApi<any[]>(url, { auth: false })
}

// ─── Countdown hook ──────────────────────────
function useCountdown(expiresAt?: string) {
  const [display, setDisplay] = useState('')
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setDisplay('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (h > 0) setDisplay(`${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`)
      else setDisplay(`${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`)
    }
    tick(); const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return display
}

function useElapsed(createdAt?: string) {
  const [display, setDisplay] = useState('')
  useEffect(() => {
    if (!createdAt) return
    const tick = () => {
      const diff = Date.now() - new Date(createdAt).getTime()
      const m = Math.floor(diff / 60000)
      if (m < 1) { setDisplay('Posted just now'); return }
      if (m < 60) { setDisplay(`Posted ${m}m ago`); return }
      const h = Math.floor(m / 60)
      if (h < 24) { setDisplay(`Posted ${h}h ago`); return }
      const days = Math.floor(h / 24)
      setDisplay(`Posted ${days} day${days !== 1 ? 's' : ''} ago`)
    }
    tick(); const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [createdAt])
  return display
}

// ─── TaskCard component ───────────────────────
function TaskCard({ job, onToggleBookmark, bookmarked, applied }: {
  job: any
  onToggleBookmark: (id: string) => void
  bookmarked: boolean
  applied?: boolean
}) {
  const navigate = useNavigate()
  const { rates } = useCurrency()
  const slotsTotal = job.slots || job.maxSlots || 100
  const slotsFilled = job.slotsFilled || job.filled || 0
  const submissionsCount = job.submissionsCount ?? job._count?.submissions ?? slotsFilled ?? 0
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const progress = slotsTotal > 0 ? (slotsFilled / slotsTotal) * 100 : 0
  const posterName = job.poster ? (job.poster.firstName ? job.poster.firstName + (job.poster.lastName ? ' ' + job.poster.lastName : '') : job.poster.username || '') : ''
  const creatorName = posterName || job.creatorName || job.creator?.username || job.creator || 'Anonymous'
  const openSlots = slotsTotal - slotsFilled
  const reward = Number(job.reward || job.amount || 0)
  const unlimited = slotsTotal >= 999
  const status = job.status || 'OPEN'
  const isExpired = status !== 'OPEN'

  // Countdown
  const expiresAt = job.expiresAt || job.closesAt || job.deadline || job.endsAt || ''
  const countdown = useCountdown(expiresAt)
  const elapsed = useElapsed(job.createdAt || '')
  const timerDisplay = countdown || elapsed

  // Progress bar color based on status
  const progressColor = status === 'OPEN'
    ? 'linear-gradient(90deg,#059669,#34D399)'
    : status === 'CLOSED'
    ? 'linear-gradient(90deg,#6B7280,#9CA3AF)'
    : 'linear-gradient(90deg,#D97706,#FBBF24)'

  // Reward box tint matching progress
  const rewardBg = status === 'OPEN'
    ? 'rgba(var(--green-rgb),0.07)'
    : status === 'CLOSED'
    ? 'rgba(107,114,128,0.06)'
    : 'rgba(217,119,6,0.07)'
  const rewardBorder = status === 'OPEN'
    ? 'rgba(var(--green-rgb),0.18)'
    : status === 'CLOSED'
    ? 'rgba(107,114,128,0.15)'
    : 'rgba(217,119,6,0.18)'

  const eligibility: any = job.eligibility
  const isEligible = !eligibility || eligibility.isEligible
  const reasons: string[] = eligibility?.reasons || []

  // Description expand
  const [expanded, setExpanded] = useState(false)
  const descRef = useRef<HTMLParagraphElement>(null)
  const [isLong, setIsLong] = useState(false)
  useEffect(() => {
    if (descRef.current) {
      setIsLong(descRef.current.scrollHeight > descRef.current.clientHeight)
    }
  }, [])

  return (
    <div className="task-card-hover" onClick={() => navigate(`/tasks/${job.id}`)} style={{
      background: isDark ? '#141414' : 'var(--card)',
      border: isDark ? `1.5px solid ${!isEligible ? 'var(--red)' : 'var(--border, #2a2a2a)'}` : `1.5px solid ${!isEligible ? 'var(--red)' : 'var(--border)'}`,
      borderRadius: 16,
      boxShadow: isDark ? (!isEligible ? '0 2px 16px rgba(var(--red-rgb),0.10)' : '0 4px 24px rgba(0,0,0,0.25)') : (!isEligible ? '0 2px 16px rgba(var(--red-rgb),0.10)' : '0 2px 16px rgba(0,0,0,0.06)'),
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      opacity: !isEligible ? 0.75 : 1,
      height: 'auto',
      position: 'relative',
    }}>

      {/* ── STATUS BADGE ── */}
      {applied && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 2,
          background: 'var(--green)',
          color: '#fff', fontSize: 10, fontWeight: 800,
          padding: '3px 10px', borderRadius: 99,
          display: 'flex', alignItems: 'center', gap: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <i className="ti ti-circle-check" style={{fontSize:11}} /> Applied
        </div>
      )}
      {!applied && job.featured && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 2,
          background: 'linear-gradient(135deg,#F59E0B,#D97706)',
          color: '#fff', fontSize: 10, fontWeight: 800,
          padding: '3px 10px', borderRadius: 99,
          boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          Highlighted
        </div>
      )}

      {/* ── ELIGIBILITY BANNER ── */}
      {!isEligible && (
        <div style={{ padding: '8px 12px', background: 'var(--red)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#fff', flexWrap: 'wrap' }}>
          <i className="ti ti-shield-off" style={{fontSize:14}} />
          {reasons.map((r, i) => (
            <span key={i} style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 4 }}>
              {r}
            </span>
          ))}
        </div>
      )}



        {/* ── DARK MODE OVERRIDES ── */}
        <style>{`
          [data-theme="dark"] .ngn-shimmer {
            color: #ffffff !important;
            -webkit-text-fill-color: #ffffff !important;
            background: none !important;
            animation: none !important;
          }
          [data-theme="dark"] .task-reward-box {
            background: #1e1e1e !important;
            border: 1.5px solid rgba(255,255,255,0.08) !important;
            box-shadow: none !important;
          }
          [data-theme="dark"] .task-card-hover {
            background: #141414 !important;
            border-color: var(--border, #2a2a2a) !important;
            box-shadow: 0 4px 24px rgba(0,0,0,0.25) !important;
          }
        `}</style>

      {/* ── LISTED BY ── */}
      <div className='listed-by-header' style={{ padding: '8px 14px', borderBottom: isDark ? '1px solid var(--border, #2a2a2a)' : '1px solid var(--border)', background: isDark ? 'transparent' : 'linear-gradient(135deg, rgba(59,91,219,0.24) 0%, rgba(255,255,255,0.45) 50%, rgba(16,185,129,0.24) 100%)' }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Listed by</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(180deg,${OGAPAY_BLUE} 0%,var(--accent) 100%)`, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0, overflow: 'hidden', border: '2px solid white', boxShadow: '0 2px 8px rgba(var(--accent-rgb),0.25)' }}>
            {(job.poster?.avatarUrl || job.poster?.avatar || job.creatorAvatar) ? <img src={job.poster?.avatarUrl || job.poster?.avatar || job.creatorAvatar} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}} /> : formatAddress(creatorName)}
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, flex: 1, color: isDark ? '#ffffff' : 'var(--text, #0a0a0a)' }}>{creatorName}</span>
          <button onClick={e => { e.stopPropagation(); onToggleBookmark(job.id) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: bookmarked ? OGAPAY_BLUE : 'var(--text3)', fontSize: 18, padding: 4 }}>
            <i className={`ti ${bookmarked ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
          </button>
        </div>
      </div>

      {/* ── PROGRESS ── */}
      <div style={{ padding: '18px 20px 4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progress</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>
            {unlimited ? 'Unlimited' : `${slotsFilled}/${slotsTotal}`}
          </span>
        </div>
        <div style={{ height: 7, borderRadius: 99, background: 'rgba(var(--accent-rgb),0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, background: progressColor, width: `${Math.min(progress, 100)}%`, transition: 'width .3s', boxShadow: '0 0 6px rgba(0,0,0,0.12)' }} />
        </div>
      </div>

      {/* ── STATUS ROW ── */}
      <div style={{ padding: '12px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: isDark ? '#34D399' : 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isDark ? '#34D399' : 'var(--green)', display: 'inline-block', flexShrink: 0 }} />
          Submissions {submissionsCount}
        </span>
        <span style={{ color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />
          {unlimited ? 'Unlimited slots' : `Open ${Math.max(0, openSlots)}`}
        </span>
        <span style={{ color: status === 'OPEN' ? (isDark ? '#34D399' : 'var(--green)') : '#6B7280', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'OPEN' ? (isDark ? '#34D399' : 'var(--green)') : '#9CA3AF', display: 'inline-block', flexShrink: 0 }} />
          Status {status === 'CLOSED' ? 'Closed' : 'Filling'}
        </span>
      </div>

      {/* ── REWARD BOX ── */}
      <div className="task-reward-box" style={{ margin: '0 18px 14px', background: isDark ? '#1e1e1e' : rewardBg, border: isDark ? `1.5px solid rgba(255,255,255,0.08)` : `1px solid ${rewardBorder}`, borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
          <span className="ngn-shimmer" style={{ fontSize: 42, fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1, color: isDark ? '#ffffff' : undefined }}>
            {reward.toLocaleString()}
          </span>
          <span className="ngn-shimmer" style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Outfit', color: isDark ? '#ffffff' : undefined }}>NGN</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>
          $ {(reward * rates.NGN).toFixed(2)} USD <InfoBtn text="Approximate value in USD based on current exchange rates. Actual rates may vary." />
        </div>
      </div>

      {/* ── META TAGS ── */}
      <div style={{ padding: '0 18px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text2)', fontWeight: 600, flexWrap: 'wrap' }}>

        {job.difficulty && (
          <>
            <span style={{ color: 'var(--border2)' }}>|</span>
            <span>Difficulty: {job.difficulty}</span>
          </>
        )}
      </div>

      {/* ── CATEGORY | RANK ── */}
      <div style={{ padding: '0 18px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: isDark ? 'rgba(255,255,255,0.6)' : 'var(--text2)', fontWeight: 600 }}>
        <span>{(job.category || 'Custom').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
        {(job.minRank > 0 || job.rankRequired > 0) && (job.minRank || job.rankRequired) !== 'None' && <><span style={{ color: 'var(--border2)' }}>|</span><span>Rank {job.minRank || job.rankRequired}</span></>}
      </div>

      {/* ── ABOUT THIS JOB + TIMER ── */}
      <div style={{ padding: '0 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.5)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-message" style={{fontSize:13}} /> About This Job
        </span>
        {timerDisplay && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: isExpired ? 'var(--red)' : countdown ? (isDark ? '#ffffff' : 'var(--green)') : (isDark ? 'rgba(255,255,255,0.5)' : 'var(--text3)'),
            display: 'flex', alignItems: 'center', gap: 4,
            background: countdown && !isExpired ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(var(--green-rgb),0.07)') : 'transparent',
            padding: countdown ? '2px 7px' : '0',
            borderRadius: 99,
          }}>
            <i className="ti ti-clock" style={{fontSize:12}} /> {timerDisplay}
          </span>
        )}
      </div>

      {/* ── DESCRIPTION ── */}
      <div style={{
        margin: '0 18px 22px',
        padding: '14px 16px',
        border: isDark ? '1.5px solid var(--border, #2a2a2a)' : '1.5px solid var(--border)',
        borderRadius: '10px',
        background: isDark ? '#111113' : 'var(--bg)',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
      }}
        className="task-desc-box"
      >
        <p ref={descRef}
          style={{
            fontSize: 14, color: isDark ? 'rgba(255,255,255,0.6)' : 'var(--text2)', margin: 0, lineHeight: 1.65,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical' as any,
            WebkitLineClamp: !expanded ? 1 : 'unset' as any,
            overflow: 'hidden',
          }}>
          {job.description}
        </p>
        {isLong && (
          <button onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
            style={{ background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '4px 0 0', fontFamily: 'inherit' }}>
            {expanded ? 'Show less' : '...more'}
          </button>
        )}
      </div>
    </div>
  )
}

// MAIN TASKS PAGE
// ═══════════════════════════════════════════════
export default function Tasks() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast: showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [jobs, setJobs] = useState<any[]>([])
  const [, setJobListings] = useState<any[]>([])
  const [jobListingsLoading, setJobListingsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [tasksPage, setTasksPage] = useState(1)
  const perPage = 9
  const [filter, setFilter] = useState(searchParams.get('category') || 'All')
  const [allCategories, setAllCategories] = useState<string[]>(FIXED_CATEGORIES)
  const [bookmarked, setBookmarked] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('ogapay_bookmarked') || '[]') } catch { return [] }
  })
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [mySubmissions, setSubmissions] = useState<string[]>([])
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  const [showEligibleOnly, setShowEligibleOnly] = useState(false)

  useEffect(() => { injectSkeletonStyles() }, [])

  useEffect(() => {
    setLoading(true)
    fetchTasks(filter).then(data => {
      setJobs(data || [])
      setLoading(false)
      // Extract dynamic categories from response
      const cats = [...new Set((data || []).map((j: any) => j.category).filter(Boolean))] as string[]
      if (cats.length > 0) {
        setAllCategories([...FIXED_CATEGORIES, ...cats.filter((c: string) => !FIXED_CATEGORIES.includes(c))])
      }
    })
    if (user) {
      apiRequest('/tasks/my/submissions').catch((e) => { console.error(e); return null; }).then((res: any) => {
        if (res) {
          const list = Array.isArray(res) ? res : res?.data || [];
          setSubmissions(list.map((s: any) => s.taskId || s.task?.id));
        }
      });
    }
  }, [filter, user?.id])

  // Invalidate stale cache entries on window focus
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now()
      tasksCacheMap.forEach((v, k) => {
        if (now - v.timestamp > FOCUS_STALE_AGE) tasksCacheMap.delete(k)
      })
      fetchTasks(filter).then(data => setJobs(data || []))
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
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
      }).catch(e => { console.error(e); showToast('Failed to load task details', 'error'); })
    }
  }, [searchParams, jobs])

  const toggleBookmark = async (id: string) => {
    const isBookmarked = bookmarked.includes(id)
    try {
      if (isBookmarked) {
        await apiRequest(`/users/ns/${id}`, { method: 'DELETE' })
      } else {
        await apiRequest(`/users/ns/${id}`, { method: 'POST' })
      }
      setBookmarked(prev => {
        const next = isBookmarked ? prev.filter(x => x !== id) : [...prev, id]
        localStorage.setItem('ogapay_bookmarked', JSON.stringify(next))
        return next
      })
    } catch {
      showToast('Failed to update bookmark', 'error')
      setBookmarked(prev => {
        const next = isBookmarked ? prev.filter(x => x !== id) : [...prev, id]
        localStorage.setItem('ogapay_bookmarked', JSON.stringify(next))
        return next
      })
    }
  }

  const filtered = jobs
    .filter(j => {
      const q = search.toLowerCase()
      if (q && !(j.title || '').toLowerCase().includes(q)
        && !(j.description || '').toLowerCase().includes(q)
        && !(j.creatorName || j.creator?.username || j.creator || '').toLowerCase().includes(q)) return false
      if (showAvailableOnly && ((j.slots || 0) - (j.filled || 0) <= 0)) return false
      if (showEligibleOnly && j.eligibility && !j.eligibility.isEligible) return false
      return true
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'highest-reward') return (b.reward || 0) - (a.reward || 0)
      if (sortBy === 'lowest-reward') return (a.reward || 0) - (b.reward || 0)
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return 0
    })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((tasksPage - 1) * perPage, tasksPage * perPage)

  useEffect(() => { setTasksPage(1) }, [search, sortBy, showAvailableOnly, showEligibleOnly])

  // Sync filter state to URL
  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (filter !== 'All') next.set('category', filter); else next.delete('category')
      if (search) next.set('search', search); else next.delete('search')
      if (sortBy !== 'newest') next.set('sort', sortBy); else next.delete('sort')
      return next
    }, { replace: true })
  }, [filter, search, sortBy, setSearchParams])

  const fetchJobListings = async () => {
    setJobListingsLoading(true)
    try {
      const res = await apiRequest<any>('/tasks?status=OPEN')
      const d = Array.isArray(res) ? res : res?.data || res?.tasks || []
      setJobListings(d)
    } catch { showToast('Failed to load job listings', 'error') } finally { setJobListingsLoading(false) }
  }

  useEffect(() => {
    if (filter === 'Jobs & Hiring') fetchJobListings()
  }, [filter])

  return (
    <Layout>
      <style>{`
.task-card-hover{transition:box-shadow .25s ease,transform .25s ease,border-color .25s ease;display:flex;flex-direction:column;height:auto}
.task-card-hover:hover{box-shadow:0 0 0 1px rgba(var(--accent-rgb),0.5),0 0 36px 6px rgba(var(--accent-rgb),0.18),0 14px 28px -8px rgba(var(--accent-rgb),0.26);transform:translateY(-4px);border-color:rgba(var(--accent-rgb),0.5)!important}
[data-theme="dark"] .task-card-hover:hover{box-shadow:0 0 0 1px rgba(255,255,255,0.1),0 6px 28px rgba(0,0,0,0.35)!important;border-color:rgba(255,255,255,0.15)!important}
.task-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;align-items:stretch}
@media(max-width:767px){.task-grid{grid-template-columns:1fr}}
.mbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:6px;padding:0}
.mbar-l{display:flex;align-items:center;gap:6px;overflow:hidden;min-width:0}
.mbar-r{display:flex;align-items:center;gap:6px;flex-shrink:0}
.mbar-lbl{font-size:12px;color:var(--text3);font-weight:600;white-space:nowrap}
.mbar-sel{font-size:13px;font-weight:700;color:var(--text);border:none;background:transparent;font-family:inherit;cursor:pointer;outline:none;padding:0;max-width:110px;overflow:hidden;text-overflow:ellipsis;-webkit-appearance:none;appearance:none}
.mbar-sel::-ms-expand{display:none}
.mbar-chev{color:var(--text3);font-size:10px;margin-left:-2px}
@media(max-width:640px){.dsort{display:none!important}.mbar{display:flex!important}}
@media(min-width:641px){.mbar{display:none!important}}
@keyframes ngn-sweep{0%{background-position:-200% center}to{background-position:200% center}}
.ngn-shimmer{background:linear-gradient(90deg,var(--accent) 0%,var(--accent) 35%,var(--accent) 50%,var(--accent) 65%,var(--accent) 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:ngn-sweep 2.2s linear infinite}
[data-theme="dark"] .task-card-hover{background:#141414!important;border-color:var(--border, #2a2a2a)!important}
[data-theme="dark"] .task-card-hover div[style*="background: var(--bg)"]{background:#141416!important;border-color:rgba(255,255,255,0.05)!important}
[data-theme="dark"] .task-card-hover p[style*="color: var(--text2)"]{color:rgba(255,255,255,0.7)!important}
[data-theme="dark"] .ngn-shimmer{color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;background:none!important;animation:none!important}
[data-theme="dark"] .listed-by-header{background:transparent!important}
[data-theme="dark"] .task-desc-box{background:transparent!important;border:none!important;border-top:1px solid rgba(255,255,255,0.06)!important;border-radius:0!important;padding:12px 16px!important}
[data-theme="dark"] .task-reward-box{background:#1e1e1e!important;border-color:rgba(255,255,255,0.08)!important}
[data-theme="dark"] .tasks-bg-overlay{background:transparent!important}
`}</style>
      <div className="tasks-bg-overlay" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 20% 10%, rgba(var(--accent-rgb),0.10), transparent 50%),radial-gradient(circle at 80% 30%, rgba(var(--accent-rgb),0.07), transparent 50%),radial-gradient(circle at 50% 90%, rgba(74,110,245,0.06), transparent 50%)',
      }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 0 40px', position: 'relative' as const, zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Outfit', fontSize: 32, fontWeight: 900, margin: '0 0 4px', color: 'var(--text)' }}>All Jobs</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, margin: 0 }}>Social and custom jobs in one feed.</p>
        </div>

        {/* Sort + Available toggle */}
        {/* Search bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '0 14px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search tasks by title, description or creator..."
              value={search} onChange={e => { setSearch(e.target.value); setTasksPage(1); }}
              style={{
                flex: 1, height: 44, border: 'none', background: 'transparent',
                fontSize: 13, color: 'var(--text)', outline: 'none',
                fontFamily: 'inherit', width: '100%',
              }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setTasksPage(1); }}
                style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="dsort" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sort</span>
            {[['Highest Reward', 'highest-reward'], ['Newest', 'newest']].map(([label, val]) => (
              <button key={val} onClick={() => setSortBy(val)}
                style={{ padding: '8px 18px', borderRadius: 8, border: sortBy === val ? 'none' : '1px solid var(--border)', background: sortBy === val ? OGAPAY_BLUE : 'transparent', color: sortBy === val ? '#fff' : 'var(--text)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Show</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Available for me</span>
            {/* Toggle switch */}
            <div onClick={() => setShowAvailableOnly(v => !v)}
              style={{ width: 44, height: 24, borderRadius: 999, background: showAvailableOnly ? OGAPAY_BLUE : 'var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: showAvailableOnly ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }} />
            </div>
          </div>
        </div>

        {/* Mobile sort/filter bar - compact single row */}
        <div className="mbar">
          <div className="mbar-l">
            <span className="mbar-lbl">Sort:</span>
            <select className="mbar-sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="highest-reward">Highest Reward</option>
              <option value="lowest-reward">Lowest Reward</option>
              <option value="oldest">Oldest</option>
            </select>
            <span className="mbar-lbl">Filter:</span>
            <select className="mbar-sel" value={filter} onChange={e => setFilter(e.target.value)}>
              {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="mbar-r">
            <span className="mbar-lbl">Available</span>
            <div onClick={() => setShowAvailableOnly(v => !v)}
              style={{ width: 36, height: 20, borderRadius: 999, background: showAvailableOnly ? OGAPAY_BLUE : 'var(--border2)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: showAvailableOnly ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
            </div>
          </div>
        </div>

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
            <>
              <div className="task-grid">
                {paginated.map(job => (
                  <TaskCard
                    key={job.id}
                    job={job}
                    onToggleBookmark={toggleBookmark}
                    bookmarked={bookmarked.includes(job.id)}
                    applied={mySubmissions.includes(job.id)}
                  />
                ))}
              </div>

              {/* Pagination bar */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 36 }}>
                  {/* Prev */}
                  <button
                    onClick={() => { setTasksPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    disabled={tasksPage === 1}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--card)', color: tasksPage === 1 ? 'var(--text3)' : 'var(--text)', fontWeight: 700, fontSize: 13, cursor: tasksPage === 1 ? 'not-allowed' : 'pointer', opacity: tasksPage === 1 ? 0.45 : 1, transition: 'all .15s', fontFamily: 'inherit' }}>
                    <i className="ti ti-chevron-left" style={{ fontSize: 15 }} /> Previous
                  </button>

                  {/* Page numbers */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - tasksPage) <= 1)
                      .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, idx) =>
                        p === '…' ? (
                          <span key={`ellipsis-${idx}`} style={{ width: 36, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>…</span>
                        ) : (
                          <button key={p}
                            onClick={() => { setTasksPage(p as number); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                            style={{ width: 36, height: 36, borderRadius: 8, border: tasksPage === p ? 'none' : '1.5px solid var(--border)', background: tasksPage === p ? OGAPAY_BLUE : 'var(--card)', color: tasksPage === p ? '#fff' : 'var(--text)', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit' }}>
                            {p}
                          </button>
                        )
                      )}
                  </div>

                  {/* Next */}
                  <button
                    onClick={() => { setTasksPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    disabled={tasksPage === totalPages}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--card)', color: tasksPage === totalPages ? 'var(--text3)' : 'var(--text)', fontWeight: 700, fontSize: 13, cursor: tasksPage === totalPages ? 'not-allowed' : 'pointer', opacity: tasksPage === totalPages ? 0.45 : 1, transition: 'all .15s', fontFamily: 'inherit' }}>
                    Next <i className="ti ti-chevron-right" style={{ fontSize: 15 }} />
                  </button>
                </div>
              )}

              {/* Page info */}
              {totalPages > 1 && (
                <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
                  Showing {(tasksPage - 1) * perPage + 1}–{Math.min(tasksPage * perPage, filtered.length)} of {filtered.length} tasks
                </p>
              )}
            </>
          )
        )}

        {/* Job detail modal */}
        {selectedJob && (
          <JobDetailModal
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onApply={(jid) => {
              setSelectedJob(null)
              navigate('/tasks/' + jid)
            }}
          />
        )}
      </div>
    </Layout>
  )
}
