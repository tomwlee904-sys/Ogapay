import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../lib/api'
import '../../styles/profile-own.css'
import '../../styles/profile-public.css'

// Your communities, plus any invites waiting for an answer
export default function ProfileCommunitiesCard() {
  const [list, setList] = useState<any[] | null>(null)
  const [invites, setInvites] = useState<any[]>([])
  const [busy, setBusy] = useState('')

  const load = () => {
    apiRequest<any[]>('/communities/mine/list').then((d) => setList(Array.isArray(d) ? d : [])).catch(() => setList([]))
    apiRequest<any[]>('/communities/invites/mine').then((d) => setInvites(Array.isArray(d) ? d : [])).catch(() => setInvites([]))
  }
  useEffect(load, [])

  const answer = async (id: string, action: 'accept' | 'decline') => {
    setBusy(id)
    try {
      await apiRequest('/communities/invites/' + id, { method: 'PATCH', body: JSON.stringify({ action }) })
      load()
    } catch { /* stays listed */ }
    setBusy('')
  }

  return (
    <section className="po-card">
      <div className="po-head">
        <h3><i className="ti ti-users" /> Communities</h3>
        {list && list.length > 0 && <Link to="/communities/mine">See all</Link>}
      </div>
      <div className="po-body">
        {invites.map((i) => (
          <div className="po-invite" key={i.id}>
            <i className="ti ti-users-plus" />
            <span><b>@{i.inviter?.username}</b> invited you to <Link to={`/communities/${i.community?.id}`} style={{ color: 'inherit', fontWeight: 700 }}>{i.community?.name}</Link></span>
            <button className="po-btn" disabled={busy === i.id} onClick={() => answer(i.id, 'decline')}>Decline</button>
            <button className="po-btn primary" disabled={busy === i.id} onClick={() => answer(i.id, 'accept')}>Accept</button>
          </div>
        ))}
        {list === null ? (
          <div className="up-skel" style={{ height: 60, borderRadius: 10, background: 'var(--bg2)' }} />
        ) : list.length === 0 ? (
          <div className="po-empty">
            <div className="ic"><i className="ti ti-user-plus" /></div>
            <b>You are not in a community</b>
            <p>Discover communities that match your interests and join the conversation.</p>
            <Link className="po-btn" to="/communities">Discover communities</Link>
          </div>
        ) : (
          list.slice(0, 5).map((c) => (
            <Link className="po-row" to={`/communities/${c.communityId}`} key={c.communityId}>
              <span className="ic" style={{ background: c.accentColor || 'var(--text)' }}>{c.iconUrl ? <img src={c.iconUrl} alt="" /> : c.name.slice(0, 2).toUpperCase()}</span>
              <span className="mid"><b>{c.name}</b><small>{c.memberCount} members</small></span>
              {c.role !== 'MEMBER' && <span className="po-tag">{c.role}</span>}
            </Link>
          ))
        )}
      </div>
    </section>
  )
}
