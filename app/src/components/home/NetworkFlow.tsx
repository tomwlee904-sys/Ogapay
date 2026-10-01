import { useEffect, useRef } from 'react'
import { Logo } from '../Logo'

/* Hero network: 45 fibres run from "people + agents" through the OgaPay tile to
   "escrow protected", with light packets travelling along them. Drawn as given in
   network-animation-1.html (1080 × 482 frame, 12 s loop); the OgaPay mark sits
   in the tile in white. Stops while off-screen or hidden; still for reduced motion. */

const LABELS = { left: 'PEOPLE + AGENTS', right: 'ESCROW PROTECTED', bottom: 'Real people. Real work. One network.' }
const W = 1080, H = 482, TAU = Math.PI * 2, LOOP = 12

export default function NetworkFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = true, frame = 0

    const curve = (a: number, b: number, c: number, d: number, t: number) => { const s = 1 - t; return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d }
    const point = (i: number, u: number, time: number): [number, number] => {
      const k = (i - 22) / 22, phase = time / LOOP * TAU
      const breath = Math.sin(phase) * 3
      if (u < .5) { const t = u * 2; return [curve(56, 230, 371, 540, t), curve(263 + k * 160, 344 + k * 79, 253 + k * 26 + breath, 254 + k * 24, t)] }
      const t = (u - .5) * 2; return [curve(540, 680, 828, 1023, t), curve(254 + k * 24, 236 + k * 26 + breath, 192 + k * 86, 255 + k * 159, t)]
    }
    const path = (i: number, start: number, end: number, time: number) => {
      ctx.beginPath()
      const n = Math.max(3, Math.ceil((end - start) * 180))
      for (let j = 0; j <= n; j++) { const p = point(i, start + (end - start) * j / n, time); if (j) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]) }
    }
    // Rounded rectangle (with a fallback for browsers without roundRect)
    const box = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      if (typeof (ctx as any).roundRect === 'function') { (ctx as any).roundRect(x, y, w, h, r); return }
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
    }
    const spaced = (s: string, x: number, y: number, spacing: number, align?: 'right') => {
      ctx.font = '16px Consolas, monospace'
      const widths = [...s].map((c) => ctx.measureText(c).width), total = widths.reduce((a, b) => a + b, 0) + spacing * (s.length - 1)
      if (align === 'right') x -= total
      ;[...s].forEach((c, i) => { ctx.fillText(c, x, y); x += widths[i] + spacing })
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
      const fade = ctx.createLinearGradient(50, 0, 1030, 0)
      fade.addColorStop(0, 'rgba(157,169,180,0)'); fade.addColorStop(.14, 'rgba(157,169,180,.24)'); fade.addColorStop(.44, 'rgba(191,199,204,.33)')
      fade.addColorStop(.56, 'rgba(191,199,204,.33)'); fade.addColorStop(.86, 'rgba(157,169,180,.24)'); fade.addColorStop(1, 'rgba(157,169,180,0)')
      ctx.lineWidth = .72; ctx.strokeStyle = fade
      for (let i = 0; i < 45; i++) { path(i, 0, 1, time); ctx.stroke() }
      // Long tapered light packets; the fibres stay visible through each glow
      for (let j = 0; j < 13; j++) {
        const i = (j * 17 + 4) % 45, u = ((time / LOOP) + (j * .61803398875)) % 1
        const length = .12 + (j % 3) * .015
        for (let s = 0; s < 22; s++) {
          const a = u - length + s * length / 22, b = a + length / 22
          if (a < 0 || b > 1) continue
          const env = Math.pow(Math.sin(Math.PI * s / 22), 1.65) * Math.sin(Math.PI * (a + b) / 2)
          const color = j % 4 === 0 ? '149,211,204' : j % 3 === 0 ? '153,180,209' : '191,203,213'
          ctx.strokeStyle = `rgba(${color},${env * .7})`; ctx.lineWidth = .95; ctx.shadowColor = `rgba(${color},.35)`; ctx.shadowBlur = 3
          path(i, a, b, time); ctx.stroke()
        }
      }
      ctx.shadowBlur = 0
      // Outer hairline, inset bevel and dark raised face
      box(456, 182, 168, 168, 49); ctx.fillStyle = '#020303'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1c1e20'; ctx.stroke()
      let g = ctx.createLinearGradient(470, 196, 610, 336); g.addColorStop(0, '#303336'); g.addColorStop(.45, '#1b1d20'); g.addColorStop(1, '#101113')
      box(470, 196, 140, 140, 37); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#414447'; ctx.lineWidth = 1.2; ctx.stroke()
      g = ctx.createLinearGradient(0, 202, 0, 330); g.addColorStop(0, '#222427'); g.addColorStop(1, '#0b0c0e')
      box(477, 203, 126, 126, 31); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(142,151,160,.07)'; ctx.lineWidth = 1; ctx.stroke()
      // Alignment ticks and framing
      ctx.strokeStyle = '#303235'; ctx.lineWidth = 1; ctx.beginPath()
      ctx.moveTo(540, 117); ctx.lineTo(540, 151); ctx.moveTo(536, 117); ctx.lineTo(544, 117); ctx.moveTo(540, 379); ctx.lineTo(540, 413); ctx.moveTo(536, 413); ctx.lineTo(544, 413); ctx.stroke()
      ctx.fillStyle = '#939499'; ctx.beginPath(); ctx.arc(63, 58, 3.4, 0, TAU); ctx.fill()
      spaced(LABELS.left, 82, 63, 1.55); spaced(LABELS.right, 1018, 63, 1.55, 'right')
      ctx.font = '19px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#909095'; ctx.fillText(LABELS.bottom, 540, 466)
      const tw = ctx.measureText(LABELS.bottom).width; ctx.textAlign = 'left'; ctx.strokeStyle = '#343538'; ctx.beginPath()
      ctx.moveTo(540 - tw / 2 - 58, 459); ctx.lineTo(540 - tw / 2 - 22, 459); ctx.moveTo(540 + tw / 2 + 22, 459); ctx.lineTo(540 + tw / 2 + 58, 459); ctx.stroke()
    }

    const resize = () => { const d = Math.min(window.devicePixelRatio || 1, 2); canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); draw(0) }
    const tick = (now: number) => { if (visible && !reduced.matches) draw(now / 1000); frame = requestAnimationFrame(tick) }
    const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting && !document.hidden })
    io.observe(canvas)
    const onVis = () => { visible = !document.hidden }
    const onReduced = () => draw(0)
    document.addEventListener('visibilitychange', onVis)
    reduced.addEventListener?.('change', onReduced)
    resize()
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); io.disconnect(); document.removeEventListener('visibilitychange', onVis); reduced.removeEventListener?.('change', onReduced) }
  }, [])

  return (
    <section className="hv-netflow" aria-label="People and agents connected through one network">
      <canvas ref={canvasRef} aria-hidden="true" />
      <span className="hv-netflow-logo" aria-hidden="true"><Logo size={64} /></span>
    </section>
  )
}
