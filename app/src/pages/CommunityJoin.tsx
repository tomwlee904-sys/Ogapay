import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE, apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import { useToast } from '../components/Toast'
import { sized } from '../lib/img'
import LoadError from '../components/LoadError'
import { accentTile } from '../components/community/colors'
import '../styles/profile-public.css'
import '../styles/community.css'
import '../styles/community-join.css'
import '../styles/store.css'

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
  const [params] = useSearchParams()
  const [d, setD] = useState<JoinInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  // "I have a code" opens first when the link carries one (?code=)
  const [view, setView] = useState<'request' | 'code'>(params.get('code') ? 'code' : 'request')
  const [msg, setMsg] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState('')
  const [code, setCode] = useState((params.get('code') || '').toUpperCase())
  const [joining, setJoining] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // "Not found" means the community is gone; any other failure gets Try again
  const load = () => apiRequest<JoinInfo>(`/communities/${id}/join-info`, { auth: signedIn })
    .then((x) => { setD(x); setFailed(false) })
    .catch((e: any) => { setD(null); setFailed(e instanceof TypeError || !/not found/i.test(e?.message || '')) })
    .finally(() => setLoading(false))
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

  if (loading) return <Layout><div className="ui-page"><div className="ui-narrow"><div className="ui-sk" style={{ height: 22, width: 140, borderRadius: 8 }} /><div className="ui-sk" style={{ height: 180, marginTop: 20 }} /></div></div></Layout>
  if (!d) {
    return (
      <Layout>
        <div className="ui-page">
          <div className="ui-narrow">
            <div className="up-crumb"><button className="tap" onClick={() => navigate('/communities')}><i className="ti ti-arrow-left" /> Communities</button></div>
            {failed ? <LoadError what="this community" onRetry={() => { setLoading(true); load() }} /> : (
              <div className="ui-empty">
                <h1 className="cj-state-h">We can't find this community</h1>
                It may have been deleted or made private, or the link is wrong.
                <div style={{ marginTop: 14 }}><Link className="ui-btn ui-btn-dark" to="/communities">Browse communities</Link></div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    )
  }

  const pending = d.request?.status === 'PENDING'
  const member = !!d.userRole
  const blocked = d.eligible === false
  const count = msg.length
  // Each requirement with whether it's met and where to fix it
  const fixFor = (r: string): [string, string] | null =>
    /kyc|verif/i.test(r) ? ['/settings/verification', 'Verify'] : /\bx\b account/i.test(r) ? ['/settings/connections', 'Connect X'] : /rank/i.test(r) ? ['/rank', 'See ranks'] : /job/i.test(r) ? ['/tasks', 'Find jobs'] : null
  const missingFor = (r: string) => d.missing.some((m) =>
    (/rank/i.test(r) && /rank/i.test(m)) || (/kyc|verif/i.test(r) && /kyc|verif/i.test(m)) || (/\bx\b account/i.test(r) && /x account/i.test(m)) || (/job/i.test(r) && /job/i.test(m)))
  const checked = d.signedIn && d.eligible !== null

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-narrow">
          <div className="up-crumb"><button className="tap" onClick={back}><i className="ti ti-arrow-left" /> {d.name}</button></div>

          <header className="cj-head">
            <div className="cj-name">
              <span className="cm2-logo cj-logo" style={accentTile(d.accentColor)}>{d.iconUrl ? <img src={sized(d.iconUrl, 96, true)} alt="" /> : initials(d.name)}</span>
              <div style={{ minWidth: 0 }}>
                <span className="cj-kicker">Join community</span>
                <h1>{d.name}</h1>
              </div>
            </div>
          </header>

          {member ? (
            <section className="up-card cj-card cj-done">
              <i className="ti ti-circle-check" />
              <div><b>You're a member of {d.name}.</b></div>
              <Link className="ui-btn ui-btn-dark" to={`/communities/${d.slug}`}>Open community</Link>
            </section>
          ) : (
            <>
              {/* The quickest way in first: a code joins straight away */}
              <div className="st-seg cj-views" role="tablist" aria-label="How to join">
                <button role="tab" aria-selected={view === 'request'} className={view === 'request' ? 'on' : ''} onClick={() => setView('request')}>Request to join</button>
                <button role="tab" aria-selected={view === 'code'} className={view === 'code' ? 'on' : ''} onClick={() => setView('code')}>I have a code</button>
              </div>

              {view === 'code' ? (
                <section className="up-card cj-card">
                  <form className="cj-code" onSubmit={(e) => { e.preventDefault(); joinWithCode() }}>
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Invite code" aria-label="Invite code" maxLength={32} autoCapitalize="characters" autoComplete="off" />
                    <button className="ui-btn ui-btn-dark" disabled={joining || !code.trim()}>{joining ? 'Joining…' : 'Join with code'}</button>
                  </form>
                  <p className="cj-muted">A working code joins you straight away, without the requirements. <Link to="/communities/invitations">Your invitations</Link></p>
                </section>
              ) : (
                <>
                  {d.entryTask && (
                    <section className="up-card cj-card">
                      <span className="cj-label"><i className="ti ti-flag" /> Entry task</span>
                      {d.entryTask.title && <h3 className="cj-task-title">{d.entryTask.title}</h3>}
                      {d.entryTask.steps && <p className="cj-steps"><LinkedText text={d.entryTask.steps} /></p>}
                    </section>
                  )}
                  <section className="up-card cj-card">
                    <span className="cj-label"><i className="ti ti-list-check" /> Requirements</span>
                    {d.requirements.length === 0
                      ? <p className="cj-muted" style={{ marginTop: 0 }}>No requirements. Anyone can ask to join.</p>
                      : (
                        <ul className="cj-checklist">
                          {d.requirements.map((r) => {
                            const miss = checked && missingFor(r)
                            const fix = miss ? fixFor(r) : null
                            return (
                              <li key={r} className={!checked ? '' : miss ? 'no' : 'ok'}>
                                <i className={`ti ${!checked ? 'ti-point' : miss ? 'ti-circle-x' : 'ti-circle-check'}`} aria-hidden="true" />
                                <span>{r}{checked && <em className="cj-vh">{miss ? ' (missing)' : ' (done)'}</em>}</span>
                                {fix && <Link className="ui-btn ui-btn-ghost ui-btn-sm" to={fix[0]}>{fix[1]}</Link>}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    {!checked && d.requirements.length > 0 && <p className="cj-muted">{signedIn ? 'Your eligibility is checked when you send a request.' : 'Sign in to see which ones you meet.'}</p>}
                    {checked && blocked && d.missing.length > 0 && !d.requirements.some(missingFor) && (
                      <p className="cj-elig no" role="status"><i className="ti ti-alert-circle" />You still need {d.missing.join(', ')}.</p>
                    )}
                  </section>

                  <h2 className="cj-h2">Ask to join</h2>
                  <section className="up-card cj-card">
                    {pending ? (
                      <div className="cj-pending">
                        <p><i className="ti ti-clock" /> Your request was sent {new Date(d.request!.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. The community managers will review it.</p>
                        <button className="ui-btn ui-btn-ghost" onClick={cancelRequest} disabled={!!busy}>{busy || 'Cancel request'}</button>
                      </div>
                    ) : signedIn && blocked ? (
                      // No dead form while a requirement is missing
                      <p className="cj-muted" style={{ margin: 0 }}>Meet the requirements above to send a request, or use an invite code.</p>
                    ) : (
                      <>
                        {d.request?.status === 'DECLINED' && <p className="cj-muted" style={{ marginTop: 0 }}>Your last request wasn't accepted. You can send a new one.</p>}
                        <p className="cj-muted" style={{ marginTop: 0 }}>The community's managers review each request. Do the entry task first.</p>
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
                                  <button type="button" className="tap" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><i className="ti ti-x" /></button>
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
                          <button className="ui-btn ui-btn-ghost" onClick={back} disabled={!!busy}>Cancel</button>
                          <button className="ui-btn ui-btn-dark" onClick={send} disabled={!!busy || !d.isActive || (signedIn && blocked)}>{busy || 'Send request'}</button>
                        </div>
                      </>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
