"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Barcode,
  ScanLine,
  ShoppingCart,
  Receipt,
  Boxes,
  Users,
  BarChart3,
  ShieldCheck,
  Settings,
  Sparkles,
  Zap,
  Wrench,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pos", label: "POS Billing", icon: ShoppingCart, highlight: true },
    { href: "/products", label: "Products", icon: Package },
    { href: "/services", label: "Services", icon: Wrench },
    { href: "/barcodes", label: "Labels & Codes", icon: Barcode },
    { href: "/scanner", label: "Scanner", icon: ScanLine },
    { href: "/invoices", label: "Invoices", icon: Receipt },
    { href: "/inventory", label: "Stock", icon: Boxes },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/audit", label: "Audit", icon: ShieldCheck },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/85 transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 group-hover:shadow-indigo-500/40 transition-all duration-200">
              <Barcode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-zinc-900 dark:text-white text-base">
                  SYSTEM 2.0
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                Enterprise POS & Barcode Platform
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Items (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-600 shadow-xs dark:bg-indigo-950/70 dark:text-indigo-300 ring-1 ring-indigo-500/20"
                    : item.highlight
                    ? "text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 ring-1 ring-emerald-500/20"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-indigo-600 dark:text-indigo-300" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Status / Action */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link
            href="/pos"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all"
          >
            <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
            <span>POS Billing</span>
            <kbd className="hidden xl:inline-block rounded bg-indigo-700/80 px-1 py-0.5 text-[9px] font-mono">F8</kbd>
          </Link>

          {time && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-mono text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              {time}
            </div>
          )}
        </div>

        {/* Mobile Nav Scrollbar */}
        <div className="flex xl:hidden items-center gap-1.5 overflow-x-auto py-1 max-w-[240px] sm:max-w-xs no-scrollbar">
          {navItems.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`p-2 rounded-lg text-xs shrink-0 ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
                title={item.label}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
