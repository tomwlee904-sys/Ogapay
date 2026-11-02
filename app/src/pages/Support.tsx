import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { apiRequest, getAccessToken } from '../lib/api'
import { uploadFile, type UploadedFile } from '../lib/upload'
import { openSignIn } from '../lib/signin'
import { useToast } from '../components/Toast'
import { TOPICS } from './FAQ'
import '../styles/profile-public.css'
import '../styles/support.css'

// Ported from the June support page. Its tickets went to /support/tickets, which
// the API never had, the search box did nothing and "Live chat" linked nowhere.
// Tickets now go to POST /reports/support and the search looks through the FAQ.

// (2026-11-02) A ticket opens to the whole conversation: the member's message,
// every reply from the team with its time, and a box to write back (which
// reopens a resolved ticket). Notifications link here with ?ticket=<id>.
type Ticket = { id: string; subject: string | null; category: string; description: string; targetType: string | null; status: string; attachments?: string[]; createdAt: string; resolvedAt: string | null; replies?: number; lastReplyAt?: string | null }
type TicketMessage = { id: string; fromTeam: boolean; body: string; attachments?: string[]; createdAt: string }
type TicketFull = Ticket & { email?: string | null; messages: TicketMessage[] }
const MAX_ATTACH = 3
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const CLOSED = ['resolved', 'dismissed']

function FileLinks({ urls }: { urls?: string[] }) {
  if (!urls?.length) return null
  return (
    <p className="sp2-msg-files">
      {urls.map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow"><i className="ti ti-paperclip" aria-hidden="true" /> File {i + 1}</a>)}
    </p>
  )
}

const HELP = [
  { id: 'withdrawals', icon: 'ti-building-bank', title: 'Withdrawals', desc: 'Bank and wallet payouts, limits, delays' },
  { id: 'wallet', icon: 'ti-wallet', title: 'Deposits and wallet', desc: 'Funding, balances, transfers' },
  { id: 'earning', icon: 'ti-clipboard-check', title: 'Earning and tasks', desc: 'Applying, proof, approvals' },
  { id: 'posting', icon: 'ti-briefcase', title: 'Posting jobs', desc: 'Escrow, reviewing work, refunds' },
  { id: 'kyc', icon: 'ti-shield-check', title: 'KYC and trust', desc: 'Verification tiers, OgaScore' },
  { id: 'referrals', icon: 'ti-affiliate', title: 'Referrals', desc: 'Invite links and bonuses' },
]
const CATEGORIES = ['Payments and withdrawals', 'Account and login', 'Tasks and submissions', 'Posting jobs', 'KYC and verification', 'Referrals', 'Store', 'Something else']
const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'open' },
  in_review: { label: 'In progress', cls: 'prog' },
  reviewing: { label: 'In progress', cls: 'prog' },
  in_progress: { label: 'In progress', cls: 'prog' },
  resolved: { label: 'Resolved', cls: 'done' },
  dismissed: { label: 'Closed', cls: 'done' },
}
const blank = { subject: '', category: CATEGORIES[0], description: '', email: '' }

