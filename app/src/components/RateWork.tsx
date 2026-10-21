import { useId } from 'react'
import '../styles/rate-work.css'

/* Optional 1-5 stars and a short note that go with "Approve and pay", like
   wurk.fun's creator reviews. The server adds the stars to the worker's
   average rating (ranks Advanced, Expert and Legend need 4.0, 4.5 and 4.8) and
   the note shows on their public profile. Tapping the chosen star again
   clears it, so approving without stars stays one tap. */

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']
// SVG stars: the icon font's filled variants aren't loaded
const STAR = 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'

export const RATE_NOTE_MAX = 280

export function StarIcon({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR} className={on ? 'rw-on' : 'rw-off'} />
    </svg>
  )
}

// Read-only stars for work that was already rated, e.g. "Rated 4/5"
export function RatedStars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="rw-rated" role="img" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} on={i <= value} size={size} />)}
    </span>
  )
}

// Whether an admin gave a rating rather than the job's poster: an admin can
// approve flagged work from the moderation queue with stars. Older ratings
// don't say who rated them, so a moderated one counts as the team's.
export function ratedByTeam(sub: { ratedById?: string | null; moderatedById?: string | null }, posterId?: string | null) {
  if (sub.ratedById) return !!posterId && sub.ratedById !== posterId
  return !!sub.moderatedById
}

export default function RateWork({ who, rating, note, onRating, onNote, disabled }: {
  who: string
  rating: number
  note: string
  onRating: (n: number) => void
  onNote: (s: string) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <fieldset className="rw" disabled={disabled}>
      <legend className="rw-legend">Rate {who}'s work <span>(optional)</span></legend>
      <div className="rw-row">
        <div className="rw-stars" role="group" aria-label={`Stars for ${who}`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              aria-pressed={rating === i}
              aria-label={`${i} star${i === 1 ? '' : 's'}, ${WORDS[i]}`}
              className="rw-star"
              onClick={() => onRating(rating === i ? 0 : i)}
            >
              <StarIcon on={i <= rating} />
            </button>
          ))}
        </div>
        <span className="rw-word" aria-live="polite">{rating ? `${rating}/5 ${WORDS[rating]}` : 'No stars'}</span>
      </div>
      {rating > 0 && (
        <>
          <label className="rw-sr" htmlFor={id}>A short note for {who} (optional)</label>
          <input
            id={id}
            className="ui-input rw-note"
            maxLength={RATE_NOTE_MAX}
            value={note}
            onChange={(e) => onNote(e.target.value)}
            placeholder="Add a short note (optional)"
          />
          <p className="rw-hint">The stars count towards their rating. The stars and note show on their public profile.</p>
        </>
      )}
    </fieldset>
  )
}
