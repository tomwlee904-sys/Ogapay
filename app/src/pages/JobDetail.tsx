import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

/* ─── Helpers ─── */
function pad(n: number) { return String(n).padStart(2, '0') }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

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

const BRAND = '#121566'
const BRAND_LIGHT = 'rgba(18,21,102,0.12)'

interface JobData {
  id: string
  title: string
  description: string
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

/* ─── Mini Badge ─── */
function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: BRAND_LIGHT, text: BRAND, border: `${BRAND}40` },
    green: { bg: 'rgba(22,163,74,0.12)', text: '#16a34a', border: 'rgba(22,163,74,0.30)' },
    amber: { bg: 'rgba(245,179,1,0.12)', text: '#f5b301', border: 'rgba(245,179,1,0.30)' },
    red: { bg: 'rgba(220,38,38,0.12)', text: '#dc2626', border: 'rgba(220,38,38,0.30)' },
    gray: { bg: 'var(--bg2)', text: 'var(--text3)', border: 'var(--border)' },
  }
  const c = colorMap[color] || colorMap.gray
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
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
    <div style={{ display: 'flex', gap: 8 }}>
      {units.map(({ v, l }) => (
        <div key={l} style={{
          flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '10px 4px',
        }}>
          <span style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
            {pad(v)}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, marginTop: 2 }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Main Component ─── */
export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [showApply, setShowApply] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [error, setError] = useState('')

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

  function formatTask(t: any): JobData {
    const now = Date.now()
    const deadline = t.deadline ? new Date(t.deadline).getTime() : now + 86400000 * 2
    const reward = Number(t.reward) || 0
    const slots = t.maxWorkers || 1
    const filled = t.currentWorkers || 0
    const totalPool = (reward * slots).toLocaleString()
    const usdEquiv = t.usdEquiv || `$${(reward * 0.00062).toFixed(2)}`
    const creatorName = t.poster?.username || 'OgaPay'
    
    return {
      id: t.id || id || '',
      title: t.title || 'Untitled Task',
      description: t.description || t.instructions || '',
      instructions: t.instructions || '',
      brand: creatorName,
      brandHandle: `@${creatorName.toLowerCase()}`,
      brandAvatar: creatorName.slice(0, 2).toUpperCase(),
      brandVerified: t.poster?.posterProfile?.isVerified || false,
      category: t.category || 'General',
      type: t.estimatedTime ? `${t.estimatedTime} min` : 'Quick Task',
      platform: t.tags?.[0] || 'Web',
      reward,
      currency: t.currency || 'NGN',
      usdEquiv,
      slots,
      slotsLeft: slots - filled,
      completions: filled,
      deadline,
      posted: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
      status: deadline > now ? 'open' : 'closed',
      difficulty: t.estimatedTime ? (t.estimatedTime <= 10 ? 'Easy' : t.estimatedTime <= 30 ? 'Medium' : 'Hard') : 'Easy',
      estimatedTime: t.estimatedTime ? `${t.estimatedTime} min` : '—',
      steps: t.steps || ['Complete the task', 'Submit proof', 'Wait for approval'],
      requirements: t.requirements || ['Valid account', 'Complete submission'],
      proofRequired: t.proofRequired || ['Screenshot proof'],
      tags: t.tags || [t.category || 'General'],
      approvalTime: t.approvalTime || 'Within 24 hours',
      payoutDay: t.payoutDay || 'Weekly',
      totalPool: `${t.currency === 'USD' ? '$' : '₦'}${totalPool}`,
      similarJobs: [],
    }
  }

  const filledPct = job ? pct(job.completions, job.slots) : 0
  const isAlmostFull = job ? (job.slotsLeft / job.slots) <= 0.25 : false

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text3)', gap: 10 }}>
          <div className="spinner" />
          Loading task...
        </div>
      </Layout>
    )
  }

  if (error || !job) {
    return (
      <Layout>
        <div style={{ maxWidth: 720, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 48, color: 'var(--text3)', marginBottom: 16, display: 'block' }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Task Not Found</h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 24px' }}>{error || 'This task does not exist or has been removed.'}</p>
          <button onClick={() => navigate('/tasks')} style={{
            height: 44, padding: '0 24px', borderRadius: 999,
            background: BRAND, color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            <i className="ti ti-arrow-left" style={{ marginRight: 6 }} />
            Browse Tasks
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* ─── Top Navigation ─── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 0 8px', flexWrap: 'wrap',
      }}>
        <button onClick={() => navigate('/tasks')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 999,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          transition: 'color .15s',
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Task Detail</span>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>/</span>
        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
          {job.id}
        </span>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', paddingBottom: 120 }}>

        {/* ─── JOB HEADER CARD ─── */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden', marginBottom: 16, padding: 20,
        }}>
          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 14, fontWeight: 900, flexShrink: 0,
              background: BRAND,
            }}>
              {job.brandAvatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{job.brand}</span>
                {job.brandVerified && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={BRAND}>
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{job.brandHandle}</span>
            </div>
            <Badge color="green">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', marginRight: 2 }} />
              {job.status === 'open' ? 'Open' : 'Closed'}
            </Badge>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.3, margin: '0 0 12px', color: 'var(--text)' }}>
            {job.title}
          </h1>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            <Badge color="blue">{job.category}</Badge>
            <Badge color="blue">{job.platform}</Badge>
            <Badge color="gray">{job.difficulty}</Badge>
            <Badge color="gray">⏱ {job.estimatedTime}</Badge>
          </div>

          {/* Reward hero */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
          }}>
            <div>
              <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                Reward per task
              </p>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#16a34a', margin: 0, lineHeight: 1.2 }}>
                {job.currency === 'USD' ? '$' : '₦'}{job.reward.toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>
                ≈ {job.usdEquiv} USD
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>
                Total Pool
              </p>
              <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>{job.totalPool}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>{job.slots} slots total</p>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{job.completions} completed</span>
            <span style={{ fontWeight: 700, color: isAlmostFull ? '#f5b301' : 'var(--text2)' }}>
              {job.slotsLeft} slots left
            </span>
          </div>
          <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{
              height: '100%', borderRadius: 999,
              background: `linear-gradient(90deg, ${BRAND}, #16a34a)`,
              width: `${filledPct}%`,
            }} />
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Job ID', value: job.id, mono: true },
              { label: 'Posted', value: job.posted },
              { label: 'Approval', value: job.approvalTime },
              { label: 'Payout Day', value: job.payoutDay },
            ].map(m => (
              <div key={m.label} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 12px',
              }}>
                <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
                  {m.label}
                </p>
                <p style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--text)',
                  margin: 0, fontFamily: m.mono ? 'monospace' : undefined,
                }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
              ⏳ Time Remaining
            </p>
            <CountdownBlock deadline={job.deadline} />
          </div>

          {/* Applicants */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 11, color: 'var(--text2)', margin: 0 }}>
              <span style={{ color: 'var(--text)', fontWeight: 700 }}>{job.completions}</span> people already completed this
            </p>
          </div>
        </div>

        {/* ─── TABS ─── */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'hidden', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {['details', 'requirements', 'activity'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '12px 0', border: 'none', background: 'transparent',
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', cursor: 'pointer',
                  color: activeTab === tab ? 'var(--text)' : 'var(--text3)',
                  borderBottom: activeTab === tab ? `2px solid ${BRAND}` : '2px solid transparent',
                  transition: 'color .15s, border-color .15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: 20 }}>
            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                    About This Task
                  </h3>
                  {(job.description || job.instructions).split('\n\n').map((p: string, i: number) => (
                    <p key={i} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, margin: '0 0 8px' }}>{p}</p>
                  ))}
                </div>
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                    Steps to Complete
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {job.steps.map((step: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 8,
                          background: BRAND_LIGHT, border: `1px solid ${BRAND}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 900, color: BRAND, flexShrink: 0, marginTop: 1,
                        }}>
                          {i + 1}
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
                    Proof Required
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {job.proofRequired.map((p: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                        <svg width="14" height="14" fill="none" stroke={BRAND} strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="9" y="9" width="13" height="13" rx="2"/>
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                    Tags
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {job.tags.map((t: string, i: number) => <Badge key={i} color="gray">{t}</Badge>)}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'requirements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
                    Eligibility Requirements
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {job.requirements.map((r: string, i: number) => (
                      <div key={i} style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        padding: 10, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
                      }}>
                        <svg width="14" height="14" fill="none" stroke="#f5b301" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}>
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'activity' && (
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>
                Task activity and submission stats will appear here once available.
              </p>
            )}
          </div>
        </div>

        {/* ─── SIMILAR JOBS ─── */}
        {job.similarJobs.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
              Similar Jobs
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {job.similarJobs.map((j: any, i: number) => (
                <div key={i} style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', transition: 'border-color .15s',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: BRAND_LIGHT, border: `1px solid ${BRAND}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="16" height="16" fill="none" stroke={BRAND} strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="2" y="7" width="20" height="14" rx="2"/>
                      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {j.title}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>
                      {j.left || '?'} slots left · {j.type || 'General'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 900, color: '#16a34a', margin: 0 }}>
                      {j.currency === 'USD' ? '$' : '₦'}{Number(j.reward || 0).toLocaleString()}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text3)', margin: '1px 0 0' }}>{j.id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── SHARE / REPORT ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setShowShare(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', border: 'none', background: 'transparent',
            color: 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
          <span style={{ color: 'var(--border)', fontSize: 14 }}>·</span>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', border: 'none', background: 'transparent',
            color: 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            Report this job
          </button>
        </div>
      </div>

      {/* ─── STICKY BOTTOM CTA ─── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, padding: 16,
        background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          {job.slotsLeft > 0 ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => navigate(`/tasks/${job.id}/submit`)}
                style={{
                  flex: 1, border: 'none', color: '#fff', fontWeight: 900,
                  padding: '14px 20px', borderRadius: 14, fontSize: 14, cursor: 'pointer',
                  background: BRAND,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Apply & Earn {job.currency === 'USD' ? '$' : '₦'}{job.reward.toLocaleString()} →
              </button>
              <button
                onClick={() => setBookmarked(b => !b)}
                style={{
                  width: 52, borderRadius: 14, border: '1px solid var(--border)',
                  background: bookmarked ? BRAND_LIGHT : 'var(--card)',
                  color: bookmarked ? BRAND : 'var(--text3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                </svg>
              </button>
            </div>
          ) : (
            <button disabled style={{
              width: '100%', border: '1px solid var(--border)', background: 'var(--card)',
              color: 'var(--text3)', fontWeight: 900, padding: '14px 20px',
              borderRadius: 14, fontSize: 14, cursor: 'not-allowed',
            }}>
              All Slots Filled — Job Closed
            </button>
          )}
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 8, fontWeight: 600 }}>
            {job.slotsLeft} slots remaining · Payout {job.payoutDay}
          </p>
        </div>
      </div>

      {/* ─── APPLY MODAL ─── */}
      {showApply && <ApplyModal job={job} onClose={() => setShowApply(false)} />}
      {showShare && <SharePanel job={job} onClose={() => setShowShare(false)} />}
    </Layout>
  )
}

