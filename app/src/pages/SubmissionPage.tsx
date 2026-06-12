import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE, getAccessToken, getStoredUser } from '../lib/api'
import { uploadImage } from '../lib/upload'

const OGAPAY_BLUE = '#191C6B'
const OGAPAY_BLUE_LIGHT = '#191C6B'

type OnboardingStatus = {
  walletConnected: boolean
  xConnected: boolean
  telegramConnected: boolean
  emailVerified: boolean
  kycVerified: boolean
}

async function fetchTask(id: string) {
  try {
    const token = getAccessToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token
    const res = await fetch(API_BASE + '/tasks/' + id, { headers })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data?.task || json?.data || json
  } catch { return null }
}

async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    const token = getAccessToken()
    if (!token) return { walletConnected: false, xConnected: false, telegramConnected: false, emailVerified: false, kycVerified: false }
    const res = await fetch(API_BASE + '/users/me', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
    const json = await res.json()
    const user = json?.data || json
    return {
      walletConnected: !!user.walletAddress || !!user.wallet_address || !!user.isWalletConnected,
      xConnected: !!user.xUsername || !!user.twitterUsername || !!user.isXConnected,
      telegramConnected: !!user.telegramUsername || !!user.isTelegramConnected,
      emailVerified: !!user.isEmailVerified || !!user.emailVerified,
      kycVerified: !!user.isKycVerified || !!user.kycVerified || !!user.isHumanVerified,
    }
  } catch {
    return { walletConnected: false, xConnected: false, telegramConnected: false, emailVerified: false, kycVerified: false }
  }
}

