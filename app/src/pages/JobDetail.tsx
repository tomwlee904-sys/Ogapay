import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE, getAccessToken, getStoredUser } from '../lib/api'

const BLUE = '#121566'

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
    if (!data || !data.id) { const r2 = await fetch(`${API_BASE}/jobs/${id}`, { headers }); const j2 = await r2.json(); data = j2?.data?.task || j2?.data || j2 }
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

// ── Glass Card ──
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
}
const cardLite: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 14,
}
const glassInput: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#fff',
  padding: '9px 12px',
  fontSize: 13,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
}
const glassBadge = (color: string): React.CSSProperties => ({
  background: `${color}15`,
  color,
  border: `1px solid ${color}30`,
  borderRadius: 99,
  padding: '3px 10px',
  fontSize: 11,
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
})

// ── Main Component ──
export default function JobDetail() {
  const { id } = useParams<{ id: string }>(); const navigate = useNavigate()
  const [task, setTask] = useState<TaskData | null>(null); const [loading, setLoading] = useState(true)
  const [subs, setSubs] = useState<Submission[]>([]); const [related, setRelated] = useState<any[]>([])
  const [showApply, setShowApply] = useState(false); const [showReport, setShowReport] = useState(false); const [showShare, setShowShare] = useState(false)
  const [showSubs, setShowSubs] = useState(false); const [bookmarked, setBookmarked] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (!id) return; setLoading(true)
    Promise.all([fetchTask(id), fetchSubmissions(id)]).then(([t, s]) => {
      setTask(t); setSubs(s); if (t) fetchRelated(t.category, id).then(setRelated); setLoading(false)
    })
  }, [id])

  if (loading) return <Layout><div style={{maxWidth:800,margin:'40px auto',padding:'0 24px'}}>{Array.from({length:5}).map((_,i)=><div key={i} style={{height:i===0?200:80,marginBottom:14,borderRadius:12,background:'rgba(255,255,255,0.04)',animation:'pulse 1.5s ease-in-out infinite'}}/>)}</div></Layout>
  if (!task) return <Layout><div style={{textAlign:'center',padding:'80px 20px'}}><svg width="48" height="48" fill="none" stroke="var(--text3)" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><h2 style={{fontSize:22,fontWeight:900}}>Not Found</h2><p>This task doesn't exist.</p></div></Layout>

  const deadlineMs = task.deadline ? new Date(task.deadline).getTime() : 0; const isExpired = deadlineMs && deadlineMs < Date.now()
  const progressPct = task.slots > 0 ? pct(task.completions, task.slots) : 0
  const user = getStoredUser(); const isOwnTask = user?.id === task.creatorId

  return (
    <Layout>
      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 24px 130px'}}>
        {/* ── Breadcrumb ── */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,fontSize:13}}>
          <button onClick={()=>navigate('/tasks')} style={{background:'none',border:'none',color:'var(--text2)',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:13,fontWeight:600,padding:4}}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Tasks
          </button>
          <span style={{color:'var(--text3)'}}>/</span>
          <span style={{color:'var(--text)',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:260}}>{task.title}</span>
        </div>

        {/* ── HEADER CARD ── */}
        <div style={cardStyle}>
          {/* Brand + Actions */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 24px 0'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer'}} onClick={()=>task.creatorId&&navigate(`/user/${task.creator.username}`)}>
              <div style={{width:42,height:42,borderRadius:'50%',background:BLUE,display:'grid',placeItems:'center',color:'#fff',fontSize:14,fontWeight:800,flexShrink:0,overflow:'hidden'}}>
                {task.creator.avatarUrl?<img src={task.creator.avatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:getInitials(task.creator)}
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:'var(--text)',display:'flex',alignItems:'center',gap:5}}>
                  {task.brand}{task.brandVerified&&<svg width="14" height="14" fill={BLUE} viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>}
                </div>
                <div style={{fontSize:12,color:'var(--text2)',fontWeight:600}}>{task.brandHandle}</div>
              </div>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>setShowShare(true)} style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'grid',placeItems:'center',cursor:'pointer',color:'var(--text2)'}}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
              </button>
              <button onClick={()=>setBookmarked(b=>!b)} style={{width:36,height:36,borderRadius:10,background:bookmarked?'rgba(18,21,102,0.12)':'rgba(255,255,255,0.05)',border:`1px solid ${bookmarked?'rgba(18,21,102,0.25)':'rgba(255,255,255,0.08)'}`,display:'grid',placeItems:'center',cursor:'pointer',color:bookmarked?'#121566':'var(--text2)'}}>
                <svg width="16" height="16" fill={bookmarked?BLUE:'none'} stroke={bookmarked?BLUE:'currentColor'} strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
              </button>
            </div>
          </div>
          {/* Badges */}
          <div style={{display:'flex',gap:6,flexWrap:'wrap',padding:'12px 24px 0'}}>
            <span style={glassBadge(BLUE)}>{task.category}</span>
            <span style={glassBadge('#6b7280')}>{task.type}</span>
            <span style={glassBadge(task.difficulty==='Easy'?'#16a34a':task.difficulty==='Medium'?'#f59e0b':'#ef4444')}>{task.difficulty}</span>
          </div>
          {/* Title */}
          <h1 style={{fontFamily:'Outfit,sans-serif',fontSize:24,fontWeight:900,margin:'12px 24px',lineHeight:1.25,color:'var(--text)'}}>{task.title}</h1>
          {/* Reward Row */}
          <div style={{display:'flex',alignItems:'stretch',gap:14,padding:'14px 24px',borderTop:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.02)'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--text3)',marginBottom:4}}>Reward</div>
              <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                <span style={{fontSize:26,fontWeight:900,color:'var(--text)',fontFamily:'Outfit,sans-serif'}}>{task.reward.toLocaleString()}</span>
                <span style={{fontSize:14,fontWeight:700,color:'var(--text2)'}}>{task.currency}</span>
              </div>
              {task.usdValue>0&&<div style={{fontSize:12,color:'var(--text2)',fontWeight:600,marginTop:2}}>≈ ${task.usdValue.toFixed(2)} USD</div>}
            </div>
            <div style={{display:'flex',gap:10,flexShrink:0}}>
              {[{v:task.slots,l:'Slots'},{v:task.completions,l:'Done'},{v:task.slotsLeft,l:'Left',c:BLUE}].map(b=>(
                <div key={b.l} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 16px',textAlign:'center',minWidth:64}}>
                  <div style={{fontSize:18,fontWeight:900,color:b.c||'var(--text)',fontFamily:'Outfit,sans-serif'}}>{b.v}</div>
                  <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em',color:'var(--text3)',marginTop:1}}>{b.l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Progress */}
          <div style={{padding:'0 24px 12px'}}>
            <div style={{height:5,borderRadius:999,background:'rgba(255,255,255,0.06)',overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{height:'100%',borderRadius:'inherit',background:BLUE,transition:'width .5s',width:`${progressPct}%`}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--text3)',fontWeight:600,marginTop:3}}>
              <span>{task.completions}/{task.slots} completed</span><span>{progressPct}%</span>
            </div>
          </div>
          {/* Deadline */}
          {deadlineMs>0&&(
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 24px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',display:'grid',placeItems:'center',flexShrink:0}}>
                <svg width="18" height="18" fill="none" stroke={isExpired?'#f59e0b':'currentColor'} strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--text3)',marginBottom:4}}>{isExpired?'Expired':'Time Left'}</div>
                <CountdownBlock deadline={deadlineMs}/>
              </div>
            </div>
          )}
        </div>

        {/* ── TWO COLUMNS ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:16,alignItems:'start'}}>
          {/* LEFT */}
          <div>
            {/* Task Config */}
            <div style={{...cardLite,padding:'18px 20px',marginBottom:14}}>
              <h3 style={{fontFamily:'Outfit,sans-serif',fontSize:15,fontWeight:800,margin:'0 0 12px',color:'var(--text)'}}>Task Configuration</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
                {[{l:'Status',v:isExpired?'Expired':task.status,c:isExpired?'#f59e0b':'#16a34a'},{l:'Category',v:task.category},{l:'Type',v:task.type},{l:'Difficulty',v:task.difficulty},{l:'Platform',v:task.platform},{l:'Est. Time',v:task.estimatedTime},{l:'Approval',v:task.approvalTime}].map(i=>(
                  <div key={i.l} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 12px'}}>
                    <span style={{display:'block',fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.04em',color:'var(--text3)',marginBottom:2}}>{i.l}</span>
                    <span style={{fontSize:13,fontWeight:700,color:i.c||'var(--text)'}}>{i.v}</span>
                  </div>
                ))}
              </div>
              {task.tags.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:10}}>{task.tags.map((t,i)=><span key={i} style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:'rgba(18,21,102,0.1)',color:'#121566',border:'1px solid rgba(18,21,102,0.2)'}}>{t}</span>)}</div>}
            </div>
            {/* Description */}
            <div style={{...cardLite,padding:'18px 20px',marginBottom:14}}>
              <h3 style={{fontFamily:'Outfit,sans-serif',fontSize:15,fontWeight:800,margin:'0 0 12px',color:'var(--text)'}}>Description</h3>
              <div style={{fontSize:13,lineHeight:1.7,color:'var(--text2)',whiteSpace:'pre-wrap'}}>{task.description}</div>
            </div>
            {/* Steps */}
            <div style={{...cardLite,padding:'18px 20px',marginBottom:14}}>
              <h3 style={{fontFamily:'Outfit,sans-serif',fontSize:15,fontWeight:800,margin:'0 0 12px',color:'var(--text)'}}>Task Steps</h3>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {task.instructions.split('\n').filter(Boolean).map((step,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{width:26,height:26,borderRadius:'50%',background:BLUE,color:'#fff',fontSize:11,fontWeight:800,display:'grid',placeItems:'center',flexShrink:0}}>{i+1}</span>
                    <span style={{fontSize:13,color:'var(--text2)',lineHeight:1.4}}>{step.replace(/^\d+[\.\)]\s*/,'')}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Requirements */}
            {task.requirements.length>0&&<div style={{...cardLite,padding:'18px 20px',marginBottom:14}}>
              <h3 style={{fontFamily:'Outfit,sans-serif',fontSize:15,fontWeight:800,margin:'0 0 12px',color:'var(--text)'}}>Requirements</h3>
              <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:6}}>
                {task.requirements.map((r,i)=><li key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--text2)'}}>
                  <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>{r}
                </li>)}
              </ul>
            </div>}
            {/* Proof */}
            {task.proofInstructions.length>0&&<div style={{...cardLite,padding:'18px 20px',marginBottom:14}}>
              <h3 style={{fontFamily:'Outfit,sans-serif',fontSize:15,fontWeight:800,margin:'0 0 12px',color:'var(--text)'}}>Proof Required</h3>
              <ul style={{listStyle:'none',padding:0,margin:0,display:'flex',flexDirection:'column',gap:6}}>
                {task.proofInstructions.map((p,i)=><li key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--text2)'}}>
                  <svg width="16" height="16" fill="none" stroke={BLUE} strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>{p}
                </li>)}
              </ul>
            </div>}
            {/* Payment */}
            <div style={{...cardLite,padding:'18px 20px',marginBottom:14}}>
              <h3 style={{fontFamily:'Outfit,sans-serif',fontSize:15,fontWeight:800,margin:'0 0 12px',color:'var(--text)'}}>Payment Information</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[{l:'Total Pool',v:`${task.totalPool.toLocaleString()} ${task.currency}`},{l:'Per Worker',v:`${task.reward.toLocaleString()} ${task.currency}`},{l:'Review Time',v:task.approvalTime}].map(i=>(
                  <div key={i.l} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'10px 12px'}}>
                    <span style={{display:'block',fontSize:10,fontWeight:800,textTransform:'uppercase',letterSpacing:'.04em',color:'var(--text3)',marginBottom:2}}>{i.l}</span>
                    <span style={{fontSize:14,fontWeight:800,color:'var(--text)'}}>{i.v}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Submissions */}
            {subs.length>0&&<div style={{...cardLite,padding:'18px 20px',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <h3 style={{fontFamily:'Outfit,sans-serif',fontSize:15,fontWeight:800,margin:0,color:'var(--text)'}}>Submissions</h3>
                <button onClick={()=>setShowSubs(!showSubs)} style={{background:'transparent',border:'none',color:'var(--text2)',cursor:'pointer',fontSize:11,fontWeight:600,padding:'4px 8px'}}>{showSubs?'Hide':`${subs.length} total`}</button>
              </div>
              {showSubs&&<div style={{display:'flex',flexDirection:'column',gap:6}}>{subs.slice(0,10).map(s=>(
                <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px dashed rgba(255,255,255,0.06)'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:s.workerColor,display:'grid',placeItems:'center',color:'#fff',fontSize:10,fontWeight:800,flexShrink:0}}>{s.workerInitials}</div>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{s.workerName}</div><div style={{fontSize:10,color:'var(--text3)'}}>{new Date(s.time).toLocaleDateString()}</div></div>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:s.status==='approved'||s.status==='accepted'?'rgba(22,163,74,0.1)':s.status==='pending'?'rgba(245,158,11,0.1)':'rgba(239,68,68,0.1)',color:s.status==='approved'||s.status==='accepted'?'#16a34a':s.status==='pending'?'#f59e0b':'#ef4444'}}>{s.status}</span>
                </div>
              ))}</div>}
            </div>}
            {/* Similar */}
            {related.length>0&&<div style={{...cardLite,padding:'18px 20px',marginBottom:14}}>
              <h3 style={{fontFamily:'Outfit,sans-serif',fontSize:15,fontWeight:800,margin:'0 0 12px',color:'var(--text)'}}>Similar Tasks</h3>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>{related.map((rt:any)=>(
                <div key={rt.id} onClick={()=>navigate(`/tasks/${rt.id}`)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,cursor:'pointer'}}>
                  <div style={{width:32,height:32,borderRadius:8,background:'rgba(18,21,102,0.1)',display:'grid',placeItems:'center',flexShrink:0}}>
                    <svg width="16" height="16" fill="none" stroke={BLUE} strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--text)',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{rt.title}</div>
                    <div style={{fontSize:10,color:'var(--text3)'}}>{rt.maxWorkers||rt.slots||0} slots</div>
                  </div>
                  <div style={{fontSize:12,fontWeight:800,color:'#16a34a',flexShrink:0}}>{Number(rt.reward).toLocaleString()} {rt.currency||'SOL'}</div>
                </div>
              ))}</div>
            </div>}
            {/* Report */}
            <div style={{display:'flex',justifyContent:'center',gap:20,padding:'8px 0 20px'}}>
              <button onClick={()=>setShowReport(true)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5,padding:'6px 10px',borderRadius:6}}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg> Report this task
              </button>
              <button onClick={()=>setShowShare(true)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5,padding:'6px 10px',borderRadius:6}}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg> Share
              </button>
            </div>
          </div>
          {/* RIGHT */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{...cardLite,padding:'16px 18px'}}>
              <h4 style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--text2)',marginBottom:10}}>Task Info</h4>
              {[{l:'Status',v:isExpired?'Expired':task.status,c:isExpired?'#f59e0b':'#16a34a'},{l:'Category',v:task.category},{l:'Difficulty',v:task.difficulty},{l:'Slots',v:`${task.completions}/${task.slots}`},{l:'Time',v:task.estimatedTime}].map(i=>(
                <div key={i.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px dashed rgba(255,255,255,0.06)',fontSize:12}}>
                  <span style={{color:'var(--text2)',fontWeight:600}}>{i.l}</span>
                  <span style={{fontWeight:800,color:i.c||'var(--text)'}}>{i.v}</span>
                </div>
              ))}
              {task.tags.length>0&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8}}>{task.tags.slice(0,4).map((t,i)=><span key={i} style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,background:'rgba(18,21,102,0.1)',color:'#121566',border:'1px solid rgba(18,21,102,0.2)'}}>{t}</span>)}</div>}
            </div>
            <div style={{...cardLite,padding:'16px 18px'}}>
              <h4 style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--text2)',marginBottom:10}}>Creator</h4>
              <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>navigate(`/user/${task.creator.username}`)}>
                <div style={{width:36,height:36,borderRadius:'50%',background:BLUE,display:'grid',placeItems:'center',color:'#fff',fontSize:12,fontWeight:800,flexShrink:0,overflow:'hidden'}}>
                  {task.creator.avatarUrl?<img src={task.creator.avatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:getInitials(task.creator)}
                </div>
                <div><div style={{fontSize:13,fontWeight:800,color:'var(--text)'}}>{task.brand}</div><div style={{fontSize:11,color:'var(--text2)',fontWeight:600}}>{task.brandHandle}</div></div>
              </div>
            </div>
            {subs.length>0&&<div style={{...cardLite,padding:'16px 18px'}}>
              <h4 style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'.06em',color:'var(--text2)',marginBottom:10}}>Applicants</h4>
              {subs.slice(0,5).map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:s.workerColor,display:'grid',placeItems:'center',color:'#fff',fontSize:9,fontWeight:800,flexShrink:0}}>{s.workerInitials}</div>
                  <div style={{display:'flex',alignItems:'center',gap:6,flex:1}}><span style={{fontSize:11,fontWeight:700,color:'var(--text)'}}>{s.workerName}</span><span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:99,background:s.status==='approved'||s.status==='accepted'?'rgba(22,163,74,0.1)':s.status==='pending'?'rgba(245,158,11,0.1)':'rgba(239,68,68,0.1)',color:s.status==='approved'||s.status==='accepted'?'#16a34a':s.status==='pending'?'#f59e0b':'#ef4444'}}>{s.status}</span></div>
                </div>
              ))}
            </div>}
          </div>
        </div>

        {/* ── STICKY CTA ── */}
        <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:100,padding:'14px 20px',background:'linear-gradient(to top,rgba(10,10,20,0.9) 60%,transparent)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}>
          <div style={{maxWidth:900,margin:'0 auto'}}>
            {isOwnTask?(
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>navigate(`/tasks/${task.id}/submissions`)} style={{flex:1,...btnPrimary}}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> View Submissions</button>
                <button onClick={()=>setShowShare(true)} style={{...btnOutline}}><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg> Share</button>
              </div>
            ):applied?(
              <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(22,163,74,0.06)',border:'1px solid rgba(22,163,74,0.15)',borderRadius:12,padding:'12px 16px',fontSize:13,color:'var(--text)'}}>
                <svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span style={{flex:1}}>Submitted</span>
                <button onClick={()=>navigate(`/tasks/${task.id}/submit`)} style={{...btnPrimary,height:34,fontSize:12,padding:'0 14px'}}>Submit Work</button>
              </div>
            ):!isExpired&&task.status==='open'?(
              <>
                <button onClick={()=>setShowApply(true)} style={{width:'100%',height:50,fontSize:15,...btnPrimary}}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Apply & Earn {task.reward.toLocaleString()} {task.currency} →
                </button>
                <p style={{textAlign:'center',fontSize:11,color:'var(--text3)',margin:'6px 0 0'}}>{task.slotsLeft} slots remaining</p>
              </>
            ):<button disabled style={{width:'100%',height:50,borderRadius:12,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'var(--text3)',fontSize:14,fontWeight:700,cursor:'not-allowed'}}>{isExpired?'Expired':task.status==='closed'?'Closed':'Full'}</button>}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showApply&&<ApplyMod task={task} onClose={()=>setShowApply(false)} />}
      {showReport&&<ReportMod taskId={task.id} onClose={()=>setShowReport(false)} />}
      {showShare&&<ShareMod task={task} onClose={()=>setShowShare(false)} />}
    </Layout>
  )
}

