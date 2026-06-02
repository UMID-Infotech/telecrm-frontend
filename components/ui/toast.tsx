// teleCRM/components/ui/toast.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type ToastVariant = "default" | "destructive" | "success"

interface ToastProps {
  message: string
  variant?: ToastVariant
  onClose: () => void
}

const variantClasses: Record<ToastVariant, string> = {
  default: "bg-slate-800 text-white",
  destructive: "bg-red-600 text-white",
  success: "bg-green-600 text-white",
}

export function Toast({ message, variant = "default", onClose }: ToastProps) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium transition-all animate-in slide-in-from-bottom-4",
        variantClasses[variant],
      )}
    >
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 text-xs">✕</button>
    </div>
  )
}

// Simple hook-based toast state manager
export function useToast() {
  const [toast, setToast] = React.useState<{ message: string; variant: ToastVariant } | null>(null)

  const showToast = (message: string, variant: ToastVariant = "default") => {
    setToast({ message, variant })
  }

  const hideToast = () => setToast(null)

  const ToastComponent = toast ? (
    <Toast message={toast.message} variant={toast.variant} onClose={hideToast} />
  ) : null

  return { showToast, ToastComponent }
}