export default function SubmissionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null)
  const [comment, setComment] = useState('')
  const [link, setLink] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    Promise.all([fetchTask(id), fetchOnboardingStatus()]).then(([t, ob]) => {
      setTask(t)
      setOnboarding(ob)
      setLoading(false)
    })
  }, [id])

  const missingChecks: { label: string; action: string; key: keyof OnboardingStatus }[] = []
  if (onboarding) {
    if (!onboarding.walletConnected) missingChecks.push({ label: 'Connect a Solana wallet', action: 'Connect Wallet', key: 'walletConnected' })
    if (!onboarding.xConnected) missingChecks.push({ label: 'Connect your X/Twitter account', action: 'Connect X', key: 'xConnected' })
    if (!onboarding.telegramConnected) missingChecks.push({ label: 'Connect your Telegram', action: 'Connect Telegram', key: 'telegramConnected' })
    if (!onboarding.emailVerified) missingChecks.push({ label: 'Verify your email address', action: 'Verify Email', key: 'emailVerified' })
    if (!onboarding.kycVerified) missingChecks.push({ label: 'Complete KYC verification', action: 'Verify KYC', key: 'kycVerified' })
  }

  const isReady = onboarding && missingChecks.length === 0

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)])
  }

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!id) return

    if (!isReady) {
      setShowOnboarding(true)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const token = getAccessToken()
      if (!token) { navigate('/login'); return }

      // 1. Apply to the task
      const applyRes = await fetch(API_BASE + '/tasks/' + id + '/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      })
      let applyJson: any = {}
      try { applyJson = await applyRes.json() } catch { /* ignore parse failure */ }
      if (!applyRes.ok) throw new Error(applyJson?.message || applyJson?.error || 'Failed to apply')

      // 2. Upload files to ImageKit first, then submit URLs
      const uploadedUrls: string[] = []
      if (files.length > 0) {
        for (const f of files) {
          try {
            const url = await uploadImage(f, 'task-proofs')
            uploadedUrls.push(url)
          } catch (uploadErr: any) {
            setError('Failed to upload ' + f.name + ': ' + (uploadErr.message || 'Upload error'))
            setSubmitting(false)
            return
          }
        }
      }

      const submitBody: Record<string, any> = {}
      if (comment.trim()) submitBody.workerNotes = comment.trim()
      if (link.trim()) submitBody.proof = link.trim()
      if (uploadedUrls.length > 0) submitBody.attachments = uploadedUrls

      const submitRes = await fetch(API_BASE + '/tasks/' + id + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(submitBody),
      })
      let submitJson: any = {}
      try { submitJson = await submitRes.json() } catch { /* ignore parse failure */ }
      if (!submitRes.ok) throw new Error(submitJson?.message || submitJson?.error || 'Failed to submit')

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <Layout>
        <div className="sp-wrap">
          <div className="sp-loading">
            {[1,2,3].map(i => <div key={i} className="sp-skel" style={{ height: i === 1 ? 140 : 80, marginBottom: 14 }} />)}
          </div>
        </div>
        <style>{spStyles}</style>
      </Layout>
    )
  }

  if (!task && !loading) {
    return (
      <Layout>
        <div className="sp-wrap">
          <div className="sp-empty">
            <i className="ti ti-search-off" />
            <h2>Task Not Found</h2>
            <p>This task doesn't exist or has been removed.</p>
            <button className="sp-btn sp-btn-primary" onClick={() => navigate('/tasks')}>
              <i className="ti ti-arrow-left" /> Browse Tasks
            </button>
          </div>
        </div>
        <style>{spStyles}</style>
      </Layout>
    )
  }

  if (success) {
    return (
      <Layout>
        <div className="sp-wrap">
          <div className="sp-success">
            <div className="sp-success-icon">
              <i className="ti ti-circle-check" />
            </div>
            <h2>Submission Received!</h2>
            <p>Your work has been submitted successfully. The task creator will review it and you'll be notified of the outcome.</p>
            <div className="sp-success-actions">
              <button className="sp-btn sp-btn-primary" onClick={() => navigate('/tasks/' + id)}>
                <i className="ti ti-arrow-left" /> Back to Task
              </button>
              <button className="sp-btn sp-btn-outline" onClick={() => navigate('/my-tasks')}>
                <i className="ti ti-list" /> My Tasks
              </button>
            </div>
          </div>
        </div>
        <style>{spStyles}</style>
      </Layout>
    )
  }

  const user = getStoredUser()

  return (
    <Layout>
      <div className="sp-wrap">
        {/* Breadcrumb */}
        <div className="sp-breadcrumb">
          <button className="sp-bc-link" onClick={() => navigate('/tasks')}>
            <i className="ti ti-arrow-left" /> Tasks
          </button>
          <span className="sp-bc-sep">/</span>
          <button className="sp-bc-link" onClick={() => navigate('/tasks/' + id)}>
            {task?.title || 'Task'}
          </button>
          <span className="sp-bc-sep">/</span>
          <span className="sp-bc-current">Submit</span>
        </div>

        <div className="sp-layout">
          {/* Main */}
          <div className="sp-main">
            <div className="sp-card">
              <div className="sp-card-head">
                <h1>Submit Your Work</h1>
                <p>Complete the task and provide proof of your work below.</p>
              </div>

              <div className="sp-card-body">
                {/* Task Context */}
                {task && (
                  <div className="sp-task-context" onClick={() => navigate('/tasks/' + id)}>
                    <div className="sp-tc-reward">
                      <span className="sp-tc-rl">Reward</span>
                      <span className="sp-tc-rv">{Number(task.reward).toLocaleString()} {task.currency || 'SOL'}</span>
                    </div>
                    <div className="sp-tc-info">
                      <div className="sp-tc-title">{task.title}</div>
                      <div className="sp-tc-meta">{task.category || 'Task'} · {task.estimatedTime || task.timeEstimate || '—'}</div>
                    </div>
                    <i className="ti ti-chevron-right sp-tc-arrow" />
                  </div>
                )}

                {/* Onboarding Check */}
                {showOnboarding && !isReady && onboarding && (
                  <div className="sp-ob-block">
                    <div className="sp-ob-title"><i className="ti ti-shield-off" /> Complete these to apply</div>
                    {missingChecks.map((check, i) => (
                      <div className="sp-ob-item" key={i}>
                        <i className="ti ti-alert-circle" style={{ color: '#f59e0b' }} />
                        <span>{check.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment */}
                <div className="sp-field">
                  <label className="sp-label">Comment / Notes</label>
                  <textarea
                    className="sp-textarea"
                    rows={4}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Add any notes or comments about your submission..."
                  />
                </div>

                {/* Link */}
                <div className="sp-field">
                  <label className="sp-label">Proof Link</label>
                  <input
                    className="sp-input"
                    type="url"
                    value={link}
                    onChange={e => setLink(e.target.value)}
                    placeholder="https://example.com/proof"
                  />
                  <span className="sp-hint">Link to your completed work (screenshot URL, tweet, document, etc.)</span>
                </div>

                {/* File Attachments */}
                <div className="sp-field">
                  <label className="sp-label">Attachments</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileAdd}
                    style={{ display: 'none' }}
                  />
                  <div className="sp-upload-area" onClick={() => fileInputRef.current?.click()}>
                    <i className="ti ti-upload" />
                    <span>Click to upload files</span>
                    <span className="sp-upload-hint">Images, PDFs, or documents</span>
                  </div>
                  {files.length > 0 && (
                    <div className="sp-file-list">
                      {files.map((f, i) => (
                        <div className="sp-file-item" key={i}>
                          <i className="ti ti-file" />
                          <span className="sp-file-name">{f.name}</span>
                          <span className="sp-file-size">{(f.size / 1024).toFixed(0)} KB</span>
                          <button className="sp-file-remove" onClick={() => handleRemoveFile(i)}>
                            <i className="ti ti-x" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="sp-error">
                    <i className="ti ti-alert-triangle" /> {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  className="sp-btn sp-btn-primary sp-btn-submit"
                  onClick={handleSubmit}
                  disabled={submitting || (!comment.trim() && !link.trim() && files.length === 0)}
                >
                  {submitting ? (
                    <><span className="sp-spinner" /> Submitting...</>
                  ) : !isReady ? (
                    <><i className="ti ti-shield-off" /> Check Requirements</>
                  ) : (
                    <><i className="ti ti-send" /> Submit Work</>
                  )}
                </button>
                <p className="sp-note">You need to provide at least a comment, link, or file attachment.</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="sp-sidebar">
            <div className="sp-side-card">
              <div className="sp-side-title">Requirements</div>
              <div className="sp-req-list">
                <div className={`sp-req ${isReady ? 'done' : ''}`}>
                  <i className={`ti ${isReady ? 'ti-check-circle' : 'ti-alert-circle'}`} />
                  <span>Onboarding complete</span>
                </div>
                <div className={`sp-req ${comment.trim() || link.trim() || files.length > 0 ? 'done' : ''}`}>
                  <i className={`ti ${comment.trim() || link.trim() || files.length > 0 ? 'ti-check-circle' : 'ti-alert-circle'}`} />
                  <span>Proof provided</span>
                </div>
                <div className={`sp-req ${!!getAccessToken() ? 'done' : ''}`}>
                  <i className={`ti ${!!getAccessToken() ? 'ti-check-circle' : 'ti-alert-circle'}`} />
                  <span>Logged in</span>
                </div>
              </div>
            </div>

            {onboarding && (
              <div className="sp-side-card">
                <div className="sp-side-title">Account Status</div>
                {([
                  ['Wallet', onboarding.walletConnected],
                  ['X / Twitter', onboarding.xConnected],
                  ['Telegram', onboarding.telegramConnected],
                  ['Email Verified', onboarding.emailVerified],
                  ['KYC Verified', onboarding.kycVerified],
                ] as const).map(([label, done]) => (
                  <div className="sp-side-status" key={label}>
                    <i className={`ti ${done ? 'ti-circle-check' : 'ti-alert-circle'}`} style={{ color: done ? '#16a34a' : '#a8a29e' }} />
                    <span style={{ color: done ? 'var(--text)' : 'var(--text2)' }}>{label}</span>
                    {done && <span className="sp-side-badge">Done</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{spStyles}</style>
    </Layout>
  )
}

const spStyles = `
.sp-wrap { max-width: 1100px; margin: 0 auto; padding: 20px 24px 60px; }

.sp-breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; font-size: 13px; flex-wrap: wrap; }
.sp-bc-link { background: none; border: none; color: var(--text2); cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; padding: 4px 0; }
.sp-bc-link:hover { color: var(--text); }
.sp-bc-sep { color: var(--text3); }
.sp-bc-current { color: var(--text); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }

.sp-layout { display: grid; grid-template-columns: 1fr 300px; gap: 20px; align-items: start; }
@media (max-width: 860px) { .sp-layout { grid-template-columns: 1fr; } }

.sp-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; }
.sp-card-head { padding: 22px 24px; border-bottom: 1px solid var(--border); }
.sp-card-head h1 { font-family: Outfit, sans-serif; font-size: 22px; font-weight: 900; margin: 0 0 4px; color: var(--text); }
.sp-card-head p { font-size: 13px; color: var(--text2); margin: 0; }
.sp-card-body { padding: 22px 24px; }

/* Task Context */
.sp-task-context { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 20px; cursor: pointer; }
.sp-tc-reward { text-align: center; flex-shrink: 0; }
.sp-tc-rl { display: block; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--text3); }
.sp-tc-rv { font-size: 14px; font-weight: 900; color: #191C6B; font-family: Outfit, sans-serif; }
.sp-tc-info { flex: 1; min-width: 0; }
.sp-tc-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 2px; word-break: break-word; overflow-wrap: break-word; }
.sp-tc-meta { font-size: 11px; color: var(--text2); }
.sp-tc-arrow { color: var(--text3); flex-shrink: 0; }

/* Onboarding Block */
.sp-ob-block { background: #1c1917; border: 1px solid #292524; border-radius: 12px; padding: 16px 18px; margin-bottom: 20px; }
.sp-ob-title { font-size: 13px; font-weight: 800; color: #fb923c; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.sp-ob-item { display: flex; align-items: center; gap: 10px; padding: 5px 0; font-size: 12px; color: var(--text2); }
.sp-ob-item i { flex-shrink: 0; }

/* Fields */
.sp-field { margin-bottom: 18px; }
.sp-label { display: block; font-size: 12px; font-weight: 700; color: var(--text2); margin-bottom: 6px; }
.sp-input, .sp-textarea { width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 8px; background: var(--bg2); color: var(--text); font-size: 13px; font-family: inherit; transition: border-color .13s; box-sizing: border-box; }
.sp-input:focus, .sp-textarea:focus { outline: none; border-color: #191C6B; }
.sp-textarea { resize: vertical; min-height: 100px; }
.sp-hint { display: block; font-size: 11px; color: var(--text3); margin-top: 4px; }

/* Upload */
.sp-upload-area { border: 2px dashed var(--border); border-radius: 12px; padding: 28px; text-align: center; cursor: pointer; transition: border-color .13s, background .13s; }
.sp-upload-area:hover { border-color: #191C6B; background: rgba(18,21,102,.03); }
.sp-upload-area i { font-size: 28px; color: var(--text3); display: block; margin-bottom: 8px; }
.sp-upload-area span { display: block; font-size: 13px; font-weight: 700; color: var(--text2); }
.sp-upload-hint { font-size: 11px !important; font-weight: 500 !important; color: var(--text3) !important; margin-top: 4px; }

.sp-file-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.sp-file-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; font-size: 12px; }
.sp-file-item i { color: var(--text2); }
.sp-file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }
.sp-file-size { color: var(--text3); font-size: 11px; flex-shrink: 0; }
.sp-file-remove { background: none; border: none; cursor: pointer; color: #ef4444; padding: 2px; }

/* Submit btn */
.sp-btn-submit { width: 100%; height: 48px; font-size: 15px; }
.sp-note { text-align: center; font-size: 11px; color: var(--text3); margin: 10px 0 0; }

/* Success */
.sp-success { text-align: center; padding: 60px 20px; max-width: 480px; margin: 0 auto; }
.sp-success-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(22,163,74,.1); display: grid; place-items: center; margin: 0 auto 20px; }
.sp-success-icon i { font-size: 32px; color: #16a34a; }
.sp-success h2 { font-family: Outfit, sans-serif; font-size: 22px; font-weight: 900; margin: 0 0 8px; color: var(--text); }
.sp-success p { font-size: 14px; color: var(--text2); margin: 0 0 24px; line-height: 1.5; }
.sp-success-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

/* Sidebar */
.sp-sidebar { display: flex; flex-direction: column; gap: 14px; }
.sp-side-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; }
.sp-side-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--text2); margin-bottom: 12px; }
.sp-req-list { display: flex; flex-direction: column; gap: 0; }
.sp-req { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px dashed var(--border); font-size: 12px; color: var(--text2); }
.sp-req:last-child { border-bottom: none; }
.sp-req.done { color: var(--text); }
.sp-req i { font-size: 15px; color: #a8a29e; flex-shrink: 0; }
.sp-req.done i { color: #16a34a; }

.sp-side-status { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px dashed var(--border); font-size: 12px; }
.sp-side-status:last-child { border-bottom: none; }
.sp-side-status i { font-size: 15px; flex-shrink: 0; }
.sp-side-badge { margin-left: auto; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; padding: 2px 6px; border-radius: 4px; background: rgba(22,163,74,.1); color: #16a34a; }

/* Loading */
.sp-loading { padding: 40px 0; }
.sp-skel { background: var(--bg2); border-radius: 12px; animation: sp-shimmer 1.5s ease-in-out infinite; }
@keyframes sp-shimmer { 0%{opacity:.6} 50%{opacity:1} 100%{opacity:.6} }

/* Empty */
.sp-empty { text-align: center; padding: 60px 20px; }
.sp-empty i { font-size: 48px; color: var(--text3); display: block; margin-bottom: 16px; }
.sp-empty h2 { font-family: Outfit, sans-serif; font-size: 22px; font-weight: 900; margin: 0 0 8px; color: var(--text); }
.sp-empty p { font-size: 14px; color: var(--text2); margin: 0 0 20px; }

/* Error */
.sp-error { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #ef4444; padding: 10px 14px; background: rgba(239,68,68,.06); border: 1px solid rgba(239,68,68,.15); border-radius: 8px; margin-bottom: 16px; }

/* Spinner */
.sp-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: sp-spin .6s linear infinite; }
@keyframes sp-spin { to { transform: rotate(360deg); } }

/* Btn */
.sp-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  height: 42px; padding: 0 20px; border-radius: 10px; font-size: 13px; font-weight: 700;
  border: 1.5px solid transparent; cursor: pointer; transition: all .13s;
  text-decoration: none; font-family: inherit; white-space: nowrap;
}
.sp-btn-primary { background: #191C6B; color: #fff; border-color: #191C6B; }
.sp-btn-primary:hover { opacity: .9; }
.sp-btn-primary:disabled { opacity: .4; cursor: not-allowed; }
.sp-btn-outline { background: transparent; border-color: var(--border); color: var(--text); }
.sp-btn-outline:hover { border-color: var(--text2); background: var(--bg2); }

@media (max-width: 600px) {
  .sp-wrap { padding: 14px 16px 40px; }
  .sp-card-head { padding: 16px 18px; }
  .sp-card-head h1 { font-size: 19px; }
  .sp-card-body { padding: 16px 18px; }
}
`
