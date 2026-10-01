import { useEffect, useRef } from 'react'
import { Logo } from '../Logo'

/* Hero network: 45 fine fibres run from "people + agents" behind the OgaPay tile
   to "escrow protected", with long, softly tapered light trails. Adapted from
   network-animation-1.html (dark) and network-animation-light.html (light): same
   1080 × 482 frame and 12 s loop, palette follows the site theme.
   Changes from the files: the fibres stay spread where they meet the tile (they
   bunched into a solid grey wedge), the tile is ~10% smaller, trails are softer
   with a quieter teal, no canvas blur (costly on phones), and the labels are real
   text so they stay readable on small screens. The canvas has no background of
   its own (the files painted solid black or white), so the page shows through,
   including the soft glow the homepage has in dark mode. Pauses off-screen and
   in hidden tabs; one still frame for reduced motion. */

const W = 1080, H = 482, TAU = Math.PI * 2, LOOP = 12
const CX = 540, CY = 266

type Palette = {
  fibre: [string, string]; packets: [string, string, string]; packetAlpha: number
  outer: [string, string]; bevel: [string, string, string, string]; face: [string, string, string]
  tileShadow: string | null; ticks: string
}
const DARK: Palette = {
  fibre: ['157,169,180', '191,199,204'],
  packets: ['150,196,190', '160,182,208', '196,205,214'], packetAlpha: .62,
  outer: ['#020303', '#1c1e20'], bevel: ['#303336', '#1b1d20', '#101113', '#414447'], face: ['#222427', '#0b0c0e', 'rgba(142,151,160,.07)'],
  tileShadow: null, ticks: '#303235',
}
const LIGHT: Palette = {
  fibre: ['116,128,139', '98,112,122'],
  packets: ['58,128,120', '87,126,156', '101,122,139'], packetAlpha: .58,
  outer: ['#fff', '#e7e9eb'], bevel: ['#fff', '#f8f9fa', '#eef0f2', '#e1e4e7'], face: ['#fff', '#f8f9fa', 'rgba(142,151,160,.07)'],
  tileShadow: 'rgba(40,53,67,.10)', ticks: '#dde1e4',
}

const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark'

