import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE, getAccessToken, getStoredUser } from '../lib/api'

const BLUE = '#121566'
const BLUE_LIGHT = '#EEEDFE'
const BLUE_DARK = '#0D6EEB'

// ── Types ──
type TaskData = {
  id: string; title: string; description: string; status: string; category: string; type: string
  reward: number; currency: string; usdValue: number; slots: number; slotsLeft: number; completions: number
  deadline: string | null; posted: string; difficulty: string; estimatedTime: string
  instructions: string; requirements: string[]; proofInstructions: string[]; tags: string[]; platform: string
  brand: string; brandHandle: string; brandVerified: boolean; creatorId: string
  creator: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null; walletAddress: string | null; isVerified: boolean }
  totalPool: number; approvalTime: string
}
type Submission = { id: string; workerName: string; workerInitials: string; workerColor: string; status: string; time: string }

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
const pad = (n: number) => String(n).padStart(2, '0')
const pct = (a: number, b: number) => Math.round((a / b) * 100)
const getName = (u: any) => u?.firstName || u?.username || u?.fullName || 'OgaPay'
const getInitials = (u: any) => { const n = getName(u); return n.split(/\s+/).slice(0,2).map((s:string) => s[0]).join('').toUpperCase() || '?' }
const fmtAddr = (a: string | null) => a && a.length > 12 ? a.slice(0,4)+'...'+a.slice(-4) : a || ''

// ── API ──
async function fetchTask(id: string): Promise<TaskData | null> {
  try {
    const token = getAccessToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token
    let res = await fetch(`${API_BASE}/tasks/${id}`, { headers })
    if (!res.ok) res = await fetch(`${API_BASE}/jobs/${id}`, { headers })
    const json = await res.json()
    let data = json?.data?.task || json?.data || json
    if (!data || !data.id) { const res2 = await fetch(`${API_BASE}/jobs/${id}`, { headers }); const j2 = await res2.json(); data = j2?.data?.task || j2?.data || j2 }
    if (!data || !data.id) return null
    const cr = data.poster || data.creator || {}
    const tags = Array.isArray(data.tags) ? data.tags : typeof data.tags === 'string' ? data.tags.split(',').map((t:string)=>t.trim()).filter(Boolean) : data.category ? [data.category] : []
    const slots = data.maxWorkers || data.slots || 1; const filled = data.currentWorkers || data.filled || 0
    return {
      id: data.id, title: data.title || 'Untitled Task', description: data.description || '',
      status: (data.status || 'open').toLowerCase(), category: data.category || 'General', type: data.type || 'Standard',
      reward: Number(data.reward) || 0, currency: data.currency || 'OGA', usdValue: Number(data.usdValue || 0),
      slots, slotsLeft: slots - filled, completions: filled,
      deadline: data.expiryDate || data.deadline || null, posted: data.createdAt || new Date().toISOString(),
      difficulty: data.difficulty || 'Easy', estimatedTime: data.estimatedTime ? `${data.estimatedTime} min` : data.timeEstimate || '—',
      instructions: data.instructions || data.description || '', requirements: data.requirements || [],
      proofInstructions: data.proofRequired ? (Array.isArray(data.proofRequired) ? data.proofRequired : [data.proofRequired]) : [],
      tags, platform: tags[0] || 'Web',
      brand: getName(cr) || 'OgaPay', brandHandle: cr?.username ? `@${cr.username}` : '@ogapay',
      brandVerified: !!cr.isVerified || !!cr.verified_creator, creatorId: cr.id || '',
      creator: { id: cr.id || '', username: cr.username || cr.nickname || 'ogapay', firstName: cr.firstName || cr.first_name || '', lastName: cr.lastName || cr.last_name || '', avatarUrl: cr.avatarUrl || cr.avatar_url || cr.pfp_url || null, walletAddress: cr.walletAddress || cr.wallet_address || null, isVerified: !!cr.isVerified || !!cr.verified_creator },
      totalPool: Number(data.totalPool || data.reward * slots || 0), approvalTime: data.approvalTime || data.reviewTime || 'Within 24 hours',
    }
  } catch { return null }
}

async function fetchSubmissions(taskId: string): Promise<Submission[]> {
  try {
    const token = getAccessToken(); if (!token) return []
    const res = await fetch(`${API_BASE}/tasks/${taskId}/submissions`, { headers: { 'Authorization': `Bearer ${token}` } })
    const json = await res.json(); const items = json?.data || json || []
    if (!Array.isArray(items)) return []
    return items.map((s: any) => ({ id: s.id || '', workerName: s.worker?.username || 'Worker', workerInitials: getInitials(s.worker || s), workerColor: s.workerColor || BLUE, status: (s.status || 'pending').toLowerCase(), time: s.createdAt || s.time || new Date().toISOString() }))
  } catch { return [] }
}

