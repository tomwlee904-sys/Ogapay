import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import { apiRequest, getAccessToken } from '../lib/api'
import { uploadFile, type UploadedFile } from '../lib/upload'
import { openSignIn } from '../lib/signin'
import { useToast } from '../components/Toast'
import { TOPICS } from './FAQ'
import '../styles/support.css'

// Ported from the June support page. Its tickets went to /support/tickets, which
// the API never had, the search box did nothing and "Live chat" linked nowhere.
// Tickets now go to POST /reports/support and the search looks through the FAQ.

type Ticket = { id: string; subject: string | null; category: string; description: string; targetType: string | null; status: string; attachments?: string[]; createdAt: string; resolvedAt: string | null }
const MAX_ATTACH = 3

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
  reviewing: { label: 'In progress', cls: 'prog' },
  in_progress: { label: 'In progress', cls: 'prog' },
  resolved: { label: 'Resolved', cls: 'done' },
  dismissed: { label: 'Closed', cls: 'done' },
}
const blank = { subject: '', category: CATEGORIES[0], description: '', email: '' }

export default function Support() {
  const { toast } = useToast()
  const signedIn = !!getAccessToken()
  const [search, setSearch] = useState('')
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [ticketsFailed, setTicketsFailed] = useState(false)
  const [allTickets, setAllTickets] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [sending, setSending] = useState(false)
  // Up to 3 files (screenshots, bank receipts) uploaded before sending
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return
    const room = MAX_ATTACH - files.length
    if (room <= 0) return toast(`Up to ${MAX_ATTACH} files`, 'error')
    setUploading(true)
    try {
      for (const f of Array.from(list).slice(0, room)) {
        if (f.type.startsWith('image/') && f.size > 10 * 1024 * 1024) throw new Error(`${f.name}: pictures can be up to 10 MB`)
        const up = await uploadFile(f, 'support')
        setFiles((cur) => [...cur, up].slice(0, MAX_ATTACH))
      }
    } catch (e: any) { toast(e?.message || 'Upload failed', 'error') }
    setUploading(false)
  }
  // Priority Support (bought in the store): tickets go to the top of the queue
  const [priorityUntil, setPriorityUntil] = useState<string | null>(null)
  useEffect(() => {
    if (!signedIn) return
    apiRequest<{ kind: string; expiresAt: string | null }[]>('/store/my-perks')
      .then((l) => { const p = (l || []).filter((x) => x.kind === 'PRIORITY_SUPPORT').sort((x, y) => String(y.expiresAt).localeCompare(String(x.expiresAt)))[0]; setPriorityUntil(p?.expiresAt || null) })
      .catch(() => {})
  }, [signedIn])

  // A failed load says so, with Try again (it used to say "No tickets yet")
  const load = () => {
    setTicketsFailed(false)
    return apiRequest<Ticket[]>('/reports/mine').then((d) => setTickets(Array.isArray(d) ? d : [])).catch(() => setTicketsFailed(true))
  }
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
    if (!signedIn) { openSignIn(); return }
    setOpen(true)
  }

  const send = async () => {
    if (form.subject.trim().length < 3) return toast('Add a short subject (3+ characters)', 'error')
    if (form.description.trim().length < 10) return toast('Tell us a bit more (10+ characters)', 'error')
    setSending(true)
    try {
      const t = await apiRequest<{ priority?: boolean }>('/reports/support', { method: 'POST', body: JSON.stringify({ ...form, email: form.email.trim() || undefined, attachments: files.map((f) => f.url) }) })
      toast(t?.priority ? "Ticket sent. You have Priority Support, so it's at the top of our queue." : "Ticket sent. We'll reply by email within 24 hours.", 'success')
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

  return (
    <Layout>
      <div className="ui-page">
        <header className="ui-head">
          <div>
            <span className="ui-eyebrow">Help centre</span>
            <h1 className="ui-title">How can we help?</h1>
            <p className="ui-sub">Search the answers, or send us a ticket and we'll reply by email.</p>
            {priorityUntil && <p className="sp2-prio"><span className="oga-prem" style={{ marginLeft: 0 }}><i className="ti ti-bolt" aria-hidden="true" />Priority Support</span> until {new Date(priorityUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}: your tickets go to the top of our queue.</p>}
          </div>
        </header>

        <div className="sp2-search-wrap">
          <div className="ui-search">
            <i className="ti ti-search" aria-hidden="true" />
            <input className="ui-input" type="search" placeholder="e.g. withdrawal, refund, KYC" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search help" />
          </div>
          {search.trim().length >= 2 && (
            <div className="sp2-results">
              {results.length === 0 ? (
                <div className="sp2-none">No answers match. <button type="button" className="tap" onClick={startTicket}>Ask us instead</button></div>
              ) : results.map((r, i) => (
                <details key={i} className="sp2-res">
                  <summary><span>{r.q}</span><em>{r.topic.title}</em></summary>
                  <p>{r.a}</p>
                </details>
              ))}
            </div>
          )}
        </div>

        {/* Your tickets come first on phone and tablet; on desktop they sit in
            a side panel that stays in view */}
        <div className="ui-split sp2-layout">
          <div className="sp2-main">
            <section aria-labelledby="sp2-topics-h">
              <div className="sp2-h"><h2 id="sp2-topics-h" className="ui-h2">Help topics</h2><Link to="/docs" className="sp2-hlink tap">Browse all guides <i className="ti ti-arrow-right" aria-hidden="true" /></Link></div>
              <div className="sp2-grid">
                {HELP.map((h) => (
                  <Link key={h.id} to={`/faq#${h.id}`} className="ui-card sp2-topic">
                    <i className={`ti ${h.icon}`} aria-hidden="true" />
                    <div><strong>{h.title}</strong><span>{h.desc}</span></div>
                  </Link>
                ))}
              </div>
            </section>

            <section aria-labelledby="sp2-contact-h">
              <div className="sp2-h"><h2 id="sp2-contact-h" className="ui-h2">Contact us</h2></div>
              <div className="ui-card sp2-contact">
                <button type="button" className="sp2-c" onClick={startTicket}><i className="ti ti-ticket" aria-hidden="true" /><div><strong>Send a ticket</strong><span>We reply by email within 24 hours</span></div><i className="ti ti-chevron-right sp2-go" aria-hidden="true" /></button>
                <a className="sp2-c" href="mailto:support@ogapay.app"><i className="ti ti-mail" aria-hidden="true" /><div><strong>Email</strong><span>support@ogapay.app · replies within 24 hours</span></div><i className="ti ti-chevron-right sp2-go" aria-hidden="true" /></a>
              </div>
              <p className="sp2-follow">News and status updates (not for support requests): <a className="tap" href="https://x.com/Ogapayhq" target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-x" aria-hidden="true" /> @Ogapayhq</a> · <a className="tap" href="https://t.me/ogapayhq" target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" aria-hidden="true" /> Telegram channel</a></p>
            </section>
            <p className="sp2-warn"><i className="ti ti-shield-lock" aria-hidden="true" /> OgaPay staff will never ask for your password, PIN or one-time codes, or ask you to send money to "unlock" a payout.</p>
          </div>

          <aside className="ui-split-side ui-split-side-first">
            <section className="ui-card sp2-tickets" aria-labelledby="sp2-tickets-h">
              <div className="sp2-tickets-h">
                <h2 id="sp2-tickets-h">Your tickets</h2>
                {tickets && tickets.length > 0 && <span>{tickets.filter((t) => t.status === 'open' || t.status === 'reviewing' || t.status === 'in_progress').length} open</span>}
              </div>
              <button type="button" className="ui-btn ui-btn-dark sp2-new" onClick={startTicket}><i className="ti ti-plus" aria-hidden="true" /> New ticket</button>
              {!signedIn ? (
                <p className="sp2-tnote">Sign in to send a ticket and see our replies.</p>
              ) : ticketsFailed ? (
                <div className="sp2-tfail"><LoadError what="your tickets" onRetry={load} /></div>
              ) : tickets === null ? (
                <div className="ui-sk" style={{ height: 120, marginTop: 12 }} aria-busy="true" aria-label="Loading your tickets" />
              ) : tickets.length === 0 ? (
                <p className="sp2-tnote">Tickets you send appear here with their status. We reply by email within 24 hours.</p>
              ) : (
                <>
                  <div className="sp2-list">
                    {(allTickets ? tickets : tickets.slice(0, 3)).map((t) => {
                      const st = STATUS[t.status] || { label: t.status, cls: 'open' }
                      return (
                        <div key={t.id} className="sp2-t">
                          <div className="sp2-t-main">
                            <strong>{t.subject || (t.targetType && t.targetType !== 'support' ? `Report: ${t.category}` : t.category)}</strong>
                            <span>{t.category} · #{t.id.slice(0, 8).toUpperCase()} · {new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{t.attachments?.length ? ` · ${t.attachments.length} ${t.attachments.length === 1 ? 'file' : 'files'}` : ''}</span>
                          </div>
                          <span className={`sp2-st ${st.cls}`}>{st.label}</span>
                        </div>
                      )
                    })}
                  </div>
                  {tickets.length > 3 && <button type="button" className="ui-btn ui-btn-text sp2-all" onClick={() => setAllTickets((v) => !v)}>{allTickets ? 'Show fewer' : `Show all ${tickets.length} tickets`}</button>}
                </>
              )}
            </section>
          </aside>
        </div>
      </div>

      {open && (
        <div className="sp2-overlay" onClick={() => setOpen(false)}>
          <div className="ui-card sp2-modal" role="dialog" aria-modal="true" aria-labelledby="sp2-title" onClick={(e) => e.stopPropagation()}>
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
                <label className="ui-btn ui-btn-ghost sp2-attach">
                  <i className="ti ti-paperclip" /> {uploading ? 'Uploading…' : 'Attach a file'}
                  <input type="file" multiple hidden disabled={uploading} accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime,.txt,.csv,.md,text/plain,text/csv" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
                </label>
              )}
            </div>
            <label className="sp2-f"><span>Reply to a different email (optional)</span>
              <input type="email" value={form.email} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="We use your account email otherwise" />
            </label>
            <div className="sp2-actions">
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="ui-btn ui-btn-dark" onClick={send} disabled={sending || uploading}>{sending ? 'Sending…' : 'Send ticket'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
