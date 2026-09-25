import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE, apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'

export default function CommunityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [community, setCommunity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const [invite, setInvite] = useState<any>(null)
  const [answering, setAnswering] = useState(false)

  useEffect(() => {
    async function fetchCommunity() {
      try {
        // Signed in: the response includes userRole, so we know if we're a member
        const data = await apiRequest<any>('/communities/' + id, { auth: !!getAccessToken() })
        if (data) {
          setCommunity(data)
          setJoined(!!data.userRole)
        }
      } catch {}
      setLoading(false)
    }
    fetchCommunity()
  }, [id])

  // A pending invite to this community (from someone's profile)
  useEffect(() => {
    if (!getAccessToken()) return
    apiRequest<any[]>('/communities/invites/mine')
      .then((list) => setInvite((Array.isArray(list) ? list : []).find((i) => i.community?.id === id) || null))
      .catch(() => {})
  }, [id])

  const answerInvite = async (action: 'accept' | 'decline') => {
    if (!invite || answering) return
    setAnswering(true)
    try {
      await apiRequest('/communities/invites/' + invite.id, { method: 'PATCH', body: JSON.stringify({ action }) })
      if (action === 'accept') setJoined(true)
      setInvite(null)
    } catch {}
    setAnswering(false)
  }

  const handleJoin = async () => {
    const token = getAccessToken()
    if (!token) { openSignIn({ redirect: '/communities/' + id }); return }
    setJoining(true)
    try {
      const res = await fetch(API_BASE + '/communities/' + id + '/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      })
      const json = await res.json()
      if (json.success) setJoined(true)
    } catch {}
    setJoining(false)
  }

  return (
    <Layout>
      <style>{`
        .cd-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:20px;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;padding:0}
        .cd-back:hover{color:var(--text)}
        .cd-hero{border-radius:16px;overflow:hidden;margin-bottom:20px;position:relative}
        .cd-hero-bg{height:160px}
        .cd-hero-info{padding:0 24px 24px;display:flex;align-items:flex-end;gap:16px;margin-top:-32px}
        .cd-avatar{width:64px;height:64px;border-radius:50%;border:3px solid var(--card);display:grid;place-items:center;font-size:22px;font-weight:800;color:#fff;flex-shrink:0}
        .cd-name{font-family:Geist;font-size:22px;font-weight:900;margin:0}
        .cd-meta{display:flex;gap:20px;padding:16px 24px;background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:20px;flex-wrap:wrap}
        .cd-meta-item{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2)}
        .cd-meta-item strong{color:var(--text);font-weight:800}
        .cd-body{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px 24px}
        .cd-body h3{font-family:Geist;font-size:15px;font-weight:800;margin:0 0 8px}
        .cd-body p{color:var(--text2);font-size:13px;line-height:1.6;margin:0}
      `}</style>

      <button className="cd-back" onClick={() => navigate('/communities')}>
        <i className="ti ti-arrow-left" /> Back to Communities
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24, display: 'block', marginBottom: 8 }} />
          Loading...
        </div>
      ) : !community ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
          <i className="ti ti-users" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: 'var(--text3)' }} />
          Community not found
        </div>
      ) : (
        <>
          <div className="cd-hero">
            <div className="cd-hero-bg" style={{ background: `linear-gradient(135deg,${community.accentColor || 'var(--accent)'},${community.accentColor || 'var(--accent)'}88)` }} />
            <div className="cd-hero-info">
              <div className="cd-avatar" style={{ background: community.accentColor || 'var(--accent)' }}>{community.initials || community.name?.slice(0, 2)?.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <h1 className="cd-name">{community.name}</h1>
              </div>
            </div>
          </div>

          {invite && !joined && (
            <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 18px', marginBottom: 16, background: 'var(--card)', border: '1px solid var(--text)', borderRadius: 12 }}>
              <i className="ti ti-users-plus" style={{ fontSize: 20 }} />
              <div style={{ flex: 1, minWidth: 200, fontSize: 13 }}>
                <b>@{invite.inviter?.username || 'Someone'}</b> invited you to join <b>{community.name}</b>.
                {invite.message && <div style={{ color: 'var(--text2)', marginTop: 2 }}>{invite.message}</div>}
              </div>
              <button onClick={() => answerInvite('decline')} disabled={answering} style={{ height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Decline</button>
              <button onClick={() => answerInvite('accept')} disabled={answering} style={{ height: 34, padding: '0 16px', borderRadius: 8, border: 0, background: 'var(--text)', color: 'var(--bg)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{answering ? '…' : 'Accept'}</button>
            </div>
          )}

          <div className="cd-meta">
            <div className="cd-meta-item"><i className="ti ti-users" /> <strong>{community.memberCount?.toLocaleString()}</strong> members</div>
            <div className="cd-meta-item"><i className="ti ti-checklist" /> <strong>{community.taskCount || 0}</strong> tasks</div>
            <div className="cd-meta-item"><i className="ti ti-coin" /> <strong>NGN {(community.weeklyRewards || 0).toLocaleString()}</strong>/week rewards</div>
            <button
              onClick={handleJoin}
              disabled={joining || joined}
              style={{
                marginLeft: 'auto', height: 36, padding: '0 20px', borderRadius: 8, border: joined ? '1px solid var(--border)' : 'none',
                background: joined ? 'rgba(22,163,74,.1)' : 'var(--accent)', color: joined ? '#16a34a' : '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <i className={`ti ${joined ? 'ti-check' : 'ti-users'}`} />
              {joined ? 'Joined' : joining ? 'Joining...' : 'Join Community'}
            </button>
          </div>

          <div className="cd-body">
            <h3>About this Community</h3>
            <p>{community.description || 'No description available.'}</p>
          </div>

          <div style={{ marginTop: 20, padding: '20px 24px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            <i className="ti ti-messages" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
            Community feed coming soon. Join to participate in discussions and tasks.
          </div>
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Layout>
  )
}
