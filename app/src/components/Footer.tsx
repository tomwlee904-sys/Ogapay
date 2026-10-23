import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import '../styles/footer.css'

const socials = [
  { icon: 'brand-x', href: 'https://x.com/Ogapayhq', label: 'OgaPay on X' },
  { icon: 'brand-telegram', href: 'https://t.me/ogapayhq', label: 'OgaPay on Telegram' },
  { icon: 'brand-instagram', href: 'https://instagram.com/ogapayhq?igsh=ajJrZzJ3Z2tjMXZm', label: 'OgaPay on Instagram' },
  { icon: 'brand-facebook', href: 'https://www.facebook.com/share/18bRPkuPVy/', label: 'OgaPay on Facebook' },
  { icon: 'brand-tiktok', href: 'https://tiktok.com/@ogapayhq', label: 'OgaPay on TikTok' },
]

const columns = [
  { title: 'Explore', links: [['Create a job', '/create'], ['Browse jobs', '/tasks'], ['Creator store', '/store'], ['For businesses', '/hire'], ['Vault', '/vault'], ['Blog', '/blog']] },
  { title: 'Resources', links: [['About OgaPay', '/about'], ['Guides', '/docs'], ['Developer', '/developer'], ['FAQ', '/faq'], ['Support', '/support'], ['Socials', '/socials'], ['Terms', '/terms'], ['Privacy', '/privacy'], ['License', '/license'], ['Copyright', '/copyright']] },
]

/* ─── Dotted globe ─────────────────────────────────────────────────────────────
   Points on a sphere, drawn orthographically. Land is a rough outline of Africa,
   Europe, Arabia and South America, so Africa sits front and centre while the
   globe sways. Two orbit rings of dots circle it with a travelling dot each.
   The dots scatter away from the pointer (or a finger) and spring back. */
