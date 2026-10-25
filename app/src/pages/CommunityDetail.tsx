import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, getAccessToken, getStoredUser } from '../lib/api'
import { openSignIn } from '../lib/signin'
import { uploadImage } from '../lib/upload'
import { useToast } from '../components/Toast'
import '../styles/profile-public.css'
import '../styles/community.css'
import '../styles/community-join.css'
import { sized } from '../lib/img'

// Community page, ported from the June version (leaderboard, open and completed
// jobs, members-only chat, owner settings) onto the current design. Joining a
// private community, or one with an entry task or requirements, goes through
// the join page (/communities/:id/request: request with message and files, or
// an invite code). Leaders set the entry task, requirements and invite codes here.

type Member = { id: string; role: string; user: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null } }
type Community = {
  id: string; slug: string; name: string; description: string | null; iconUrl: string | null; coverImage: string | null
  accentColor: string | null; category: string | null; isPublic: boolean; owner: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null }
  twitter: string; telegram: string; discord: string; memberCount: number; requestCount: number; recentMembers: Member[]
  userRole: string | null; hasRequested: boolean; hasEntryTask?: boolean; hasJoinRequirements?: boolean; openJobCount: number; completedJobCount: number; createdAt: string
}
type Ranked = { rank: number; id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null; role: string; level: string; tasksCompleted: number; totalEarned: number | null }
type Job = { id: string; title: string; reward: number; currency: string; submissionCount?: number; createdAt?: string; completedAt?: string; deadline?: string | null; workers?: { id: string; username: string }[]; membersOnly?: boolean; isContest?: boolean }
type Msg = { id: string; text: string; createdAt: string; sender: { id: string; username: string; firstName: string; avatarUrl: string | null } }
type Req = {
  id: string; message: string | null; attachments: string[]; createdAt: string
  user: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null; rank: number; rankName: string; verificationLevel: number; xConnected: boolean; jobsDone: number }
}
type JoinSettings = { entryTaskTitle: string; entryTaskSteps: string; minRank: number; requiresKyc: boolean; requiresX: boolean; minJobsDone: number }
type Code = { id: string; code: string; maxUses: number | null; uses: number; expiresAt: string | null; revokedAt: string | null; active: boolean }
const RANKS = ['Anyone', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Legend']
const fileName = (u: string) => { try { return decodeURIComponent(new URL(u).pathname.split('/').pop() || 'file').replace(/^\d+-/, '') } catch { return 'file' } }

const TABS = ['About', 'Leaderboard', 'Open jobs', 'Completed', 'Chat'] as const
type Tab = (typeof TABS)[number]
const money = (n: number, c = 'NGN') => (c === 'NGN' ? '₦' + Math.round(n).toLocaleString('en-US') : `${n.toLocaleString('en-US')} ${c}`)
const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
const fullName = (u: { firstName?: string; lastName?: string; username?: string }) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Member'
const safeLink = (u?: string) => (u && /^https:\/\//i.test(u) ? u : '')
const roleLabel = (r: string) => (r === 'OWNER' ? 'Owner' : r === 'ADMIN' ? 'Admin' : r === 'MODERATOR' ? 'Moderator' : '')
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Face({ url, name, size = 34 }: { url: string | null; name: string; size?: number }) {
  return <span className="cm2-face" style={{ width: size, height: size, fontSize: size * 0.36 }}>{url ? <img src={sized(url, size, true)} alt="" loading="lazy" /> : initials(name)}</span>
}

export default function CommunityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const signedIn = !!getAccessToken()
  const me = getStoredUser()

  const [c, setC] = useState<Community | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('About')
  const [busy, setBusy] = useState(false)
  const [invite, setInvite] = useState<any>(null)

  // Name the community in the browser tab
  useEffect(() => { if (c?.name) document.title = `${c.name} | OgaPay Communities` }, [c?.name])

  const role = c?.userRole || null
  const isMember = !!role
  const isLeader = role === 'OWNER' || role === 'ADMIN'
  const canModerate = isLeader || role === 'MODERATOR'

  const load = () => apiRequest<Community>('/communities/' + id, { auth: signedIn })
    .then((d) => setC(d))
    .catch(() => setC(null))
    .finally(() => setLoading(false))
  useEffect(() => { setLoading(true); load() }, [id])

  // A pending invite to this community
  useEffect(() => {
    if (!signedIn || !c) return
    apiRequest<any[]>('/communities/invites/mine')
      .then((list) => setInvite((list || []).find((i) => i.community?.id === c.id) || null))
      .catch(() => {})
  }, [signedIn, c?.id])

  const answerInvite = async (action: 'accept' | 'decline') => {
    if (!invite || busy) return
    setBusy(true)
    try {
      await apiRequest('/communities/invites/' + invite.id, { method: 'PATCH', body: JSON.stringify({ action }) })
      setInvite(null)
      if (action === 'accept') { toast('You joined ' + c!.name, 'success'); load() }
    } catch (e: any) { toast(e?.message || 'Something went wrong', 'error') }
    setBusy(false)
  }

  // Private communities, and ones with an entry task or requirements, use the join page
  const viaJoinPage = !!c && (!c.isPublic || !!c.hasEntryTask || !!c.hasJoinRequirements)
  const join = async () => {
    if (viaJoinPage) { navigate(`/communities/${c!.slug}/request`); return }
    if (!signedIn) { openSignIn({ redirect: '/communities/' + id }); return }
    setBusy(true)
    try {
      await apiRequest(`/communities/${c!.id}/join`, { method: 'POST' })
      toast('You joined ' + c!.name, 'success')
      load()
    } catch (e: any) { toast(e?.message || "Couldn't join", 'error') }
    setBusy(false)
  }

  const leave = async () => {
    if (!window.confirm(`Leave ${c!.name}?`)) return
    setBusy(true)
    try {
      await apiRequest(`/communities/${c!.id}/leave`, { method: 'POST' })
      toast('You left ' + c!.name, 'success')
      setTab('About')
      load()
    } catch (e: any) { toast(e?.message || "Couldn't leave", 'error') }
    setBusy(false)
  }

  const share = () => {
    navigator.clipboard?.writeText(window.location.origin + '/communities/' + (c?.slug || id))
      .then(() => toast('Link copied', 'success')).catch(() => {})
  }

  if (loading) return <Layout><div className="up-wrap"><div className="up-empty"><i className="ti ti-loader-2" />Loading…</div></div></Layout>
  if (!c) {
    return (
      <Layout>
        <div className="up-wrap">
          <div className="up-empty"><i className="ti ti-users" />This community doesn't exist or was deleted.<div style={{ marginTop: 12 }}><Link className="up-btn" to="/communities">Browse communities</Link></div></div>
        </div>
      </Layout>
    )
  }

  const accent = c.accentColor || '#52525b'
  const socials = [
    { url: safeLink(c.twitter), icon: 'ti-brand-x', label: 'X' },
    { url: safeLink(c.telegram), icon: 'ti-brand-telegram', label: 'Telegram' },
    { url: safeLink(c.discord), icon: 'ti-brand-discord', label: 'Discord' },
  ].filter((s) => s.url)
  const cat = c.category ? c.category.charAt(0).toUpperCase() + c.category.slice(1) : ''

  return (
    <Layout>
      <div className="up-wrap">
        <div className="up-crumb"><button onClick={() => navigate('/communities')}><i className="ti ti-arrow-left" /> Communities</button><span>{c.isPublic ? 'Public' : 'Private'}{cat ? ` · ${cat}` : ''}</span>{signedIn && <Link to="/communities/invitations" style={{ marginLeft: 'auto', color: 'var(--text2)' }}>Your invitations</Link>}</div>

        <section className="up-card cm2-head">
          <div className="cm2-cover" style={c.coverImage ? { backgroundImage: `url("${encodeURI(sized(c.coverImage, 1100))}")` } : { background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 35%, #0a0a0a))` }} />
          <div className="cm2-id">
            <span className="cm2-logo" style={{ background: accent }}>{c.iconUrl ? <img src={sized(c.iconUrl, 96, true)} alt="" /> : initials(c.name)}</span>
            <div className="cm2-title">
              <h1>{c.name}</h1>
              <div className="cm2-sub">
                by <Link to={`/user/${c.owner.username}`}>@{c.owner.username}</Link> · {c.memberCount.toLocaleString()} member{c.memberCount === 1 ? '' : 's'}
                {socials.map((s) => <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={s.label} className="cm2-social"><i className={`ti ${s.icon}`} /></a>)}
              </div>
            </div>
            <div className="cm2-cta">
              <button className="up-btn" onClick={share} aria-label="Copy link"><i className="ti ti-link" /></button>
              {isMember ? (
                role === 'OWNER' ? <span className="cm2-badge">You own this</span> : <button className="up-btn" onClick={leave} disabled={busy}>Leave</button>
              ) : c.hasRequested ? (
                <Link className="up-btn" to={`/communities/${c.slug}/request`}>Request sent</Link>
              ) : (
                <button className="up-btn primary" onClick={join} disabled={busy}><i className="ti ti-user-plus" /> {c.isPublic ? 'Join' : 'Request to join'}</button>
              )}
            </div>
          </div>
          <div className="up-stats cm2-stats">
            <div className="up-stat"><div className="l"><i className="ti ti-users" /> Members</div><div className="v">{c.memberCount.toLocaleString()}</div></div>
            <div className="up-stat"><div className="l"><i className="ti ti-briefcase" /> Open jobs</div><div className="v">{c.openJobCount.toLocaleString()}</div></div>
            <div className="up-stat"><div className="l"><i className="ti ti-circle-check" /> Completed</div><div className="v">{c.completedJobCount.toLocaleString()}</div></div>
          </div>
        </section>

        {invite && !isMember && (
          <div className="up-card cm2-invite" role="status">
            <i className="ti ti-users-plus" />
            <div><b>@{invite.inviter?.username || 'Someone'}</b> invited you to join <b>{c.name}</b>.{invite.message && <div className="cm2-muted">{invite.message}</div>}</div>
            <button className="up-btn" onClick={() => answerInvite('decline')} disabled={busy}>Decline</button>
            <button className="up-btn primary" onClick={() => answerInvite('accept')} disabled={busy}>Accept</button>
          </div>
        )}

        <div className="up-tabs-row">
          <div className="up-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={`up-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
                {t}{t === 'Open jobs' && <em>{c.openJobCount}</em>}{t === 'Chat' && !isMember && <i className="ti ti-lock" />}
              </button>
            ))}
          </div>
        </div>

        {tab === 'About' && <About c={c} isMember={isMember} isLeader={isLeader} canModerate={canModerate} role={role} onChange={load} />}
        {tab === 'Leaderboard' && <Leaderboard id={c.id} />}
        {tab === 'Open jobs' && (role === 'OWNER' || role === 'ADMIN') && (
          <div className="cm2-post">
            <span>Post a job only your members can take.</span>
            <Link className="ui-btn ui-btn-dark" to={`/create?type=custom&community=${c.id}`}><i className="ti ti-plus" /> Members-only job</Link>
          </div>
        )}
        {tab === 'Open jobs' && <Jobs id={c.id} kind="open" cat={cat} />}
        {tab === 'Completed' && <Jobs id={c.id} kind="completed" cat={cat} />}
        {tab === 'Chat' && (isMember
          ? <Chat id={c.id} meId={me?.id} />
          : <div className="up-empty"><i className="ti ti-lock" />Only members can read and post in the chat.{!c.hasRequested && <div style={{ marginTop: 12 }}><button className="up-btn primary" onClick={join} disabled={busy}>{c.isPublic ? 'Join to chat' : 'Request to join'}</button></div>}</div>)}
      </div>
    </Layout>
  )
}

