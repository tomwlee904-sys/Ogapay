import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { naira } from '../lib/wallet'
import { sized } from '../lib/img'

// Referrals, laid out like wurk.fun's: totals, your link (with ready-made
// shares), the people you brought in, and what you've been paid for them.
// The bonus is paid once a referred person is verified (Level 1) and finishes
// their first paid job (a job someone other than the inviter posted), once per
// friend, for up to `rewardCap` people (backend referral.service
// maybeTriggerReferralBonus). Plus a weekly contest for the top inviters
// (referral.service weeklyLeaderboard).

type Step = 'verify' | 'job' | 'processing' | 'paid' | 'capped'
type Referral = { username: string; avatarUrl: string | null; joinedAt: string; rewardedAt: string | null; step?: Step }
type Stats = {
  referralCode: string; totalReferrals: number; rewardedReferrals: number; totalEarned: number | string
  bonusPerReferral?: number; rewardCap?: number; referrals?: Referral[]; signupBonus?: number
}
type Leader = { rank: number; username: string | null; avatarUrl: string | null; friends: number; prize: number; isMe: boolean }
type Board = { week: 'this' | 'last'; weekStart: string; weekEnd: string; prizes: number[]; leaders: Leader[]; me: { rank: number | null; friends: number } | null }

// What each friend still has to do, in words
const STEPS: Record<Step, { icon: string; text: string; ok?: boolean }> = {
  verify: { icon: 'id-badge-2', text: 'Needs to verify their NIN' },
  job: { icon: 'briefcase', text: 'Needs to finish a paid job' },
  processing: { icon: 'clock', text: 'Done, bonus on its way' },
  paid: { icon: 'circle-check', text: 'paid', ok: true },
  capped: { icon: 'circle-check', text: 'Counted (past the 20-friend bonus cap)', ok: true },
}

// Time left in the contest week, e.g. "2 days 5 hours left"
function timeLeft(end: string) {
  const ms = new Date(end).getTime() - Date.now()
  if (ms <= 0) return 'Ended'
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000)
  return d > 0 ? `${d} day${d === 1 ? '' : 's'} ${h} hour${h === 1 ? '' : 's'} left` : `${Math.max(1, h)} hour${h === 1 ? '' : 's'} left`
}
type Bonus = { id: string; amount: number | string; status: string; description?: string; createdAt: string }

const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// A part of the page whose request failed: said plainly, with Try again (never
// "Loading..." forever, a 0 or "No referrals yet")
function Failed({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="rf2-empty rf2-failed" role="alert">
      <b>We couldn't load {what}</b>
      Check your connection and try again. Nothing has changed on your account.
      <div><button type="button" className="rf2-btn" onClick={onRetry}><i className="ti ti-refresh" aria-hidden="true" /> Try again</button></div>
    </div>
  )
}

