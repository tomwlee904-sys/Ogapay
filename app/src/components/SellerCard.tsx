import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'

interface SellerData {
  id: string
  username: string
  firstName?: string
  avatarUrl?: string | null
  bio?: string | null
  rating?: number
  reviews?: number
  tasksCompleted?: number
  successRate?: number
  level?: string
  skills?: string[]
  productCount?: number
  memberSince?: string
}

interface Props {
  seller: SellerData
}

export default function SellerCard({ seller }: Props) {
  const navigate = useNavigate()
  const displayName = seller.firstName || seller.username

  return (
    <div
      onClick={() => navigate('/user/' + seller.username)}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 20,
        cursor: 'pointer',
        transition: 'background .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <Avatar src={seller.avatarUrl} name={displayName} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{displayName}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
            {seller.bio || (seller.level ? `${seller.level} Worker` : 'Store Seller')}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: 'var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        {[
          { num: seller.tasksCompleted ?? 0, label: 'Tasks' },
          { num: seller.productCount ?? 0, label: 'Products' },
          { num: seller.reviews ?? 0, label: 'Reviews' },
          { num: seller.rating ?? 0, label: 'Rating', isRating: true },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--card)', padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: s.isRating ? '#f5b301' : 'var(--text)' }}>
              {s.isRating ? `★ ${s.num.toFixed(1)}` : s.num}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '10px 0',
          border: '1px solid var(--border)',
          borderRadius: 10,
          color: 'var(--text2)',
          fontSize: 13,
          fontWeight: 600,
          transition: 'all .15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.color = 'var(--accent)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text2)'
        }}
      >
        View Full Profile <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
      </div>
    </div>
  )
}