function About({ c, isMember, isLeader, canModerate, role, onChange }: { c: Community; isMember: boolean; isLeader: boolean; canModerate: boolean; role: string | null; onChange: () => void }) {
  const { toast } = useToast()
  const [inviteName, setInviteName] = useState('')
  const [inviting, setInviting] = useState(false)
  const canInvite = isMember && (c.isPublic || canModerate)

  const sendInvite = async () => {
    const u = inviteName.trim().replace(/^@/, '')
    if (!u) return
    setInviting(true)
    try {
      const r = await apiRequest<any>(`/communities/${c.id}/invite`, { method: 'POST', body: JSON.stringify({ username: u }) })
      toast(r?.alreadyInvited ? `@${u} already has an invite` : `Invite sent to @${u}`, 'success')
      setInviteName('')
    } catch (e: any) { toast(e?.message || "Couldn't send the invite", 'error') }
    setInviting(false)
  }

  return (
    <div className="cm2-about">
      <section className="up-card up-about">
        <h2>About</h2>
        <p className="up-bio" style={{ marginTop: 0 }}>{c.description || 'No description yet.'}</p>
        <div className="cm2-muted" style={{ marginTop: 10 }}>Created {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </section>

      {c.recentMembers.length > 0 && (
        <section className="up-card up-about">
          <h2>Members</h2>
          <div className="cm2-members">
            {c.recentMembers.map((m) => (
              <Link key={m.id} to={`/user/${m.user.username}`} className="cm2-member" title={fullName(m.user)}>
                <Face url={m.user.avatarUrl} name={fullName(m.user)} size={40} />
                <span>{m.user.username}</span>
                {roleLabel(m.role) && <em>{roleLabel(m.role)}</em>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {canInvite && (
        <section className="up-card up-about">
          <h2>Invite someone</h2>
          <form className="cm2-inline" onSubmit={(e) => { e.preventDefault(); sendInvite() }}>
            <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="@username" aria-label="Username to invite" />
            <button className="up-btn primary" disabled={inviting || !inviteName.trim()}>{inviting ? 'Sending…' : 'Invite'}</button>
          </form>
        </section>
      )}

      {canModerate && (!c.isPublic || c.requestCount > 0) && <Requests id={c.id} onAccept={onChange} />}
      {isLeader && <JoinRules c={c} onSaved={onChange} />}
      {isLeader && <InviteCodes c={c} />}
      {isLeader && <Settings c={c} isOwner={role === 'OWNER'} onSaved={onChange} />}
    </div>
  )
}

function Requests({ id, onAccept }: { id: string; onAccept: () => void }) {
  const { toast } = useToast()
  const [list, setList] = useState<Req[] | null>(null)
  const load = () => apiRequest<Req[]>(`/communities/${id}/requests`).then((d) => setList(d || [])).catch(() => setList([]))
  useEffect(() => { load() }, [id])
  const answer = async (r: Req, action: 'accept' | 'decline') => {
    try {
      await apiRequest(`/communities/${id}/requests/${r.id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
      setList((l) => (l || []).filter((x) => x.id !== r.id))
      if (action === 'accept') { toast(`@${r.user.username} joined`, 'success'); onAccept() } else toast('Request declined', 'success')
    } catch (e: any) { toast(e?.message || 'Something went wrong', 'error'); load() }
  }
  return (
    <section className="up-card up-about">
      <h2>Join requests{list && list.length > 0 ? ` (${list.length})` : ''}</h2>
      {list === null ? <p className="cm2-muted">Loading…</p> : list.length === 0 ? <p className="cm2-muted">No one is waiting.</p> : (
        <div className="cm2-list">
          {list.map((r) => (
            <div key={r.id} className="cm2-req">
              <Face url={r.user.avatarUrl} name={fullName(r.user)} />
              <div className="cm2-req-t">
                <Link to={`/user/${r.user.username}`}><strong>{fullName(r.user)}</strong></Link> <span className="cm2-muted">@{r.user.username}</span>
                <div className="cj-req-meta">
                  <span>{r.user.rankName} rank</span>
                  <span>{r.user.verificationLevel > 0 ? `Level ${r.user.verificationLevel}` : 'Not verified'}</span>
                  <span>{r.user.jobsDone} job{r.user.jobsDone === 1 ? '' : 's'} done</span>
                  {r.user.xConnected && <span>X connected</span>}
                </div>
                {r.message && <p>{r.message}</p>}
                {r.attachments?.length > 0 && (
                  <div className="cj-req-files">
                    {r.attachments.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow"><i className="ti ti-paperclip" />{fileName(u)}</a>)}
                  </div>
                )}
              </div>
              <div className="cj-req-btns">
                <button className="up-btn" onClick={() => answer(r, 'decline')}>Decline</button>
                <button className="up-btn primary" onClick={() => answer(r, 'accept')}>Accept</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// Entry task and requirements, shown on the join page and checked on each request
function JoinRules({ c, onSaved }: { c: Community; onSaved: () => void }) {
  const { toast } = useToast()
  const [f, setF] = useState<JoinSettings | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    apiRequest<{ settings: JoinSettings }>(`/communities/${c.id}/join-info`).then((d) => setF(d.settings)).catch(() => setF(null))
  }, [c.id])
  if (!f) return null
  const save = async () => {
    setSaving(true)
    try {
      await apiRequest(`/communities/${c.id}/join-settings`, { method: 'PATCH', body: JSON.stringify(f) })
      toast('Join rules saved', 'success')
      onSaved()
    } catch (e: any) { toast(e?.message || "Couldn't save", 'error') }
    setSaving(false)
  }
  return (
    <section className="up-card up-about cj-rules">
      <h2>Join rules</h2>
      <p className="cm2-muted" style={{ marginTop: 0 }}>Shown on your join page. Requirements are checked when someone asks to join{c.isPublic ? ' or joins' : ''}.</p>
      <label className="cm2-f"><span>Entry task title</span><input value={f.entryTaskTitle} maxLength={120} onChange={(e) => setF({ ...f, entryTaskTitle: e.target.value })} placeholder="e.g. Follow us on X" /></label>
      <label className="cm2-f"><span>Entry task steps (links work)</span><textarea value={f.entryTaskSteps} maxLength={2000} rows={4} onChange={(e) => setF({ ...f, entryTaskSteps: e.target.value })} placeholder="What to do before asking to join" /></label>
      <div className="cj-row">
        <label className="cm2-f"><span>Minimum rank</span>
          <select className="cj-in" value={f.minRank} onChange={(e) => setF({ ...f, minRank: Number(e.target.value) })}>
            {RANKS.map((r, i) => <option key={r} value={i}>{i === 0 ? r : `${r} or higher`}</option>)}
          </select>
        </label>
        <label className="cm2-f"><span>Jobs done on OgaPay</span><input type="number" inputMode="numeric" min={0} max={1000} value={f.minJobsDone} onChange={(e) => setF({ ...f, minJobsDone: Math.max(0, Math.min(1000, Math.floor(Number(e.target.value) || 0))) })} /></label>
      </div>
      <div className="cj-checks">
        <label><input type="checkbox" checked={f.requiresKyc} onChange={(e) => setF({ ...f, requiresKyc: e.target.checked })} /> Level 1 verification (KYC)</label>
        <label><input type="checkbox" checked={f.requiresX} onChange={(e) => setF({ ...f, requiresX: e.target.checked })} /> A connected X account</label>
      </div>
      <div className="cm2-row-end">
        <Link className="up-btn" to={`/communities/${c.slug}/request`}>View join page</Link>
        <button className="up-btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save join rules'}</button>
      </div>
    </section>
  )
}

// Codes that join straight away (also private communities)
function InviteCodes({ c }: { c: Community }) {
  const { toast } = useToast()
  const [list, setList] = useState<Code[] | null>(null)
  const [maxUses, setMaxUses] = useState('')
  const [days, setDays] = useState('7')
  const [busy, setBusy] = useState(false)
  const load = () => apiRequest<Code[]>(`/communities/${c.id}/invite-codes`).then((d) => setList(d || [])).catch(() => setList([]))
  useEffect(() => { load() }, [c.id])
  const create = async () => {
    setBusy(true)
    try {
      const k = await apiRequest<Code>(`/communities/${c.id}/invite-codes`, { method: 'POST', body: JSON.stringify({ ...(maxUses && { maxUses: Number(maxUses) }), ...(days && { expiresInDays: Number(days) }) }) })
      setList((l) => [k, ...(l || [])])
      navigator.clipboard?.writeText(k.code).catch(() => {})
      toast(`Code ${k.code} created and copied`, 'success')
    } catch (e: any) { toast(e?.message || "Couldn't create a code", 'error') }
    setBusy(false)
  }
  const revoke = async (k: Code) => {
    if (!window.confirm(`Revoke ${k.code}? It will stop working.`)) return
    try {
      await apiRequest(`/communities/${c.id}/invite-codes/${k.id}`, { method: 'DELETE' })
      load()
    } catch (e: any) { toast(e?.message || "Couldn't revoke", 'error') }
  }
  const copy = (k: Code) => navigator.clipboard?.writeText(k.code).then(() => toast('Code copied', 'success')).catch(() => {})
  return (
    <section className="up-card up-about">
      <h2>Invite codes</h2>
      <p className="cm2-muted" style={{ marginTop: 0 }}>Anyone with a working code joins straight away, even a private community, without the requirements.</p>
      <div className="cj-newcode">
        <label className="cm2-f"><span>Max uses (blank = no limit)</span><input type="number" inputMode="numeric" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ''))} placeholder="No limit" /></label>
        <label className="cm2-f"><span>Expires</span>
          <select className="cj-in" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="1">In 1 day</option><option value="7">In 7 days</option><option value="30">In 30 days</option><option value="">Never</option>
          </select>
        </label>
        <button className="up-btn primary" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'New code'}</button>
      </div>
      {list && list.length > 0 && (
        <ul className="cj-codes">
          {list.map((k) => (
            <li key={k.id} className={k.active ? '' : 'off'}>
              <code>{k.code}</code>
              <small>{k.uses}{k.maxUses != null ? `/${k.maxUses}` : ''} used{k.revokedAt ? ' · revoked' : !k.active ? ' · ended' : k.expiresAt ? ` · until ${new Date(k.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}</small>
              {k.active && <button className="up-btn" onClick={() => copy(k)} aria-label={`Copy ${k.code}`}><i className="ti ti-copy" /></button>}
              {!k.revokedAt && <button className="up-btn" onClick={() => revoke(k)}>Revoke</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Settings({ c, isOwner, onSaved }: { c: Community; isOwner: boolean; onSaved: () => void }) {
  const { toast } = useToast()
  const [f, setF] = useState({ name: c.name, description: c.description || '', twitter: c.twitter || '', telegram: c.telegram || '', discord: c.discord || '', isPublic: c.isPublic })
  const [saving, setSaving] = useState(false)
  const [up, setUp] = useState<'' | 'cover' | 'avatar'>('')
  const set = (k: keyof typeof f) => (e: any) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      await apiRequest(`/communities/${c.id}`, { method: 'PATCH', body: JSON.stringify(f) })
      toast('Saved', 'success')
      onSaved()
    } catch (e: any) { toast(e?.message || "Couldn't save", 'error') }
    setSaving(false)
  }

  const image = async (kind: 'cover' | 'avatar', file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast('Images must be under 5MB', 'error'); return }
    setUp(kind)
    try {
      const url = await uploadImage(file, kind === 'cover' ? 'community-covers' : 'community-avatars')
      await apiRequest(`/communities/${c.id}/${kind}`, { method: 'POST', body: JSON.stringify(kind === 'cover' ? { coverUrl: url } : { avatarUrl: url }) })
      toast(kind === 'cover' ? 'Cover updated' : 'Picture updated', 'success')
      onSaved()
    } catch (e: any) { toast(e?.message || 'Upload failed', 'error') }
    setUp('')
  }

  return (
    <section className="up-card up-about cm2-settings">
      <h2>Settings</h2>
      <div className="cm2-imgs">
        <label className="up-btn"><i className="ti ti-photo" /> {up === 'cover' ? 'Uploading…' : 'Change cover'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden disabled={!!up} onChange={(e) => image('cover', e.target.files?.[0])} /></label>
        <label className="up-btn"><i className="ti ti-user-circle" /> {up === 'avatar' ? 'Uploading…' : 'Change picture'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden disabled={!!up} onChange={(e) => image('avatar', e.target.files?.[0])} /></label>
      </div>
      <label className="cm2-f"><span>Name</span><input value={f.name} onChange={set('name')} maxLength={60} /></label>
      <label className="cm2-f"><span>Description</span><textarea value={f.description} onChange={set('description')} maxLength={1000} rows={4} /></label>
      <div className="cm2-grid3">
        <label className="cm2-f"><span>X</span><input value={f.twitter} onChange={set('twitter')} placeholder="@handle or https://x.com/…" /></label>
        <label className="cm2-f"><span>Telegram</span><input value={f.telegram} onChange={set('telegram')} placeholder="@group or https://t.me/…" /></label>
        <label className="cm2-f"><span>Discord</span><input value={f.discord} onChange={set('discord')} placeholder="https://discord.gg/…" /></label>
      </div>
      {isOwner && (
        <label className="cm2-check"><input type="checkbox" checked={f.isPublic} onChange={set('isPublic')} /> Public: anyone can join. Turn off to review join requests.</label>
      )}
      <div className="cm2-row-end"><button className="up-btn primary" onClick={save} disabled={saving || f.name.trim().length < 2}>{saving ? 'Saving…' : 'Save changes'}</button></div>
    </section>
  )
}

function Leaderboard({ id }: { id: string }) {
  const [page, setPage] = useState(1)
  const [d, setD] = useState<{ members: Ranked[]; totalPages: number } | null>(null)
  useEffect(() => {
    setD(null)
    apiRequest<any>(`/communities/${id}/leaderboard?page=${page}`, { auth: !!getAccessToken() }).then((x) => setD({ members: x?.members || [], totalPages: x?.totalPages || 1 })).catch(() => setD({ members: [], totalPages: 1 }))
  }, [id, page])
  if (!d) return <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
  if (d.members.length === 0) return <div className="up-empty"><i className="ti ti-trophy" />No members yet.</div>
  return (
    <>
      <section className="up-card cm2-list">
        {d.members.map((m) => (
          <Link key={m.id} to={`/user/${m.username}`} className="cm2-lb">
            <span className="cm2-rank">{m.rank}</span>
            <Face url={m.avatarUrl} name={fullName(m)} />
            <span className="cm2-lb-t"><strong>{fullName(m)}</strong><small>@{m.username}{roleLabel(m.role) ? ` · ${roleLabel(m.role)}` : ''}</small></span>
            <span className="cm2-lb-v"><b>{m.tasksCompleted}</b> job{m.tasksCompleted === 1 ? '' : 's'}{m.totalEarned != null && <small>{money(m.totalEarned)}</small>}</span>
          </Link>
        ))}
      </section>
      <Pager page={page} pages={d.totalPages} onPage={setPage} />
    </>
  )
}

function Jobs({ id, kind, cat }: { id: string; kind: 'open' | 'completed'; cat: string }) {
  const [page, setPage] = useState(1)
  const [d, setD] = useState<{ jobs: Job[]; totalPages: number } | null>(null)
  useEffect(() => {
    setD(null)
    // Signed in, so a private community's members-only jobs show to its members
    apiRequest<any>(`/communities/${id}/jobs/${kind}?page=${page}`, { auth: true }).then((x) => setD({ jobs: x?.jobs || [], totalPages: x?.totalPages || 1 })).catch(() => setD({ jobs: [], totalPages: 1 }))
  }, [id, kind, page])
  if (!d) return <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
  return (
    <>
      <p className="cm2-muted cm2-note">Jobs only this community's members can take, then {kind === 'open' ? 'open' : 'completed'} jobs in {cat || 'this category'} across OgaPay.</p>
      {d.jobs.length === 0 ? <div className="up-empty"><i className="ti ti-briefcase" />No {kind} jobs right now.</div> : (
        <section className="up-card cm2-list">
          {d.jobs.map((j) => (
            <Link key={j.id} to={`/tasks/${j.id}`} className="cm2-job">
              <span className="cm2-job-t">
                <strong>{j.title}{j.membersOnly && <span className="cm2-only"><i className="ti ti-lock" />Members only</span>}{j.isContest && <span className="cm2-only"><i className="ti ti-award" />Contest</span>}</strong>
                <small>{kind === 'open'
                  ? `${j.submissionCount || 0} submission${j.submissionCount === 1 ? '' : 's'}${j.deadline ? ` · due ${new Date(j.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`
                  : `Completed ${j.completedAt ? new Date(j.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}${j.workers?.length ? ` · ${j.workers.length} worker${j.workers.length === 1 ? '' : 's'} paid` : ''}`}</small>
              </span>
              <span className="cm2-job-v">{money(j.reward, j.currency)}</span>
              <i className="ti ti-chevron-right cm2-go" />
            </Link>
          ))}
        </section>
      )}
      <Pager page={page} pages={d.totalPages} onPage={setPage} />
    </>
  )
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="cm2-pager">
      <button className="up-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button className="up-btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  )
}

function Chat({ id, meId }: { id: string; meId?: string }) {
  const { toast } = useToast()
  const [msgs, setMsgs] = useState<Msg[] | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)

  const load = () => apiRequest<Msg[]>(`/communities/${id}/chat`).then((d) => setMsgs(d || [])).catch(() => setMsgs((m) => m || []))
  // New messages every 10 seconds while the chat is open (June's page never refreshed)
  useEffect(() => {
    load()
    const t = setInterval(() => { if (!document.hidden) load() }, 10000)
    return () => clearInterval(t)
  }, [id])
  useEffect(() => {
    const el = box.current
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight
  }, [msgs])

  const send = async () => {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    try {
      const m = await apiRequest<Msg>(`/communities/${id}/chat`, { method: 'POST', body: JSON.stringify({ text: t }) })
      setMsgs((l) => [...(l || []), m])
      setText('')
      nearBottom.current = true
    } catch (e: any) { toast(e?.message || "Couldn't send", 'error') }
    setSending(false)
  }

  return (
    <section className="up-card cm2-chat">
      <div className="cm2-msgs" ref={box} onScroll={(e) => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}>
        {msgs === null ? <p className="cm2-muted cm2-center">Loading…</p> : msgs.length === 0 ? <p className="cm2-muted cm2-center">No messages yet. Say hello.</p> : msgs.map((m) => (
          <div key={m.id} className={`cm2-msg${m.sender.id === meId ? ' me' : ''}`}>
            <Face url={m.sender.avatarUrl} name={m.sender.firstName || m.sender.username} size={30} />
            <div className="cm2-bubble">
              <div className="cm2-msg-h"><Link to={`/user/${m.sender.username}`}>{m.sender.username}</Link><time>{when(m.createdAt)}</time></div>
              <p>{m.text}</p>
            </div>
          </div>
        ))}
      </div>
      <form className="cm2-send" onSubmit={(e) => { e.preventDefault(); send() }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Message the community" aria-label="Message" />
        <button className="up-btn primary" disabled={sending || !text.trim()} aria-label="Send"><i className="ti ti-send" /></button>
      </form>
    </section>
  )
}
