import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useToast } from '../components/Toast'
import { sized } from '../lib/img'
import '../styles/profile-public.css'
import '../styles/community.css'
import '../styles/community-join.css'

// Your invitations (/communities/invitations): community invites sent to this
// account, to accept or decline.

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
  const [busy, setBusy] = useState('')

  const load = () => apiRequest<Invite[]>('/communities/invites/mine').then((d) => setList(d || [])).catch(() => setList([]))
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
      <div className="up-wrap cj-wrap">
        <div className="up-crumb"><button onClick={() => navigate('/communities')}><i className="ti ti-arrow-left" /> Communities</button></div>
        <header className="cj-head">
          <span className="cj-kicker">Communities</span>
          <h1 className="cj-title">Your invitations</h1>
          <p className="cj-lead">Invites from community leaders sent to your account.</p>
        </header>
        {list === null ? <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div> : list.length === 0 ? (
          <div className="up-empty"><i className="ti ti-mail" />No invitations right now.<div style={{ marginTop: 12 }}><Link className="up-btn" to="/communities">Browse communities</Link></div></div>
        ) : (
          <section className="up-card cj-card cj-invites">
            {list.map((inv) => (
              <div key={inv.id} className="cj-invite">
                <span className="cj-mini" style={{ background: inv.community.accentColor || '#52525b' }}>
                  {inv.community.coverImage ? <img src={sized(inv.community.coverImage, 80, true)} alt="" /> : initials(inv.community.name)}
                </span>
                <div className="cj-invite-t">
                  <Link to={`/communities/${inv.community.slug}`}><strong>{inv.community.name}</strong></Link>
                  <small>From @{inv.inviter?.username || 'a leader'} · expires {new Date(inv.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small>
                  {inv.message && <p>{inv.message}</p>}
                </div>
                <div className="cj-invite-a">
                  <button className="up-btn" onClick={() => answer(inv, 'decline')} disabled={!!busy}>Decline</button>
                  <button className="up-btn primary" onClick={() => answer(inv, 'accept')} disabled={!!busy}>Accept</button>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </Layout>
  )
}
