import { useState, useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IconBellFilled } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { useUnreadCount } from '../lib/shared'
import { openSignIn } from '../lib/signin'
import { sized } from '../lib/img'
import { navSection, ownProfilePath, type NavSection } from './navTabs'

// The bottom dock on phones (below 768px) and on tablets up to 1023px that are at
// least 600px tall. Phones held sideways (768-1023 wide but short) keep the desktop
// top bar instead, as before, so the dock doesn't eat half of a short screen. From
// 1024px the desktop top bar takes over (and admin pages get the sidebar). Built
// after wurk.fun's mobile dock: a floating rounded bar, the current tab on its own
// tile, Create as a raised button in the middle and the profile picture in a ring.
//
// Space for it: tokens.css sets --bottom-nav-h (dock height + its gap below) and
// --dock-clear over the same screens (see DOCK_HIDDEN below; footer.css, nav.css
// and messages.css use the same query); the footer, toasts and other floating
// buttons sit above it with those. index.html's viewport meta has
// viewport-fit=cover, so the env(safe-area-inset-*) terms are real on iPhones:
// the dock sits above the home bar and --dock-clear grows to match.

type TabKey = NavSection
type Tab = {
  key: TabKey
  label: string
  path: string
  icon: string
  /** Opens the sign-in dialog over the current page for visitors (and then goes to path) */
  authRequired?: boolean
  /** The Sign in tab: opens the dialog and stays on the page */
  signIn?: boolean
}

// Members: Jobs, Store, Create, Alerts, Profile. Visitors get FAQ and Sign in
// instead of Alerts and Profile, which mean nothing before signing up.
// Earnings used to be the second tab when signed in; it is on the Profile page (its
// tab and quick link) and the Dashboard, so the dock shows the Store for everyone.
// Which tab is lit on the pages under each one (Saved jobs is Jobs, My jobs is
// Create, Wallet is Profile...) is decided in navTabs.ts, shared with the top bar.
const JOBS: Tab = { key: 'jobs', label: 'Jobs', path: '/tasks', icon: 'ti-briefcase' }
const STORE: Tab = { key: 'store', label: 'Store', path: '/store', icon: 'ti-building-store' }
const CREATE: Tab = { key: 'create', label: 'Create', path: '/create', icon: 'ti-plus' }
const MEMBER_TABS: Tab[] = [
  JOBS, STORE, CREATE,
  { key: 'alerts', label: 'Alerts', path: '/notifications', icon: 'ti-bell', authRequired: true },
  { key: 'profile', label: 'Profile', path: '/profile', icon: 'ti-user', authRequired: true },
]
const VISITOR_TABS: Tab[] = [
  JOBS, STORE, CREATE,
  { key: 'faq', label: 'FAQ', path: '/faq', icon: 'ti-help-circle' },
  { key: 'signin', label: 'Sign in', path: '/login', icon: 'ti-login', signIn: true },
]

// The screens that hide the dock. tokens.css, footer.css and messages.css show
// it on exactly the opposite ones, "(max-width: 767.98px), (max-width: 1023.98px)
// and (min-height: 600px)", and nav.css trims the top bar there (CSS can't share
// the query). The .98 means a fractional width such as 1023.5px (125% Windows
// display scaling, for example) can't fall between the dock and the top bar.
const DOCK_HIDDEN = '(min-width: 1024px), (min-width: 768px) and (max-height: 599.98px)'

