import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import '../styles/profile-public.css'
import '../styles/leaderboard.css'

// Ported from the June leaderboard. Its Weekly/Monthly tabs did nothing, all four
// boards showed the same list and it exposed everyone's earnings; the backend
// now ranks each board for real and hides amounts unless people opt in.

type Board = 'earners' | 'posters' | 'referrers'
type Period = 'week' | 'month' | 'all'
type Entry = { rank: number; id: string; name: string; username: string | null; avatarUrl: string | null; level: string | null; amount: number | null; count: number }
type Totals = { paidNgn: number; jobsPaid: number; earners: number }
type Me = { rank: number | null; amount: number; count: number; listed: boolean; isPublic: boolean; showEarnings: boolean; ranked: number }

const BOARDS: { id: Board; label: string; icon: string; unit: (n: number) => string; blurb: string }[] = [
  { id: 'earners', label: 'Top earners', icon: 'ti-coin', unit: (n) => `${n} paid job${n === 1 ? '' : 's'}`, blurb: 'Naira earned from paid jobs' },
  { id: 'posters', label: 'Top posters', icon: 'ti-briefcase', unit: (n) => `${n} worker${n === 1 ? '' : 's'} paid`, blurb: 'Naira paid out to workers' },
  { id: 'referrers', label: 'Top referrers', icon: 'ti-affiliate', unit: (n) => `${n} referral${n === 1 ? '' : 's'}`, blurb: 'Invited people who went on to complete a job' },
]
const PERIODS: { id: Period; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
]

const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-US')
const compact = (n: number) => (n >= 1e6 ? `₦${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `₦${(n / 1e3).toFixed(1)}K` : naira(n))
const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
const level = (l: string | null) => (l ? l.charAt(0) + l.slice(1).toLowerCase() : '')

function Avatar({ e, size }: { e: Entry; size: number }) {
  return (
    <span className="lb2-av" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {e.avatarUrl ? <img src={e.avatarUrl} alt="" loading="lazy" /> : initials(e.name)}
    </span>
  )
}

function Who({ e, children }: { e: Entry; children: React.ReactNode }) {
  return e.username ? <Link to={`/user/${e.username}`} className="lb2-who">{children}</Link> : <span className="lb2-who">{children}</span>
}

export default function Leaderboard() {
  const [board, setBoard] = useState<Board>('earners')
  const [period, setPeriod] = useState<Period>('month')
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [totals, setTotals] = useState<Totals | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [err, setErr] = useState(false)
  const signedIn = !!getAccessToken()
  const cfg = BOARDS.find((b) => b.id === board)!

  useEffect(() => {
    let live = true
    setEntries(null); setErr(false)
    const q = `board=${board}&period=${period}`
    apiRequest<{ entries: Entry[]; totals: Totals }>(`/leaderboard?${q}&limit=50`, { auth: false })
      .then((d) => { if (live) { setEntries(d.entries || []); setTotals(d.totals) } })
      .catch(() => { if (live) { setEntries([]); setErr(true) } })
    if (signedIn) apiRequest<Me>(`/leaderboard/me?${q}`).then((d) => live && setMe(d)).catch(() => live && setMe(null))
    return () => { live = false }
  }, [board, period, signedIn])

  const value = (e: Entry) => (board === 'referrers' ? `${e.count}` : e.amount != null ? naira(e.amount) : '—')
  const top = entries?.slice(0, 3) || []
  const podium = top.length === 3 ? [top[1], top[0], top[2]] : top
  const rest = entries?.slice(3) || []
  const periodLabel = PERIODS.find((p) => p.id === period)!.label.toLowerCase()

  return (
    <Layout>
      <div className="up-wrap">
        <div className="lb2-head">
          <div>
            <h1>Leaderboard</h1>
            <p>The people earning, hiring and inviting the most on OgaPay.</p>
          </div>
          <div className="up-tabs" role="tablist" aria-label="Period">
            {PERIODS.map((p) => (
              <button key={p.id} role="tab" aria-selected={period === p.id} className={`up-tab${period === p.id ? ' on' : ''}`} onClick={() => setPeriod(p.id)}>{p.label}</button>
            ))}
          </div>
        </div>

        <div className="lb2-stats">
          <section className="up-card lb2-stat"><div className="up-eyebrow">Paid to workers</div><b>{totals ? compact(totals.paidNgn) : '…'}</b><span>{periodLabel}</span></section>
          <section className="up-card lb2-stat"><div className="up-eyebrow">Jobs paid</div><b>{totals ? totals.jobsPaid.toLocaleString() : '…'}</b><span>{periodLabel}</span></section>
          <section className="up-card lb2-stat"><div className="up-eyebrow">People earning</div><b>{totals ? totals.earners.toLocaleString() : '…'}</b><span>{periodLabel}</span></section>
        </div>

        <div className="up-tabs lb2-boards" role="tablist" aria-label="Board">
          {BOARDS.map((b) => (
            <button key={b.id} role="tab" aria-selected={board === b.id} className={`up-tab${board === b.id ? ' on' : ''}`} onClick={() => setBoard(b.id)}>
              <i className={`ti ${b.icon}`} /> {b.label}
            </button>
          ))}
        </div>
        <p className="lb2-blurb">{cfg.blurb}, {periodLabel}. Amounts show only for people who choose to share them.</p>

        {signedIn && me && (
          <section className="up-card lb2-me">
            <div>
              <div className="up-eyebrow">Your position</div>
              <div className="lb2-me-rank">{me.rank ? `#${me.rank}` : 'Not ranked yet'}</div>
              <div className="lb2-me-sub">
                {me.rank
                  ? <>{board === 'referrers' ? cfg.unit(me.count) : <>{naira(me.amount)} · {cfg.unit(me.count)}</>} {periodLabel}</>
                  : board === 'earners' ? 'Complete a paid job to get on the board.' : board === 'posters' ? 'Pay a worker for a job to get on the board.' : 'Invite someone who completes a job.'}
              </div>
            </div>
            <div className="lb2-me-note">
              {!me.isPublic
                ? <><i className="ti ti-eye-off" /> Your profile is private, so you don't appear on the public board. <Link to="/settings/privacy">Privacy settings</Link></>
                : !me.showEarnings && board !== 'referrers'
                  ? <><i className="ti ti-lock" /> Others see your rank but not your amount. <Link to="/settings/privacy">Show earnings</Link></>
                  : <><i className="ti ti-users" /> {me.ranked.toLocaleString()} on this board</>}
            </div>
          </section>
        )}
        {!signedIn && (
          <section className="up-card lb2-me">
            <div><div className="up-eyebrow">Your position</div><div className="lb2-me-sub">Sign in to see where you stand.</div></div>
            <button className="up-btn primary" onClick={() => openSignIn()}>Sign in</button>
          </section>
        )}

        {entries === null ? (
          <div className="up-empty"><i className="ti ti-loader-2" />Loading…</div>
        ) : err ? (
          <div className="up-empty"><i className="ti ti-cloud-off" />Couldn't load the leaderboard. Refresh to try again.</div>
        ) : entries.length === 0 ? (
          <div className="up-empty"><i className="ti ti-trophy" />Nobody on this board {periodLabel} yet.</div>
        ) : (
          <>
            <div className={`lb2-podium n${podium.length}`}>
              {podium.map((e) => (
                <section key={e.id} className={`up-card lb2-p r${e.rank}`}>
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
              <section className="up-card lb2-list">
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
    </Layout>
  )
}
