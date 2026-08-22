"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
  };
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastMessage = { id, type, title, message, duration };

      setToasts((prev) => {
        const next = [...prev, newToast];
        return next.slice(-3); // Keep at most 3 active toasts
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg: string, title?: string, dur?: number) => showToast("success", msg, title, dur),
      error: (msg: string, title?: string, dur?: number) => showToast("error", msg, title, dur),
      warning: (msg: string, title?: string, dur?: number) => showToast("warning", msg, title, dur),
      info: (msg: string, title?: string, dur?: number) => showToast("info", msg, title, dur),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toast, showToast, removeToast }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-6 right-6 z-[999999] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";
          const isWarning = t.type === "warning";

          const defaultTitle = isError
            ? "Validation Error"
            : isSuccess
            ? "Action Successful"
            : isWarning
            ? "Warning Alert"
            : "Notification";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto relative overflow-hidden flex items-start gap-3.5 rounded-2xl p-4 shadow-2xl backdrop-blur-xl border transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${
                isSuccess
                  ? "bg-white dark:bg-zinc-900 border-l-[6px] border-l-emerald-500 border-zinc-200/90 dark:border-zinc-800 shadow-emerald-500/10"
                  : isError
                  ? "bg-white dark:bg-zinc-900 border-l-[6px] border-l-rose-500 border-zinc-200/90 dark:border-zinc-800 shadow-rose-500/10"
                  : isWarning
                  ? "bg-white dark:bg-zinc-900 border-l-[6px] border-l-amber-500 border-zinc-200/90 dark:border-zinc-800 shadow-amber-500/10"
                  : "bg-white dark:bg-zinc-900 border-l-[6px] border-l-indigo-500 border-zinc-200/90 dark:border-zinc-800 shadow-indigo-500/10"
              }`}
            >
              {/* Glowing Icon */}
              <div className="shrink-0 mt-0.5">
                {isSuccess && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                )}
                {isError && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-bounce">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                )}
                {isWarning && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                )}
                {!isSuccess && !isError && !isWarning && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/30">
                    <Info className="h-5 w-5" />
                  </div>
                )}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0 pr-2">
                <h4
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isSuccess
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isError
                      ? "text-rose-600 dark:text-rose-400"
                      : isWarning
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  {t.title || defaultTitle}
                </h4>
                <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed break-words font-medium mt-0.5">
                  {t.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