export default function Support() {
  const { toast } = useToast()
  // (2026-11-02) From the sign-in state, so signing in on this page (from the
  // ticket link in a support email, say) redraws it and loads the ticket. The
  // saved token covers the moment before the account has loaded.
  const { isAuthed } = useAuth()
  const signedIn = isAuthed || !!getAccessToken()
  // Back to this page and the open ticket after signing in (Google too)
  const location = useLocation()
  const signIn = () => openSignIn({ redirect: location.pathname + location.search })
  const [search, setSearch] = useState('')
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [sending, setSending] = useState(false)
  // Up to 3 files (screenshots, bank receipts) uploaded before sending
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  // Uploads into the new ticket's files or a reply's files
  const uploadInto = async (list: FileList | null, have: UploadedFile[], set: Dispatch<SetStateAction<UploadedFile[]>>) => {
    if (!list?.length) return
    const room = MAX_ATTACH - have.length
    if (room <= 0) return toast(`Up to ${MAX_ATTACH} files`, 'error')
    setUploading(true)
    try {
      for (const f of Array.from(list).slice(0, room)) {
        if (f.type.startsWith('image/') && f.size > 10 * 1024 * 1024) throw new Error(`${f.name}: pictures can be up to 10 MB`)
        const up = await uploadFile(f, 'support')
        set((cur) => [...cur, up].slice(0, MAX_ATTACH))
      }
    } catch (e: any) { toast(e?.message || 'Upload failed', 'error') }
    setUploading(false)
  }
  const addFiles = (list: FileList | null) => uploadInto(list, files, setFiles)

  // One ticket open with its conversation (?ticket=<id>, so a notification can
  // link straight to it and the phone's back button closes it)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const viewId = params.get('ticket')
  const openedHere = useRef(false)
  const [view, setView] = useState<TicketFull | null>(null)
  const [viewErr, setViewErr] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState<UploadedFile[]>([])
  const [replying, setReplying] = useState(false)
  const openTicket = (id: string) => { openedHere.current = true; setParams({ ticket: id }) }
  const closeView = () => {
    if (openedHere.current) { openedHere.current = false; navigate(-1) } else setParams({}, { replace: true })
  }
  useEffect(() => {
    setView(null); setViewErr(''); setReplyText(''); setReplyFiles([])
    if (!viewId) { openedHere.current = false; return }
    if (!signedIn) return
    let live = true
    apiRequest<TicketFull>(`/reports/mine/${encodeURIComponent(viewId)}`)
      .then((t) => { if (live) setView(t) })
      .catch((e: any) => { if (live) setViewErr(e?.message || "Couldn't open this ticket") })
    return () => { live = false }
  }, [viewId, signedIn])

  const sendReply = async () => {
    if (!view) return
    if (replyText.trim().length < 2) return toast('Write your reply first', 'error')
    setReplying(true)
    try {
      const r = await apiRequest<{ message: TicketMessage; status: string; reopened: boolean }>(`/reports/mine/${view.id}/reply`, {
        method: 'POST', body: JSON.stringify({ body: replyText.trim(), attachments: replyFiles.map((f) => f.url) }),
      })
      setView((v) => (v ? { ...v, status: r.status, messages: [...v.messages, r.message] } : v))
      setReplyText(''); setReplyFiles([])
      toast(r.reopened ? "Reply sent. We've reopened your ticket and the team will look again." : 'Reply sent', 'success')
      load()
    } catch (e: any) {
      toast(e?.message || "Couldn't send your reply", 'error')
    }
    setReplying(false)
  }
  // Priority Support (bought in the store): tickets go to the top of the queue
  const [priorityUntil, setPriorityUntil] = useState<string | null>(null)
  useEffect(() => {
    if (!signedIn) return
    apiRequest<{ kind: string; expiresAt: string | null }[]>('/store/my-perks')
      .then((l) => { const p = (l || []).filter((x) => x.kind === 'PRIORITY_SUPPORT').sort((x, y) => String(y.expiresAt).localeCompare(String(x.expiresAt)))[0]; setPriorityUntil(p?.expiresAt || null) })
      .catch(() => {})
  }, [signedIn])

  const load = () => apiRequest<Ticket[]>('/reports/mine').then((d) => setTickets(Array.isArray(d) ? d : [])).catch(() => setTickets([]))
  useEffect(() => { if (signedIn) load() }, [signedIn])

  // Search the help centre answers as you type
  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return []
    const words = q.split(/\s+/)
    return TOPICS.flatMap((t) => t.items.map((it) => ({ topic: t, ...it })))
      .filter((it) => words.every((w) => `${it.q} ${it.a}`.toLowerCase().includes(w)))
      // Questions that mention the words first, then answers that do
      .sort((a, b) => Number(words.every((w) => b.q.toLowerCase().includes(w))) - Number(words.every((w) => a.q.toLowerCase().includes(w))))
      .slice(0, 6)
  }, [search])

  const startTicket = () => {
    if (!signedIn) { signIn(); return }
    setOpen(true)
  }

  const send = async () => {
    if (form.subject.trim().length < 3) return toast('Add a short subject (3+ characters)', 'error')
    if (form.description.trim().length < 10) return toast('Tell us a bit more (10+ characters)', 'error')
    setSending(true)
    try {
      const t = await apiRequest<{ priority?: boolean }>('/reports/support', { method: 'POST', body: JSON.stringify({ ...form, email: form.email.trim() || undefined, attachments: files.map((f) => f.url) }) })
      toast(t?.priority ? "Ticket sent. You have Priority Support, so it's at the top of our queue." : "Ticket sent. We'll reply here in My tickets and by email, usually within 24 hours.", 'success')
      setOpen(false)
      setForm(blank)
      setFiles([])
      load()
    } catch (e: any) {
      toast(e?.message || "Couldn't send your ticket", 'error')
    }
    setSending(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const closeRef = useRef(closeView)
  closeRef.current = closeView
  useEffect(() => {
    if (!viewId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewId])
  const viewSt = view ? STATUS[view.status] || { label: view.status, cls: 'open' } : null
  const viewClosed = !!view && CLOSED.includes(view.status)
  const teamReplied = !!view?.messages.some((m) => m.fromTeam)

  return (
    <Layout>
      <div className="up-wrap">
        <div className="sp2-hero up-card">
          <h1>How can we help?</h1>
          {priorityUntil && <p style={{ margin: '6px 0 0', textAlign: 'center' }}><span className="oga-prem" style={{ marginLeft: 0 }}><i className="ti ti-bolt" />Priority Support</span> <span style={{ fontSize: 13, color: 'var(--text2)' }}>until {new Date(priorityUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}: your tickets go to the top of our queue.</span></p>}
          <p>Search the help centre, or send us a ticket. We'll reply in My tickets and by email.</p>
          <label className="sp2-search">
            <i className="ti ti-search" />
            <input type="search" placeholder="e.g. withdrawal pending, refund, KYC" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search help" />
          </label>
          {search.trim().length >= 2 && (
            <div className="sp2-results">
              {results.length === 0 ? (
                <div className="sp2-none">No answers match. <button onClick={startTicket}>Ask us instead</button></div>
              ) : results.map((r, i) => (
                <details key={i} className="sp2-res">
                  <summary><span>{r.q}</span><em>{r.topic.title}</em></summary>
                  <p>{r.a}</p>
                </details>
              ))}
            </div>
          )}
        </div>

        <div className="up-sec-h sp2-h" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}><h2>Help topics</h2><Link to="/docs" className="tap" style={{ fontSize: 13, color: 'var(--text2)' }}>Browse all guides <i className="ti ti-arrow-right" aria-hidden="true" /></Link></div>
        <div className="sp2-grid">
          {HELP.map((h) => (
            <Link key={h.id} to={`/faq#${h.id}`} className="up-card sp2-topic">
              <i className={`ti ${h.icon}`} />
              <div><strong>{h.title}</strong><span>{h.desc}</span></div>
            </Link>
          ))}
        </div>

        <div className="up-sec-h sp2-h"><h2>Contact us</h2></div>
        <div className="sp2-contact">
          <a className="up-card sp2-c" href="mailto:support@ogapay.app"><i className="ti ti-mail" /><div><strong>Email</strong><span>support@ogapay.app · replies within 24 hours</span></div></a>
          <a className="up-card sp2-c" href="https://t.me/ogapayhq" target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" /><div><strong>Telegram</strong><span>Our channel: announcements and new jobs</span></div></a>
          <a className="up-card sp2-c" href="https://x.com/Ogapayhq" target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-x" /><div><strong>X (Twitter)</strong><span>@Ogapayhq · status updates</span></div></a>
        </div>
        <p className="sp2-warn"><i className="ti ti-shield-lock" /> OgaPay staff will never ask for your password, PIN or one-time codes, or ask you to send money to "unlock" a payout.</p>

        <div className="sp2-tickets-h">
          <h2>My tickets</h2>
          <button className="up-btn primary" onClick={startTicket}><i className="ti ti-plus" /> New ticket</button>
        </div>
        {!signedIn ? (
          <div className="up-empty"><i className="ti ti-lock" />Sign in to send a ticket and see your replies.</div>
        ) : tickets === null ? (
          <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="up-empty"><i className="ti ti-ticket" />No tickets yet.</div>
        ) : (
          <section className="up-card sp2-list">
            {tickets.map((t) => {
              const st = STATUS[t.status] || { label: t.status, cls: 'open' }
              return (
                <button key={t.id} type="button" className="sp2-t sp2-t-btn" onClick={() => openTicket(t.id)} aria-label={`Open ticket: ${t.subject || t.category}`}>
                  <div className="sp2-t-main">
                    <strong>{t.subject || (t.targetType && t.targetType !== 'support' ? `Report: ${t.category}` : t.category)}</strong>
                    <span>{t.category} · #{t.id.slice(0, 8).toUpperCase()} · {new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{t.attachments?.length ? ` · ${t.attachments.length} ${t.attachments.length === 1 ? 'file' : 'files'}` : ''}{t.replies ? ` · ${t.replies} ${t.replies === 1 ? 'reply' : 'replies'}` : ''}</span>
                  </div>
                  <span className={`sp2-st ${st.cls}`}>{st.label}</span>
                  <i className="ti ti-chevron-right sp2-t-go" aria-hidden="true" />
                </button>
              )
            })}
          </section>
        )}
      </div>

      {open && (
        <div className="sp2-overlay" onClick={() => setOpen(false)}>
          <div className="up-card sp2-modal" role="dialog" aria-modal="true" aria-labelledby="sp2-title" onClick={(e) => e.stopPropagation()}>
            <div className="sp2-modal-h">
              <h2 id="sp2-title">New support ticket</h2>
              <button className="sp2-x" onClick={() => setOpen(false)} aria-label="Close"><i className="ti ti-x" /></button>
            </div>
            <label className="sp2-f"><span>Subject</span>
              <input value={form.subject} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="e.g. Withdrawal pending for 2 days" autoFocus />
            </label>
            <label className="sp2-f"><span>Topic</span>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="sp2-f"><span>What happened?</span>
              <textarea value={form.description} maxLength={5000} rows={6} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Include the job, amount or reference if it's about money. Never share your password or PIN." />
              <small>{form.description.length}/5000</small>
            </label>
            <div className="sp2-f">
              <span>Attachments (optional)</span>
              <small style={{ textAlign: 'left' }}>Include a job link, transaction reference or screenshot. Up to {MAX_ATTACH} files: pictures up to 10 MB, PDFs, videos and text files up to 25 MB.</small>
              {files.length > 0 && (
                <ul className="sp2-files">
                  {files.map((f, i) => (
                    <li key={f.url}>
                      <i className={`ti ${f.type === 'image' ? 'ti-photo' : f.type === 'pdf' ? 'ti-file-type-pdf' : f.type === 'video' ? 'ti-movie' : 'ti-file-text'}`} aria-hidden="true" />
                      <span>{f.name}</span>
                      <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}><i className="ti ti-x" /></button>
                    </li>
                  ))}
                </ul>
              )}
              {files.length < MAX_ATTACH && (
                <label className="up-btn sp2-attach">
                  <i className="ti ti-paperclip" /> {uploading ? 'Uploading…' : 'Attach a file'}
                  <input type="file" multiple hidden disabled={uploading} accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime,.txt,.csv,.md,text/plain,text/csv" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
                </label>
              )}
            </div>
            <label className="sp2-f"><span>Reply to a different email (optional)</span>
              <input type="email" value={form.email} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="We use your account email otherwise" />
            </label>
            <div className="sp2-actions">
              <button className="up-btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="up-btn primary" onClick={send} disabled={sending || uploading}>{sending ? 'Sending…' : 'Send ticket'}</button>
            </div>
          </div>
        </div>
      )}

      {viewId && (
        <div className="sp2-overlay" onClick={closeView}>
          <div className="up-card sp2-modal sp2-thread" role="dialog" aria-modal="true" aria-labelledby="sp2-view-title" onClick={(e) => e.stopPropagation()}>
            <div className="sp2-modal-h">
              <h2 id="sp2-view-title">{view ? view.subject || view.category : 'Your ticket'}</h2>
              <button className="sp2-x" onClick={closeView} aria-label="Close"><i className="ti ti-x" /></button>
            </div>
            {!signedIn ? (
              <div className="up-empty"><i className="ti ti-lock" />Sign in to see this ticket. <button className="up-btn" style={{ marginTop: 10 }} onClick={signIn}>Sign in</button></div>
            ) : viewErr ? (
              <div className="up-empty"><i className="ti ti-alert-circle" />{viewErr}</div>
            ) : !view ? (
              <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
            ) : (
              <>
                <p className="sp2-thread-meta">
                  <span>{view.category} · #{view.id.slice(0, 8).toUpperCase()}</span>
                  {viewSt && <span className={`sp2-st ${viewSt.cls}`}>{viewSt.label}</span>}
                </p>
                <ol className="sp2-msgs" aria-label="Conversation">
                  <li className="sp2-msg">
                    <div className="sp2-msg-h"><strong>You</strong><time dateTime={view.createdAt}>{when(view.createdAt)}</time></div>
                    <p>{view.description}</p>
                    <FileLinks urls={view.attachments} />
                  </li>
                  {view.messages.map((m) => (
                    <li key={m.id} className={`sp2-msg${m.fromTeam ? ' team' : ''}`}>
                      <div className="sp2-msg-h"><strong>{m.fromTeam ? <><i className="ti ti-headset" aria-hidden="true" /> OgaPay support</> : 'You'}</strong><time dateTime={m.createdAt}>{when(m.createdAt)}</time></div>
                      <p>{m.body}</p>
                      <FileLinks urls={m.attachments} />
                    </li>
                  ))}
                </ol>
                {!teamReplied && (
                  <p className="sp2-warn sp2-note">
                    <i className="ti ti-info-circle" />
                    {viewClosed
                      ? `Our team marked this ${view.status === 'resolved' ? 'resolved' : 'closed'} without writing a reply. Sorry about that. If it isn't sorted, reply below and we'll look at it again.`
                      : `We usually reply within 24 hours. You'll get a notification${view.email ? ` and an email at ${view.email}` : ' and an email'} when we do.`}
                  </p>
                )}
                <label className="sp2-f"><span>{viewClosed ? "Still not sorted? Reply and we'll reopen your ticket" : 'Add a reply'}</span>
                  <textarea value={replyText} maxLength={5000} rows={4} onChange={(e) => setReplyText(e.target.value)} placeholder={viewClosed ? 'Tell us what is still wrong' : 'Anything else we should know?'} />
                  <small>{replyText.length}/5000</small>
                </label>
                {replyFiles.length > 0 && (
                  <ul className="sp2-files">
                    {replyFiles.map((f, i) => (
                      <li key={f.url}>
                        <i className={`ti ${f.type === 'image' ? 'ti-photo' : f.type === 'pdf' ? 'ti-file-type-pdf' : f.type === 'video' ? 'ti-movie' : 'ti-file-text'}`} aria-hidden="true" />
                        <span>{f.name}</span>
                        <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setReplyFiles((cur) => cur.filter((_, j) => j !== i))}><i className="ti ti-x" /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="sp2-actions sp2-reply-actions">
                  {replyFiles.length < MAX_ATTACH && (
                    <label className="up-btn sp2-attach">
                      <i className="ti ti-paperclip" /> {uploading ? 'Uploading…' : 'Attach'}
                      <input type="file" multiple hidden disabled={uploading} accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime,.txt,.csv,.md,text/plain,text/csv" onChange={(e) => { uploadInto(e.target.files, replyFiles, setReplyFiles); e.target.value = '' }} />
                    </label>
                  )}
                  <button className="up-btn primary" onClick={sendReply} disabled={replying || uploading || replyText.trim().length < 2}>
                    {replying ? 'Sending…' : viewClosed ? 'Reply and reopen' : 'Send reply'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
