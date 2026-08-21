"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { PermissionModule } from "@/lib/types";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wrench,
  Boxes,
  Users,
  Receipt,
  ScanLine,
  Barcode,
  BarChart3,
  ShieldCheck,
  UserCog,
  KeyRound,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Zap,
  Building2,
  Shield,
  Layers,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  module: PermissionModule;
  highlight?: boolean;
  badge?: string | number;
  shortcut?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function Sidebar({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  // Fetch low stock count for inventory badge
  useEffect(() => {
    const fetchBadge = async () => {
      try {
        const res = await fetch("/api/v1/dashboard?period=today");
        const json = await res.json();
        if (json.success && json.data?.inventory?.lowStockCount) {
          setLowStockCount(json.data.inventory.lowStockCount);
        }
      } catch {
        // silent
      }
    };
    fetchBadge();
    const interval = setInterval(fetchBadge, 60000);
    return () => clearInterval(interval);
  }, []);

  const navGroups: NavGroup[] = [
    {
      title: "MAIN",
      items: [
        { href: "/", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
        { href: "/pos", label: "POS Billing", icon: ShoppingCart, module: "pos", highlight: true, shortcut: "F8" },
        { href: "/products", label: "Products", icon: Package, module: "products" },
        { href: "/services", label: "Services", icon: Wrench, module: "services" },
        {
          href: "/inventory",
          label: "Inventory / Stock",
          icon: Boxes,
          module: "inventory",
          badge: lowStockCount > 0 ? lowStockCount : undefined,
        },
        { href: "/customers", label: "Customers", icon: Users, module: "customers" },
        { href: "/invoices", label: "Invoices", icon: Receipt, module: "invoices" },
        { href: "/scanner", label: "Scanner", icon: ScanLine, module: "scanner" },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        { href: "/barcodes", label: "Labels & Codes", icon: Barcode, module: "barcodes" },
        { href: "/reports", label: "Reports & Analytics", icon: BarChart3, module: "reports" },
        { href: "/audit", label: "Audit Logs", icon: ShieldCheck, module: "audit" },
      ],
    },
    {
      title: "ADMINISTRATION",
      items: [
        { href: "/users", label: "Users Management", icon: UserCog, module: "users" },
        { href: "/roles", label: "Roles & Permissions", icon: KeyRound, module: "roles" },
      ],
    },
    {
      title: "CONFIGURATION",
      items: [
        { href: "/settings", label: "System Settings", icon: Settings, module: "settings" },
      ],
    },
  ];

  const renderNavGroup = (group: NavGroup) => {
    // Filter items based on user permissions
    const visibleItems = group.items.filter((item) => hasPermission(item.module, "view"));
    if (visibleItems.length === 0) return null;

    return (
      <div key={group.title} className="mb-5">
        {!isCollapsed && (
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {group.title}
          </p>
        )}
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold"
                    : item.highlight
                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                } ${isCollapsed ? "justify-center px-2" : ""}`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : item.highlight ? "text-emerald-600 dark:text-emerald-400" : ""
                  }`}
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut && (
                      <kbd className="hidden group-hover:inline-block rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-mono text-inherit">
                        {item.shortcut}
                      </kbd>
                    )}
                    {item.badge !== undefined && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          isActive
                            ? "bg-white text-indigo-700"
                            : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && item.badge !== undefined && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-950" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-200 select-none">
      {/* Brand Header */}
      <div>
        <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <Link
            href="/"
            className="flex items-center gap-2.5 overflow-hidden group"
            onClick={() => setIsMobileOpen(false)}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Barcode className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-tight text-zinc-900 dark:text-white text-sm">
                    SYSTEM 2.0
                  </span>
                  <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 ring-1 ring-indigo-500/20">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium truncate">
                  Enterprise POS & Admin
                </p>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation List */}
        <div className="p-3 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
          {navGroups.map(renderNavGroup)}
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/profile"
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                  {user?.name || "Admin User"}
                </p>
                <span className="inline-flex items-center rounded-sm bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.2 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {user?.role?.replace(/_/g, " ") || "SUPER ADMIN"}
                </span>
              </div>
            </Link>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/profile"
              title={user?.name}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-xs font-bold text-white"
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </Link>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block fixed top-0 left-0 bottom-0 z-40 transition-all duration-200 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex w-72 flex-col bg-white dark:bg-zinc-950 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
