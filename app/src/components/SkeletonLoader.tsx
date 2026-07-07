import { memo } from 'react'

const style = `
@keyframes sk-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
.sk{background:var(--border);border-radius:8px;animation:sk-pulse 1.4s ease-in-out infinite;flex-shrink:0}
.sk-card{height:140px;border-radius:var(--radius-sm)}
.sk-line{height:14px;width:100%}
.sk-line-sm{height:12px;width:60%}
.sk-avatar{width:44px;height:44px;border-radius:50%}
.sk-stat{height:48px;width:100%;border-radius:var(--radius-sm)}
.sk-btn{height:44px;width:120px;border-radius:10px}
.sk-row{display:flex;gap:12px;align-items:center;padding:12px 0}
.sk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.sk-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:20px}
@keyframes pf-in{0%{opacity:0}100%{opacity:1}}
.page-fade-in{animation:pf-in .18s ease}
`

export const SkeletonCard = memo(() => <div className="sk sk-card" />)
export const SkeletonLine = memo(() => <div className="sk sk-line" />)
export const SkeletonLineSm = memo(() => <div className="sk sk-line-sm" />)
export const SkeletonAvatar = memo(() => <div className="sk sk-avatar" />)
export const SkeletonStat = memo(() => <div className="sk sk-stat" />)
export const SkeletonBtn = memo(() => <div className="sk sk-btn" />)

export const SkeletonRow = memo(() => (
  <div className="sk-row">
    <SkeletonAvatar />
    <div style={{ flex: 1, display: 'grid', gap: 8 }}>
      <SkeletonLine />
      <SkeletonLineSm />
    </div>
  </div>
))

export const SkeletonGrid = memo(({ count = 3 }: { count?: number }) => (
  <div className="sk-grid">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} style={{ display: 'grid', gap: 10, padding: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <SkeletonLine />
        <SkeletonLineSm />
        <SkeletonLineSm />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <SkeletonBtn />
          <SkeletonBtn />
        </div>
      </div>
    ))}
  </div>
))

export const SkeletonStats = memo(() => (
  <div className="sk-stats">
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} style={{ display: 'grid', gap: 6, padding: 14, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <SkeletonLineSm />
        <SkeletonStat />
      </div>
    ))}
  </div>
))

export const SkeletonPage = memo(() => (
  <>
    <style>{style}</style>
    <div style={{ padding: '28px 24px 60px', width: '100%', maxWidth: '100%' }}>
      <SkeletonStats />
      <SkeletonGrid count={4} />
    </div>
  </>
))

export const injectSkeletonStyles = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById('sk-style')) return
  const el = document.createElement('style')
  el.id = 'sk-style'
  el.textContent = style
  document.head.appendChild(el)
}