export default function NetworkFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const small = window.innerWidth < 768
    const STEPS = small ? 120 : 180 // points per fibre
    let visible = true, frame = 0, pal = isDark() ? DARK : LIGHT, lastT = 0

    const curve = (a: number, b: number, c: number, d: number, t: number) => { const s = 1 - t; return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d }
    // Same paths as the supplied files, except the spread at the centre (k*24 → k*46)
    // so the fibres pass behind the tile instead of meeting in one dense point
    const point = (i: number, u: number, time: number): [number, number] => {
      const k = (i - 22) / 22, breath = Math.sin(time / LOOP * TAU) * 3
      if (u < .5) { const t = u * 2; return [curve(56, 230, 371, CX, t), curve(263 + k * 160, 344 + k * 79, 253 + k * 34 + breath, CY - 12 + k * 46, t)] }
      const t = (u - .5) * 2; return [curve(CX, 680, 828, 1023, t), curve(CY - 12 + k * 46, 236 + k * 34 + breath, 192 + k * 86, 255 + k * 159, t)]
    }
    const path = (i: number, start: number, end: number, time: number) => {
      ctx.beginPath()
      const n = Math.max(3, Math.ceil((end - start) * STEPS))
      for (let j = 0; j <= n; j++) { const p = point(i, start + (end - start) * j / n, time); if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]) }
    }
    const box = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      if (typeof (ctx as any).roundRect === 'function') { (ctx as any).roundRect(x, y, w, h, r); return }
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
    }
    // A square centred on the tile centre, ~10% smaller than the files' tile
    const sq = (size: number, r: number) => box(CX - size / 2, CY - size / 2, size, size, r)

    const draw = (time: number) => {
      const p = pal
      ctx.clearRect(0, 0, W, H) // transparent: the page shows through
      // Fibres: faint at the ends and close to the tile, so no bright wedge forms
      const [fa, fb] = p.fibre
      const fade = ctx.createLinearGradient(50, 0, 1030, 0)
      fade.addColorStop(0, `rgba(${fa},0)`); fade.addColorStop(.14, `rgba(${fa},.22)`); fade.addColorStop(.34, `rgba(${fb},.30)`)
      fade.addColorStop(.42, `rgba(${fb},.16)`); fade.addColorStop(.58, `rgba(${fb},.16)`)
      fade.addColorStop(.66, `rgba(${fb},.30)`); fade.addColorStop(.86, `rgba(${fa},.22)`); fade.addColorStop(1, `rgba(${fa},0)`)
      ctx.lineWidth = .7; ctx.strokeStyle = fade
      for (let i = 0; i < 45; i++) { path(i, 0, 1, time); ctx.stroke() }
      // Long, softly tapered light trails (a wide faint stroke under a fine one
      // gives the glow without canvas blur)
      for (let j = 0; j < 13; j++) {
        const i = (j * 17 + 4) % 45, u = ((time / LOOP) + (j * .61803398875)) % 1
        const length = .14 + (j % 3) * .02
        const color = j % 4 === 0 ? p.packets[0] : j % 3 === 0 ? p.packets[1] : p.packets[2]
        for (let s = 0; s < 22; s++) {
          const a = u - length + s * length / 22, b = a + length / 22
          if (a < 0 || b > 1) continue
          const env = Math.pow(Math.sin(Math.PI * s / 22), 2) * Math.sin(Math.PI * (a + b) / 2)
          if (env < .02) continue
          ctx.strokeStyle = `rgba(${color},${env * p.packetAlpha * .22})`; ctx.lineWidth = 2.6; path(i, a, b, time); ctx.stroke()
          ctx.strokeStyle = `rgba(${color},${env * p.packetAlpha})`; ctx.lineWidth = .95; ctx.stroke()
        }
      }
      // Tile: separate outer hairline, inset bevel, raised face (drawn over the fibres)
      sq(152, 44); ctx.fillStyle = p.outer[0]; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = p.outer[1]; ctx.stroke()
      let g = ctx.createLinearGradient(CX - 63, CY - 63, CX + 63, CY + 63)
      g.addColorStop(0, p.bevel[0]); g.addColorStop(.45, p.bevel[1]); g.addColorStop(1, p.bevel[2])
      sq(126, 33); ctx.fillStyle = g
      if (p.tileShadow) { ctx.shadowColor = p.tileShadow; ctx.shadowBlur = 16; ctx.shadowOffsetY = 7 }
      ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0
      ctx.strokeStyle = p.bevel[3]; ctx.lineWidth = 1.2; ctx.stroke()
      g = ctx.createLinearGradient(0, CY - 57, 0, CY + 57); g.addColorStop(0, p.face[0]); g.addColorStop(1, p.face[1])
      sq(114, 28); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = p.face[2]; ctx.lineWidth = 1; ctx.stroke()
      // Alignment ticks above and below
      ctx.strokeStyle = p.ticks; ctx.lineWidth = 1; ctx.beginPath()
      ctx.moveTo(CX, 117); ctx.lineTo(CX, 160); ctx.moveTo(CX - 4, 117); ctx.lineTo(CX + 4, 117)
      ctx.moveTo(CX, 372); ctx.lineTo(CX, 413); ctx.moveTo(CX - 4, 413); ctx.lineTo(CX + 4, 413); ctx.stroke()
    }

    const resize = () => { const d = Math.min(window.devicePixelRatio || 1, 2); canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); draw(lastT) }
    const tick = (now: number) => {
      if (visible && !reduced.matches) { lastT = now / 1000; draw(lastT) }
      frame = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting && !document.hidden })
    io.observe(canvas)
    const onVis = () => { visible = !document.hidden }
    const onReduced = () => draw(lastT)
    // redraw in the other palette when the theme changes
    const mo = new MutationObserver(() => { pal = isDark() ? DARK : LIGHT; draw(lastT) })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    document.addEventListener('visibilitychange', onVis)
    reduced.addEventListener?.('change', onReduced)
    resize()
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); io.disconnect(); mo.disconnect(); document.removeEventListener('visibilitychange', onVis); reduced.removeEventListener?.('change', onReduced) }
  }, [])

  return (
    <section className="hv-netflow" aria-label="People and agents connected through one network">
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="hv-netflow-logo" aria-hidden="true"><Logo size={64} /></span>
      <span className="hv-netflow-label left" aria-hidden="true">People + agents</span>
      <span className="hv-netflow-label right" aria-hidden="true">Escrow protected</span>
      <span className="hv-netflow-caption">Real people. Real work. One network.</span>
    </section>
  )
}