async function fetchRelated(category: string, excludeId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/tasks?category=${encodeURIComponent(category)}&limit=4`)
    const json = await res.json(); const items = json?.data || json || []
    return items.filter((t: any) => t.id !== excludeId).slice(0, 3)
  } catch { return [] }
}

// ── Sub-components ──
function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = { blue: BLUE, green: '#16a34a', amber: '#f59e0b', red: '#ef4444', gray: '#6b7280' }
  const c = colors[color] || BLUE
  return <span className="jdg-badge" style={{ background: `${c}15`, color: c, border: `1px solid ${c}30` }}>{children}</span>
}

function CountdownBlock({ deadline }: { deadline: number }) {
  const { d, h, m, s } = useCountdown(deadline)
  return (
    <div className="jdg-cdown">
      {[{ v: d, l: 'Days' }, { v: h, l: 'Hrs' }, { v: m, l: 'Min' }, { v: s, l: 'Sec' }].map(({ v, l }) => (
        <div key={l} className="jdg-cunit"><span className="jdg-cval">{pad(v)}</span><span className="jdg-clbl">{l}</span></div>
      ))}
    </div>
  )
}

function ApplyModal({ task, onClose }: { task: TaskData; onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="jdg-overlay" onClick={onClose}>
      <div className="jdg-modal" onClick={e => e.stopPropagation()}>
        <div className="jdg-mhead">
          <h3><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Apply</h3>
          <button className="jdg-mx" onClick={onClose}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="jdg-mbody">
          <div className="jdg-minfo">
            {[{l:'Reward', v:`${task.reward.toLocaleString()} ${task.currency}`},{l:'Slots', v:`${task.slotsLeft} / ${task.slots}`},{l:'Difficulty', v:task.difficulty},{l:'Time', v:task.estimatedTime}].map(i => (
              <div className="jdg-mrow" key={i.l}><span>{i.l}</span><span className="jdg-mval">{i.v}</span></div>
            ))}
          </div>
          <button className="jdg-btn jdg-btn-primary jdg-btn-full" onClick={() => { onClose(); navigate(`/tasks/${task.id}/submit`) }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Apply & Earn {task.reward.toLocaleString()} {task.currency}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReportModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [reason, setReason] = useState(''); const [msg, setMsg] = useState(''); const [sent, setSent] = useState(false)
  const handleSubmit = async () => {
    if (!reason.trim()) return
    try {
      const token = getAccessToken(); if (!token) return
      await fetch(`${API_BASE}/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ taskId, reason, message: msg }) })
      setSent(true)
    } catch {}
  }
  return (
    <div className="jdg-overlay" onClick={onClose}>
      <div className="jdg-modal" onClick={e => e.stopPropagation()}>
        <div className="jdg-mhead">
          <h3><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg> Report</h3>
          <button className="jdg-mx" onClick={onClose}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div className="jdg-mbody">
          {sent ? (
            <div className="jdg-sent"><svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Report submitted.</div>
          ) : (
            <>
              <label className="jdg-mlbl">Reason</label>
              <select className="jdg-minput" value={reason} onChange={e => setReason(e.target.value)}>
                <option value="">Select a reason...</option>
                <option value="spam">Spam</option><option value="inappropriate">Inappropriate</option><option value="scam">Scam</option><option value="offensive">Offensive</option><option value="other">Other</option>
              </select>
              <label className="jdg-mlbl" style={{ marginTop: 12 }}>Message</label>
              <textarea className="jdg-minput jdg-mta" rows={3} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Details..." />
              <button className="jdg-btn jdg-btn-danger jdg-btn-full" style={{ marginTop: 14 }} onClick={handleSubmit} disabled={!reason.trim()}>Submit Report</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SharePanel({ task, onClose }: { task: TaskData; onClose: () => void }) {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  return (
    <div className="jdg-overlay" onClick={onClose}>
      <div className="jdg-modal" onClick={e => e.stopPropagation()}>
        <div className="jdg-mhead"><h3>Share</h3><button className="jdg-mx" onClick={onClose}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
        <div className="jdg-mbody">
          <div className="jdg-share-row"><span className="jdg-share-url">{url}</span><button className="jdg-btn jdg-btn-sm jdg-btn-outline" onClick={() => navigator.clipboard.writeText(url)}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</button></div>
          <div className="jdg-share-btns">
            <button className="jdg-btn jdg-btn-sm jdg-btn-outline" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check this task: ${task.title}`)}&url=${encodeURIComponent(url)}`, '_blank')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> X
            </button>
            <button className="jdg-btn jdg-btn-sm jdg-btn-outline" onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(task.title)}`, '_blank')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> Telegram
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──
export default function JobDetail() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate()
  const [task, setTask] = useState<TaskData | null>(null); const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState<Submission[]>([]); const [related, setRelated] = useState<any[]>([])
  const [showApply, setShowApply] = useState(false); const [showReport, setShowReport] = useState(false); const [showShare, setShowShare] = useState(false)
  const [showSubs, setShowSubs] = useState(false); const [bookmarked, setBookmarked] = useState(false)
  const [applied, setApplied] = useState(false); const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return; setLoading(true)
    Promise.all([fetchTask(id), fetchSubmissions(id)]).then(([t, s]) => {
      setTask(t); setSubs(s); if (t) fetchRelated(t.category, id).then(setRelated); setLoading(false)
    })
  }, [id])

  if (loading) return (
    <Layout><div className="jdg-wrap"><div className="jdg-loading">{Array.from({length:5}).map((_,i)=><div key={i} className="jdg-skel" style={{height:i===0?180:80,marginBottom:12}}/>)}</div></div><style>{s}</style></Layout>
  )
  if (!task) return (
    <Layout><div className="jdg-wrap"><div className="jdg-empty"><svg width="48" height="48" fill="none" stroke="var(--text3)" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><h2>Not Found</h2><p>This task doesn't exist.</p><button className="jdg-btn jdg-btn-primary" onClick={()=>navigate('/tasks')}>Browse Tasks</button></div></div><style>{s}</style></Layout>
  )

  const deadlineMs = task.deadline ? new Date(task.deadline).getTime() : 0; const isExpired = deadlineMs && deadlineMs < Date.now()
  const progressPct = task.slots > 0 ? pct(task.completions, task.slots) : 0
  const user = getStoredUser(); const isOwnTask = user?.id === task.creatorId

  return (
    <Layout>
      <div className="jdg-wrap">
        {/* Breadcrumb */}
        <div className="jdg-bc">
          <button className="jdg-bcl" onClick={() => navigate('/tasks')}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Tasks</button>
          <span className="jdg-bsep">/</span>
          <span className="jdg-bcur">{task.title}</span>
        </div>

        {/* ── Header ── */}
        <div className="jdg-header">
          {/* Brand + actions */}
          <div className="jdg-hrow">
            <div className="jdg-brand" onClick={() => task.creatorId && navigate(`/user/${task.creator.username}`)}>
              <div className="jdg-av" style={{ background: BLUE }}>{task.creator.avatarUrl ? <img src={task.creator.avatarUrl} alt="" /> : getInitials(task.creator)}</div>
              <div>
                <div className="jdg-bname">{task.brand}{task.brandVerified && <svg width="14" height="14" fill={BLUE} viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>}</div>
                <div className="jdg-bhandle">{task.brandHandle}</div>
              </div>
            </div>
            <div className="jdg-hactions">
              <button className="jdg-hbtn" onClick={() => setShowShare(true)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
              </button>
              <button className={`jdg-hbtn ${bookmarked ? 'active' : ''}`} onClick={() => setBookmarked(b => !b)}>
                <svg width="16" height="16" fill={bookmarked ? BLUE : 'none'} stroke={bookmarked ? BLUE : 'currentColor'} strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </button>
            </div>
          </div>
          {/* Badges */}
          <div className="jdg-brow">
            <Badge color="blue">{task.category}</Badge>
            <Badge color="gray">{task.type}</Badge>
            <Badge color={task.difficulty==='Easy'?'green':task.difficulty==='Medium'?'amber':'red'}>{task.difficulty}</Badge>
          </div>
          {/* Title */}
          <h1 className="jdg-title">{task.title}</h1>
          {/* Reward + Stats */}
          <div className="jdg-rrow">
            <div className="jdg-rleft"><div className="jdg-rlbl">Reward</div>
              <div className="jdg-ramount"><span className="jdg-rval">{task.reward.toLocaleString()}</span><span className="jdg-rcur">{task.currency}</span></div>
              {task.usdValue>0&&<div className="jdg-rusd">≈ ${task.usdValue.toFixed(2)} USD</div>}
            </div>
            <div className="jdg-rstats">
              <div className="jdg-sbox"><div className="jdg-sval">{task.slots}</div><div className="jdg-slbl">Slots</div></div>
              <div className="jdg-sbox"><div className="jdg-sval">{task.completions}</div><div className="jdg-slbl">Done</div></div>
              <div className="jdg-sbox"><div className="jdg-sval" style={{color:BLUE}}>{task.slotsLeft}</div><div className="jdg-slbl">Left</div></div>
            </div>
          </div>
          {/* Progress */}
          <div className="jdg-prog"><div className="jdg-pbar"><div className="jdg-pfill" style={{width:`${progressPct}%`}}/></div>
            <div className="jdg-pstats"><span>{task.completions}/{task.slots} completed</span><span>{progressPct}%</span></div>
          </div>
          {/* Deadline */}
          {deadlineMs>0&&<div className={`jdg-dl ${isExpired?'expired':''}`}>
            <div className="jdg-dlicon"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
            <div><div className="jdg-dllbl">{isExpired?'Expired':'Time Left'}</div><CountdownBlock deadline={deadlineMs}/></div>
          </div>}
        </div>

        {/* ── Two columns ── */}
        <div className="jdg-cols">
          {/* LEFT */}
          <div className="jdg-left">
            {/* Task Config */}
            <div className="jdg-card">
              <h3 className="jdg-ct">Task Configuration</h3>
              <div className="jdg-cfg">{[{l:'Status',v:isExpired?'Expired':task.status,c:isExpired?'#f59e0b':'#16a34a'},{l:'Category',v:task.category},{l:'Type',v:task.type},{l:'Difficulty',v:task.difficulty},{l:'Platform',v:task.platform},{l:'Est. Time',v:task.estimatedTime},{l:'Approval',v:task.approvalTime}].map(i=>(
                <div className="jdg-ci" key={i.l}><span className="jdg-cl">{i.l}</span><span className="jdg-cv" style={i.c?{color:i.c}:{}}>{i.v}</span></div>
              ))}</div>
              {task.tags.length>0&&<div className="jdg-tags">{task.tags.map((t,i)=><span className="jdg-tag" key={i}>{t}</span>)}</div>}
            </div>
            {/* Description */}
            <div className="jdg-card"><h3 className="jdg-ct">Description</h3><div className="jdg-desc">{task.description}</div></div>
            {/* Task Steps */}
            <div className="jdg-card">
              <h3 className="jdg-ct">Task Steps</h3>
              <div className="jdg-steps">{task.instructions.split('\n').filter(Boolean).map((step,i)=>(
                <div className="jdg-step" key={i}><span className="jdg-snum" style={{background:BLUE}}>{i+1}</span><span className="jdg-stxt">{step.replace(/^\d+[\.\)]\s*/,'')}</span></div>
              ))}</div>
            </div>
            {/* Requirements */}
            {task.requirements.length>0&&<div className="jdg-card"><h3 className="jdg-ct">Requirements</h3><ul className="jdg-rlist">{task.requirements.map((r,i)=><li key={i}><svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>{r}</li>)}</ul></div>}
            {/* Proof */}
            {task.proofInstructions.length>0&&<div className="jdg-card"><h3 className="jdg-ct">Proof Required</h3><ul className="jdg-rlist">{task.proofInstructions.map((p,i)=><li key={i}><svg width="16" height="16" fill="none" stroke={BLUE} strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>{p}</li>)}</ul></div>}
            {/* Payment */}
            <div className="jdg-card"><h3 className="jdg-ct">Payment Information</h3><div className="jdg-pay">{[{l:'Total Pool',v:`${task.totalPool.toLocaleString()} ${task.currency}`},{l:'Per Worker',v:`${task.reward.toLocaleString()} ${task.currency}`},{l:'Review Time',v:task.approvalTime}].map(i=>(
              <div className="jdg-pi" key={i.l}><span className="jdg-pl">{i.l}</span><span className="jdg-pv">{i.v}</span></div>
            ))}</div></div>
            {/* Submissions */}
            {subs.length>0&&<div className="jdg-card">
              <div className="jdg-chrow"><h3 className="jdg-ct" style={{margin:0}}>Submissions</h3><button className="jdg-btn jdg-btn-sm jdg-btn-ghost" onClick={()=>setShowSubs(!showSubs)}>{showSubs?'Hide':`${subs.length} total`}</button></div>
              {showSubs&&<div className="jdg-sublist">{subs.slice(0,10).map(s=>(
                <div className="jdg-subi" key={s.id}><div className="jdg-subav" style={{background:s.workerColor}}>{s.workerInitials}</div>
                  <div className="jdg-subinfo"><div className="jdg-subn">{s.workerName}</div><div className="jdg-subt">{new Date(s.time).toLocaleDateString()}</div></div>
                  <span className={`jdg-subst ${s.status}`}>{s.status}</span></div>
              ))}</div>}
            </div>}
            {/* Similar */}
            {related.length>0&&<div className="jdg-card"><h3 className="jdg-ct">Similar Tasks</h3><div className="jdg-rel">{related.map((rt:any)=>(
              <div className="jdg-rc" key={rt.id} onClick={()=>navigate(`/tasks/${rt.id}`)}>
                <div className="jdg-ricon"><svg width="16" height="16" fill="none" stroke={BLUE} strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg></div>
                <div className="jdg-ri"><div className="jdg-rt">{rt.title}</div><div className="jdg-rm">{rt.maxWorkers||rt.slots||0} slots</div></div>
                <div className="jdg-rr">{Number(rt.reward).toLocaleString()} {rt.currency||'SOL'}</div>
              </div>
            ))}</div></div>}
            {/* Report */}
            <div className="jdg-reprow">
              <button className="jdg-repbtn" onClick={()=>setShowReport(true)}><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg> Report this task</button>
              <button className="jdg-repbtn" onClick={()=>setShowShare(true)}><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg> Share</button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="jdg-right">
            <div className="jdg-scard"><h4 className="jdg-st">Task Info</h4>
              {[{l:'Status',v:isExpired?'Expired':task.status,c:isExpired?'#f59e0b':'#16a34a'},{l:'Category',v:task.category},{l:'Difficulty',v:task.difficulty},{l:'Slots',v:`${task.completions}/${task.slots}`},{l:'Time',v:task.estimatedTime}].map(i=>(
                <div className="jdg-srow" key={i.l}><span className="jdg-sl">{i.l}</span><span className="jdg-sv" style={i.c?{color:i.c}:{}}>{i.v}</span></div>
              ))}
              {task.tags.length>0&&<div className="jdg-tags" style={{marginTop:8}}>{task.tags.slice(0,4).map((t,i)=><span className="jdg-tag" key={i}>{t}</span>)}</div>}
            </div>
            <div className="jdg-scard"><h4 className="jdg-st">Creator</h4>
              <div className="jdg-scr" onClick={()=>navigate(`/user/${task.creator.username}`)}>
                <div className="jdg-sav" style={{background:BLUE}}>{task.creator.avatarUrl?<img src={task.creator.avatarUrl} alt=""/>:getInitials(task.creator)}</div>
                <div><div className="jdg-scn">{task.brand}</div><div className="jdg-sch">{task.brandHandle}</div></div>
              </div>
            </div>
            {subs.length>0&&<div className="jdg-scard"><h4 className="jdg-st">Applicants</h4>
              {subs.slice(0,5).map((s,i)=>(
                <div className="jdg-app" key={i}><div className="jdg-apav" style={{background:s.workerColor}}>{s.workerInitials}</div>
                  <div className="jdg-apinfo"><div className="jdg-apn">{s.workerName}</div><span className={`jdg-subst ${s.status}`}>{s.status}</span></div>
                </div>
              ))}
            </div>}
          </div>
        </div>

        {/* ── Sticky CTA ── */}
        <div className="jdg-stick">
          <div className="jdg-stick-inner">
            {isOwnTask?(
              <div className="jdg-stown"><button className="jdg-btn jdg-btn-primary" onClick={()=>navigate(`/tasks/${task.id}/submissions`)}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> View Submissions
              </button><button className="jdg-btn jdg-btn-outline" onClick={()=>setShowShare(true)}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg> Share</button></div>
            ):applied?(
              <div className="jdg-stapp"><svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Submitted</span><button className="jdg-btn jdg-btn-sm jdg-btn-primary" onClick={()=>navigate(`/tasks/${task.id}/submit`)}>Submit Work</button></div>
            ):!isExpired&&task.status==='open'?(
              <><button className="jdg-btn jdg-btn-primary jdg-btn-big" onClick={()=>setShowApply(true)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Apply & Earn {task.reward.toLocaleString()} {task.currency} →
              </button><p className="jdg-snote">{task.slotsLeft} slots remaining</p></>
            ):<button className="jdg-btn jdg-btn-disabled" disabled>{isExpired?'Expired':task.status==='closed'?'Closed':'Full'}</button>}
          </div>
        </div>
      </div>

      {showApply&&<ApplyModal task={task} onClose={()=>setShowApply(false)}/>}
      {showReport&&<ReportModal taskId={task.id} onClose={()=>setShowReport(false)}/>}
      {showShare&&<SharePanel task={task} onClose={()=>setShowShare(false)}/>}
      <style>{s}</style>
    </Layout>
  )
}

const s = `
/* ── Container ── */
.jdg-wrap{max-width:1100px;margin:0 auto;padding:20px 24px 120px}
.jdg-bc{display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:13px}
.jdg-bcl{background:none;border:none;color:var(--text2);cursor:pointer;display:flex;align-items:center;gap:4px;font-size:13px;font-weight:600;padding:4px 0}
.jdg-bcl:hover{color:var(--text)}
.jdg-bsep{color:var(--text3)}
.jdg-bcur{color:var(--text);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px}

/* ── Header ── */
.jdg-header{background:rgba(255,255,255,0.04);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;margin-bottom:16px}
.jdg-hrow{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 0}
.jdg-brand{display:flex;align-items:center;gap:12px;cursor:pointer}
.jdg-av{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:14px;font-weight:800;flex-shrink:0;overflow:hidden}
.jdg-av img{width:100%;height:100%;object-fit:cover}
.jdg-bname{font-size:15px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:5px}
.jdg-bhandle{font-size:12px;color:var(--text2);font-weight:600}
.jdg-hactions{display:flex;gap:6px}
.jdg-hbtn{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:grid;place-items:center;cursor:pointer;color:var(--text2);transition:all .15s}
.jdg-hbtn:hover{background:rgba(255,255,255,0.08);color:var(--text)}
.jdg-hbtn.active{background:rgba(18,21,102,0.12);border-color:rgba(18,21,102,0.25);color:#121566}
.jdg-brow{display:flex;gap:6px;flex-wrap:wrap;padding:12px 22px 0}
.jdg-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px}
.jdg-title{font-family:Outfit,sans-serif;font-size:24px;font-weight:900;margin:12px 22px;line-height:1.25;color:var(--text)}
.jdg-rrow{display:flex;align-items:stretch;gap:14px;padding:14px 22px;border-top:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)}
@media(max-width:600px){.jdg-rrow{flex-direction:column}}
.jdg-rleft{flex:1}
.jdg-rlbl{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:4px}
.jdg-ramount{display:flex;align-items:baseline;gap:6px}
.jdg-rval{font-size:26px;font-weight:900;color:var(--text);font-family:Outfit,sans-serif}
.jdg-rcur{font-size:14px;font-weight:700;color:var(--text2)}
.jdg-rusd{font-size:12px;color:var(--text2);font-weight:600;margin-top:2px}
.jdg-rstats{display:flex;gap:10px;flex-shrink:0}
.jdg-sbox{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 16px;text-align:center;min-width:64px}
.jdg-sval{font-size:18px;font-weight:900;color:var(--text);font-family:Outfit,sans-serif}
.jdg-slbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--text3);margin-top:1px}
.jdg-prog{padding:0 22px 12px}
.jdg-pbar{height:5px;border-radius:999px;background:rgba(255,255,255,0.06);overflow:hidden;border:1px solid rgba(255,255,255,0.08)}
.jdg-pfill{height:100%;border-radius:inherit;background:#121566;transition:width .5s}
.jdg-pstats{display:flex;justify-content:space-between;font-size:10px;color:var(--text3);font-weight:600;margin-top:3px}
.jdg-dl{display:flex;align-items:center;gap:12px;padding:12px 22px;border-top:1px solid rgba(255,255,255,0.06)}
.jdg-dlicon{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);display:grid;place-items:center;flex-shrink:0}
.jdg-dlicon svg{color:var(--text2)}
.jdg-dl.expired .jdg-dlicon svg{color:#f59e0b}
.jdg-dllbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:4px}
.jdg-cdown{display:flex;gap:6px}
.jdg-cunit{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:6px 10px;text-align:center;min-width:44px}
.jdg-cval{display:block;font-size:16px;font-weight:900;color:var(--text);font-family:Outfit,sans-serif}
.jdg-clbl{display:block;font-size:9px;font-weight:700;color:var(--text3);margin-top:1px}

