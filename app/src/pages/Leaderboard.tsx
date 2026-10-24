import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import { apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import '../styles/leaderboard.css'
import { sized } from '../lib/img'
import { useMoney } from '../lib/useMoney'

// Ported from the June leaderboard. Its Weekly/Monthly tabs did nothing, all four
// boards showed the same list and it exposed everyone's earnings; the backend
// now ranks each board for real and hides amounts unless people opt in.
//
// Layout: phone and tablet show the board tabs, then your position, then the
// list, with the platform totals last. Desktop puts your position and the totals
// in a side panel that stays in view.

type Board = 'earners' | 'posters' | 'referrers'
type Period = 'week' | 'month' | 'all'
type Entry = { rank: number; id: string; name: string; username: string | null; avatarUrl: string | null; level: string | null; amount: number | null; count: number }
type Totals = { paidNgn: number; jobsPaid: number; earners: number }
type Me = { rank: number | null; amount: number; count: number; listed: boolean; isPublic: boolean; showEarnings: boolean; ranked: number }

const BOARDS: { id: Board; label: string; short: string; icon: string; unit: (n: number) => string; blurb: string }[] = [
  { id: 'earners', label: 'Top earners', short: 'Earners', icon: 'ti-coin', unit: (n) => `${n} paid job${n === 1 ? '' : 's'}`, blurb: 'Naira earned from paid jobs' },
  { id: 'posters', label: 'Top posters', short: 'Posters', icon: 'ti-briefcase', unit: (n) => `${n} worker${n === 1 ? '' : 's'} paid`, blurb: 'Naira paid out to workers' },
  { id: 'referrers', label: 'Top referrers', short: 'Referrers', icon: 'ti-affiliate', unit: (n) => `${n} referral${n === 1 ? '' : 's'}`, blurb: 'Invited people who went on to complete a job' },
]
const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
]

const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
const level = (l: string | null) => (l ? l.charAt(0) + l.slice(1).toLowerCase() : '')

function Avatar({ e, size }: { e: Entry; size: number }) {
  return (
    <span className="lb2-av" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {e.avatarUrl ? <img src={sized(e.avatarUrl, 40, true)} alt="" loading="lazy" /> : initials(e.name)}
    </span>
  )
}

function Who({ e, children }: { e: Entry; children: React.ReactNode }) {
  return e.username ? <Link to={`/user/${e.username}`} className="lb2-who">{children}</Link> : <span className="lb2-who">{children}</span>
}

