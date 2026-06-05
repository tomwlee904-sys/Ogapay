import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

export default function CommunityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [community, setCommunity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function fetchCommunity() {
      try {
        const res = await fetch(API_BASE + '/communities/' + id)
        const json = await res.json()
        if (json.success && json.data) setCommunity(json.data)
      } catch {}
      setLoading(false)
    }
    fetchCommunity()
  }, [id])

  const handleJoin = async () => {
    const token = localStorage.getItem('ogapay_access_token')
    if (!token) { navigate('/login'); return }
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
        .cd-name{font-family:Outfit;font-size:22px;font-weight:900;margin:0}
        .cd-meta{display:flex;gap:20px;padding:16px 24px;background:var(--card);border:1px solid var(--border);border-radius:12px;margin-bottom:20px;flex-wrap:wrap}
        .cd-meta-item{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text2)}
        .cd-meta-item strong{color:var(--text);font-weight:800}
        .cd-body{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px 24px}
        .cd-body h3{font-family:Outfit;font-size:15px;font-weight:800;margin:0 0 8px}
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
            <div className="cd-hero-bg" style={{ background: `linear-gradient(135deg,${community.accentColor || '#1F8CFF'},${community.accentColor || '#1F8CFF'}88)` }} />
            <div className="cd-hero-info">
              <div className="cd-avatar" style={{ background: community.accentColor || '#1F8CFF' }}>{community.initials || community.name?.slice(0, 2)?.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <h1 className="cd-name">{community.name}</h1>
              </div>
            </div>
          </div>

          <div className="cd-meta">
            <div className="cd-meta-item"><i className="ti ti-users" /> <strong>{community.memberCount?.toLocaleString()}</strong> members</div>
            <div className="cd-meta-item"><i className="ti ti-checklist" /> <strong>{community.taskCount || 0}</strong> tasks</div>
            <div className="cd-meta-item"><i className="ti ti-coin" /> <strong>NGN {(community.weeklyRewards || 0).toLocaleString()}</strong>/week rewards</div>
            <button
              onClick={handleJoin}
              disabled={joining || joined}
              style={{
                marginLeft: 'auto', height: 36, padding: '0 20px', borderRadius: 8, border: joined ? '1px solid var(--border)' : 'none',
                background: joined ? 'rgba(22,163,74,.1)' : '#1F8CFF', color: joined ? '#16a34a' : '#fff',
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
