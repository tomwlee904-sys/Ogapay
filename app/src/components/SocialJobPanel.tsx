import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'

// The quick social job box on a job page (task.social from GET /tasks/:id):
// the action and what it pays, the post it is about, progress (paid / waiting
// for review / held / open), the 15-minute place hold with a countdown for the
// person holding a place, and staggered access on big repost and raid jobs.

export type SocialInfo = {
  action: string; actionName: string; raidPack: string | null; blueTick: boolean; pricePerAction: number
  targetUrl: string | null; holdMinutes: number | null
  staggered: boolean; batchSize: number | null; batchEveryMinutes: number | null; openPlaces: number; nextBatchAt: string | null
  progress?: { paid: number; waiting: number; held: number; open: number; openNow: number }
}
type Post = { authorName: string; authorUsername: string; avatarUrl: string | null; text: string }

const PACKS: Record<string, string> = { SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large', MEGA: 'Mega' }
const ACTION_TEXT: Record<string, string> = {
  FOLLOW: 'Follow', LIKE: 'Like', REPOST: 'Repost', REPLY: 'Comment', BOOKMARK: 'Bookmark', QUOTE: 'Quote', VIEW: 'View', RAID: 'Raid: like, repost and comment',
}
const naira = (n: number) => `₦${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

// "4:59" from milliseconds
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function useTick(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

export default function SocialJobPanel({ jobId, social, holdEndsAt, signedIn, onTimeUp }: {
  jobId: string; social: SocialInfo; holdEndsAt?: string | null; signedIn: boolean; onTimeUp?: () => void
}) {
  const holdEnd = holdEndsAt ? new Date(holdEndsAt).getTime() : 0
  const nextBatch = social.nextBatchAt ? new Date(social.nextBatchAt).getTime() : 0
  const now = useTick(!!holdEnd || !!nextBatch)
  const [post, setPost] = useState<Post | null>(null)

  // The target post, read the same way as the X campaign builder (signed in only)
  const isPost = !!social.targetUrl && /\/status\/\d+/.test(social.targetUrl)
  useEffect(() => {
    if (!isPost || !signedIn) return
    let live = true
    apiRequest<any>('/twitter/fetch-post', { method: 'POST', body: JSON.stringify({ url: social.targetUrl }) })
      .then((d) => { if (live && d?.authorUsername && d.authorUsername !== 'unknown') setPost(d) })
      .catch(() => { /* the link is still shown */ })
    return () => { live = false }
  }, [isPost, signedIn, social.targetUrl])

  // When the batch or the hold runs out, the page reloads the job once
  const [fired, setFired] = useState('')
  useEffect(() => {
    const key = holdEnd && now >= holdEnd ? `h${holdEnd}` : nextBatch && now >= nextBatch ? `b${nextBatch}` : ''
    if (key && key !== fired) { setFired(key); onTimeUp?.() }
  }, [now, holdEnd, nextBatch, fired, onTimeUp])

  const p = social.progress
  const total = p ? p.paid + p.waiting + p.held + p.open : 0
  const pct = (n: number) => (total ? `${(n / total) * 100}%` : '0%')
  const handle = social.targetUrl?.match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})/i)?.[1]

  return (
    <section className="wjd-panel sjp">
      <style>{`
        .sjp{padding:20px 22px;display:grid;gap:14px}
        .sjp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
        .sjp-head b{font-size:15px;font-weight:600;display:inline-flex;align-items:center;gap:8px}
        .sjp-head small{display:block;font-size:12.5px;color:var(--text2);margin-top:4px}
        .sjp-pay{text-align:right}
        .sjp-pay strong{display:block;font-size:20px;font-weight:600;color:var(--green);font-variant-numeric:tabular-nums}
        .sjp-pay span{font-size:12px;color:var(--text2)}
        .sjp-bar{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--card2);border:1px solid var(--border)}
        .sjp-bar i{display:block;height:100%}
        .sjp-counts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
        .sjp-counts div{border:1px solid var(--border);border-radius:12px;padding:8px 10px}
        .sjp-counts b{display:block;font-size:16px;font-weight:600;font-variant-numeric:tabular-nums}
        .sjp-counts span{font-size:12px;color:var(--text2);display:inline-flex;align-items:center;gap:6px}
        .sjp-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
        .sjp-note{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;border:1px solid var(--border);font-size:13px;line-height:1.5;color:var(--text2)}
        .sjp-note b{color:var(--text)}
        .sjp-note.hot{border-color:var(--accent);background:rgba(var(--accent-rgb),0.06)}
        .sjp-note .ti{font-size:18px;color:var(--accent);flex-shrink:0;margin-top:1px}
        .sjp-clock{font-variant-numeric:tabular-nums;font-weight:600;color:var(--text)}
        .sjp-post{border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:grid;gap:8px;text-decoration:none;color:var(--text)}
        .sjp-post:hover{border-color:var(--accent)}
        .sjp-author{display:flex;align-items:center;gap:10px;font-size:13px}
        .sjp-author img,.sjp-author .ph{width:32px;height:32px;border-radius:50%;object-fit:cover;background:var(--card2);display:grid;place-items:center}
        .sjp-author span{color:var(--text2)}
        .sjp-post p{margin:0;font-size:13.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
        .sjp-post small{font-size:12px;color:var(--accent);overflow-wrap:anywhere}
        @media (max-width:600px){.sjp{padding:16px}.sjp-counts{grid-template-columns:1fr 1fr}.sjp-pay{text-align:left}}
      `}</style>

      <div className="sjp-head">
        <div>
          <b><i className="ti ti-brand-x" /> {ACTION_TEXT[social.action] || social.actionName}{social.raidPack ? ` · ${PACKS[social.raidPack] || social.raidPack} pack` : ''}</b>
          <small>{social.blueTick ? 'Blue-tick X accounts only. ' : ''}Quick social job: take a place, do it on X, send proof.</small>
        </div>
        <div className="sjp-pay">
          <strong>{naira(social.pricePerAction)}</strong>
          <span>per {social.action === 'RAID' ? 'raider' : social.actionName}</span>
        </div>
      </div>

      {p && (
        <>
          <div className="sjp-bar" role="img" aria-label={`${p.paid} paid, ${p.waiting} waiting for review, ${p.held} held, ${p.open} open`}>
            <i style={{ width: pct(p.paid), background: 'var(--green)' }} />
            <i style={{ width: pct(p.waiting), background: 'var(--accent)' }} />
            <i style={{ width: pct(p.held), background: '#f59e0b' }} />
          </div>
          <div className="sjp-counts">
            <div><b>{p.paid}</b><span><i className="sjp-dot" style={{ background: 'var(--green)' }} />Paid</span></div>
            <div><b>{p.waiting}</b><span><i className="sjp-dot" style={{ background: 'var(--accent)' }} />Waiting</span></div>
            <div><b>{p.held}</b><span><i className="sjp-dot" style={{ background: '#f59e0b' }} />Held</span></div>
            <div><b>{p.open}</b><span><i className="sjp-dot" style={{ background: 'var(--border)' }} />Open</span></div>
          </div>
        </>
      )}

      {holdEnd > 0 && (
        <div className="sjp-note hot" role="status">
          <i className="ti ti-hourglass" aria-hidden="true" />
          <span>
            {now < holdEnd
              ? <>Your place is held for <span className="sjp-clock">{clock(holdEnd - now)}</span>. Do the task and <Link to={`/tasks/${jobId}/submit`} style={{ fontWeight: 600 }}>send your proof</Link> before the time runs out, or the place goes to someone else.</>
              : <>Your {social.holdMinutes} minutes ran out. If the place was given to someone else, you can take it again while places are open.</>}
          </span>
        </div>
      )}

      {social.holdMinutes && !holdEnd && (
        <div className="sjp-note">
          <i className="ti ti-clock" aria-hidden="true" />
          <span>When you take a place it is <b>held for {social.holdMinutes} minutes</b>. Send your proof in that time, or the place goes to the next person.</span>
        </div>
      )}

      {social.staggered && (
        <div className="sjp-note">
          <i className="ti ti-users-group" aria-hidden="true" />
          <span>
            To keep things fair and stop bots taking every place at once, places open <b>{social.batchSize} at a time, every {social.batchEveryMinutes} minutes</b>.
            {nextBatch > now
              ? <> {p && p.openNow > 0 ? `${p.openNow} open now. ` : 'All places opened so far are taken. '}Next batch in <span className="sjp-clock">{clock(nextBatch - now)}</span>.</>
              : ' Every place is open now.'}
          </span>
        </div>
      )}

      {social.targetUrl && (
        <a className="sjp-post" href={social.targetUrl} target="_blank" rel="noopener noreferrer">
          <div className="sjp-author">
            {post?.avatarUrl ? <img src={post.avatarUrl} alt="" /> : <span className="ph"><i className="ti ti-brand-x" /></span>}
            <div><b>{post?.authorName || (handle ? `@${handle}` : 'X')}</b>{post && <span> @{post.authorUsername}</span>}</div>
          </div>
          {post?.text && <p>{post.text.length > 280 ? `${post.text.slice(0, 280)}…` : post.text}</p>}
          <small>{isPost ? 'Open the post on X' : 'Open the profile on X'} <i className="ti ti-external-link" /></small>
        </a>
      )}
    </section>
  )
}
