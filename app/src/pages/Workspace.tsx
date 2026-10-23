import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import { renderJobText } from '../lib/jobText'
import { useMoney } from '../lib/useMoney'
import '../styles/workspace.css'

// The workspace for a Selection job or private hire (/work/:id): the brief, the
// picked person's work and the private job chat between them and the poster.
// Like wurk.fun's "Your workspace". Server: GET /tasks/:id/workspace
// (jobWork.service.js); the chat is a normal conversation (/messages).

type Person = { id: string; username?: string; name?: string; avatarUrl?: string | null } | null
type Sub = {
  id: string; status: string; proof?: string | null; workerNotes?: string | null; attachments?: string[] | null
  originalAttachments?: { url: string; originalUrl: string }[] | null; submittedAt?: string | null; posterNotes?: string | null
} | null
type Space = {
  task: { id: string; title: string; description: string; reward: number; currency: string; status: string; kind: 'SELECTION' | 'HIRE'; watermark?: boolean }
  role: 'POSTER' | 'WORKER'; poster: Person; worker: Person; submission: Sub; dueAt: string | null; conversationId: string
}
type Msg = { id: string; content: string; createdAt: string; senderId: string }

const STATUS: Record<string, string> = {
  PENDING: 'Waiting for the work', SUBMITTED: 'Work sent · waiting for review', APPROVED: 'Approved and paid',
  REJECTED: 'Not approved', DISPUTED: 'Disputed', EXPIRED: 'Time ran out',
}
const time = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function Workspace() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const show = useMoney()
  const [space, setSpace] = useState<Space | null | undefined>(undefined)
  const [msgs, setMsgs] = useState<Msg[] | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiRequest<Space>(`/tasks/${id}/workspace`).then((d) => setSpace(d || null)).catch(() => setSpace(null))
  }, [id])
  const loadMsgs = useCallback((conv: string) => {
    apiRequest<Msg[]>('/messages/' + conv).then((d) => setMsgs(Array.isArray(d) ? d : [])).catch(() => setMsgs((m) => m || []))
  }, [])
  useEffect(() => {
    if (!space?.conversationId) return
    loadMsgs(space.conversationId)
    const t = setInterval(() => loadMsgs(space.conversationId), 10000)
    return () => clearInterval(t)
  }, [space?.conversationId, loadMsgs])
  useEffect(() => { const el = threadRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs])

  const send = async () => {
    const text = draft.trim()
    if (!text || !space) return
    setSending(true); setErr('')
    try {
      await apiRequest('/messages', { method: 'POST', body: JSON.stringify({ conversationId: space.conversationId, content: text }) })
      setDraft('')
      loadMsgs(space.conversationId)
    } catch (e: any) { setErr(e?.message || "Your message wasn't sent. Try again.") }
    setSending(false)
  }

  if (space === undefined) return <Layout><div className="ui-page"><div className="ui-sk" style={{ height: 320, marginTop: 24 }} /></div></Layout>
  if (space === null) {
    return (
      <Layout>
        <div className="ui-page">
          <div className="ui-empty" style={{ marginTop: 32 }}>
            <p style={{ margin: '0 0 14px' }}>This workspace is unavailable. It's only for the poster and the person picked or hired for the job.</p>
            <Link className="ui-btn ui-btn-dark" to="/my-work">My work</Link>
          </div>
        </div>
      </Layout>
    )
  }

  const { task, role, submission: sub } = space
  const other = role === 'POSTER' ? space.worker : space.poster
  const files = (sub?.attachments || []).filter(Boolean)
  const originals = sub?.originalAttachments || []
  const canSend = role === 'WORKER' && sub?.status === 'PENDING'

  return (
    <Layout>
      <div className="ui-page ws-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">{role === 'WORKER' ? 'Your workspace' : 'Job workspace'} · {task.kind === 'SELECTION' ? 'Selection job' : 'Private hire'}</span>
            <h1 className="ui-title">{task.title}</h1>
            <p className="ui-sub">Review the brief, share the work and keep in touch{other?.username ? <> with <Link to={`/user/${other.username}`}>@{other.username}</Link></> : null}.</p>
          </div>
          <div className="ui-actions">
            <Link className="ui-btn ui-btn-ghost" to={role === 'WORKER' ? '/my-work' : `/manage-jobs?job=${task.id}`}><i className="ti ti-arrow-left" /> {role === 'WORKER' ? 'My work' : 'Manage job'}</Link>
          </div>
        </div>

        <div className="ws-grid">
          <div className="ws-main">
            <section className="ui-card ws-status">
              <div><span>Status</span><b>{STATUS[sub?.status || ''] || 'Picked'}</b></div>
              <div><span>{role === 'WORKER' ? 'You get' : 'You pay'}</span><b>{show(task.reward, task.currency, { exact: true })}</b></div>
              {space.dueAt && <div><span>Work due by</span><b>{time(space.dueAt)}</b></div>}
              {canSend && <Link className="ui-btn ui-btn-dark" to={`/tasks/${task.id}/submit`}><i className="ti ti-upload" /> Send your work</Link>}
              {role === 'POSTER' && sub?.status === 'SUBMITTED' && <Link className="ui-btn ui-btn-dark" to={`/manage-jobs?job=${task.id}`}><i className="ti ti-checks" /> Review the work</Link>}
            </section>

            {sub && (sub.submittedAt || files.length > 0) && (
              <section className="ui-card ws-card">
                <h2>The work</h2>
                {sub.workerNotes && <p className="ws-note">{sub.workerNotes}</p>}
                {sub.proof && /^https?:\/\//.test(sub.proof) && <a className="ws-file" href={sub.proof} target="_blank" rel="noopener noreferrer"><i className="ti ti-external-link" /> {sub.proof}</a>}
                {files.map((u, i) => <a key={u} className="ws-file" href={u} target="_blank" rel="noopener noreferrer"><i className="ti ti-paperclip" /> File {i + 1}{task.watermark ? ' (watermarked)' : ''}</a>)}
                {originals.map((o, i) => <a key={o.originalUrl} className="ws-file" href={o.originalUrl} target="_blank" rel="noopener noreferrer"><i className="ti ti-photo" /> Original {i + 1}</a>)}
                {task.watermark && role === 'POSTER' && sub.status !== 'APPROVED' && <p className="ws-hint">Images are watermarked. You get the originals when you approve the work.</p>}
                {sub.posterNotes && <p className="ws-hint">Poster's note: “{sub.posterNotes}”</p>}
              </section>
            )}

            <section className="ui-card ws-card">
              <h2>The brief</h2>
              <div className="ws-brief" dangerouslySetInnerHTML={{ __html: renderJobText(task.description) }} />
              <Link className="ws-link" to={`/tasks/${task.id}`}>Open the job page <i className="ti ti-arrow-right" /></Link>
            </section>
          </div>

          <section className="ui-card ws-chat" aria-label="Job chat">
            <div className="ws-chat-head">
              <b><i className="ti ti-messages" /> Job chat</b>
              <Link to={`/messages?c=${space.conversationId}`}>Open in Messages</Link>
            </div>
            <div className="ws-thread" ref={threadRef}>
              {msgs === null ? <div className="ui-sk" style={{ height: 120 }} /> : msgs.length === 0 ? <p className="ws-hint">No messages yet.</p> : msgs.map((m) => (
                <div key={m.id} className={`ws-msg${m.senderId === user?.id ? ' me' : ''}`}>
                  <p>{m.content}</p>
                  <time>{time(m.createdAt)}</time>
                </div>
              ))}
            </div>
            <div className="ws-compose">
              <textarea className="ui-input" rows={2} maxLength={5000} value={draft} placeholder="Write a message…" aria-label="Write a message"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
              <button className="ui-btn ui-btn-dark" disabled={sending || !draft.trim()} onClick={send}>{sending ? 'Sending…' : 'Send'}</button>
            </div>
            {err && <p className="ws-hint err" role="alert">{err}</p>}
          </section>
        </div>
      </div>
    </Layout>
  )
}
