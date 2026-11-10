import { useEffect, useState } from 'react'
import '../styles/payout-check.css'

/* Payout check on social jobs (the backend's payoutCheck.service.js), the way
   wurk.fun does its cooldown. The poster picks a window when creating the job.
   Work sent on it can't be approved or paid until the window ends; then we
   look at the worker's X post again: it must still be up, be theirs, and still
   reply to / quote the job's post. Likes and follows can't be checked, so
   those are left to the poster. A longer window means the result comes later,
   not that the work failed, and passing means eligible, not paid. */

export const PAYOUT_CHECKS: { minutes: number; label: string; hint: string }[] = [
  { minutes: 0, label: 'Instant', hint: 'No wait. Review as soon as work comes in.' },
  { minutes: 5, label: '5 min', hint: 'Catches people who delete straight away.' },
  { minutes: 30, label: '30 min', hint: 'A short wait.' },
  { minutes: 60, label: '1 hour', hint: 'A good default for replies and quotes.' },
  { minutes: 360, label: '6 hours', hint: 'Posts must stay up most of a day.' },
  { minutes: 1440, label: '24 hours', hint: 'Posts must stay up a full day.' },
]

// "5-minute", "1-hour"
export const windowName = (mins: number) => (mins < 60 ? `${mins}-minute` : `${mins / 60}-hour`)
// "5 minutes", "1 hour", "24 hours"
export const durationName = (mins: number) => (mins < 60 ? `${mins} minute${mins === 1 ? '' : 's'}` : `${mins / 60} hour${mins === 60 ? '' : 's'}`)

// On other platforms nothing can be re-checked: the wait only gives the poster time to look
const OTHER_HINTS: Record<number, string> = {
  5: 'A short wait before work can be paid.',
  30: 'Time to look at the proof first.',
  60: 'Gives you an hour to check the proof.',
  360: 'Check the proof any time that day.',
  1440: 'A full day to check the proof.',
}

// platform: the job's platform name ("Instagram"). Only X posts are re-checked
// automatically (payoutCheck.service.js); anywhere else the wait still applies
// and the poster checks the proof by hand, so the words say that.
export function PayoutCheckPicker({ value, onChange, platform = 'X' }: { value: number; onChange: (v: number) => void; platform?: string }) {
  const isX = /^(x|twitter|x \/ twitter)$/i.test(platform.trim())
  return (
    <div>
      <div className="pc-pick" role="radiogroup" aria-label="Payout check">
        {PAYOUT_CHECKS.map((c) => (
          <button key={c.minutes} type="button" role="radio" aria-checked={value === c.minutes}
            className={`pc-opt${value === c.minutes ? ' is-on' : ''}`} onClick={() => onChange(c.minutes)}>
            <b>{c.label}</b><span>{isX || !c.minutes ? c.hint : OTHER_HINTS[c.minutes]}</span>
          </button>
        ))}
      </div>
      <p className="pc-help">
        {!value
          ? 'Work can be approved as soon as it comes in, as today.'
          : isX
            ? `Work can't be paid until ${durationName(value)} after it's sent. Then we check the worker's X post is still up, is theirs, and still replies to or quotes your post. Likes and follows can't be checked automatically; you review them.`
            : `Work can't be paid until ${durationName(value)} after it's sent. ${platform} can't be checked automatically, so use the wait to open the proof and check the like, follow or comment is still there before you approve.`}
      </p>
    </div>
  )
}

// The job page's line about the check (from the server's task.payoutCheck)
export type PayoutCheckInfo = { minutes: number; checkable: boolean; note: string } | null | undefined
export function PayoutCheckNote({ info }: { info: PayoutCheckInfo }) {
  if (!info) return null
  return <p className="pc-note"><i className="ti ti-shield-check" aria-hidden="true" /><span>{info.note}</span></p>
}

