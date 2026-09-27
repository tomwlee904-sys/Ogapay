import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { API_BASE, apiRequest, getAccessToken } from '../lib/api'
import { categoryLabel } from '../lib/categories'
import { jobRequirements } from '../lib/requirements'
import '../styles/submit.css'

// Submit work for a job (/tasks/:id/submit). Takes a slot if you haven't yet,
// uploads files, then submits: the same steps as the job page's apply dialog.
// It used to demand a wallet, X, Telegram, email and KYC for every job and
// failed for anyone who had already taken a slot. Posters opening
// /tasks/:id/submissions are sent to the review drawer in Manage jobs.

type Task = {
  id: string; title: string; description?: string; instructions?: string | null; proofRequired?: string | null
  reward: number | string; currency?: string; category?: string; status: string; posterId?: string
  poster?: { username?: string | null }
  [k: string]: any
}
type Mine = { id: string; status: string; taskId: string; proof?: string | null; workerNotes?: string | null; posterNotes?: string | null; attachments?: string[]; autoApproveAt?: string | null; submittedAt?: string | null }

const MAX_FILES = 5
const money = (n: number, cur = 'NGN') => cur === 'NGN' ? `₦${Math.round(n).toLocaleString('en-US')}` : `$${n.toFixed(2)}`
const when = (d?: string | null) => d ? new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

