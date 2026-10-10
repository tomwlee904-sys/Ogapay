import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import { openSignIn } from '../lib/signin'
import { sized } from '../lib/img'

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthed, user } = useAuth()
  const avatar = isAuthed ? (user as any)?.avatar || (user as any)?.avatarUrl || null : null
  const [unreadCount, setUnreadCount] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchUnread = async () => {
    if (!isAuthed) return
    try {
      const data = await apiRequest<any>('/notifications?limit=1&unreadOnly=true')
      const count = data?.unreadCount ?? 0
      setUnreadCount(count)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchUnread()
    pollingRef.current = setInterval(fetchUnread, 30000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [isAuthed])

  useEffect(() => {
    const onFocus = () => fetchUnread()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [isAuthed])

  // Every tab works signed out too (they used to be greyed out and did nothing):
  // Create and Store are public pages; Alerts and Profile open the sign-in
  // dialog over the current page and go there once signed in. Signed out, the
  // second tab is the Store (nothing to show under Earnings yet).
  const tabs = [
    { icon: 'home', label: 'Jobs', path: '/tasks' },
    isAuthed
      ? { icon: 'briefcase', label: 'Earnings', path: '/earnings', authRequired: true }
      : { icon: 'building-store', label: 'Store', path: '/store' },
    { icon: 'plus', label: 'Create', path: '/create', center: true },
    { icon: 'bell', label: 'Alerts', path: '/notifications', authRequired: true, badge: unreadCount },
    { icon: 'user', label: 'Profile', path: '/profile', authRequired: true },
  ]
  const go = (t: { path: string; authRequired?: boolean }) =>
    t.authRequired && !isAuthed ? openSignIn({ redirect: t.path }) : navigate(t.path)

  return (
    <>
      <style>{`
        :root{--btb-active:#1A1A2E}
        [data-theme="dark"]{--btb-active:#D4D4E8}
        .btb{position:fixed;bottom:calc(10px + env(safe-area-inset-bottom,0px));left:12px;right:12px;max-width:520px;margin:0 auto;z-index:100;background:rgba(255,255,255,0.88);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);border:1px solid rgba(0,0,0,0.07);border-radius:26px;box-shadow:0 10px 30px rgba(16,21,37,0.12);display:flex;align-items:stretch;justify-content:space-around;height:64px;padding:0 4px}
        [data-theme="dark"] .btb{background:rgba(18,19,22,0.88);border-color:rgba(255,255,255,0.08);box-shadow:0 10px 30px rgba(0,0,0,0.5)}
        .btb-av{width:24px;height:24px;border-radius:50%;object-fit:cover;display:block;box-shadow:0 0 0 1.5px rgba(0,0,0,0.08)}
        .btb-tab.active .btb-av{box-shadow:0 0 0 2px var(--btb-active)}
        
        .btb-tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;padding:6px 2px;border:none;background:transparent;font-family:inherit;position:relative;min-height:44px;min-width:44px;transition:all .2s}
        .btb-tab:active{transform:scale(0.92)}
        .btb-tab .btb-icon-wrap{position:relative;display:flex;align-items:center;justify-content:center;width:24px;height:24px}
        .btb-tab i{font-size:20px;color:rgba(0,0,0,0.45);stroke-width:1.5;transition:color .2s,transform .2s;display:block}
        [data-theme="dark"] .btb-tab i{color:rgba(255,255,255,0.5)}
        .btb-tab span{font-size:11px;font-weight:700;color:#6B7280;transition:color .2s;white-space:nowrap;line-height:1.2}
        [data-theme="dark"] .btb-tab span{color:rgba(255,255,255,0.5)}
        .btb-tab.active i,.btb-tab.active span{color:var(--btb-active)}
        .btb-tab.active i{transform:scale(1.1)}
        .btb-tab:disabled{opacity:0.4;cursor:not-allowed}

        .btb-badge{position:absolute;top:-4px;right:-6px;min-width:16px;height:16px;border-radius:8px;background:var(--red);color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px;line-height:1;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,0.2)}

        .btb-center-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;min-height:44px}
        .btb-center{width:50px;height:50px;border-radius:18px;background:var(--accent);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;position:absolute;top:-12px;z-index:10;box-shadow:0 4px 16px rgba(var(--accent-rgb),0.35);transition:transform .2s,box-shadow .2s;font-family:inherit}
        .btb-center:active{transform:scale(0.9);box-shadow:0 2px 8px rgba(var(--accent-rgb),0.25)}
        .btb-center i{font-size:26px;color:var(--on-accent);transition:transform .2s}
        .btb-center:active i{transform:rotate(90deg)}
        .btb-center-label{font-size:11px;font-weight:700;color:rgba(0,0,0,0.35);text-align:center;white-space:nowrap;line-height:1.2;transition:color .2s;margin-top:30px}
        [data-theme="dark"] .btb-center-label{color:rgba(255,255,255,0.35)}


        .btb-center-wrap.has-label i,.btb-center-wrap.has-label .btb-center-label{color:var(--btb-active)}

        @media(min-width:768px){.btb{display:none}}
      `}</style>
      <div className="btb">
        {tabs.map(t => {
          if (t.center) {
            const isActive = location.pathname === '/create' || location.pathname.startsWith('/create/')
            return (
              <div key={t.label} className="btb-center-wrap">
                <button
                  className="btb-center"
                  onClick={() => go(t)}
                  aria-label={t.label}
                >
                  <i className="ti ti-plus" />
                </button>
                <span className="btb-center-label" style={{color: isActive ? "var(--btb-active, #1A1A2E)" : undefined}}>
                  {t.label}
                </span>
              </div>
            )
          }
          const isActive = location.pathname === t.path || location.pathname.startsWith(t.path + '/')
          return (
            <button
              key={t.label}
              className={`btb-tab${isActive ? ' active' : ''}`}
              onClick={() => go(t)}
            >
              <div className="btb-icon-wrap">
                {t.label === 'Profile' && avatar
                  ? <img className="btb-av" src={sized(avatar, 48, true)} alt="" />
                  : <i className={`ti ti-${t.icon}`} />}
                {/* `badge && …` showed a stray 0 when there was nothing unread */}
                {t.badge != null && t.badge > 0 && (
                  <span className="btb-badge">{t.badge > 99 ? '99+' : t.badge}</span>
                )}
              </div>
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
