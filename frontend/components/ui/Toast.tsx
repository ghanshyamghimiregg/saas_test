"use client";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss: () => void;
}

export function Toast({ message, type = "info", onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const colors = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    info: "bg-slate-800",
  };

  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${colors[type]}`}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="opacity-70 hover:opacity-100 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

// Simple hook for managing toasts
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const show = (message: string, type: ToastType = "info") => setToast({ message, type });
  const dismiss = () => setToast(null);
  return { toast, show, dismiss };
}