/* ─── Apply Modal ─── */
function ApplyModal({ job, onClose }: { job: JobData; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [xHandle, setXHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = () => {
    if (!xHandle || !file) return
    setLoading(true)
    setTimeout(() => { setLoading(false); setStep(2) }, 1800)
  }

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
        position: 'relative', width: '100%', maxWidth: 480,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '20px 20px 0 0', overflow: 'hidden',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>
              Apply for Job
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
              {job.title}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            color: 'var(--text3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {step === 1 ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.20)',
              borderRadius: 12, padding: '12px 16px',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Reward on approval</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>
                +{job.currency === 'USD' ? '$' : '₦'}{job.reward.toLocaleString()}
              </span>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                Your X (Twitter) Username *
              </label>
              <input value={xHandle} onChange={e => setXHandle(e.target.value)} placeholder="@yourusername" style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, outline: 'none',
              }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                Screenshot Proof *
              </label>
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 8, border: '2px dashed var(--border)', borderRadius: 12,
                padding: '20px 16px', cursor: 'pointer',
              }}>
                {file ? (
                  <>
                    <svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{file.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Click to change</span>
                  </>
                ) : (
                  <>
                    <svg width="24" height="24" fill="none" stroke="var(--text3)" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>Click to upload screenshot</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>PNG, JPG up to 10MB</span>
                  </>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
                Additional Notes <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra context for the reviewer..." rows={2} style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical',
                fontFamily: 'inherit',
              }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>
              By submitting you confirm all proof is genuine. Fake submissions result in account suspension.
            </p>
            <button onClick={submit} disabled={!xHandle || !file || loading} style={{
              width: '100%', border: 'none', color: '#fff', fontWeight: 700,
              padding: '14px 20px', borderRadius: 12, fontSize: 14, cursor: 'pointer',
              background: BRAND, opacity: (!xHandle || !file || loading) ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Submitting...</>
              ) : 'Submit Application →'}
            </button>
          </div>
        ) : (
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>Submission Received!</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>
                Your application is under review. You'll be notified within {job.approvalTime.toLowerCase()}.
              </p>
            </div>
            <div style={{
              width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>Job ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text)' }}>{job.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>Reward</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>
                  {job.currency === 'USD' ? '$' : '₦'}{job.reward.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>Payout day</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{job.payoutDay}</span>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: '100%', border: '1px solid var(--border)', background: 'var(--card)',
              color: 'var(--text2)', fontWeight: 700, padding: 12, borderRadius: 12, fontSize: 13, cursor: 'pointer',
            }}>
              Back to Job
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Share Panel ─── */
function SharePanel({ job, onClose }: { job: JobData; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = `https://ogapay.vercel.app/tasks/${job.id}`
  const copy = () => {
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const shares = [
    { label: 'X (Twitter)', icon: '𝕏', href: `https://twitter.com/intent/tweet?text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay!&url=${url}`, color: 'var(--text2)' },
    { label: 'WhatsApp', icon: '💬', href: `https://wa.me/?text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+completing+tasks+on+OgaPay:+${url}`, color: 'var(--text2)' },
    { label: 'Telegram', icon: '✈️', href: `https://t.me/share/url?url=${url}&text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay`, color: 'var(--text2)' },
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
        position: 'relative', width: '100%', maxWidth: 380,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: '20px 20px 0 0', padding: 20,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 700, color: 'var(--text)', margin: 0, fontSize: 14 }}>Share this Job</p>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            color: 'var(--text3)', cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {shares.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 6, padding: '10px 8px', background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 12,
              textDecoration: 'none', color: 'inherit',
            }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)' }}>{s.label}</span>
            </a>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
            Or copy link
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={url} style={{
              flex: 1, padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text)', fontSize: 11, fontFamily: 'monospace',
            }} />
            <button onClick={copy} style={{
              padding: '10px 14px', borderRadius: 10, border: 'none',
              background: BRAND, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
            }}>
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
