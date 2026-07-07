import { useState, useCallback, createContext, useContext } from 'react'

interface ToastItem { id: number; message: string; type: 'success' | 'error' }

interface ToastCtx { toast: (msg: string, type?: 'success' | 'error') => void }

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export const useToast = () => useContext(ToastContext)

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = nextId++
    setItems(prev => [...prev, { id, message, type }])
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        {items.map(t => (
          <div key={t.id} role="alert" style={{
            padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            background: t.type === 'success' ? 'var(--green)' : '#dc2626',
            color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            pointerEvents: 'auto', animation: 'toastIn 0.25s ease-out',
            fontFamily: 'inherit', maxWidth: 420,
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
