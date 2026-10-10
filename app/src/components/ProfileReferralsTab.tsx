import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { naira } from '../lib/wallet'
import { sized } from '../lib/img'

// Referrals, laid out like wurk.fun's: totals, your link (with ready-made
// shares), the people you brought in, and what you've been paid for them.
// The bonus is paid once a referred person verifies their email or ID
// (backend wallet.service rewardForReferral), for up to `rewardCap` people.

type Referral = { username: string; avatarUrl: string | null; joinedAt: string; rewardedAt: string | null }
type Stats = {
  referralCode: string; totalReferrals: number; rewardedReferrals: number; totalEarned: number | string
  bonusPerReferral?: number; rewardCap?: number; referrals?: Referral[]
}
type Bonus = { id: string; amount: number | string; status: string; description?: string; createdAt: string }

const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function TabReferralsContent() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      const [s, tx] = await Promise.all([
        apiRequest<Stats>('/users/referrals/stats').catch(() => null),
        apiRequest<any>('/users/transactions/history?type=REFERRAL_BONUS').catch(() => null),
      ])
      if (!alive) return
      if (s) setStats(s)
      const list = Array.isArray(tx) ? tx : tx?.data ?? tx?.transactions ?? []
      setBonuses(list.filter((t: any) => t.type === 'REFERRAL_BONUS'))
      setLoading(false)
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { alive = false; window.removeEventListener('focus', onFocus) }
  }, [user?.id])

  const code = (user as any)?.referralCode || stats?.referralCode || ''
  const link = code ? `https://ogapay.app/ref/${code}` : ''
  const bonus = stats?.bonusPerReferral ?? 1000
  const cap = stats?.rewardCap ?? 20
  const rewarded = stats?.rewardedReferrals ?? 0
  const people = stats?.referrals ?? []
  const shareText = `Let's earn together!\n\nGet paid in Naira or USDC for small jobs on OgaPay.\nJoin me: ${link}`

  const copy = () => navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})

  return (
    <div className="rf2">
      <style>{`
        .rf2{display:grid;gap:16px}
        .rf2-top{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:16px}
        @media(max-width:760px){.rf2-top{grid-template-columns:1fr}}
        .rf2-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
        .rf2-pad{padding:20px}
        .rf2-label{font:500 var(--fs-label,11px) var(--font-mono,ui-monospace,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--text2)}
        .rf2-big{font-size:34px;font-weight:600;letter-spacing:-.02em;margin-top:8px;color:var(--text)}
        .rf2-sub{font-size:13px;color:var(--text2);margin-top:6px;line-height:1.5}
        .rf2-link{display:flex;gap:8px;margin-top:12px}
        .rf2-link input{flex:1;min-width:0;min-height:44px;padding:0 12px;border:1px solid var(--border);border-radius:12px;background:var(--bg2);color:var(--text);font:14px var(--font-mono,ui-monospace,monospace)}
        .rf2-btn{min-height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text);font:600 14px inherit;font-family:inherit;display:inline-flex;align-items:center;gap:6px;cursor:pointer;text-decoration:none;white-space:nowrap}
        .rf2-btn.dark{background:var(--text);color:var(--bg);border-color:var(--text)}
        .rf2-shares{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .rf2-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border)}
        .rf2-head h2{margin:0;font-size:16px;font-weight:600}
        .rf2-count{font:400 12px var(--font-mono,ui-monospace,monospace);color:var(--text2)}
        .rf2-row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:center;padding:12px 20px;border-bottom:1px solid var(--border);font-size:14px}
        .rf2-row:last-child{border-bottom:0}
        .rf2-row.th{background:var(--bg2);font:600 12px inherit;letter-spacing:.06em;text-transform:uppercase;color:var(--text2)}
        .rf2-who{display:flex;align-items:center;gap:10px;min-width:0}
        .rf2-who img,.rf2-who span.av{width:32px;height:32px;border-radius:50%;object-fit:cover;background:var(--bg2);display:grid;place-items:center;flex-shrink:0;color:var(--text3)}
        .rf2-who a{color:var(--text);text-decoration:none;font-weight:600;overflow:hidden;text-overflow:ellipsis}
        .rf2-pill{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text2)}
        .rf2-pill.ok{color:var(--green)}
        .rf2-empty{padding:28px 20px;color:var(--text2);font-size:14px;line-height:1.6}
        .rf2-empty b{display:block;color:var(--text);font-size:15px;margin-bottom:4px}
        .rf2-steps{margin:10px 0 0;padding-left:18px;color:var(--text2);font-size:13px;line-height:1.7}
      `}</style>

      <div className="rf2-top">
        <section className="rf2-card rf2-pad" aria-label="Total referrals">
          <div className="rf2-label">Total referrals</div>
          <div className="rf2-big">{loading ? '…' : stats?.totalReferrals ?? 0}</div>
          <div className="rf2-sub">{rewarded} verified · {naira(Number(stats?.totalEarned || 0), 0)} earned</div>
        </section>
        <section className="rf2-card rf2-pad" aria-labelledby="rf2-link-h">
          <div className="rf2-label" id="rf2-link-h">Your referral link</div>
          <div className="rf2-sub">You earn <b>{naira(bonus, 0)}</b> for each friend who joins with your link and verifies their email or ID, for up to {cap} friends ({rewarded} of {cap} so far).</div>
          {link ? (
            <>
              <div className="rf2-link">
                <input readOnly value={link} aria-label="Your referral link" onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className="rf2-btn dark" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button>
              </div>
              <div className="rf2-shares">
                <a className="rf2-btn" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-whatsapp" aria-hidden="true" /> WhatsApp</a>
                <a className="rf2-btn" href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-x" aria-hidden="true" /> Post on X</a>
                <a className="rf2-btn" href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Get paid in Naira or USDC for small jobs on OgaPay")}`} target="_blank" rel="noopener noreferrer"><i className="ti ti-brand-telegram" aria-hidden="true" /> Telegram</a>
              </div>
            </>
          ) : <div className="rf2-sub">Loading your link…</div>}
        </section>
      </div>

      <section className="rf2-card" aria-labelledby="rf2-hist">
        <div className="rf2-head"><h2 id="rf2-hist">Referral history</h2><span className="rf2-count">{people.length} {people.length === 1 ? 'referral' : 'referrals'}</span></div>
        {people.length === 0 ? (
          <div className="rf2-empty">
            <b>No referrals yet</b>
            People who join through your referral link will appear here.
            <ol className="rf2-steps">
              <li>Share your link on WhatsApp, X or Telegram.</li>
              <li>Your friend signs up with it and verifies their email or ID.</li>
              <li>{naira(bonus, 0)} goes to your wallet.</li>
            </ol>
          </div>
        ) : (
          <div role="table" aria-label="People you referred">
            <div className="rf2-row th" role="row"><span role="columnheader">Person</span><span role="columnheader">Joined</span><span role="columnheader">Your bonus</span></div>
            {people.map((p) => (
              <div className="rf2-row" role="row" key={p.username + p.joinedAt}>
                <span className="rf2-who" role="cell">
                  {p.avatarUrl ? <img src={sized(p.avatarUrl, 32, true)} alt="" /> : <span className="av"><i className="ti ti-user" aria-hidden="true" /></span>}
                  <Link to={`/user/${p.username}`}>@{p.username}</Link>
                </span>
                <span role="cell">{day(p.joinedAt)}</span>
                <span role="cell">{p.rewardedAt
                  ? <span className="rf2-pill ok"><i className="ti ti-circle-check" aria-hidden="true" /> {naira(bonus, 0)} paid</span>
                  : <span className="rf2-pill"><i className="ti ti-clock" aria-hidden="true" /> Waiting for them to verify</span>}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rf2-card" aria-labelledby="rf2-earn">
        <div className="rf2-head"><h2 id="rf2-earn">Referral earnings</h2><span className="rf2-count">{bonuses.length} {bonuses.length === 1 ? 'payment' : 'payments'}</span></div>
        {bonuses.length === 0 ? (
          <div className="rf2-empty">No referral earnings yet. You're paid when someone you referred verifies their email or ID.</div>
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
