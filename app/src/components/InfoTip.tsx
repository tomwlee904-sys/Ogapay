import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/* A small "ⓘ" that explains a feature in plain words, like wurk.fun's info
   icons. Tap or click to open, tap outside or press Escape to close. The note
   is placed under the icon and kept inside the screen. Explanations must match
   the real rules (fees, timings, limits) in the backend. */
export default function InfoTip({ label, title, children, size = 15 }: { label: string; title?: string; children: ReactNode; size?: number }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const id = useId()

  const place = () => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const width = Math.min(300, window.innerWidth - 24)
    const left = Math.min(Math.max(12, r.left + r.width / 2 - width / 2), window.innerWidth - width - 12)
    const below = r.bottom + 8
    const h = pop.current?.offsetHeight || 0
    const top = h && below + h > window.innerHeight - 12 && r.top - h - 8 > 12 ? r.top - h - 8 : below
    setPos({ top, left, width })
  }
  useLayoutEffect(() => { if (open) place() }, [open])
  useEffect(() => {
    if (!open) return
    const onDown = (e: Event) => { if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false) }
    // Escape closes just this note, not a sheet or dialog it sits in
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus() } }
    const onMove = () => place()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    // second pass once the note's height is known (it may open upwards)
    const t = setTimeout(place, 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open])

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`oga-info${open ? ' on' : ''}`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v) }}
      >
        <i className="ti ti-info-circle" aria-hidden="true" style={{ fontSize: size }} />
      </button>
      {open && (
        <div
          ref={pop}
          id={id}
          role="dialog"
          aria-label={title || label}
          className="oga-info-pop"
          style={pos ? { top: pos.top, left: pos.left, width: pos.width } : { visibility: 'hidden', top: 0, left: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {title && <strong>{title}</strong>}
          <div className="oga-info-body">{children}</div>
        </div>
      )}
    </>
  )
}