type Poly = [number, number][]
const LAND: Poly[] = [
  [[-17,21],[-16,14],[-13,8],[-8,4.5],[-3,5],[2,6],[8,4],[9.5,3],[9,-1],[12,-5],[13,-12],[12,-17],[15,-27],[18,-34.5],[20,-35],[25,-34],[30,-31],[33,-26],[35,-22],[36,-18],[40,-15],[40.5,-10],[39.5,-5],[42,-1],[45,2],[51,11],[44,11],[43,12.5],[39,15.5],[37.5,18],[35,24],[32.5,30],[29,31],[25,31.7],[20,31],[20,32.5],[15,32.3],[11,33.5],[10,37],[3,36.8],[-2,35.2],[-6,35.8],[-9.8,30],[-13,27.5]],
  [[44,-25],[47,-25],[50,-15],[49.5,-12],[47,-14],[44,-20]],
  [[-9,43],[-9,37],[-5,36],[3,43],[8,44],[12,44],[16,38],[18,40],[13,45],[20,42],[26,40],[29,41],[28,45],[30,46],[40,47],[45,55],[40,62],[30,70],[20,69],[10,64],[5,58],[8,54],[-2,49],[-5,48],[-2,44]],
  [[35,28],[39,21],[43,13],[45,13],[52,16],[57,19],[59,22],[56,26],[51,24],[48,29],[47,30],[44,37],[36,37],[35,33]],
  [[-80,10],[-60,11],[-50,0],[-35,-5],[-40,-22],[-48,-28],[-58,-38],[-65,-55],[-72,-50],[-75,-15],[-81,-5]],
  [[45,40],[60,45],[75,40],[90,45],[100,30],[95,20],[80,8],[72,20],[62,25],[55,30],[50,36]],
]
const inPoly = (lon: number, lat: number, poly: Poly) => {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function Globe() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const N = 2200
    const pts: { lat: number; lon: number; land: boolean }[] = []
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2
      const lat = (Math.asin(y) * 180) / Math.PI
      const lon = ((i * 137.508) % 360) - 180
      pts.push({ lat, lon, land: LAND.some((p) => inPoly(lon, lat, p)) })
    }
    // How far each dot is pushed from its place (globe dots, then the ring dots), and how fast
    const RING_DOTS = 240
    const total = N + 2 * RING_DOTS
    const ox = new Float32Array(total), oy = new Float32Array(total)
    const vx = new Float32Array(total), vy = new Float32Array(total)
    // Each dot reacts a little differently, so they scatter rather than move as one sheet
    const kick = new Float32Array(total)
    for (let i = 0; i < total; i++) kick[i] = 0.55 + ((i * 0.618034) % 1) * 0.9
    let px = 0, py = 0, near = false, reach = 70, qx = 0, qy = 0
    // Push dot i (resting at bx, by) away from the pointer and pull it home; draw it at qx, qy
    const move = (i: number, bx: number, by: number) => {
      if (near) {
        const dx = bx + ox[i] - px, dy = by + oy[i] - py
        const d2 = dx * dx + dy * dy
        if (d2 < reach * reach) {
          const d = Math.sqrt(d2) || 1
          const f = (1 - d / reach) * 3.2 * kick[i]
          vx[i] += (dx / d) * f; vy[i] += (dy / d) * f
        }
      }
      vx[i] = (vx[i] - ox[i] * 0.045) * 0.86
      vy[i] = (vy[i] - oy[i] * 0.045) * 0.86
      ox[i] += vx[i]; oy[i] += vy[i]
      qx = bx + ox[i]; qy = by + oy[i]
    }
    let w = 0, h = 0, raf = 0, visible = false, ink = '#111'
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const readInk = () => { ink = getComputedStyle(canvas).getPropertyValue('--of-ink').trim() || '#111' }
    const tilt = (12 * Math.PI) / 180
    const start = performance.now()

    const draw = (now: number) => {
      const t = (now - start) / 1000
      const cx = w / 2, cy = h / 2, R = Math.min(h * 0.4, w * 0.2)
      reach = Math.max(56, R * 1.05)
      const lon0 = 15 + (reduce ? 0 : Math.sin(t / 7) * 38)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = ink

      // orbit rings: dots drifting slowly round, hidden where they pass behind the globe
      const rings = [{ rx: R * 1.95, ry: R * 0.42, rot: -0.2, speed: 0.35 }, { rx: R * 1.7, ry: R * 0.55, rot: 0.14, speed: -0.25 }]
      ctx.globalAlpha = 0.4
      for (const [ri, r] of rings.entries()) {
        const cr = Math.cos(r.rot), sr = Math.sin(r.rot)
        for (let k = 0; k < RING_DOTS; k++) {
          const a = (k / RING_DOTS) * Math.PI * 2 + t * r.speed * 0.15
          const ex = Math.cos(a) * r.rx, ey = Math.sin(a) * r.ry
          const bx = cx + ex * cr - ey * sr, by = cy + ex * sr + ey * cr
          move(N + ri * RING_DOTS + k, bx, by)
          if (Math.sin(a) < 0 && Math.hypot(bx - cx, by - cy) < R) continue
          ctx.fillRect(qx - 0.6, qy - 0.6, 1.2, 1.2)
        }
      }

      // globe dots
      const phi0 = (lon0 * Math.PI) / 180
      for (let i = 0; i < N; i++) {
        const p = pts[i]
        const lat = (p.lat * Math.PI) / 180, dl = (p.lon * Math.PI) / 180 - phi0
        const z = Math.sin(lat) * Math.sin(tilt) + Math.cos(lat) * Math.cos(tilt) * Math.cos(dl)
        const bx = cx + R * Math.cos(lat) * Math.sin(dl)
        const by = cy - R * (Math.sin(lat) * Math.cos(tilt) - Math.cos(lat) * Math.sin(tilt) * Math.cos(dl))
        move(i, bx, by)
        if (z <= 0) continue
        ctx.globalAlpha = p.land ? 0.35 + 0.6 * z : 0.05 + 0.12 * z
        const s = p.land ? 1.6 : 1
        ctx.fillRect(qx - s / 2, qy - s / 2, s, s)
      }

      // travelling dots on the rings, hidden while behind the globe
      for (const [i, r] of rings.entries()) {
        const a = t * r.speed + i * 2.1
        const ex = Math.cos(a) * r.rx, ey = Math.sin(a) * r.ry
        const x = cx + ex * Math.cos(r.rot) - ey * Math.sin(r.rot)
        const y = cy + ex * Math.sin(r.rot) + ey * Math.cos(r.rot)
        const behind = Math.sin(a) < 0 && Math.hypot(x - cx, y - cy) < R
        if (behind) continue
        ctx.globalAlpha = 1
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      if (visible && !reduce) raf = requestAnimationFrame(draw)
    }

    readInk(); size(); draw(performance.now())
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      cancelAnimationFrame(raf)
      if (visible && !reduce) { readInk(); raf = requestAnimationFrame(draw) }
    })
    io.observe(canvas)
    const ro = new ResizeObserver(() => { size(); draw(performance.now()) })
    ro.observe(canvas)
    const mo = new MutationObserver(() => { readInk(); draw(performance.now()) })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    // Mouse or pen: follow the pointer while it's over the globe
    const at = (x: number, y: number) => {
      const r = canvas.getBoundingClientRect()
      px = x - r.left; py = y - r.top; near = true
    }
    const onMove = (e: PointerEvent) => { if (e.pointerType !== 'touch') at(e.clientX, e.clientY) }
    const onLeave = (e: PointerEvent) => { if (e.pointerType !== 'touch') near = false }
    // Finger: touch events keep coming while the page scrolls (pointer events stop),
    // and nothing is prevented, so swiping over the globe still scrolls the page
    let lift = 0
    const onTouch = (e: TouchEvent) => { const p = e.touches[0]; if (p) { clearTimeout(lift); at(p.clientX, p.clientY) } }
    const onTouchEnd = () => { clearTimeout(lift); lift = window.setTimeout(() => { near = false }, 250) }
    canvas.addEventListener('pointermove', onMove, { passive: true })
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('touchstart', onTouch, { passive: true })
    canvas.addEventListener('touchmove', onTouch, { passive: true })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('touchcancel', onTouchEnd)
    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); mo.disconnect(); clearTimeout(lift)
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('touchstart', onTouch); canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchend', onTouchEnd); canvas.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])
  return <canvas ref={ref} className="of-globe" aria-hidden="true" />
}

