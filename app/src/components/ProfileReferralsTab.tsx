import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { naira } from '../lib/wallet'
import { sized } from '../lib/img'

// Referrals. The page is for inviting people, so it reads in that order:
// 1) the offer, your link and one-tap share, 2) your progress, 3) your friends
// (the ones who still have a step to do first, with Remind), 4) the weekly
// contest (your place first), 5) payments, folded. Desktop: the progress and
// the contest sit in a side panel that stays in view.
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
// Friends who still have a step to do come first: they're the ones to remind
const STEP_ORDER: Record<Step, number> = { verify: 0, job: 1, processing: 2, paid: 3, capped: 4 }

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
    <div className="rf3-empty" role="alert">
      <b>We couldn't load {what}</b>
      Check your connection and try again. Nothing has changed on your account.
      <div style={{ marginTop: 12 }}><button type="button" className="rf3-btn sm" onClick={onRetry}><i className="ti ti-refresh" aria-hidden="true" /> Try again</button></div>
    </div>
  )
}

const CSS = `
.rf3-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
.rf3-pad{padding:20px}
.rf3-h2{margin:0;font-size:16px;font-weight:600;color:var(--text)}
.rf3-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px 12px;padding:16px 20px;border-bottom:1px solid var(--border)}
.rf3-muted{font-size:13px;color:var(--text2);line-height:1.5}
.rf3-grid{display:grid;gap:16px}
.rf3-main,.rf3-side{display:grid;gap:16px;align-content:start;min-width:0}

.rf3-offer{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin-top:6px}
.rf3-offer b{font-size:26px;font-weight:700;letter-spacing:-.02em;color:var(--text)}
.rf3-offer span{font-size:14px;color:var(--text2)}
.rf3-linkrow{display:flex;align-items:center;gap:8px;margin-top:16px;padding:6px 6px 6px 14px;border:1px solid var(--border);border-radius:12px;background:var(--card2)}
.rf3-linkrow code{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:500 14px var(--font-mono,ui-monospace,monospace);color:var(--text)}
.rf3-btn{min-height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text);font-weight:600;font-size:14px;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;text-decoration:none;white-space:nowrap}
.rf3-btn.dark{background:var(--text);color:var(--bg);border-color:var(--text)}
.rf3-btn.sm{min-height:36px;padding:0 12px;font-size:13px;border-radius:10px}
.rf3-btn:disabled{opacity:.6;cursor:default}
.rf3-share{display:grid;grid-template-columns:minmax(0,1fr) repeat(3,48px);gap:8px;margin-top:10px}
.rf3-share .icon{padding:0;font-size:20px}
.rf3-how{list-style:none;margin:18px 0 0;padding:16px 0 0;border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;counter-reset:rf3}
.rf3-how li{counter-increment:rf3;font-size:12.5px;line-height:1.45;color:var(--text2)}
.rf3-how li::before{content:counter(rf3);display:grid;place-items:center;width:24px;height:24px;margin-bottom:6px;border-radius:50%;background:var(--card2);color:var(--text);font-weight:600;font-size:12px}
.rf3-how b{color:var(--text);font-weight:600}

.rf3-bar{height:8px;border-radius:99px;background:var(--card2);overflow:hidden;margin:10px 0 14px}
.rf3-bar i{display:block;height:100%;border-radius:99px;background:var(--green)}
.rf3-nums{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.rf3-nums div{min-width:0}
.rf3-nums span{display:block;font-size:12px;color:var(--text2)}
.rf3-nums b{display:block;margin-top:2px;font-size:20px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.rf3-row{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 20px;border-bottom:1px solid var(--border)}
.rf3-row:last-child{border-bottom:0}
.rf3-av{width:36px;height:36px;border-radius:50%;object-fit:cover;background:var(--card2);display:grid;place-items:center;color:var(--text3)}
.rf3-name{display:block;font-weight:600;font-size:14px;color:var(--text);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rf3-step{display:flex;align-items:center;gap:6px;margin-top:2px;font-size:12.5px;color:var(--text2)}
.rf3-step.ok{color:var(--green)}
.rf3-step.wait{color:var(--warn,#b45309)}
.rf3-note{font-size:12px;color:var(--text2);max-width:120px;text-align:right}

.rf3-me{display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid var(--border);background:var(--card2)}
.rf3-me b{font-size:28px;font-weight:700;color:var(--text);line-height:1}
.rf3-seg{display:grid;grid-template-columns:1fr 1fr;padding:3px;border-radius:10px;background:var(--card2);border:1px solid var(--border)}
.rf3-seg button{min-height:34px;padding:0 12px;border:0;border-radius:8px;background:none;color:var(--text2);font-weight:600;font-size:13px;font-family:inherit;cursor:pointer;white-space:nowrap}
.rf3-seg button[aria-pressed="true"]{background:var(--text);color:var(--bg)}
.rf3-prizes{display:flex;flex-wrap:wrap;gap:6px;padding:12px 20px;border-bottom:1px solid var(--border);font-size:12.5px;color:var(--text2)}
.rf3-prizes span{flex-shrink:0;padding:4px 10px;border:1px solid var(--border);border-radius:99px;white-space:nowrap}
.rf3-prizes b{color:var(--text)}
.rf3-lead{display:grid;grid-template-columns:24px 28px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 20px;border-bottom:1px solid var(--border);font-size:13.5px}
.rf3-lead.me{background:color-mix(in srgb,var(--green) 9%,transparent)}
.rf3-lead .rk{font-weight:600;color:var(--text2);font-variant-numeric:tabular-nums}
.rf3-lead .av{width:28px;height:28px;border-radius:50%;object-fit:cover;background:var(--card2);display:grid;place-items:center;color:var(--text3);font-size:14px}
.rf3-lead a,.rf3-lead .nm{color:var(--text);text-decoration:none;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rf3-lead .rt{text-align:right;white-space:nowrap;line-height:1.3}
.rf3-lead .rt small{display:block;color:var(--text2);font-size:12px}
.rf3-lead .rt b{color:var(--green);font-weight:600}
.rf3-more{width:100%;min-height:44px;border:0;background:none;color:var(--text);font-weight:600;font-size:13px;font-family:inherit;cursor:pointer}
.rf3-empty{padding:24px 20px;color:var(--text2);font-size:14px;line-height:1.6}
.rf3-empty b{display:block;color:var(--text);font-size:15px;margin-bottom:4px}
.rf3-skel{display:grid;gap:10px;padding:16px 20px}
.rf3-pay{display:flex;justify-content:space-between;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border);font-size:13.5px;color:var(--text2)}
.rf3-pay:last-child{border-bottom:0}
.rf3-pay b{color:var(--green)}
.rf3-fold summary{list-style:none;cursor:pointer;border-bottom:0}
.rf3-fold summary::-webkit-details-marker{display:none}
.rf3-fold[open] summary{border-bottom:1px solid var(--border)}
.rf3-fold summary i{transition:transform .2s}
.rf3-fold[open] summary i{transform:rotate(180deg)}

/* Progress shows in the column on phone/tablet, in the side panel on desktop */
.rf3-progress-side{display:none}
@media(min-width:1024px){
  .rf3-grid{grid-template-columns:minmax(0,1fr) 360px;gap:24px;align-items:start}
  .rf3-side{position:sticky;top:calc(var(--nav-h) + 16px)}
  .rf3-progress-main{display:none}
  .rf3-progress-side{display:block}
}
@media(max-width:767.98px){
  .rf3-pad{padding:16px}
  .rf3-head,.rf3-row,.rf3-lead,.rf3-prizes,.rf3-me,.rf3-pay{padding-left:16px;padding-right:16px}
  .rf3-offer b{font-size:22px}
  .rf3-how{grid-template-columns:1fr;gap:10px}
  .rf3-how li{display:flex;align-items:flex-start;gap:10px}
  .rf3-how li::before{margin:0;flex-shrink:0}
}
`

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
  const [showAll, setShowAll] = useState(false)
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
  const shortLink = link.replace(/^https?:\/\//, '')
  const bonus = stats?.bonusPerReferral ?? 500
  const cap = stats?.rewardCap ?? 20
  const rewarded = stats?.rewardedReferrals ?? 0
  const people = stats?.referrals ?? []
  const signup = stats?.signupBonus ?? 1000
  const pct = Math.min(100, Math.round((rewarded / Math.max(1, cap)) * 100))
  const friends = [...people].sort((a, b) => STEP_ORDER[(a.step || 'job') as Step] - STEP_ORDER[(b.step || 'job') as Step])
  const someoneToRemind = people.some((p) => p.step === 'verify' || p.step === 'job')
  // Says what the friend gets, not just the inviter
  const shareText = `Join me on OgaPay and get ${naira(signup, 0)} when you verify your NIN.\n\nThen earn from small jobs (follows, reviews, app tests), paid in Naira or USDC.\nSign up with my link: ${link}`

  const copy = () => navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  // Phones: the system share sheet (WhatsApp, SMS, Telegram...) in one tap; elsewhere copy the link
  const canShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function'
  const share = () => {
    if (canShare) (navigator as any).share({ title: 'Join me on OgaPay', text: shareText }).catch(() => {})
    else copy()
  }

  const progress = (
    statsFailed && !stats ? (
      <section className="rf3-card"><Failed what="your referral numbers" onRetry={retry} /></section>
    ) : (
      <section className="rf3-card rf3-pad" aria-label="Your referral progress">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
          <h2 className="rf3-h2">Your progress</h2>
          <span className="rf3-muted">{stats ? `${rewarded} of ${cap} bonuses` : '…'}</span>
        </div>
        <div className="rf3-bar" role="progressbar" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={rewarded} aria-label="Bonuses earned"><i style={{ width: `${pct}%` }} /></div>
        <div className="rf3-nums">
          <div><span>Friends joined</span><b>{loading || !stats ? '…' : stats.totalReferrals ?? 0}</b></div>
          <div><span>Bonuses paid</span><b>{loading || !stats ? '…' : rewarded}</b></div>
          <div><span>Earned</span><b>{loading || !stats ? '…' : naira(Number(stats.totalEarned || 0), 0)}</b></div>
        </div>
      </section>
    )
  )

  return (
    <div className="rf3">
      <style>{CSS}</style>
      <div className="rf3-grid">
        <div className="rf3-main">
          {/* 1. Invite: what you both get, the link, one-tap share, how it works */}
          <section className="rf3-card rf3-pad" aria-labelledby="rf3-invite">
            <h2 className="rf3-h2" id="rf3-invite">Invite friends, earn together</h2>
            <div className="rf3-offer"><b>{naira(bonus, 0)} for you</b><span>and {naira(signup, 0)} for your friend</span></div>
            {link ? (
              <>
                <div className="rf3-linkrow">
                  <code aria-label="Your referral link">{shortLink}</code>
                  <button type="button" className="rf3-btn sm" onClick={copy} aria-live="polite">{copied ? <><i className="ti ti-check" aria-hidden="true" /> Copied</> : <><i className="ti ti-copy" aria-hidden="true" /> Copy</>}</button>
                </div>
                <div className="rf3-share">
                  <button type="button" className="rf3-btn dark" onClick={share}><i className="ti ti-share" aria-hidden="true" /> {canShare ? 'Share invite' : copied ? 'Link copied' : 'Copy invite link'}</button>
                  <a className="rf3-btn icon" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp"><i className="ti ti-brand-whatsapp" aria-hidden="true" /></a>
                  <a className="rf3-btn icon" href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" aria-label="Post on X"><i className="ti ti-brand-x" aria-hidden="true" /></a>
                  <a className="rf3-btn icon" href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Get paid in Naira or USDC for small jobs on OgaPay')}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Telegram"><i className="ti ti-brand-telegram" aria-hidden="true" /></a>
                </div>
              </>
            ) : statsFailed ? <Failed what="your link" onRetry={retry} /> : <div className="ui-sk" style={{ height: 96, borderRadius: 12, marginTop: 16 }} aria-hidden="true" />}
            <ol className="rf3-how" aria-label="How it works">
              <li><span><b>Share your link</b><br />on WhatsApp, X or Telegram</span></li>
              <li><span><b>Your friend verifies their NIN</b><br />they get {naira(signup, 0)}</span></li>
              <li><span><b>They finish a paid job</b><br />you get {naira(bonus, 0)}</span></li>
            </ol>
          </section>

          {/* 2. Progress (here on phone and tablet; in the side panel on desktop) */}
          <div className="rf3-progress-main">{progress}</div>

          {/* 3. Your friends: who still needs a nudge comes first */}
          <section className="rf3-card" aria-labelledby="rf3-friends">
            <div className="rf3-head"><h2 className="rf3-h2" id="rf3-friends">Your friends</h2>{stats && <span className="rf3-muted">{people.length} joined</span>}</div>
            {!stats ? (
              statsFailed ? <Failed what="your friends" onRetry={retry} /> : <div className="rf3-skel" aria-hidden="true">{[0, 1].map((i) => <div key={i} className="ui-sk" style={{ height: 44, borderRadius: 10 }} />)}</div>
            ) : friends.length === 0 ? (
              <div className="rf3-empty"><b>No friends yet</b>When someone signs up with your link they show here, with the step they're on.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="People you referred">
                {friends.map((p) => {
                  const step = (p.step || (p.rewardedAt ? 'paid' : 'job')) as Step
                  const st = STEPS[step] || STEPS.job
                  const canRemind = step === 'verify' || step === 'job'
                  const note = reminded[p.username]
                  return (
                    <li className="rf3-row" key={p.username + p.joinedAt}>
                      {p.avatarUrl ? <img className="rf3-av" src={sized(p.avatarUrl, 36, true)} alt="" /> : <span className="rf3-av"><i className="ti ti-user" aria-hidden="true" /></span>}
                      <div style={{ minWidth: 0 }}>
                        <Link className="rf3-name" to={`/user/${p.username}`}>@{p.username}</Link>
                        <span className={`rf3-step${st.ok ? ' ok' : canRemind ? ' wait' : ''}`}><i className={`ti ti-${st.icon}`} aria-hidden="true" /> {st.text === 'paid' ? `${naira(bonus, 0)} paid to you` : st.text}</span>
                      </div>
                      {canRemind ? (note && note !== 'sending'
                        ? <span className="rf3-note" role="status">{note}</span>
                        : <button type="button" className="rf3-btn sm" disabled={note === 'sending'} onClick={() => remind(p.username)}>{note === 'sending' ? 'Sending…' : 'Remind'}</button>)
                        : <span />}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* 5. Payments, folded: the total is already in Your progress */}
          <details className="rf3-card rf3-fold">
            <summary className="rf3-head"><h2 className="rf3-h2">Referral payments</h2><span className="rf3-muted">{bonusesFailed ? '' : loading ? '…' : bonuses.length} <i className="ti ti-chevron-down" aria-hidden="true" /></span></summary>
            {bonusesFailed ? <Failed what="your referral payments" onRetry={retry} />
              : bonuses.length === 0 ? <div className="rf3-empty">No payments yet. You're paid when a friend verifies their NIN and finishes their first paid job.</div>
              : bonuses.map((b) => (
                <div className="rf3-pay" key={b.id}>
                  <span>{day(b.createdAt)} · {b.status === 'COMPLETED' ? 'Paid' : b.status.charAt(0) + b.status.slice(1).toLowerCase()}</span>
                  <b>{naira(Number(b.amount || 0), 0)}</b>
                </div>
              ))}
          </details>
        </div>

        <aside className="rf3-side" aria-label="Your progress and the weekly contest">
          <div className="rf3-progress-side">{progress}</div>

          {/* 4. Weekly contest: your place first, then the board */}
          <section className="rf3-card" aria-labelledby="rf3-top">
            <div className="rf3-head">
              <div>
                <h2 className="rf3-h2" id="rf3-top">Weekly contest</h2>
                <div className="rf3-muted">{board ? (week === 'this' ? timeLeft(board.weekEnd) : 'Winners are paid every Monday') : boardFailed ? '' : '…'}</div>
              </div>
              <div className="rf3-seg" role="group" aria-label="Which week">
                <button type="button" aria-pressed={week === 'this'} onClick={() => setWeek('this')}>This week</button>
                <button type="button" aria-pressed={week === 'last'} onClick={() => setWeek('last')}>Last week</button>
              </div>
            </div>
            {week === 'this' && board?.me && (
              <div className="rf3-me">
                <b>{board.me.rank ? `#${board.me.rank}` : '—'}</b>
                <div className="rf3-muted">{board.me.friends > 0
                  ? <>Your place · {board.me.friends} qualified {board.me.friends === 1 ? 'friend' : 'friends'} this week</>
                  : someoneToRemind ? 'Not on the board yet. Remind your friends who still have a step to do.' : 'Not on the board yet. Share your link to get on it.'}</div>
              </div>
            )}
            <div className="rf3-prizes">
              {(board?.prizes || [10000, 5000, 3000, 1000]).slice(0, 3).map((p, i) => <span key={i}>{['1st', '2nd', '3rd'][i]} <b>{naira(p, 0)}</b></span>)}
              <span>4th–10th <b>{naira(board?.prizes?.[3] ?? 1000, 0)}</b></span>
            </div>
            {boardFailed ? (
              <Failed what="the contest board" onRetry={() => setBoardKey((k) => k + 1)} />
            ) : !board ? (
              <div className="rf3-skel" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="ui-sk" style={{ height: 32, borderRadius: 10 }} />)}</div>
            ) : board.leaders.length === 0 ? (
              <div className="rf3-empty"><b>No one has qualified {week === 'this' ? 'yet' : 'last week'}</b>{week === 'this' ? 'One verified friend with a finished job could put you on top.' : ''}</div>
            ) : (
              <>
                <ol style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Top inviters">
                  {(showAll ? board.leaders : board.leaders.slice(0, 5)).map((l) => (
                    <li key={l.rank} className={`rf3-lead${l.isMe ? ' me' : ''}`}>
                      <span className="rk">{l.rank}</span>
                      {l.avatarUrl ? <img className="av" src={sized(l.avatarUrl, 28, true)} alt="" /> : <span className="av"><i className="ti ti-user" aria-hidden="true" /></span>}
                      {l.username ? <Link to={`/user/${l.username}`}>@{l.username}{l.isMe ? ' (you)' : ''}</Link> : <span className="nm">{l.isMe ? 'You' : 'A private member'}</span>}
                      <span className="rt">{l.prize > 0 && <b>{naira(l.prize, 0)}</b>}<small>{l.friends} {l.friends === 1 ? 'friend' : 'friends'}</small></span>
                    </li>
                  ))}
                </ol>
                {board.leaders.length > 5 && <button type="button" className="rf3-more" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show top 5' : `Show all ${board.leaders.length}`}</button>}
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
