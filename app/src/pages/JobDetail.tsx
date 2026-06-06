import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'
const BRAND = '#1F8CFF'
const BRAND_RGB = '31,140,255'

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

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: `rgba(${BRAND_RGB},0.15)`, text: BRAND, border: `rgba(${BRAND_RGB},0.30)` },
    green: { bg: 'rgba(22,163,74,0.15)', text: '#16a34a', border: 'rgba(22,163,74,0.30)' },
    gray: { bg: 'var(--bg2)', text: 'var(--text3)', border: 'var(--border)' },
  }
  const c = map[color] || map.gray
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  )
}

function CountdownBlock({ deadline }: { deadline: number }) {
  const { d, h, m, s } = useCountdown(deadline)
  const units = [{ v: d, l: 'Days' }, { v: h, l: 'Hrs' }, { v: m, l: 'Min' }, { v: s, l: 'Sec' }]
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {units.map(({ v, l }) => (
        <div key={l} style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px' }}>
          <span style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{pad(v)}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, marginTop: 2 }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    fetch(`${API_BASE}/tasks/${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) setJob(json.data.task || json.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <Layout><div style={{ padding: 40, textAlign: 'center' }}>Loading...</div></Layout>
  if (!job) return (
    <Layout>
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Task Not Found</h2>
        <button onClick={() => navigate('/tasks')}>Back to Tasks</button>
      </div>
    </Layout>
  )

  const reward = Number(job.reward) || 0
  const slots = job.maxWorkers || 1
  const filled = job.currentWorkers || 0
  const slotsLeft = slots - filled
  const filledPct = pct(filled, slots)
  const isAlmostFull = slotsLeft < 60
  const deadline = job.deadline ? new Date(job.deadline).getTime() : Date.now() + 86400000 * 2
  const creatorName = job.poster?.username || 'OgaPay'

  return (
    <Layout>
      {/* Sticky Nav Bar */}
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
          <button onClick={() => setBookmarked(b => !b)} style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </button>
          <button onClick={() => setShowShare(true)} style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 768, margin: '0 auto', padding: '16px 16px 140px' }}>
        {/* Header Card */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          {/* Brand row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 900, flexShrink: 0, background: BRAND }}>
              {creatorName.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{creatorName}</span>
                {job.poster?.posterProfile?.isVerified && <svg width="14" height="14" viewBox="0 0 24 24" fill={BRAND}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>@{creatorName.toLowerCase()}</span>
            </div>
            <Badge color="green">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', marginRight: 2 }} /> Open
            </Badge>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.3, margin: '0 0 12px', color: 'var(--text)' }}>{job.title}</h1>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            <Badge color="blue">{job.category || 'General'}</Badge>
            <Badge color="blue">{job.tags?.[0] || 'Web'}</Badge>
            <Badge color="gray">{job.estimatedTime ? (job.estimatedTime <= 10 ? 'Easy' : job.estimatedTime <= 30 ? 'Medium' : 'Hard') : 'Easy'}</Badge>
            <Badge color="gray">⏱ {job.estimatedTime ? `${job.estimatedTime} min` : '—'}</Badge>
          </div>

          {/* Reward & Pool */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Reward per task</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#16a34a', margin: 0, lineHeight: 1.2 }}>{job.currency === 'USD' ? '$' : '₦'}{reward.toLocaleString()}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>≈ {job.usdEquiv || `$${(reward * 0.00062).toFixed(2)}`} USD</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Total Pool</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: 0 }}>{job.currency === 'USD' ? '$' : '₦'}{(reward * slots).toLocaleString()}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>{slots} slots total</p>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{filled} completed</span>
            <span style={{ fontWeight: 700, color: isAlmostFull ? '#f5b301' : 'var(--text2)' }}>{slotsLeft} slots left</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg2)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${BRAND}, #16a34a)`, width: `${filledPct}%`, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Job ID', value: job.id || id, mono: true },
              { label: 'Posted', value: job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent' },
              { label: 'Approval', value: job.approvalTime || 'Within 24 hours' },
              { label: 'Payout Day', value: job.payoutDay || 'Weekly' },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{m.label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, fontFamily: m.mono ? 'monospace' : undefined }}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>⏳ Time Remaining</p>
            <CountdownBlock deadline={deadline} />
          </div>

          {/* Applicants */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', marginRight: -4 }}>
              {['#1F8CFF','#16a34a','#f5b301','#dc2626','#3b82f6'].slice(0, Math.min(5, filled)).map((c, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 900, background: c, marginLeft: i > 0 ? -8 : 0 }}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text2)' }}>
              <span style={{ color: 'var(--text)', fontWeight: 700 }}>{filled}</span> people already completed this
            </p>
          </div>
        </div>

        {/* Description + Apply */}
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 20px' }}>{job.description || job.instructions || 'No description provided.'}</p>
        <button onClick={() => navigate(`/tasks/${id}/submit`)} style={{ height: 44, padding: '0 24px', borderRadius: 999, background: BRAND, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Apply Now
        </button>
      </div>

      {/* Share Panel */}
      {showShare && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowShare(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: 380, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px 24px 0 0', padding: 20 }}>
            <p style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 12px', fontSize: 14 }}>Share this Job</p>
            <input readOnly value={`https://ogapay.vercel.app/tasks/${id}`} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 11, fontFamily: 'monospace', marginBottom: 12 }} />
            <button onClick={() => { navigator.clipboard?.writeText(`https://ogapay.vercel.app/tasks/${id}`); setShowShare(false) }} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: BRAND, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Copy Link</button>
          </div>
        </div>
      )}
    </Layout>
  )
}
