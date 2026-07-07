import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { apiRequest } from '../lib/api'
import { useCurrency } from '../context/CurrencyContext'
import { useTheme } from '../context/ThemeContext'

const OGAPAY_BLUE = 'var(--accent)'
const OGAPAY_DEEP = 'var(--accent)'

function formatAddress(addr: string) {
  if (!addr) return ''
  return addr.slice(0, 2).toUpperCase()
}

// ── Countdown hook: returns "1h 59m 13s" or "Expired" ──
function useCountdown(expiresAt?: string) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setDisplay('Expired'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (h > 0) setDisplay(`${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`)
      else setDisplay(`${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return display
}


function InfoBtn({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', marginLeft: 4, verticalAlign: 'middle' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.stopPropagation(); setShow(s => !s) }}>
      <i className="ti ti-info-circle" style={{ fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }} />
      {show && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--card)',
          fontSize: 11, lineHeight: 1.5, padding: '6px 10px', borderRadius: 8,
          whiteSpace: 'normal', width: 220, zIndex: 99, pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {text}
        </div>
      )}
    </span>
  )
}

function useElapsed(createdAt?: string) {
  const [display, setDisplay] = useState('')
  useEffect(() => {
    if (!createdAt) return
    const tick = () => {
      const diff = Date.now() - new Date(createdAt).getTime()
      const m = Math.floor(diff / 60000)
      if (m < 1) { setDisplay('Posted just now'); return }
      if (m < 60) { setDisplay(`Posted ${m}m ago`); return }
      const h = Math.floor(m / 60)
      if (h < 24) { setDisplay(`Posted ${h}h ago`); return }
      const days = Math.floor(h / 24)
      setDisplay(`Posted ${days} day${days !== 1 ? 's' : ''} ago`)
    }
    tick(); const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [createdAt])
  return display
}

import type { Task } from '../lib/types';

export default function TaskCard({ task, hideApply }: { task: Task; hideApply?: boolean }) {
  const { rates } = useCurrency()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const navigate = useNavigate()

  const id            = task.id
  const title         = task.title || 'Untitled Task'
  const description   = task.description || ''
  const reward        = Number(task.reward || task.amount || 0)
  const status        = task.status || 'OPEN'
  const posterName = task.poster ? (task.poster.firstName ? task.poster.firstName + (task.poster.lastName ? ' ' + task.poster.lastName : '') : task.poster.username || '') : ''
  const creatorName   = posterName || task.creatorName || task.creator?.username || task.creator || 'Anonymous'
  const creatorAvatar = task.creatorAvatar || task.poster?.avatarUrl || task.poster?.avatar || task.creator?.avatarUrl || task.creator?.avatar || null
  const slotsTotal    = task.maxWorkers || task.maxSlots || task.slots || 100
  const slotsFilled   = task.currentWorkers || task.filled || task.slotsFilled || 0
  const submissionsCount = task.submissionsCount ?? task._count?.submissions ?? task.currentWorkers ?? 0
  const openSlots     = Math.max(0, slotsTotal - slotsFilled)
  const progress      = slotsTotal > 0 ? Math.min((slotsFilled / slotsTotal) * 100, 100) : 0
  const rankRequired  = (task.minRank && task.minRank > 0) ? task.minRank : (task.rankRequired > 0 ? task.rankRequired : (task.rank || null))
  const minPayHolding = task.minOgaScore && task.minOgaScore > 100000 ? task.minOgaScore : null
  const unlimited     = slotsTotal >= 999

  // Countdown from expiresAt / closesAt / deadline
  const expiresAt  = task.expiresAt || task.closesAt || task.deadline || task.endsAt || ''
  const countdown  = useCountdown(expiresAt)

  // Fallback: show createdAt age if no expiry
  const createdAt  = task.createdAt || ''
  const createdAgo = createdAt
    ? (() => {
        const diff = Date.now() - new Date(createdAt).getTime()
        const m = Math.floor(diff / 60000)
        if (m < 1) return 'Just now'
        if (m < 60) return `${m}m ago`
        const h = Math.floor(m / 60)
        if (h < 24) return `${h}h ago`
        return `${Math.floor(h / 24)}d ago`
      })()
    : ''

  const timerDisplay = countdown || createdAgo

  // Status label
  const statusLabel   = status === 'OPEN'
    ? 'Filling'
    : status === 'CLOSED' ? 'Closed' : 'Filling'

  const isExpired = countdown === 'Expired'

  // Bookmark state
  const [bookmarked, setBookmarked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ogapay_bookmarked') || '[]').includes(id) } catch { return false }
  })
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [bookmarkMeta, setBookmarkMeta] = useState<string | null>(() => {
    try { return JSON.parse(localStorage.getItem('ogapay_bookmark_meta') || '{}')[id] || null } catch { return null }
  })

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (bookmarkLoading) return
    setBookmarkLoading(true)
    const newState = !bookmarked
    setBookmarked(newState)
    try {
      if (newState) {
        const result = await apiRequest<any>('/bookmarks', { method: 'POST', body: JSON.stringify({ type: "task", targetId: id }) })
        const bmId = result?.id || result?.data?.id || ''
        const meta = JSON.parse(localStorage.getItem('ogapay_bookmark_meta') || '{}')
        meta[id] = bmId
        localStorage.setItem('ogapay_bookmark_meta', JSON.stringify(meta))
      } else {
        const meta = JSON.parse(localStorage.getItem('ogapay_bookmark_meta') || '{}')
        const bmId = meta[id]
        if (bmId) {
          await apiRequest('/bookmarks/' + bmId, { method: 'DELETE' })
        }
        delete meta[id]
        localStorage.setItem('ogapay_bookmark_meta', JSON.stringify(meta))
      }
      const stored = JSON.parse(localStorage.getItem('ogapay_bookmarked') || '[]')
      if (newState) {
        if (!stored.includes(id)) stored.push(id)
      } else {
        const idx = stored.indexOf(id)
        if (idx >= 0) stored.splice(idx, 1)
      }
      localStorage.setItem('ogapay_bookmarked', JSON.stringify(stored))
    } catch {}
    setBookmarkLoading(false)
  }

  return (
    <div className="tc-card"
      onClick={() => navigate(`/tasks/${id}`)}
      style={{
        background: isDark ? '#141414' : 'var(--card, #ffffff)',
        border: isDark ? '1.5px solid var(--border, #2a2a2a)' : '1.5px solid var(--border, #e5e7eb)',
        borderRadius: 16,
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.25)' : '0 2px 12px rgba(var(--accent-rgb),0.06)',
        cursor: 'pointer',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        if (isDark) {
          el.style.borderColor = 'rgba(255,255,255,0.15)'
          el.style.boxShadow = '0 6px 28px rgba(0,0,0,0.35)'
        } else {
          el.style.borderColor = OGAPAY_BLUE
          el.style.boxShadow = '0 6px 28px rgba(var(--accent-rgb),0.16)'
        }
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        if (isDark) {
          el.style.borderColor = 'var(--border, #2a2a2a)'
          el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)'
        } else {
          el.style.borderColor = 'var(--border, #e5e7eb)'
          el.style.boxShadow = '0 2px 12px rgba(var(--accent-rgb),0.06)'
        }
        el.style.transform = 'translateY(0)'
      }}
    >

      

      {/* ── BOOKMARK BUTTON ── */}
      {!hideApply && (
        <button onClick={toggleBookmark}
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 5,
            background: 'rgba(255,255,255,0.85)', border: 'none',
            borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16,
            color: bookmarked ? 'var(--accent)' : 'var(--text3)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            transition: 'color 0.15s',
            opacity: bookmarkLoading ? 0.6 : 1,
          }}>
          <i className={`ti ${bookmarked ? 'ti-bookmark-filled' : 'ti-bookmark'}`} />
        </button>
      )}

      {/* ── SHIMMER KEYFRAME ── */}
      <style>{`
        @keyframes oga-sweep {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .oga-shimmer {
          background: linear-gradient(
            90deg,
            ${OGAPAY_DEEP} 0%,
            ${OGAPAY_BLUE} 30%,
            var(--accent) 50%,
            ${OGAPAY_BLUE} 70%,
            ${OGAPAY_DEEP} 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: oga-sweep 2.4s linear infinite;
        }
        .oga-token-shimmer {
          background: linear-gradient(
            90deg,
            var(--accent) 0%,
            var(--accent) 40%,
            var(--accent) 70%,
            ${OGAPAY_BLUE} 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: oga-sweep 2.4s linear infinite;
        }
        [data-theme="dark"] .oga-shimmer {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          background: none !important;
          animation: none !important;
        }
        [data-theme="dark"] .oga-token-shimmer {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          background: none !important;
          animation: none !important;
        }
        [data-theme="dark"] .tc-reward-box {
          background: #1e1e1e !important;
          border: 1.5px solid rgba(255,255,255,0.08) !important;
          box-shadow: none !important;
        }
        [data-theme="dark"] .tc-progress-track {
          background: rgba(255, 255, 255, 0.08) !important;
        }
        [data-theme="dark"] .tc-progress-fill {
          background: linear-gradient(90deg,#059669,#34D399) !important;
          box-shadow: 0 0 8px rgba(5,150,105,0.4) !important;
        }
        [data-theme="dark"] .tc-status-dot {
          background: var(--accent) !important;
        }
        [data-theme="dark"] .tc-status-text {
          color: var(--green) !important;
        }
        [data-theme="dark"] span[style*="color: var(--accent)"][style*="font-weight: 600"] {
          color: var(--accent) !important;
        }

                /* Clean dark mode — WurkFun refined aesthetic */
        [data-theme="dark"] .tc-card {
          background: #141414 !important;
          border: 1.5px solid var(--border, #2a2a2a) !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.25) !important;
        }
        [data-theme="dark"] .tc-card:hover {
          border-color: rgba(255,255,255,0.15) !important;
          box-shadow: 0 6px 28px rgba(0,0,0,0.35) !important;
        }
        [data-theme="dark"] .tc-card .tc-progress-track {
          background: rgba(255, 255, 255, 0.08) !important;
        }
        [data-theme="dark"] .tc-card .tc-progress-fill {
          background: linear-gradient(90deg, #059669, #34D399) !important;
          box-shadow: none !important;
        }
        [data-theme="dark"] .oga-shimmer,
        [data-theme="dark"] .oga-token-shimmer {
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          background: none !important;
          animation: none !important;
        }
        [data-theme="dark"] .tc-card .tc-reward-box {
          background: #1e1e1e !important;
          border: 1.5px solid rgba(255,255,255,0.08) !important;
          box-shadow: none !important;
        }
        [data-theme="dark"] .tc-card .tc-reward-amount {
          color: #ffffff !important;
          text-shadow: none !important;
        }
`}</style>

      {/* ══ LISTED BY ══ */}
      <div style={{
        padding: '12px 16px',
        borderBottom: isDark ? '1px solid var(--border, #2a2a2a)' : '1px solid var(--border, #e5e7eb)',
        background: isDark ? 'transparent' : 'linear-gradient(135deg, rgba(59,91,219,0.24) 0%, rgba(255,255,255,0.45) 50%, rgba(16,185,129,0.24) 100%)',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: isDark ? 'rgba(255,255,255,0.5)' : 'var(--text3, #9ca3af)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 2,
        }}>
          Listed By
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: `linear-gradient(180deg, ${OGAPAY_BLUE} 0%, ${OGAPAY_DEEP} 100%)`,
            color: '#fff', display: 'grid', placeItems: 'center',
            fontSize: 12, fontWeight: 900, flexShrink: 0, overflow: 'hidden', border: '2px solid white',
            boxShadow: '0 2px 8px rgba(var(--accent-rgb),0.25)',
          }}>
            {creatorAvatar
              ? <img src={creatorAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : formatAddress(creatorName)}
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: isDark ? '#ffffff' : 'var(--text, #0a0a0a)' }}>
            {creatorName}
          </span>
        </div>
      </div>

      {/* ══ PROGRESS ══ */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: 'var(--text3, #9ca3af)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Progress
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.6)' : 'var(--text2, #6b7280)' }}>
            {unlimited ? 'Unlimited' : `${slotsFilled}/${slotsTotal}`}
          </span>
        </div>
        {/* Track */}
        <div className="tc-progress-track" style={{
          height: 6, borderRadius: 99,
          background: isDark ? 'rgba(34,197,94,0.2)' : 'rgba(var(--accent-rgb),0.1)',
          overflow: 'hidden',
        }}>
          {/* Fill */}
          <div className="tc-progress-fill" style={{
            height: '100%', borderRadius: 99,
            background: isDark ? 'linear-gradient(90deg, #059669 0%, #34D399 100%)' : 'linear-gradient(90deg, #059669 0%, #34D399 100%)',
            width: `${unlimited ? 40 : progress}%`,
            transition: 'width 0.5s ease',
            boxShadow: isDark ? '0 0 10px rgba(34,197,94,0.6)' : '0 0 6px rgba(5,150,105,0.4)',
          }} />
        </div>
      </div>

      {/* ══ STATUS ROW ══ */}
      <div style={{
        padding: '8px 20px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12,
        fontSize: 11,
      }}>
        {/* Submissions */}
        <span style={{ color: isDark ? '#34D399' : 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' as const }}>
          <span className="tc-status-dot" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--green)', display: 'inline-block',
          }} />
          Submissions {submissionsCount}
        </span>

        {/* Open slots */}
        <span style={{ color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' as const }}>
          <span className="tc-status-dot" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent)', display: 'inline-block',
          }} />
          {unlimited ? 'Unlimited slots' : `Open ${openSlots}`}
        </span>

        {/* Status */}
        <span className="tc-status-text" style={{
          color: status === 'OPEN' ? 'var(--green)' : 'var(--accent)',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' as const,
        }}>
          <span className="tc-status-dot" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: status === 'OPEN' ? 'var(--green)' : 'var(--accent)',
            display: 'inline-block',
          }} />
          Status {statusLabel}
        </span>
      </div>

      {/* ══ REWARD BOX ══ */}
      <div className="tc-reward-box" style={{
        margin: '0 20px 14px',
        background: isDark ? '#1e1e1e' : 'linear-gradient(135deg, rgba(5,150,105,0.07) 0%, rgba(5,150,105,0.03) 100%)',
        border: isDark ? '1.5px solid rgba(255,255,255,0.08)' : '1px solid rgba(5,150,105,0.18)',
        borderRadius: 12,
        padding: '16px 14px',
        textAlign: 'center',
        boxShadow: isDark ? 'none' : 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline',
          justifyContent: 'center', gap: 6, marginBottom: 4,
        }}>
          <span className="oga-shimmer tc-reward-amount" style={{ color: isDark ? '#ffffff' : undefined, textShadow: isDark ? 'none' : undefined,
            fontSize: 34, fontWeight: 900,
            fontFamily: 'Outfit, sans-serif', lineHeight: 1,
          }}>
            {reward.toLocaleString()}
          </span>
          <span className="oga-token-shimmer" style={{ color: isDark ? '#ffffff' : undefined,
            fontSize: 13, fontWeight: 800,
            fontFamily: 'Outfit, sans-serif',
          }}>
            NGN
          </span>
        </div>
        <div style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : 'var(--text3, #9ca3af)', fontWeight: 600 }}>
          ${(reward * rates.NGN).toFixed(2)} USD
        </div>
      </div>

      {/* ══ META TAGS ══ */}
      <div style={{
        padding: '0 20px 12px',
        display: 'flex', alignItems: 'center',
        gap: 6, flexWrap: 'wrap',
        fontSize: 12, color: isDark ? 'rgba(255,255,255,0.6)' : 'var(--text2, #6b7280)', fontWeight: 600,
      }}>
        <span>{(task.category || task.jobType || task.job_type || 'Custom').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
        {rankRequired && (
          <>
            <span style={{ color: 'var(--border2, #d1d5db)' }}>|</span>
            <span>Rank {rankRequired}</span>
          </>
        )}
        {task.workerRequirement && (
          <>
            <span style={{ color: 'var(--border2, #d1d5db)' }}>|</span>
            <span>Req: {task.workerRequirement}</span>
          </>
        )}
      </div>

      {/* ══ ABOUT THIS JOB + TIMER ══ */}
      <div style={{
        padding: '0 20px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 800,
          color: isDark ? 'rgba(255,255,255,0.5)' : 'var(--text3, #9ca3af)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          About This Job
        </span>

        {timerDisplay && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: isExpired ? '#ef4444' : countdown ? (isDark ? '#ffffff' : OGAPAY_BLUE) : (isDark ? 'rgba(255,255,255,0.5)' : 'var(--text3, #9ca3af)'),
            display: 'flex', alignItems: 'center', gap: 4,
            background: countdown && !isExpired ? 'rgba(var(--accent-rgb),0.07)' : 'transparent',
            padding: countdown ? '2px 7px' : '0',
            borderRadius: 99,
          }}>
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            {timerDisplay}
          </span>
        )}
      </div>

      {/* ══ DESCRIPTION ══ */}
      <div className="tc-desc-box" style={{
        margin: '0 20px 18px',
        padding: '8px 0 0',
        border: 'none',
        borderRadius: 0,
        borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid var(--border, #e5e7eb)',
        background: 'transparent',
      }}>
        <p className="tc-desc-text" style={{
          fontSize: 13, color: isDark ? 'rgba(255,255,255,0.6)' : 'var(--text2, #6b7280)',
          margin: 0, lineHeight: 1.65,
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}>
          {description || 'No description provided.'}
        </p>
      </div>

      {/* ══ APPLY BUTTON ══ */}
      {!hideApply && (
        <div style={{ padding: '0 20px 18px', marginTop: 'auto' }}>
          <button
            onClick={e => { e.stopPropagation(); navigate(`/tasks/${id}`) }}
            style={{
              width: '100%', height: 38, borderRadius: 9,
              background: `linear-gradient(180deg, ${OGAPAY_BLUE} 0%, ${OGAPAY_DEEP} 100%)`,
              color: '#fff', border: 'none',
              fontWeight: 700, fontSize: 12,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
              transition: 'opacity 0.15s, transform 0.15s',
              boxShadow: '0 2px 12px rgba(var(--accent-rgb),0.3)',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '0.9'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Apply Now
          </button>
        </div>
      )}

    </div>
  )
}
