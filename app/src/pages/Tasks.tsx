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
import { HomeJobCard } from '../components/home/HomeCards'

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
            <h2 style={{ fontFamily: 'Geist', fontSize: 18, fontWeight: 900, margin: 0 }}>{job.title}</h2>
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
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: OGAPAY_BLUE, color: 'var(--on-accent)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, overflow: 'hidden', flexShrink: 0, border: '2px solid white' }}>
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
          <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'Geist', color: OGAPAY_BLUE, lineHeight: 1 }}>
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
            <button onClick={() => { setShowApplyModal(true); setSubmitted(false) }} style={{ flex: '1 1 140px', height: 46, borderRadius: 12, background: OGAPAY_BLUE, color: 'var(--on-accent)', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <i className="ti ti-edit" /> Apply
            </button>
          )}
          <button onClick={handleViewSubmissions} style={{ flex: '1 1 140px', height: 46, borderRadius: 12, background: OGAPAY_BLUE, color: 'var(--on-accent)', border: 'none', fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
            <h3 style={{ fontFamily: 'Geist', fontSize: 16, fontWeight: 900, margin: '0 0 12px' }}>Report Task</h3>
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

// ─── Sort / filter menu ─────────────────────────────────────────
const SORTS: [string, string][] = [['default', 'Default'], ['reward', 'Reward'], ['newest', 'Newest'], ['closing', 'Closing time']]
const REQS: [string, string][] = [['all', 'All'], ['open', 'Open to everyone'], ['ogascore', 'OgaScore required'], ['wallet', 'Wallet required'], ['rank', 'Rank required']]

function SortFilterMenu({ sort, req, category, categories, onSort, onReq, onCategory }: {
  sort: string; req: string; category: string; categories: string[]
  onSort: (v: string) => void; onReq: (v: string) => void; onCategory: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const sortLabel = SORTS.find(([v]) => v === sort)?.[1] || 'Default'
  const filterLabel = category !== 'All' ? category : REQS.find(([v]) => v === req)?.[1] || 'All'
  const item = (on: boolean, label: string, pick: () => void) => (
    <button key={label} type="button" className={`ui-menu-item${on ? ' on' : ''}`} onClick={pick}>{label}</button>
  )
  return (
    <div className="ui-menu-wrap" ref={ref}>
      <button type="button" className="ui-menu-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(o => !o)}>
        <span>Sort: <b>{sortLabel}</b></span>
        <span>Filter: <b>{filterLabel}</b></span>
        <i className="ti ti-chevron-down" />
      </button>
      {open && (
        <div className="ui-menu" role="menu">
          <div className="ui-menu-label">Sort</div>
          {SORTS.map(([v, l]) => item(sort === v, l, () => onSort(v)))}
          <div className="ui-menu-label" style={{ marginTop: 8 }}>Requirements</div>
          {REQS.map(([v, l]) => item(req === v, l, () => onReq(v)))}
          {categories.length > 1 && (
            <>
              <div className="ui-menu-label" style={{ marginTop: 8 }}>Category</div>
              <div className="tl-cats">
                {categories.map(c => item(category === c, c === 'All' ? 'All categories' : c, () => onCategory(c)))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const CATEGORY_LABEL: Record<string, string> = {
  SOCIAL_MEDIA: 'Social media', DATA_ENTRY: 'Data entry', CONTENT_WRITING: 'Content writing', APP_TESTING: 'App testing',
  SURVEY: 'Survey', DESIGN: 'Design', TRANSLATION: 'Translation', WEB_RESEARCH: 'Web research', VIDEO_REVIEW: 'Video review', OTHER: 'Other',
}
const endOf = (j: any) => j.expiresAt || j.deadline || j.closesAt || j.endsAt
const openSlots = (j: any) => {
  const max = Number(j.maxWorkers ?? j.slots ?? 0)
  if (!max) return Infinity
  const done = Number(j.submissionsCount ?? j._count?.submissions ?? j.currentWorkers ?? j.filled ?? 0)
  return max - done
}
const isClosed = (j: any) => { const e = endOf(j); return !!e && new Date(e).getTime() <= Date.now() }

export default function Tasks() {
  const { user } = useAuth()
  const { toast: showToast } = useToast()
  const { convert } = useCurrency()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [page, setPage] = useState(1)
  const perPage = 12
  const [category, setCategory] = useState(searchParams.get('category') || 'All')
  const [sort, setSort] = useState(searchParams.get('sort') || 'default')
  const [req, setReq] = useState(searchParams.get('req') || 'all')
  const [availableOnly, setAvailableOnly] = useState(searchParams.get('available') === '1')
  const [mySubmissions, setMySubmissions] = useState<string[]>([])
  const [selectedJob, setSelectedJob] = useState<any>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchTasks('all').then(data => { if (alive) { setJobs(data || []); setLoading(false) } })
    if (user) {
      apiRequest('/tasks/my/submissions').catch(() => null).then((res: any) => {
        if (!alive || !res) return
        const list = Array.isArray(res) ? res : res?.data || []
        setMySubmissions(list.map((s: any) => s.taskId || s.task?.id).filter(Boolean))
      })
    }
    return () => { alive = false }
  }, [user?.id])

  // Refresh when the tab regains focus (cache entries older than a few seconds)
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now()
      tasksCacheMap.forEach((v, k) => { if (now - v.timestamp > FOCUS_STALE_AGE) tasksCacheMap.delete(k) })
      fetchTasks('all').then(data => setJobs(data || []))
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // ?job=<id> opens the quick-view modal (links from notifications use this)
  useEffect(() => {
    const id = searchParams.get('job')
    if (!id) return
    const found = jobs.find(j => j.id === id)
    if (found) { setSelectedJob(found); return }
    apiRequest<any>('/tasks/' + id).then(res => {
      const j = res?.data || res
      if (j?.id) setSelectedJob(j)
    }).catch(() => showToast('Failed to load task details', 'error'))
  }, [searchParams, jobs])

  const categories = ['All', ...Array.from(new Set(jobs.map(j => j.category).filter(Boolean))).map((c: any) => CATEGORY_LABEL[c] || c)]
  const categoryKey = (label: string) => Object.keys(CATEGORY_LABEL).find(k => CATEGORY_LABEL[k] === label) || label

  const filtered = jobs
    .filter(j => {
      const q = search.trim().toLowerCase()
      if (q) {
        const who = (j.poster?.username || j.creator?.username || j.creatorName || '').toLowerCase()
        if (!(j.title || '').toLowerCase().includes(q) && !(j.description || '').toLowerCase().includes(q) && !who.includes(q)) return false
      }
      if (category !== 'All' && j.category !== categoryKey(category)) return false
      const score = Number(j.minOgaScore ?? j.minSorsaScore ?? 0), rank = Number(j.minRank ?? 0)
      if (req === 'open' && (score > 0 || rank > 0 || j.requiresWallet || j.requiresLinkedin || j.workerRequirement)) return false
      if (req === 'ogascore' && score <= 0) return false
      if (req === 'wallet' && !j.requiresWallet) return false
      if (req === 'rank' && rank <= 0) return false
      if (availableOnly) {
        if (openSlots(j) <= 0 || isClosed(j) || mySubmissions.includes(j.id)) return false
        if (j.eligibility && j.eligibility.isEligible === false) return false
      }
      return true
    })
    .sort((a, b) => {
      const time = (x: any) => new Date(x.createdAt || 0).getTime()
      if (sort === 'reward') return Number(b.reward ?? 0) - Number(a.reward ?? 0)
      if (sort === 'newest') return time(b) - time(a)
      if (sort === 'closing') {
        const ea = endOf(a) ? new Date(endOf(a)).getTime() : Infinity
        const eb = endOf(b) ? new Date(endOf(b)).getTime() : Infinity
        return ea - eb
      }
      // default: featured first, then still-open, then newest
      return Number(!!b.featured) - Number(!!a.featured) || Number(isClosed(a)) - Number(isClosed(b)) || time(b) - time(a)
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  useEffect(() => { setPage(1) }, [search, sort, req, category, availableOnly])

  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      const set = (k: string, v: string, def: string) => { if (v && v !== def) next.set(k, v); else next.delete(k) }
      set('category', category, 'All'); set('search', search, ''); set('sort', sort, 'default'); set('req', req, 'all')
      set('available', availableOnly ? '1' : '', '')
      return next
    }, { replace: true })
  }, [category, search, sort, req, availableOnly, setSearchParams])

  const goPage = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const clearAll = () => { setSearch(''); setReq('all'); setCategory('All'); setAvailableOnly(false) }

  return (
    <Layout>
      <style>{`
        .tl-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:22px}
        .tl-search{flex:1;max-width:320px;min-width:180px}
        .tl-bar .ui-switch{margin-left:auto}
        .tl-search .ui-input{height:38px}
        .tl-cats{max-height:210px;overflow:auto;padding-right:2px}
        .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        @media(max-width:640px){.tl-search{max-width:none;order:3;flex-basis:100%}}
      `}</style>
      <div className="ui-page" style={{ paddingTop: 20 }}>
        <h1 className="sr-only">Jobs timeline</h1>

        <div className="tl-bar">
          <SortFilterMenu
            sort={sort} req={req} category={category} categories={categories}
            onSort={setSort} onReq={setReq} onCategory={setCategory}
          />
          <div className="ui-search tl-search">
            <i className="ti ti-search" />
            <input className="ui-input" type="search" placeholder="Search jobs or creators" aria-label="Search jobs"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <label className="ui-switch">
            Available for me
            <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} />
            <span className="ui-switch-track" aria-hidden="true" />
          </label>
        </div>

        {loading ? (
          <div className="ui-grid-3">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="ui-sk" style={{ height: 480 }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="ui-empty">
            <i className="ti ti-search-off" style={{ fontSize: 28, display: 'block', marginBottom: 10, color: 'var(--text3)' }} />
            <b style={{ color: 'var(--text)' }}>No jobs match</b>
            <p style={{ margin: '6px 0 16px' }}>{availableOnly ? 'Turn off "Available for me" or change the filters.' : 'Try a different search or filter.'}</p>
            <button className="ui-btn ui-btn-ghost" onClick={clearAll}>Clear filters</button>
          </div>
        ) : (
          <>
            <div className="ui-grid-3">
              {paginated.map(job => (
                <HomeJobCard key={job.id} task={job} convert={convert} applied={mySubmissions.includes(job.id)} />
              ))}
            </div>
            {totalPages > 1 && (
              <nav className="ui-pager" aria-label="Pages">
                <button className="ui-btn ui-btn-ghost" disabled={page === 1} onClick={() => goPage(page - 1)}><i className="ti ti-arrow-left" />Previous</button>
                <span>Page {page} of {totalPages}</span>
                <button className="ui-btn ui-btn-ghost" disabled={page === totalPages} onClick={() => goPage(page + 1)}>Next<i className="ti ti-arrow-right" /></button>
              </nav>
            )}
          </>
        )}

        {selectedJob && (
          <JobDetailModal
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onApply={(jid) => { setSelectedJob(null); navigate('/tasks/' + jid) }}
          />
        )}
      </div>
    </Layout>
  )
}
