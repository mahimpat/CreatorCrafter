import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import './Toast.css'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const toast: Toast = { id, type, message, duration }

    setToasts(prev => [...prev, toast])

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration)
  }, [showToast])

  const showError = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration ?? 6000) // Errors stay longer
  }, [showToast])

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration)
  }, [showToast])

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast('warning', message, duration ?? 5000)
  }, [showToast])

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false)

  const handleRemove = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300) // Match animation duration
  }, [onRemove, toast.id])

  // Auto-exit animation before removal
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true)
      }, toast.duration - 300)
      return () => clearTimeout(exitTimer)
    }
  }, [toast.duration])

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
    warning: <AlertTriangle size={18} />,
  }

  return (
    <div className={`toast toast-${toast.type} ${isExiting ? 'toast-exit' : ''}`}>
      <div className="toast-icon">{icons[toast.type]}</div>
      <div className="toast-message">{toast.message}</div>
      <button className="toast-close" onClick={handleRemove}>
        <X size={14} />
      </button>
    </div>
  )
}

export default ToastProvider
