import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { API_BASE, apiRequest, getAccessToken } from '../lib/api'
import { categoryLabel } from '../lib/categories'
import { jobRequirements } from '../lib/requirements'
import { renderJobText } from '../lib/jobText'
import { saveDraft, loadDraft, clearDraft } from '../lib/draft'
import { ordinal } from '../components/ContestPanel'
import '../styles/submit.css'

// Submit work for a job (/tasks/:id/submit). Takes a slot if you haven't yet,
// uploads files, then submits: the same steps as the job page's apply dialog.
// It used to demand a wallet, X, Telegram, email and KYC for every job and
// failed for anyone who had already taken a slot. Posters opening
// /tasks/:id/submissions are sent to the review drawer in Manage jobs.
// A Selection job takes an application with a short note instead; only the
// person the poster picks gets the place and this page's send-work form.

type Task = {
  id: string; title: string; description?: string; instructions?: string | null; proofRequired?: string | null; isContest?: boolean
  reward: number | string; currency?: string; category?: string; status: string; posterId?: string
  poster?: { username?: string | null }
  isSelection?: boolean; hiredWorkerId?: string | null
  [k: string]: any
}
// Your application to a Selection job (from GET /tasks/:id)
type Application = { id: string; pitch: string; status: 'WAITING' | 'PICKED' | 'NOT_PICKED'; createdAt: string }
const PITCH_MIN = 10
type Mine = {
  id: string; status: string; taskId: string; proof?: string | null; workerNotes?: string | null; posterNotes?: string | null; attachments?: string[]; autoApproveAt?: string | null; submittedAt?: string | null
  // Contest entries: the place won and the result (from /tasks/my/submissions)
  place?: number | null; paidAmount?: number | null; contestResult?: 'WON' | 'NOT_PLACED' | 'WAITING' | null; winnersPaidAt?: string | null
}

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
  const [application, setApplication] = useState<Application | null>(null)
  const [pitch, setPitch] = useState('')

  // A half-written link and note are kept for this job and person until the
  // work is sent (leaving the page used to lose them). Files can't be kept.
  const draftKey = `submit_${id}`
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    if (!id) return
    const d = loadDraft(draftKey, user?.id)
    if (d) { setLink(String(d.data.link || '')); setNotes(String(d.data.notes || '')) }
    setRestored(true)
  }, [id, user?.id])
  useEffect(() => {
    if (!restored || !id) return
    if (link.trim() || notes.trim()) saveDraft(draftKey, { link, notes }, user?.id)
    else clearDraft(draftKey, user?.id)
  }, [link, notes, restored])

  const loadMine = async () => {
    try {
      const d = await apiRequest<{ submissions: Mine[] }>('/tasks/my/submissions')
      setMine((d?.submissions || []).find((s) => s.taskId === id) || null)
    } catch { setMine(null) }
  }
  useEffect(() => {
    if (!id) return
    apiRequest<Task | { task: Task }>('/tasks/' + id).then((d: any) => { setTask(d?.task || d || null); setApplication(d?.userApplication || null) }).catch(() => setTask(null))
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
  const brief = (task.instructions || task.description || '').trim()
  // The Create form's "Screenshot required" switch (the server checks it too)
  const needsShot = /screenshot required/i.test(task.proofRequired || '')
  // Anything else the poster wrote about proof
  const proofNote = !needsShot && task.proofRequired ? task.proofRequired.trim() : ''
  const closed = !['OPEN', 'COOLING_DOWN'].includes(task.status)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    setFiles((f) => [...f, ...Array.from(list)].slice(0, MAX_FILES))
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    if (!link.trim() && !notes.trim() && files.length === 0) { setError('Add a link, a note or a file so the poster can check your work.'); return }
    if (needsShot && files.length === 0) { setError('This job needs a screenshot. Add at least one image of your work.'); return }
    const token = getAccessToken()
    if (!token) { navigate('/login?redirect=' + encodeURIComponent(location.pathname)); return }
    setError('')
    try {
      // 1. Take a slot unless you already hold one
      if (!mine || mine.status !== 'PENDING') {
        setBusy('Taking a slot…')
        await apiRequest(`/tasks/${task.id}/apply`, { method: 'POST' }).catch((e: any) => {
          // Only "You have already applied" is fine here; other refusals (like a similar job done) must show
          if (!/already applied/i.test(String(e?.message || ''))) throw e
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
      clearDraft(draftKey, user?.id)
      await loadMine()
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Your work was not sent.')
    }
    setBusy('')
  }

  // Selection job: send an application with a note (it doesn't take the place)
  const sendApplication = async () => {
    const note = pitch.trim()
    if (note.length < PITCH_MIN) { setError(`Write a short note on why you are a good fit (at least ${PITCH_MIN} characters).`); return }
    if (!getAccessToken()) { navigate('/login?redirect=' + encodeURIComponent(location.pathname)); return }
    setError('')
    setBusy('Sending your application…')
    try {
      const a = await apiRequest<Application>(`/tasks/${task.id}/apply`, { method: 'POST', body: JSON.stringify({ pitch: note }) })
      setApplication(a)
      setPitch('')
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Your application was not sent.')
    }
    setBusy('')
  }

  const status = mine?.status
  // What you were really paid (a contest's reward is its 1st prize)
  const paidAmount = Number(mine?.paidAmount ?? reward)
  // Contests: once the end date passes no entry can be sent, but the job stays
  // open for up to 3 days while the winners are picked, so the form used to
  // show and the server then refused the entry. Every place can also be
  // awarded before the end date, which closes the contest early.
  const endsAt: string | null = task.expiresAt || task.deadline || null
  const winnersPaidAt: string | null = mine?.winnersPaidAt ?? task.winnersPaidAt ?? null
  const awardedEarly = !!winnersPaidAt && !!endsAt && new Date(winnersPaidAt).getTime() < new Date(endsAt).getTime()
  const entriesClosed = !!task.isContest && (!!winnersPaidAt || (!!endsAt && new Date(endsAt).getTime() <= Date.now()))
  // No entry sent (a slot taken, or none) and entries have closed
  const notSent = entriesClosed && !mine?.submittedAt && mine?.contestResult !== 'WON' && (!status || status === 'PENDING' || status === 'EXPIRED')
  return (
    <Layout>
      <div className="ui-page sb-wrap">
        <Link to={`/tasks/${task.id}`} className="sb-back"><i className="ti ti-arrow-left" /> Back to the job</Link>
        <span className="ui-eyebrow">Submit work</span>
        <h1 className="ui-title">{task.title}</h1>

        <div className="sb-grid">
          <div>
            {notSent ? (
              <section className="ui-card ui-card-pad sb-state">
                <span className="sb-ic"><i className="ti ti-lock" /></span>
                <h2>{awardedEarly ? 'This contest is closed' : 'Entries have closed'}</h2>
                <p>
                  {awardedEarly
                    ? (mine ? 'All the places were awarded before you sent an entry.' : 'All the places were awarded, so it isn\'t taking entries any more.')
                    : (mine ? 'You didn\'t send an entry.' : 'This contest isn\'t taking entries any more.')}
                  {!winnersPaidAt && task.winnersDueAt ? ` The winners are picked by ${when(task.winnersDueAt)}.` : ''}
                </p>
                <div className="ui-actions"><Link className="ui-btn ui-btn-ghost" to={`/tasks/${task.id}`}>{winnersPaidAt ? 'See the winners' : 'Back to the job'}</Link><Link className="ui-btn ui-btn-ghost" to="/tasks">Find more jobs</Link></div>
              </section>
            ) : mine?.contestResult === 'NOT_PLACED' ? (
              <section className="ui-card ui-card-pad sb-state">
                <span className="sb-ic"><i className="ti ti-flag" /></span>
                <h2>Your entry didn't place</h2>
                <p>The winners of this contest have been paid, and this entry wasn't one of them. Thanks for taking part.</p>
                <div className="ui-actions"><Link className="ui-btn ui-btn-ghost" to={`/tasks/${task.id}`}>See the winners</Link><Link className="ui-btn ui-btn-ghost" to="/tasks">Find more jobs</Link></div>
              </section>
            ) : status === 'SUBMITTED' && task.isContest ? (
              <section className="ui-card ui-card-pad sb-state">
                <span className="sb-ic wait"><i className="ti ti-hourglass" /></span>
                <h2>Entry sent</h2>
                <p>{task.poster?.username ? `@${task.poster.username}` : 'The poster'} picks the winners after the contest ends. You'll get a notification if your entry wins a place.</p>
                <Sent m={mine!} />
                <div className="ui-actions"><Link className="ui-btn ui-btn-ghost" to="/my-tasks">My tasks</Link><Link className="ui-btn ui-btn-ghost" to="/tasks">Find more jobs</Link></div>
              </section>
            ) : status === 'SUBMITTED' ? (
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
                <span className="sb-ic ok"><i className={`ti ${mine?.contestResult === 'WON' ? 'ti-trophy' : 'ti-check'}`} /></span>
                <h2>{mine?.contestResult === 'WON' ? `You won ${ordinal(mine.place || 1)} place` : 'Approved and paid'}</h2>
                <p>{money(paidAmount, cur)} went to your wallet.</p>
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
            ) : task.isSelection && !mine && application?.status === 'NOT_PICKED' ? (
              <section className="ui-card ui-card-pad sb-state">
                <span className="sb-ic bad"><i className="ti ti-user-x" /></span>
                <h2>You were not picked</h2>
                <p>{task.poster?.username ? `@${task.poster.username}` : 'The poster'} picked someone else for this job. Thanks for applying.</p>
                <div className="ui-actions"><Link className="ui-btn ui-btn-ghost" to="/tasks">Find other jobs</Link></div>
              </section>
            ) : task.isSelection && !mine && application && !closed ? (
              <section className="ui-card ui-card-pad sb-state">
                <span className="sb-ic wait"><i className="ti ti-hourglass" /></span>
                <h2>Application sent</h2>
                <p>{task.poster?.username ? `@${task.poster.username}` : 'The poster'} reads the applications and picks one person. You'll get a notification if it's you, and then you have 24 hours to send the work.</p>
                <div className="sb-sent"><span className="ui-label">Your note</span><p>{application.pitch}</p></div>
                <div className="ui-actions"><Link className="ui-btn ui-btn-ghost" to="/tasks">Find more jobs</Link></div>
              </section>
            ) : task.isSelection && !mine && !closed && task.hiredWorkerId && task.hiredWorkerId !== user?.id ? (
              <section className="ui-card ui-card-pad sb-state">
                <span className="sb-ic bad"><i className="ti ti-user-check" /></span>
                <h2>Someone was picked</h2>
                <p>The poster already picked someone for this job.</p>
                <div className="ui-actions"><Link className="ui-btn ui-btn-ghost" to="/tasks">Find other jobs</Link></div>
              </section>
            ) : task.isSelection && !mine && !closed ? (
              <section className="ui-card ui-card-pad sb-form">
                <p className="sb-held"><i className="ti ti-user-check" /> The poster picks one person for this job. Tell them why it should be you.</p>
                <label className="ui-label" htmlFor="sb-pitch">Why are you a good fit?</label>
                <textarea id="sb-pitch" className="ui-input sb-textarea" maxLength={1000} value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="Your experience with this kind of work, links to past work, how soon you can deliver" />
                {error && <p className="sb-error" role="alert">{error}</p>}
                <button className="ui-btn ui-btn-dark ui-btn-lg sb-send" disabled={!!busy} onClick={sendApplication}>
                  {busy ? <><i className="ti ti-loader-2 sb-spin" /> {busy}</> : <>Send application</>}
                </button>
                <p className="sb-small">Applying doesn't take the job. If you're picked, you have 24 hours to send the work, and you're paid {money(reward, cur)} when the poster approves it.</p>
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
                <span className="ui-label">{needsShot ? 'Screenshot (required)' : 'Screenshots or files'} ({files.length}/{MAX_FILES})</span>
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
                <p className="sb-small">{needsShot ? 'Add at least one screenshot.' : 'Add at least a link, a note or a file.'} {task.isContest ? 'The poster picks the winners when the contest ends, and prizes go to the best entries.' : <>The poster reviews it and you're paid {money(reward, cur)} when it's approved.</>}</p>
              </section>
            )}
          </div>

          <aside className="ui-card ui-card-pad sb-side">
            <div className="sb-reward"><b>{money(reward, cur)}</b><span>{task.isContest ? '1st prize' : 'per person'}</span></div>
            <div className="sb-meta"><span>{categoryLabel(task.category)}</span>{task.poster?.username && <span>by <Link to={`/user/${task.poster.username}`}>@{task.poster.username}</Link></span>}</div>
            {brief && <><span className="ui-label">What to do</span><div className="sb-brief" dangerouslySetInnerHTML={{ __html: renderJobText(brief) }} /></>}
            {(needsShot || proofNote) && <><span className="ui-label">Proof</span><p className="sb-proof"><i className="ti ti-photo" /> {needsShot ? 'Attach at least one screenshot of your work.' : proofNote}</p></>}
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
