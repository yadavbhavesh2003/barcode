"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { NotificationDrawer } from "./NotificationDrawer";
import { INotification } from "@/lib/types";
import { Loader2 } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password", "/access-denied"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check if current route is a public/auth route
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/v1/notifications");
      const json = await res.json();
      if (json.success && json.data) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (user && !isPublicRoute) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 45000);
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
