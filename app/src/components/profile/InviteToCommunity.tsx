import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import '../../styles/profile-public.css'

type Mine = { communityId: string; name: string; role: string; isPublic?: boolean; memberCount: number; accentColor?: string | null; iconUrl?: string | null }

const LEADER = ['OWNER', 'ADMIN', 'MODERATOR']

// Invite a user to one of your communities (leaders: any; members: public ones)
export default function InviteToCommunity({ username, name, onClose }: { username: string; name: string; onClose: () => void }) {
  const [list, setList] = useState<Mine[] | null>(null)
  const [pick, setPick] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    apiRequest<Mine[]>('/communities/mine/list')
      .then((d) => {
        const can = (Array.isArray(d) ? d : []).filter((c) => LEADER.includes(c.role) || c.isPublic !== false)
        setList(can)
        if (can.length === 1) setPick(can[0].communityId)
      })
      .catch(() => setList([]))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sending) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, sending])

  const send = async () => {
    if (!pick || sending) return
    setSending(true); setResult(null)
    try {
      const res = await apiRequest<any>(`/communities/${pick}/invite`, { method: 'POST', body: JSON.stringify({ username }) })
      const c = list?.find((x) => x.communityId === pick)
      setResult({ ok: true, text: res?.alreadyInvited ? `${name} already has an invite to ${c?.name}.` : `Invite sent. ${name} will get a notification.` })
    } catch (e: any) {
      setResult({ ok: false, text: /already a member/i.test(e?.message || '') ? `${name} is already a member.` : e?.message || 'Could not send the invite.' })
    }
    setSending(false)
  }

  return (
    <div className="up-modal" onClick={() => { if (!sending) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="inv-h" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 id="inv-h">Invite to community</h3>
          <button className="x" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 16px' }}>Invite {name} to one of your communities.</p>

        {list === null ? (
          <div className="up-skel" style={{ height: 60 }} />
        ) : list.length === 0 ? (
          <div className="up-empty" style={{ padding: 24 }}>
            <i className="ti ti-users" />
            You're not in a community you can invite people to yet.
            <div style={{ marginTop: 12 }}><Link className="up-btn" to="/communities" onClick={onClose}>Discover communities</Link></div>
          </div>
        ) : (
          <>
            {list.map((c) => (
              <button key={c.communityId} className={`up-pick ${pick === c.communityId ? 'on' : ''}`} onClick={() => { setPick(c.communityId); setResult(null) }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: c.accentColor || 'var(--text)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, overflow: 'hidden', flexShrink: 0 }}>
                  {c.iconUrl ? <img src={c.iconUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.name.slice(0, 2).toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block', fontSize: 14 }}>{c.name}</b>
                  <small style={{ fontSize: 12, color: 'var(--text3)' }}>{c.memberCount} members{c.isPublic === false ? ' · private' : ''}</small>
                </span>
                <i className={`ti ${pick === c.communityId ? 'ti-circle-check' : 'ti-circle'}`} style={{ fontSize: 18, color: pick === c.communityId ? 'var(--text)' : 'var(--border2)' }} />
              </button>
            ))}
            {result && <div className={`up-note ${result.ok ? 'ok' : 'err'}`} role="status">{result.text}</div>}
            <button className="up-btn primary" style={{ width: '100%', marginTop: 16, height: 44 }} disabled={!pick || sending} onClick={result?.ok ? onClose : send}>
              {sending ? 'Sending…' : result?.ok ? 'Done' : 'Send invite'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
