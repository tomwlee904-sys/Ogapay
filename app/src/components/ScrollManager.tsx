import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Where the window is scrolled when the page changes.
// - Opening a page (a link, a button, a redirect) starts it at the top. Moves
//   inside the app don't reload the page, so the browser used to keep the old
//   position: a job opened from far down the list opened near its bottom.
// - Back and Forward return to where that page was left. Its content loads after
//   it opens, so the position is set again each time the page grows, for a few
//   seconds or until the person scrolls or taps.
// The browser's own restoring is off: it runs before the page is drawn, so it
// lands in the wrong place. Positions are kept per history entry (location.key),
// in sessionStorage too, so a reload lands where it was.
// html has scroll-behavior: smooth, so every jump here asks for 'instant'.

const STORE = 'ogapay_scroll'
const MAX = 60 // history entries remembered

const saved: Record<string, number> = (() => {
  try { return JSON.parse(sessionStorage.getItem(STORE) || '{}') || {} } catch { return {} }
})()

let writeTimer = 0
const flush = () => {
  clearTimeout(writeTimer)
  try { sessionStorage.setItem(STORE, JSON.stringify(saved)) } catch { /* storage off: kept in memory only */ }
}

function remember(key: string, y: number) {
  delete saved[key]
  saved[key] = Math.round(y) // newest last, so trimming drops the oldest
  const keys = Object.keys(saved)
  if (keys.length > MAX) for (const k of keys.slice(0, keys.length - MAX)) delete saved[k]
  clearTimeout(writeTimer)
  writeTimer = window.setTimeout(flush, 250)
}

const jump = (y: number) => window.scrollTo({ top: y, left: 0, behavior: 'instant' })

// Hold the page at y while its content arrives
let unpin = () => {}
function pin(y: number) {
  unpin()
  const apply = () => jump(y)
  const grows = typeof ResizeObserver === 'function' ? new ResizeObserver(apply) : null
  grows?.observe(document.getElementById('root') || document.body)
  const quit = ['wheel', 'touchstart', 'pointerdown', 'keydown']
  const stop = () => {
    grows?.disconnect()
    clearTimeout(timer)
    quit.forEach((e) => window.removeEventListener(e, stop))
    unpin = () => {}
  }
  quit.forEach((e) => window.addEventListener(e, stop, { passive: true }))
  const timer = window.setTimeout(stop, 3000)
  unpin = stop
  apply()
}

// The page shown now. Kept outside the component so a remount (after an error
// screen, say) carries on instead of treating the next page as a fresh visit.
let currentKey = ''
let currentPath: string | null = null

export default function ScrollManager() {
  const location = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    // Note the position as the person scrolls: by the time the next page has
    // opened, the old one is gone and its height with it
    const onScroll = () => { if (currentKey) remember(currentKey, window.scrollY) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  // Before paint, so the new page never shows at the old position
  useLayoutEffect(() => {
    // The first page of a visit has no key of its own ("default"): add its address
    const key = location.key === 'default' ? `default:${location.pathname}${location.search}` : location.key
    const first = currentPath === null
    const moved = currentPath !== location.pathname
    const sameEntry = currentKey === key
    currentKey = key
    currentPath = location.pathname
    const back = saved[key]

    if (first) {
      // A reload, or Back into the site from another site: return to the same spot.
      // A new visit starts at the top (or the #anchor) as the browser places it.
      const nav = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined
      if ((nav?.type === 'reload' || nav?.type === 'back_forward') && back) pin(back)
      return
    }
    if (sameEntry) return // remounted on the same page: nothing moved
    if (navType === 'POP') {
      if (back) pin(back)
      else { unpin(); jump(0) }
      return
    }
    // Only the ?filters changed (a search box, a sort): stay where they are. The
    // entry gets a new key, so it takes the current position with it.
    if (!moved) { remember(key, window.scrollY); return }
    unpin()
    jump(0)
    remember(key, 0)
  }, [location.key])

  return null
}
