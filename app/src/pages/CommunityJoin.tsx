import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE, apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import { useToast } from '../components/Toast'
import { sized } from '../lib/img'
import '../styles/profile-public.css'
import '../styles/community.css'
import '../styles/community-join.css'

// Join a community (/communities/:id/request), laid out like wurk.fun's page:
// the entry task and requirements first, then the request (message and up to
// 3 files) and, below, joining with an invite code.

type JoinInfo = {
  id: string; slug: string; name: string; iconUrl: string | null; accentColor: string | null; isPublic: boolean; isActive: boolean
  entryTask: { title: string; steps: string } | null
  requirements: string[]
  limits: { message: number; attachments: number; attachmentTypes: string[] }
  signedIn: boolean; userRole: string | null
  request: { id: string; status: string; createdAt: string } | null
  missing: string[]; eligible: boolean | null
}

const ACCEPT = '.png,.jpg,.jpeg,.mp3,.wav,.m4a,.ogg,.aac,.mp4,.mov,.webm,.pdf,.txt,.csv,.md'
const MAX_FILE = 10 * 1024 * 1024
const extOf = (name: string) => (name.split('.').pop() || '').toLowerCase()
const initials = (s: string) => s.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'

// Steps text with https links made clickable (nothing else is turned into HTML)
export function LinkedText({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s<>"']+)/g)
  return (
    <>
      {parts.map((p, i) => (/^https:\/\//.test(p)
        ? <a key={i} href={p.replace(/[.,;:!?)]+$/, '')} target="_blank" rel="noopener noreferrer nofollow">{p}</a>
        : <span key={i}>{p}</span>))}
    </>
  )
}

