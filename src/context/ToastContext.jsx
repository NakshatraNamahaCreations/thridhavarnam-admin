import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((message, kind = 'ok') => {
    clearTimeout(timer.current)
    setToast({ message, kind })
    timer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  return (
    <ToastCtx.Provider value={{ ok: (m) => show(m, 'ok'), bad: (m) => show(m, 'bad') }}>
      {children}
      {toast && (
        <div className={`toast ${toast.kind}`}>
          <span>{toast.kind === 'ok' ? '✓' : '⚠'}</span>
          {toast.message}
        </div>
      )}
    </ToastCtx.Provider>
  )
}