// ── Button styles ──
const btnPrimary: React.CSSProperties = {
  display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,
  height:42,padding:'0 20px',borderRadius:10,fontSize:13,fontWeight:700,
  border:'1.5px solid transparent',cursor:'pointer',fontFamily:'inherit',
  background:'#121566',color:'#fff',borderColor:'#121566',whiteSpace:'nowrap',textDecoration:'none',
}
const btnOutline: React.CSSProperties = {
  display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,
  height:42,padding:'0 20px',borderRadius:10,fontSize:13,fontWeight:700,
  border:'1.5px solid rgba(255,255,255,0.1)',cursor:'pointer',fontFamily:'inherit',
  background:'transparent',color:'var(--text)',whiteSpace:'nowrap',textDecoration:'none',
}

// ── Countdown ──
function CountdownBlock({ deadline }: { deadline: number }) {
  const { d, h, m, s } = useCountdown(deadline)
  return (<div style={{display:'flex',gap:6}}>
    {[{v:d,l:'Days'},{v:h,l:'Hrs'},{v:m,l:'Min'},{v:s,l:'Sec'}].map(({v,l})=>(
      <div key={l} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'6px 10px',textAlign:'center',minWidth:44}}>
        <span style={{display:'block',fontSize:16,fontWeight:900,color:'var(--text)',fontFamily:'Outfit,sans-serif'}}>{pad(v)}</span>
        <span style={{display:'block',fontSize:9,fontWeight:700,color:'var(--text3)',marginTop:1}}>{l}</span>
      </div>
    ))}
  </div>)
}