export default function CommunityJoin() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const signedIn = !!getAccessToken()
  const [d, setD] = useState<JoinInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState('')
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => apiRequest<JoinInfo>(`/communities/${id}/join-info`, { auth: signedIn })
    .then(setD).catch(() => setD(null)).finally(() => setLoading(false))
  useEffect(() => { setLoading(true); load() }, [id])

  const back = () => navigate(`/communities/${d?.slug || id}`)
  const needSignIn = () => openSignIn({ redirect: `/communities/${id}/request` })

  const addFiles = (list: FileList | null) => {
    if (!list || !d) return
    const next = [...files]
    for (const f of Array.from(list)) {
      if (next.length >= d.limits.attachments) { toast(`You can attach up to ${d.limits.attachments} files`, 'error'); break }
      if (!d.limits.attachmentTypes.includes(extOf(f.name))) { toast(`"${f.name}" isn't an allowed file type`, 'error'); continue }
      if (f.size > MAX_FILE) { toast(`"${f.name}" is over 10MB`, 'error'); continue }
      next.push(f)
    }
    setFiles(next)
    if (fileRef.current) fileRef.current.value = ''
  }

  const send = async () => {
    if (!signedIn) { needSignIn(); return }
    if (!d || busy) return
    try {
      const urls: string[] = []
      for (const [i, f] of files.entries()) {
        setBusy(`Uploading file ${i + 1} of ${files.length}…`)
        const fd = new FormData(); fd.append('file', f)
        const r = await fetch(`${API_BASE}/uploads/proof`, { method: 'POST', headers: { Authorization: `Bearer ${getAccessToken()}` }, body: fd })
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.data?.url) throw new Error(`"${f.name}" couldn't be uploaded${j?.message ? `: ${j.message}` : ''}. Try again or remove it.`)
        urls.push(j.data.url)
      }
      setBusy('Sending…')
      await apiRequest(`/communities/${d.id}/request`, { method: 'POST', body: JSON.stringify({ message: msg.trim(), attachments: urls }) })
      setMsg(''); setFiles([])
      toast('Request sent. The community managers will review it.', 'success')
      load()
    } catch (e: any) { toast(e?.message || "Couldn't send your request", 'error') }
    setBusy('')
  }

  const cancelRequest = async () => {
    if (!d || busy) return
    setBusy('Cancelling…')
    try {
      await apiRequest(`/communities/${d.id}/request`, { method: 'DELETE' })
      toast('Request cancelled', 'success')
      load()
    } catch (e: any) { toast(e?.message || "Couldn't cancel", 'error') }
    setBusy('')
  }

  const joinWithCode = async () => {
    if (!signedIn) { needSignIn(); return }
    const c = code.trim()
    if (!c || joining) return
    setJoining(true)
    try {
      const r = await apiRequest<{ slug: string; name: string }>('/communities/join-by-code', { method: 'POST', body: JSON.stringify({ code: c }) })
      toast(`You joined ${r.name}`, 'success')
      navigate(`/communities/${r.slug}`)
    } catch (e: any) { toast(e?.message || "That code didn't work", 'error') }
    setJoining(false)
  }

  if (loading) return <Layout><div className="up-wrap cj-wrap"><div className="up-empty"><i className="ti ti-loader-2" />Loading…</div></div></Layout>
  if (!d) {
    return (
      <Layout>
        <div className="up-wrap cj-wrap">
          <div className="up-empty"><i className="ti ti-users" />This community doesn't exist or was deleted.<div style={{ marginTop: 12 }}><Link className="up-btn" to="/communities">Browse communities</Link></div></div>
        </div>
      </Layout>
    )
  }

  const accent = d.accentColor || '#52525b'
  const pending = d.request?.status === 'PENDING'
  const member = !!d.userRole
  const blocked = d.eligible === false
  const count = msg.length

  return (
    <Layout>
      <div className="up-wrap cj-wrap">
        <div className="up-crumb"><button onClick={back}><i className="ti ti-arrow-left" /> {d.name}</button></div>

        <header className="cj-head">
          <span className="cj-kicker">Join community</span>
          <div className="cj-name">
            <span className="cm2-logo cj-logo" style={{ background: accent }}>{d.iconUrl ? <img src={sized(d.iconUrl, 96, true)} alt="" /> : initials(d.name)}</span>
            <h1>{d.name}</h1>
          </div>
          <p className="cj-lead">Send a request or join with an invite code.</p>
        </header>

        {member ? (
          <section className="up-card cj-card cj-done">
            <i className="ti ti-circle-check" />
            <div><b>You're a member of {d.name}.</b></div>
            <Link className="up-btn primary" to={`/communities/${d.slug}`}>Open community</Link>
          </section>
        ) : (
          <>
            <h2 className="cj-h2">Before you request to join</h2>
            {d.entryTask && (
              <section className="up-card cj-card">
                <span className="cj-label"><i className="ti ti-flag" /> Entry task</span>
                {d.entryTask.title && <h3 className="cj-task-title">{d.entryTask.title}</h3>}
                {d.entryTask.steps && <p className="cj-steps"><LinkedText text={d.entryTask.steps} /></p>}
              </section>
            )}
            <section className="up-card cj-card">
              <span className="cj-label"><i className="ti ti-list-check" /> Entry requirements</span>
              {d.requirements.length === 0
                ? <p className="cj-muted">No requirements. Anyone can ask to join.</p>
                : <ul className="cj-reqs">{d.requirements.map((r) => <li key={r}><i className="ti ti-point" />{r}</li>)}</ul>}
              <p className="cj-muted">Your eligibility is checked when you send a request.</p>
              {d.signedIn && d.eligible !== null && (
                <p className={`cj-elig ${d.eligible ? 'ok' : 'no'}`} role="status">
                  <i className={`ti ${d.eligible ? 'ti-circle-check' : 'ti-alert-circle'}`} />
                  {d.eligible ? 'You meet the entry requirements.' : `You still need ${d.missing.join(', ')}.`}
                </p>
              )}
            </section>

            <h2 className="cj-h2">Your request <span className="cj-sub">Community review</span></h2>
            <section className="up-card cj-card">
              {pending ? (
                <div className="cj-pending">
                  <p><i className="ti ti-clock" /> Your request was sent {new Date(d.request!.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. The community managers will review it.</p>
                  <button className="up-btn" onClick={cancelRequest} disabled={!!busy}>{busy || 'Cancel request'}</button>
                </div>
              ) : (
                <>
                  {d.request?.status === 'DECLINED' && <p className="cj-muted">Your last request wasn't accepted. You can send a new one.</p>}
                  <label className="cj-field">
                    <span className="cj-fl">Message <em>optional</em><b className={count > d.limits.message ? 'over' : ''}>{count}/{d.limits.message}</b></span>
                    <textarea value={msg} onChange={(e) => setMsg(e.target.value.slice(0, d.limits.message))} rows={4} maxLength={d.limits.message} placeholder="Share your interests, skills or completed entry task." />
                  </label>
                  <div className="cj-field">
                    <span className="cj-fl">Attachments <em>optional</em><b>{files.length}/{d.limits.attachments}</b></span>
                    {files.length > 0 && (
                      <ul className="cj-files">
                        {files.map((f, i) => (
                          <li key={i}><i className="ti ti-file" /><span>{f.name}</span>
                            <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><i className="ti ti-x" /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {files.length < d.limits.attachments && (
                      <button type="button" className="cj-drop" onClick={() => fileRef.current?.click()}>
                        <i className="ti ti-paperclip" /> Add files <small>PNG/JPG, audio, video, PDF, TXT, CSV, Markdown</small>
                      </button>
                    )}
                    <input ref={fileRef} type="file" multiple hidden accept={ACCEPT} onChange={(e) => addFiles(e.target.files)} />
                  </div>
                  <div className="cj-actions">
                    <button className="up-btn" onClick={back} disabled={!!busy}>Cancel</button>
                    <button className="up-btn primary" onClick={send} disabled={!!busy || !d.isActive || (signedIn && blocked)}>{busy || 'Send request'}</button>
                  </div>
                  <p className="cj-muted">Community managers will review your request. Complete any entry task before applying.</p>
                </>
              )}
            </section>

            <h2 className="cj-h2">Have an invite code?</h2>
            <section className="up-card cj-card">
              <form className="cj-code" onSubmit={(e) => { e.preventDefault(); joinWithCode() }}>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Invite code" aria-label="Invite code" maxLength={32} autoCapitalize="characters" autoComplete="off" />
                <button className="up-btn primary" disabled={joining || !code.trim()}>{joining ? 'Joining…' : 'Use invite code'}</button>
              </form>
              <p className="cj-muted">A code joins you straight away. <Link to="/communities/invitations">Your invitations</Link></p>
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}
