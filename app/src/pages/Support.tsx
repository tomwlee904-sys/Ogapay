import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import { useToast } from '../components/Toast'
import { TOPICS } from './FAQ'
import '../styles/profile-public.css'
import '../styles/support.css'

// Ported from the June support page. Its tickets went to /support/tickets, which
// the API never had, the search box did nothing and "Live chat" linked nowhere.
// Tickets now go to POST /reports/support and the search looks through the FAQ.

type Ticket = { id: string; subject: string | null; category: string; description: string; targetType: string | null; status: string; createdAt: string; resolvedAt: string | null }

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
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [sending, setSending] = useState(false)

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
    if (!signedIn) { openSignIn(); return }
    setOpen(true)
  }

  const send = async () => {
    if (form.subject.trim().length < 3) return toast('Add a short subject (3+ characters)', 'error')
    if (form.description.trim().length < 10) return toast('Tell us a bit more (10+ characters)', 'error')
    setSending(true)
    try {
      await apiRequest('/reports/support', { method: 'POST', body: JSON.stringify({ ...form, email: form.email.trim() || undefined }) })
      toast("Ticket sent. We'll reply by email within 24 hours.", 'success')
      setOpen(false)
      setForm(blank)
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
      <div className="up-wrap">
        <div className="sp2-hero up-card">
          <h1>How can we help?</h1>
          <p>Search the help centre, or send us a ticket and we'll reply by email.</p>
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

        <div className="up-sec-h sp2-h"><h2>Help topics</h2></div>
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
          <a className="up-card sp2-c" href="https://t.me/ogapay" target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" /><div><strong>Telegram</strong><span>Community group and announcements</span></div></a>
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
                <div key={t.id} className="sp2-t">
                  <div className="sp2-t-main">
                    <strong>{t.subject || (t.targetType && t.targetType !== 'support' ? `Report: ${t.category}` : t.category)}</strong>
                    <span>{t.category} · #{t.id.slice(0, 8).toUpperCase()} · {new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <span className={`sp2-st ${st.cls}`}>{st.label}</span>
                </div>
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
            <label className="sp2-f"><span>Reply to a different email (optional)</span>
              <input type="email" value={form.email} maxLength={200} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="We use your account email otherwise" />
            </label>
            <div className="sp2-actions">
              <button className="up-btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="up-btn primary" onClick={send} disabled={sending}>{sending ? 'Sending…' : 'Send ticket'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
