import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Money from './Money'
import { apiRequest } from '../lib/api'
import { formatMoney } from '../lib/money'

// A contest on its job page: the prize for each place, entries against the
// target, when entries close and when winners are picked, then the winners.
// After entries close the poster ranks the winners here and pays them at once;
// if they don't within 3 days, the earliest entries they haven't rejected win.
// When every place pays the same prize, the poster can award an entry a place
// while entries are still open; the pick at the end fills the places left.
// Awarding the last place that way finishes the contest early.

export type ContestInfo = {
  prizes: number[]
  entryTarget: number | null
  entries: number
  winnersDueAt: string | null
  winnersPaidAt: string | null
  winners: { place: number; prize: number; username?: string; avatarUrl?: string | null }[]
}

type Entry = {
  id: string; status: string; proof?: string | null; workerNotes?: string | null; attachments?: any[] | null
  submittedAt?: string | null; worker?: { username?: string }
}

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`
const when = (d: string | number | Date) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// No clear answer from the server (it took too long, the connection dropped or
// an error page came back): what was asked may still have gone through
const unsure = (e: any) => e?.message === 'Request timed out' || e instanceof TypeError || e instanceof SyntaxError

// Reload the contest after a failed award or pick. When the answer was unclear,
// reload again later too: the server can take up to 30 seconds to save an award
// and the app stops waiting after 15, so the first reload can come too soon.
function useReloadAfterError(onPaid: () => void) {
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  return (again: boolean) => {
    onPaid()
    if (again) timers.current.push(window.setTimeout(onPaid, 5000), window.setTimeout(onPaid, 16000))
  }
}

export default function ContestPanel({ jobId, contest, currency, endsAt, canManage, cancelled = false, convert, onPaid }: {
  jobId: string
  contest: ContestInfo
  currency: string
  endsAt: string | number | null
  canManage: boolean
  // The poster cancelled it: nothing is held any more and no place can be awarded
  cancelled?: boolean
  convert: any
  onPaid: () => void
}) {
  const endsTime = endsAt ? new Date(endsAt).getTime() : null
  const ended = endsTime != null && endsTime <= Date.now()
  const paidTime = contest.winnersPaidAt ? new Date(contest.winnersPaidAt).getTime() : null
  const paid = paidTime != null
  // Every place was awarded before the closing date, so entries closed then.
  // Still true once that date has passed: the winners were paid before it.
  const closedEarly = paidTime != null && (endsTime == null || !ended || paidTime < endsTime)
  const target = contest.entryTarget || 0
  // Places awarded so far (early awards show before the contest finishes)
  const awarded = contest.winners.length
  const equalPrizes = contest.prizes.length > 0 && new Set(contest.prizes).size === 1

  return (
    <section className="wjd-panel cp">
      <style>{`
        .cp{padding:22px 24px}
        .cp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
        .cp-head b{font-size:15px;font-weight:600;color:var(--text);display:inline-flex;align-items:center;gap:8px}
        .cp-head span{font:500 11px var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--text3)}
        .cp-prizes{display:grid;gap:8px}
        .cp-prize{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--r-ctl,12px);background:var(--card)}
        .cp-prize.first{background:color-mix(in srgb,var(--money,var(--green)) 8%,var(--card));border-color:color-mix(in srgb,var(--money,var(--green)) 22%,var(--border))}
        .cp-place{font:500 12px var(--font-mono);letter-spacing:.04em;text-transform:uppercase;color:var(--text2)}
        .cp-who{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--text);text-decoration:none}
        .cp-who:hover{text-decoration:underline}
        .cp-none{font-size:12.5px;color:var(--text3)}
        .cp-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
        .cp-fact{padding:12px 14px;border:1px solid var(--border);border-radius:var(--r-ctl,12px)}
        .cp-fact span{display:block;font-size:12px;color:var(--text3)}
        .cp-fact b{font-size:14px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums}
        .cp-note{margin:14px 0 0;font-size:13px;line-height:1.6;color:var(--text2)}
        .cp-pick{margin-top:18px;padding-top:18px;border-top:1px solid var(--border);display:grid;gap:10px}
        .cp-pick h3{margin:0;font-size:15px;font-weight:600;color:var(--text)}
        .cp-row{display:grid;grid-template-columns:52px 1fr auto;align-items:center;gap:10px}
        .cp-row select{width:100%}
        .cp-err{font-size:13px;color:var(--red)}
        .cp-entry{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-ctl,12px)}
        .cp-entry a{font-size:12.5px}
        .cp-entry-links{display:inline-flex;gap:12px;margin-left:auto}
        .cp-entry-who{display:grid;gap:2px;min-width:0}
        .cp-entry-who b{font-size:13.5px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .cp-entry-who span{font-size:12px;color:var(--text3)}
        @media(max-width:600px){.cp{padding:18px}.cp-facts{grid-template-columns:1fr}.cp-row{grid-template-columns:44px 1fr}.cp-row .cp-amt{grid-column:2}}
      `}</style>

      <div className="cp-head">
        <b><i className="ti ti-award" /> {paid ? 'Winners' : 'Prizes'}</b>
        <span>{paid ? 'Contest finished' : cancelled ? 'Cancelled' : ended ? 'Entries closed' : 'Contest'}</span>
      </div>

      <div className="cp-prizes">
        {contest.prizes.map((p, i) => {
          const w = contest.winners.find((x) => x.place === i + 1)
          return (
            <div key={i} className={`cp-prize${i === 0 ? ' first' : ''}`}>
              <span className="cp-place">{ordinal(i + 1)} place</span>
              {w?.username && <Link className="cp-who" to={`/user/${encodeURIComponent(w.username)}`}>@{w.username}</Link>}
              {paid && !w && <span className="cp-none">Not filled: returned to the poster</span>}
              <Money amount={p} currency={currency} convert={convert} size={i === 0 ? 22 : 16} positive />
            </div>
          )
        })}
      </div>

      <div className="cp-facts">
        <div className="cp-fact"><span>Entries</span><b>{target ? `${contest.entries} / ${target} target` : contest.entries}</b></div>
        <div className="cp-fact">
          <span>{ended || closedEarly || cancelled ? 'Entries closed' : 'Entries close'}</span>
          <b>{closedEarly ? 'Closed early: every place awarded' : cancelled && !ended ? 'Contest cancelled' : endsAt ? when(endsAt) : 'No end date'}</b>
        </div>
      </div>

      {cancelled && !paid && (
        <p className="cp-note">This contest was cancelled, so no prizes are paid. The money held for it went back to {canManage ? 'your wallet' : 'the poster'}.</p>
      )}
      {!paid && !cancelled && (
        <p className="cp-note">
          Anyone who meets the requirements can enter, as many people as want to. When entries close the poster ranks the winners
          {contest.winnersDueAt ? ` by ${when(contest.winnersDueAt)}` : ''}; if they don't, the earliest entries they haven't rejected win.
          Prizes are held by OgaPay until then.
          {equalPrizes && (contest.prizes.length === 1
            ? ' The poster can also award the place to a strong entry before entries close; the contest then ends early.'
            : ' The poster can also award a strong entry its place before entries close; once every place is awarded, the contest ends early.')}
        </p>
      )}

      {canManage && !cancelled && !ended && !paid && equalPrizes && awarded < contest.prizes.length && (
        <AwardNow jobId={jobId} prize={contest.prizes[0]} places={contest.prizes.length} placesLeft={contest.prizes.length - awarded}
          currency={currency} convert={convert} onPaid={onPaid} />
      )}
      {canManage && !cancelled && ended && !paid && <PickWinners jobId={jobId} contest={contest} currency={currency} convert={convert} onPaid={onPaid} />}
    </section>
  )
}

function PickWinners({ jobId, contest, currency, convert, onPaid }: {
  jobId: string; contest: ContestInfo; currency: string; convert: any; onPaid: () => void
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [picks, setPicks] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const reload = useReloadAfterError(onPaid)

  useEffect(() => {
    apiRequest<any>(`/tasks/${jobId}/submissions?limit=500`)
      .then((r) => {
        // apiRequest already unwraps { data }: a list comes back as the array itself
        const all: Entry[] = Array.isArray(r) ? r : r?.data || r?.submissions || []
        const list = all.filter((s) => s.status === 'SUBMITTED')
        list.sort((a, b) => new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime())
        setEntries(list)
        setPicks(Array(Math.min(contest.prizes.length - contest.winners.length, list.length)).fill(''))
      })
      .catch(() => setEntries([]))
  }, [jobId, contest.prizes.length, contest.winners.length])
  // Places already awarded early are paid; these picks fill the next ones
  const first = contest.winners.length

  if (!entries) return <div className="cp-pick"><p className="cp-note">Loading entries…</p></div>

  const label = (e: Entry) => `@${e.worker?.username || 'someone'}${e.submittedAt ? ` · ${when(e.submittedAt)}` : ''}`
  const ready = picks.length > 0 ? picks.every(Boolean) && new Set(picks).size === picks.length : true

  const pay = async () => {
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/tasks/${jobId}/winners`, { method: 'POST', body: JSON.stringify({ winners: picks }) })
      onPaid()
    } catch (e: any) {
      setError(unsure(e)
        ? "We couldn't confirm this. The winners may have been paid: check the places above before you try again."
        : e?.message || 'Could not pay the winners. Try again.')
      // The winners may have been paid anyway (a timeout, or paid automatically
      // meanwhile): reload the contest so the page shows where it really stands
      reload(unsure(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cp-pick">
      <h3>Pick the winners</h3>
      {entries.length === 0 ? (
        <p className="cp-note">
          {first > 0
            ? `There are no entries to pick from. The prizes for the ${contest.prizes.length - first} place${contest.prizes.length - first === 1 ? '' : 's'} left, and their share of the fee, come back to your wallet automatically.`
            : 'There are no entries to pick from. The prizes and fee come back to your wallet automatically.'}
        </p>
      ) : (
        <>
          <p className="cp-note" style={{ margin: 0 }}>
            Rank the best entries (see them under View Submissions). Reject any that break your brief first; rejected entries can't win.
            {first > 0 && ` ${first} place${first > 1 ? 's were' : ' was'} awarded early; these fill the rest.`}
            {picks.length < contest.prizes.length - first && ' There are fewer entries than prizes, so the places nobody fills come back to you with their share of the fee.'}
          </p>
          {picks.map((v, i) => (
            <div key={i} className="cp-row">
              <span className="cp-place">{ordinal(first + i + 1)}</span>
              <select className="ui-select" aria-label={`${ordinal(first + i + 1)} place`} value={v} onChange={(e) => setPicks((p) => p.map((x, j) => (j === i ? e.target.value : x)))}>
                <option value="">Choose an entry</option>
                {entries.map((e) => (
                  <option key={e.id} value={e.id} disabled={picks.includes(e.id) && v !== e.id}>{label(e)}</option>
                ))}
              </select>
              <span className="cp-amt"><Money amount={contest.prizes[first + i]} currency={currency} convert={convert} size={14} positive /></span>
            </div>
          ))}
          {error && <div className="cp-err">{error}</div>}
          <button className="ui-btn ui-btn-dark" type="button" disabled={!ready || busy} onClick={pay}>
            {busy ? 'Paying…' : `Pay ${picks.length} winner${picks.length === 1 ? '' : 's'}`}
          </button>
        </>
      )}
    </div>
  )
}

// While entries are open (equal prizes only): award a strong entry its place now.
// The prize is paid at once; the pick when entries close fills the places left.
// Awarding the last place finishes the contest: entries close at once.
function AwardNow({ jobId, prize, places, placesLeft, currency, convert, onPaid }: {
  jobId: string; prize: number; places: number; placesLeft: number; currency: string; convert: any; onPaid: () => void
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  // Bumped after a failed award so the list is read again (an entry may have been rejected or won meanwhile)
  const [refresh, setRefresh] = useState(0)
  const reload = useReloadAfterError(onPaid)
  const last = placesLeft === 1
  // A contest with a single place: it is the only place, not the lowest one
  const only = places === 1

  // A place was awarded since the error (a reload found it): the error is out of date
  useEffect(() => { setError('') }, [placesLeft])

  useEffect(() => {
    apiRequest<any>(`/tasks/${jobId}/submissions?limit=500`)
      .then((r) => {
        const all: Entry[] = Array.isArray(r) ? r : r?.data || r?.submissions || []
        const list = all.filter((s) => s.status === 'SUBMITTED')
        list.sort((a, b) => new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime())
        setEntries(list)
      })
      .catch(() => setEntries([]))
  }, [jobId, placesLeft, refresh])

  // A link opens straight away; screenshots, files and notes are read in Manage jobs
  const linkOf = (e: Entry) => {
    const p = typeof e.proof === 'string' ? e.proof.trim() : ''
    return /^https?:\/\//.test(p) ? p : ''
  }
  const hasMore = (e: Entry) => !linkOf(e) || !!e.workerNotes || (Array.isArray(e.attachments) && e.attachments.length > 0)

  const award = async (e: Entry) => {
    const name = `@${e.worker?.username || 'this entry'}`
    const ask = `Award ${name} ${only ? 'the' : 'a'} place now? ${formatMoney(prize, currency)} is paid to them at once and can't be undone.`
      + (only ? ' This contest has one place: the contest ends now and no more entries can be sent.'
        : last ? ' This is the last place: the contest ends now and no more entries can be sent.' : '')
    if (!window.confirm(ask)) return
    setBusy(e.id)
    setError('')
    try {
      await apiRequest(`/tasks/${jobId}/winners/now`, { method: 'POST', body: JSON.stringify({ submissionId: e.id }) })
      onPaid()
    } catch (err: any) {
      setError(unsure(err)
        ? "We couldn't confirm this. It may have gone through: check the places above before you try again."
        : err?.message || 'Could not award the place. Try again.')
      // The place may have been awarded anyway (a timeout), or entries closed
      // meanwhile: reload the contest and the entries so the page is up to date
      reload(unsure(err))
      setRefresh((n) => n + 1)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="cp-pick">
      <h3>{only ? 'Award the place now' : last ? 'Award the last place now' : 'Award a place now'}</h3>
      <p className="cp-note" style={{ margin: 0 }}>
        Read an entry first (View opens its link; Read opens it in Manage jobs with any screenshots and notes). If it's ready to use,
        award it {only ? 'the' : 'a'} place: <Money amount={prize} currency={currency} convert={convert} size={13} positive /> is paid at once.
        {' '}{only
          ? 'This contest has one place: when you award it, the contest ends and no more entries can be sent.'
          : last
          ? 'This is the last place: when you award it, the contest ends and no more entries can be sent.'
          : `${placesLeft} places left; the rest are picked when entries close. If you award every place, the contest ends early.`}
      </p>
      {!entries ? (
        <p className="cp-note">Loading entries…</p>
      ) : entries.length === 0 ? (
        <p className="cp-note">No entries waiting yet.</p>
      ) : (
        entries.map((e) => (
          <div key={e.id} className="cp-entry">
            <div className="cp-entry-who">
              <b>@{e.worker?.username || 'someone'}</b>
              {e.submittedAt && <span>Sent {when(e.submittedAt)}</span>}
            </div>
            <span className="cp-entry-links">
              {linkOf(e) && <a href={linkOf(e)} target="_blank" rel="noopener noreferrer">View</a>}
              {hasMore(e) && <Link to={`/manage-jobs?job=${encodeURIComponent(jobId)}&entry=${encodeURIComponent(e.id)}`} title="Read this entry in Manage jobs">Read</Link>}
            </span>
            <button className="ui-btn ui-btn-dark" type="button" disabled={!!busy} onClick={() => award(e)}>
              {busy === e.id ? 'Paying…' : 'Award now'}
            </button>
          </div>
        ))
      )}
      {error && <div className="cp-err">{error}</div>}
    </div>
  )
}
