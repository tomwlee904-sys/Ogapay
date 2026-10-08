import { useEffect, useRef } from 'react'
import { Logo } from '../Logo'

/* Hero network: 45 fine fibres run from "people + agents" through the OgaPay tile
   to "escrow protected", with light trails travelling along them. Adapted from
   network-animation-1.html (dark) and network-animation-light.html (light): same
   1080 × 482 frame, palette follows the site theme.
   Matched to the wurk.fun hero: the fibres are bright (up to 75% opacity, with a
   slow per-fibre shimmer) and gather into one bundle at the tile; a slow wave
   runs through each fibre; and on a mouse the bundle bends toward the pointer
   near it, easing in and out. The canvas is drawn at its on-screen size, so the
   fibres stay 0.7px wide instead of being shrunk to half that. No background of
   its own, so the page (and its dark-mode glow) shows through. Pauses
   off-screen and in hidden tabs; one still frame for reduced motion. */

const W = 1080, H = 482, TAU = Math.PI * 2, LOOP = 12
const CX = 540, CY = 266
const FIBRES = 45

type Palette = {
  fibre: string; packets: [string, string, string]; packetAlpha: number
  outer: [string, string]; bevel: [string, string, string, string]; face: [string, string, string]
  tileShadow: string | null; ticks: string
}
const DARK: Palette = {
  fibre: '198,214,222',
  packets: ['171,228,212', '169,202,244', '214,222,228'], packetAlpha: .85,
  outer: ['#020303', '#1c1e20'], bevel: ['#303336', '#1b1d20', '#101113', '#414447'], face: ['#222427', '#0b0c0e', 'rgba(142,151,160,.07)'],
  tileShadow: null, ticks: '#303235',
}
const LIGHT: Palette = {
  fibre: '103,122,132',
  packets: ['73,139,123', '78,108,151', '103,122,132'], packetAlpha: .7,
  outer: ['#fff', '#e7e9eb'], bevel: ['#fff', '#f8f9fa', '#eef0f2', '#e1e4e7'], face: ['#fff', '#f8f9fa', 'rgba(142,151,160,.07)'],
  tileShadow: 'rgba(40,53,67,.10)', ticks: '#dde1e4',
}
// Fibre opacity along the width: clear at the ends, strongest either side of
// the tile, lower behind it
const FIBRE_STOPS: [number, number][] = [[0, 0], [.12, .3], [.36, .75], [.5, .25], [.64, .75], [.88, .3], [1, 0]]

const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark'
const clamp = (v: number) => Math.max(-1, Math.min(1, v))

