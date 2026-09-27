import { useEffect, useId, useRef, type ReactNode } from 'react'

// Dialog for the wallet (Withdraw, Add bank account): centred on desktop, a
// bottom sheet on phones. Escape or a click outside closes it.
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Focus the first text field, else the dialog itself (screen readers start at the title)
    const first = box.current?.querySelector<HTMLElement>('input:not([type=radio]), select, textarea') || box.current
    first?.focus({ preventScroll: true })
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [])

  return (
    <div className="wl-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="wl-sheet" role="dialog" aria-modal="true" aria-labelledby={id} ref={box} tabIndex={-1}>
        <header className="wl-sheet-head">
          <h2 id={id}>{title}</h2>
          <button type="button" className="wl-x" aria-label="Close" onClick={onClose}><i className="ti ti-x" /></button>
        </header>
        <div className="wl-sheet-body">{children}</div>
      </div>
    </div>
  )
}
