import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useCurrency } from '../context/CurrencyContext'
import { useAuth } from '../context/AuthContext'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'
import { useToast } from '../components/Toast'
import { API_BASE, apiRequest } from '../lib/api'
import ApplyModal from '../components/ApplyModal'

const BRAND = 'var(--accent)'
const BRAND_LIGHT = 'rgba(var(--accent-rgb),0.10)'
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
          whiteSpace: "normal", width: 240, zIndex: 99, pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {text}
        </div>
      )}
    </span>
  );
}


function pad(n: number) { return String(n).padStart(2, '0') }

function linkifyText(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
  const withLinks = escaped.replace(
    /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi,
    (m) => {
      const href = m.startsWith('www.') ? 'https://' + m : m
      return '<a href="' + href + '" target="_blank" rel="noopener noreferrer" class="wjd-linkified">' + m + '</a>'
    }
  )
  return withLinks.replace(/\n/g, '<br />')
}

function toArray<T>(val: T | T[] | undefined | null, fallback: T[]): T[] {
  if (Array.isArray(val)) return val
  if (val !== undefined && val !== null && val !== '') return [val as T]
  return fallback
}

function useCountdown(deadline: number) {
  const calc = () => {
    const diff = deadline - Date.now()
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 }
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
  }, [deadline])
  return t
}

interface JobData {
  id: string
  title: string
  description: string
  creatorId: string
  brand: string
  brandHandle: string
  brandAvatar: string
  brandVerified: boolean
  category: string
  type: string
  platform: string
  reward: number
  currency: string
  usdEquiv: string
  slots: number
  slotsLeft: number
  completions: number
  deadline: number
  posted: string
  status: string
  difficulty: string
  estimatedTime: string
  steps: string[]
  requirements: string[]
  proofRequired: string[]
  tags: string[]
  approvalTime: string
  payoutDay: string
  totalPool: string
  similarJobs: any[]
  instructions: string
  posterId: string
  selectionType: string
  capacity: string
  potentialWinners: number
  winnersSelected: number
  maxEntries: number
  community: string
}

export default function JobDetail() {
  const { fmt, preferredCurrency, convert } = useCurrency()
  const { toast: showToast } = useToast()
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSubs, setShowSubs] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [showApplyWarning, setShowApplyWarning] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [bookmarked, setBookmarked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ogapay_bookmarked') || '[]').includes(id) } catch { return false }
  })
  const [error, setError] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportCategory, setReportCategory] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [reportMsg, setReportMsg] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  const { user: authUser, refreshUser } = useAuth()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [subsLoading, setSubsLoading] = useState(false)
  const countdown = useCountdown(job?.deadline || 0)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    const fetchJob = async () => {
      try {
        const res = await fetch(`${API_BASE}/tasks/${id}`)
        const json = await res.json()
        if (json.success && json.data) {
          const t = json.data.task || json.data
          setJob(formatTask(t))
        } else {
          const res2 = await fetch(`${API_BASE}/jobs/${id}`)
          const json2 = await res2.json()
          if (json2.success && json2.data) {
            setJob(formatTask(json2.data))
          } else {
            setError('Task not found')
          }
        }
      } catch {
        setError('Failed to load task')
      }
      setLoading(false)
    }
    fetchJob()
  }, [id])

  useEffect(() => { injectSkeletonStyles() }, [])

  useEffect(() => {
    if (!showSubs || !job?.id || !authUser) return
    const token = localStorage.getItem('ogapay_access_token')
    if (!token) return
    setSubsLoading(true)
    fetch(API_BASE + '/tasks/' + job.id + '/submissions', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(r => r.json())
      .then(json => {
        const data = json?.data || json?.submissions || []
        setSubmissions(Array.isArray(data) ? data : [])
      })
      .catch(() => setSubmissions([]))
      .finally(() => setSubsLoading(false))
  }, [showSubs, job?.id, authUser?.id])

  const [approving, setApproving] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)

  const handleApprove = async (subId: string) => {
    setApproving(subId)
    try {
      const token = localStorage.getItem('ogapay_access_token')
      if (!token) return
      const res = await fetch(API_BASE + '/tasks/submissions/' + subId + '/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ status: 'APPROVED' }),
      })
      const json = await res.json()
      if (json.success) {
        const apiApprovedAt = json.data?.approvedAt || json.approvedAt
        setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'APPROVED', _approvedAt: apiApprovedAt || Date.now() } : s))
        refreshUser()
      }
    } catch (e: any) { showToast(e?.message || 'Failed to approve submission', 'error') }
    setApproving(null)
  }

  const handleReject = async (subId: string) => {
    setRejecting(subId)
    try {
      const token = localStorage.getItem('ogapay_access_token')
      if (!token) return
      const res = await fetch(API_BASE + '/tasks/submissions/' + subId + '/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ posterNotes: '' }),
      })
      const json = await res.json()
      if (json.success) {
        setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'REJECTED' } : s))
        refreshUser()
      }
    } catch (e: any) { showToast(e?.message || 'Failed to reject submission', 'error') }
    setRejecting(null)
  }

  function timeAgo(dateStr: string | Date) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return mins + 'm ago'
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return hrs + 'h ago'
    return Math.floor(hrs / 24) + 'd ago'
  }

  function formatTask(t: any): JobData {
    const now = Date.now()
    const parsedDeadline = t.deadline
      ? typeof t.deadline === 'string'
        ? new Date(t.deadline).getTime()
        : Number(t.deadline)
      : now + 86400000 * 7
    const difficultyMap: Record<string, string> = {
      easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert',
      beginner: 'Easy', intermediate: 'Medium', advanced: 'Hard',
    }
    const slots = Number(t.maxParticipants) || Number(t.slots) || Number(t.maxEntries) || 100
    const filled = Number(t.completions) || Number(t.submissions) || 0
    const slotsLeft = Number(t.slotsLeft) || Number(t.remainingSlots) || Math.max(0, slots - filled)
    return {
      id: t.id || t._id || '',
      creatorId: t.posterId || t.creatorId || t.creator?.id || '',
      title: t.title || 'Untitled Task',
      description: t.description || t.instructions || '',
      brand: t.poster?.username || t.creatorName || t.brand || t.creator?.name || '',
      brandHandle: t.poster?.username || t.creatorHandle || t.brandHandle || '',
      brandAvatar: t.poster?.avatarUrl || t.creatorAvatar || t.brandAvatar || '',
      brandVerified: t.poster?.posterProfile?.isVerified || t.creatorVerified || false,
      category: t.category || 'Others / General',
      type: t.type || t.mode || 'challenge',
      platform: t.platform || 'OgaPay',
      reward: Number(t.reward) || Number(t.bounty) || Number(t.maxBudget) || 0,
      currency: t.currency || 'NGN',
      usdEquiv: t.usdEquiv || '',
      slots,
      slotsLeft,
      completions: filled,
      deadline: parsedDeadline,
      posted: t.createdAt || t.posted || new Date().toISOString(),
      status: t.status || 'open',
      difficulty: difficultyMap[t.difficulty?.toLowerCase()] || t.difficulty || 'Medium',
      estimatedTime: t.estimatedTime || '15 minutes',
      steps: toArray(t.steps, []),
      requirements: toArray(t.requirements || t.qualifications, []),
      proofRequired: toArray(t.proofRequired || t.proofInstructions, []),
      tags: toArray(t.tags || t.searchTags, []),
      approvalTime: t.approvalTime || '48 hours',
      payoutDay: t.payoutDay || 'Daily',
      totalPool: t.totalPool || 'N/A',
      similarJobs: Array.isArray(t.similarJobs) ? t.similarJobs.slice(0, 4) : [],
      instructions: t.instructions || t.description || '',
      posterId: t.poster?.id || '',
      selectionType: t.selectionType || t.selection || 'Random',
      capacity: `${filled} / ${slots}`,
      potentialWinners: slots,
      winnersSelected: filled,
      maxEntries: slots,
      community: t.community || 'All',
    }
  }

  const handleBookmark = async () => {
    const newState = !bookmarked
    setBookmarked(newState)
    try {
      if (newState) {
        await apiRequest(`/users/bookmarks/${job!.id}`, { method: 'POST' })
      } else {
        await apiRequest(`/users/bookmarks/${job!.id}`, { method: 'DELETE' })
      }
      const stored = JSON.parse(localStorage.getItem('ogapay_bookmarked') || '[]')
      if (newState) {
        if (!stored.includes(job!.id)) stored.push(job!.id)
      } else {
        const idx = stored.indexOf(job!.id)
        if (idx >= 0) stored.splice(idx, 1)
      }
      localStorage.setItem('ogapay_bookmarked', JSON.stringify(stored))
    } catch { }
  }

  const isMyTask = user?.id && job?.posterId === user.id

  const handleSubmitReport = async () => {
    if (!reportCategory) { setReportMsg('Please select a category'); return }
    if (!reportDesc.trim()) { setReportMsg('Please describe the issue'); return }
    setReportMsg('')
    setReportSubmitting(true)
    try {
      await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (localStorage.getItem('ogapay_access_token') || '') },
        body: JSON.stringify({ category: reportCategory, description: reportDesc, targetType: 'task', targetId: job?.id }),
      })
      setReportMsg('Report submitted. Our team will review it within 24 hours.')
      setReportCategory('')
      setReportDesc('')
      setTimeout(() => { setShowReportModal(false); setReportMsg('') }, 2500)
    } catch {
      setReportMsg('Failed to submit report')
    }
    setReportSubmitting(false)
  }

  if (loading) return <Layout><SkeletonPage /></Layout>
  if (error || !job) return <ErrorState message={error || 'Task not found'} onBack={() => navigate(-1)} />

  const isOpen = ['open', 'active', 'published'].includes(String(job.status || '').toLowerCase())
  const canManage = Boolean(authUser && (job.creatorId === authUser.id || job.posterId === authUser.id || isMyTask))

  return (
    <WurkJobDetailView
      job={job}
      fmt={fmt}
      convert={convert}
      navigate={navigate}
      countdown={countdown}
      showSubs={showSubs}
      setShowSubs={setShowSubs}
      isOpen={isOpen}
      canManage={canManage}
      bookmarked={bookmarked}
      handleBookmark={handleBookmark}
      showApply={showApply}
      setShowApply={setShowApply}
      showApplyWarning={showApplyWarning}
      setShowApplyWarning={setShowApplyWarning}
      showShare={showShare}
      setShowShare={setShowShare}
      showInfo={showInfo}
      setShowInfo={setShowInfo}
      showReportModal={showReportModal}
      setShowReportModal={setShowReportModal}
      reportCategory={reportCategory}
      setReportCategory={setReportCategory}
      reportDesc={reportDesc}
      setReportDesc={setReportDesc}
      reportMsg={reportMsg}
      setReportMsg={setReportMsg}
      reportSubmitting={reportSubmitting}
      handleSubmitReport={handleSubmitReport}
      submissions={submissions}
      subsLoading={subsLoading}
      approving={approving}
      rejecting={rejecting}
      handleApprove={handleApprove}
      handleReject={handleReject}
      timeAgo={timeAgo}
      authUser={authUser}
    />
  )
}