/* ── Columns ── */
.jdg-cols{display:grid;grid-template-columns:1fr 280px;gap:16px;align-items:start}
@media(max-width:860px){.jdg-cols{grid-template-columns:1fr}}

/* ── Cards ── */
.jdg-card{background:rgba(255,255,255,0.03);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px 20px;margin-bottom:14px}
.jdg-ct{font-family:Outfit,sans-serif;font-size:15px;font-weight:800;margin:0 0 12px;color:var(--text);display:flex;align-items:center;gap:6px}
.jdg-chrow{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}

/* ── Config ── */
.jdg-cfg{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
@media(max-width:480px){.jdg-cfg{grid-template-columns:1fr}}
.jdg-ci{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px}
.jdg-cl{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--text3);margin-bottom:2px}
.jdg-cv{font-size:13px;font-weight:700;color:var(--text)}
.jdg-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.jdg-tag{font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:rgba(18,21,102,0.1);color:#121566;border:1px solid rgba(18,21,102,0.2)}

/* ── Desc ── */
.jdg-desc{font-size:13px;line-height:1.7;color:var(--text2);white-space:pre-wrap}

/* ── Steps ── */
.jdg-steps{display:flex;flex-direction:column;gap:8px}
.jdg-step{display:flex;align-items:center;gap:10px}
.jdg-snum{width:26px;height:26px;border-radius:50%;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;flex-shrink:0}
.jdg-stxt{font-size:13px;color:var(--text2);line-height:1.4}

/* ── Req ── */
.jdg-rlist{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}
.jdg-rlist li{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2)}
.jdg-rlist li svg{flex-shrink:0}
.jdg-pay{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
@media(max-width:480px){.jdg-pay{grid-template-columns:1fr}}
.jdg-pi{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px}
.jdg-pl{display:block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--text3);margin-bottom:2px}
.jdg-pv{font-size:14px;font-weight:800;color:var(--text)}

