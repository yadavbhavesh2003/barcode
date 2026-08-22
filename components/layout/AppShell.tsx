"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/context/ToastContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { NotificationDrawer } from "./NotificationDrawer";
import { INotification } from "@/lib/types";
import { Loader2 } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password", "/access-denied"];

// Web Audio API soft sound synthesizer
function playNotificationChime(type: "sale" | "alert") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "sale") {
      // Pleasant high register double chime (D5 -> A5)
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Soft alert beep (440Hz -> 330Hz)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // browser auto-play policy fallback
  }
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const isInitialFetch = useRef(true);

  // Check if current route is a public/auth route
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Fetch notifications with live alert detection
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/v1/notifications");
      const json = await res.json();
      if (json.success && json.data) {
        const list: INotification[] = json.data.notifications || [];
        setNotifications(list);
        setUnreadCount(json.data.unreadCount || 0);

        // Check for new incoming notifications to show live popup & play chime
        if (!isInitialFetch.current) {
          const newItems = list.filter(
            (n) => n._id && !n.isRead && !seenNotificationIds.current.has(n._id)
          );

          for (const item of newItems) {
            seenNotificationIds.current.add(item._id || "");

            // On POS billing screen, do not spam floating toast popups over the invoice modal
            if (pathname === "/billing") continue;

            if (item.category === "sales" || item.type === "success") {
              playNotificationChime("sale");
              toast.success(item.message, item.title, 6000);
            } else if (item.type === "warning") {
              playNotificationChime("alert");
              toast.warning(item.message, item.title, 5000);
            } else if (item.type === "error") {
              toast.error(item.message, item.title, 5000);
            } else {
              toast.info(item.message, item.title, 4000);
            }
          }
        } else {
          // Initialize seen list on first load so we don't spam old notifications
          list.forEach((n) => {
            if (n._id) seenNotificationIds.current.add(n._id);
          });
          isInitialFetch.current = false;
        }
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (user && !isPublicRoute) {
      fetchNotifications();
      // Live polling every 5 seconds for instant sale updates
      const interval = setInterval(fetchNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [user, isPublicRoute]);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/v1/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch("/api/v1/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  // Loading state on initial bootstrap
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Initializing Enterprise System...
          </p>
        </div>
      </div>
    );
  }

  // Public Layout (Login, Password Recovery, 403 Access Denied)
  if (isPublicRoute) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        {children}
      </main>
    );
  }

  // Authenticated Enterprise Admin Shell
  return (
    <div className="flex min-h-screen bg-zinc-50/70 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Column */}
      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-200 ${
          isSidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotificationsCount={unreadCount}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Modals & Drawers */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onMarkAsRead={handleMarkAsRead}
      />
    </div>
  );
}
