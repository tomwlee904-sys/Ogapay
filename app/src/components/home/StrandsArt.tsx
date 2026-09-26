import { useEffect, useRef } from 'react'

/* Hero network art: a bundle of hairline strands that pinches into the logo
   tile and fans out to both edges, twisting slowly, with a few teal pulses
   running in toward the centre. Drawn on a canvas (140+ strands would be heavy
   as animated SVG). Pauses off-screen and in background tabs; a single still
   frame when the user prefers reduced motion. */

const PER_SIDE = 72
const PULSES_PER_SIDE = 4
const WAIST_X = 48 // half-width of the hub tile area the strands run into

type Strand = { side: -1 | 1; k: number; phase: number; speed: number }
type Pulse = { strand: number; offset: number; speed: number }

function bez(p0: number, p1: number, p2: number, p3: number, u: number) {
  const m = 1 - u
  return m * m * m * p0 + 3 * m * m * u * p1 + 3 * m * u * u * p2 + u * u * u * p3
}

export default function StrandsArt() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return

    const strands: Strand[] = []
    for (const side of [-1, 1] as const) {
      for (let i = 0; i < PER_SIDE; i++) {
        strands.push({ side, k: i / (PER_SIDE - 1) - 0.5, phase: Math.sin(i * 12.9898 + side) * 43758.5453 % (Math.PI * 2), speed: 0.8 + ((i * 7) % 5) / 10 })
      }
    }
    const pulses: Pulse[] = []
    for (let s = 0; s < 2; s++) {
      for (let p = 0; p < PULSES_PER_SIDE; p++) {
        pulses.push({ strand: s * PER_SIDE + Math.floor(((p + 0.5) / PULSES_PER_SIDE) * PER_SIDE), offset: p / PULSES_PER_SIDE + s * 0.13, speed: 0.07 + p * 0.012 })
      }
    }

    let w = 0, h = 0, dpr = 1
    let dark = false
    let raf = 0
    let running = true
    let onScreen = true
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()

    const readTheme = () => { dark = document.documentElement.getAttribute('data-theme') === 'dark' }

    const resize = () => {
      const r = cv.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, r.width)
      h = Math.max(1, r.height)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
    }

    // Points of one strand at time t (seconds)
    const geometry = (s: Strand, t: number) => {
      const cx = w / 2, cy = h / 2
      const spread = h * 0.46
      const x0 = s.side < 0 ? 0 : w
      const y0 = cy + s.k * spread * 2 * (1 + 0.035 * Math.sin(t * 0.5 * s.speed + s.phase))
      const xe = cx + s.side * WAIST_X
      const ye = cy + s.k * 16
      // The strands cross over each other on the way in (a twisted ribbon)
      const twist = Math.sin(t * 0.32 + s.side * 0.9)
      const c1x = x0 + (xe - x0) * 0.34
      const c1y = y0 + (cy - y0) * 0.12 + Math.sin(t * 0.6 * s.speed + s.phase) * 3
      const c2x = x0 + (xe - x0) * 0.7
      const c2y = cy - s.k * spread * 0.55 * twist
      return [x0, y0, c1x, c1y, c2x, c2y, xe, ye] as const
    }

    const draw = (now: number) => {
      const t = reduce ? 4 : (now - start) / 1000
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'

      // Strands
      ctx.lineWidth = 0.6
      ctx.strokeStyle = dark ? 'rgba(236,236,240,0.26)' : 'rgba(24,24,27,0.22)'
      ctx.beginPath()
      for (const s of strands) {
        const [x0, y0, c1x, c1y, c2x, c2y, xe, ye] = geometry(s, t)
        ctx.moveTo(x0, y0)
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, xe, ye)
      }
      ctx.stroke()

      // Teal pulses gliding toward the hub
      ctx.lineCap = 'round'
      ctx.lineWidth = 1.2
      ctx.shadowBlur = dark ? 10 : 6
      ctx.shadowColor = dark ? 'rgba(94,234,212,0.9)' : 'rgba(16,185,129,0.55)'
      ctx.strokeStyle = dark ? 'rgba(153,246,228,0.95)' : 'rgba(13,148,136,0.75)'
      for (const p of pulses) {
        const s = strands[p.strand]
        const g = geometry(s, t)
        const head = (p.offset + t * p.speed) % 1
        const tail = Math.max(0, head - 0.16)
        ctx.beginPath()
        for (let j = 0; j <= 10; j++) {
          const u = tail + ((head - tail) * j) / 10
          const x = bez(g[0], g[2], g[4], g[6], u)
          const y = bez(g[1], g[3], g[5], g[7], u)
          if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.shadowBlur = 0

      // Fade the outer ends, like threads disappearing into the page
      ctx.globalCompositeOperation = 'destination-in'
      const fade = ctx.createLinearGradient(0, 0, w, 0)
      fade.addColorStop(0, 'rgba(0,0,0,0)')
      fade.addColorStop(0.2, 'rgba(0,0,0,1)')
      fade.addColorStop(0.8, 'rgba(0,0,0,1)')
      fade.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = fade
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'
    }

    const loop = (now: number) => {
      draw(now)
      if (running && onScreen && !reduce && !document.hidden) raf = requestAnimationFrame(loop)
      else raf = 0
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop) }

    readTheme()
    resize()
    kick()

    const ro = new ResizeObserver(() => { resize(); kick() })
    ro.observe(cv)
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) kick() })
    io.observe(cv)
    const mo = new MutationObserver(() => { readTheme(); kick() })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const onVis = () => { if (!document.hidden) kick() }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      running = false
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect(); io.disconnect(); mo.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas ref={ref} className="hv-strands" aria-hidden="true" />
}
