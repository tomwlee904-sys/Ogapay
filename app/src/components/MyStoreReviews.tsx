import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import Avatar from './Avatar'
import StarRating from './StarRating'
import LoadError from './LoadError'
import { Pagination } from './Pagination'

// My Store > Reviews (F25, 2026-11-10): reviews of the seller's products, with
// one reply per review (editable) that shows under the review on the product page.
type Review = {
  id: string; username: string; avatarUrl: string | null; rating: number; comment: string | null; createdAt: string
  sellerReply: string | null; sellerRepliedAt: string | null
  item: { id: string; name: string; deleted: boolean }
}
type Data = {
  reviews: Review[]
  summary: { total: number; average: number; last7Days: number; stars: Record<string, number> }
  pagination: { page: number; limit: number; total: number; pages: number }
}
const FILTERS = [['', 'All'], ['5', '5 stars'], ['3-4', '3-4 stars'], ['1-2', '1-2 stars']] as const
const REPLY_MAX = 1000
const day = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function MyStoreReviews() {
  const [stars, setStars] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Data | null>(null)
  const [failed, setFailed] = useState(false)
  const load = () => {
    setFailed(false)
    apiRequest<Data>(`/store/my-reviews?page=${page}&stars=${encodeURIComponent(stars)}`).then(setData).catch(() => setFailed(true))
  }
  useEffect(load, [page, stars])
  // A saved or removed reply updates that review only
  const replaced = (r: Review) => setData((d) => d && { ...d, reviews: d.reviews.map((x) => (x.id === r.id ? { ...x, sellerReply: r.sellerReply, sellerRepliedAt: r.sellerRepliedAt } : x)) })

  if (!data) return failed ? <LoadError what="your reviews" onRetry={load} /> : <div className="up-skel" style={{ height: 140 }} />
  const s = data.summary
  const p = data.pagination
  return (
    <div>
      <div className="ms2-stats ms2-stats-3">
        <div className="up-card ms2-stat"><span><i className="ti ti-star" /> Average</span><b>{s.total ? s.average.toFixed(1) : '—'}</b><small>out of 5</small></div>
        <div className="up-card ms2-stat"><span><i className="ti ti-message-circle" /> Reviews</span><b>{s.total}</b><small>on all your products</small></div>
        <div className="up-card ms2-stat"><span><i className="ti ti-clock" /> Last 7 days</span><b>{s.last7Days}</b><small>new reviews</small></div>
      </div>
      {s.total > 0 && (
        <div className="ms2-seg" role="radiogroup" aria-label="Filter by stars" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          {FILTERS.map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={stars === v} className={stars === v ? 'on' : ''} onClick={() => { setStars(v); setPage(1) }}>
              {label}{v ? ` (${v.split('-').reduce((n, k) => n + (s.stars[k] || 0), 0)})` : ''}
            </button>
          ))}
        </div>
      )}
      {data.reviews.length === 0 ? (
        <div className="up-empty"><i className="ti ti-star" />{s.total ? 'No reviews with these stars.' : 'No reviews yet. Buyers can review a product once their order is complete.'}</div>
      ) : data.reviews.map((r) => <ReviewRow key={r.id} review={r} onSaved={replaced} />)}
      <Pagination page={p.page} totalPages={p.pages} firstItem={(p.page - 1) * p.limit + 1} lastItem={Math.min(p.page * p.limit, p.total)} totalItems={p.total} onPageChange={setPage} />
    </div>
  )
}

function ReviewRow({ review: r, onSaved }: { review: Review; onSaved: (r: Review) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(r.sellerReply || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const save = async () => {
    if (!text.trim()) { setErr('Write your reply first'); return }
    setBusy(true); setErr('')
    try {
      onSaved(await apiRequest<Review>(`/store/reviews/${r.id}/reply`, { method: 'POST', body: JSON.stringify({ reply: text.trim() }) }))
      setEditing(false)
    } catch (e: any) { setErr(e?.message || "Your reply couldn't be saved") }
    setBusy(false)
  }
  const remove = async () => {
    if (!window.confirm('Remove your reply? Buyers will no longer see it.')) return
    setBusy(true); setErr('')
    try { onSaved(await apiRequest<Review>(`/store/reviews/${r.id}/reply`, { method: 'DELETE' })); setText('') }
    catch (e: any) { setErr(e?.message || "Your reply couldn't be removed") }
    setBusy(false)
  }
  return (
    <div className="up-card ms2-review">
      <div className="who">
        <Avatar src={r.avatarUrl} name={r.username} size={32} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <b><Link to={`/user/${r.username}`} style={{ color: 'inherit' }}>{r.username}</Link></b>
          <small>
            {r.item.deleted ? r.item.name : <Link to={`/store/${r.item.id}`} style={{ color: 'var(--text2)' }}>{r.item.name}</Link>} · {day(r.createdAt)}
          </small>
        </div>
        <span style={{ flexShrink: 0 }}><StarRating rating={r.rating} size={13} /></span>
      </div>
      {r.comment ? <p className="txt">{r.comment}</p> : <p className="txt" style={{ color: 'var(--text3)' }}>No comment, stars only.</p>}
      {editing ? (
        <div className="so-report">
          <label htmlFor={`rep-${r.id}`}>Your reply</label>
          {/* Opens ready to type, after the saved text when editing */}
          <textarea id={`rep-${r.id}`} rows={3} autoFocus onFocus={(e) => { const n = e.currentTarget.value.length; e.currentTarget.setSelectionRange(n, n) }} maxLength={REPLY_MAX} value={text} onChange={(e) => { setText(e.target.value); setErr('') }} placeholder="Thank the buyer, or explain what you did to fix a problem." />
          <small style={{ fontSize: 11.5, color: 'var(--text3)' }}>Everyone can see it under the review. {text.length.toLocaleString('en-US')} / {REPLY_MAX.toLocaleString('en-US')}</small>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="up-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : r.sellerReply ? 'Save reply' : 'Post reply'}</button>
            <button className="up-btn" disabled={busy} onClick={() => { setEditing(false); setText(r.sellerReply || ''); setErr('') }}>Cancel</button>
          </div>
        </div>
      ) : r.sellerReply ? (
        <div className="ms2-reply">
          <span><i className="ti ti-message-reply" aria-hidden="true" /> Your reply{r.sellerRepliedAt ? ` · ${day(r.sellerRepliedAt)}` : ''}</span>
          <p>{r.sellerReply}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="up-btn" disabled={busy} onClick={() => { setText(r.sellerReply || ''); setEditing(true) }}><i className="ti ti-pencil" /> Edit</button>
            <button className="up-btn" disabled={busy} onClick={remove}>Remove</button>
          </div>
        </div>
      ) : (
        <div><button className="up-btn" onClick={() => setEditing(true)}><i className="ti ti-message-reply" /> Reply</button></div>
      )}
      {err && <div className="up-note err" role="alert" style={{ marginTop: 0 }}>{err}</div>}
    </div>
  )
}
