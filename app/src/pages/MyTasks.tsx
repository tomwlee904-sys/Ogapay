import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import WorkNav from '../components/WorkNav'
import { ordinal } from '../components/ContestPanel'
import { apiRequest } from '../lib/api'
import { categoryLabel } from '../lib/categories'
import { useMoney } from '../lib/useMoney'
import '../styles/my-tasks.css'
import { PayoutCheckStatus } from '../components/PayoutCheck'

// Jobs you've taken as a worker and where each one stands. Rows open the submit
// page, which shows the next step (send work, wait for review, result). The old
// page had made-up "% complete" bars, no links and no page margins.
// Layout: a place you hold (with its countdown) and the totals come first (the
// side panel on desktop), then one row of filter chips and the list. The totals
// are numbers only: the chips are the one filter control.
// Contests: a contest's reward is its 1st prize, so a 2nd place used to show the
// 1st prize, and entries that didn't win showed "In review" forever. The server
// now sends each entry's place, its prize and the result. Amounts paid and the
// earned totals are the payments actually made, one total per currency.

type Sub = {
  id: string; status: string; taskId: string; createdAt: string; submittedAt?: string | null; reviewedAt?: string | null
  autoApproveAt?: string | null; posterNotes?: string | null
  // Social jobs with a payout check: WAITING until payoutCheckDueAt, then the result
  payoutCheck?: string | null; payoutCheckDueAt?: string | null; payoutCheckReason?: string | null
  isContest?: boolean; place?: number | null; prize?: number | null; winnersPaidAt?: string | null
  paidAmount?: number | null; contestResult?: 'WON' | 'NOT_PLACED' | 'WAITING' | null
  // A taken place with no work sent yet: when it is freed (15 minutes on quick
  // social jobs, 24 / 72 hours on custom jobs)
  holdEndsAt?: string | null
  task?: {
    id: string; title: string; reward: number | string; currency?: string; category?: string; poster?: { username?: string | null }
    expiresAt?: string | null; deadline?: string | null; winnersDueAt?: string | null
    // A random-draw contest: nobody picks, the winners are drawn when entries close
    randomDraw?: boolean
  }
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'To do', cls: 'todo' }, SUBMITTED: { label: 'In review', cls: 'wait' },
  APPROVED: { label: 'Paid', cls: 'ok' }, REJECTED: { label: 'Not approved', cls: 'bad' },
  DISPUTED: { label: 'In dispute', cls: 'wait' }, EXPIRED: { label: 'Slot released', cls: '' },
}
const notPlaced = (s: Sub) => s.contestResult === 'NOT_PLACED'
const endsAt = (s: Sub) => s.task?.expiresAt || s.task?.deadline || null
const ended = (s: Sub) => { const e = endsAt(s); return !!e && new Date(e).getTime() <= Date.now() }
// A contest slot taken but never sent, once an entry can't be sent any more:
// the end date has passed (the winners may not be picked yet: the job stays
// open for up to 3 days while they are), or the winners were paid. It used to
// stay under "To do" with a send-before time that had already gone.
const unsent = (s: Sub) => !!s.isContest && !s.submittedAt && s.contestResult !== 'WON'
  && (notPlaced(s) || (s.status === 'PENDING' && ended(s)))
