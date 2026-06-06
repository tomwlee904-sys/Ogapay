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
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => { const id = setInterval(() => setT(calc()), 1000); return () => clearInterval(id) }, [deadline])
  return t
}

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: `rgba(${BRAND_RGB},0.15)`, text: BRAND, border: `rgba(${BRAND_RGB},0.30)` },
    green: { bg: 'rgba(22,163,74,0.15)', text: '#16a34a', border: 'rgba(22,163,74,0.30)' },
    amber: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.30)' },
    red: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.30)' },
    gray: { bg: 'var(--bg2)', text: 'var(--text3)', border: 'var(--border)' },
  }
  const c = map[color] || map.blue
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  )
}

function CountdownBlock({ deadline }: { deadline: number }) {
  const { d, h, m, s } = useCountdown(deadline)
  const units = [
    { v: d, l: 'Days' },
    { v: h, l: 'Hrs' },
    { v: m, l: 'Min' },
    { v: s, l: 'Sec' },
  ]
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

function ApplyModal({ job, onClose, jobId }: { job: any; onClose: () => void; jobId?: string }) {
  const [step, setStep] = useState(1)
  const [xHandle, setXHandle] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const reward = Number(job.reward) || 0
  const currency = job.currency || 'NGN'
  const symbol = currency === 'USD' ? '$' : '₦'

  const handleSubmit = () => {
    if (!xHandle || !file) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setStep(2)
    }, 1800)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 512, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px 24px 0 0', overflow: 'hidden', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Apply for Job</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{job.title}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {step === 1 ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Reward reminder */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.20)', borderRadius: 12, padding: '12px 16px' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Reward on approval</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#16a34a' }}>+{symbol}{reward.toLocaleString()}</span>
            </div>

            {/* X handle */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Your X (Twitter) Username *</label>
              <input
                value={xHandle}
                onChange={e => setXHandle(e.target.value)}
                placeholder="@yourusername"
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
              />
            </div>

            {/* Proof upload */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Screenshot Proof *</label>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, border: '2px dashed var(--border)', borderRadius: 12, padding: '24px 16px', cursor: 'pointer' }}>
                {file ? (
                  <>
                    <svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>{file.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>Click to change</span>
                  </>
                ) : (
                  <>
                    <svg width="24" height="24" fill="none" stroke="var(--text3)" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>Click to upload screenshot</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', opacity: 0.6 }}>PNG, JPG up to 10MB</span>
                  </>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Additional Notes <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(optional)</span></label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add any notes or comments..."
                rows={3}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical' }}
              />
            </div>

            {/* Disclaimer */}
            <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>By submitting, you confirm that your submission is accurate and complies with OgaPay's terms.</p>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!xHandle || !file || loading}
              style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: !xHandle || !file ? 'var(--border)' : BRAND, color: !xHandle || !file ? 'var(--text3)' : '#fff', fontWeight: 700, fontSize: 14, cursor: !xHandle || !file ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} /> Submitting...</>
              ) : 'Submit Application →'}
            </button>
          </div>
        ) : (
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)', margin: 0 }}>Submission Received!</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Your application is under review. You'll be notified within {job.approvalTime || '24 hours'}.</p>
            </div>
            <div style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>Job ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text)' }}>{job.id || jobId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>Reward</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>{symbol}{reward.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text3)' }}>Payout day</span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{job.payoutDay || 'Weekly'}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: '100%', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 700, padding: 12, borderRadius: 12, fontSize: 13, cursor: 'pointer' }}>
              Back to Job
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SharePanel({ job, onClose, jobId }: { job: any; onClose: () => void; jobId?: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://ogapay.vercel.app/tasks/${jobId || ''}`
  const reward = Number(job.reward) || 0
  const symbol = (job.currency || 'NGN') === 'USD' ? '$' : '₦'

  const copy = () => {
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shares = [
    { label: 'X (Twitter)', icon: '𝕏', href: `https://twitter.com/intent/tweet?text=Earn+${symbol}${reward}+on+OgaPay!&url=${url}` },
    { label: 'WhatsApp', icon: 'W', href: `https://wa.me/?text=Earn+${symbol}${reward}+completing+tasks+on+OgaPay:+${url}` },
    { label: 'Telegram', icon: 'T', href: `https://t.me/share/url?url=${url}&text=Earn+${symbol}${reward}+on+OgaPay` },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 380, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '24px 24px 0 0', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 700, color: 'var(--text)', margin: 0, fontSize: 14 }}>Share this Job</p>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {shares.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text2)' }}>{s.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)' }}>{s.label}</span>
            </a>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Or copy link</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={url} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 11, fontFamily: 'monospace' }} />
            <button onClick={copy} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: BRAND, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Similar Jobs placeholder ──
