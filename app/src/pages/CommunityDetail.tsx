import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, getAccessToken, getStoredUser } from '../lib/api'
import { openSignIn } from '../lib/signin'
import { uploadImage } from '../lib/upload'
import { useToast } from '../components/Toast'
import '../styles/profile-public.css'
import '../styles/community.css'

// Community page, ported from the June version (leaderboard, open and completed
// jobs, members-only chat, owner settings) onto the current design. The live page
// before this was an "about" box with "feed coming soon". Dropped from June:
// invite codes and join requirements (the API never had them) and file
// attachments on join requests (the API ignored them).

type Member = { id: string; role: string; user: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null } }
type Community = {
  id: string; slug: string; name: string; description: string | null; iconUrl: string | null; coverImage: string | null
  accentColor: string | null; category: string | null; isPublic: boolean; owner: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null }
  twitter: string; telegram: string; discord: string; memberCount: number; requestCount: number; recentMembers: Member[]
  userRole: string | null; hasRequested: boolean; openJobCount: number; completedJobCount: number; createdAt: string
}
type Ranked = { rank: number; id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null; role: string; level: string; tasksCompleted: number; totalEarned: number | null }
type Job = { id: string; title: string; reward: number; currency: string; submissionCount?: number; createdAt?: string; completedAt?: string; deadline?: string | null; workers?: { id: string; username: string }[] }
type Msg = { id: string; text: string; createdAt: string; sender: { id: string; username: string; firstName: string; avatarUrl: string | null } }
type Req = { id: string; message: string; createdAt: string; user: { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null } }

const TABS = ['About', 'Leaderboard', 'Open jobs', 'Completed', 'Chat'] as const
type Tab = (typeof TABS)[number]
const money = (n: number, c = 'NGN') => (c === 'NGN' ? '₦' + Math.round(n).toLocaleString('en-US') : `${n.toLocaleString('en-US')} ${c}`)
const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
const fullName = (u: { firstName?: string; lastName?: string; username?: string }) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'Member'
const safeLink = (u?: string) => (u && /^https:\/\//i.test(u) ? u : '')
const roleLabel = (r: string) => (r === 'OWNER' ? 'Owner' : r === 'ADMIN' ? 'Admin' : r === 'MODERATOR' ? 'Moderator' : '')
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function Face({ url, name, size = 34 }: { url: string | null; name: string; size?: number }) {
  return <span className="cm2-face" style={{ width: size, height: size, fontSize: size * 0.36 }}>{url ? <img src={url} alt="" loading="lazy" /> : initials(name)}</span>
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
  const [asking, setAsking] = useState(false)
  const [askMsg, setAskMsg] = useState('')

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

  const join = async () => {
    if (!signedIn) { openSignIn({ redirect: '/communities/' + id }); return }
    if (!c!.isPublic) { setAsking(true); return }
    setBusy(true)
    try {
      await apiRequest(`/communities/${c!.id}/join`, { method: 'POST' })
      toast('You joined ' + c!.name, 'success')
      load()
    } catch (e: any) { toast(e?.message || "Couldn't join", 'error') }
    setBusy(false)
  }

  const sendRequest = async () => {
    setBusy(true)
    try {
      await apiRequest(`/communities/${c!.id}/request`, { method: 'POST', body: JSON.stringify({ message: askMsg.trim().slice(0, 500) }) })
      setAsking(false); setAskMsg('')
      setC((x) => (x ? { ...x, hasRequested: true } : x))
      toast('Request sent. The community leaders will review it.', 'success')
    } catch (e: any) { toast(e?.message || "Couldn't send your request", 'error') }
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
        <div className="up-crumb"><button onClick={() => navigate('/communities')}><i className="ti ti-arrow-left" /> Communities</button><span>{c.isPublic ? 'Public' : 'Private'}{cat ? ` · ${cat}` : ''}</span></div>

        <section className="up-card cm2-head">
          <div className="cm2-cover" style={c.coverImage ? { backgroundImage: `url("${encodeURI(c.coverImage)}")` } : { background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 35%, #0a0a0a))` }} />
          <div className="cm2-id">
            <span className="cm2-logo" style={{ background: accent }}>{c.iconUrl ? <img src={c.iconUrl} alt="" /> : initials(c.name)}</span>
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
                <button className="up-btn" disabled>Request sent</button>
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

        {asking && (
          <div className="up-card cm2-ask">
            <h2>Ask to join {c.name}</h2>
            <p className="cm2-muted">This community is private. Tell the leaders a little about yourself.</p>
            <textarea value={askMsg} onChange={(e) => setAskMsg(e.target.value)} maxLength={500} rows={3} placeholder="Optional message" />
            <div className="cm2-row-end">
              <button className="up-btn" onClick={() => setAsking(false)}>Cancel</button>
              <button className="up-btn primary" onClick={sendRequest} disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
            </div>
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

      {canModerate && !c.isPublic && <Requests id={c.id} onAccept={onChange} />}
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
      if (action === 'accept') { toast(`@${r.user.username} joined`, 'success'); onAccept() }
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
                {r.message && <p>{r.message}</p>}
              </div>
              <button className="up-btn" onClick={() => answer(r, 'decline')}>Decline</button>
              <button className="up-btn primary" onClick={() => answer(r, 'accept')}>Accept</button>
            </div>
          ))}
        </div>
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
    apiRequest<any>(`/communities/${id}/jobs/${kind}?page=${page}`, { auth: false }).then((x) => setD({ jobs: x?.jobs || [], totalPages: x?.totalPages || 1 })).catch(() => setD({ jobs: [], totalPages: 1 }))
  }, [id, kind, page])
  if (!d) return <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
  return (
    <>
      <p className="cm2-muted cm2-note">{kind === 'open' ? 'Open' : 'Completed'} jobs in {cat || 'this category'} across OgaPay.</p>
      {d.jobs.length === 0 ? <div className="up-empty"><i className="ti ti-briefcase" />No {kind} jobs right now.</div> : (
        <section className="up-card cm2-list">
          {d.jobs.map((j) => (
            <Link key={j.id} to={`/tasks/${j.id}`} className="cm2-job">
              <span className="cm2-job-t">
                <strong>{j.title}</strong>
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
