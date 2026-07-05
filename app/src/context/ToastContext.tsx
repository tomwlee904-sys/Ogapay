import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  toast: (message: string, type?: ToastType, duration?: number) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  toast: () => {},
  dismissToast: () => {},
})

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    const id = `toast-${++toastCounter}`
    setToasts(prev => [...prev, { id, type, message, duration }])
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration)
    }
  }, [dismissToast])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismissToast }}>
      {children}
      {/* Toast portal rendered at the provider level */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => dismissToast(t.id)}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              background: t.type === 'error' ? '#DC2626'
                : t.type === 'success' ? '#16A34A'
                : t.type === 'warning' ? '#F59E0B'
                : '#1F8CFF',
              boxShadow: '0 4px 16px rgba(0,0,0,.25)',
              pointerEvents: 'auto',
              cursor: 'pointer',
              animation: 'toastSlideUp .25s ease-out',
              maxWidth: '90vw',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
