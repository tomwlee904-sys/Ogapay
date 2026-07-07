import { useState } from 'react'

interface StarRatingProps {
  rating: number
  size?: number
  interactive?: boolean
  onChange?: (val: number) => void
}

export default function StarRating({ rating, size = 14, interactive, onChange }: StarRatingProps) {
  const [hover, setHover] = useState(0)

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= (interactive ? (hover || rating) : Math.round(rating))
        return (
          <span
            key={i}
            onMouseEnter={() => interactive && setHover(i)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onChange?.(i)}
            style={{
              cursor: interactive ? 'pointer' : 'default',
              fontSize: size,
              color: filled ? '#f5b301' : 'var(--border)',
              transition: 'color .1s',
              lineHeight: 1,
            }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill="#f5b301" style={{display:'block'}}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
        )
      })}
      {!interactive && rating > 0 && (
        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 2 }}>{rating.toFixed(1)}</span>
      )}
    </span>
  )
}
