import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { sized } from '../lib/img'

// Likes, comments and tips under a blog post. A tip is a naira transfer from your
// wallet to the author (the same transfer as sending money, with the same 2FA rule).

type Reactions = { likeCount: number; commentCount: number; tipTotal: number; tipCount: number; likedByMe: boolean }
type Comment = { id: string; body: string; createdAt: string; user: { id: string; username: string; firstName?: string | null; avatarUrl?: string | null } }

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-US')}`
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function BlogReactions({ slug, post }: { slug: string; post: any }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [r, setR] = useState<Reactions>({
    likeCount: post.likeCount || 0, commentCount: post.commentCount || 0, tipTotal: post.tipTotal || 0, tipCount: post.tipCount || 0, likedByMe: !!post.likedByMe,
  })
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [tipOpen, setTipOpen] = useState(false)
  const signIn = () => navigate(`/login?redirect=${encodeURIComponent(`/blog/${slug}`)}`)
  const isAuthor = !!user && user.id === post.authorId

  useEffect(() => {
    apiRequest<{ comments: Comment[] }>(`/blog/${slug}/comments`, { auth: false })
      .then((d) => setComments(d?.comments || []))
      .catch(() => setComments([]))
  }, [slug])

  const like = async () => {
    if (!user) return signIn()
    const was = r.likedByMe
    setR((x) => ({ ...x, likedByMe: !was, likeCount: x.likeCount + (was ? -1 : 1) }))
    try {
      const d = await apiRequest<Reactions>(`/blog/${slug}/like`, { method: was ? 'DELETE' : 'POST' })
      setR(d)
    } catch {
      setR((x) => ({ ...x, likedByMe: was, likeCount: x.likeCount + (was ? 1 : -1) }))
    }
  }

  const send = async () => {
    if (!user) return signIn()
    if (!text.trim()) return
    setBusy(true)
    setError('')
    try {
      const c = await apiRequest<Comment>(`/blog/${slug}/comments`, { method: 'POST', body: JSON.stringify({ body: text.trim() }) })
      setComments((cs) => [...(cs || []), c])
      setR((x) => ({ ...x, commentCount: x.commentCount + 1 }))
      setText('')
    } catch (e: any) {
      setError(e?.message || 'Could not post your comment')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await apiRequest(`/blog/comments/${id}`, { method: 'DELETE' })
      setComments((cs) => (cs || []).filter((c) => c.id !== id))
      setR((x) => ({ ...x, commentCount: Math.max(0, x.commentCount - 1) }))
    } catch { /* leave it */ }
  }

  return (
    <section className="br">
      <style>{`
        .br{margin-top:28px}
        .br-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .br-btn{display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 14px;border-radius:999px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font:600 13px var(--font);cursor:pointer}
        .br-btn i{font-size:17px}
        .br-btn.on{border-color:color-mix(in srgb,var(--red) 40%,var(--border));color:var(--red)}
        .br-btn:disabled{opacity:.6;cursor:default}
        .br-note{font-size:12.5px;color:var(--text3)}
        .br-com{margin-top:28px}
        .br-com h2{margin:0 0 12px;font-size:17px;font-weight:600;color:var(--text)}
        .br-form{display:grid;gap:8px}
        .br-form textarea{width:100%;min-height:84px;resize:vertical;box-sizing:border-box}
        .br-form-row{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12px;color:var(--text3)}
        .br-err{font-size:13px;color:var(--red)}
        .br-list{display:grid;gap:14px;margin-top:18px}
        .br-c{display:grid;grid-template-columns:34px 1fr;gap:10px}
        .br-av{width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--card2);color:var(--text2);font-size:13px;font-weight:600}
        .br-av img{width:100%;height:100%;object-fit:cover}
        .br-c-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}
        .br-c-head a{font-weight:600;color:var(--text);text-decoration:none}
        .br-c-head small{color:var(--text3)}
        .br-c-head button{margin-left:auto;background:none;border:0;color:var(--text3);font:500 12px var(--font);cursor:pointer}
        .br-c p{margin:4px 0 0;font-size:14px;line-height:1.6;color:var(--text);white-space:pre-wrap;overflow-wrap:anywhere}
      `}</style>

      <div className="br-bar">
        <button type="button" className={`br-btn${r.likedByMe ? ' on' : ''}`} onClick={like} aria-pressed={r.likedByMe}>
          <i className={`ti ${r.likedByMe ? 'ti-heart-filled' : 'ti-heart'}`} /> {r.likeCount} {r.likeCount === 1 ? 'like' : 'likes'}
        </button>
        <a className="br-btn" href="#comments"><i className="ti ti-message-circle" /> {r.commentCount} {r.commentCount === 1 ? 'comment' : 'comments'}</a>
        {!isAuthor && (
          <button type="button" className="br-btn" onClick={() => (user ? setTipOpen(true) : signIn())}>
            <i className="ti ti-coin" /> Tip the author
          </button>
        )}
        {r.tipCount > 0 && <span className="br-note">{naira(r.tipTotal)} tipped by {r.tipCount} reader{r.tipCount === 1 ? '' : 's'}</span>}
      </div>

      <div className="br-com" id="comments">
        <h2>Comments</h2>
        {user ? (
          <div className="br-form">
            <textarea className="ui-input" maxLength={1000} placeholder="Add a comment" value={text} onChange={(e) => setText(e.target.value)} aria-label="Your comment" />
            <div className="br-form-row">
              <span>{text.length} / 1,000</span>
              <button type="button" className="ui-btn ui-btn-dark" disabled={busy || !text.trim()} onClick={send}>{busy ? 'Posting…' : 'Post comment'}</button>
            </div>
            {error && <div className="br-err">{error}</div>}
          </div>
        ) : (
          <button type="button" className="ui-btn ui-btn-ghost" onClick={signIn}>Sign in to comment</button>
        )}
        <div className="br-list">
          {comments === null ? <span className="br-note">Loading comments…</span>
            : comments.length === 0 ? <span className="br-note">No comments yet.</span>
              : comments.map((c) => (
                <div key={c.id} className="br-c">
                  <span className="br-av">{c.user.avatarUrl ? <img src={sized(c.user.avatarUrl, 34, true)} alt="" loading="lazy" /> : (c.user.username || '?').charAt(0).toUpperCase()}</span>
                  <div>
                    <div className="br-c-head">
                      <Link to={`/user/${encodeURIComponent(c.user.username)}`}>@{c.user.username}</Link>
                      <small>{when(c.createdAt)}</small>
                      {user && (user.id === c.user.id || isAuthor || user.role === 'ADMIN') && <button type="button" onClick={() => remove(c.id)}>Remove</button>}
                    </div>
                    <p>{c.body}</p>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {tipOpen && <TipModal slug={slug} author={post.author?.username} onClose={() => setTipOpen(false)} onSent={(d) => { setR((x) => ({ ...x, tipTotal: d.tipTotal, tipCount: d.tipCount })); setTipOpen(false) }} />}
    </section>
  )
}

function TipModal({ slug, author, onClose, onSent }: { slug: string; author?: string; onClose: () => void; onSent: (d: Reactions) => void }) {
  const [amount, setAmount] = useState('500')
  const [otp, setOtp] = useState('')
  const [needOtp, setNeedOtp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const value = Number(amount.replace(/[^0-9]/g, '')) || 0

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      const d = await apiRequest<Reactions>(`/blog/${slug}/tip`, { method: 'POST', body: JSON.stringify({ amount: value, ...(otp && { otp }) }) })
      onSent(d)
    } catch (e: any) {
      const msg = e?.message || 'Could not send the tip'
      if (/2FA|authenticator/i.test(msg)) setNeedOtp(true)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,.5)' }} onClick={onClose}>
      <div className="ui-card" role="dialog" aria-modal="true" aria-label="Tip the author" style={{ width: 'min(400px, 100%)', padding: 22, display: 'grid', gap: 14 }} onClick={(e) => e.stopPropagation()}>
        <div>
          <b style={{ fontSize: 16, color: 'var(--text)' }}>Tip {author ? `@${author}` : 'the author'}</b>
          <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.55, color: 'var(--text2)' }}>Goes straight from your OgaPay naira wallet to theirs. No fee.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[200, 500, 1000, 2000].map((v) => (
            <button key={v} type="button" className={`ui-btn ${value === v ? 'ui-btn-dark' : 'ui-btn-ghost'}`} onClick={() => setAmount(String(v))}>{naira(v)}</button>
          ))}
        </div>
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
          Amount (₦100 or more)
          <input className="ui-input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
        </label>
        {needOtp && (
          <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text2)' }}>
            Code from your authenticator app
            <input className="ui-input" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))} />
          </label>
        )}
        {error && <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ui-btn ui-btn-dark" disabled={busy || value < 100 || (needOtp && !otp)} onClick={send}>{busy ? 'Sending…' : `Send ${naira(value)}`}</button>
        </div>
      </div>
    </div>
  )
}
