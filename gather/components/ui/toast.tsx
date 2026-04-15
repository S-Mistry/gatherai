"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { X } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

type ToastVariant = "default" | "success" | "warning" | "danger"

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  durationMs?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastRecord extends ToastOptions {
  id: string
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used inside <Toaster />")
  }
  return context
}

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((current) => [...current, { ...options, id }])
    return id
  }, [])

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((item) => (
          <ToastItem key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord
  onDismiss: (id: string) => void
}) {
  const duration = toast.durationMs ?? 4000

  useEffect(() => {
    if (duration <= 0) return
    const id = window.setTimeout(() => onDismiss(toast.id), duration)
    return () => window.clearTimeout(id)
  }, [duration, onDismiss, toast.id])

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-2xl border bg-card/95 px-4 py-3 text-sm shadow-sm backdrop-blur",
        toast.variant === "success" && "border-emerald-500/30",
        toast.variant === "warning" && "border-amber-500/30",
        toast.variant === "danger" && "border-destructive/40",
        (!toast.variant || toast.variant === "default") && "border-border/70"
      )}
    >
      <div className="flex-1 space-y-1">
        {toast.title ? (
          <p className="font-medium text-foreground">{toast.title}</p>
        ) : null}
        {toast.description ? (
          <p className="leading-6 text-muted-foreground">{toast.description}</p>
        ) : null}
      </div>
      {toast.action ? (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick()
            onDismiss(toast.id)
          }}
          className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(toast.id)}
        className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}
