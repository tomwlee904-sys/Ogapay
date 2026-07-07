'use client'

import { useRef, useEffect, useCallback } from 'react'

interface Props {
  /** Where to anchor the wave origin — defaults to top-right */
  originX?: number // 0-1, fraction of container width
  originY?: number // 0-1, fraction of container height
}

/**
 * Animated wavy/topographic line background.
 *
 * Performance: 30fps cap, visibility/pause/intersection-observer,
 * respects prefers-reduced-motion, renders at 0.5x DPR.
 * Automatically adapts to light/dark themes.
 */
export default function WaveBackground({ originX = 0.85, originY = 0.15 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    time: 0,
    rafId: 0,
    lastFrame: 0,
    fpsInterval: 1000 / 30, // 30fps
    visible: true,
    intersecting: true,
    reducedMotion: false,
    canvasWidth: 0,
    canvasHeight: 0,
    dpr: 1,
  })

  // ── Pick color by current theme ─────────────
  const getStrokeColor = useCallback(() => {
    if (typeof document === 'undefined') return 'rgba(25, 28, 107, 0.12)'
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    return isDark
      ? 'rgba(147, 197, 253, 0.20)'
      : 'rgba(25, 28, 107, 0.12)'
  }, [])

  // ── Draw frame ───────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const s = stateRef.current

    // Skip if not visible or scrolled out
    if (!s.visible || !s.intersecting || s.canvasWidth === 0) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = s.canvasWidth
    const h = s.canvasHeight
    const cx = w * originX
    const cy = h * originY
    const maxR = Math.sqrt(cx * cx + cy * cy) * 1.4

    ctx.clearRect(0, 0, w, h)

    // If reduced motion, draw a single static frame
    if (s.reducedMotion) {
      s.time = 0
    }

    const time = s.time
    ctx.strokeStyle = getStrokeColor()
    ctx.lineWidth = 1.5
    ctx.beginPath()

    // Draw 5 concentric rings with larger wobble for visibility
    const ringCount = 5
    for (let r = 0; r < ringCount; r++) {
      const baseRadius = (maxR / ringCount) * (r + 0.6)
      const segments = Math.max(80, Math.floor(baseRadius * 0.35))

      ctx.beginPath()
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        // Larger sine-wave perturbation for visible waviness
        const wobble = Math.sin(angle * 5 + time + r * 0.9) * 20
                     + Math.sin(angle * 11 + time * 0.7 + r * 1.1) * 10
        const radius = baseRadius + wobble
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.stroke()
    }

    // Increment time for next frame (unless reduced motion)
    if (!s.reducedMotion) {
      s.time += 0.008
    }
  }, [originX, originY, getStrokeColor])

  // ── Animation loop (throttled to 30fps) ──────
  const animate = useCallback((timestamp: number) => {
    const s = stateRef.current
    s.rafId = requestAnimationFrame(animate)

    const elapsed = timestamp - s.lastFrame
    if (elapsed < s.fpsInterval) return

    s.lastFrame = timestamp - (elapsed % s.fpsInterval)
    draw()
  }, [draw])

  // ── Resize handler ───────────────────────────
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const parent = canvas.parentElement
    if (!parent) return

    const s = stateRef.current
    const rect = parent.getBoundingClientRect()

    // 0.5x DPR for performance
    s.dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.5
    s.canvasWidth = rect.width
    s.canvasHeight = rect.height

    canvas.width = rect.width * s.dpr
    canvas.height = rect.height * s.dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(s.dpr, s.dpr)
  }, [])

  // ── IntersectionObserver ─────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        stateRef.current.intersecting = entry.isIntersecting
      },
      { threshold: 0 }
    )
    observer.observe(canvas)

    return () => observer.disconnect()
  }, [])

  // ── Visibility change ────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      stateRef.current.visible = document.visibilityState === 'visible'
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // ── Reduced motion ──────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    stateRef.current.reducedMotion = mq.matches
    const handler = (e: MediaQueryListEvent) => {
      stateRef.current.reducedMotion = e.matches
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // ── Resize observer ─────────────────────────
  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  // ── Start/stop animation ────────────────────
  useEffect(() => {
    stateRef.current.rafId = requestAnimationFrame(animate)
    // Draw initial frame regardless
    setTimeout(() => draw(), 50)

    return () => {
      if (stateRef.current.rafId) {
        cancelAnimationFrame(stateRef.current.rafId)
      }
    }
  }, [animate, draw])

  // ── Dark mode listener ──────────────────────
  useEffect(() => {
    // Re-draw when theme changes
    const observer = new MutationObserver(() => {
      draw()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