// /tasks/:id/submissions: posters review in Manage jobs
export function SubmissionsRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/manage-jobs?job=${id}`} replace />
}

export default function SubmissionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [task, setTask] = useState<Task | null | undefined>(undefined)
  const [mine, setMine] = useState<Mine | null | undefined>(undefined)
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const loadMine = async () => {
    try {
      const d = await apiRequest<{ submissions: Mine[] }>('/tasks/my/submissions')
      setMine((d?.submissions || []).find((s) => s.taskId === id) || null)
    } catch { setMine(null) }
  }
  useEffect(() => {
    if (!id) return
    apiRequest<Task | { task: Task }>('/tasks/' + id).then((d: any) => setTask(d?.task || d || null)).catch(() => setTask(null))
    loadMine()
  }, [id])

  if (task === undefined || mine === undefined) {
    return <Layout><div className="ui-page sb-wrap"><div className="ui-sk" style={{ height: 40, width: 260 }} /><div className="sb-grid"><div className="ui-sk" style={{ height: 380 }} /><div className="ui-sk" style={{ height: 260 }} /></div></div></Layout>
  }
  if (!task) {
    return <Layout><div className="ui-page sb-wrap"><div className="ui-empty"><p>This job doesn't exist or was removed.</p><Link className="ui-btn ui-btn-ghost" to="/tasks">Find other jobs</Link></div></div></Layout>
  }
  // Your own job: review it instead
  if (user && task.posterId === user.id) return <Navigate to={`/manage-jobs?job=${task.id}`} replace />

  const cur = task.currency || 'NGN'
  const reward = Number(task.reward || 0)
  const reqs = jobRequirements(task)
  const brief = (task.proofRequired || task.instructions || task.description || '').trim()
  const closed = !['OPEN', 'COOLING_DOWN'].includes(task.status)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    setFiles((f) => [...f, ...Array.from(list)].slice(0, MAX_FILES))
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    if (!link.trim() && !notes.trim() && files.length === 0) { setError('Add a link, a note or a file so the poster can check your work.'); return }
    const token = getAccessToken()
    if (!token) { navigate('/login?redirect=' + encodeURIComponent(location.pathname)); return }
    setError('')
    try {
      // 1. Take a slot unless you already hold one
      if (!mine || mine.status !== 'PENDING') {
        setBusy('Taking a slot…')
        await apiRequest(`/tasks/${task.id}/apply`, { method: 'POST' }).catch((e: any) => {
          if (!String(e?.message || '').toLowerCase().includes('already')) throw e
        })
      }
      // 2. Upload files
      const urls: string[] = []
      for (const [i, f] of files.entries()) {
        setBusy(`Uploading file ${i + 1} of ${files.length}…`)
        const fd = new FormData(); fd.append('file', f)
        const r = await fetch(`${API_BASE}/uploads/proof`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j?.data?.url) throw new Error(`"${f.name}" couldn't be uploaded${j?.message ? `: ${j.message}` : ''}. Try again or remove it.`)
        urls.push(j.data.url)
      }
      // 3. Submit
      setBusy('Sending your work…')
      await apiRequest(`/tasks/${task.id}/submit`, { method: 'POST', body: JSON.stringify({ ...(link.trim() && { proof: link.trim() }), ...(notes.trim() && { workerNotes: notes.trim() }), ...(urls.length && { attachments: urls }) }) })
      setLink(''); setNotes(''); setFiles([])
      await loadMine()
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Your work was not sent.')
    }
    setBusy('')
  }

  const status = mine?.status
  return (
    <Layout>
      <div className="ui-page sb-wrap">
        <Link to={`/tasks/${task.id}`} className="sb-back"><i className="ti ti-arrow-left" /> Back to the job</Link>
        <span className="ui-eyebrow">Submit work</span>
        <h1 className="ui-title">{task.title}</h1>

        <div className="sb-grid">
          <div>
            {status === 'SUBMITTED' ? (
              <section className="ui-card ui-card-pad sb-state">
                <span className="sb-ic wait"><i className="ti ti-hourglass" /></span>
                <h2>Waiting for review</h2>
                <p>{task.poster?.username ? `@${task.poster.username}` : 'The poster'} is checking your work. You'll get a notification when they decide.</p>
                {mine?.autoApproveAt && <p className="sb-small"><i className="ti ti-clock-check" /> If they don't review it, it's approved and you're paid automatically on {when(mine.autoApproveAt)}.</p>}
                <Sent m={mine!} />
                <div className="ui-actions"><Link className="ui-btn ui-btn-ghost" to="/my-tasks">My tasks</Link><Link className="ui-btn ui-btn-ghost" to="/tasks">Find more jobs</Link></div>
              </section>
            ) : status === 'APPROVED' ? (
              <section className="ui-card ui-card-pad sb-state">
                <span className="sb-ic ok"><i className="ti ti-check" /></span>
                <h2>Approved and paid</h2>
                <p>{money(reward, cur)} went to your wallet.</p>
                <div className="ui-actions"><Link className="ui-btn ui-btn-dark" to="/wallet">Open wallet</Link><Link className="ui-btn ui-btn-ghost" to="/tasks">Find more jobs</Link></div>
              </section>
            ) : status === 'REJECTED' || status === 'EXPIRED' || status === 'DISPUTED' ? (
              <section className="ui-card ui-card-pad sb-state">
                <span className="sb-ic bad"><i className={`ti ${status === 'DISPUTED' ? 'ti-scale' : 'ti-x'}`} /></span>
                <h2>{status === 'REJECTED' ? 'Not approved' : status === 'EXPIRED' ? 'Your slot expired' : 'In dispute'}</h2>
                <p>{status === 'REJECTED' ? 'The poster didn\'t approve this work.' : status === 'EXPIRED' ? 'No work was sent before the time ran out, so the slot went to someone else.' : 'Our team is looking at this submission.'}</p>
                {mine?.posterNotes && <blockquote className="sb-quote">“{mine.posterNotes}”</blockquote>}
                <div className="ui-actions"><Link className="ui-btn ui-btn-ghost" to="/tasks">Find other jobs</Link></div>
              </section>
            ) : closed ? (
              <section className="ui-card ui-card-pad sb-state">
                <span className="sb-ic bad"><i className="ti ti-lock" /></span>
                <h2>This job isn't taking work</h2>
                <p>It's {task.status === 'DRAFT' ? 'paused by the poster' : task.status.toLowerCase().replace('_', ' ')}.</p>
                <div className="ui-actions"><Link className="ui-btn ui-btn-ghost" to="/tasks">Find other jobs</Link></div>
              </section>
            ) : (
              <section className="ui-card ui-card-pad sb-form">
                {status === 'PENDING' && <p className="sb-held"><i className="ti ti-circle-check" /> You have a slot on this job. Send your work when it's done.</p>}
                <label className="ui-label" htmlFor="sb-link">Link to your work</label>
                <input id="sb-link" className="ui-input" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://… (post, document, recording)" />
                <label className="ui-label" htmlFor="sb-notes">Note for the poster</label>
                <textarea id="sb-notes" className="ui-input sb-textarea" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What you did, anything they should know" />
                <span className="ui-label">Screenshots or files ({files.length}/{MAX_FILES})</span>
                {files.length > 0 && (
                  <ul className="sb-files">
                    {files.map((f, i) => (
                      <li key={i}><i className="ti ti-paperclip" /><span>{f.name}</span><button onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}><i className="ti ti-x" /></button></li>
                    ))}
                  </ul>
                )}
                {files.length < MAX_FILES && (
                  <button type="button" className="sb-drop" onClick={() => fileRef.current?.click()}>
                    <i className="ti ti-upload" /> Add files <small>Images, PDFs or documents</small>
                  </button>
                )}
                <input ref={fileRef} type="file" multiple hidden accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx" onChange={(e) => addFiles(e.target.files)} />
                {error && <p className="sb-error" role="alert">{error}</p>}
                <button className="ui-btn ui-btn-dark ui-btn-lg sb-send" disabled={!!busy} onClick={submit}>
                  {busy ? <><i className="ti ti-loader-2 sb-spin" /> {busy}</> : <>Send work</>}
                </button>
                <p className="sb-small">Add at least a link, a note or a file. The poster reviews it and you're paid {money(reward, cur)} when it's approved.</p>
              </section>
            )}
          </div>

          <aside className="ui-card ui-card-pad sb-side">
            <div className="sb-reward"><b>{money(reward, cur)}</b><span>per person</span></div>
            <div className="sb-meta"><span>{categoryLabel(task.category)}</span>{task.poster?.username && <span>by <Link to={`/user/${task.poster.username}`}>@{task.poster.username}</Link></span>}</div>
            {brief && <><span className="ui-label">What to do</span><p className="sb-brief">{brief}</p></>}
            <span className="ui-label">Requirements</span>
            {reqs.length ? <ul className="sb-reqs">{reqs.map((r) => <li key={r.text}><i className={`ti ti-${r.icon}`} /> {r.text}</li>)}</ul> : <p className="sb-brief">None. Anyone can take part.</p>}
          </aside>
        </div>
      </div>
    </Layout>
  )
}

function Sent({ m }: { m: Mine }) {
  const files = (m.attachments || []).filter(Boolean)
  if (!m.proof && !m.workerNotes && !files.length) return null
  return (
    <div className="sb-sent">
      <span className="ui-label">What you sent</span>
      {m.workerNotes && <p>{m.workerNotes}</p>}
      {m.proof && /^https?:\/\//.test(m.proof) && <a href={m.proof} target="_blank" rel="noopener noreferrer"><i className="ti ti-external-link" /> {m.proof}</a>}
      {files.map((u, i) => <a key={i} href={u} target="_blank" rel="noopener noreferrer"><i className="ti ti-paperclip" /> File {i + 1}</a>)}
    </div>
  )
}
