'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'
type Toast = { id: number; kind: ToastKind; message: string }

const ToastContext = createContext<{ notify: (message: string, kind?: ToastKind) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[220px] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg bg-white ${
              t.kind === 'success' ? 'border-emerald-200 text-emerald-700' :
              t.kind === 'error'   ? 'border-red-200 text-red-700' :
              'border-[#cfddff] text-[#1f54e0]'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  // No-op fallback so components work even if the provider isn't mounted.
  return ctx ?? { notify: () => {} }
}