const SIMILAR_PLACEHOLDERS = [
  { id: 'OGA-0840', title: 'Join OgaPay Telegram Community', reward: 300, slots: 500, left: 212, type: 'Social' },
  { id: 'OGA-0839', title: 'Like & Comment on Instagram Post', reward: 350, slots: 300, left: 88, type: 'Social' },
  { id: 'OGA-0835', title: 'OGA Token Airdrop Task', reward: 2000, slots: 100, left: 23, type: 'Crypto' },
]

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [showApply, setShowApply] = useState(false)
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

  if (loading) return (
    <Layout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', textAlign: 'center', color: 'var(--text3)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: BRAND, borderRadius: '50%', animation: 'spin .6s linear infinite', margin: '0 auto 16px', display: 'inline-block' }} />
        <p style={{ fontSize: 14 }}>Loading task details...</p>
      </div>
    </Layout>
  )

  if (!job) return (
    <Layout>
      <div style={{ maxWidth: 720, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <svg width="48" height="48" fill="none" stroke="var(--text3)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 16px', display: 'block' }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Task Not Found</h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', margin: '0 0 24px' }}>This task does not exist or has been removed.</p>
        <button onClick={() => navigate('/tasks')} style={{ height: 44, padding: '0 24px', borderRadius: 999, background: BRAND, color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          ← Browse Tasks
        </button>
      </div>
    </Layout>
  )

  const reward = Number(job.reward) || 0
  const currency = job.currency || 'NGN'
  const symbol = currency === 'USD' ? '$' : '₦'
  const slots = job.maxWorkers || 1
  const filled = job.currentWorkers || 0
  const slotsLeft = slots - filled
  const filledPct = pct(filled, slots)
  const isAlmostFull = slotsLeft < Math.round(slots * 0.3)
  const deadline = job.deadline ? new Date(job.deadline).getTime() : Date.now() + 86400000 * 2
  const creatorName = job.poster?.username || 'OgaPay'
  const creatorHandle = job.poster?.handle || `@${creatorName}`
  const totalPool = `${symbol}${(reward * slots).toLocaleString()}`
  const creatorInitials = (creatorName || 'OP').slice(0, 2).toUpperCase()

  return (
    <Layout>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-spin { animation: spin .8s linear infinite; }
        .line-clamp-1 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
        .line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .progress-fill { transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      {/* ── STICKY NAV ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 52
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate(-1)}
            style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 900 }}>O</div>
            <span style={{ fontWeight: 900, fontSize: 13, color: 'var(--text)', letterSpacing: '-0.02em' }}>OgaPay</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setBookmarked(b => !b)}
            style={{
              width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .13s', border: '1px solid var(--border)',
              background: bookmarked ? `rgba(${BRAND_RGB},0.15)` : 'transparent',
              color: bookmarked ? BRAND : 'var(--text2)', cursor: 'pointer'
            }}>
            <svg width="14" height="14" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </button>
          <button onClick={() => setShowShare(true)}
            style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 140px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── JOB HEADER CARD ── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          {/* Creator row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `linear-gradient(135deg,${BRAND},#4f46e5)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 14, flexShrink: 0
            }}>{creatorInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{creatorName}</span>
                <svg width="14" height="14" fill={BRAND} stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{creatorHandle}</span>
            </div>
            <Badge color={job.status === 'open' ? 'green' : job.status === 'in_progress' ? 'amber' : 'red'}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: job.status === 'open' ? '#16a34a' : job.status === 'in_progress' ? '#f59e0b' : '#ef4444', display: 'inline-block' }} />
              {(job.status || 'open').charAt(0).toUpperCase() + (job.status || 'open').slice(1)}
            </Badge>
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.3 }}>{job.title}</h1>

          {/* Badge row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            <Badge>{job.category || 'General'}</Badge>
            <Badge>{job.type || 'Task'}</Badge>
            {job.platform && <Badge color="gray">{job.platform}</Badge>}
            <Badge color={job.difficulty === 'Easy' ? 'green' : job.difficulty === 'Medium' ? 'amber' : 'red'}>{job.difficulty || 'All Levels'}</Badge>
          </div>

          {/* Reward + Pool */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>Reward</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: `rgba(${BRAND_RGB},1)`, margin: 0 }}>{symbol}{reward.toLocaleString()}</p>
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>Total Pool</p>
              <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0 }}>{totalPool}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{filled}/{slots} filled</span>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{filledPct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg2)', borderRadius: 99, overflow: 'hidden' }}>
              <div className="progress-fill" style={{ height: '100%', borderRadius: 99, background: BRAND, width: `${filledPct}%` }} />
            </div>
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Job ID', value: job.id || id },
              { label: 'Posted', value: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Today' },
              { label: 'Approval', value: job.approvalTime || 'Within 24h' },
              { label: 'Payout Day', value: job.payoutDay || 'Weekly' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text3)', fontWeight: 600 }}>{m.label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{m.value}</span>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>Time Remaining</p>
            <CountdownBlock deadline={deadline} />
          </div>

          {/* Applicant avatars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `var(--bg2)`, border: '2px solid var(--card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: 'var(--text2)',
                  marginLeft: i > 1 ? -8 : 0
                }}>
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{filled} completed · {slotsLeft} slots left</span>
          </div>
        </div>

        {/* ── TABS CARD ── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {['details', 'requirements', 'activity'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, height: 44, padding: '0 12px',
                  fontSize: 12, fontWeight: 700,
                  color: activeTab === tab ? 'var(--text)' : 'var(--text3)',
                  border: 'none', borderBottom: activeTab === tab ? `2px solid ${BRAND}` : '2px solid transparent',
                  background: 'none', cursor: 'pointer',
                  textTransform: 'capitalize' as const,
                  transition: 'color .13s, border-color .13s'
                }}>
                {tab === 'details' ? 'Details' : tab === 'requirements' ? 'Requirements' : 'Activity'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: 20 }}>
            {activeTab === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* About */}
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>About this Task</h3>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{job.description || 'No description provided.'}</p>
                </div>

                {/* Steps */}
                {job.steps && job.steps.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>Steps to Complete</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(Array.isArray(job.steps) ? job.steps : []).map((step: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', background: `rgba(${BRAND_RGB},0.15)`, color: BRAND, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proof required */}
                {job.proofRequired && job.proofRequired.length > 0 && (
                  <div style={{ background: `rgba(${BRAND_RGB},0.08)`, border: `1px solid rgba(${BRAND_RGB},0.15)`, borderRadius: 12, padding: 14 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: BRAND, margin: '0 0 8px' }}>Proof Required</h3>
                    <ul style={{ margin: 0, padding: '0 0 0 16px', color: 'var(--text2)', fontSize: 12, lineHeight: 1.8 }}>
                      {(Array.isArray(job.proofRequired) ? job.proofRequired : []).map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags */}
                {job.tags && job.tags.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>Tags</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(Array.isArray(job.tags) ? job.tags : []).map((tag: string, i: number) => (
                        <span key={i} style={{ padding: '4px 10px', borderRadius: 999, background: `rgba(${BRAND_RGB},0.10)`, color: BRAND, fontSize: 11, fontWeight: 700, border: `1px solid rgba(${BRAND_RGB},0.15)` }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requirements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {job.requirements && job.requirements.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(Array.isArray(job.requirements) ? job.requirements : []).map((req: string, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <svg width="16" height="16" fill="none" stroke={BRAND} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{req}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: `rgba(${BRAND_RGB},0.08)`, border: `1px solid rgba(${BRAND_RGB},0.15)`, borderRadius: 12, padding: 14, textAlign: 'center' }}>
                    <svg width="24" height="24" fill="none" stroke={BRAND} strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 8px', display: 'block' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>No specific requirements listed. This task is open to everyone.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <svg width="32" height="32" fill="none" stroke="var(--text3)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>Activity log coming soon</p>
                <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0', opacity: 0.7 }}>Submissions and updates will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── SIMILAR JOBS ── */}
        <div>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Similar Jobs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SIMILAR_PLACEHOLDERS.map(j => (
              <div key={j.id}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => navigate(`/tasks/${j.id}`)}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(${BRAND_RGB},0.12)`, border: `1px solid rgba(${BRAND_RGB},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke={BRAND} strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 0' }}>{j.left} slots left · {j.type}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 900, color: '#16a34a', margin: 0 }}>{symbol}{j.reward.toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>{j.id}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── REPORT ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '8px 16px' }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            Report this job
          </button>
        </div>
      </div>

      {/* ── STICKY BOTTOM CTA ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, padding: 16,
        background: 'linear-gradient(to top, var(--bg) 60%, transparent)'
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {slotsLeft > 0 ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowApply(true)}
                style={{
                  flex: 1, height: 52, borderRadius: 14,
                  background: BRAND, color: '#fff',
                  fontWeight: 900, fontSize: 14,
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: `0 0 0 1px rgba(${BRAND_RGB},0.3), 0 8px 32px rgba(${BRAND_RGB},0.12)`
                }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Apply & Earn {symbol}{reward.toLocaleString()} →
              </button>
              <button onClick={() => setBookmarked(b => !b)}
                style={{
                  width: 52, height: 52, borderRadius: 14,
                  border: '1.5px solid var(--border)',
                  background: bookmarked ? `rgba(${BRAND_RGB},0.12)` : 'var(--card)',
                  color: bookmarked ? BRAND : 'var(--text2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'all .13s'
                }}>
                <svg width="16" height="16" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </button>
            </div>
          ) : (
            <button disabled style={{ width: '100%', height: 52, borderRadius: 14, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)', fontWeight: 900, fontSize: 14, cursor: 'not-allowed' }}>
              All Slots Filled — Job Closed
            </button>
          )}
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 8, fontWeight: 600 }}>
            {slotsLeft} slots remaining · Payout every {job.payoutDay || 'week'}
          </p>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showApply && <ApplyModal job={job} onClose={() => setShowApply(false)} jobId={id} />}
      {showShare && <SharePanel job={job} onClose={() => setShowShare(false)} jobId={id} />}
    </Layout>
  )
}