export default function TabReferralsContent() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [week, setWeek] = useState<'this' | 'last'>('this')
  const [board, setBoard] = useState<Board | null>(null)
  const [reminded, setReminded] = useState<Record<string, string>>({})
  const [statsFailed, setStatsFailed] = useState(false)
  const [bonusesFailed, setBonusesFailed] = useState(false)
  const [boardFailed, setBoardFailed] = useState(false)
  const [loadKey, setLoadKey] = useState(0)
  const [boardKey, setBoardKey] = useState(0)
  // A refresh that fails (when the window gets focus again) keeps what's shown
  const gotStats = useRef(false)
  const gotBonuses = useRef(false)

  useEffect(() => {
    let alive = true
    setBoard(null); setBoardFailed(false)
    apiRequest<Board>(`/users/referrals/leaderboard?week=${week}`).then((b) => { if (alive) setBoard(b) }).catch(() => { if (alive) setBoardFailed(true) })
    return () => { alive = false }
  }, [week, user?.id, boardKey])

  const remind = async (username: string) => {
    setReminded((r) => ({ ...r, [username]: 'sending' }))
    try {
      await apiRequest('/users/referrals/remind', { method: 'POST', body: JSON.stringify({ username }) })
      setReminded((r) => ({ ...r, [username]: 'Reminder sent' }))
    } catch (e: any) {
      setReminded((r) => ({ ...r, [username]: e?.message || "Couldn't send the reminder" }))
    }
  }

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [s, tx] = await Promise.all([
        apiRequest<Stats>('/users/referrals/stats').catch(() => null),
        apiRequest<any>('/users/transactions/history?type=REFERRAL_BONUS').catch(() => null),
      ])
      if (!alive) return
      if (s) { setStats(s); setStatsFailed(false); gotStats.current = true }
      else if (!gotStats.current) setStatsFailed(true)
      if (tx !== null) {
        const list = Array.isArray(tx) ? tx : tx?.data ?? tx?.transactions ?? []
        setBonuses(list.filter((t: any) => t.type === 'REFERRAL_BONUS'))
        setBonusesFailed(false); gotBonuses.current = true
      } else if (!gotBonuses.current) setBonusesFailed(true)
      setLoading(false)
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { alive = false; window.removeEventListener('focus', onFocus) }
  }, [user?.id, loadKey])
  const retry = () => { setStatsFailed(false); setBonusesFailed(false); setLoading(true); setLoadKey((k) => k + 1) }

  const code = (user as any)?.referralCode || stats?.referralCode || ''
  const link = code ? `https://ogapay.app/ref/${code}` : ''
  const bonus = stats?.bonusPerReferral ?? 500
  const cap = stats?.rewardCap ?? 20
  const rewarded = stats?.rewardedReferrals ?? 0
  const people = stats?.referrals ?? []
  const signup = stats?.signupBonus ?? 1000
  // Says what the friend gets, not just the inviter
  const shareText = `Join me on OgaPay and get ${naira(signup, 0)} when you verify your NIN.\n\nThen earn from small jobs (follows, reviews, app tests), paid in Naira or USDC.\nSign up with my link: ${link}`

  const copy = () => navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})

  return (
    <div className="rf2">
      <style>{`
        .rf2{display:grid;gap:16px}
        .rf2-lead-text{margin:8px 0 0;font-size:14px;line-height:1.55;color:var(--text2);max-width:640px}
        .rf2-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
        .rf2-stats>div{padding:16px 20px;display:flex;flex-direction:column;gap:6px;min-width:0}
        .rf2-stats>div+div{border-left:1px solid var(--border)}
        .rf2-stats b{font-size:22px;font-weight:600;letter-spacing:-.01em;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        @media(max-width:767.98px){.rf2-stats>div{padding:14px 12px}.rf2-stats b{font-size:18px}}
        .rf2-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
        .rf2-pad{padding:20px}
        .rf2-label{font:500 var(--fs-label,11px) var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--text2)}
        .rf2-big{font-size:34px;font-weight:600;letter-spacing:-.02em;margin-top:8px;color:var(--text)}
        .rf2-sub{font-size:13px;color:var(--text2);margin-top:6px;line-height:1.5}
        .rf2-link{display:flex;gap:8px;margin-top:12px}
        .rf2-link input{flex:1;min-width:0;min-height:44px;padding:0 12px;border:1px solid var(--border);border-radius:12px;background:var(--card2);color:var(--text);font:14px var(--font-mono,ui-monospace,monospace)}
        .rf2-btn{min-height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text);font-weight:600;font-size:14px;font-family:inherit;font-family:inherit;display:inline-flex;align-items:center;gap:6px;cursor:pointer;text-decoration:none;white-space:nowrap}
        .rf2-btn.dark{background:var(--text);color:var(--bg);border-color:var(--text)}
        .rf2-shares{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.rf2-shares .rf2-btn{justify-content:center;padding:0 10px}
        .rf2-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border)}
        .rf2-head h2{margin:0;font-size:16px;font-weight:600}
        .rf2-count{font:400 12px var(--font-mono,ui-monospace,monospace);color:var(--text2)}
        .rf2-row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:center;padding:12px 20px;border-bottom:1px solid var(--border);font-size:14px}
        .rf2-row:last-child{border-bottom:0}
        .rf2-row.th{background:var(--card2);font-weight:600;font-size:12px;font-family:inherit;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)}
        .rf2-who{display:flex;align-items:center;gap:10px;min-width:0}
        .rf2-who img,.rf2-who span.av{width:32px;height:32px;border-radius:50%;object-fit:cover;background:var(--card2);display:grid;place-items:center;flex-shrink:0;color:var(--text3)}
        .rf2-who a{color:var(--text);text-decoration:none;font-weight:600;overflow:hidden;text-overflow:ellipsis}
        .rf2-pill{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text2)}
        .rf2-pill.ok{color:var(--green)}
        .rf2-empty{padding:28px 20px;color:var(--text2);font-size:14px;line-height:1.6}
        .rf2-empty b{display:block;color:var(--text);font-size:15px;margin-bottom:4px}
        .rf2-steps{list-style:none;margin:12px 0 0;padding:0;counter-reset:rf2;display:grid;gap:8px;color:var(--text2);font-size:13px;line-height:1.55}
        .rf2-steps li{display:flex;gap:10px;counter-increment:rf2}
        .rf2-steps li::before{content:counter(rf2);flex-shrink:0;width:22px;height:22px;border-radius:50%;background:var(--card2);color:var(--text);font:600 12px/22px var(--font);text-align:center}
        .rf2-failed>div{margin-top:12px}
        .rf2-skel{display:grid;gap:10px;padding:16px 20px}
        .rf2-step{display:flex;flex-direction:column;align-items:flex-start;gap:6px}
        .rf2-remind{min-height:36px;padding:0 12px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);font-weight:600;font-size:13px;font-family:inherit;font-family:inherit;cursor:pointer}
        .rf2-remind:disabled{opacity:.6;cursor:default}
        .rf2-note{font-size:12px;color:var(--text2)}
        .rf2-tabs{display:inline-flex;flex-shrink:0;border:1px solid var(--border);border-radius:10px;overflow:hidden}
        .rf2-tabs button{min-height:36px;padding:0 12px;white-space:nowrap;border:0;background:var(--card);color:var(--text2);font-weight:600;font-size:13px;font-family:inherit;font-family:inherit;cursor:pointer}
        .rf2-tabs button[aria-pressed="true"]{background:var(--text);color:var(--bg)}
        .rf2-prizes{display:flex;flex-wrap:wrap;gap:6px 8px;padding:12px 20px;border-bottom:1px solid var(--border);font-size:13px;color:var(--text2)}
        .rf2-prizes span{padding:4px 10px;border:1px solid var(--border);border-radius:999px;white-space:nowrap}
        .rf2-prizes b{color:var(--text)}
        .rf2-lead{display:grid;grid-template-columns:40px minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:10px 20px;border-bottom:1px solid var(--border);font-size:14px}
        .rf2-lead:last-child{border-bottom:0}
        .rf2-lead.me{background:var(--card2)}
        .rf2-rank{font:600 14px var(--font-mono,ui-monospace,monospace);color:var(--text2)}
        .rf2-lead .won{font-weight:600;color:var(--green);white-space:nowrap}
        @media(max-width:520px){.rf2-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.rf2-row>:nth-child(2){display:none}.rf2-lead{grid-template-columns:32px minmax(0,1fr) auto;padding:10px 16px}.rf2-lead .won{grid-column:2/4;justify-self:start}}
      `}</style>

      <section className="rf2-card rf2-pad" aria-labelledby="rf2-link-h">
        <div className="rf2-label" id="rf2-link-h">Your referral link</div>
        <p className="rf2-lead-text">Earn <b>{naira(bonus, 0)}</b> for each friend who joins with your link, verifies their NIN and finishes a paid job. Your friend gets <b>{naira(signup, 0)}</b> when they verify.</p>
        {link ? (
          <>
            <div className="rf2-link">
              <input readOnly value={link} aria-label="Your referral link" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="rf2-btn dark" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            <div className="rf2-shares">
              <a className="rf2-btn" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-whatsapp" aria-hidden="true" /> WhatsApp</a>
              <a className="rf2-btn" href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" aria-label="Post on X"><i className="ti ti-brand-x" aria-hidden="true" /> X</a>
              <a className="rf2-btn" href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Get paid in Naira or USDC for small jobs on OgaPay")}`} target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" aria-hidden="true" /> Telegram</a>
            </div>
          </>
        ) : statsFailed ? <Failed what="your link" onRetry={retry} /> : <div className="rf2-sub">Loading your link…</div>}
      </section>

      {statsFailed && !stats ? (
        <section className="rf2-card" aria-label="Your referral numbers"><Failed what="your referral numbers" onRetry={retry} /></section>
      ) : (
        <section className="rf2-card rf2-stats" aria-label="Your referral numbers">
          <div><span className="rf2-label">Friends joined</span><b>{loading || !stats ? '…' : stats.totalReferrals ?? 0}</b></div>
          <div><span className="rf2-label">Bonuses paid</span><b>{loading || !stats ? '…' : `${rewarded} / ${cap}`}</b></div>
          <div><span className="rf2-label">Earned</span><b>{loading || !stats ? '…' : naira(Number(stats.totalEarned || 0), 0)}</b></div>
        </section>
      )}

      <section className="rf2-card" aria-labelledby="rf2-top">
        <div className="rf2-head">
          <div>
            <h2 id="rf2-top">Top inviters {week === 'this' ? 'this week' : 'last week'}</h2>
            <div className="rf2-count">{board ? (week === 'this' ? timeLeft(board.weekEnd) : 'Winners are paid every Monday') : boardFailed ? '' : '…'}</div>
          </div>
          <div className="rf2-tabs" role="group" aria-label="Which week">
            <button type="button" aria-pressed={week === 'this'} onClick={() => setWeek('this')}>This week</button>
            <button type="button" aria-pressed={week === 'last'} onClick={() => setWeek('last')}>Last week</button>
          </div>
        </div>
        <div className="rf2-prizes">
          {(board?.prizes || [10000, 5000, 3000, 1000]).slice(0, 3).map((p, i) => <span key={i}>{['1st', '2nd', '3rd'][i]} <b>{naira(p, 0)}</b></span>)}
          <span>4th–10th <b>{naira(board?.prizes?.[3] ?? 1000, 0)}</b> each</span>
        </div>
        {boardFailed ? (
          <Failed what="the top inviters" onRetry={() => setBoardKey((k) => k + 1)} />
        ) : !board ? (
          <div className="rf2-skel" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 36, borderRadius: 10 }} />)}</div>
        ) : board.leaders.length === 0 ? (
          <div className="rf2-empty"><b>No one has qualified {week === 'this' ? 'yet this week' : 'last week'}</b>{week === 'this' ? 'Share your link now. One verified friend with a finished job could put you on top.' : ''}</div>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Top inviters">
            {board.leaders.map((l) => (
              <li key={l.rank} className={`rf2-lead${l.isMe ? ' me' : ''}`}>
                <span className="rf2-rank">#{l.rank}</span>
                <span className="rf2-who">
                  {l.avatarUrl ? <img src={sized(l.avatarUrl, 32, true)} alt="" /> : <span className="av"><i className="ti ti-user" aria-hidden="true" /></span>}
                  {l.username ? <Link to={`/user/${l.username}`}>@{l.username}{l.isMe ? ' (you)' : ''}</Link> : <span>{l.isMe ? 'You (private profile)' : 'A private member'}</span>}
                </span>
                <span>{l.friends} {l.friends === 1 ? 'friend' : 'friends'}</span>
                {l.prize > 0 ? <span className="won">{naira(l.prize, 0)}</span> : <span />}
              </li>
            ))}
          </ol>
        )}
        {board?.me && week === 'this' && !board.leaders.some((l) => l.isMe) && (
          <div className="rf2-empty" style={{ borderTop: '1px solid var(--border)' }}>
            {board.me.friends > 0 ? `You have ${board.me.friends} qualified ${board.me.friends === 1 ? 'friend' : 'friends'} this week (#${board.me.rank}).` : (people.some((p) => p.step === 'verify' || p.step === 'job') ? 'No qualified friends this week yet. Remind the friends below who still have a step to do.' : 'No qualified friends this week yet. Share your link above to get on the board.')}
          </div>
        )}
      </section>

      <section className="rf2-card" aria-labelledby="rf2-hist">
        <div className="rf2-head"><h2 id="rf2-hist">Referral history</h2>{stats && <span className="rf2-count">{people.length} {people.length === 1 ? 'referral' : 'referrals'}</span>}</div>
        {!stats ? (
          statsFailed ? <Failed what="your referrals" onRetry={retry} /> : <div className="rf2-skel" aria-hidden="true">{[0, 1].map((i) => <div key={i} className="ui-sk" style={{ height: 40, borderRadius: 10 }} />)}</div>
        ) : people.length === 0 ? (
          <div className="rf2-empty">
            <b>No referrals yet</b>
            People who join through your referral link will appear here.
            <ol className="rf2-steps">
              <li>Share your link on WhatsApp, X or Telegram.</li>
              <li>Your friend signs up with it, verifies their NIN ({naira(signup, 0)} for them) and finishes their first paid job.</li>
              <li>{naira(bonus, 0)} goes to your wallet.</li>
            </ol>
          </div>
        ) : (
          <div role="table" aria-label="People you referred">
            <div className="rf2-row th" role="row"><span role="columnheader">Person</span><span role="columnheader">Joined</span><span role="columnheader">Where they are</span></div>
            {people.map((p) => (
              <div className="rf2-row" role="row" key={p.username + p.joinedAt}>
                <span className="rf2-who" role="cell">
                  {p.avatarUrl ? <img src={sized(p.avatarUrl, 32, true)} alt="" /> : <span className="av"><i className="ti ti-user" aria-hidden="true" /></span>}
                  <Link to={`/user/${p.username}`}>@{p.username}</Link>
                </span>
                <span role="cell">{day(p.joinedAt)}</span>
                <span role="cell" className="rf2-step">{(() => {
                  const st = STEPS[(p.step || (p.rewardedAt ? 'paid' : 'job')) as Step] || STEPS.job
                  const canRemind = p.step === 'verify' || p.step === 'job'
                  const note = reminded[p.username]
                  return (<>
                    <span className={`rf2-pill${st.ok ? ' ok' : ''}`}><i className={`ti ti-${st.icon}`} aria-hidden="true" /> {st.text === 'paid' ? `${naira(bonus, 0)} paid` : st.text}</span>
                    {canRemind && (note && note !== 'sending'
                      ? <span className="rf2-note" role="status">{note}</span>
                      : <button type="button" className="rf2-remind" disabled={note === 'sending'} onClick={() => remind(p.username)}>{note === 'sending' ? 'Sending…' : 'Remind them'}</button>)}
                  </>)
                })()}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rf2-card" aria-labelledby="rf2-earn">
        <div className="rf2-head"><h2 id="rf2-earn">Referral earnings</h2>{!loading && !bonusesFailed && <span className="rf2-count">{bonuses.length} {bonuses.length === 1 ? 'payment' : 'payments'}</span>}</div>
        {bonusesFailed ? (
          <Failed what="your referral earnings" onRetry={retry} />
        ) : loading ? (
          <div className="rf2-skel" aria-hidden="true"><div className="ui-sk" style={{ height: 40, borderRadius: 10 }} /></div>
        ) : bonuses.length === 0 ? (
          <div className="rf2-empty">No referral earnings yet. You're paid when someone you referred verifies their NIN and finishes their first paid job.</div>
        ) : (
          <div role="table" aria-label="Referral payments">
            <div className="rf2-row th" role="row"><span role="columnheader">Status</span><span role="columnheader">Reward</span><span role="columnheader">Date</span></div>
            {bonuses.map((b) => (
              <div className="rf2-row" role="row" key={b.id}>
                <span role="cell" className={`rf2-pill${b.status === 'COMPLETED' ? ' ok' : ''}`}>{b.status === 'COMPLETED' ? 'Paid' : b.status.charAt(0) + b.status.slice(1).toLowerCase()}</span>
                <span role="cell" style={{ fontWeight: 600 }}>{naira(Number(b.amount || 0), 0)}</span>
                <span role="cell">{day(b.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
