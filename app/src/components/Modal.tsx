import { useEffect, useRef, ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Trap focus
  useEffect(() => {
    if (!open || !modalRef.current) return
    const first = modalRef.current.querySelector<HTMLElement>('button, input, a, select, textarea')
    first?.focus()
  }, [open])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
          }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{title}</h3>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text2)', cursor: 'pointer', fontSize: 18,
              display: 'grid', placeItems: 'center',
              fontFamily: 'inherit',
            }}>
              <i className="ti ti-x" />
            </button>
          </div>
        )}
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}
