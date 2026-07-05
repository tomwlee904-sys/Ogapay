interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  style?: React.CSSProperties
}

function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'var(--card2)',
        animation: 'skeletonPulse 1.6s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, padding: '20px 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Skeleton width={36} height={36} borderRadius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton width="60%" height={10} />
              <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
            </div>
          </div>
          <Skeleton height={8} borderRadius={4} style={{ marginBottom: 12 }} />
          <Skeleton height={8} borderRadius={4} style={{ marginBottom: 12, width: '80%' }} />
          <Skeleton height={80} borderRadius={10} style={{ marginBottom: 12 }} />
          <Skeleton height={48} borderRadius={10} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <Skeleton width={48} height={48} borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height={14} />
            <Skeleton width="80%" height={10} style={{ marginTop: 6 }} />
          </div>
          <Skeleton width={80} height={32} borderRadius={8} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonDetail() {
  return (
    <div style={{ padding: '20px 0' }}>
      <Skeleton width={120} height={20} style={{ marginBottom: 24 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Skeleton width={56} height={56} borderRadius="50%" />
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height={18} />
          <Skeleton width="25%" height={12} style={{ marginTop: 4 }} />
        </div>
      </div>
      <Skeleton height={180} borderRadius={14} style={{ marginBottom: 20 }} />
      <Skeleton height={60} borderRadius={12} style={{ marginBottom: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Skeleton height={60} borderRadius={10} />
        <Skeleton height={60} borderRadius={10} />
        <Skeleton height={60} borderRadius={10} />
      </div>
    </div>
  )
}

// Inject keyframes once
const skeletonStyleId = 'skeleton-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(skeletonStyleId)) {
  const style = document.createElement('style')
  style.id = skeletonStyleId
  style.textContent = `
    @keyframes skeletonPulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.7; }
    }
  `
  document.head.appendChild(style)
}
