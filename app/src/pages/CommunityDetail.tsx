import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import Layout from '../components/Layout'
import { uploadImage } from '../lib/upload'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

const TABS = ['About', 'Leaderboard', 'Open Jobs', 'Completed', 'Chat']

export default function CommunityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const [community, setCommunity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('About')
  const [isMember, setIsMember] = useState(false)
  const [hasRequested, setHasRequested] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinView, setJoinView] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [joinMessage, setJoinMessage] = useState('')
  const [joinAttachments, setJoinAttachments] = useState<File[]>([])
  const [joinError, setJoinError] = useState('')
  const [sendingRequest, setSendingRequest] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [toast, setToast] = useState('')

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [lbPage, setLbPage] = useState(1)
  const [lbTotalPages, setLbTotalPages] = useState(1)

  // Open Jobs
  const [openJobs, setOpenJobs] = useState<any[]>([])
  const [ojPage, setOjPage] = useState(1)
  const [ojTotalPages, setOjTotalPages] = useState(1)

  // Completed
  const [completedJobs, setCompletedJobs] = useState<any[]>([])
  const [cjPage, setCjPage] = useState(1)
  const [cjTotalPages, setCjTotalPages] = useState(1)

  // Cover upload
  const [uploadingCover, setUploadingCover] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', category: '', accentColor: '' })
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null)
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null)
  const ownerId = typeof community?.owner === 'object' ? community?.owner?.id : community?.owner
  const isOwner = !!authUser && !!ownerId && authUser.id === ownerId
  const communityAvatar = community?.iconUrl || community?.logoUrl || community?.avatarImage || community?.avatarUrl || community?.image || null

  // Chat
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [chatLoaded, setChatLoaded] = useState(false)

  const token = localStorage.getItem('ogapay_access_token')
  const authHeaders = token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : {}

  const openEditModal = () => {
    if (!community) return
    setEditForm({
      name: community.name || '',
      description: community.description || '',
      category: community.category || '',
      accentColor: community.accentColor || '#7C3AED',
      minRank: community.minRank || '',
      minTasks: community.minTasks || '',
      requireKyc: community.requireKyc || false,
    })
    setShowEditModal(true)
  }
  const handleGenerateInviteCode = async () => {
    try {
      const res = await fetch(API_BASE + '/communities/' + community.id + '/invite-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      })
      const json = await res.json()
      if (json.success) {
        setCommunity((prev: any) => ({ ...prev, inviteCode: json.data.inviteCode }))
        setToast('Invite code generated!')
        setTimeout(() => setToast(''), 2500)
      }
    } catch {}
  }

  const handleCopyInviteCode = () => {
    navigator.clipboard?.writeText(community.inviteCode || '')
    setToast('Invite code copied!')
    setTimeout(() => setToast(''), 2500)
  }


  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!community || !editForm.name.trim()) return
    setEditing(true)
    try {
      // Upload cover first if changed
      if (editCoverFile) {
        const coverUrl = await uploadImage(editCoverFile, 'community-covers')
        if (coverUrl) {
          await fetch(API_BASE + '/communities/' + community.id + '/cover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ coverUrl }),
          })
          setCommunity((prev: any) => ({ ...prev, coverImage: coverUrl }))
        }
      }
      // Build requirements from edit form
      const editRequirements = []
      if (editForm.minRank) editRequirements.push('Minimum rank: ' + editForm.minRank)
      if (editForm.minTasks) editRequirements.push('Min tasks: ' + editForm.minTasks)
      if (editForm.requireKyc) editRequirements.push('KYC verified')
      const editPayload = { ...editForm, requirements: editRequirements }
      const res = await fetch(API_BASE + '/communities/' + community.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(editPayload),
      })
      const json = await res.json()
      if (json.success) {
        setCommunity((prev: any) => ({ ...prev, ...editForm }))
        setShowEditModal(false)
      } else {
        throw new Error(json.message || 'Failed to update')
      }
    } catch (err: any) {
      alert(err.message)
    }
    setEditing(false)
  }

  const handleCoverUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file || !community) return
    setUploadingCover(true)
    try {
      const url = await uploadImage(file, 'community-covers')
      if (url) {
        const res = await fetch(`${API_BASE}/communities/${community.id}/cover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ coverUrl: url }),
        })
        if (res.ok) {
          const json = await res.json()
          setCommunity((prev: any) => ({ ...prev, coverImage: json.data?.coverImage || url }))
          setUploadSuccess(true)
          setTimeout(() => setUploadSuccess(false), 2000)
        }
      }
    } catch {}
    setUploadingCover(false)
  }

  const handleAvatarUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file || !community) return
    try {
      const url = await uploadImage(file, 'community-avatars')
      if (url) {
        const res = await fetch(`${API_BASE}/communities/${community.id}/avatar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ avatarUrl: url }),
        })
        if (res.ok) {
          setCommunity((prev: any) => ({ ...prev, iconUrl: url }))
          setToast('Profile picture updated')
          setTimeout(() => setToast(''), 2500)
        }
      }
    } catch {}
  }

  useEffect(() => {
    async function fetchCommunity() {
      try {
        const json: any = await apiRequest('/communities/' + id)
        console.log('CommunityDetail response:', JSON.stringify(json).slice(0, 500))
        const data = json?.data || json
        if (data && (data.id || data.name)) {
          setCommunity(data)
          setIsMember(!!data.userRole || !!data.isMember || !!data.membership)
          setHasRequested(!!data.hasRequested)
        }
      } catch (e) {
        console.error('CommunityDetail fetch error:', e)
      }
      setLoading(false)
    }
    fetchCommunity()
  }, [id])

  useEffect(() => {
    if (activeTab === 'Leaderboard') { fetchLeaderboard(1); setLbPage(1) }
    if (activeTab === 'Open Jobs') { fetchOpenJobs(1); setOjPage(1) }
    if (activeTab === 'Completed') { fetchCompletedJobs(1); setCjPage(1) }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'Chat' && isMember && !chatLoaded) {
      fetchChat()
      setChatLoaded(true)
    }
  }, [activeTab, isMember])

  const fetchLeaderboard = async (page: number) => {
    try {
      const res = await fetch(API_BASE + '/communities/' + id + '/leaderboard?page=' + page)
      const json = await res.json()
      if (json.success && json.data) {
        setLeaderboard(json.data.members || [])
        setLbTotalPages(json.data.totalPages || 1)
      }
    } catch {}
  }

  const fetchOpenJobs = async (page: number) => {
    try {
      const res = await fetch(API_BASE + '/communities/' + id + '/jobs/open?page=' + page)
      const json = await res.json()
      if (json.success && json.data) {
        setOpenJobs(json.data.jobs || [])
        setOjTotalPages(json.data.totalPages || 1)
      }
    } catch {}
  }

  const fetchCompletedJobs = async (page: number) => {
    try {
      const res = await fetch(API_BASE + '/communities/' + id + '/jobs/completed?page=' + page)
      const json = await res.json()
      if (json.success && json.data) {
        setCompletedJobs(json.data.jobs || [])
        setCjTotalPages(json.data.totalPages || 1)
      }
    } catch {}
  }

  const fetchChat = async () => {
    try {
      const res = await fetch(API_BASE + '/communities/' + id + '/chat', { headers: authHeaders })
      const json = await res.json()
      if (json.success && json.data) setMessages(json.data)
    } catch {}
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    setSending(true)
    try {
      const res = await fetch(API_BASE + '/communities/' + id + '/chat', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ text: newMessage.trim() }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setMessages(prev => [...prev, json.data])
        setNewMessage('')
      }
    } catch {}
    setSending(false)
  }

  const handleRequestJoin = async () => {
    if (!token) { navigate('/login'); return }
    setJoinView(true)
  }

  const handleUseInviteCode = async () => {
    if (!inviteCode.trim() || !token) return
    setJoining(true)
    setJoinError('')
    try {
      const res = await fetch(API_BASE + '/communities/' + id + '/join', {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setIsMember(true)
        setCommunity((prev: any) => ({ ...prev, memberCount: (prev?.memberCount || 0) + 1 }))
        setJoinView(false)
      } else {
        setJoinError(json.message || 'Failed to join')
      }
    } catch {}
    setJoining(false)
  }

  const handleSendRequest = async () => {
    if (!token) return
    // Validate requirements client-side
    if (community.requirements?.length > 0) {
      for (const req of community.requirements) {
        if (req.startsWith('Minimum rank:')) {
          const minRank = parseInt(req.split(':')[1].trim())
          if ((authUser?.rank || 1) < minRank) {
            setJoinError('You need at least Rank ' + minRank + ' to join this community. Your current rank is ' + (authUser?.rank || 1) + '.')
            setSendingRequest(false)
            return
          }
        }
        if (req.startsWith('Min tasks:')) {
          const minTasks = parseInt(req.split(':')[1].trim())
          if ((authUser?.tasksCompleted || 0) < minTasks) {
            setJoinError('You need to complete at least ' + minTasks + ' tasks to join. You have completed ' + (authUser?.tasksCompleted || 0) + '.')
            setSendingRequest(false)
            return
          }
        }
        if (req === 'KYC verified' && authUser?.kycStatus !== 'VERIFIED') {
          setJoinError('You need to complete KYC verification to join this community. Go to Profile \u2192 Settings \u2192 KYC.')
          setSendingRequest(false)
          return
        }
      }
    }
    setSendingRequest(true)
    setJoinError('')
    try {
      const formData = new FormData()
      formData.append('message', joinMessage)
      joinAttachments.forEach(f => formData.append('attachments', f))
      const res = await fetch(API_BASE + '/communities/' + id + '/request', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        setHasRequested(true)
        setJoinView(false)
      } else {
        setJoinError(json.message || 'Failed to send join request')
      }
    } catch {}
    setSendingRequest(false)
  }

  const addAttachment = (file: File) => {
    if (joinAttachments.length >= 3) return
    setJoinAttachments(prev => [...prev, file])
  }

  const removeAttachment = (index: number) => {
    setJoinAttachments(prev => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24, display: 'block', marginBottom: 8 }} />
          Loading...
        </div>
      </Layout>
    )
  }

  if (!community) {
    return (
      <Layout>
        <div style={{textAlign:'center', padding:'60px 24px'}}>
          <i className="ti ti-users-off" style={{fontSize:48, color:'var(--text3)'}} />
          <p style={{color:'var(--text2)', marginTop:16, fontSize:14}}>
            This community could not be loaded. It may be private or no longer available.
          </p>
          <button onClick={() => navigate('/communities')}
            style={{marginTop:16, padding:'10px 24px', borderRadius:10, background:'#191C6B', color:'#fff', border:'none', fontWeight:700, cursor:'pointer', fontFamily:'inherit'}}>
            ← Back to Communities
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <style>{`
        .cd-page{max-width:700px;margin:0 auto;padding:0 0 40px}
        .cd-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:16px;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;padding:0}
        .cd-back:hover{color:var(--text)}
        .cd-header{border-radius:16px;border:1px solid var(--border);background:var(--card);padding:16px;display:flex;flex-direction:column;gap:16px;margin-bottom:12px}
        .cd-h-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .cd-h-left{display:flex;align-items:center;gap:12px;flex:1;min-width:0}
        .cd-avatar{width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0}
        .cd-h-name{font-family:Outfit;font-size:18px;font-weight:800;margin:0}
        .cd-h-socials{display:flex;align-items:center;gap:8px;margin-top:4px}
        .cd-h-socials a{color:var(--text3);font-size:16px;transition:color .15s;text-decoration:none}
        .cd-h-socials a:hover{color:var(--text)}
        .cd-share{border:1px solid var(--border);border-radius:12px;padding:6px 12px;font-size:13px;color:var(--text2);background:var(--bg);cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;font-weight:600;transition:all .15s;flex-shrink:0}
        .cd-share:hover{border-color:var(--accent);color:var(--accent)}
        .cd-stats{display:flex;justify-content:space-between;text-align:center}
        .cd-stat-num{font-family:Outfit;font-size:18px;font-weight:800}
        .cd-stat-label{font-size:12px;color:var(--text3);margin-top:2px}
        .cd-join{width:fit-content;background:#191C6B;color:#fff;border-radius:12px;padding:8px 16px;font-size:13px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;transition:opacity .15s;font-family:inherit}
        .cd-join:hover{opacity:.9}
        .cd-join:disabled{opacity:.5;cursor:not-allowed}
        .cd-member-badge{font-size:12px;color:#16a34a;font-weight:600}
        .cd-tabs{display:flex;overflow-x:auto;gap:4px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:4px;margin-bottom:12px}
        .cd-tabs::-webkit-scrollbar{display:none}
        .cd-tab{flex-shrink:0;padding:8px 12px;border-radius:10px;font-size:12px;font-weight:600;transition:all .15s;border:none;cursor:pointer;font-family:inherit;background:transparent;color:var(--text3)}
        .cd-tab:hover{color:var(--text2)}
        .cd-tab.active{background:#191C6B;color:#fff}
        .cd-card{border-radius:12px;border:1px solid var(--border);background:var(--card);padding:16px;margin-bottom:12px}
        .cd-card-title{font-family:Outfit;font-size:15px;font-weight:700;margin:0 0 4px}
        .cd-card-sub{font-size:12px;color:var(--text3);margin:0 0 16px}
        .cd-empty{text-align:center;padding:40px 16px;color:var(--text3)}
        .cd-empty i{font-size:32px;display:block;margin-bottom:8px}
        .cd-empty p{font-size:13px;color:var(--text2);margin:0}

        .cd-lb-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}
        .cd-lb-row:last-child{border-bottom:none}
        .cd-lb-rank{font-size:12px;color:var(--text3);width:20px;text-align:center;flex-shrink:0}
        .cd-lb-avatar{width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0}
        .cd-lb-info{flex:1;min-width:0}
        .cd-lb-name{font-size:14px;font-weight:600}
        .cd-lb-meta{display:flex;align-items:center;gap:8px;margin-top:2px}
        .cd-lb-level{font-size:12px;color:var(--accent)}
        .cd-lb-role{font-size:11px;color:var(--text3)}
        .cd-pagination{display:flex;align-items:center;justify-content:space-between;margin-top:12px}
        .cd-pagination button{font-size:12px;border:1px solid var(--border);border-radius:8px;padding:6px 12px;background:var(--bg);color:var(--text2);cursor:pointer;font-weight:600;transition:all .15s;font-family:inherit}
        .cd-pagination button:hover{border-color:var(--accent);color:var(--accent)}
        .cd-pagination button:disabled{opacity:.4;cursor:not-allowed}
        .cd-pagination span{font-size:12px;color:var(--text3)}

        .cd-job-row{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px}
        .cd-job-left{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0;padding-right:12px}
        .cd-job-title{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
        .cd-job-reward{font-size:12px;color:#16a34a;font-weight:700}
        .cd-job-view{background:#191C6B;color:#fff;font-size:12px;border-radius:10px;padding:6px 12px;font-weight:600;border:none;cursor:pointer;white-space:nowrap;transition:opacity .15s;font-family:inherit}
        .cd-job-view:hover{opacity:.9}
        .cd-comp-status{font-size:11px;color:#16a34a;font-weight:700}
        .cd-comp-right{text-align:right;flex-shrink:0}
        .cd-comp-amount{font-size:14px;font-weight:800}
        .cd-comp-label{font-size:12px;color:var(--text3)}
        .cd-comp-view{margin-top:4px;background:#191C6B;color:#fff;font-size:12px;border-radius:10px;padding:6px 12px;font-weight:600;border:none;cursor:pointer;font-family:inherit}

        .cd-chat-msgs{display:flex;flex-direction:column;gap:8px;max-height:384px;overflow-y:auto;margin-bottom:12px}
        .cd-msg{display:flex;align-items:flex-start;gap:8px}
        .cd-msg-avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0}
        .cd-msg-body{background:var(--bg2);border-radius:10px;padding:8px 12px;flex:1}
        .cd-msg-user{font-size:11px;font-weight:700;margin:0 0 2px}
        .cd-msg-text{font-size:13px;margin:0;line-height:1.4}
        .cd-chat-input{display:flex;gap:8px}
        .cd-chat-input input{flex:1;border:1px solid var(--border);border-radius:10px;padding:8px 12px;font-size:13px;background:var(--bg);color:var(--text);outline:none;font-family:inherit}
        .cd-chat-input input:focus{border-color:#191C6B}
        .cd-chat-send{background:#191C6B;color:#fff;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;border:none;cursor:pointer;white-space:nowrap;transition:opacity .15s;font-family:inherit}
        .cd-chat-send:hover{opacity:.9}
        .cd-chat-send:disabled{opacity:.5;cursor:not-allowed}

        .cd-desc{font-size:13px;color:var(--text2);line-height:1.6;margin:0}
        .cd-desc-label{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
      `}</style>

      {!joinView && (
      <div className="cd-page">
        <button className="cd-back" onClick={() => navigate('/communities')}>
          <i className="ti ti-arrow-left" /> Communities
        </button>

        {/* ── Cover Photo ── */}
        <div style={{
          position: 'relative',
          height: 180,
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: 0,
          background: community.coverImage ? undefined : `linear-gradient(135deg, ${community.accentColor || '#191C6B'}, #0d0f2e)`,
          backgroundImage: community.coverImage ? `url(${community.coverImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
          {isOwner && (
            <>
              <label htmlFor="cover-upload-input" style={{
                position:'absolute', bottom:10, right:10,
                background:'rgba(0,0,0,0.55)', color:'#fff',
                borderRadius:8, padding:'6px 12px', fontSize:11,
                fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6,
              }}>
                <i className="ti ti-camera" style={{fontSize:14}} /> Change Cover
              </label>
              <input id="cover-upload-input" type="file" accept="image/*" style={{display:'none'}} onChange={handleCoverUpload} />
            </>
          )}
        </div>

        {/* ── Profile Picture overlapping cover ── */}
        <div style={{position:'relative', background:'var(--card)', borderRadius:'0 0 16px 16px', border:'1px solid var(--border)', borderTop:'none', padding:'0 20px 20px', marginBottom:12}}>
          <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14}}>
            {/* Avatar — overlaps cover */}
            <div style={{
              width: 80, height: 80,
              borderRadius: 16,
              border: '4px solid var(--card)',
              marginTop: -40,
              overflow: 'hidden',
              background: community.accentColor || '#191C6B',
              display: 'grid', placeItems: 'center',
              flexShrink: 0, position: 'relative',
            }}>
              {communityAvatar
                ? <img src={communityAvatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                : <span style={{fontSize:26,fontWeight:900,color:'#fff'}}>{community.name?.slice(0,2).toUpperCase()}</span>
              }
              {isOwner && (
                <>
                  <label htmlFor="avatar-upload-input" style={{
                    position:'absolute', inset:0, background:'rgba(0,0,0,0.4)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', opacity:0, transition:'opacity .2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity='1'}
                  onMouseLeave={e => e.currentTarget.style.opacity='0'}>
                    <i className="ti ti-camera" style={{fontSize:18,color:'#fff'}} />
                  </label>
                  <input id="avatar-upload-input" type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarUpload} />
                </>
              )}
            </div>

            {/* Share + Edit buttons */}
            <div style={{display:'flex',gap:8,paddingTop:8}}>
              <button onClick={() => { navigator.clipboard?.writeText(window.location.href); setToast('Link copied!'); setTimeout(() => setToast(''), 2000) }}
                style={{height:34,padding:'0 14px',borderRadius:10,border:'1px solid var(--border)',background:'var(--card)',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit'}}>
                <i className="ti ti-share" style={{fontSize:14}} /> Share
              </button>
              {isOwner && (
                <button onClick={openEditModal}
                  style={{height:34,padding:'0 14px',borderRadius:10,border:'1px solid var(--border)',background:'var(--card)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  <i className="ti ti-edit" style={{fontSize:14}} /> Edit
                </button>
              )}
            </div>
          </div>

          {/* Name + social links */}
          <h1 style={{fontFamily:'Outfit,sans-serif',fontSize:22,fontWeight:900,margin:'0 0 6px'}}>{community.name}</h1>
          <div style={{display:'flex',gap:8,marginBottom:14}}>
            {community.twitter && <a href={community.twitter} target="_blank" rel="noopener noreferrer" style={{width:28,height:28,borderRadius:8,border:'1px solid var(--border)',display:'grid',placeItems:'center',color:'var(--text2)'}}><i className="ti ti-brand-x" style={{fontSize:14}} /></a>}
            {community.telegram && <a href={community.telegram} target="_blank" rel="noopener noreferrer" style={{width:28,height:28,borderRadius:8,border:'1px solid var(--border)',display:'grid',placeItems:'center',color:'var(--text2)'}}><i className="ti ti-send" style={{fontSize:14}} /></a>}
            {community.discord && <a href={community.discord} target="_blank" rel="noopener noreferrer" style={{width:28,height:28,borderRadius:8,border:'1px solid var(--border)',display:'grid',placeItems:'center',color:'var(--text2)'}}><i className="ti ti-brand-discord" style={{fontSize:14}} /></a>}
          </div>

          {/* Stats row */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',padding:'12px 0',marginBottom:14,textAlign:'center'}}>
            <div><div style={{fontFamily:'Outfit,sans-serif',fontSize:20,fontWeight:900}}>{community.memberCount || community._count?.members || 0}</div><div style={{fontSize:11,color:'var(--text2)'}}>Members</div></div>
            <div style={{borderLeft:'1px solid var(--border)',borderRight:'1px solid var(--border)'}}><div style={{fontFamily:'Outfit,sans-serif',fontSize:20,fontWeight:900}}>{community.challengeCount || community._count?.tasks || 0}</div><div style={{fontSize:11,color:'var(--text2)'}}>Challenges</div></div>
            <div><div style={{fontFamily:'Outfit,sans-serif',fontSize:20,fontWeight:900}}>NGN {(community.totalDistributed || community.totalRewards || 0).toLocaleString()}</div><div style={{fontSize:11,color:'var(--text2)'}}>Distributed</div></div>
          </div>

          {/* Join / Status */}
          {!isMember && !hasRequested && <button onClick={handleRequestJoin} style={{height:40,padding:'0 20px',borderRadius:10,background:'#191C6B',color:'#fff',border:'none',fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:8}}><i className="ti ti-user-plus" style={{fontSize:15}} /> {community.isPublic ? 'Join Community' : 'Request to Join'}</button>}
          {hasRequested && <span style={{fontSize:13,color:'var(--text2)',fontWeight:600}}><i className="ti ti-hourglass" style={{fontSize:14}} /> Request pending approval</span>}
          {isMember && !isOwner && <span style={{fontSize:13,color:'#16a34a',fontWeight:700}}><i className="ti ti-check" style={{fontSize:14}} /> You are a member</span>}
          {isOwner && <span style={{fontSize:13,color:'#191C6B',fontWeight:700}}><i className="ti ti-crown" style={{fontSize:14}} /> You own this community</span>}
        </div>

        {/* Tabs */}
        <div className="cd-tabs">
          {TABS.map(tab => (
            <button key={tab} className={`cd-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'About' && <i className="ti ti-info-circle" style={{ marginRight: 4 }} />}
              {tab === 'Leaderboard' && <i className="ti ti-trophy" style={{ marginRight: 4 }} />}
              {tab === 'Open Jobs' && <i className="ti ti-briefcase" style={{ marginRight: 4 }} />}
              {tab === 'Completed' && <i className="ti ti-checkbox" style={{ marginRight: 4 }} />}
              {tab === 'Chat' && <i className="ti ti-message" style={{ marginRight: 4 }} />}
              {tab}
            </button>
          ))}
        </div>

        {/* About */}
        {activeTab === 'About' && (
          <div className="cd-card">
            <div className="cd-desc-label">About This Community</div>
            <p className="cd-card-sub">Learn more about what we do</p>
            <p className="cd-desc">{community.description || 'No description available.'}</p>
          </div>
        )}
        {activeTab === 'About' && isOwner && (
          <div className="cd-card" style={{ borderColor: 'var(--accent)' }}>
            <div className="cd-desc-label" style={{ color: 'var(--accent)' }}>Settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>Cover Image</label>
              <input type="file" accept="image/*" onChange={handleCoverUpload}
                style={{ fontSize: 13, color: 'var(--text3)' }} />
              {uploadingCover && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Uploading...</span>}
              {community.coverImage && (
                <div style={{ width: '100%', height: 128, borderRadius: 10, overflow: 'hidden', marginTop: 4 }}>
                  <img loading="lazy" src={community.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {activeTab === 'Leaderboard' && (
          <div className="cd-card">
            <div className="cd-card-title">Community Leaderboard</div>
            <p className="cd-card-sub">Page {lbPage} of {lbTotalPages}</p>
            {leaderboard.length === 0 ? (
              <div className="cd-empty">
                <i className="ti ti-trophy" />
                <p>No members yet</p>
              </div>
            ) : (
              <>
                {(leaderboard || []).map((m: any) => (
                  <div key={m.id} className="cd-lb-row">
                    <span className="cd-lb-rank">{m.rank}</span>
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} className="cd-lb-avatar" alt="" />
                    ) : (
                      <div className="cd-lb-avatar" style={{ background: community.accentColor || '#191C6B', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                        {m.username?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="cd-lb-info">
                      <div className="cd-lb-name">{m.username || m.firstName + ' ' + m.lastName}</div>
                      <div className="cd-lb-meta">
                        <span className="cd-lb-level"><i className="ti ti-medal" style={{ fontSize: 12 }} /> Level {m.level}</span>
                        {m.role === 'OWNER' && <span className="cd-lb-role">Owner</span>}
                        {m.role === 'ADMIN' && <span className="cd-lb-role">Admin</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="cd-pagination">
                  <button disabled={lbPage <= 1} onClick={() => { const p = lbPage - 1; setLbPage(p); fetchLeaderboard(p) }}>Previous</button>
                  <span>Page {lbPage} of {lbTotalPages}</span>
                  <button disabled={lbPage >= lbTotalPages} onClick={() => { const p = lbPage + 1; setLbPage(p); fetchLeaderboard(p) }}>Next</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Open Jobs */}
        {activeTab === 'Open Jobs' && (
          <div className="cd-card">
            <div className="cd-card-title">Open Jobs</div>
            <p className="cd-card-sub">Active challenges available to apply</p>
            {openJobs.length === 0 ? (
              <div className="cd-empty">
                <i className="ti ti-briefcase" />
                <p>No open jobs yet</p>
              </div>
            ) : (
              <>
                {(openJobs || []).map((job: any) => (
                  <div key={job.id} className="cd-job-row">
                    <div className="cd-job-left">
                      <div className="cd-job-title">{job.title}</div>
                      <div className="cd-job-reward">NGN {job.reward?.toLocaleString()}</div>
                    </div>
                    <button className="cd-job-view" onClick={() => navigate('/tasks/' + job.id)}>View</button>
                  </div>
                ))}
                <div className="cd-pagination">
                  <button disabled={ojPage <= 1} onClick={() => { const p = ojPage - 1; setOjPage(p); fetchOpenJobs(p) }}>Previous</button>
                  <span>Page {ojPage} of {ojTotalPages}</span>
                  <button disabled={ojPage >= ojTotalPages} onClick={() => { const p = ojPage + 1; setOjPage(p); fetchOpenJobs(p) }}>Next</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Completed */}
        {activeTab === 'Completed' && (
          <div className="cd-card">
            <div className="cd-card-title">Completed Jobs</div>
            <p className="cd-card-sub">Successfully finished challenges</p>
            {completedJobs.length === 0 ? (
              <div className="cd-empty">
                <i className="ti ti-checkbox" />
                <p>No completed jobs yet</p>
              </div>
            ) : (
              <>
                {(completedJobs || []).map((job: any) => (
                  <div key={job.id} className="cd-job-row">
                    <div className="cd-job-left">
                      <span className="cd-comp-status">COMPLETED</span>
                      <div className="cd-job-title" style={{ fontSize: 13, color: 'var(--text2)' }}>{job.title}</div>
                    </div>
                    <div className="cd-comp-right">
                      <div className="cd-comp-amount">{job.rewardPaid?.toLocaleString()}</div>
                      <div className="cd-comp-label">NGN PAID</div>
                      <button className="cd-comp-view" onClick={() => navigate('/tasks/' + job.id)}>View</button>
                    </div>
                  </div>
                ))}
                <div className="cd-pagination">
                  <button disabled={cjPage <= 1} onClick={() => { const p = cjPage - 1; setCjPage(p); fetchCompletedJobs(p) }}>Previous</button>
                  <span>Page {cjPage} of {cjTotalPages}</span>
                  <button disabled={cjPage >= cjTotalPages} onClick={() => { const p = cjPage + 1; setCjPage(p); fetchCompletedJobs(p) }}>Next</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Chat */}
        {activeTab === 'Chat' && (
          <div className="cd-card">
            <div className="cd-card-title">Community Chat</div>
            <p className="cd-card-sub">Only members of this community can view and post messages</p>
            {!isMember ? (
              <div className="cd-empty">
                <i className="ti ti-message" />
                <p>Chat is available to community members only</p>
              </div>
            ) : (
              <>
                <div className="cd-chat-msgs">
                  {messages.length === 0 ? (
                    <div className="cd-empty" style={{ padding: 20 }}>
                      <i className="ti ti-message" style={{ fontSize: 24 }} />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg: any) => (
                      <div key={msg.id} className="cd-msg">
                        {msg.sender?.avatarUrl ? (
                          <img src={msg.sender.avatarUrl} className="cd-msg-avatar" alt="" />
                        ) : (
                          <div className="cd-msg-avatar" style={{ background: community.accentColor || '#191C6B', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                            {msg.sender?.username?.slice(0, 2).toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="cd-msg-body">
                          <p className="cd-msg-user">{msg.sender?.username || 'Unknown'}</p>
                          <p className="cd-msg-text">{msg.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="cd-chat-input">
                  <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={e => { if (e.key === 'Enter' && !sending) sendMessage() }}
                  />
                  <button className="cd-chat-send" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      )}

      {joinView && (
        <div className="cd-page">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button className="cd-back" onClick={() => setJoinView(false)} style={{ marginBottom: 0 }}>
              <i className="ti ti-arrow-left" /> Back to Community
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Request to Join Community</span>
          </div>

          {/* Invite code box */}
          <div style={{ background: '#0d0f14', border: '1px solid #1e2028', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#ccc', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <i className="ti ti-calendar" style={{ fontSize: 14 }} /> Use an invite code
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" placeholder="Enter invite code" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                style={{ flex: 1, background: '#111318', border: '1px solid #2a2d35', borderRadius: 10, color: '#fff', fontSize: 13, padding: '10px 14px', outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={handleUseInviteCode} disabled={joining || !inviteCode.trim()}
                style={{ background: '#191C6B', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: joining ? 0.6 : 1 }}>
                {joining ? '...' : 'Use Code'}
              </button>
            </div>
            {joinError && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{joinError}</div>}
          </div>

          {/* OR divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#2a2d35' }} />
            <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#2a2d35' }} />
          </div>

          {/* Entry Task card */}
          <div style={{ background: '#0d0f14', border: '1px solid #1e2028', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{community.name}</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.5 }}>Complete the entry task and meet requirements to join this community.</div>
            {community.coverImage && (
              <div style={{ width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                <img loading="lazy" src={community.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Requirements</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(community.requirements || []).length > 0 ? (community.requirements || []).map((r: string, idx: number) => (
                <span key={idx} style={{ background: '#111318', border: '1px solid #2a2d35', borderRadius: 999, padding: '4px 10px', fontSize: 11, color: '#aaa' }}>{r}</span>
              )) : (
                <span style={{ fontSize: 11, color: '#666' }}>No specific requirements</span>
              )}
            </div>
            {joinError && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#ef4444', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} /> {joinError}
              </div>
            )}
          </div>

          {/* Message textarea */}
          <div style={{ background: '#0d0f14', border: '1px solid #1e2028', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#ccc', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <i className="ti ti-message" style={{ fontSize: 14 }} /> Message (optional)
            </label>
            <textarea placeholder="Tell the community why you'd like to join..." maxLength={250} value={joinMessage} onChange={e => setJoinMessage(e.target.value)}
              style={{ width: '100%', background: '#111318', border: '1px solid #2a2d35', borderRadius: 10, color: '#fff', fontSize: 13, padding: '10px 14px', outline: 'none', minHeight: 80, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ textAlign: 'right', fontSize: 11, color: '#666', marginTop: 4 }}>{joinMessage.length}/250</div>
          </div>

          {/* Attachments section */}
          <div style={{ background: '#0d0f14', border: '1px solid #1e2028', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#ccc', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <i className="ti ti-paperclip" style={{ fontSize: 14 }} /> Your Attachments (max 3)
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {joinAttachments.map((f, i) => (
                <div key={i} style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', position: 'relative', border: '1px solid #2a2d35' }}>
                  <img loading="lazy" src={URL.createObjectURL(f)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  <div onClick={() => removeAttachment(i)} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 10, lineHeight: 1 }}>×</div>
                </div>
              ))}
            </div>
            {joinAttachments.length < 3 && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#111318', border: '1px solid #2a2d35', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#aaa', cursor: 'pointer', fontFamily: 'inherit' }}>
                <i className="ti ti-upload" /> Upload
                <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) addAttachment(f); e.target.value = '' }} />
              </label>
            )}
          </div>

          {/* Bottom action bar */}
          <div style={{ marginTop: 16 }}>
            <button onClick={handleSendRequest} disabled={sendingRequest}
              style={{ width: '100%', background: '#191C6B', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8, opacity: sendingRequest ? 0.6 : 1 }}>
              {sendingRequest ? <>Sending...</> : <>Send Request </>}
            </button>
            <button onClick={() => setJoinView(false)}
              style={{ width: '100%', background: 'transparent', color: '#888', border: '1.5px solid #2a2d35', borderRadius: 12, padding: '12px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              × Cancel
            </button>
            <p style={{ fontSize: 11, color: '#666', lineHeight: 1.5, marginTop: 12, textAlign: 'center' }}>
              If a community has an entry task, only request to join after you complete the task and meet all requirements. <span style={{ color: '#f59e0b' }}>Spamming community requests can lead to warnings or account blocks.</span>
            </p>
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={() => setShowEditModal(false)}>
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 28, width: '100%', maxWidth: 480,
            maxHeight: '90vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 800, margin: 0 }}>Edit Community</h2>
              <button onClick={() => setShowEditModal(false)} style={{ border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20, padding: 4 }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>Cover Image</label>
                <input type="file" accept="image/*" style={{ display: 'none' }} id="edit-cover-input" onChange={e => {
                  const file = e.target.files?.[0] || null
                  setEditCoverFile(file)
                  setEditCoverPreview(file ? URL.createObjectURL(file) : null)
                }} />
                <div onClick={() => document.getElementById('edit-cover-input')?.click()} style={{
                  width: '100%', height: 140, borderRadius: 10,
                  border: '1.5px dashed var(--border)', background: 'var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative', marginBottom: 4,
                }}>
                  {editCoverPreview ? (
                    <img loading="lazy" src={editCoverPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : community.coverImage ? (
                    <img loading="lazy" src={community.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text3)', fontSize: 13 }}>
                      <i className="ti ti-photo" style={{ fontSize: 28 }} />
                      <span>Click to upload cover image</span>
                    </div>
                  )}
                  {(editCoverPreview || community.coverImage) && (
                    <div onClick={e => { e.stopPropagation(); setEditCoverFile(null); setEditCoverPreview(null); const inp = document.getElementById('edit-cover-input') as HTMLInputElement; if (inp) inp.value = '' }} style={{
                      position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(0,0,0,.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: 16,
                    }}>
                      <i className="ti ti-x" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>Name</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none', minHeight: 80, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>Category</label>
                <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                  {['Crypto', 'Business', 'Content', 'Design', 'Marketing', 'Technology', 'Gaming', 'Education', 'Social', 'Other'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>Accent Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['#7C3AED', '#191C6B', '#EC4899', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'].map(color => (
                    <div key={color} onClick={() => setEditForm(f => ({ ...f, accentColor: color }))}
                      style={{ width: 36, height: 36, borderRadius: '50%', background: color, cursor: 'pointer', border: editForm.accentColor === color ? '3px solid var(--text)' : '3px solid transparent', transition: 'all .15s' }} />
                  ))}
                </div>
              </div>
              <button type="submit" disabled={editing} style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: '#191C6B', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', marginTop: 4,
              }}>
                {editing ? <>Saving...</> : <>Save Changes</>}
              </button>
          <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--border)'}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:8}}>Entry Requirements</label>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:10,background:'var(--bg)'}}>
                <span style={{fontSize:13}}>Minimum OgaPay Rank</span>
                <select value={editForm.minRank || ''} onChange={e => setEditForm(f => ({...f, minRank: e.target.value}))}
                  style={{border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',background:'var(--card)',color:'var(--text)',fontSize:12}}>
                  <option value="">None</option>
                  <option value="1">Rank 1+</option>
                  <option value="2">Rank 2+</option>
                  <option value="3">Rank 3+</option>
                  <option value="4">Rank 4+</option>
                  <option value="5">Rank 5+</option>
                </select>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:10,background:'var(--bg)'}}>
                <span style={{fontSize:13}}>Minimum Tasks Completed</span>
                <select value={editForm.minTasks || ''} onChange={e => setEditForm(f => ({...f, minTasks: e.target.value}))}
                  style={{border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',background:'var(--card)',color:'var(--text)',fontSize:12}}>
                  <option value="">None</option>
                  <option value="5">5+ tasks</option>
                  <option value="10">10+ tasks</option>
                  <option value="25">25+ tasks</option>
                  <option value="50">50+ tasks</option>
                </select>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:10,background:'var(--bg)'}}>
                <span style={{fontSize:13}}>KYC Verified required</span>
                <input type="checkbox" checked={editForm.requireKyc || false} onChange={e => setEditForm(f => ({...f, requireKyc: e.target.checked}))}
                  style={{width:18,height:18,cursor:'pointer'}} />
              </div>
            </div>
          </div>          {isOwner && (
            <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--border)'}}>
              <label style={{fontSize:12,fontWeight:700,color:'var(--text2)',display:'block',marginBottom:6}}>
                Invite Code
              </label>
              <div style={{display:'flex',gap:8}}>
                <input readOnly value={community.inviteCode || 'No code generated'}
                  style={{flex:1,padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:9,background:'var(--bg2)',color:'var(--text)',fontSize:13,fontFamily:'monospace'}} />
                <button onClick={handleCopyInviteCode} style={{height:38,padding:'0 14px',borderRadius:9,border:'1px solid var(--border)',background:'var(--bg)',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  Copy
                </button>
                <button onClick={handleGenerateInviteCode} style={{height:38,padding:'0 14px',borderRadius:9,background:'#191C6B',color:'#fff',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                  Generate
                </button>
              </div>
              <p style={{fontSize:11,color:'var(--text3)',marginTop:6}}>Share this code with people you want to let in instantly without approval.</p>
            </div>
          )}
            </form>
          </div>
        </div>
      )}
      {toast && (
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#191C6B',color:'#fff',padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:'0 4px 20px rgba(0,0,0,0.3)',transition:'opacity .3s'}}>
          {toast}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Layout>
  )
}
