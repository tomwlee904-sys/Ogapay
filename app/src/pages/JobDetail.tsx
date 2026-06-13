import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import CurrencySelector from '../components/CurrencySelector'
import { useCurrency } from '../context/CurrencyContext'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'
import { useAuth } from '../context/AuthContext'


const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'
const BRAND = '#191C6B'
const BRAND_LIGHT = 'rgba(18,21,102,0.10)'

/* ─── Helpers ─── */
function pad(n: number) { return String(n).padStart(2, '0') }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

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
}

/* ─── Badge ─── */
function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: BRAND_LIGHT, text: BRAND, border: `${BRAND}30` },
    green: { bg: 'rgba(22,163,74,0.12)', text: '#16a34a', border: 'rgba(22,163,74,0.25)' },
    amber: { bg: 'rgba(245,179,1,0.12)', text: '#b8860b', border: 'rgba(245,179,1,0.25)' },
    red: { bg: 'rgba(220,38,38,0.12)', text: '#dc2626', border: 'rgba(220,38,38,0.25)' },
    gray: { bg: 'var(--bg2)', text: 'var(--text3)', border: 'var(--border)' },
  }
  const c = colorMap[color] || colorMap.gray
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {children}
    </span>
  )
}

/* ─── Countdown ─── */
function CountdownBlock({ deadline }: { deadline: number }) {
  const { d, h, m, s } = useCountdown(deadline)
  const units = [
    { v: d, l: 'Days' }, { v: h, l: 'Hrs' },
    { v: m, l: 'Min' }, { v: s, l: 'Sec' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
      {units.map(({ v, l }) => (
        <div key={l} style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '12px 4px',
        }}>
          <span style={{ fontSize: 24, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
            {pad(v)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, marginTop: 4 }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Stat Card ─── */
function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 14px', textAlign: 'center',
    }}>
      <div style={{
        fontSize: 22, fontWeight: 900, color: color || 'var(--text)',
        fontFamily: "'Outfit', sans-serif", marginBottom: 4,
      }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

/* ─── Info Row ─── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

/* ─── Section Title ─── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 15, fontWeight: 800, color: 'var(--text)',
      marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {children}
    </div>
  )
}

/* ─── Main Component ─── */
export default function JobDetail() {
  const { fmt, fmtAll, preferredCurrency } = useCurrency()
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'details')
  const [showApply, setShowApply] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [error, setError] = useState('')

  const { user: authUser, refreshUser } = useAuth()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [subsLoading, setSubsLoading] = useState(false)
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

  useEffect(() => { injectSkeletonStyles(); }, [])

  // Fetch submissions when tab changes to submissions and user is owner
  useEffect(() => {
    if (activeTab !== 'submissions' || !job?.id || !authUser) return;
    const token = localStorage.getItem('ogapay_access_token');
    if (!token) return;
    setSubsLoading(true);
    fetch(API_BASE + '/tasks/' + job.id + '/submissions', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(r => r.json())
      .then(json => {
        const data = json?.data || json?.submissions || [];
        setSubmissions(Array.isArray(data) ? data : []);
      })
      .catch(() => setSubmissions([]))
      .finally(() => setSubsLoading(false));
  }, [activeTab, job?.id, authUser]);

  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const handleApprove = async (subId: string) => {
    setApproving(subId);
    try {
      const token = localStorage.getItem('ogapay_access_token');
      if (!token) return;
      const res = await fetch(API_BASE + '/tasks/submissions/' + subId + '/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'APPROVED' } : s));
        refreshUser();
      }
    } catch {}
    setApproving(null);
  };

  const handleReject = async (subId: string) => {
    setRejecting(subId);
    try {
      const token = localStorage.getItem('ogapay_access_token');
      if (!token) return;
      const res = await fetch(API_BASE + '/tasks/submissions/' + subId + '/reject', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ posterNotes: '' }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'REJECTED' } : s));
        refreshUser();
      }
    } catch {}
    setRejecting(null);
  };

  function timeAgo(dateStr: string | Date) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    const days = Math.floor(hrs / 24);
    return days + 'd ago';
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
    return {
      id: t.id || t._id || '',
      creatorId: t.posterId || t.creatorId || t.creator?.id || t.creator_id || '',
      title: t.title || 'Untitled Task',
      description: t.description || t.instructions || '',
      brand: t.creatorName || t.brand || t.creator?.name || '',
      brandHandle: t.creatorHandle || t.brandHandle || '',
      brandAvatar: t.creatorAvatar || t.brandAvatar || '',
      brandVerified: t.creatorVerified || t.brandVerified || false,
      category: t.category || 'General',
      type: t.type || t.mode || 'challenge',
      platform: t.platform || 'OgaPay',
      reward: Number(t.reward) || Number(t.bounty) || Number(t.maxBudget) || 0,
      currency: t.currency || 'NGN',
      usdEquiv: t.usdEquiv || '',
      slots: Number(t.maxParticipants) || Number(t.slots) || Number(t.maxEntries) || 100,
      slotsLeft: Number(t.slotsLeft) || Number(t.remainingSlots) || 0,
      completions: Number(t.completions) || Number(t.submissions) || 0,
      deadline: parsedDeadline,
      posted: t.createdAt || t.posted || new Date().toISOString(),
      status: t.status || 'open',
      difficulty: difficultyMap[t.difficulty?.toLowerCase()] || t.difficulty || 'Medium',
      estimatedTime: t.estimatedTime || '15 minutes',
      steps: toArray(t.steps, []),
      requirements: toArray(t.requirements || t.qualifications, []),
      proofRequired: toArray(t.proofRequired || t.proofInstructions, ['Screenshot']),
      tags: toArray(t.tags || t.searchTags, []),
      approvalTime: t.approvalTime || '48 hours',
      payoutDay: t.payoutDay || 'Daily',
      totalPool: t.totalPool || 'N/A',
      similarJobs: Array.isArray(t.similarJobs) ? t.similarJobs.slice(0, 4) : [],
      instructions: t.instructions || t.description || '',
    }
  }

  const handleBookmark = () => {
    setBookmarked(!bookmarked)
    try {
      const stored = JSON.parse(localStorage.getItem('ogapay_bookmarks') || '[]')
      if (!bookmarked) {
        stored.push(job!.id)
      } else {
        const idx = stored.indexOf(job!.id)
        if (idx >= 0) stored.splice(idx, 1)
      }
      localStorage.setItem('ogapay_bookmarks', JSON.stringify(stored))
    } catch { /* ignore */ }
  }

  const noop = false

  if (loading) return <Layout><SkeletonPage /></Layout>
  if (error || !job) return <ErrorState message={error || 'Task not found'} onBack={() => navigate(-1)} />

  const isOpen = job.status === 'OPEN' || job.status === 'ACTIVE'
  const slotPct = pct(job.completions, job.slots)

  return (
    <Layout>
      <style>{`
        .jd-page {
          max-width: 100%;
          width: 100%;
          margin: 0 auto;
          padding: 0 0 60px;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .jd-container {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 16px;
        }
        @media (max-width: 600px) {
          .jd-container { padding: 0 12px; }
        }
      `}</style>
      <div className="jd-page">
        <div className="jd-container">

          {/* ── Back + Actions ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 0 12px', position: 'sticky', top: 0,
            background: 'var(--bg)', zIndex: 10,
          }}>
            <button onClick={() => navigate(-1)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 16px',
              fontSize: 14, fontWeight: 600, color: 'var(--text2)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleBookmark} style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'var(--card)', border: '1px solid var(--border)',
                color: bookmarked ? BRAND : 'var(--text3)', cursor: 'pointer',
                display: 'grid', placeItems: 'center', fontSize: 18,
              }}>
                {bookmarked ? (
                  <svg width="18" height="18" fill={BRAND} stroke={BRAND} viewBox="0 0 24 24">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                  </svg>
                )}
              </button>
              <button onClick={() => setShowShare(true)} style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'var(--card)', border: '1px solid var(--border)',
                color: 'var(--text3)', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
              }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Creator Card ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 18px', background: 'var(--card)',
            border: '1px solid var(--border)', borderRadius: 16, marginBottom: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
              flexShrink: 0, background: BRAND_LIGHT,
              display: 'grid', placeItems: 'center',
              border: '2px solid var(--border)', color: BRAND, fontSize: 20, fontWeight: 800,
            }}>
              {job.brandAvatar ? (
                <img src={job.brandAvatar} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (job.brand || 'O')[0]
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {job.brand || 'OgaPay'}
                {job.brandVerified && (
                  <svg width="16" height="16" fill={BRAND} viewBox="0 0 24 24">
                    <path d="M12 1l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 1z"/>
                  </svg>
                )}
              </div>
              {job.brandHandle && (
                <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
                  @{job.brandHandle}
                </div>
              )}
            </div>
            <Badge color={isOpen ? 'green' : 'gray'}>{isOpen ? 'Open' : 'Closed'}</Badge>
          </div>

          {/* ── Sticky Tabs ── */}
          <div style={{
            display: 'flex', gap: 2, marginBottom: 16, overflowX: 'auto',
            position: 'sticky', top: 68, zIndex: 9, background: 'var(--bg)',
            padding: '4px 0',
          }}>
            {[
              { id: 'details', label: 'Details' },
              { id: 'requirements', label: 'Requirements' },
              { id: 'submissions', label: 'Submissions' },
              { id: 'reports', label: 'Reports' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: '0 0 auto', padding: '10px 20px',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                background: activeTab === tab.id ? BRAND : 'var(--card)',
                color: activeTab === tab.id ? '#fff' : 'var(--text2)',
                border: activeTab === tab.id ? 'none' : '1px solid var(--border)',
                borderRadius: 10, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.15s',
                minHeight: 44,
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════ */}
          {/* DETAILS TAB */}
          {/* ════════════════════════════════════════ */}
          {activeTab === 'details' && (
            <>
              {/* Title & Badges */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '20px 18px', marginBottom: 16,
              }}>
                <h1 style={{
                  fontSize: 24, fontWeight: 900, margin: '0 0 12px',
                  color: 'var(--text)', lineHeight: 1.3, letterSpacing: '-0.02em',
                }}>
                  {job.title}
                </h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <Badge>{job.category}</Badge>
                  <Badge color="amber">{job.platform}</Badge>
                  <Badge color="gray">{job.difficulty}</Badge>
                </div>
                {job.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {job.tags.map((tag, i) => (
                      <span key={i} style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--text3)',
                        background: 'var(--bg2)', padding: '3px 10px',
                        borderRadius: 99, border: '1px solid var(--border)',
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12, marginBottom: 16,
              }}>
                <StatCard label="Reward" value={fmt(job.reward, job.currency === 'USD' ? 'USDC' : 'NGN')} color="#16a34a" />
                <StatCard label="Total Slots" value={String(job.slots)} />
                <StatCard label="Filled" value={String(job.completions)} color={BRAND} />
                <StatCard label="Remaining" value={String(job.slots - job.completions)} color="#b8860b" />
              </div>

              {/* Progress Bar */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '18px', marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Progress</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: BRAND }}>{slotPct}% filled</span>
                </div>
                <div style={{
                  height: 10, borderRadius: 99, background: 'var(--bg2)',
                  overflow: 'hidden', border: '1px solid var(--border)',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: `linear-gradient(90deg, ${BRAND}, #191C6B)`,
                    width: `${Math.min(slotPct, 100)}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12, color: 'var(--text3)', marginTop: 8,
                }}>
                  <span>{job.completions} submissions</span>
                  <span>{job.slots - job.completions} slots left</span>
                </div>
              </div>

              {/* Countdown */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '18px', marginBottom: 16,
              }}>
                <SectionTitle>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Time Remaining
                </SectionTitle>
                <CountdownBlock deadline={job.deadline} />
              </div>

              {/* Job Info Grid */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '18px', marginBottom: 16,
              }}>
                <SectionTitle>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  Job Information
                </SectionTitle>
                <InfoRow label="Platform" value={job.platform} />
                <InfoRow label="Reward" value={fmt(job.reward, job.currency === 'USD' ? 'USDC' : 'NGN')} />
                <InfoRow label="Selection Type" value={job.type === 'challenge' ? 'Challenge (Multiple Winners)' : 'Selection (Single Winner)'} />
                <InfoRow label="Posted" value={new Date(job.posted).toLocaleDateString()} />
                <InfoRow label="Deadline" value={new Date(job.deadline).toLocaleDateString()} />
                <InfoRow label="Est. Time" value={job.estimatedTime} />
                <InfoRow label="Approval Time" value={job.approvalTime} />
                <InfoRow label="Payout Day" value={job.payoutDay} />
                <InfoRow label="Difficulty" value={job.difficulty} />
                <InfoRow label="Total Pool" value={job.totalPool} />
              </div>

              {/* Description */}
              {job.description && (
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '18px', marginBottom: 16,
                }}>
                  <SectionTitle>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Description
                  </SectionTitle>
                  <div style={{
                    fontSize: 14, color: 'var(--text2)', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {job.description}
                  </div>
                </div>
              )}

              {/* Steps */}
              {job.steps.length > 0 && (
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '18px', marginBottom: 16,
                }}>
                  <SectionTitle>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Steps
                  </SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {job.steps.map((step, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: BRAND_LIGHT, color: BRAND,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 800, flexShrink: 0,
                        }}>
                          {i + 1}
                        </div>
                        <div style={{
                          flex: 1, fontSize: 14, color: 'var(--text2)',
                          lineHeight: 1.5, paddingTop: 4,
                        }}>
                          {step}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Jobs */}
              {job.similarJobs.length > 0 && (
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '18px', marginBottom: 16,
                }}>
                  <SectionTitle>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    Similar Jobs
                  </SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {job.similarJobs.map((sj: any, i: number) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', background: 'var(--bg2)',
                        border: '1px solid var(--border)', borderRadius: 12,
                        cursor: 'pointer',
                      }}
                        onClick={() => navigate(`/tasks/${sj.id || sj._id}`)}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: BRAND_LIGHT, display: 'grid', placeItems: 'center',
                          flexShrink: 0, color: BRAND, fontSize: 18,
                        }}>
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                            {sj.title}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                            {sj.category || 'General'} · {sj.reward || sj.bounty} {sj.currency || 'NGN'}
                          </div>
                        </div>
                        <svg width="16" height="16" fill="none" stroke="var(--text3)" strokeWidth="2" viewBox="0 0 24 24">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════ */}
          {/* REQUIREMENTS TAB */}
          {/* ════════════════════════════════════════ */}
          {activeTab === 'requirements' && (
            <>
              {/* Requirements */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '18px', marginBottom: 16,
              }}>
                <SectionTitle>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  Requirements
                </SectionTitle>
                {job.requirements.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 0' }}>
                    No specific requirements listed.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {job.requirements.map((req, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', background: 'var(--bg2)',
                        border: '1px solid var(--border)', borderRadius: 10,
                        fontSize: 13, color: 'var(--text2)',
                      }}>
                        <svg width="16" height="16" fill="none" stroke={BRAND} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {req}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Proof Required */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '18px', marginBottom: 16,
              }}>
                <SectionTitle>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Proof Required
                </SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {job.proofRequired.map((p, i) => (
                    <Badge key={i} color="blue">{p}</Badge>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {job.instructions && (
                <div style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '18px', marginBottom: 16,
                }}>
                  <SectionTitle>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    Instructions
                  </SectionTitle>
                  <div style={{
                    fontSize: 14, color: 'var(--text2)', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {job.instructions}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════ */}
          {/* SUBMISSIONS TAB */}
          {/* ════════════════════════════════════════ */}
          {activeTab === 'submissions' && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '18px', marginBottom: 16,
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-file-text" style={{color: BRAND, fontSize: 16}} />
                Submissions & Activity
              </h3>
              {authUser && job.creatorId === authUser.id ? (
                <>
                  {subsLoading ? (
                    <div style={{textAlign:'center',padding:'20px 0',color:'var(--text2)',fontSize:13}}>
                      <i className="ti ti-loader" style={{animation:'spin 1s linear infinite',display:'inline-block'}} /> Loading submissions...
                    </div>
                  ) : submissions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text2)' }}>
                      <i className="ti ti-inbox" style={{fontSize:28,color:'var(--text3)',display:'block',marginBottom:8}} />
                      <p style={{margin:0,fontSize:13,color:'var(--text3)'}}>No submissions yet. They will appear here once workers submit their work.</p>
                    </div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      {submissions.map(sub => (
                        <div key={sub.id} style={{
                          background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px',
                          display:'flex', alignItems:'flex-start', gap:12,
                        }}>
                          <div style={{
                            width:36, height:36, borderRadius:'50%', background:BRAND, color:'#fff', display:'grid',
                            placeItems:'center', fontSize:12, fontWeight:800, flexShrink:0, overflow:'hidden',
                          }}>
                            {sub.worker?.avatarUrl ? <img src={sub.worker?.avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : (sub.worker?.username || 'U')[0].toUpperCase()}
                          </div>
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{fontWeight:700, fontSize:13, marginBottom:2}}>
                              {sub.worker?.username || sub.worker?.firstName || 'Anonymous'}
                            </div>
                            <div style={{fontSize:12, color:'var(--text2)', marginBottom:6, lineHeight:1.4}}>
                              {sub.workerNotes || 'No message'}
                            </div>
                            {sub.proof && (
                              <div style={{fontSize:11, color:BRAND, marginBottom:6, wordBreak:'break-all'}}>
                                <i className="ti ti-link" style={{fontSize:11}} /> {sub.proof}
                              </div>
                            )}
                            <div style={{display:'flex', gap:6, marginTop:8}}>
                              {sub.status === 'SUBMITTED' && (
                                <>
                                  <button onClick={() => handleApprove(sub.id)} disabled={approving === sub.id}
                                    style={{height:30, padding:'0 14px', borderRadius:7, border:'none', background:'#16a34a', color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4, opacity: approving === sub.id ? 0.6 : 1}}>
                                    {approving === sub.id ? <i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} /> : <i className="ti ti-check" />} Approve
                                  </button>
                                  <button onClick={() => handleReject(sub.id)} disabled={rejecting === sub.id}
                                    style={{height:30, padding:'0 14px', borderRadius:7, border:'1px solid var(--border)', background:'transparent', color:'#dc2626', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4, opacity: rejecting === sub.id ? 0.6 : 1}}>
                                    {rejecting === sub.id ? <i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} /> : <i className="ti ti-x" />} Reject
                                  </button>
                                </>
                              )}
                              {sub.status === 'APPROVED' && (
                                <span style={{padding:'3px 8px', borderRadius:5, background:'rgba(22,163,74,0.12)', color:'#16a34a', fontSize:10, fontWeight:700}}>
                                  <i className="ti ti-check-circle" /> Approved
                                </span>
                              )}
                              {sub.status === 'REJECTED' && (
                                <span style={{padding:'3px 8px', borderRadius:5, background:'rgba(220,38,38,0.12)', color:'#dc2626', fontSize:10, fontWeight:700}}>
                                  <i className="ti ti-x-circle" /> Rejected
                                </span>
                              )}
                              <span style={{fontSize:10, color:'var(--text3)', marginLeft:'auto', alignSelf:'center'}}>
                                {timeAgo(sub.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text2)' }}>
                  <i className="ti ti-lock" style={{fontSize:28,color:'var(--text3)',display:'block',marginBottom:8}} />
                  <p style={{margin:0,fontSize:13}}>Only the task creator can view submissions.</p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════ */}
          {/* REPORTS TAB */}
          {/* ════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '18px', marginBottom: 16, textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 14px', color: '#dc2626',
              }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                Report an Issue
              </h3>
              <p style={{ margin: '0 auto 16px', fontSize: 13, color: 'var(--text2)', maxWidth: 320, lineHeight: 1.5 }}>
                If you need to report a problem with this task or a user, click below.
              </p>
              <button style={{
                padding: '12px 24px', borderRadius: 10, border: 'none',
                background: '#dc2626', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                Report Task
              </button>
            </div>
          )}

          {/* ── Sticky Bottom Apply Button ── */}
          <div style={{
            position: 'sticky', bottom: 0, zIndex: 10,
            background: 'var(--bg)', padding: '12px 0',
            borderTop: '1px solid var(--border)',
          }}>
            <button onClick={() => setShowApply(true)} disabled={!isOpen} style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none',
              background: isOpen ? BRAND : 'var(--border)',
              color: isOpen ? '#fff' : 'var(--text3)',
              fontSize: 16, fontWeight: 800, cursor: isOpen ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              minHeight: 56,
            }}>
              {isOpen ? (
                <>Apply Now <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg></>
              ) : 'This Job is Closed'}
            </button>
          </div>

        </div>
      </div>

      {/* ── Apply Modal ── */}
      <ApplyModal
        open={showApply}
        onClose={() => setShowApply(false)}
        jobId={job.id}
        jobTitle={job.title}
        reward={job.reward}
        currency={job.currency}
      />

      {/* ── Share Panel ── */}
      {showShare && <SharePanel job={job} onClose={() => setShowShare(false)} />}
    </Layout>
  )
}

/* ── Error State ── */
function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <Layout>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', padding: '0 16px',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(220,38,38,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', color: '#dc2626',
          }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
            {message || 'Task not found'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 20px', lineHeight: 1.5 }}>
            The task you're looking for doesn't exist or has been removed.
          </p>
          <button onClick={onBack} style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: BRAND, color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Go Back
          </button>
        </div>
      </div>
    </Layout>
  )
}

/* ── Apply Modal ── */
function ApplyModal({ open, onClose, jobId, jobTitle, reward, currency }: {
  open: boolean; onClose: () => void; jobId: string;
  jobTitle: string; reward: number; currency: string;
}) {
  const { fmt } = useCurrency()
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [applyLink, setApplyLink] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    if (!open) { setStep('form'); setApplyLink(''); setNotes(''); setError(''); setFiles([]) }
  }, [open])

  const handleSubmit = async () => {
    if (!applyLink.trim() && files.length === 0) { setError('Please provide a submission link or attach files'); return }
    setError('')
    setSubmitting(true)
    try {
      const token = localStorage.getItem('ogapay_access_token')
      if (!token) { setError('Please log in first'); setSubmitting(false); return }

      const applyRes = await fetch(`${API_BASE}/tasks/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const applyJson = await applyRes.json()
      if (!applyRes.ok) {
        const msg = applyJson.message || applyJson.error || ''
        // "Already applied" is not a real error — proceed to submit proof
        if (msg.toLowerCase().includes('already')) {
          /* continue to submit */
        } else {
          throw new Error(msg || 'Failed to apply')
        }
      }

      // Upload files first (if any) to get URLs, then submit as JSON
      const uploadedUrls: string[] = []
      if (files.length > 0) {
        for (const f of files) {
          try {
            const fd = new FormData()
            fd.append('file', f)
            const upRes = await fetch(`${API_BASE}/uploads/proof`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: fd,
            })
            if (upRes.ok) {
              const upJson = await upRes.json()
              if (upJson.data?.url) uploadedUrls.push(upJson.data.url)
            }
          } catch {}
        }
      }

      const submitBody: Record<string, any> = {}
      if (applyLink.trim()) submitBody.proof = applyLink.trim()
      if (notes.trim()) submitBody.workerNotes = notes.trim()
      if (uploadedUrls.length > 0) submitBody.attachments = uploadedUrls

      const submitRes = await fetch(`${API_BASE}/tasks/${jobId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(submitBody),
      })
      const submitJson = await submitRes.json()
      if (!submitRes.ok) throw new Error(submitJson.message || 'Failed to submit')

      setStep('success')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 520,
        margin: '0 auto',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '24px 24px 0 0', maxHeight: '92vh', overflowY: 'auto',
        padding: '24px 20px 32px',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {step === 'form' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Apply for this Job</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text2)' }}>
                  {fmt(reward, currency === 'USD' ? 'USDC' : 'NGN')} · {jobTitle}
                </p>
              </div>
              <button onClick={onClose} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                color: 'var(--text2)', cursor: 'pointer', display: 'grid', placeItems: 'center',
                fontSize: 16, flexShrink: 0,
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                Submission Link *
              </label>
              <input type="url" value={applyLink} onChange={e => setApplyLink(e.target.value)}
                placeholder="https://..."
                style={{
                  width: '100%', height: 48, padding: '0 14px', boxSizing: 'border-box',
                  border: `1.5px solid ${error ? '#dc2626' : 'var(--border)'}`,
                  borderRadius: 12, background: 'var(--bg2)', color: 'var(--text)',
                  fontSize: 14, outline: 'none', fontFamily: 'inherit',
                }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                Notes (optional)
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Add any notes for the task creator..."
                rows={4}
                style={{
                  width: '100%', padding: '12px 14px', boxSizing: 'border-box',
                  border: '1.5px solid var(--border)', borderRadius: 12,
                  background: 'var(--bg2)', color: 'var(--text)',
                  fontSize: 14, outline: 'none', fontFamily: 'inherit',
                  resize: 'vertical', lineHeight: 1.5, minHeight: 100,
                }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                Attachments (optional)
              </label>
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileAdd} style={{ display: 'none' }} />
              <div onClick={() => fileInputRef.current?.click()} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '24px 16px', borderRadius: 12, border: '1.5px dashed var(--border)',
                background: 'var(--bg2)', color: 'var(--text3)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span>Click to upload files</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Images, PDFs, or documents</span>
              </div>
              {files.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8, background: 'var(--bg2)',
                      border: '1px solid var(--border)', fontSize: 12,
                    }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                        <polyline points="13 2 13 9 20 9"/>
                      </svg>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{f.name}</span>
                      <span style={{ color: 'var(--text3)' }}>{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={() => handleRemoveFile(i)} style={{
                        background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
                        padding: 2, display: 'grid', placeItems: 'center', fontFamily: 'inherit',
                      }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)',
                fontSize: 13, color: '#dc2626', marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting} style={{
              width: '100%', padding: '16px', borderRadius: 12, border: 'none',
              background: submitting ? 'var(--border)' : BRAND,
              color: submitting ? 'var(--text3)' : '#fff',
              fontSize: 15, fontWeight: 800, cursor: submitting ? 'wait' : 'pointer',
              fontFamily: 'inherit', minHeight: 52,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(22,163,74,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', color: '#16a34a',
            }}>
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              Application Submitted!
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>
              Your application has been submitted. The task creator will review it.
            </p>
            <button onClick={onClose} style={{
              padding: '14px 32px', borderRadius: 12, border: 'none',
              background: BRAND, color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Share Panel ── */
function SharePanel({ job, onClose }: { job: JobData; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = `https://ogapay.vercel.app/tasks/${job.id}`
  const copy = () => {
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const shares = [
    { label: 'X (Twitter)', icon: 'X', href: `https://twitter.com/intent/tweet?text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay!&url=${encodeURIComponent(url)}`, color: 'var(--text2)' },
    { label: 'WhatsApp', icon: 'WA', href: `https://wa.me/?text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+completing+tasks+on+OgaPay:+${encodeURIComponent(url)}`, color: 'var(--text2)' },
    { label: 'Telegram', icon: 'TG', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay`, color: 'var(--text2)' },
  ]
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
      }} onClick={onClose} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 420,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '24px 24px 0 0', padding: '24px 20px 32px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 800, color: 'var(--text)', margin: 0, fontSize: 16 }}>Share this Job</p>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            color: 'var(--text2)', cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {shares.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 8, padding: '14px 8px', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 14,
              textDecoration: 'none', color: 'inherit', fontSize: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: BRAND_LIGHT, display: 'grid', placeItems: 'center',
                color: BRAND, fontWeight: 800, fontSize: 14,
              }}>
                {s.icon}
              </div>
              <span style={{ fontWeight: 600, color: 'var(--text2)' }}>{s.label}</span>
            </a>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
            Or copy link
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={url} style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text)', fontSize: 12, fontFamily: 'monospace',
            }} />
            <button onClick={copy} style={{
              padding: '12px 20px', borderRadius: 12, border: 'none',
              background: BRAND, color: '#fff', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