function SolanaMark() {
  return (
    <svg width="13" height="10" viewBox="0 0 397.7 311.7" aria-hidden="true">
      <path fill="currentColor" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zM64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1L333.1 73.8c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8zM333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="of">
      <div className="of-inner">
        <div className="of-top">
          <div className="of-brandcol">
            <Link to="/" className="of-brand">
              <span className="of-mark"><Logo size={24} /></span>
              OgaPay
            </Link>
            <h2 className="of-title">Africa's task network.<br /><span>Paid in your currency.</span></h2>
            <p className="of-lead">Find work. Hire help. Get paid in Naira or USDC. One marketplace for tasks, gigs and services.</p>
          </div>

          <div className="of-right">
            <Globe />
            <nav className="of-nav" aria-label="Footer">
              {columns.map((col) => (
                <div key={col.title} className="of-col">
                  <p className="of-label">{col.title}</p>
                  {col.links.map(([label, to]) => (
                    <Link key={label} to={to} className="of-link">
                      {label}<i className="ti ti-arrow-up-right" />
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </div>

        <div className="of-mid">
          <div className="of-socials">
            {socials.map((s) => (
              <a key={s.icon} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="of-social">
                <i className={`ti ti-${s.icon}`} />
              </a>
            ))}
          </div>
          <span className="of-tag"><span />Work together. Grow together.</span>
        </div>

        <div className="of-bottom">
          <span>© {new Date().getFullYear()} OgaPay Technologies Ltd.</span>
          <span className="of-built"><SolanaMark /> Built on Solana</span>
        </div>
      </div>
    </footer>
  )
}
