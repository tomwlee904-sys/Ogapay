import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Money from '../components/Money'
import RateWork from '../components/RateWork'
import { useToast } from '../components/Toast'
import { apiRequest } from '../lib/api'
import { Pagination } from '../components/Pagination'
import '../styles/profile-public.css'
import '../styles/reviews-to-write.css'

/* Reviews to write, like wurk.fun's creator link of the same name. Work you
   approved without stars (you skipped them, it was approved automatically
   after 3 days, an admin approved it, or it won your contest) can still be
   rated for 14 days. Each piece of work can be rated once; the stars count
   towards the worker's rating and show on their public profile. */

type Item = {
  id: string
  place: number | null
  reviewedAt: string
  rateBy: string
  posterNotes: string | null
  // What the worker was paid (a contest place's own prize)
  payout?: number | string | null
  task: { id: string; title: string; reward: string | number; currency: string; isContest: boolean }
  worker: { id: string; username: string | null; firstName: string | null; lastName: string | null; avatarUrl: string | null }
}

const who = (w: Item['worker']) => w.username || [w.firstName, w.lastName].filter(Boolean).join(' ') || 'Someone'
// "@ada" for a username; a plain name gets no "@" so it doesn't look like a handle
const label = (w: Item['worker']) => (w.username ? '@' + w.username : who(w))
const day = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const PLACE = ['', '1st', '2nd', '3rd']
const placeName = (p: number) => PLACE[p] || `${p}th`
const PER_PAGE = 20

// How the work was approved, in a few words
const howApproved = (s: Item) => {
  if (s.place) return `Won ${placeName(s.place)} place`
  if (s.posterNotes?.startsWith('Approved automatically')) return 'Approved automatically'
  return 'Approved'
}

export default function ReviewsToWrite() {
  const { toast } = useToast()
  const [list, setList] = useState<Item[] | null>(null)
  const [days, setDays] = useState(14)
  const [error, setError] = useState(false)
  const [stars, setStars] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  // 20 at a time: one long page of every card was slow on phones
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true); setError(false)
    apiRequest<{ items: Item[]; days: number }>('/tasks/my/to-rate')
      .then((d) => { setList(Array.isArray(d?.items) ? d.items : []); if (d?.days) setDays(d.days) })
      .catch(() => { setError(true); setList([]) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const total = list?.length || 0
  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  // Rating the last card on the last page moves back a page
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const shown = (list || []).slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const save = async (s: Item) => {
    const rating = stars[s.id] || 0
    if (!rating) return
    const note = (notes[s.id] || '').trim()
    setBusy(s.id)
    try {
      await apiRequest(`/tasks/submissions/${s.id}/rate`, { method: 'POST', body: JSON.stringify({ rating, ...(note ? { feedback: note } : {}) }) })
      toast(`Thanks. ${label(s.worker)} got your ${rating}/5 rating.`, 'success')
      setList((l) => l?.filter((x) => x.id !== s.id) || l)
    } catch (e: any) {
      toast(e?.message || "That didn't work. Try again.", 'error')
      // Already rated (another tab), too old or disputed: it no longer belongs on the list
      if (/already has a rating|can be rated for|dispute/i.test(e?.message || '')) setList((l) => l?.filter((x) => x.id !== s.id) || l)
    }
    setBusy(null)
  }

  return (
    <Layout>
      <div className="up-wrap" style={{ maxWidth: 860 }}>
        <div className="up-sec-h" style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 24 }}>Reviews to write{list !== null && !error && <span className="rtw-count">{total} pending</span>}</h1>
          <p>Work you approved in the last {days} days without stars. Your stars count towards each worker's rating and show on their public profile.</p>
          <button className="up-btn" onClick={load} disabled={loading} style={{ marginTop: 10 }}>
            <i className="ti ti-refresh" aria-hidden="true" /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {list === null ? (
          <div className="up-skel" style={{ height: 160 }} />
        ) : error ? (
          <div className="up-empty"><i className="ti ti-cloud-off" />Couldn't load your reviews to write. Press Refresh to try again.</div>
        ) : list.length === 0 ? (
          <div className="up-empty">
            <i className="ti ti-circle-check" />
            <b style={{ display: 'block', fontSize: 16, color: 'var(--text)', marginBottom: 4 }}>All caught up</b>
            Nothing to review. Work you approve without stars shows here for {days} days.
            <div style={{ marginTop: 14 }}><Link className="up-btn" to="/manage-jobs">Go to My Jobs</Link></div>
          </div>
        ) : (
          <>
          {pages > 1 && <p className="rtw-range">Showing {(page - 1) * PER_PAGE + 1}–{(page - 1) * PER_PAGE + shown.length} of {total}</p>}
          <div className="up-list">
            {shown.map((s) => {
              const name = who(s.worker)
              return (
                <div className="up-card rtw-card" key={s.id}>
                  <div className="rtw-top">
                    <span className="rtw-av" aria-hidden="true">
                      {s.worker.avatarUrl ? <img src={s.worker.avatarUrl} alt="" /> : name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="rtw-mid">
                      {s.worker.username
                        ? <Link to={`/user/${encodeURIComponent(s.worker.username)}`} className="rtw-name">@{name}</Link>
                        : <b className="rtw-name">{name}</b>}
                      <Link to={`/manage-jobs?job=${encodeURIComponent(s.task.id)}`} className="rtw-job">{s.task.title}</Link>
                      <small>{howApproved(s)} {day(s.reviewedAt)} · Rate by {day(s.rateBy)}</small>
                    </div>
                    <Money amount={Number(s.payout ?? s.task.reward ?? 0)} currency={s.task.currency} size={14} />
                  </div>
                  <RateWork
                    who={label(s.worker)}
                    optional={false}
                    rating={stars[s.id] || 0}
                    note={notes[s.id] || ''}
                    disabled={busy === s.id}
                    onRating={(n) => setStars((m) => ({ ...m, [s.id]: n }))}
                    onNote={(v) => setNotes((m) => ({ ...m, [s.id]: v }))}
                  />
                  <div className="rtw-actions">
                    <button className="up-btn primary" disabled={!stars[s.id] || busy === s.id} onClick={() => save(s)}>
                      {busy === s.id ? 'Saving...' : 'Save rating'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 18 }}>
            <Pagination
              page={page}
              totalPages={pages}
              firstItem={(page - 1) * PER_PAGE + 1}
              lastItem={(page - 1) * PER_PAGE + shown.length}
              totalItems={total}
              onPageChange={(n) => { setPage(n); window.scrollTo({ top: 0 }) }}
            />
          </div>
          </>
        )}
      </div>
    </Layout>
  )
}
