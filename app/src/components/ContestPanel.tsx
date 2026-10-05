import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Money from './Money'
import { apiRequest } from '../lib/api'

// A contest on its job page: the prize for each place, entries against the
// target, when entries close and when winners are picked, then the winners.
// After entries close the poster ranks the winners here and pays them at once;
// if they don't within 3 days, the earliest entries they haven't rejected win.

export type ContestInfo = {
  prizes: number[]
  entryTarget: number | null
  entries: number
  winnersDueAt: string | null
  winnersPaidAt: string | null
  winners: { place: number; prize: number; username?: string; avatarUrl?: string | null }[]
}

type Entry = { id: string; status: string; proof?: string | null; submittedAt?: string | null; worker?: { username?: string } }

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`
const when = (d: string | number | Date) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function ContestPanel({ jobId, contest, currency, endsAt, canManage, convert, onPaid }: {
  jobId: string
  contest: ContestInfo
  currency: string
  endsAt: string | number | null
  canManage: boolean
  convert: any
  onPaid: () => void
}) {
  const ended = !!endsAt && new Date(endsAt).getTime() <= Date.now()
  const paid = !!contest.winnersPaidAt
  const target = contest.entryTarget || 0

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
        @media(max-width:600px){.cp{padding:18px}.cp-facts{grid-template-columns:1fr}.cp-row{grid-template-columns:44px 1fr}.cp-row .cp-amt{grid-column:2}}
      `}</style>

      <div className="cp-head">
        <b><i className="ti ti-award" /> {paid ? 'Winners' : 'Prizes'}</b>
        <span>{paid ? 'Contest finished' : ended ? 'Entries closed' : 'Contest'}</span>
      </div>

      <div className="cp-prizes">
        {contest.prizes.map((p, i) => {
          const w = contest.winners.find((x) => x.place === i + 1)
          return (
            <div key={i} className={`cp-prize${i === 0 ? ' first' : ''}`}>
              <span className="cp-place">{ordinal(i + 1)} place</span>
              {w?.username && <Link className="cp-who" to={`/user/${encodeURIComponent(w.username)}`}>@{w.username}</Link>}
              <Money amount={p} currency={currency} convert={convert} size={i === 0 ? 22 : 16} positive />
            </div>
          )
        })}
      </div>

      <div className="cp-facts">
        <div className="cp-fact"><span>Entries</span><b>{target ? `${contest.entries} / ${target} target` : contest.entries}</b></div>
        <div className="cp-fact"><span>{ended ? 'Entries closed' : 'Entries close'}</span><b>{endsAt ? when(endsAt) : 'No end date'}</b></div>
      </div>

      {!paid && (
        <p className="cp-note">
          Anyone who meets the requirements can enter, as many people as want to. When entries close the poster ranks the winners
          {contest.winnersDueAt ? ` by ${when(contest.winnersDueAt)}` : ''}; if they don't, the earliest entries they haven't rejected win.
          Prizes are held by OgaPay until then.
        </p>
      )}

      {canManage && ended && !paid && <PickWinners jobId={jobId} contest={contest} currency={currency} convert={convert} onPaid={onPaid} />}
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

  useEffect(() => {
    apiRequest<any>(`/tasks/${jobId}/submissions?limit=500`)
      .then((r) => {
        const list: Entry[] = (r?.data || r?.submissions || []).filter((s: Entry) => s.status === 'SUBMITTED')
        list.sort((a, b) => new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime())
        setEntries(list)
        setPicks(Array(Math.min(contest.prizes.length, list.length)).fill(''))
      })
      .catch(() => setEntries([]))
  }, [jobId, contest.prizes.length])

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
      setError(e?.message || 'Could not pay the winners. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cp-pick">
      <h3>Pick the winners</h3>
      {entries.length === 0 ? (
        <p className="cp-note">There are no entries to pick from. The prizes and fee come back to your wallet automatically.</p>
      ) : (
        <>
          <p className="cp-note" style={{ margin: 0 }}>
            Rank the best entries (see them under View Submissions). Reject any that break your brief first; rejected entries can't win.
            {picks.length < contest.prizes.length && ' There are fewer entries than prizes, so the places nobody fills come back to you with their share of the fee.'}
          </p>
          {picks.map((v, i) => (
            <div key={i} className="cp-row">
              <span className="cp-place">{ordinal(i + 1)}</span>
              <select className="ui-select" aria-label={`${ordinal(i + 1)} place`} value={v} onChange={(e) => setPicks((p) => p.map((x, j) => (j === i ? e.target.value : x)))}>
                <option value="">Choose an entry</option>
                {entries.map((e) => (
                  <option key={e.id} value={e.id} disabled={picks.includes(e.id) && v !== e.id}>{label(e)}</option>
                ))}
              </select>
              <span className="cp-amt"><Money amount={contest.prizes[i]} currency={currency} convert={convert} size={14} positive /></span>
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
