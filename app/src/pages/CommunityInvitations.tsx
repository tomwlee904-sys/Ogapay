import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import CommunityTabs from '../components/community/CommunityTabs'
import { accentTile } from '../components/community/colors'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'
import { sized } from '../lib/img'
import '../styles/profile-public.css'
import '../styles/community.css'
import '../styles/community-join.css'

// Your invitations (/communities/invitations): the third tab of the Communities
// hub. Invites from community leaders, to accept or decline.

type Invite = {
  id: string; message: string | null; createdAt: string; expiresAt: string
  community: { id: string; name: string; slug: string; coverImage: string | null; accentColor: string | null }
  inviter: { username: string; avatarUrl: string | null } | null
}

const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

export default function CommunityInvitations() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [list, setList] = useState<Invite[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState('')

  // A failed load shows Try again, never "No invitations"
  const load = () => { setFailed(false); return apiRequest<Invite[]>('/communities/invites/mine').then((d) => setList(d || [])).catch(() => setFailed(true)) }
  useEffect(() => { load() }, [])

  const answer = async (inv: Invite, action: 'accept' | 'decline') => {
    if (busy) return
    setBusy(inv.id)
    try {
      await apiRequest('/communities/invites/' + inv.id, { method: 'PATCH', body: JSON.stringify({ action }) })
      if (action === 'accept') { toast(`You joined ${inv.community.name}`, 'success'); navigate(`/communities/${inv.community.slug}`); return }
      setList((l) => (l || []).filter((x) => x.id !== inv.id))
      toast('Invitation declined', 'success')
    } catch (e: any) { toast(e?.message || 'Something went wrong', 'error'); load() }
    setBusy('')
  }

  return (
    <Layout>
      <div className="ui-page">
        <header className="ui-head">
          <div>
            <h1 className="ui-title" style={{ marginTop: 0 }}>Invitations</h1>
            <p className="ui-sub">Invites from community leaders sent to your account.</p>
          </div>
        </header>
        <div className="cj-tabs"><CommunityTabs active="invites" inviteCount={list ? list.length : 0} /></div>

        <div className="ui-narrow">
          {list === null ? (
            failed ? <LoadError what="your invitations" onRetry={load} /> : <div className="ui-sk" style={{ height: 120 }} />
          ) : list.length === 0 ? (
            <div className="ui-empty">
              <strong>No invitations right now</strong>
              Leaders can invite you by your username. Have an invite code? Open the community and use it there.
              <div style={{ marginTop: 14 }}><Link className="ui-btn ui-btn-ghost" to="/communities">Browse communities</Link></div>
            </div>
          ) : (
            <section className="up-card cj-card cj-invites">
              {list.map((inv) => (
                <div key={inv.id} className="cj-invite">
                  <span className="cj-mini" style={accentTile(inv.community.accentColor)}>
                    {inv.community.coverImage ? <img src={sized(inv.community.coverImage, 80, true)} alt="" /> : initials(inv.community.name)}
                  </span>
                  <div className="cj-invite-t">
                    <Link to={`/communities/${inv.community.slug}`}><strong>{inv.community.name}</strong></Link>
                    <small>From @{inv.inviter?.username || 'a leader'} · expires {new Date(inv.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small>
                    {inv.message && <p>{inv.message}</p>}
                  </div>
                  <div className="cj-invite-a">
                    <button className="ui-btn ui-btn-ghost" onClick={() => answer(inv, 'decline')} disabled={!!busy}>Decline</button>
                    <button className="ui-btn ui-btn-dark" onClick={() => answer(inv, 'accept')} disabled={!!busy}>Accept</button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </Layout>
  )
}