// "in 4 min", "in 2 h 5 min"
const left = (ms: number) => {
  const m = Math.max(1, Math.ceil(ms / 60000))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`
}

// Ticks every 30 seconds while a check is running
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [active])
  return now
}

export type PayoutCheckSub = { status?: string; payoutCheck?: string | null; payoutCheckDueAt?: string | null; payoutCheckReason?: string | null }

// Is Approve held back by the check? Until the window ends. After that the
// server checks the post on the spot when Approve is pressed (and refuses it
// if the post can't be read yet), so the button opens again.
export const checkBlocksApprove = (s: PayoutCheckSub, now = Date.now()) =>
  s.payoutCheck === 'WAITING' && !!s.payoutCheckDueAt && new Date(s.payoutCheckDueAt).getTime() > now
export const anyWaiting = (subs: PayoutCheckSub[] | null | undefined) => !!subs?.some((s) => s.payoutCheck === 'WAITING')

/* One submission's check: a countdown while it runs, then the result.
   who="worker" speaks to the worker ("your post"), who="poster" to the poster. */
export function PayoutCheckStatus({ sub, who, compact = false }: { sub: PayoutCheckSub; who: 'worker' | 'poster'; compact?: boolean }) {
  const waiting = sub.payoutCheck === 'WAITING'
  const now = useNow(waiting && sub.status === 'SUBMITTED')
  if (!sub.payoutCheck) return null
  // Work that was rejected or paid needs no check line
  if (sub.status && sub.status !== 'SUBMITTED' && sub.payoutCheck === 'WAITING') return null
  const cls = `pc-status${compact ? ' pc-status-compact' : ''}`
  const reason = (r?: string | null) => (who === 'poster'
    ? String(r || '').replace(/^Your post/, "The worker's post").replace(/your connected X account/, 'their connected X account')
    : String(r || ''))
  if (waiting) {
    const due = sub.payoutCheckDueAt ? new Date(sub.payoutCheckDueAt).getTime() : 0
    const at = due ? new Date(due).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
    const text = due > now
      ? (who === 'worker'
        ? `Checking your post: result after ${at} (in ${left(due - now)}). Keep it up until then.`
        : `Payout check running: you can approve after ${at} (in ${left(due - now)}).`)
      : (who === 'worker' ? 'Checking your post now. The result shows here in a few minutes.' : 'The wait is over. Approve now and we check the post first, or wait a minute for the result.')
    return <p className={`${cls} is-wait`} role="status"><span className="pc-badge"><i className="ti ti-hourglass" aria-hidden="true" /> Checking</span><span>{text}</span></p>
  }
  if (sub.payoutCheck === 'PASSED') {
    return <p className={`${cls} is-pass`}><span className="pc-badge"><i className="ti ti-circle-check" aria-hidden="true" /> Passed</span><span>{who === 'worker' ? 'Your post passed the payout check. Passing means eligible, not paid: the poster still approves it.' : 'The post passed the payout check. You can approve it.'}</span></p>
  }
  if (sub.payoutCheck === 'SKIPPED') {
    return <p className={`${cls}`}><span className="pc-badge"><i className="ti ti-eye" aria-hidden="true" /> Not checked</span><span>{reason(sub.payoutCheckReason) || "This proof can't be checked automatically; the poster reviews it."}</span></p>
  }
  if (sub.payoutCheck === 'FAILED') {
    return <p className={`${cls} is-fail`}><span className="pc-badge"><i className="ti ti-alert-circle" aria-hidden="true" /> Failed</span><span>{reason(sub.payoutCheckReason)} {who === 'worker' ? "It won't be paid automatically; the poster decides." : "It won't be paid automatically. Approve or reject it by hand."}</span></p>
  }
  // UNKNOWN: X couldn't be read for 24 hours, or no X account to compare with
  return <p className={`${cls} is-ask`}><span className="pc-badge"><i className="ti ti-help-circle" aria-hidden="true" /> Poster decides</span><span>{reason(sub.payoutCheckReason)}</span></p>
}