// Each page renders its own Layout, so the dock is mounted afresh after a tap
// changes page: the tap is kept here so the new dock finishes the bounce
const PULSE_MS = 440
let lastTap: { key: TabKey; at: number } | null = null
const runningPulse = () => {
  const elapsed = lastTap ? Date.now() - lastTap.at : PULSE_MS
  return lastTap && elapsed < PULSE_MS ? { key: lastTap.key, elapsed } : null
}

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function BottomNav() {
  const location = useLocation()
  const { isAuthed, isLoading, user } = useAuth()
  const avatar: string | null = isAuthed ? (user as any)?.avatar || (user as any)?.avatarUrl || null : null
  const username: string = isAuthed ? (user as any)?.username || '' : ''
  // While a saved session is being checked (isLoading only happens with a saved
  // token) keep the member tabs, so a member's dock doesn't flash FAQ / Sign in
  const tabs = isAuthed || isLoading ? MEMBER_TABS : VISITOR_TABS
  const current = navSection(location.pathname, ownProfilePath(username))

  // An open chat on /messages is a full-screen tool on phones: the dock hides and
  // gives its space to the chat (--dock-clear drops to the home-bar inset, so
  // messages.css's height fills the screen). The class is on <html> so the
  // tokens and scroll-padding there follow; it goes when the chat closes.
  const params = new URLSearchParams(location.search)
  const chatOpen = /^\/messages\/?$/.test(location.pathname) && (params.has('c') || params.has('user'))
  useEffect(() => {
    if (!chatOpen) return
    const root = document.documentElement
    root.classList.add('ms-chat-open')
    return () => root.classList.remove('ms-chat-open')
  }, [chatOpen])
  // Shared with the top bar: one check for both (lib/shared)
  const unreadCount = useUnreadCount(isAuthed)
  const [pulse, setPulse] = useState<{ key: TabKey; elapsed: number } | null>(runningPulse)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The picture: a resized copy first; lib/img retries the original once if that
  // fails, and after that the dock shows the plain person icon
  const avatarSrc = avatar ? sized(avatar, 64, true) : ''
  const [avatarFailed, setAvatarFailed] = useState(false)
  const avatarErrors = useRef(0)
  useEffect(() => { setAvatarFailed(false); avatarErrors.current = 0 }, [avatar])
  const onAvatarError = () => {
    avatarErrors.current += 1
    if (avatarErrors.current > (avatarSrc !== avatar ? 1 : 0)) setAvatarFailed(true)
  }

  useEffect(() => {
    // A bounce carried over from the dock on the previous page: clear it when it ends
    const p = runningPulse()
    if (p) pulseTimer.current = setTimeout(() => setPulse(null), PULSE_MS - p.elapsed)
    return () => { if (pulseTimer.current) clearTimeout(pulseTimer.current) }
  }, [])

  // The items are real links, so Ctrl/Cmd/middle-click and "Open in new tab" work;
  // a plain click is handled here and by <Link> (which skips modified clicks)
  const go = (e: MouseEvent<HTMLAnchorElement>, t: Tab) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    // A short bounce on the tapped icon, as on wurk
    if (pulseTimer.current) clearTimeout(pulseTimer.current)
    lastTap = { key: t.key, at: Date.now() }
    setPulse({ key: t.key, elapsed: 0 })
    pulseTimer.current = setTimeout(() => setPulse(null), PULSE_MS)

    // Sign in: the dialog over the current page, which stays where it is after
    if (t.signIn) {
      e.preventDefault()
      openSignIn()
      return
    }
    // Alerts and Profile for a visitor: sign in first, then go there (while a
    // saved session is still being checked, the page's own guard decides)
    if (t.authRequired && !isAuthed && !isLoading) {
      e.preventDefault()
      openSignIn({ redirect: t.path })
      return
    }
    // Tapping the tab you are on takes you back to the top of it
    if (location.pathname === t.path) {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' })
    }
    // anything else: <Link> navigates
  }

  return (
    <>
      <style>{`
        .btb{
          --dk-glass:rgba(255,255,255,.6);
          --dk-solid:#ffffff;
          --dk-ink:#111318;
          --dk-muted:#4a505c;
          --dk-edge:rgba(15,23,42,.09);
          --dk-shine:rgba(255,255,255,.9);
          --dk-reflection:rgba(255,255,255,.55);
          --dk-shadow:rgba(16,21,37,.1);
          /* Stronger than wurk's dark-mode tile: a white dock over a white page
             needs a visible tile and edge to show the current tab */
          --dk-selected:rgba(15,23,42,.1);
          --dk-selected-edge:rgba(15,23,42,.16);
          --dk-hover:rgba(15,23,42,.05);
          --dk-create:linear-gradient(145deg,#2b2c33,#0a0a0c);
          --dk-create-ink:#ffffff;
          --dk-create-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 8px 18px rgba(10,10,12,.24);
          --dk-ring:rgba(15,23,42,.14);
          --dk-badge-edge:#ffffff;
        }
        [data-theme="dark"] .btb{
          /* wurk uses .4; .8 keeps the light labels readable (4.5:1+) when a white
             photo or button scrolls under the dock, and looks the same over black */
          --dk-glass:rgba(22,25,32,.6);
          --dk-solid:#1b1e25;
          --dk-ink:#ffffff;
          --dk-muted:#e2e6ed;
          --dk-edge:rgba(255,255,255,.2);
          --dk-shine:rgba(255,255,255,.32);
          --dk-reflection:rgba(255,255,255,.07);
          --dk-shadow:rgba(0,0,0,.24);
          --dk-selected:rgba(255,255,255,.1);
          --dk-selected-edge:rgba(255,255,255,.07);
          --dk-hover:rgba(255,255,255,.06);
          --dk-create:linear-gradient(145deg,rgba(255,255,255,.98),rgba(215,225,221,.9));
          --dk-create-ink:#07110d;
          --dk-create-shadow:inset 0 1px 0 #fff,0 8px 20px rgba(0,0,0,.34);
          --dk-ring:rgba(255,255,255,.2);
          --dk-badge-edge:#282c34;
        }

        .btb{
          position:fixed;z-index:100;
          left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));
          bottom:calc(12px + env(safe-area-inset-bottom,0px));
          max-width:520px;height:72px;margin:0 auto;padding:6px;box-sizing:border-box;
          display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:2px;
          overflow:hidden;isolation:isolate;
          border:1px solid var(--dk-edge);border-radius:28px;
          background:var(--dk-solid);color:var(--dk-ink);
          box-shadow:0 8px 28px var(--dk-shadow),0 2px 6px var(--dk-shadow),inset 0 1px 0 var(--dk-shine),inset 0 -1px 0 var(--dk-reflection);
          font-family:inherit;
        }
        @supports ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px))){
          .btb{background:var(--dk-glass);-webkit-backdrop-filter:blur(16px) saturate(165%);backdrop-filter:blur(16px) saturate(165%)}
        }
        /* Glass reflections */
        .btb::before,.btb::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none}
        .btb::before{background:radial-gradient(ellipse at 12% 0%,var(--dk-reflection),transparent 56%),linear-gradient(115deg,var(--dk-reflection),transparent 32% 70%,var(--dk-reflection));opacity:.6}
        .btb::after{inset:1px;border:1px solid transparent;border-top-color:var(--dk-shine);border-bottom-color:var(--dk-reflection);box-shadow:inset 1px 0 3px var(--dk-reflection),inset -1px 0 3px var(--dk-reflection)}

        .btb-item{
          position:relative;z-index:1;
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
          min-width:0;min-height:44px;margin:0;padding:3px 2px;
          border:0;border-radius:21px;background:transparent;color:var(--dk-muted);box-shadow:none;text-decoration:none;
          font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;
          transition:color 180ms ease,background-color 180ms ease,box-shadow 180ms ease;
        }
        .btb-item--active:not(.btb-item--create){
          background:var(--dk-selected);color:var(--dk-ink);
          box-shadow:inset 0 1px 0 var(--dk-shine),inset 0 0 0 1px var(--dk-selected-edge),0 2px 5px rgba(0,0,0,.04);
        }
        @media (hover:hover) and (pointer:fine){
          .btb-item:not(.btb-item--active):not(.btb-item--create):hover{background:var(--dk-hover);color:var(--dk-ink)}
        }
        .btb-item:not(.btb-item--create):active{background:var(--dk-selected)}
        .btb-item:focus{outline:none}
        .btb-item:focus-visible{outline:2px solid var(--dk-ink);outline-offset:-3px}

        .btb-shell{position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:36px;height:36px;border-radius:50%}
        .btb-shell i{font-size:22px;line-height:1;display:block}
        .btb-shell .ti-bell{font-size:23px}
        .btb-svg{width:23px;height:23px;display:block}
        .btb-label{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:12px;line-height:14px;font-weight:600;letter-spacing:0;white-space:nowrap}
        /* A cue that isn't only colour: the current tab's label is bolder (Create too) */
        .btb-item--active .btb-label{font-weight:800}

        /* Create: the raised button in the middle, never on a tile */
        .btb-item--create{color:var(--dk-ink);padding-block:1px}
        .btb-item--create .btb-shell{width:46px;height:46px;border-radius:14px;margin-top:-6px;background:var(--dk-create);color:var(--dk-create-ink);box-shadow:var(--dk-create-shadow)}
        .btb-item--create .btb-shell i{font-size:24px}
        @media (max-width:480px){.btb-item--create .btb-shell{width:44px;height:44px}}

        /* Profile: the picture in a thin ring */
        .btb-shell--profile{padding:2px;box-sizing:border-box;background:var(--dk-selected);box-shadow:inset 0 0 0 1px var(--dk-ring)}
        .btb-shell--profile i{font-size:20px}
        .btb-av{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
        .btb-item--active .btb-shell--profile{box-shadow:inset 0 0 0 1.5px var(--dk-ink)}

        /* Unread count: up and to the right of the bell so the bell stays readable
           (capped at 9+; the full count is in the link's label). #dc2626 keeps
           white text at 4.5:1 */
        .btb-badge{position:absolute;top:-4px;right:-7px;box-sizing:border-box;min-width:18px;height:18px;padding:0 4px;border:2px solid var(--dk-badge-edge);border-radius:9px;background:#dc2626;color:#fff;font-size:11px;font-weight:700;line-height:14px;text-align:center;white-space:nowrap;pointer-events:none}

        /* Tap bounce */
        .btb-shell--pulse{animation:btb-bounce 420ms ease both}
        @keyframes btb-bounce{0%,100%{transform:scale(1)}44%{transform:scale(1.12)}68%{transform:scale(.97)}}
        /* Create sits 1px under the dock's top edge, so it bounces less and isn't clipped */
        .btb-item--create .btb-shell--pulse{animation-name:btb-bounce-create}
        @keyframes btb-bounce-create{0%,100%{transform:scale(1)}44%{transform:scale(1.04)}68%{transform:scale(.98)}}

        @media (prefers-reduced-motion:reduce){
          .btb-item{transition:none}
          .btb-shell--pulse{animation:none}
        }
        @media (prefers-reduced-transparency:reduce){
          .btb{background:var(--dk-solid);-webkit-backdrop-filter:none;backdrop-filter:none}
          .btb::before,.btb::after{display:none}
        }
        @media (forced-colors:active){
          .btb{background:Canvas;color:CanvasText;border-color:CanvasText}
          .btb::before,.btb::after{display:none}
          .btb-item{color:CanvasText}
          .btb-item--active:not(.btb-item--create){background:Highlight;color:HighlightText}
          .btb-item--create .btb-shell{background:ButtonFace;color:ButtonText;border:1px solid ButtonText}
          .btb-item:focus-visible{outline-color:Highlight}
        }

        /* Desktop, and phones held sideways: the top bar's links take over */
        @media ${DOCK_HIDDEN}{.btb{display:none}}
        /* A chat open on a phone (see chatOpen above): no dock, and nothing keeps
           room for it (the home-bar inset stays) */
        @media (max-width:767.98px){
          html.ms-chat-open{--bottom-nav-h:0px;--dock-clear:env(safe-area-inset-bottom,0px)}
          html.ms-chat-open .btb{display:none}
        }
        @media print{.btb{display:none}}
      `}</style>
      <nav className="btb" aria-label="Main">
        {tabs.map((t) => {
          const active = current === t.key
          const badge = t.key === 'alerts' && unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null
          const showAvatar = t.key === 'profile' && avatar && !avatarFailed
          // The bell fills in on the Alerts page (the icon font has no filled bell)
          const filledBell = t.key === 'alerts' && active
          return (
            <Link
              key={t.key}
              to={t.path}
              className={
                'btb-item' +
                (active ? ' btb-item--active' : '') +
                (t.key === 'create' ? ' btb-item--create' : '')
              }
              aria-label={badge ? `${t.label}, ${unreadCount} unread` : t.label}
              // "page" on the tab's own page; "true" on the pages under it (/tasks/123, /settings)
              aria-current={active ? (location.pathname === t.path ? 'page' : 'true') : undefined}
              onClick={(e) => go(e, t)}
            >
              <span
                className={
                  'btb-shell' +
                  (t.key === 'profile' ? ' btb-shell--profile' : '') +
                  (pulse?.key === t.key ? ' btb-shell--pulse' : '')
                }
                // a bounce carried over from the previous page picks up where it was
                style={pulse?.key === t.key && pulse.elapsed ? { animationDelay: `-${pulse.elapsed}ms` } : undefined}
                aria-hidden="true"
              >
                {showAvatar
                  ? <img className="btb-av" src={avatarSrc} alt="" onError={onAvatarError} />
                  : filledBell
                    ? <IconBellFilled className="btb-svg" size={23} />
                    : <i className={`ti ${t.icon}`} />}
                {badge && <span className="btb-badge">{badge}</span>}
              </span>
              <span className="btb-label" aria-hidden="true">{t.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