// Out of the running: didn't place, or no entry was sent in time
const out = (s: Sub) => notPlaced(s) || unsent(s)
// Every place can be awarded before the end date, which closes the contest
// early, so "entries have closed" isn't always why
const awardedEarly = (s: Sub) => { const e = endsAt(s); return !!s.winnersPaidAt && !!e && new Date(s.winnersPaidAt).getTime() < new Date(e).getTime() }
const unsentText = (s: Sub) => awardedEarly(s) ? 'All the places were awarded before you sent an entry.' : "Entries have closed. You didn't send an entry."
const TABS = [
  { id: 'all', label: 'All', test: () => true },
  // Open: still to do or waiting for review (the totals header's "Open")
  { id: 'open', label: 'Open', test: (s: Sub) => ['PENDING', 'SUBMITTED', 'DISPUTED'].includes(s.status) && !out(s) },
  { id: 'todo', label: 'To do', test: (s: Sub) => s.status === 'PENDING' && !out(s) },
  // Places you hold and the time left on each (Claimed places)
  { id: 'claimed', label: 'Claimed places', test: (s: Sub) => !!s.holdEndsAt && s.status === 'PENDING' && !out(s) },
  { id: 'review', label: 'In review', test: (s: Sub) => (s.status === 'SUBMITTED' || s.status === 'DISPUTED') && !out(s) },
  { id: 'won', label: 'Won', test: (s: Sub) => s.contestResult === 'WON' },
  { id: 'paid', label: 'Paid', test: (s: Sub) => s.status === 'APPROVED' },
  { id: 'lost', label: "Didn't place", test: out },
  { id: 'closed', label: 'Not approved', test: (s: Sub) => (s.status === 'REJECTED' || s.status === 'EXPIRED') && !out(s) },
]

// "14:59" for under an hour, else "5h 20m"
const left = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000))
  if (sec < 3600) return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  const h = Math.floor(sec / 3600)
  return `${h}h ${Math.floor((sec % 3600) / 60)}m`
}

const day = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
const when = (d?: string | null) => d ? new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

// The status pill: contests have their own results
function badge(s: Sub): { label: string; cls: string; icon?: string } {
  if (s.contestResult === 'WON') return { label: 'Won', cls: 'won', icon: 'ti-trophy' }
  if (unsent(s)) return { label: 'Not sent', cls: '' }
  if (s.contestResult === 'NOT_PLACED') return { label: "Didn't place", cls: '' }
  if (s.isContest && s.status === 'SUBMITTED') return { label: 'Entered', cls: 'wait' }
  return STATUS[s.status] || { label: s.status.toLowerCase(), cls: '' }
}

