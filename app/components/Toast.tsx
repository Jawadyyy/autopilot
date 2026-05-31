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
            className={`min-w-[220px] max-w-sm rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${
              t.kind === 'success' ? 'border-green-500/40 bg-green-500/15 text-green-200' :
              t.kind === 'error'   ? 'border-red-500/40 bg-red-500/15 text-red-200' :
              'border-[#2f75ff]/40 bg-[#2f75ff]/15 text-[#cfe0ff]'
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
