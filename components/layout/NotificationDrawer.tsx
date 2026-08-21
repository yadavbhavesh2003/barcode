"use client";

import React from "react";
import Link from "next/link";
import {
  Bell,
  X,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { INotification } from "@/lib/types";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: INotification[];
  onMarkAllRead: () => void;
  onMarkAsRead: (id: string) => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onMarkAsRead,
}: NotificationDrawerProps) {
  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default:
        return <Info className="h-4 w-4 text-indigo-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-zinc-950 z-10 animate-in slide-in-from-right duration-200 border-l border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Notifications & Alerts
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                All caught up!
              </p>
              <p className="text-xs text-zinc-400 mt-1">No new operational alerts at this time.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item._id}
                onClick={() => onMarkAsRead(item._id || "")}
                className={`group relative rounded-xl border p-3.5 transition-all ${
                  !item.isRead
                    ? "border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/20"
                    : "border-zinc-200/80 bg-white hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{getIcon(item.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                      {item.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                      <span>
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {item.link && (
                        <Link
                          href={item.link}
                          onClick={onClose}
                          className="flex items-center gap-0.5 text-indigo-600 hover:underline font-semibold"
                        >
                          <span>Review</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