export default function NetworkFlow() {
  const boxRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const box = boxRef.current, canvas = canvasRef.current
    if (!box || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const small = window.innerWidth < 768
    // Phones: fewer points per fibre and pieces per light trail. At phone width a
    // fibre point is ~6px apart and a trail piece ~5px, which still reads as smooth
    // curves and soft trails, for about a third of the work.
    const STEPS = small ? 64 : 180 // points per fibre
    const SEGS = small ? 10 : 22 // pieces per light trail, each drawn twice
    // Phones: 30 frames a second is plenty here and halves the work
    const minGap = small ? 1000 / 30 - 2 : 0
    let visible = true, frame = 0, pal = isDark() ? DARK : LIGHT, lastT = 0, prevNow = 0, lastDraw = 0, dead = false
    let unit = 2 // frame units per CSS pixel (set on resize)
    // Pointer over the hero, -1..1 on each axis; `ptr` eases toward `target`
    const ptr = [0, 0], target = [0, 0]

    const curve = (a: number, b: number, c: number, d: number, t: number) => { const s = 1 - t; return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d }
    // The supplied files' paths, gathered to a ±30 bundle where they meet the tile
    const point = (i: number, u: number, time: number): [number, number] => {
      const k = (i - 22) / 22, breath = Math.sin(time / LOOP * TAU) * 3
      let x: number, y: number
      if (u < .5) { const t = u * 2; x = curve(56, 230, 371, CX, t); y = curve(263 + k * 160, 344 + k * 79, 253 + k * 34 + breath, CY - 12 + k * 30, t) }
      else { const t = (u - .5) * 2; x = curve(CX, 680, 828, 1023, t); y = curve(CY - 12 + k * 30, 236 + k * 34 + breath, 192 + k * 86, 255 + k * 159, t) }
      const env = Math.sin(Math.PI * u) // ends stay put
      y += Math.sin(u * TAU + time * .32 + k * 1.2) * env * (5 + Math.abs(k) * 3)
      // bend toward the pointer around its horizontal position
      y += ptr[1] * 26 * Math.exp(-Math.pow((u - (.5 + ptr[0] * .2)) * 3.2, 2)) * env
      return [x, y]
    }
    const path = (i: number, start: number, end: number, time: number) => {
      ctx.beginPath()
      const n = Math.max(3, Math.ceil((end - start) * STEPS))
      for (let j = 0; j <= n; j++) { const p = point(i, start + (end - start) * j / n, time); if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]) }
    }
    const rect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      if (typeof (ctx as any).roundRect === 'function') { (ctx as any).roundRect(x, y, w, h, r); return }
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
    }
    // A square centred on the tile centre
    const sq = (size: number, r: number) => rect(CX - size / 2, CY - size / 2, size, size, r)

    const draw = (time: number) => {
      const p = pal
      ctx.clearRect(0, 0, W, H) // transparent: the page shows through
      // Fibres, 0.7 CSS px wide, each with a slow shimmer
      const fade = ctx.createLinearGradient(50, 0, 1030, 0)
      for (const [at, a] of FIBRE_STOPS) fade.addColorStop(at, `rgba(${p.fibre},${a})`)
      ctx.lineWidth = .7 * unit; ctx.lineCap = 'round'; ctx.strokeStyle = fade
      for (let i = 0; i < FIBRES; i++) { ctx.globalAlpha = .56 + .25 * Math.cos(i * .43 + time * .25); path(i, 0, 1, time); ctx.stroke() }
      ctx.globalAlpha = 1
      // Light trails: a wide faint stroke under a fine bright one (a glow without
      // canvas blur, which is costly on phones)
      for (let j = 0; j < 13; j++) {
        const i = (j * 17 + 4) % FIBRES, u = ((time / LOOP) + (j * .61803398875)) % 1
        const length = .14 + (j % 3) * .02
        const color = j % 4 === 0 ? p.packets[0] : j % 3 === 0 ? p.packets[1] : p.packets[2]
        for (let s = 0; s < SEGS; s++) {
          const a = u - length + s * length / SEGS, b = a + length / SEGS
          if (a < 0 || b > 1) continue
          const env = Math.pow(Math.sin(Math.PI * s / SEGS), 2) * Math.sin(Math.PI * (a + b) / 2)
          if (env < .02) continue
          ctx.strokeStyle = `rgba(${color},${env * p.packetAlpha * .22})`; ctx.lineWidth = 3 * unit; path(i, a, b, time); ctx.stroke()
          ctx.strokeStyle = `rgba(${color},${env * p.packetAlpha})`; ctx.lineWidth = 1.15 * unit; ctx.stroke()
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

    // Draw at the canvas's on-screen size (sharp, and hairlines stay hairlines)
    const resize = () => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return
      const d = Math.min(window.devicePixelRatio || 1, 2)
      const cw = Math.round(r.width * d), ch = Math.round(r.height * d)
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch }
      ctx.setTransform(cw / W, 0, 0, ch / H, 0, 0)
      unit = W / r.width
      draw(lastT)
    }
    const tick = (now: number) => {
      const dt = prevNow ? Math.min(.1, (now - prevNow) / 1000) : 0
      prevNow = now
      if (visible && !reduced.matches && now - lastDraw >= minGap) {
        lastDraw = now
        const ease = 1 - Math.exp(-6 * dt)
        ptr[0] += (target[0] - ptr[0]) * ease; ptr[1] += (target[1] - ptr[1]) * ease
        lastT = now / 1000; draw(lastT)
      }
      frame = requestAnimationFrame(tick)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !finePointer.matches || reduced.matches) return
      const r = box.getBoundingClientRect()
      if (!r.width || !r.height) return
      target[0] = clamp((e.clientX - r.left) / r.width * 2 - 1)
      target[1] = clamp((e.clientY - r.top) / r.height * 2 - 1)
    }
    const onLeave = () => { target[0] = target[1] = 0 }
    const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting && !document.hidden; if (!visible) onLeave() })
    io.observe(canvas)
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    ro?.observe(canvas)
    const onVis = () => { visible = !document.hidden }
    const onReduced = () => { onLeave(); ptr[0] = ptr[1] = 0; draw(lastT) }
    // redraw in the other palette when the theme changes
    const mo = new MutationObserver(() => { pal = isDark() ? DARK : LIGHT; draw(lastT) })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    document.addEventListener('visibilitychange', onVis)
    reduced.addEventListener?.('change', onReduced)
    box.addEventListener('pointermove', onMove, { passive: true })
    box.addEventListener('pointerleave', onLeave, { passive: true })
    window.addEventListener('resize', resize, { passive: true })
    resize()
    // A still frame shows straight away; the motion starts once the page has
    // loaded, so it doesn't compete with loading the page on slow phones
    const start = () => { if (!dead && !frame) frame = requestAnimationFrame(tick) }
    const idle = () => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 200))
    if (document.readyState === 'complete') idle()
    else window.addEventListener('load', idle, { once: true })
    return () => {
      dead = true; window.removeEventListener('load', idle)
      cancelAnimationFrame(frame); io.disconnect(); ro?.disconnect(); mo.disconnect()
      document.removeEventListener('visibilitychange', onVis); reduced.removeEventListener?.('change', onReduced)
      box.removeEventListener('pointermove', onMove); box.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <section ref={boxRef} className="hv-netflow" aria-label="People and teams connected through one network">
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="hv-netflow-logo" aria-hidden="true"><Logo size={64} /></span>
      <span className="hv-netflow-label left" aria-hidden="true">People + teams</span>
      <span className="hv-netflow-label right" aria-hidden="true">Escrow protected</span>
      <span className="hv-netflow-caption">Real people. Real work. One network.</span>
    </section>
  )
}
