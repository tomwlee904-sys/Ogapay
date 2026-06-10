import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
  const isOwner = authUser && community?.owner && authUser.id === community.owner.id

  // Chat
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [chatLoaded, setChatLoaded] = useState(false)

  const token = localStorage.getItem('ogapay_access_token')
  const authHeaders = token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : {}

  const handleCoverUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file || !community) return
    setUploadingCover(true)
    try {
      const url = await uploadImage(file, 'community-covers')
      const res = await fetch(`${API_BASE}/communities/${community.id}/cover`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: (() => { const fd = new FormData(); fd.append('cover', file); return fd })(),
      })
      if (res.ok) {
        const json = await res.json()
        setCommunity((prev: any) => ({ ...prev, coverImage: json.data?.coverImage || json.coverImage }))
      }
    } catch {}
    setUploadingCover(false)
  }

  useEffect(() => {
    async function fetchCommunity() {
      try {
        const res = await fetch(API_BASE + '/communities/' + id, { headers: authHeaders })
        const json = await res.json()
        if (json.success && json.data) {
          setCommunity(json.data)
          setIsMember(!!json.data.userRole)
          setHasRequested(!!json.data.hasRequested)
        }
      } catch {}
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
    setJoining(true)
    try {
      const res = await fetch(API_BASE + '/communities/' + id + '/join', {
        method: 'POST', headers: authHeaders,
      })
      const json = await res.json()
      if (json.success) {
        if (community?.isPublic) {
          setIsMember(true)
          setCommunity((prev: any) => ({ ...prev, memberCount: (prev?.memberCount || 0) + 1 }))
        } else {
          setHasRequested(true)
        }
      }
    } catch {}
    setJoining(false)
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
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
          <i className="ti ti-users" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: 'var(--text3)' }} />
          Community not found
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

      <div className="cd-page">
        <button className="cd-back" onClick={() => navigate('/communities')}>
          <i className="ti ti-arrow-left" /> Communities
        </button>

        {/* Header */}
        <div className="cd-header">
          <div className="cd-h-top">
            <div className="cd-h-left">
              <div className="cd-avatar" style={{ background: community.accentColor || '#191C6B', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800, color: '#fff' }}>
                {community.name?.slice(0, 2)?.toUpperCase()}
              </div>
              <div>
                <h1 className="cd-h-name">{community.name}</h1>
                <div className="cd-h-socials">
                  {community.twitter && (
                    <a href={community.twitter} target="_blank" rel="noopener noreferrer" title="Twitter/X"><i className="ti ti-brand-x" /></a>
                  )}
                  {community.telegram && (
                    <a href={community.telegram} target="_blank" rel="noopener noreferrer" title="Telegram"><i className="ti ti-send" /></a>
                  )}
                  {community.discord && (
                    <a href={community.discord} target="_blank" rel="noopener noreferrer" title="Discord"><i className="ti ti-brand-discord" /></a>
                  )}
                </div>
              </div>
            </div>
            <button className="cd-share" onClick={() => { navigator.clipboard?.writeText(window.location.href) }}>
              <i className="ti ti-share" /> Share
            </button>
          </div>

          <div className="cd-stats">
            <div><div className="cd-stat-num">{community.memberCount?.toLocaleString()}</div><div className="cd-stat-label">Members</div></div>
            <div><div className="cd-stat-num">{community.challengeCount || 0}</div><div className="cd-stat-label">Challenges</div></div>
            <div><div className="cd-stat-num">NGN {(community.totalDistributed || 0).toLocaleString()}</div><div className="cd-stat-label">Distributed</div></div>
          </div>

          {!isMember ? (
            <button className="cd-join" onClick={handleRequestJoin} disabled={joining || hasRequested}>
              <i className="ti ti-user-plus" />
              {hasRequested ? 'Request Sent' : joining ? 'Joining...' : community.isPublic ? 'Join Community' : 'Request to Join'}
            </button>
          ) : (
            <span className="cd-member-badge"><i className="ti ti-check" /> You are a member</span>
          )}
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
                  <img src={community.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                {leaderboard.map((m: any) => (
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
                {openJobs.map((job: any) => (
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
                {completedJobs.map((job: any) => (
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

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Layout>
  )
}
