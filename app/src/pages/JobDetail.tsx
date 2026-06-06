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
    return { d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) }
  }
  const [t, setT] = useState(calc)
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id) }, [deadline])
  return t
}

const BRAND = '#1F8CFF'
const BRAND_RGB = '31,140,255'

/* ─── Badge ─── */
function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: `rgba(${BRAND_RGB},0.15)`, text: BRAND, border: `rgba(${BRAND_RGB},0.30)` },
    green: { bg: 'rgba(22,163,74,0.15)', text: '#16a34a', border: 'rgba(22,163,74,0.30)' },
    amber: { bg: 'rgba(245,179,1,0.15)', text: '#f5b301', border: 'rgba(245,179,1,0.30)' },
    red: { bg: 'rgba(220,38,38,0.15)', text: '#dc2626', border: 'rgba(220,38,38,0.30)' },
    gray: { bg: 'rgba(255,255,255,0.05)', text: 'var(--text3)', border: 'rgba(255,255,255,0.10)' },
  }
  const c = map[color] || map.gray
  return (
    <span className="badge" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  )
}

/* ─── Countdown ─── */
function CountdownBlock({ deadline }: { deadline: number }) {
  const { d, h, m, s } = useCountdown(deadline)
  const units = [
    { v: d, l: 'Days' }, { v: h, l: 'Hrs' }, { v: m, l: 'Min' }, { v: s, l: 'Sec' },
  ]
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {units.map(({ v, l }) => (
        <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px' }}>
          <span style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{pad(v)}</span>
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
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('details')
  const [showApply, setShowApply] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    const fetchJob = async () => {
      try {
        const res = await fetch(`${API_BASE}/tasks/${id}`)
        const json = await res.json()
        if (json.success && json.data) {
          setJob(formatTask(json.data.task || json.data))
        } else {
          const res2 = await fetch(`${API_BASE}/jobs/${id}`)
          const json2 = await res2.json()
          if (json2.success && json2.data) setJob(formatTask(json2.data))
          else setError('Task not found')
        }
      } catch { setError('Failed to load task') }
      setLoading(false)
    }
    fetchJob()
  }, [id])

  function formatTask(t: any) {
    const now = Date.now()
    const deadline = t.deadline ? new Date(t.deadline).getTime() : now + 86400000 * 2
    const reward = Number(t.reward) || 0
    const slots = t.maxWorkers || 1
    const filled = t.currentWorkers || 0
    const pool = (reward * slots).toLocaleString()
    const usd = t.usdEquiv || `$${(reward * 0.00062).toFixed(2)}`
    const name = t.poster?.username || 'OgaPay'
    return {
      id: t.id || id || '',
      title: t.title || 'Untitled Task',
      description: t.description || t.instructions || '',
      brand: name, brandHandle: `@${name.toLowerCase()}`,
      brandAvatar: name.slice(0, 2).toUpperCase(),
      brandVerified: t.poster?.posterProfile?.isVerified || false,
      category: t.category || 'General', platform: t.tags?.[0] || 'Web',
      reward, currency: t.currency || 'NGN', usdEquiv: usd,
      slots, slotsLeft: slots - filled, completions: filled, deadline,
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
      totalPool: `${t.currency === 'USD' ? '$' : '₦'}${pool}`,
      similarJobs: [],
    }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 10, color: 'var(--text3)' }}>
          <div className="spinner" /> Loading task...
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
          <button onClick={() => navigate('/tasks')} style={{ height: 44, padding: '0 24px', borderRadius: 999, background: BRAND, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            <i className="ti ti-arrow-left" style={{ marginRight: 6 }} /> Browse Tasks
          </button>
        </div>
      </Layout>
    )
  }

  const filledPct = pct(job.completions, job.slots)
  const isAlmostFull = job.slotsLeft < 60

  return (
    <Layout>
      <style>{`
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; }
        .card-sm { background: var(--card); border: 1px solid var(--border); border-radius: 12px; }
        .glow { box-shadow: 0 0 0 1px rgba(${BRAND_RGB},0.3), 0 8px 32px rgba(${BRAND_RGB},0.12); }
        .tab-active { color: var(--text); border-bottom: 2px solid ${BRAND}; }
        .tab-inactive { color: var(--text3); border-bottom: 2px solid transparent; }
        .tab-inactive:hover { color: var(--text); }
        .progress-bar { transition: width 0.8s cubic-bezier(.4,0,.2,1); }
        .badge { font-family: inherit; }
      `}</style>

      {/* ── Sticky Nav Bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--card)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 34 34" fill="none"><rect width="34" height="34" rx="6" fill="white"/><rect x="6.5" y="6.5" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 6.5H20.7C21.5 6.5 22.2 7.2 22.2 8V13.6H15V6.5Z" fill="black"/><path d="M23.4 6.5H26C29.2 6.5 31.2 8.5 31.2 11.7V13.6H23.4V6.5Z" fill="black"/><rect x="6.5" y="15" width="7.1" height="7.1" fill="black"/><rect x="15" y="15" width="7.1" height="7.1" fill="black"/><path d="M23.4 15H31.2V16.9C31.2 20.1 29.2 22.1 26 22.1H23.4V15Z" fill="black"/><rect x="6.5" y="23.4" width="7.1" height="7.1" rx="1.3" fill="black"/><path d="M15 23.4H20.7C21.5 23.4 22.2 24.1 22.2 24.9V29.2C22.2 30 21.5 30.7 20.7 30.7H15V23.4Z" fill="black"/></svg>
            </div>
            <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: '-0.3px', color: 'var(--text)' }}>OgaPay</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setBookmarked(b => !b)} style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${bookmarked ? `rgba(${BRAND_RGB},0.40)` : 'var(--border)'}`, background: bookmarked ? `rgba(${BRAND_RGB},0.15)` : 'transparent', color: bookmarked ? BRAND : 'var(--text3)', cursor: 'pointer' }}>
            <svg width="16" height="16" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </button>
          <button onClick={() => setShowShare(true)} style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 768, margin: '0 auto', padding: '16px 16px 140px' }}>

        {/* ── HEADER CARD ── */}
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 900, flexShrink: 0, background: BRAND }}>
              {job.brandAvatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{job.brand}</span>
                {job.brandVerified && <svg width="14" height="14" viewBox="0 0 24 24" fill={BRAND}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{job.brandHandle}</span>
            </div>
            <Badge color="green">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', marginRight: 2 }} />
              Open
            </Badge>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.3, margin: '0 0 12px', color: 'var(--text)' }}>{job.title}</h1>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            <Badge color="blue">{job.category}</Badge>
            <Badge color="blue">{job.platform}</Badge>
            <Badge color="gray">{job.difficulty}</Badge>
            <Badge color="gray">⏱ {job.estimatedTime}</Badge>
          </div>

          {/* Reward hero */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Reward per task</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#16a34a', margin: 0, lineHeight: 1.2 }}>{job.currency === 'USD' ? '$' : '₦'}{job.reward.toLocaleString()}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>≈ {job.usdEquiv} USD</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Total Pool</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>{job.totalPool}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>{job.slots} slots total</p>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{job.completions} completed</span>
            <span style={{ fontWeight: 700, color: isAlmostFull ? '#f5b301' : 'var(--text2)' }}>{job.slotsLeft} slots left</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
            <div className="progress-bar" style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${BRAND}, #16a34a)`, width: `${filledPct}%` }} />
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Job ID', value: job.id, mono: true },
              { label: 'Posted', value: job.posted },
              { label: 'Approval', value: job.approvalTime },
              { label: 'Payout Day', value: job.payoutDay },
            ].map(m => (
              <div key={m.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{m.label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: m.mono ? 'monospace' : undefined }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>⏳ Time Remaining</p>
            <CountdownBlock deadline={job.deadline} />
          </div>

          {/* Applicants */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', marginRight: -4 }}>
              {['#1F8CFF','#16a34a','#f5b301','#dc2626','#3b82f6'].slice(0, Math.min(5, job.completions)).map((c, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 900, background: c, marginLeft: i > 0 ? -8 : 0 }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>
              <span style={{ color: 'var(--text)', fontWeight: 700 }}>{job.completions}</span> people already completed this
            </p>
          </div>
        </div>

        {/* ── TABS CARD ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {['details', 'requirements', 'activity'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '14px 0', border: 'none', background: 'transparent',
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  cursor: 'pointer',
                  color: activeTab === tab ? 'var(--text)' : 'var(--text3)',
                  borderBottom: activeTab === tab ? `2px solid ${BRAND}` : '2px solid transparent',
                  transition: 'color .15s',
                }}>
                {tab}
              </button>
            ))}
          </div>

          <div style={{ padding: 20 }}>
            {/* DETAILS */}
            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>About This Task</h3>
                  {(job.description || '').split('\n\n').map((p: string, i: number) => (
                    <p key={i} style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65, margin: '0 0 8px' }}>{p}</p>
                  ))}
                </div>
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Steps to Complete</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {job.steps.map((step: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 24, height: 24, borderRadius: 8, background: `rgba(${BRAND_RGB},0.15)`, border: `1px solid rgba(${BRAND_RGB},0.30)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: BRAND, flexShrink: 0, marginTop: 2 }}>
                          {i + 1}
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Proof Required</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {job.proofRequired.map((p: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text2)' }}>
                        <svg width="14" height="14" fill="none" stroke={BRAND} strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Tags</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {job.tags.map((t: string, i: number) => <Badge key={i} color="gray">{t}</Badge>)}
                  </div>
                </div>
              </div>
            )}

            {/* REQUIREMENTS */}
            {activeTab === 'requirements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Eligibility Requirements</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {job.requirements.map((r: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                        <svg width="14" height="14" fill="none" stroke="#f5b301" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.20)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <svg width="14" height="14" fill="none" stroke="#dc2626" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Warning</p>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
                    Submitting fake, edited, or borrowed screenshots will result in immediate rejection and may lead to account suspension. OgaPay's AI review system checks all submissions.
                  </p>
                </div>
              </div>
            )}

            {/* ACTIVITY */}
            {activeTab === 'activity' && (
              <p style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>
                Task activity and submission stats will appear here once available.
              </p>
            )}
          </div>
        </div>

        {/* ── REPORT ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', background: 'transparent', color: 'var(--text3)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'color .15s' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            Report this job
          </button>
        </div>
      </div>

      {/* ── STICKY BOTTOM CTA ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, padding: 16, background: 'linear-gradient(to top, var(--bg) 60%, transparent)' }}>
        <div style={{ maxWidth: 768, margin: '0 auto' }}>
          {job.slotsLeft > 0 ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowApply(true)}
                className="glow"
                style={{
                  flex: 1, border: 'none', color: '#fff', fontWeight: 900,
                  padding: '14px 20px', borderRadius: 14, fontSize: 14, cursor: 'pointer',
                  background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Apply & Earn {job.currency === 'USD' ? '$' : '₦'}{job.reward.toLocaleString()} →
              </button>
              <button onClick={() => setBookmarked(b => !b)}
                style={{
                  width: 52, borderRadius: 14, border: `1px solid ${bookmarked ? `rgba(${BRAND_RGB},0.40)` : 'var(--border)'}`,
                  background: bookmarked ? `rgba(${BRAND_RGB},0.15)` : 'var(--card)',
                  color: bookmarked ? BRAND : 'var(--text3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}>
                <svg width="16" height="16" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </button>
            </div>
          ) : (
            <button disabled style={{ width: '100%', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text3)', fontWeight: 900, padding: '14px 20px', borderRadius: 14, fontSize: 14, cursor: 'not-allowed' }}>
              All Slots Filled — Job Closed
            </button>
          )}
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 8, fontWeight: 600 }}>
            {job.slotsLeft} slots remaining · Payout {job.payoutDay}
          </p>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showApply && <ApplyModal job={job} onClose={() => setShowApply(false)} />}
      {showShare && <SharePanel job={job} onClose={() => setShowShare(false)} />}
    </Layout>
  )
}

/* ─── Apply Modal ─── */
function ApplyModal({ job, onClose }: { job: any; onClose: () => void }) {
  const [step, setStep] = useState(1)
  const [xHandle, setXHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = () => { if (!xHandle || !file) return; setLoading(true); setTimeout(() => { setLoading(false); setStep(2) }, 1800) }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px 24px 0 0', overflow: 'hidden', boxShadow: '0 -8px 32px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Apply for Job</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{job.title}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {step === 1 ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.20)', borderRadius: 12, padding: '12px 16px' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Reward on approval</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>+{job.currency === 'USD' ? '$' : '₦'}{job.reward.toLocaleString()}</span>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Your X (Twitter) Username *</label>
              <input value={xHandle} onChange={e => setXHandle(e.target.value)} placeholder="@yourusername" style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Screenshot Proof *</label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, border: '2px dashed var(--border)', borderRadius: 12, padding: '20px 16px', cursor: 'pointer' }}>
                {file ? (
                  <><svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{file.name}</span><span style={{ fontSize: 11, color: 'var(--text3)' }}>Click to change</span></>
                ) : (
                  <><svg width="24" height="24" fill="none" stroke="var(--text3)" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span style={{ fontSize: 12, color: 'var(--text3)' }}>Click to upload screenshot</span><span style={{ fontSize: 10, color: 'var(--text3)' }}>PNG, JPG up to 10MB</span></>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Additional Notes <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any extra context for the reviewer..." rows={2} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, margin: 0 }}>By submitting you confirm all proof is genuine. Fake submissions result in account suspension.</p>
            <button onClick={submit} disabled={!xHandle || !file || loading} style={{ width: '100%', border: 'none', color: '#fff', fontWeight: 700, padding: '14px 20px', borderRadius: 12, fontSize: 14, cursor: 'pointer', background: BRAND, opacity: (!xHandle || !file || loading) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Submitting...</> : 'Submit Application →'}
            </button>
          </div>
        ) : (
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: '0 0 4px' }}>Submission Received!</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>Your application is under review. You'll be notified within {job.approvalTime.toLowerCase()}.</p>
            </div>
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text3)' }}>Job ID</span><span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text)' }}>{job.id}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text3)' }}>Reward</span><span style={{ fontWeight: 700, color: '#16a34a' }}>{job.currency === 'USD' ? '$' : '₦'}{job.reward.toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--text3)' }}>Payout day</span><span style={{ fontWeight: 600, color: 'var(--text)' }}>{job.payoutDay}</span></div>
            </div>
            <button onClick={onClose} style={{ width: '100%', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text2)', fontWeight: 700, padding: 12, borderRadius: 12, fontSize: 13, cursor: 'pointer' }}>Back to Job</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Share Panel ─── */
function SharePanel({ job, onClose }: { job: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const url = `https://ogapay.vercel.app/tasks/${job.id}`
  const copy = () => { navigator.clipboard?.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const shares = [
    { label: 'X (Twitter)', icon: '𝕏', href: `https://twitter.com/intent/tweet?text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay!&url=${url}` },
    { label: 'WhatsApp', icon: '💬', href: `https://wa.me/?text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+completing+tasks+on+OgaPay:+${url}` },
    { label: 'Telegram', icon: '✈️', href: `https://t.me/share/url?url=${url}&text=Earn+${job.currency === 'USD' ? '$' : '₦'}${job.reward}+on+OgaPay` },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 380, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px 24px 0 0', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 700, color: 'var(--text)', margin: 0, fontSize: 14 }}>Share this Job</p>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--text3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {shares.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)' }}>{s.label}</span>
            </a>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Or copy link</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={url} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 11, fontFamily: 'monospace' }} />
            <button onClick={copy} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: BRAND, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{copied ? '✓' : 'Copy'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