/* ── Submissions ── */
.jdg-sublist{display:flex;flex-direction:column;gap:6px}
.jdg-subi{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed rgba(255,255,255,0.06)}
.jdg-subi:last-child{border-bottom:none}
.jdg-subav{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:10px;font-weight:800;flex-shrink:0}
.jdg-subinfo{flex:1}
.jdg-subn{font-size:12px;font-weight:700;color:var(--text)}
.jdg-subt{font-size:10px;color:var(--text3)}
.jdg-subst{font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px}
.jdg-subst.approved,.jdg-subst.accepted{background:rgba(22,163,74,0.1);color:#16a34a}
.jdg-subst.pending{background:rgba(245,158,11,0.1);color:#f59e0b}
.jdg-subst.rejected{background:rgba(239,68,68,0.1);color:#ef4444}

/* ── Related ── */
.jdg-rel{display:flex;flex-direction:column;gap:6px}
.jdg-rc{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;transition:border-color .13s}
.jdg-rc:hover{border-color:var(--text2)}
.jdg-ricon{width:32px;height:32px;border-radius:8px;background:rgba(18,21,102,0.1);display:grid;place-items:center;flex-shrink:0}
.jdg-ri{flex:1;min-width:0}
.jdg-rt{font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jdg-rm{font-size:10px;color:var(--text3)}
.jdg-rr{font-size:12px;font-weight:800;color:#16a34a;flex-shrink:0}

/* ── Report ── */
.jdg-reprow{display:flex;justify-content:center;gap:20px;padding:8px 0 20px}
.jdg-repbtn{background:none;border:none;color:var(--text3);font-size:11px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:6px;transition:color .13s,background .13s}
.jdg-repbtn:hover{color:#ef4444;background:rgba(239,68,68,0.06)}

/* ── Right ── */
.jdg-right{display:flex;flex-direction:column;gap:14px}
.jdg-scard{background:rgba(255,255,255,0.03);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px 18px}
.jdg-st{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text2);margin-bottom:10px}
.jdg-srow{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px dashed rgba(255,255,255,0.06);font-size:12px}
.jdg-srow:last-child{border-bottom:none}
.jdg-sl{color:var(--text2);font-weight:600}
.jdg-sv{font-weight:800;color:var(--text)}
.jdg-scr{display:flex;align-items:center;gap:10px;cursor:pointer}
.jdg-sav{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:12px;font-weight:800;flex-shrink:0;overflow:hidden}
.jdg-sav img{width:100%;height:100%;object-fit:cover}
.jdg-scn{font-size:13px;font-weight:800;color:var(--text)}
.jdg-sch{font-size:11px;color:var(--text2);font-weight:600}
.jdg-app{display:flex;align-items:center;gap:8px;padding:4px 0}
.jdg-apav{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:9px;font-weight:800;flex-shrink:0}
.jdg-apinfo{display:flex;align-items:center;gap:6px;flex:1}
.jdg-apn{font-size:11px;font-weight:700;color:var(--text)}

/* ── Sticky ── */
.jdg-stick{position:fixed;bottom:0;left:0;right:0;z-index:100;padding:14px 20px;background:linear-gradient(to top,rgba(10,10,20,0.9) 60%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.jdg-stick-inner{max-width:1100px;margin:0 auto}
.jdg-btn-big{width:100%;height:50px;font-size:15px;background:#121566;border-color:#121566}
.jdg-btn-big:hover{background:#0D6EEB}
.jdg-snote{text-align:center;font-size:11px;color:var(--text3);margin:6px 0 0}
.jdg-stown{display:flex;gap:8px}
.jdg-stown .jdg-btn{flex:1}
.jdg-stapp{display:flex;align-items:center;gap:10px;background:rgba(22,163,74,0.06);border:1px solid rgba(22,163,74,0.15);border-radius:12px;padding:12px 16px;font-size:13px;color:var(--text)}
.jdg-stapp .jdg-btn{margin-left:auto}
.jdg-btn-disabled{width:100%;height:50px;border-radius:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:var(--text3);font-size:14px;font-weight:700;cursor:not-allowed}

/* ── Buttons ── */
.jdg-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:42px;padding:0 20px;border-radius:10px;font-size:13px;font-weight:700;border:1.5px solid transparent;cursor:pointer;transition:all .13s;text-decoration:none;font-family:inherit;white-space:nowrap}
.jdg-btn-primary{background:#121566;color:#fff;border-color:#121566}
.jdg-btn-primary:hover{background:#0D6EEB}
.jdg-btn-primary:disabled{opacity:.4;cursor:not-allowed}
.jdg-btn-outline{background:transparent;border-color:rgba(255,255,255,0.1);color:var(--text)}
.jdg-btn-outline:hover{border-color:var(--text2);background:rgba(255,255,255,0.05)}
.jdg-btn-danger{background:transparent;border-color:rgba(239,68,68,.3);color:#ef4444}
.jdg-btn-danger:hover{background:rgba(239,68,68,.06);border-color:#ef4444}
.jdg-btn-ghost{background:transparent;border-color:transparent;color:var(--text2);height:30px;padding:0 8px;font-size:11px}
.jdg-btn-ghost:hover{background:rgba(255,255,255,0.05)}
.jdg-btn-sm{height:34px;font-size:12px;padding:0 14px}
.jdg-btn-full{width:100%}

/* ── Modal ── */
.jdg-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.jdg-modal{background:rgba(20,20,30,0.85);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.08);border-radius:16px;max-width:460px;width:100%;max-height:90vh;overflow-y:auto}
.jdg-mhead{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06)}
.jdg-mhead h3{font-size:15px;font-weight:800;margin:0;display:flex;align-items:center;gap:8px;color:var(--text)}
.jdg-mx{background:none;border:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;cursor:pointer;color:var(--text2)}
.jdg-mx:hover{background:rgba(255,255,255,0.05)}
.jdg-mbody{padding:16px 20px}
.jdg-mlbl{display:block;font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px}
.jdg-minput{width:100%;padding:9px 12px;border:1.5px solid rgba(255,255,255,0.1);border-radius:8px;background:rgba(255,255,255,0.04);color:var(--text);font-size:13px;font-family:inherit;box-sizing:border-box}
.jdg-minput:focus{outline:none;border-color:#121566;background:rgba(18,21,102,0.05)}
.jdg-mta{resize:vertical;min-height:70px}
.jdg-minfo{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px 14px;margin-bottom:14px}
.jdg-mrow{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,0.06);font-size:12px;color:var(--text2)}
.jdg-mrow:last-child{border-bottom:none}
.jdg-mval{font-weight:800;color:var(--text)}
.jdg-share-row{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 12px;margin-bottom:12px}
.jdg-share-url{flex:1;font-size:11px;color:var(--text3);font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jdg-share-btns{display:flex;gap:8px}
.jdg-share-btns .jdg-btn{flex:1}
.jdg-sent{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text);padding:12px}

/* ── Loading ── */
.jdg-loading{padding:40px 0}
.jdg-skel{background:rgba(255,255,255,0.04);border-radius:12px;animation:jdg-sh 1.5s ease-in-out infinite}
@keyframes jdg-sh{0%{opacity:.5}50%{opacity:1}100%{opacity:.5}}
.jdg-empty{text-align:center;padding:60px 20px}
.jdg-empty svg{display:block;margin:0 auto 16px}
.jdg-empty h2{font-family:Outfit,sans-serif;font-size:20px;font-weight:900;margin:0 0 8px;color:var(--text)}
.jdg-empty p{font-size:13px;color:var(--text2);margin:0 0 20px}

/* ── Light theme ── */
[data-theme="light"] .jdg-header{background:rgba(255,255,255,0.7);border-color:rgba(0,0,0,0.06)}
[data-theme="light"] .jdg-card{background:rgba(255,255,255,0.6);border-color:rgba(0,0,0,0.04)}
[data-theme="light"] .jdg-scard{background:rgba(255,255,255,0.6);border-color:rgba(0,0,0,0.04)}
[data-theme="light"] .jdg-modal{background:rgba(255,255,255,0.85);border-color:rgba(0,0,0,0.08)}
[data-theme="light"] .jdg-stick{background:linear-gradient(to top,rgba(255,255,255,0.9) 60%,transparent)}
[data-theme="light"] .jdg-ci{background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.06)}
[data-theme="light"] .jdg-pi{background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.06)}
[data-theme="light"] .jdg-sbox{background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.06)}
[data-theme="light"] .jdg-cunit{background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.06)}
[data-theme="light"] .jdg-dlicon{background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.06)}
[data-theme="light"] .jdg-pbar{background:rgba(0,0,0,0.04);border-color:rgba(0,0,0,0.06)}
[data-theme="light"] .jdg-minput{background:rgba(255,255,255,0.5);border-color:rgba(0,0,0,0.08)}
[data-theme="light"] .jdg-rc{background:rgba(0,0,0,0.03);border-color:rgba(0,0,0,0.06)}

@media(max-width:600px){
  .jdg-wrap{padding:14px 16px 130px}
  .jdg-title{font-size:20px;margin:10px 16px}
  .jdg-hrow{padding:14px 16px 0}
  .jdg-brow{padding:8px 16px 0}
  .jdg-rrow{flex-direction:column;padding:12px 16px}
  .jdg-rstats{justify-content:stretch}
  .jdg-sbox{flex:1}
  .jdg-dl{padding:10px 16px}
  .jdg-prog{padding:0 16px 8px}
  .jdg-card{padding:14px 16px;border-radius:12px}
  .jdg-rval{font-size:22px}
  .jdg-cunit{min-width:38px;padding:4px 8px}
  .jdg-cval{font-size:14px}
  .jdg-stick{padding:10px 14px}
  .jdg-stapp{flex-wrap:wrap}
  .jdg-bcur{max-width:160px}
  .jdg-cfg{grid-template-columns:1fr}
  .jdg-pay{grid-template-columns:1fr}
}
`