// ── Apply Modal ──
function ApplyMod({ task, onClose }: { task: TaskData; onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}} onClick={onClose}>
      <div style={{background:'rgba(20,20,30,0.85)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,maxWidth:460,width:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <h3 style={{fontSize:15,fontWeight:800,margin:0,display:'flex',alignItems:'center',gap:8,color:'var(--text)'}}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Apply</h3>
          <button onClick={onClose} style={{background:'none',border:'none',width:30,height:30,borderRadius:'50%',display:'grid',placeItems:'center',cursor:'pointer',color:'var(--text2)'}}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div style={{padding:'16px 20px'}}>
          <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'12px 14px',marginBottom:14}}>
            {[{l:'Reward',v:`${task.reward.toLocaleString()} ${task.currency}`},{l:'Slots',v:`${task.slotsLeft} / ${task.slots}`},{l:'Difficulty',v:task.difficulty},{l:'Time',v:task.estimatedTime}].map(i=>(
              <div key={i.l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px dashed rgba(255,255,255,0.06)',fontSize:12,color:'var(--text2)'}}>
                <span>{i.l}</span><span style={{fontWeight:800,color:'var(--text)'}}>{i.v}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>{onClose();navigate(`/tasks/${task.id}/submit`)}} style={{width:'100%',height:48,fontSize:15,...btnPrimary}}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Apply & Earn {task.reward.toLocaleString()} {task.currency}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Report Modal ──
function ReportMod({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const [reason, setReason] = useState(''); const [msg, setMsg] = useState(''); const [sent, setSent] = useState(false)
  const handle = async () => {
    if (!reason.trim()) return
    try { const t=getAccessToken();if(!t)return;await fetch(`${API_BASE}/reports`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${t}`},body:JSON.stringify({taskId,reason,message:msg})});setSent(true) } catch {}
  }
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}} onClick={onClose}>
      <div style={{background:'rgba(20,20,30,0.85)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,maxWidth:460,width:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <h3 style={{fontSize:15,fontWeight:800,margin:0,display:'flex',alignItems:'center',gap:8,color:'var(--text)'}}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg> Report</h3>
          <button onClick={onClose} style={{background:'none',border:'none',width:30,height:30,borderRadius:'50%',display:'grid',placeItems:'center',cursor:'pointer',color:'var(--text2)'}}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div style={{padding:'16px 20px'}}>
          {sent?(<div style={{display:'flex',alignItems:'center',gap:10,fontSize:13,color:'var(--text)',padding:12}}><svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Report submitted.</div>):(<>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:6}}>Reason</label>
            <select style={glassInput} value={reason} onChange={e=>setReason(e.target.value)}><option value="">Select a reason...</option><option value="spam">Spam</option><option value="inappropriate">Inappropriate</option><option value="scam">Scam</option><option value="offensive">Offensive</option><option value="other">Other</option></select>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:6,marginTop:12}}>Message</label>
            <textarea style={{...glassInput,resize:'vertical',minHeight:70}} rows={3} value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Details..."/>
            <button onClick={handle} disabled={!reason.trim()} style={{width:'100%',marginTop:14,...btnPrimary,background:'transparent',borderColor:'rgba(239,68,68,.3)',color:'#ef4444'}}>Submit Report</button>
          </>)}
        </div>
      </div>
    </div>
  )
}

// ── Share Modal ──
function ShareMod({ task, onClose }: { task: TaskData; onClose: () => void }) {
  const url = typeof window !== 'undefined' ? window.location.href : ''
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}} onClick={onClose}>
      <div style={{background:'rgba(20,20,30,0.85)',backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,maxWidth:460,width:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <h3 style={{fontSize:15,fontWeight:800,margin:0,color:'var(--text)'}}>Share</h3>
          <button onClick={onClose} style={{background:'none',border:'none',width:30,height:30,borderRadius:'50%',display:'grid',placeItems:'center',cursor:'pointer',color:'var(--text2)'}}><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
        </div>
        <div style={{padding:'16px 20px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'10px 12px',marginBottom:12}}>
            <span style={{flex:1,fontSize:11,color:'var(--text3)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{url}</span>
            <button onClick={()=>navigator.clipboard.writeText(url)} style={{...btnOutline,height:30,fontSize:11,padding:'0 10px'}}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</button>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check this task: ${task.title}`)}&url=${encodeURIComponent(url)}`,'_blank')} style={{flex:1,...btnOutline}}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> X
            </button>
            <button onClick={()=>window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(task.title)}`,'_blank')} style={{flex:1,...btnOutline}}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> Telegram
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
