import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const iconMap = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const styleMap = {
  success: 'bg-bg-card border-emerald-500/20 text-emerald-400',
  error: 'bg-bg-card border-red-500/20 text-red-400',
  info: 'bg-bg-card border-purple/20 text-purple',
}

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type] || Info
          return (
            <div
              key={toast.id}
              data-testid={`toast-${toast.type}`}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-[0_4px_20px_rgba(0,0,0,0.4)] animate-[slideUp_0.3s_ease-out] ${styleMap[toast.type] || styleMap.info}`}
            >
              <Icon size={14} className="shrink-0" />
              <span className="text-[13px] font-medium">{toast.message}</span>
              <button
                data-testid="toast-dismiss"
                onClick={() => removeToast(toast.id)}
                className="text-white/20 hover:text-white/50 ml-1 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
