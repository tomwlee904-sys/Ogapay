import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import Money from '../components/Money'
import RateWork from '../components/RateWork'
import { useToast } from '../components/Toast'
import { apiRequest } from '../lib/api'
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
  task: { id: string; title: string; reward: string | number; currency: string; isContest: boolean }
  worker: { id: string; username: string | null; firstName: string | null; lastName: string | null; avatarUrl: string | null }
}

const who = (w: Item['worker']) => w.username || [w.firstName, w.lastName].filter(Boolean).join(' ') || 'Someone'
const day = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const PLACE = ['', '1st', '2nd', '3rd']
const placeName = (p: number) => PLACE[p] || `${p}th`

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

  useEffect(() => {
    apiRequest<{ items: Item[]; days: number }>('/tasks/my/to-rate')
      .then((d) => { setList(Array.isArray(d?.items) ? d.items : []); if (d?.days) setDays(d.days) })
      .catch(() => { setError(true); setList([]) })
  }, [])

  const save = async (s: Item) => {
    const rating = stars[s.id] || 0
    if (!rating) return
    const note = (notes[s.id] || '').trim()
    setBusy(s.id)
    try {
      await apiRequest(`/tasks/submissions/${s.id}/rate`, { method: 'POST', body: JSON.stringify({ rating, ...(note ? { feedback: note } : {}) }) })
      toast(`Thanks. @${who(s.worker)} got your ${rating}/5 rating.`, 'success')
      setList((l) => l?.filter((x) => x.id !== s.id) || l)
    } catch (e: any) {
      toast(e?.message || "That didn't work. Try again.", 'error')
      // Already rated (another tab) or too old: it no longer belongs on the list
      if (/already has a rating|can be rated for/i.test(e?.message || '')) setList((l) => l?.filter((x) => x.id !== s.id) || l)
    }
    setBusy(null)
  }

  return (
    <Layout>
      <div className="up-wrap" style={{ maxWidth: 860 }}>
        <div className="up-sec-h" style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 24 }}>Reviews to write</h2>
          <p>Work you approved in the last {days} days without stars. Your stars count towards each worker's rating and show on their public profile.</p>
        </div>

        {list === null ? (
          <div className="up-skel" style={{ height: 160 }} />
        ) : error ? (
          <div className="up-empty"><i className="ti ti-cloud-off" />Couldn't load your reviews to write. Refresh to try again.</div>
        ) : list.length === 0 ? (
          <div className="up-empty">
            <i className="ti ti-star" />
            Nothing to review. Work you approve without stars shows here for {days} days.
            <div style={{ marginTop: 14 }}><Link className="up-btn" to="/manage-jobs">Go to My Jobs</Link></div>
          </div>
        ) : (
          <div className="up-list">
            {list.map((s) => {
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
                    <Money amount={Number(s.task.reward || 0)} currency={s.task.currency} size={14} />
                  </div>
                  <RateWork
                    who={`@${name}`}
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
        )}
      </div>
    </Layout>
  )
}