export default function MyTasks() {
  const show = useMoney()
  const [subs, setSubs] = useState<Sub[] | null>(null)
  const [failed, setFailed] = useState(false)
  // One total per currency: naira and USDC are never added together
  const [earned, setEarned] = useState<Record<string, number>>({})
  const [tab, setTab] = useState('all')
  // Ticks every second while a place is held, for the countdowns
  const [now, setNow] = useState(() => Date.now())
  const holding = (subs || []).some((s) => s.holdEndsAt && s.status === 'PENDING')
  useEffect(() => {
    if (!holding) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [holding])
  const holdText = (s: Sub) => {
    const ms = new Date(s.holdEndsAt as string).getTime() - now
    return ms > 0 ? `Place held for ${left(ms)} · send your proof before then or it goes to someone else` : 'Your time ran out · the place is being freed'
  }

  // A failed request shows "couldn't load" with Try again, never "no jobs yet"
  const load = useCallback(() => {
    setFailed(false)
    setSubs(null)
    apiRequest<{ submissions: Sub[]; stats?: { totalEarned?: number; earned?: Record<string, number> } }>('/tasks/my/submissions')
      .then((d) => {
        setSubs(d?.submissions || [])
        setEarned(d?.stats?.earned || { NGN: Number(d?.stats?.totalEarned || 0) })
      })
      .catch(() => setFailed(true))
  }, [])
  useEffect(() => { load() }, [load])

  const list = subs || []
  const shown = list.filter((TABS.find((t) => t.id === tab) || TABS[0]).test)
  const count = (id: string) => list.filter(TABS.find((t) => t.id === id)!.test).length
  // Naira first, then the rest; ₦0 when nothing is paid yet
  const totals = Object.entries(earned).filter(([, v]) => Number(v) > 0).sort(([a], [b]) => (a === 'NGN' ? -1 : b === 'NGN' ? 1 : a.localeCompare(b)))
  // Places you hold right now, the one running out first on top
  const held = list
    .filter((s) => s.holdEndsAt && s.status === 'PENDING' && !out(s) && new Date(s.holdEndsAt).getTime() > now)
    .sort((a, b) => new Date(a.holdEndsAt as string).getTime() - new Date(b.holdEndsAt as string).getTime())

  // What a row pays: the money you got once paid, otherwise what the job offers
  const paid = (s: Sub) => Number(s.paidAmount ?? s.prize ?? s.task?.reward ?? 0)
  const cur = (s: Sub) => s.task?.currency || 'NGN'

  function detail(s: Sub) {
    if (s.contestResult === 'WON') return `Won ${ordinal(s.place || 1)} place: ${show(paid(s), cur(s), { exact: true })}`
    if (unsent(s)) return unsentText(s)
    if (s.contestResult === 'NOT_PLACED') return `The winners were paid${s.winnersPaidAt ? ` on ${day(s.winnersPaidAt)}` : ''} and this entry didn't place`
    if (s.isContest && s.status === 'PENDING') return endsAt(s) ? `Send your entry before ${when(endsAt(s))}` : 'Send your entry before the contest ends'
    if (s.isContest && s.status === 'SUBMITTED' && s.task?.randomDraw) {
      return ended(s)
        ? 'Entries have closed · winners are drawn at random within 15 minutes'
        : `Entry sent ${day(s.submittedAt || s.createdAt)} · winners are drawn at random when it closes`
    }
    if (s.isContest && s.status === 'SUBMITTED') {
      return ended(s)
        ? `Entries have closed · winners are picked${s.task?.winnersDueAt ? ` by ${when(s.task.winnersDueAt)}` : ' soon'}`
        : `Entry sent ${day(s.submittedAt || s.createdAt)} · winners are picked after ${endsAt(s) ? when(endsAt(s)) : 'it ends'}`
    }
    switch (s.status) {
      case 'PENDING': if (s.holdEndsAt) return holdText(s)
        return 'Send your work when it\'s done'
      case 'SUBMITTED': return s.autoApproveAt ? `Sent ${day(s.submittedAt || s.createdAt)} · paid automatically ${when(s.autoApproveAt)} if not reviewed` : `Sent ${day(s.submittedAt || s.createdAt)}`
      case 'APPROVED': return `Approved${s.reviewedAt ? ` ${day(s.reviewedAt)}` : ''}`
      case 'REJECTED': return `Not approved${s.reviewedAt ? ` ${day(s.reviewedAt)}` : ''}`
      case 'EXPIRED': return 'No work was sent in time, so the slot was released'
      case 'DISPUTED': return 'Our team is reviewing this'
      default: return ''
    }
  }

  // The amount on the right: what you were paid, the prize on offer, or nothing
  function amount(s: Sub) {
    if (s.status === 'APPROVED') return <b className="paid">{show(paid(s), cur(s), { exact: true })}</b>
    if (out(s)) return null
    if (s.isContest) return <b>Up to {show(Number(s.task?.reward || 0), cur(s))}</b>
    return <b>{show(Number(s.task?.reward || 0), cur(s))}</b>
  }

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <span className="ui-eyebrow">Working</span>
            <h1 className="ui-title">My tasks</h1>
            <p className="ui-sub">Jobs you've taken and where each one stands.</p>
          </div>
          {/* Desktop only: phone and tablet have Jobs in the bottom bar, and an
              empty list has its own button */}
          {list.length > 0 && <div className="ui-actions mt2-desk"><Link className="ui-btn ui-btn-ghost" to="/tasks"><i className="ti ti-search" aria-hidden="true" /> Find work</Link></div>}
        </div>
        <WorkNav />

        {failed ? (
          <div className="mt2-body"><LoadError what="your tasks" onRetry={load} /></div>
        ) : subs === null ? <div className="ui-sk mt2-body" style={{ height: 240 }} /> : list.length === 0 ? (
          <div className="ui-empty mt2-body mt2-empty">
            <strong>No jobs taken yet</strong>
            Jobs you take show here, with where each one stands and what it pays.
            <ol className="mt2-steps">
              <li><b>Take a job</b><span>Pick one you can do and take a place.</span></li>
              <li><b>Send your proof</b><span>Show the finished work before your time runs out.</span></li>
              <li><b>Get paid</b><span>The money goes to your wallet when the work is approved.</span></li>
            </ol>
            <Link className="ui-btn ui-btn-dark" to="/tasks"><i className="ti ti-search" aria-hidden="true" /> Find jobs</Link>
          </div>
        ) : (
          <div className="ui-split mt2-body">
            <aside className="ui-split-side ui-split-side-first mt2-side" aria-label="Your totals">
              {held.slice(0, 3).map((s) => (
                <section className="mt2-held" key={s.id} aria-label="Place held">
                  <div className="mt2-held-top">
                    <span className="mt2-held-ic"><i className="ti ti-hourglass" aria-hidden="true" /></span>
                    <div>
                      <span className="mt2-held-k">Place held · send your proof in</span>
                      <b className="mt2-held-time">{left(new Date(s.holdEndsAt as string).getTime() - now)}</b>
                    </div>
                  </div>
                  <strong className="mt2-held-title">{s.task?.title || 'Job'}</strong>
                  <span className="mt2-held-sub">If you don't send it in time, the place goes to someone else.</span>
                  <Link className="ui-btn ui-btn-dark mt2-held-go" to={`/tasks/${s.taskId}/submit`}><i className="ti ti-upload" aria-hidden="true" /> Send proof</Link>
                </section>
              ))}
              {/* Totals, numbers only (the chips filter the list) */}
              <div className="ui-stats mt2-stats">
                <div>
                  <span className="ui-stats-label">Earned</span>
                  <b className="ui-stats-value">{totals.length === 0 ? show(0, 'NGN', { exact: true }) : show(Number(totals[0][1]), totals[0][0], { exact: true })}</b>
                  {totals.slice(1).map(([c, v]) => <span className="mt2-more" key={c}>+ {show(Number(v), c, { exact: true })}</span>)}
                </div>
                <div><span className="ui-stats-label">Open</span><b className="ui-stats-value">{count('open')}</b></div>
                <div><span className="ui-stats-label">Paid</span><b className="ui-stats-value">{count('paid')}</b></div>
                <div><span className="ui-stats-label">Won</span><b className="ui-stats-value">{count('won')}</b></div>
              </div>
            </aside>

            <div className="mt2-main">
              <div className="mt2-tabs ui-scroll-row" role="tablist" aria-label="Filter">
                {TABS.map((t) => {
                  const n = count(t.id)
                  if (t.id !== 'all' && n === 0) return null
                  return <button key={t.id} role="tab" aria-selected={tab === t.id} className={`ui-chip${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>{t.label}<em>{n}</em></button>
                })}
              </div>

              <ul className="ui-card mt2-list">
                {shown.map((s) => {
                  const st = badge(s)
                  return (
                    <li key={s.id}>
                      <Link to={`/tasks/${s.taskId}/submit`}>
                        <div className="mt2-t">
                          <strong>{s.task?.title || 'Job'}</strong>
                          <span className="mt2-meta">{s.isContest ? 'Contest · ' : ''}{categoryLabel(s.task?.category)}{s.task?.poster?.username ? ` · @${s.task.poster.username}` : ''}</span>
                          <span className="mt2-detail">{detail(s)}</span>
                          {s.status === 'REJECTED' && s.posterNotes && <span className="mt2-note">“{s.posterNotes}”</span>}
                          {s.status === 'SUBMITTED' && s.payoutCheck && <PayoutCheckStatus sub={s} who="worker" compact />}
                        </div>
                        <div className="mt2-r">
                          {amount(s)}
                          <em className={st.cls}>{st.icon && <i className={`ti ${st.icon}`} aria-hidden="true" />}{st.label}</em>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

