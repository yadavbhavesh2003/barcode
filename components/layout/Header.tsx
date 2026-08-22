"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Menu,
  Search,
  Bell,
  Zap,
  ChevronRight,
  User,
  Settings,
  LogOut,
  Shield,
  Building,
  KeyRound,
  ExternalLink,
  CircleDot,
} from "lucide-react";

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
}

export function Header({
  onToggleSidebar,
  onOpenSearch,
  onOpenNotifications,
  unreadNotificationsCount,
}: HeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute Breadcrumb items from pathname
  const getBreadcrumbs = () => {
    if (pathname === "/") {
      return [{ label: "Dashboard", href: "/" }];
    }
    const parts = pathname.split("/").filter(Boolean);
    const crumbs = [{ label: "Dashboard", href: "/" }];
    let curHref = "";
    for (const part of parts) {
      curHref += `/${part}`;
      const formatted = part
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      crumbs.push({ label: formatted, href: curHref });
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 dark:border-zinc-800/80 dark:bg-zinc-950/90 transition-colors">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Dynamic Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.href}>
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-zinc-400 shrink-0" />}
                {isLast ? (
                  <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[180px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Center / Search Trigger Button */}
      <div className="flex items-center">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-1.5 text-xs text-zinc-500 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-all sm:w-64"
        >
          <Search className="h-3.5 w-3.5 text-zinc-400" />
          <span className="hidden sm:inline flex-1 text-left">Quick Search...</span>
          <span className="sm:hidden">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-white px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 shadow-xs border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Organization / Outlet Badge */}
        <div className="hidden xl:flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <Building className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-200">RUNR KIDS</span>
          <span className="text-zinc-400">|</span>
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CircleDot className="h-2 w-2 fill-emerald-500 text-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        {/* POS Fast Trigger */}
        <Link
          href="/billing"
          className="hidden md:flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <Zap className="h-3.5 w-3.5 text-amber-200 fill-amber-200" />
          <span>POS</span>
          <kbd className="rounded bg-emerald-700/80 px-1 py-0.2 text-[9px] font-mono">F8</kbd>
        </Link>

        {/* Notifications Button */}
        <button
          onClick={onOpenNotifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-colors"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-xs">
              {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
            </span>
          )}
        </button>

        {/* User Profile Dropdown Menu */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 rounded-xl p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            aria-expanded={isProfileMenuOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-indigo-500 text-xs font-bold text-white shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                {user?.name || "Admin User"}
              </p>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold leading-tight">
                {user?.role?.replace(/_/g, " ") || "SUPER ADMIN"}
              </p>
            </div>
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {user?.email}
                </p>
                <span className="mt-1 inline-block rounded bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                  {user?.role?.replace(/_/g, " ")}
                </span>
              </div>

              <div className="space-y-0.5">
                <Link
                  href="/profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-colors"
                >
                  <User className="h-4 w-4 text-zinc-400" />
                  <span>My Profile & Security</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-colors"
                >
                  <Settings className="h-4 w-4 text-zinc-400" />
                  <span>Business Settings</span>
                </Link>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800/80 mt-1 pt-1">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