export default function Leaderboard() {
  // Amounts in the display currency the person chose
  const show = useMoney()
  const [board, setBoard] = useState<Board>('earners')
  const [period, setPeriod] = useState<Period>('month')
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [totals, setTotals] = useState<Totals | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [err, setErr] = useState(false)
  const [reload, setReload] = useState(0)
  const signedIn = !!getAccessToken()
  const cfg = BOARDS.find((b) => b.id === board)!

  useEffect(() => {
    let live = true
    setEntries(null); setTotals(null); setErr(false)
    const q = `board=${board}&period=${period}`
    apiRequest<{ entries: Entry[]; totals: Totals }>(`/leaderboard?${q}&limit=50`, { auth: false })
      .then((d) => { if (live) { setEntries(d.entries || []); setTotals(d.totals) } })
      .catch(() => { if (live) setErr(true) })
    if (signedIn) apiRequest<Me>(`/leaderboard/me?${q}`).then((d) => live && setMe(d)).catch(() => live && setMe(null))
    return () => { live = false }
  }, [board, period, signedIn, reload])

  const value = (e: Entry) => (board === 'referrers' ? `${e.count}` : e.amount != null ? show(e.amount) : '—')
  const top = entries?.slice(0, 3) || []
  const podium = top.length === 3 ? [top[1], top[0], top[2]] : top
  const rest = entries?.slice(3) || []
  const periodLabel = PERIODS.find((p) => p.id === period)!.label.toLowerCase()

  const meCard = signedIn ? (me && (
    <section className="ui-card lb2-me">
      <div>
        <div className="lb2-label">Your position</div>
        <div className="lb2-me-rank">{me.rank ? `#${me.rank}` : 'Not ranked yet'}</div>
        <div className="lb2-me-sub">
          {me.rank
            ? <>{board === 'referrers' ? cfg.unit(me.count) : <>{show(me.amount)} · {cfg.unit(me.count)}</>} {periodLabel}</>
            : board === 'earners' ? 'Complete a paid job to get on the board.' : board === 'posters' ? 'Pay a worker for a job to get on the board.' : 'Invite someone who completes a job.'}
        </div>
      </div>
      <div className="lb2-me-note">
        {!me.isPublic
          ? <><i className="ti ti-eye-off" aria-hidden="true" /> Your profile is private, so you don't appear on the public board. <Link className="tap" to="/settings/privacy">Privacy settings</Link></>
          : !me.showEarnings && board !== 'referrers'
            ? <><i className="ti ti-lock" aria-hidden="true" /> Others see your rank but not your amount. <Link className="tap" to="/settings/privacy">Show earnings</Link></>
            : <><i className="ti ti-users" aria-hidden="true" /> {me.ranked.toLocaleString()} on this board</>}
      </div>
    </section>
  )) : (
    <section className="ui-card lb2-me">
      <div><div className="lb2-label">Your position</div><div className="lb2-me-sub">Sign in to see where you stand.</div></div>
      <button type="button" className="ui-btn ui-btn-dark" onClick={() => openSignIn()}>Sign in</button>
    </section>
  )

  return (
    <Layout>
      <div className="ui-page">
        <header className="ui-head lb2-head">
          <div>
            <h1 className="ui-title">Leaderboard</h1>
            <p className="ui-sub">The people earning, hiring and inviting the most on OgaPay.</p>
          </div>
          <div className="lb2-seg lb2-periods" role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" aria-pressed={period === p.id} className={period === p.id ? 'on' : ''} onClick={() => setPeriod(p.id)}>{p.label}</button>
            ))}
          </div>
        </header>

        <div className="ui-split lb2-layout">
          <div className="lb2-main">
            <div className="lb2-seg lb2-boards" role="group" aria-label="Board">
              {BOARDS.map((b) => (
                <button key={b.id} type="button" aria-pressed={board === b.id} className={board === b.id ? 'on' : ''} onClick={() => setBoard(b.id)}>
                  <i className={`ti ${b.icon}`} aria-hidden="true" /> <span className="lb2-long">{b.label}</span><span className="lb2-short">{b.short}</span>
                </button>
              ))}
            </div>
            <p className="lb2-blurb">{cfg.blurb}, {periodLabel}. Amounts show only for people who choose to share them.</p>

            <div className="lb2-me-inline">{meCard}</div>

            {err ? (
              <LoadError what="the leaderboard" onRetry={() => setReload((r) => r + 1)} />
            ) : entries === null ? (
              <div className="ui-sk" style={{ height: 260 }} aria-busy="true" aria-label="Loading the leaderboard" />
            ) : entries.length === 0 ? (
              <div className="ui-empty"><strong>Nobody on this board {periodLabel} yet</strong>Rankings appear as soon as people {board === 'posters' ? 'pay workers' : board === 'referrers' ? 'invite friends who finish a job' : 'get paid for jobs'}.</div>
            ) : (
              <>
                <div className={`lb2-podium n${podium.length}`}>
                  {podium.map((e) => (
                    <section key={e.id} className={`ui-card lb2-p r${e.rank}`}>
                      <div className="lb2-p-rank">#{e.rank}</div>
                      <Who e={e}>
                        <Avatar e={e} size={e.rank === 1 ? 64 : 52} />
                        <strong>{e.name}</strong>
                        {e.username && <small>@{e.username}</small>}
                      </Who>
                      <div className="lb2-p-val">{value(e)}</div>
                      <div className="lb2-p-sub">{board === 'referrers' ? 'referrals' : cfg.unit(e.count)}</div>
                    </section>
                  ))}
                </div>

                {rest.length > 0 && (
                  <section className="ui-card lb2-list">
                    {rest.map((e) => (
                      <div key={e.id} className="lb2-row">
                        <span className="lb2-rank">{e.rank}</span>
                        <Who e={e}>
                          <Avatar e={e} size={34} />
                          <span className="lb2-name"><strong>{e.name}</strong><small>{e.username ? `@${e.username}` : ''}{e.level ? ` · ${level(e.level)}` : ''}</small></span>
                        </Who>
                        <span className="lb2-count">{board === 'referrers' ? '' : cfg.unit(e.count)}</span>
                        <span className="lb2-val">{board === 'referrers' ? cfg.unit(e.count) : value(e)}</span>
                      </div>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>

          <aside className="ui-split-side lb2-side">
            <div className="lb2-me-side">{meCard}</div>
            {/* Platform totals: hidden when the board didn't load (no endless "…") */}
            {!err && (
              <section className="ui-card lb2-totals" aria-label={`OgaPay totals, ${periodLabel}`}>
                <div className="lb2-label">On OgaPay {periodLabel}</div>
                <div className="lb2-totals-grid">
                  <div><span>Paid out</span><b>{totals ? show(totals.paidNgn, 'NGN', { short: true }) : '…'}</b></div>
                  <div><span>Jobs paid</span><b>{totals ? totals.jobsPaid.toLocaleString() : '…'}</b></div>
                  <div><span>Earners</span><b>{totals ? totals.earners.toLocaleString() : '…'}</b></div>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  )
}
