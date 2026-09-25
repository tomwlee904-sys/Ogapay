import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import Layout from "../components/Layout"
import { apiRequest } from "../lib/api"
import { uploadImage } from "../lib/upload"
import { useAuth } from "../context/AuthContext"
import { openSignIn } from "../lib/signin"
import "../styles/profile-public.css"
import "../styles/hire.css"

const FEE_PCT = 10 // same as the job fee (added on top; the worker gets the full budget)
const MIN_BUDGET = 100
const MAX_FILES = 5
const naira = (n: number) => "₦" + n.toLocaleString("en-US", { maximumFractionDigits: 2 })

export default function HirePage() {
  const { username = "" } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [worker, setWorker] = useState<any>(null)
  const [missing, setMissing] = useState(false)
  const [available, setAvailable] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [brief, setBrief] = useState("")
  const [budget, setBudget] = useState("")
  const [deadline, setDeadline] = useState("")
  const [files, setFiles] = useState<{ name: string; url: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ taskId: string; conversationId: string | null } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiRequest<any>(`/users/${encodeURIComponent(username)}`, { auth: false })
      .then((p) => (p?.isPublic === false ? setMissing(true) : setWorker(p)))
      .catch(() => setMissing(true))
  }, [username])

  useEffect(() => {
    if (!user) return
    apiRequest<any>("/wallet/balance").then((d) => setAvailable(Number(d?.NGN?.available ?? 0))).catch(() => setAvailable(0))
  }, [user])

  useEffect(() => {
    document.title = worker ? `Hire ${worker.firstName || worker.username} | OgaPay` : "Hire | OgaPay"
    return () => { document.title = "OgaPay" }
  }, [worker])

  const amt = Number(budget) || 0
  const fee = Math.round(amt * FEE_PCT) / 100
  const total = amt + fee
  const name = worker ? ([worker.firstName, worker.lastName].filter(Boolean).join(" ") || worker.username) : username
  const isSelf = !!user?.username && user.username.toLowerCase() === username.toLowerCase()
  const canHire = user && ["POSTER", "ADMIN"].includes(user.role)
  const short = available !== null && total > available
  const briefOk = brief.trim().length >= 20
  const ready = !!worker && canHire && !isSelf && briefOk && amt >= MIN_BUDGET && !short && !uploading && !submitting

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setError("")
    const room = MAX_FILES - files.length
    const pick = Array.from(list).slice(0, room)
    if (list.length > room) setError(`Up to ${MAX_FILES} files.`)
    setUploading(true)
    for (const f of pick) {
      if (f.size > 10 * 1024 * 1024) { setError(`${f.name} is over 10 MB.`); continue }
      try {
        const url = await uploadImage(f, "task-attachments")
        setFiles((prev) => [...prev, { name: f.name, url }])
      } catch (e: any) {
        setError(`${f.name}: ${e?.message || "upload failed"}`)
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const submit = async () => {
    if (!ready) return
    setSubmitting(true); setError("")
    try {
      const res = await apiRequest<any>(`/users/${encodeURIComponent(worker.username)}/hire`, {
        method: "POST",
        body: JSON.stringify({
          ...(title.trim() && { title: title.trim() }),
          brief: brief.trim(),
          budget: amt,
          ...(deadline && { deadline: new Date(deadline + "T23:59:00").toISOString() }),
          ...(files.length && { attachments: files.map((f) => f.url) }),
        }),
      })
      setDone({ taskId: res?.task?.id, conversationId: res?.conversationId || null })
      window.scrollTo({ top: 0 })
    } catch (e: any) {
      setError(e?.message || "Couldn't create the hire. Nothing was charged.")
    }
    setSubmitting(false)
  }

  if (missing) {
    return (
      <Layout>
        <div className="up-wrap">
          <div className="up-card up-state">
            <i className="ti ti-user-off" />
            <h2>Can't hire this person</h2>
            <p>@{username} doesn't exist or their profile is private.</p>
            <Link className="up-btn" to="/">Go home</Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (done) {
    return (
      <Layout>
        <div className="up-wrap" style={{ maxWidth: 560 }}>
          <div className="up-card up-state">
            <i className="ti ti-circle-check" style={{ color: "var(--green)" }} />
            <h2>{name} has been hired</h2>
            <p>{naira(amt)} is held in escrow and is paid to {name} when you approve the work. We've sent them your brief in a private chat.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {done.conversationId && <Link className="up-btn primary" to={`/messages?c=${done.conversationId}`}><i className="ti ti-message" /> Open chat</Link>}
              {done.taskId && <Link className="up-btn" to={`/tasks/${done.taskId}`}><i className="ti ti-briefcase" /> View job</Link>}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="up-wrap">
        <div className="up-crumb">
          <button onClick={() => navigate(`/user/${username}`)}><i className="ti ti-arrow-left" /> Back to profile</button>
          <span>Private direct hire</span>
        </div>

        <div className="hr-head">
          <h1>Hire {name}</h1>
          <p>Set a budget and share a clear brief. The money is held in escrow until you approve the work.</p>
          <ol className="hr-steps">
            <li className="done"><span>1</span> Creator</li>
            <li className={briefOk ? "done" : "on"}><span>2</span> Job details</li>
            <li className={briefOk && amt >= MIN_BUDGET ? "on" : ""}><span>3</span> Payment</li>
          </ol>
        </div>

        <div className="hr-grid">
          <div className="hr-main">
            <section className="up-card hr-sec">
              <div className="hr-sec-h"><h2>Your creator</h2>{worker && <Link to={`/user/${worker.username}`}>View profile</Link>}</div>
              {worker ? (
                <div className="hr-who">
                  {worker.avatarUrl ? <img className="up-avatar" src={worker.avatarUrl} alt="" /> : <div className="up-avatar">{(worker.firstName?.[0] || worker.username[0]).toUpperCase()}</div>}
                  <div style={{ minWidth: 0 }}>
                    <b>{name}</b>
                    <small>@{worker.username} · {worker.workerProfile?.tasksCompleted ?? 0} jobs done{worker.workerProfile?.totalRatings ? ` · ${Number(worker.workerProfile.avgRating).toFixed(1)}★` : ""}</small>
                    {worker.bio && <p>{worker.bio}</p>}
                  </div>
                </div>
              ) : <div className="up-skel" style={{ height: 72 }} />}
            </section>

            <section className="up-card hr-sec">
              <div className="hr-sec-h"><h2>Job details</h2><span className="hr-tag"><i className="ti ti-lock" /> Private brief</span></div>

              <label className="hr-label" htmlFor="hr-title">Title <em>optional</em></label>
              <input id="hr-title" className="hr-input" maxLength={200} placeholder="e.g. Logo for my bakery" value={title} onChange={(e) => setTitle(e.target.value)} />

              <label className="hr-label" htmlFor="hr-brief">Brief</label>
              <textarea id="hr-brief" className="hr-input hr-area" maxLength={10000} rows={8}
                placeholder="Describe what you need: the deliverable, format, deadline and anything they must know."
                value={brief} onChange={(e) => setBrief(e.target.value)} />
              <div className="hr-hint"><span>{briefOk ? "" : "At least 20 characters."}</span><span>{brief.length.toLocaleString()} / 10,000</span></div>

              <div className="hr-row">
                <div>
                  <label className="hr-label" htmlFor="hr-budget">Budget (₦)</label>
                  <div className="hr-money"><span>₦</span><input id="hr-budget" className="hr-input" inputMode="decimal" placeholder="5,000" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))} /></div>
                  <div className="hr-hint"><span>Minimum {naira(MIN_BUDGET)}. {name} receives all of it.</span></div>
                </div>
                <div>
                  <label className="hr-label" htmlFor="hr-deadline">Deadline <em>optional</em></label>
                  <input id="hr-deadline" type="date" className="hr-input" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
              </div>

              <label className="hr-label">Attachments <em>{files.length} / {MAX_FILES}</em></label>
              <div className="hr-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (user) addFiles(e.dataTransfer.files) }}>
                <i className="ti ti-paperclip" />
                <span>Images or PDF, up to 10 MB each.</span>
                <button type="button" className="up-btn" disabled={!user || uploading || files.length >= MAX_FILES} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading…" : "Choose files"}</button>
                <input ref={fileRef} type="file" hidden multiple accept="image/*,application/pdf" onChange={(e) => addFiles(e.target.files)} />
              </div>
              {files.length > 0 && (
                <ul className="hr-files">
                  {files.map((f) => (
                    <li key={f.url}><i className="ti ti-file" /> <span>{f.name}</span><button aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.url !== f.url))}><i className="ti ti-x" /></button></li>
                  ))}
                </ul>
              )}
              <p className="hr-note">Your brief becomes the first message in a private chat with {name}. Only you and {name} can see this job.</p>
            </section>
          </div>

          <aside className="up-card hr-pay">
            <h2>Payment</h2>
            <div className="hr-line"><span>{name} receives</span><b>{amt ? naira(amt) : "—"}</b></div>
            <div className="hr-line"><span>Platform fee ({FEE_PCT}%)</span><b>{amt ? naira(fee) : "—"}</b></div>
            <div className="hr-line total"><span>You pay</span><b>{amt ? naira(total) : "—"}</b></div>
            {user && <div className={`hr-line ${short ? "bad" : ""}`}><span>Wallet available</span><b>{available === null ? "…" : naira(available)}</b></div>}
            {short && <div className="up-note err">Not enough in your wallet. <Link to="/wallet">Top up</Link></div>}
            {error && <div className="up-note err" role="alert">{error}</div>}

            {!user ? (
              <button className="up-btn primary hr-cta" onClick={() => openSignIn({ redirect: `/user/${username}/hire` })}>Sign in to hire</button>
            ) : isSelf ? (
              <div className="up-note err">You can't hire yourself.</div>
            ) : !canHire ? (
              <div className="up-note err">Hiring is for job-creator accounts. Your account is set up for earning.</div>
            ) : (
              <button className="up-btn primary hr-cta" disabled={!ready} onClick={submit}>
                {submitting ? "Hiring…" : amt >= MIN_BUDGET ? `Pay ${naira(total)} & hire` : "Pay & hire"}
              </button>
            )}
            <p className="hr-small"><i className="ti ti-shield-lock" /> Paid from your OgaPay wallet and held in escrow. {name} is paid when you approve the work.</p>
          </aside>
        </div>
      </div>
    </Layout>
  )
}
