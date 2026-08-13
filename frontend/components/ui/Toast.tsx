"use client";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss: () => void;
}

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error:   "✕",
  info:    "i",
  warning: "!",
};

const STYLES: Record<ToastType, string> = {
  success: "bg-white border-emerald-200 text-ink [&_.toast-icon]:bg-emerald-50 [&_.toast-icon]:text-emerald-600",
  error:   "bg-white border-red-200    text-ink [&_.toast-icon]:bg-red-50    [&_.toast-icon]:text-red-600",
  warning: "bg-white border-amber-200  text-ink [&_.toast-icon]:bg-amber-50  [&_.toast-icon]:text-amber-600",
  info:    "bg-white border-border     text-ink [&_.toast-icon]:bg-canvas    [&_.toast-icon]:text-ink-muted",
};

export function Toast({ message, type = "info", onDismiss }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  function dismiss() {
    setExiting(true);
    // let animation finish before unmounting
    setTimeout(onDismiss, 140);
  }

  useEffect(() => {
    const t = setTimeout(dismiss, 4000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={[
        "fixed bottom-5 right-5 z-50 flex items-start gap-3 rounded-lg border shadow-modal px-4 py-3 max-w-sm w-full sm:w-auto",
        STYLES[type],
        exiting ? "animate-toast-out" : "animate-toast-in",
      ].join(" ")}
    >
      <span
        className="toast-icon flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold leading-none mt-0.5"
        aria-hidden="true"
      >
        {ICONS[type]}
      </span>
      <p className="flex-1 text-sm leading-snug">{message}</p>
      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-ink-faint hover:text-ink transition-colors duration-150 leading-none mt-0.5"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M2 2l10 10M12 2L2 12"/>
        </svg>
      </button>
    </div>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const show    = (message: string, type: ToastType = "info") => setToast({ message, type });
  const dismiss = () => setToast(null);
  return { toast, show, dismiss };
}