/* ── Error State ── */
function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '0 16px' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(var(--red-rgb),0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#dc2626' }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>{message || 'Task not found'}</h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 20px', lineHeight: 1.5 }}>The task you're looking for doesn't exist or has been removed.</p>
          <button onClick={onBack} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: BRAND, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Go Back</button>
        </div>
      </div>
    </Layout>
  )
}

/* ── Main View ── */
function WurkJobDetailView(props: any) {
  const {
    job, fmt, convert, navigate, countdown, showSubs, setShowSubs, isOpen, canManage,
    bookmarked, handleBookmark, showApply, setShowApply, showApplyWarning, setShowApplyWarning,
    showShare, setShowShare, showInfo, setShowInfo,
    showReportModal, setShowReportModal, reportCategory, setReportCategory,
    reportDesc, setReportDesc, reportMsg, setReportMsg, reportSubmitting, handleSubmitReport,
    submissions, subsLoading, approving, rejecting, handleApprove, handleReject, timeAgo, authUser,
  } = props

  const agentName = job.brand || 'OgaPay'
  const agentInitial = agentName.slice(0, 2).toUpperCase()
  const rewardAmount = Number(job.reward || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
  const currencyMap: Record<string, string> = { USD: 'USDC', USDC: 'USDC', NGN: 'NGN', SOL: 'SOL' }
  const rewardCurrency = currencyMap[job.currency] || 'NGN'
  const rewardUsdLine = job.usdEquiv || (rewardCurrency !== 'USDC' ? (() => { const v = convert(Number(job.reward), rewardCurrency as any, 'USDC' as any); return v && !isNaN(v) ? `$ ${v.toFixed(2)} USD` : '' })() : '')
  const description = job.description || job.instructions || 'No description provided.'
  const profileHandle = (job.brandHandle || job.brand || '').replace('@', '')
  const handleText = job.brandHandle ? `@${job.brandHandle}` : 'Review the instructions carefully and only apply if you can add real value.'

  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [targetLang, setTargetLang] = useState('es')
  const [translating, setTranslating] = useState(false)
  const [transError, setTransError] = useState('')
  const [showTranslatePicker, setShowTranslatePicker] = useState(false)
  const [selectedSub, setSelectedSub] = useState<any | null>(null)

  const LANGUAGES = [
    { code: 'es', label: 'Spanish' }, { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' }, { code: 'pt', label: 'Portuguese' },
    { code: 'it', label: 'Italian' }, { code: 'nl', label: 'Dutch' },
    { code: 'ja', label: 'Japanese' }, { code: 'ko', label: 'Korean' },
    { code: 'zh', label: 'Chinese' }, { code: 'ar', label: 'Arabic' },
    { code: 'hi', label: 'Hindi' }, { code: 'tr', label: 'Turkish' },
    { code: 'ru', label: 'Russian' }, { code: 'pl', label: 'Polish' },
    { code: 'sv', label: 'Swedish' }, { code: 'da', label: 'Danish' },
    { code: 'fi', label: 'Finnish' }, { code: 'th', label: 'Thai' },
    { code: 'vi', label: 'Vietnamese' }, { code: 'id', label: 'Indonesian' },
  ]

  const translateDescription = async (lang: string) => {
    setTargetLang(lang)
    if (translatedText && targetLang === lang) return
    const reqText = job.requirements.length > 0 ? '\n\nRequirements:\n' + job.requirements.join('\n') : ''
    const text = description + '\n\n' + job.steps.join('\n') + reqText
    if (!text.trim()) return
    setTranslating(true)
    setTransError('')
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Translation failed')
      const data = await res.json()
      setTranslatedText(data[0].map((s: any) => s[0]).join(''))
    } catch {
      setTransError('Translation unavailable. Try again later.')
    }
    setTranslating(false)
  }

  const countdownStr = countdown.d > 0
    ? `${countdown.d}d ${countdown.h}h ${pad(countdown.m)}m ${pad(countdown.s)}s`
    : `${pad(countdown.m)}m ${pad(countdown.s)}s`

  return (
    <Layout>
      <style>{`
        @keyframes oga-sweep{0%{background-position:-200% center}to{background-position:200% center}}
        .wjd{background:var(--bg,#f9fafb);color:var(--text,#1f2937);font-family:Inter,'DM Sans',system-ui,sans-serif;padding:20px 0 60px;min-height:100vh}
        .wjd-wrap{width:min(100% - 32px,900px);margin:0 auto}
        .wjd-panel{background:var(--card,#fff);border:0.5px solid var(--border,#e5e7eb);border-radius:18px}
        .wjd-back{display:inline-flex;align-items:center;gap:8px;height:38px;border:0.5px solid var(--border,#e5e7eb);border-radius:10px;background:var(--card,#fff);color:var(--text2,#475569);padding:0 14px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:16px;font-family:inherit}
        .wjd-agent{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:20px 24px;margin-bottom:16px}
        .wjd-agent-left{display:flex;align-items:flex-start;gap:16px;min-width:0}
        .wjd-avatar{display:grid;place-items:center;overflow:hidden;background:linear-gradient(145deg,rgba(var(--accent-rgb),.10),rgba(16,185,129,.14));color:#0f172a;font-weight:900;border:0.5px solid var(--border,#e5e7eb);flex:0 0 auto;width:52px;height:52px;border-radius:50%;font-size:18px}
        .wjd-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
        .wjd-kicker{color:var(--text3,#9ca3af);letter-spacing:.1em;text-transform:uppercase;font-weight:700;font-size:10px;margin-bottom:4px}
        .wjd-name{display:flex;align-items:center;gap:8px;color:var(--text,#0f172a);font-size:18px;font-weight:900;line-height:1.2;margin-bottom:3px}
        .wjd-handle{color:var(--text2,#6b7280);font-size:13px;font-weight:500}
        .wjd-mark{display:grid;place-items:center;width:20px;height:20px;border-radius:5px;background:var(--accent);color:#fff;font-size:10px;font-weight:900}
        .wjd-actions-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex-shrink:0}
        .wjd-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:100px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
        .wjd-badge-open{background:rgba(var(--green-rgb),0.12);border:1px solid rgba(var(--green-rgb),0.3);color:var(--green)}
        .wjd-badge-closed{background:rgba(100,116,139,0.12);color:var(--text2)}
        .wjd-dot{width:8px;height:8px;border-radius:50%;background:#059669;display:inline-block;animation:wjdPulse 1.8s ease-in-out infinite}
        .wjd-link{border:0;background:transparent;color:var(--text2,#6b7280);cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:13px;font-family:inherit;padding:6px 10px;border-radius:8px}
        .wjd-link:hover{background:var(--bg,#f3f4f6)}
        .wjd-sep{color:var(--border,#d1d5db);font-size:18px;user-select:none}
        .wjd-icon-btn{width:34px;height:34px;border:0.5px solid var(--border,#e5e7eb);border-radius:8px;background:var(--card,#fff);cursor:pointer;display:grid;place-items:center;color:var(--text2,#6b7280)}

        .wjd-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        .wjd-meta{padding:20px 22px 22px}
        .wjd-title{display:flex;align-items:center;gap:8px;color:var(--text3,#6b7280);font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin-bottom:16px}
        .wjd-rows{display:grid;gap:12px}
        .wjd-row{display:grid;grid-template-columns:130px minmax(0,1fr);gap:12px;align-items:start}
        .wjd-label{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--text3,#9ca3af);font-weight:700;padding-top:2px}
        .wjd-value{color:var(--text,#0f172a);font-size:14px;font-weight:600}
        .wjd-open-val{display:inline-flex;align-items:center;gap:7px;color:#047857}

        .wjd-reward{display:flex;align-items:center;justify-content:center;gap:20px;padding:20px 24px;margin-bottom:16px;background:rgba(var(--accent-rgb),0.06);border-color:rgba(var(--accent-rgb),0.18)}
        .wjd-dollar{width:42px;height:42px;border-radius:12px;background:rgba(var(--accent-rgb),0.10);color:var(--accent);display:grid;place-items:center;font-size:18px;font-weight:900;flex-shrink:0}
        .wjd-reward-title{color:var(--text3,#6b7280);font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin-bottom:6px}
        .wjd-amount{background:linear-gradient(90deg,var(--accent),var(--accent),var(--accent),var(--accent),var(--accent));background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:oga-sweep 4s linear infinite;font-size:clamp(28px,4vw,36px);font-weight:900;display:inline-block}
        .wjd-token{background:linear-gradient(90deg,var(--accent),var(--accent),var(--accent));background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:oga-sweep 4s linear infinite;font-size:14px;font-weight:900;margin-left:8px;display:inline-block}
        .wjd-usd{color:var(--text3,#64748b);font-size:12px;font-weight:600;letter-spacing:.06em;margin-top:3px}

        .wjd-desc{padding:20px 24px 22px;margin-bottom:16px}
        .wjd-desc-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--text2,#0f172a);text-transform:uppercase;letter-spacing:.08em;padding-bottom:14px;border-bottom:1px solid var(--border,#e5e7eb);margin-bottom:18px}
        .wjd-body{color:var(--text2,#374151);font-size:14px;line-height:1.65;white-space:pre-wrap}
        .wjd-linkified{color:var(--accent);text-decoration:underline;word-break:break-word;cursor:pointer}
        .wjd-linkified:hover{opacity:.8}
        .wjd-sub-title{color:var(--text,#0f172a);font-size:15px;font-weight:700;margin:18px 0 8px}
        .wjd-list{margin:0;padding-left:20px;color:var(--text2,#374151);font-size:14px;line-height:1.65;display:grid;gap:4px}

        .wjd-translate-row{display:flex;justify-content:flex-end;margin-top:14px}
        .wjd-translate-btn{background:none;border:none;color:var(--text3,#9ca3af);cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;display:inline-flex;align-items:center;gap:5px}

        .wjd-subs-panel{padding:20px 24px;margin-bottom:12px}
        .wjd-sub-list{display:grid;gap:10px}
        .wjd-sub-item{display:flex;gap:12px;padding:14px 16px;border:0.5px solid var(--border,#e5e7eb);border-radius:12px;background:var(--bg,#f8fafc);cursor:pointer}
        .wjd-sub-avatar{width:36px;height:36px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:900;flex-shrink:0}
        .wjd-sub-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}
        .wjd-sub-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .wjd-ok{height:30px;border-radius:8px;padding:0 14px;font-size:12px;font-weight:700;cursor:pointer;border:0;background:var(--green);color:#fff;font-family:inherit}
        .wjd-no{height:30px;border-radius:8px;padding:0 14px;font-size:12px;font-weight:700;cursor:pointer;border:0.5px solid var(--border,#e5e7eb);background:var(--card,#fff);color:#dc2626;font-family:inherit}
        .wjd-empty{text-align:center;padding:28px 0;color:var(--text2,#64748b);font-size:14px}

        .wjd-action-bar{display:flex;gap:12px;padding:12px 0 0;border-top:0.5px solid var(--border,#e5e7eb);margin-top:18px}
        .wjd-primary,.wjd-secondary{min-height:44px;border:0;border-radius:12px;background:var(--accent);color:#fff;padding:0 28px;display:inline-flex;align-items:center;justify-content:center;gap:9px;font-size:13px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:.04em;font-family:inherit}
        .wjd-primary:disabled{background:var(--border,#cbd5e1);color:var(--text3,#64748b);cursor:not-allowed}
        .wjd-secondary{min-width:200px}
        .wjd-signin-card{background:var(--card,#fff);border:0.5px solid var(--border,#e5e7eb);border-radius:18px;padding:28px 24px;text-align:center;margin-top:18px}
        .wjd-signin-icon{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:rgba(var(--accent-rgb),0.06);color:var(--accent,var(--accent));margin-bottom:14px}
        .wjd-signin-text{font-size:14px;color:var(--text2,#475569);line-height:1.5;margin-bottom:16px}

        .wjd-sticky-bar{position:sticky;bottom:calc(var(--bottom-nav-h) + env(safe-area-inset-bottom,0px));z-index:10;background:var(--card,#fff);border-top:0.5px solid var(--border,#e5e7eb);padding:10px 0;margin-top:0;display:flex;gap:12px}

        /* Info panel overlay */
        .wjd-info-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.4);display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;overflow-y:auto;-webkit-overflow-scrolling:touch}
        .wjd-info-panel{background:var(--card,#fff);border-radius:18px;width:100%;max-width:680px;max-height:85vh;overflow-y:auto;-webkit-overflow-scrolling:touch;border:0.5px solid var(--border,#e5e7eb);box-shadow:0 24px 60px rgba(0,0,0,0.18)}
        .wjd-info-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:var(--bg,#f3f4f6);border-radius:18px 18px 0 0;position:sticky;top:0;border-bottom:0.5px solid var(--border,#e5e7eb)}
        .wjd-info-header-title{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:var(--text,#0f172a)}
        .wjd-info-close{width:30px;height:30px;border-radius:8px;background:var(--card,#fff);border:0.5px solid var(--border,#e5e7eb);display:grid;place-items:center;cursor:pointer;color:var(--text2,#6b7280)}
        .wjd-info-body{padding:20px 24px 28px}
        .wjd-info-how-box{background:rgba(var(--accent-rgb),0.05);border:0.5px solid rgba(var(--accent-rgb),0.15);border-radius:14px;padding:16px 18px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
        .wjd-info-how-title{font-size:14px;font-weight:700;color:var(--text,#0f172a);margin-bottom:5px}
        .wjd-info-how-sub{font-size:13px;color:var(--text2,#374151);line-height:1.6}
        .wjd-info-how-hint{font-size:11px;color:var(--text3,#9ca3af);cursor:pointer;white-space:nowrap;padding-top:2px;flex-shrink:0}
        .wjd-config-strip{display:grid;grid-template-columns:1fr 1fr 1fr;border:0.5px solid var(--border,#e5e7eb);border-radius:12px;overflow:hidden;margin-bottom:24px}
        .wjd-config-cell{padding:12px 16px;border-right:0.5px solid var(--border,#e5e7eb)}
        .wjd-config-cell:last-child{border-right:none}
        .wjd-config-cell-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text3,#9ca3af);font-weight:700;margin-bottom:5px}
        .wjd-config-cell-value{font-size:14px;font-weight:700;color:var(--text,#0f172a)}
        .wjd-info-section-title{font-size:15px;font-weight:700;color:var(--text,#0f172a);margin-bottom:4px}
        .wjd-info-section-sub{font-size:13px;color:var(--text2,#6b7280);margin-bottom:12px}
        .wjd-info-row{display:grid;grid-template-columns:160px 1fr;gap:14px;padding:13px 0;border-top:0.5px solid var(--border,#f1f5f9)}
        .wjd-info-row-label{font-size:13px;font-weight:700;color:var(--text,#0f172a)}
        .wjd-info-row-val{font-size:13px;color:var(--text2,#374151);line-height:1.6}
        .wjd-open-notice{border:0.5px solid var(--border,#e5e7eb);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--text2,#6b7280);margin:16px 0}
        .wjd-important-box{background:rgba(109,40,217,0.06);border:0.5px solid rgba(109,40,217,0.2);border-radius:10px;padding:12px 16px;margin:12px 0;font-size:13px;color:var(--text2,#374151);line-height:1.6;display:flex;gap:10px;align-items:flex-start}
        .wjd-important-icon{color:#7c3aed;font-size:16px;flex-shrink:0;padding-top:1px}
        .wjd-how-steps{padding-left:18px;margin-top:8px;display:grid;gap:5px}
        .wjd-how-steps li{font-size:13px;color:var(--text2,#374151);line-height:1.6}
        .wjd-current-config{border:0.5px solid var(--border,#e5e7eb);border-radius:10px;padding:12px 16px;margin-top:16px;font-size:13px;color:var(--text2,#6b7280)}

        /* Modals */
        .wjd-modal-bg{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;background:rgba(0,0,0,.5);padding:20px}
        .wjd-before,.wjd-report-modal{width:min(94vw,540px);background:var(--card,#fff);color:var(--text,#0f172a);border-radius:18px;box-shadow:0 30px 70px rgba(0,0,0,0.2);overflow:hidden}
        .wjd-before{padding:24px 26px}
        .wjd-modal-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}
        .wjd-before-title{font-size:17px;font-weight:900}
        .wjd-close-btn{width:32px;height:32px;border:0;background:transparent;color:var(--text2,#6b7280);display:grid;place-items:center;cursor:pointer;border-radius:8px;font-size:16px}
        .wjd-before-copy{font-size:14px;margin-bottom:12px;color:var(--text2,#374151);line-height:1.5}
        .wjd-before-list{margin:0 0 22px;padding-left:22px;color:var(--text,#1f2937);font-size:13px;line-height:1.6;display:grid;gap:5px}
        .wjd-before-actions{display:flex;justify-content:flex-end}
        .wjd-understand{min-width:200px;min-height:44px;border-radius:12px;border:0;background:var(--accent);color:#fff;font-size:13px;font-weight:700;text-transform:uppercase;cursor:pointer;font-family:inherit}
        .wjd-report-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:0.5px solid var(--border,#e5e7eb)}
        .wjd-report-body{padding:18px 20px 22px}
        .wjd-report-label{display:block;color:var(--text,#0f172a);font-size:13px;font-weight:700;margin-bottom:6px}
        .wjd-report-input{width:100%;border:0.5px solid var(--border,#e5e7eb);border-radius:10px;background:var(--bg,#f8fafc);color:var(--text,#0f172a);font-size:14px;padding:10px 12px;margin-bottom:14px;font-family:inherit;outline:none}
        .wjd-report-actions{display:flex;gap:10px}
        .wjd-report-cancel,.wjd-report-submit{flex:1;border-radius:10px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
        .wjd-report-cancel{border:0.5px solid var(--border,#e5e7eb);background:var(--bg,#f8fafc);color:var(--text2,#475569)}
        .wjd-report-submit{border:0;background:#dc2626;color:#fff}
        .wjd-report-submit:disabled{background:var(--border,#cbd5e1);cursor:not-allowed}

        @media(max-width:640px){
          .wjd{padding:12px 0 40px}
          .wjd-wrap{width:min(100% - 24px,900px)}
          .wjd-agent{flex-direction:column;gap:12px;padding:18px 20px}
          .wjd-grid{grid-template-columns:1fr;gap:10px}
          .wjd-reward{flex-direction:column;text-align:center;gap:12px;padding:20px 18px}
          .wjd-dollar{margin:0 auto}
          .wjd-row{grid-template-columns:110px 1fr}
          .wjd-desc{padding:20px 18px 22px}
          .wjd-action-bar,.wjd-sticky-bar{flex-direction:column;gap:10px}
          .wjd-primary,.wjd-secondary{width:100%;min-width:unset}
          .wjd-info-row{grid-template-columns:1fr}
          .wjd-config-strip{grid-template-columns:1fr 1fr}
          .wjd-config-cell{border-bottom:0.5px solid var(--border,#e5e7eb)}
          .wjd-config-cell:nth-child(odd){border-right:0.5px solid var(--border,#e5e7eb)}
          .wjd-config-cell:last-child{border-bottom:none;border-right:none}
        }
        @keyframes wjdPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)}70%{box-shadow:0 0 0 7px rgba(34,197,94,0)}}
        .wjd-actions-top{gap:12px}
        .wjd-agent{border:1px solid var(--border,#e5e7eb)}
        .wjd-avatar{border:2px solid var(--border,#e5e7eb)}
        .wjd-link:hover{background:var(--bg,#f3f4f6)}
        .wjd-icon-btn{width:34px;height:34px;border:none;border-radius:8px;background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--text2,#6b7280)}
        .wjd-icon-btn:hover{background:var(--bg,#f3f4f6)}
        .wjd-reward{background:rgba(var(--accent-rgb),0.06);border:1px solid rgba(var(--accent-rgb),0.18);border-radius:20px;padding:28px 32px;text-align:center}
        .wjd-reward-title{color:var(--accent);font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin-bottom:12px}
        .wjd-amount{font-size:52px;font-weight:900;color:var(--text);line-height:1;background:none!important;-webkit-background-clip:unset!important;background-clip:unset!important;-webkit-text-fill-color:unset!important;animation:none!important}
        .wjd-token{font-size:18px;font-weight:700;color:var(--text2);margin-left:4px;background:none!important;-webkit-background-clip:unset!important;background-clip:unset!important;-webkit-text-fill-color:unset!important;animation:none!important}
        .wjd-usd{color:var(--text3);font-size:14px;font-weight:600;margin-top:8px}
        .wjd-meta{border:1px solid var(--border,#e5e7eb);padding:24px}
        .wjd-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3,#9ca3af);display:flex;align-items:center;gap:8px;margin-bottom:16px}
        .wjd-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border,#e5e7eb)}
        .wjd-row:last-child{border-bottom:none}
        .wjd-label{font-size:12px;font-weight:600;color:var(--text3,#9ca3af);text-transform:uppercase}
        .wjd-value{font-size:14px;font-weight:700;color:var(--text,#0f172a)}
        .wjd-signin-card{background:var(--card,#fff);border:1px solid var(--border,#e5e7eb);border-radius:16px;padding:28px 24px;text-align:center;margin-top:18px}
        .wjd-signin-text{font-size:15px;font-weight:600;color:var(--text2,#475569);margin-bottom:16px}
        @media(max-width:700px){
          .wjd-amount{font-size:36px}
          .wjd-token{font-size:15px}
        }
        [data-theme="dark"] .wjd-panel {
          background: var(--card) !important;
          border-color: var(--border) !important;
        }
        [data-theme="dark"] .wjd-back {
          background: var(--card) !important;
          border-color: var(--border) !important;
          color: var(--text2) !important;
        }
        [data-theme="dark"] .wjd-avatar {
          color: var(--text) !important;
          border-color: var(--border) !important;
        }
        [data-theme="dark"] .wjd-name {
          color: var(--text) !important;
        }
        [data-theme="dark"] .wjd-handle {
          color: var(--text2) !important;
        }
        [data-theme="dark"] .wjd-mark {
          background: var(--accent) !important;
        }
        [data-theme="dark"] .wjd-amount {
          -webkit-text-fill-color: #ffffff !important;
          color: #ffffff !important;
          background: none !important;
          animation: none !important;
        }
        [data-theme="dark"] .wjd-token {
          -webkit-text-fill-color: #ffffff !important;
          color: #ffffff !important;
          background: none !important;
          animation: none !important;
        }
        [data-theme="dark"] .wjd-reward {
          background: #1e1e1e !important;
          border-color: rgba(255,255,255,0.08) !important;
        }
        [data-theme="dark"] .wjd-dollar {
          background: rgba(255,255,255,0.06) !important;
          color: #ffffff !important;
        }
        [data-theme="dark"] .wjd-usd {
          color: var(--text3) !important;
        }
        [data-theme="dark"] .wjd-value {
          color: var(--text) !important;
        }
        [data-theme="dark"] .wjd-open-val {
          color: #34D399 !important;
        }
        [data-theme="dark"] .wjd-link {
          color: var(--text2) !important;
        }
        [data-theme="dark"] .wjd-link:hover {
          background: rgba(255,255,255,0.06) !important;
        }
        [data-theme="dark"] .wjd-icon-btn {
          background: var(--card) !important;
          border-color: var(--border) !important;
          color: var(--text2) !important;
        }
        [data-theme="dark"] .wjd-primary {
          background: var(--accent) !important;
        }
        [data-theme="dark"] .wjd-info-section-title {
          color: var(--text) !important;
        }
        [data-theme="dark"] .wjd-info-section-sub {
          color: var(--text2) !important;
        }
        [data-theme="dark"] .wjd-info-row-label {
          color: var(--text) !important;
        }
        [data-theme="dark"] .wjd-info-row-val {
          color: var(--text2) !important;
        }
        [data-theme="dark"] .wjd-data-box {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      `}
</style>

      <div className="wjd">
        <div className="wjd-wrap">
          <button className="wjd-back" type="button" onClick={() => navigate(-1)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>

          {/* ── Creator Panel ── */}
          <section className="wjd-panel wjd-agent">
            <div className="wjd-agent-left">
              <div className="wjd-avatar">
                {job.brandAvatar ? <img src={job.brandAvatar} alt="" /> : agentInitial}
              </div>
              <div>
                <div className="wjd-kicker">Listed by</div>
                <div className="wjd-name">
                  {agentName}
                  
                </div>
                <div className="wjd-handle">{handleText}</div>
              </div>
            </div>
            <div className="wjd-actions-top">
              <span className={`wjd-badge ${isOpen ? 'wjd-badge-open' : 'wjd-badge-closed'}`}>
                <span className="wjd-dot" style={{ background: isOpen ? 'var(--green)' : '#94a3b8' }} />
                {isOpen ? 'Open' : 'Closed'}
              </span>
              <button className="wjd-link" type="button" onClick={() => setShowReportModal(true)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                Report
              </button>
              <span className="wjd-sep">|</span>
              <button className="wjd-link" type="button" onClick={() => setShowInfo(true)}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                Info
              </button>
              <span className="wjd-sep">|</span>
              <button className="wjd-icon-btn" type="button" onClick={handleBookmark} aria-label="Bookmark">
                {bookmarked
                  ? <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                  : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>}
              </button>
            </div>
          </section>

          {/* ── Config + Participation Grid ── */}
          <section className="wjd-grid">
            <div className="wjd-panel wjd-meta">
              <div className="wjd-title">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                Configuration
              </div>
              <div className="wjd-rows">
                <div className="wjd-row">
                  <div className="wjd-label">Status</div>
                  <div className="wjd-value wjd-open-val"><span className="wjd-dot" style={{ background: isOpen ? 'var(--green)' : '#94a3b8', border: `1.5px solid ${isOpen ? 'rgba(var(--green-rgb),0.8)' : '#64748b'}` }} />{isOpen ? 'Open' : 'Closed'}</div>
                </div>
                <div className="wjd-row"><div className="wjd-label">Mode</div><div className="wjd-value">{job.type || 'challenge'}</div></div>
                <div className="wjd-row"><div className="wjd-label">Selection type</div><div className="wjd-value">{job.selectionType || 'Random'}</div></div>
                <div className="wjd-row"><div className="wjd-label">Closes in</div><div className="wjd-value" style={{ fontVariantNumeric: 'tabular-nums' }}>{countdownStr}</div></div>
                <div className="wjd-row"><div className="wjd-label">Category</div><div className="wjd-value">{job.category}</div></div>
              </div>
            </div>
            <div className="wjd-panel wjd-meta">
              <div className="wjd-title">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                Participation
              </div>
              <div className="wjd-rows">
                <div className="wjd-row"><div className="wjd-label">Community</div><div className="wjd-value">{job.community || 'All'}</div></div>
                <div className="wjd-row"><div className="wjd-label">Max entries</div><div className="wjd-value">{job.maxEntries >= 100 ? 'Unlimited' : job.maxEntries}</div></div>
                <div className="wjd-row"><div className="wjd-label">Capacity</div><div className="wjd-value">{job.capacity}</div></div>
                <div className="wjd-row"><div className="wjd-label">Potential winners</div><div className="wjd-value">{job.potentialWinners}</div></div>
                <div className="wjd-row"><div className="wjd-label">Winners selected</div><div className="wjd-value">{job.winnersSelected}</div></div>
              </div>
            </div>
          </section>

          {/* ── Reward ── */}
          <section className="wjd-panel wjd-reward">
              <div className="wjd-reward-title">Reward per winner</div>
              <div>
                <span className="wjd-amount">{rewardAmount}</span>
                <span className="wjd-token">{rewardCurrency}</span>
              </div>
              {rewardUsdLine && <div className="wjd-usd">{rewardUsdLine}</div>}
          </section>

          {/* ── CATEGORY | RANK | REQ ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text2, #6b7280)', fontWeight: 600, padding: '4px 0', marginTop: -8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span>{(job.category || job.jobType || job.job_type || 'Custom').replace(/_/g, ' ').toLowerCase().replace(/\w/g, (l: string) => l.toUpperCase())}</span>
            {(job.rankRequired || job.minRank) && <><span style={{ color: 'var(--border2, #d1d5db)' }}>|</span><span>Rank {job.rankRequired || job.minRank}</span></>}
            {job.workerRequirement && <><span style={{ color: 'var(--border2, #d1d5db)' }}>|</span><span>Req: {job.workerRequirement}</span></>}
          </div>

          {/* ── Description ── */}
          <section className="wjd-panel wjd-desc">
            <div className="wjd-desc-title">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
              Description
            </div>

            <div className="wjd-body" dangerouslySetInnerHTML={{ __html: linkifyText(description) }} />

            {job.steps.length > 0 && (
              <>
                <div className="wjd-sub-title">Steps</div>
                <ul className="wjd-list">{job.steps.map((step: string, i: number) => <li key={i} dangerouslySetInnerHTML={{ __html: linkifyText(step) }} />)}</ul>
              </>
            )}

            {translatedText && (
              <div style={{ marginTop: 20, padding: 18, background: 'rgba(var(--accent-rgb),0.04)', border: '0.5px solid rgba(var(--accent-rgb),0.15)', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {LANGUAGES.find(l => l.code === targetLang)?.label || targetLang.toUpperCase()} Translation
                  </span>
                  <button type="button" onClick={() => setTranslatedText(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                    Show original
                  </button>
                </div>
                <div className="wjd-body" dangerouslySetInnerHTML={{ __html: linkifyText(translatedText) }} />
              </div>
            )}

            {job.requirements.length > 0 && (
              <>
                <div className="wjd-sub-title">Requirements</div>
                <ul className="wjd-list">{job.requirements.map((item: string, i: number) => <li key={i} dangerouslySetInnerHTML={{ __html: linkifyText(item) }} />)}</ul>
              </>
            )}

            <div className="wjd-translate-row">
              <button type="button" className="wjd-translate-btn" onClick={() => setShowTranslatePicker(!showTranslatePicker)}>
                Translate {showTranslatePicker ? '\u25B2' : '\u25BC'}
              </button>
            </div>
            {showTranslatePicker && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <select value={targetLang} onChange={e => { setTargetLang(e.target.value); translateDescription(e.target.value) }} disabled={translating} style={{ height: 30, padding: '0 8px', borderRadius: 6, border: '0.5px solid var(--border,#e5e7eb)', background: 'var(--card,#fff)', color: 'var(--text,#0f172a)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                {translating && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700 }}>Translating...</span>}
                {transError && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>{transError}</span>}
              </div>
            )}

            {!authUser ? (
              <div className="wjd-signin-card">
                <div className="wjd-signin-text">Sign in to apply for this task</div>
                <button className="wjd-primary" type="button" onClick={() => navigate('/login')} style={{ width: '100%', maxWidth: 300 }}>
                  Sign In
                </button>
              </div>
            ) : (
              <div className="wjd-action-bar">
                <button className="wjd-primary" type="button" disabled={!canManage && !isOpen}
                  onClick={() => canManage ? navigate('/manage-jobs') : setShowApplyWarning(true)}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  {canManage ? 'Manage Submissions' : isOpen ? 'Apply' : 'Job Closed'}
                </button>
                <button className="wjd-secondary" type="button" onClick={() => setShowSubs(!showSubs)}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  {showSubs ? 'Hide Submissions' : 'View Submissions'}
                </button>
              </div>
            )}
          </section>

          {/* ── Submissions Panel ── */}
          {showSubs && (
            <section className="wjd-panel wjd-subs-panel">
              <div className="wjd-title">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                Submissions
              </div>
              {canManage ? (
                subsLoading
                  ? <div className="wjd-empty">Loading submissions...</div>
                  : submissions.length === 0
                    ? <div className="wjd-empty">No submissions yet. They will appear here once workers submit their work.</div>
                    : (
                      <div className="wjd-sub-list">
                        {submissions.map((sub: any) => (
                          <div className="wjd-sub-item" key={sub.id} onClick={() => setSelectedSub(sub)}>
                            <div className="wjd-sub-avatar">
                              {sub.worker?.avatarUrl ? <img src={sub.worker.avatarUrl} alt="" /> : (sub.worker?.username || 'U')[0].toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: 'var(--text,#0f172a)', fontSize: 14, fontWeight: 700 }}>{sub.worker?.username || sub.worker?.firstName || 'Anonymous'}</div>
                              <div style={{ color: 'var(--text2,#475569)', fontSize: 13 }}>{sub.workerNotes || 'No message'}</div>
                              {sub.proof && (
                                sub.proof.startsWith('http://') || sub.proof.startsWith('https://')
                                  ? <a href={sub.proof} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 12, wordBreak: 'break-all', textDecoration: 'underline' }}>{sub.proof}</a>
                                  : <div style={{ color: 'var(--accent)', fontSize: 12, wordBreak: 'break-all' }}>{sub.proof}</div>
                              )}
                              <div className="wjd-sub-actions" onClick={(e: any) => e.stopPropagation()}>
                                {sub.status === 'SUBMITTED' && (
                                  <>
                                    <button className="wjd-ok" type="button" onClick={() => handleApprove(sub.id)} disabled={approving === sub.id}>{approving === sub.id ? 'Approving...' : 'Approve'}</button>
                                    <button className="wjd-no" type="button" onClick={() => handleReject(sub.id)} disabled={rejecting === sub.id}>{rejecting === sub.id ? 'Rejecting...' : 'Reject'}</button>
                                  </>
                                )}
                                {sub.status === 'APPROVED' && (sub._approvedAt || sub.approvedAt) ? <PayoutCountdown approvedAt={sub._approvedAt || sub.approvedAt} /> : sub.status === 'APPROVED' ? <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>✓ Approved</span> : null}
                                {sub.status === 'REJECTED' && <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 700 }}><i className="ti ti-circle-x" /> Rejected</span>}
                                <span style={{ color: 'var(--text3,#94a3b8)', fontSize: 12, marginLeft: 'auto' }}>{timeAgo(sub.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
              ) : (
                <div className="wjd-empty">Only the task creator can view submissions.</div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* ── Info Panel Overlay (wurk.fun style) ── */}
      {showInfo && (
        <div className="wjd-info-overlay" onClick={() => setShowInfo(false)}>
          <div className="wjd-info-panel" onClick={(e: any) => e.stopPropagation()}>
            <div className="wjd-info-header">
              <div className="wjd-info-header-title">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                About Custom Jobs
              </div>
              <button className="wjd-info-close" type="button" onClick={() => setShowInfo(false)} aria-label="Close">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="wjd-info-body">
              <div className="wjd-info-how-box">
                <div>
                  <div className="wjd-info-how-title">How Custom Jobs work</div>
                  <div className="wjd-info-how-sub">Custom jobs let creators define how workers join, how submissions are reviewed, and whether a job is open to everyone or only to a specific community.</div>
                </div>
                <div className="wjd-info-how-hint" onClick={() => setShowInfo(false)}>Click Info button to close</div>
              </div>

              <div className="wjd-config-strip">
                <div className="wjd-config-cell">
                  <div className="wjd-config-cell-label">Mode <InfoBtn text="Challenge: workers compete, winners are selected • Custom: workers apply individually, creator picks who to work with" /></div>
                  <div className="wjd-config-cell-value">{job.type || 'challenge'}</div>
                </div>
                <div className="wjd-config-cell">
                  <div className="wjd-config-cell-label">Selection type <InfoBtn text="Random: winners are chosen at random from qualifying applicants • Manual: the creator personally reviews and selects winners" /></div>
                  <div className="wjd-config-cell-value">{job.selectionType || 'Random'}</div>
                </div>
                <div className="wjd-config-cell">
                  <div className="wjd-config-cell-label">Community <InfoBtn text="Open to everyone: any eligible worker can apply • Specific community: only members of the selected community can apply" /></div>
                  <div className="wjd-config-cell-value">Open to everyone</div>
                </div>
              </div>

              <div className="wjd-info-section-title">Modes</div>
              <div className="wjd-info-section-sub">Mode explains how people participate in the job.</div>
              <div className="wjd-info-row">
                <div className="wjd-info-row-label">Challenge Mode</div>
                <div className="wjd-info-row-val">Open competition. People submit work directly, multiple winners can be rewarded, and each winning submission receives the configured reward.</div>
              </div>
              <div className="wjd-info-row">
                <div className="wjd-info-row-label">Selection Mode</div>
                <div className="wjd-info-row-val">Direct hire flow. People apply first, the creator reviews applicants, and one person is usually selected for the full job reward.</div>
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="wjd-info-section-title">Selection Types</div>
                <div className="wjd-info-section-sub">Selection type explains how winners are chosen after valid entries come in.</div>
                <div className="wjd-info-row">
                  <div className="wjd-info-row-label">Creator Selection</div>
                  <div className="wjd-info-row-val">The creator manually decides which submissions win. This is best for quality-based work such as design, writing, or anything that needs human judgment.</div>
                </div>
                <div className="wjd-info-row">
                  <div className="wjd-info-row-label">Random Selection</div>
                  <div className="wjd-info-row-val">Winners are chosen randomly when the timer ends. If there are not enough submissions yet, valid submissions can still be rewarded and the timer can extend until the job is filled.</div>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <div className="wjd-info-section-title">Community Jobs</div>
                <div className="wjd-info-section-sub">Some jobs are linked to a specific community instead of being open platform-wide.</div>
                <div className="wjd-info-row">
                  <div className="wjd-info-row-label">Who can join</div>
                  <div className="wjd-info-row-val">Community jobs may only allow members of that community to participate.</div>
                </div>
                <div className="wjd-info-row">
                  <div className="wjd-info-row-label">How to join</div>
                  <div className="wjd-info-row-val">You can open the community profile, review what the community is about, and send a join request if you want access to its jobs.</div>
                </div>
              </div>

              <div className="wjd-open-notice">This job is currently open to everyone and does not require a specific community.</div>

              <div className="wjd-important-box">
                <span className="wjd-important-icon"><i className="ti ti-alert-triangle" /></span>
                <div><strong>Important:</strong> Only apply or submit if you understand the configuration and genuinely have the skills to complete the work well.</div>
              </div>

              <div style={{ marginTop: 22 }}>
                <div className="wjd-info-section-title">How to participate</div>
                <div className="wjd-info-section-sub">Use this quick flow before joining a custom job.</div>
                <ol className="wjd-how-steps">
                  <li>Read the description, reward, mode, selection type, and community requirement.</li>
                  <li>If it is a community job, open the community page and send a join request first when needed.</li>
                  <li>Use the apply flow to send your application or submission, depending on the job setup.</li>
                  <li>Wait for creator review or the random draw after the timer ends.</li>
                  <li>If you are selected or rewarded, complete the work correctly and receive the payout.</li>
                </ol>
              </div>

              <div className="wjd-current-config">
                Current job configuration: <strong>{job.type || 'challenge'}</strong> mode with <strong>{job.selectionType || 'Random'}</strong> selection.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Before Apply Warning ── */}
      {showApplyWarning && (
        <div className="wjd-modal-bg" onClick={() => setShowApplyWarning(false)}>
          <div className="wjd-before" role="dialog" aria-modal="true" onClick={(e: any) => e.stopPropagation()}>
            <div className="wjd-modal-head">
              <div className="wjd-before-title">Before you apply</div>
              <button className="wjd-close-btn" type="button" onClick={() => setShowApplyWarning(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="wjd-before-copy">Please confirm the following before continuing:</div>
            <ul className="wjd-before-list">
              <li>Do not use AI to generate the answer for this job.</li>
              <li>Only apply if your submission adds real value to the job. Do not spam.</li>
              <li>If you do not understand the job, do not apply.</li>
              <li>Spamming jobs may get your account blocked.</li>
            </ul>
            <div className="wjd-before-actions">
              <button className="wjd-understand" type="button" onClick={() => { setShowApplyWarning(false); setShowApply(true) }}>I understand</button>
            </div>
          </div>
        </div>
      )}

      <ApplyModal open={showApply} onClose={() => setShowApply(false)} jobId={job.id} jobTitle={job.title} reward={job.reward} currency={rewardCurrency} onApplied={(jid) => { /* optimistic */ }} />

      {showShare && <SharePanel job={job} onClose={() => setShowShare(false)} />}

      {/* ── Report Modal ── */}
      {showReportModal && (
        <div className="wjd-modal-bg" onClick={() => { if (!reportSubmitting) setShowReportModal(false) }}>
          <div className="wjd-report-modal" onClick={(e: any) => e.stopPropagation()}>
            <div className="wjd-report-head">
              <span style={{ fontSize: 15, fontWeight: 800 }}>Report Task</span>
              <button className="wjd-close-btn" type="button" onClick={() => { if (!reportSubmitting) setShowReportModal(false) }}>✕</button>
            </div>
            <div className="wjd-report-body">
              {reportMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 700, background: reportMsg.includes('submitted') ? 'rgba(22,163,74,0.12)' : 'rgba(var(--red-rgb),0.1)', color: reportMsg.includes('submitted') ? 'var(--green)' : '#dc2626' }}>
                  {reportMsg}
                </div>
              )}
              <label className="wjd-report-label">Category *</label>
              <select className="wjd-report-input" value={reportCategory} onChange={(e: any) => setReportCategory(e.target.value)}>
                <option value="">Select a category</option>
                <option value="spam">Spam</option>
                <option value="scam">Scam / Fraud</option>
                <option value="inappropriate">Inappropriate Content</option>
                <option value="misleading">Misleading Information</option>
                <option value="other">Other</option>
              </select>
              <label className="wjd-report-label">Description *</label>
              <textarea className="wjd-report-input" value={reportDesc} onChange={(e: any) => setReportDesc(e.target.value)} placeholder="Describe the issue in detail..." rows={4} style={{ resize: 'vertical' }} />
              <div className="wjd-report-actions">
                <button className="wjd-report-cancel" type="button" onClick={() => { setShowReportModal(false); setReportMsg('') }}>Cancel</button>
                <button className="wjd-report-submit" type="button" onClick={handleSubmitReport} disabled={!reportCategory || !reportDesc.trim() || reportSubmitting}>
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Submission Detail Modal ── */}
      {selectedSub && (
        <div className="wjd-modal-bg" onClick={() => setSelectedSub(null)}>
          <div className="wjd-report-modal" style={{ maxWidth: 480 }} onClick={(e: any) => e.stopPropagation()}>
            <div className="wjd-report-head">
              <span style={{ fontSize: 15, fontWeight: 800 }}>Submission Detail</span>
              <button className="wjd-close-btn" type="button" onClick={() => setSelectedSub(null)}>✕</button>
            </div>
            <div className="wjd-report-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div className="wjd-sub-avatar" style={{ width: 44, height: 44, fontSize: 18 }}>
                  {selectedSub.worker?.avatarUrl ? <img src={selectedSub.worker.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} /> : (selectedSub.worker?.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text,#0f172a)' }}>{selectedSub.worker?.username || selectedSub.worker?.firstName || 'Anonymous'}</div>
                  {selectedSub.worker?.email && <div style={{ fontSize: 12, color: 'var(--text2,#475569)' }}>{selectedSub.worker.email}</div>}
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14, color: selectedSub.status === 'APPROVED' ? 'var(--green)' : selectedSub.status === 'REJECTED' ? '#dc2626' : '#d97706' }}>{selectedSub.status}</div>
              {selectedSub.status === 'APPROVED' && (selectedSub._approvedAt || selectedSub.approvedAt) && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Payout</div>
                  <PayoutCountdown approvedAt={selectedSub._approvedAt || selectedSub.approvedAt} />
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 14, color: 'var(--text,#0f172a)', marginBottom: 14, lineHeight: 1.5 }}>{selectedSub.workerNotes || 'No message'}</div>
              {selectedSub.proof && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Proof</div>
                  <div style={{ fontSize: 13, color: BRAND, wordBreak: 'break-all', marginBottom: 14 }}>
                    <a href={selectedSub.proof} target="_blank" rel="noopener noreferrer" style={{ color: BRAND }}>{selectedSub.proof}</a>
                  </div>
                </>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Submitted</div>
              <div style={{ fontSize: 13, color: 'var(--text2,#475569)', marginBottom: 16 }}>{timeAgo(selectedSub.createdAt)}</div>
              {selectedSub.status === 'SUBMITTED' && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="wjd-ok" type="button" onClick={() => { handleApprove(selectedSub.id); setSelectedSub(null) }} disabled={approving === selectedSub.id}>{approving === selectedSub.id ? 'Approving...' : 'Approve'}</button>
                  <button className="wjd-no" type="button" onClick={() => { handleReject(selectedSub.id); setSelectedSub(null) }} disabled={rejecting === selectedSub.id}>{rejecting === selectedSub.id ? 'Rejecting...' : 'Reject'}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

/* ── Payout Countdown ── */
function PayoutCountdown({ approvedAt }: { approvedAt: number }) {
  const endTime = Number(approvedAt) + 86400000
  const { d, h, m } = useCountdown(endTime)
  if (endTime - Date.now() <= 0) {
    return <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>Payout available</span>
  }
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  parts.push(`${h}h`)
  parts.push(`${m}m`)
  return <span style={{ color: '#d97706', fontSize: 12, fontWeight: 700 }}>Payout in {parts.join(' ')}</span>
}

/* ── Apply Modal ── */
/* ── Share Panel ── */
function SharePanel({ job, onClose }: { job: JobData; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/tasks/${job.id}`
  const copy = () => {
    navigator.clipboard?.writeText(url).catch(e => console.error(e))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const shares = [
    { label: 'X (Twitter)', icon: 'X', href: `https://twitter.com/intent/tweet?text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay!&url=${encodeURIComponent(url)}` },
    { label: 'WhatsApp', icon: 'WA', href: `https://wa.me/?text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay:+${encodeURIComponent(url)}` },
    { label: 'Telegram', icon: 'TG', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay` },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, background: 'var(--card,#fff)', border: '0.5px solid var(--border,#e5e7eb)', borderRadius: '20px 20px 0 0', padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border,#e5e7eb)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 800, color: 'var(--text,#0f172a)', margin: 0, fontSize: 15 }}>Share this Job</p>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg,#f3f4f6)', border: '0.5px solid var(--border,#e5e7eb)', color: 'var(--text2,#6b7280)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {shares.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px', background: 'var(--bg,#f8fafc)', border: '0.5px solid var(--border,#e5e7eb)', borderRadius: 12, textDecoration: 'none', color: 'inherit', fontSize: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: BRAND_LIGHT, display: 'grid', placeItems: 'center', color: BRAND, fontWeight: 800, fontSize: 13 }}>{s.icon}</div>
              <span style={{ fontWeight: 600, color: 'var(--text2,#6b7280)' }}>{s.label}</span>
            </a>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3,#9ca3af)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Or copy link</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={url} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '0.5px solid var(--border,#e5e7eb)', background: 'var(--bg,#f8fafc)', color: 'var(--text,#0f172a)', fontSize: 12, fontFamily: 'monospace', outline: 'none' }} />
            <button onClick={copy} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: BRAND, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
