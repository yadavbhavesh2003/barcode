"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useToast } from "@/lib/context/ToastContext";
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  Package,
  ShoppingCart,
  Barcode,
  Boxes,
  IndianRupee,
  Users,
  Zap,
  Plus,
  RefreshCw,
  Server,
  ArrowRight,
  X,
  CreditCard,
  Smartphone,
  Banknote,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  BarChart3,
} from "lucide-react";

export default function DashboardPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "this_month" | "all_time">("today");
  const [trendRange, setTrendRange] = useState<"7d" | "14d" | "30d">("7d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);

  // Quick Restock Modal
  const [restockItem, setRestockItem] = useState<any>(null);
  const [restockQty, setRestockQty] = useState("50");
  const [isRestocking, setIsRestocking] = useState(false);

  // Quick Create Modal
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState({ name: "", mrp: "", sellingPrice: "", openingStock: "50", category: "General" });
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  useEffect(() => {
    fetchDashboardData(period, trendRange);
  }, [period, trendRange]);

  const fetchDashboardData = async (selectedPeriod: string, selectedTrend: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/dashboard?period=${selectedPeriod}&trend=${selectedTrend}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem || !restockQty) return;
    try {
      setIsRestocking(true);
      const res = await fetch("/api/v1/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: restockItem._id,
          type: "PURCHASE",
          quantity: parseInt(restockQty, 10),
          reason: "Quick 1-Click Dashboard Restock",
          createdBy: "Store Admin",
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Successfully restocked +${restockQty} units of '${restockItem.name}'!`, "Stock Refilled");
        setRestockItem(null);
        fetchDashboardData(period, trendRange);
      } else {
        toast.error(json.error?.message || "Restock failed");
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsRestocking(false);
    }
  };

  const handleQuickProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProduct.name || !quickProduct.sellingPrice) return;
    try {
      setIsCreatingProduct(true);
      const res = await fetch("/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickProduct.name,
          mrp: parseFloat(quickProduct.mrp) || parseFloat(quickProduct.sellingPrice),
          sellingPrice: parseFloat(quickProduct.sellingPrice),
          openingStock: parseInt(quickProduct.openingStock, 10) || 50,
          category: quickProduct.category,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Created product '${quickProduct.name}' with ${quickProduct.openingStock || 50} units stock!`, "Product Added");
        setIsQuickProductOpen(false);
        setQuickProduct({ name: "", mrp: "", sellingPrice: "", openingStock: "50", category: "General" });
        fetchDashboardData(period, trendRange);
      } else {
        toast.error(json.error?.message || "Failed to create product");
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatCompactCurrency = (amount: number = 0) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
    return `₹${amount}`;
  };

  // --- SVG Chart Calculations ---
  const trendData: Array<{ date: string; label: string; dayName: string; revenue: number; bills: number }> =
    data?.salesTrend || [];

  const rawMax = Math.max(...trendData.map((d) => d.revenue || 0), 1000);

  // Calculate nice round ceiling with ~20% headroom so peak points never touch the ceiling
  const getNiceCeiling = (val: number) => {
    const withHeadroom = val * 1.2;
    if (withHeadroom <= 5000) return Math.ceil(withHeadroom / 1000) * 1000;
    if (withHeadroom <= 20000) return Math.ceil(withHeadroom / 2500) * 2500;
    if (withHeadroom <= 50000) return Math.ceil(withHeadroom / 5000) * 5000;
    if (withHeadroom <= 100000) return Math.ceil(withHeadroom / 10000) * 10000;
    if (withHeadroom <= 500000) return Math.ceil(withHeadroom / 50000) * 50000;
    return Math.ceil(withHeadroom / 100000) * 100000;
  };
  const maxRevenue = getNiceCeiling(rawMax);

  const chartWidth = 700;
  const chartHeight = 220;
  const padLeft = 55;
  const padRight = 25;
  const padTop = 30;
  const padBottom = 38;

  const usableWidth = chartWidth - padLeft - padRight;
  const usableHeight = chartHeight - padTop - padBottom;
  const slotCount = Math.max(trendData.length, 1);
  const slotWidth = usableWidth / slotCount;
  const barWidth = Math.min(38, Math.max(12, slotWidth * 0.55));

  const chartBars = trendData.map((d, idx) => {
    const centerX = padLeft + idx * slotWidth + slotWidth / 2;
    const x = centerX - barWidth / 2;
    const rawHeight = ((d.revenue || 0) / maxRevenue) * usableHeight;
    const height = Math.max(d.revenue > 0 ? 5 : 2, rawHeight);
    const y = padTop + usableHeight - height;
    const isToday = d.label?.toLowerCase().includes("today") || idx === trendData.length - 1;
    return { ...d, x, y, width: barWidth, height, centerX, isToday };
  });

  const activeBar = activeHoverIndex !== null ? chartBars[activeHoverIndex] : null;

  // Payment Breakdown Percentages
  const totalRev = Number(data?.sales?.totalRevenue || 0);
  const cashRev = Number(data?.paymentBreakdown?.cash?.amount || data?.sales?.cashRevenue || 0);
  const upiRev = Number(data?.paymentBreakdown?.upi?.amount || data?.sales?.upiRevenue || 0);
  const cardRev = Number(data?.paymentBreakdown?.card?.amount || data?.sales?.cardRevenue || 0);

  const cashPct = totalRev > 0 ? Math.round((cashRev / totalRev) * 100) : 0;
  const upiPct = totalRev > 0 ? Math.round((upiRev / totalRev) * 100) : 0;
  const cardPct = totalRev > 0 ? Math.max(0, 100 - cashPct - upiPct) : 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Top Header & Period Filter Toolbar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Executive Sales & Inventory Dashboard
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE SYNC
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Live sales velocity, payment channel split, and real-time inventory synchronization.
            </p>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-200/80 bg-white p-1 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "Last 7 Days" },
              { id: "30d", label: "Last 30 Days" },
              { id: "this_month", label: "This Month" },
              { id: "all_time", label: "All Time" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  period === p.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Action Hub */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Link
            href="/billing"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
            <span>POS Billing</span>
          </Link>

          <Link
            href="/generator"
            className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs font-bold text-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <Barcode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Label Generator</span>
          </Link>

          <button
            onClick={() => setIsQuickProductOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs font-bold text-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Add Product</span>
          </button>

          <Link
            href="/inventory"
            className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs font-bold text-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <Boxes className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Inventory ({data?.inventory?.totalUnitsInStock || 0})</span>
          </Link>

          <Link
            href="/history"
            className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs font-bold text-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Sales & Bills</span>
          </Link>

          <Link
            href="/customers"
            className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs font-bold text-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Customers ({data?.customers?.totalCount || 0})</span>
          </Link>
        </div>

        {/* 5 High-Impact KPI Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Sales Revenue */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Sales Revenue
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-black text-zinc-900 dark:text-white">
                {loading ? "..." : formatCurrency(data?.sales?.totalRevenue)}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {data?.sales?.totalBills || 0} invoices ({data?.sales?.totalUnits || 0} items sold)
              </p>
            </div>
          </div>

          {/* Average Order Value (AOV) */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Avg Bill Value (AOV)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-black text-zinc-900 dark:text-white">
                {loading ? "..." : formatCurrency(data?.sales?.aov)}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                Discounts given: {formatCurrency(data?.sales?.totalDiscount)}
              </p>
            </div>
          </div>

          {/* Total Units in Stock */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Live Units in Stock
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-black text-zinc-900 dark:text-white">
                {loading ? "..." : `${(data?.inventory?.totalUnitsInStock || 0).toLocaleString()} Units`}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                Across {data?.inventory?.totalProducts || 0} active products
              </p>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Low Stock Alerts
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-black text-rose-600 dark:text-rose-400">
                {loading ? "..." : `${data?.inventory?.lowStockCount || 0} Alerts`}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {data?.inventory?.outOfStockCount || 0} items at 0 quantity
              </p>
            </div>
          </div>

          {/* Stock Valuation */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Inventory Valuation
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-black text-zinc-900 dark:text-white">
                {loading ? "..." : formatCurrency(data?.inventory?.totalValuation)}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                Estimated retail market value
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Interactive Sales Bar Chart & Payment Channels Breakdown */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Revenue Bar Chart (7 Cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Sales Velocity ({trendRange === "30d" ? "Last 30 Days" : trendRange === "14d" ? "Last 14 Days" : "Last 7 Days"})
                  </h2>
                  <p className="text-[10px] text-zinc-400">
                    Day-by-day revenue velocity & transaction volume
                  </p>
                </div>
              </div>

              {/* Range Toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-zinc-200/80 bg-zinc-50 p-0.5 text-[10px] font-bold dark:border-zinc-800 dark:bg-zinc-800/60">
                {(["7d", "14d", "30d"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTrendRange(r)}
                    className={`rounded-md px-2 py-1 transition-all ${
                      trendRange === r
                        ? "bg-white text-indigo-600 shadow-xs dark:bg-zinc-900 dark:text-indigo-300"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Bar Chart Canvas */}
            <div className="relative w-full">
              {/* Active Hover Popover Tooltip */}
              {activeBar && (() => {
                const isNearTop = activeBar.y < padTop + usableHeight * 0.35;
                const isNearRight = activeBar.centerX > chartWidth - 110;
                const isNearLeft = activeBar.centerX < padLeft + 60;
                const leftPct = (activeBar.centerX / chartWidth) * 100;
                const topPct = (activeBar.y / chartHeight) * 100;

                return (
                  <div
                    className={`absolute z-20 pointer-events-none rounded-xl bg-zinc-900/95 px-3 py-2 text-white shadow-xl backdrop-blur-sm border border-zinc-700/60 text-xs transition-all duration-150 ${
                      isNearRight
                        ? "-translate-x-[90%]"
                        : isNearLeft
                        ? "-translate-x-[10%]"
                        : "-translate-x-1/2"
                    } ${isNearTop ? "translate-y-3" : "-translate-y-[115%]"}`}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400">
                      <span>{activeBar.dayName}, {activeBar.label}</span>
                      {activeBar.isToday && (
                        <span className="rounded bg-indigo-500/30 px-1 py-0.2 text-[9px] font-bold text-indigo-300">
                          TODAY
                        </span>
                      )}
                    </div>
                    <p className="font-black text-emerald-400 text-sm mt-0.5">
                      {formatCurrency(activeBar.revenue)}
                    </p>
                    <p className="text-[10px] text-zinc-300">
                      {activeBar.bills} {activeBar.bills === 1 ? "invoice" : "invoices"}
                    </p>
                  </div>
                );
              })()}

              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-48 overflow-visible"
              >
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                  <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                  <linearGradient id="todayBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines & Values */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = padTop + usableHeight - pct * usableHeight;
                  const val = pct * maxRevenue;
                  return (
                    <g key={idx}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="currentColor"
                        strokeDasharray="3 3"
                        className="text-zinc-100 dark:text-zinc-800/80"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="text-[9px] font-mono fill-zinc-400"
                      >
                        {formatCompactCurrency(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Bar Columns */}
                {chartBars.map((bar, idx) => {
                  const isHovered = activeHoverIndex === idx;
                  const barFill = isHovered
                    ? "url(#barGradHover)"
                    : bar.isToday
                    ? "url(#todayBarGrad)"
                    : "url(#barGrad)";

                  return (
                    <g
                      key={idx}
                      onMouseEnter={() => setActiveHoverIndex(idx)}
                      onMouseLeave={() => setActiveHoverIndex(null)}
                      className="cursor-pointer transition-opacity"
                    >
                      {/* Background Column Slot Track */}
                      <rect
                        x={bar.x}
                        y={padTop}
                        width={bar.width}
                        height={usableHeight}
                        rx="6"
                        ry="6"
                        className={`transition-colors ${
                          isHovered
                            ? "fill-indigo-50/70 dark:fill-indigo-950/40"
                            : "fill-zinc-100/60 dark:fill-zinc-800/30"
                        }`}
                      />

                      {/* Revenue Bar Column */}
                      <rect
                        x={bar.x}
                        y={bar.y}
                        width={bar.width}
                        height={bar.height}
                        rx="5"
                        ry="5"
                        fill={barFill}
                        className={`transition-all duration-200 ${
                          isHovered ? "filter drop-shadow-[0_4px_8px_rgba(99,102,241,0.4)]" : ""
                        }`}
                      />

                      {/* Top Value Tag on Non-Zero High or Hovered Bars */}
                      {(isHovered || (bar.revenue > 0 && bar.height > 24)) && (
                        <text
                          x={bar.centerX}
                          y={bar.y - 6}
                          textAnchor="middle"
                          className={`text-[8.5px] font-mono font-bold ${
                            isHovered
                              ? "fill-indigo-600 dark:fill-indigo-400 text-[9.5px]"
                              : bar.isToday
                              ? "fill-purple-600 dark:fill-purple-400"
                              : "fill-zinc-500 dark:fill-zinc-400"
                          }`}
                        >
                          {formatCompactCurrency(bar.revenue)}
                        </text>
                      )}

                      {/* X-Axis Day/Date Tag */}
                      <text
                        x={bar.centerX}
                        y={chartHeight - 12}
                        textAnchor="middle"
                        className={`text-[9px] font-mono transition-all ${
                          isHovered
                            ? "fill-indigo-600 dark:fill-indigo-400 font-bold text-[10px]"
                            : bar.isToday
                            ? "fill-purple-600 dark:fill-purple-400 font-bold"
                            : "fill-zinc-400"
                        }`}
                      >
                        {bar.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Payment Breakdown (5 Cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Banknote className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Payment Breakdown ({period})
                  </h2>
                  <p className="text-[10px] text-zinc-400">Real-time revenue split across payment channels</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                Total: {formatCurrency(totalRev)}
              </span>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="space-y-2">
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 shadow-inner p-0.5 gap-0.5">
                {cashPct > 0 && (
                  <div
                    style={{ width: `${cashPct}%` }}
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    title={`Cash: ${cashPct}% (${formatCurrency(cashRev)})`}
                  />
                )}
                {upiPct > 0 && (
                  <div
                    style={{ width: `${upiPct}%` }}
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    title={`UPI / QR: ${upiPct}% (${formatCurrency(upiRev)})`}
                  />
                )}
                {cardPct > 0 && (
                  <div
                    style={{ width: `${cardPct}%` }}
                    className="h-full rounded-full bg-purple-500 transition-all duration-500"
                    title={`Card: ${cardPct}% (${formatCurrency(cardRev)})`}
                  />
                )}
              </div>
            </div>

            {/* Detailed Payment Channel Cards with Progress Bars */}
            <div className="space-y-2.5">
              {/* Cash Channel */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-950/60 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <Banknote className="h-4 w-4" />
                    <span>Cash</span>
                  </div>
                  <span className="font-mono text-xs font-black text-zinc-900 dark:text-white">
                    {formatCurrency(cashRev)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>{cashPct}% share</span>
                  <span>{data?.paymentBreakdown?.cash?.count || 0} transactions</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/60 dark:bg-emerald-950">
                  <div style={{ width: `${cashPct}%` }} className="h-full bg-emerald-500 rounded-full" />
                </div>
              </div>

              {/* UPI / QR Channel */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-950/60 dark:bg-indigo-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    <Smartphone className="h-4 w-4" />
                    <span>UPI / QR</span>
                  </div>
                  <span className="font-mono text-xs font-black text-zinc-900 dark:text-white">
                    {formatCurrency(upiRev)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>{upiPct}% share</span>
                  <span>{data?.paymentBreakdown?.upi?.count || 0} transactions</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-indigo-200/60 dark:bg-indigo-950">
                  <div style={{ width: `${upiPct}%` }} className="h-full bg-indigo-500 rounded-full" />
                </div>
              </div>

              {/* Card Channel */}
              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-3 dark:border-purple-950/60 dark:bg-purple-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                    <CreditCard className="h-4 w-4" />
                    <span>Card</span>
                  </div>
                  <span className="font-mono text-xs font-black text-zinc-900 dark:text-white">
                    {formatCurrency(cardRev)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>{cardPct}% share</span>
                  <span>{data?.paymentBreakdown?.card?.count || 0} transactions</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-purple-200/60 dark:bg-purple-950">
                  <div style={{ width: `${cardPct}%` }} className="h-full bg-purple-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Low Stock Watchlist & Top Selling Products */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Low Stock Watchlist (7 cols) with 1-Click Restock */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Stock Attention Watchlist
                  </h2>
                  <p className="text-[10px] text-zinc-400">
                    Products with stock &le; 5 units — restock with 1-click
                  </p>
                </div>
              </div>

              <Link
                href="/inventory"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Inventory view <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="py-8 text-center text-xs text-zinc-400">Loading watchlist...</div>
              ) : !data?.lowStockItems || data.lowStockItems.length === 0 ? (
                <div className="py-8 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ All products are healthy and above minimum stock limits!
                </div>
              ) : (
                data.lowStockItems.map((item: any) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-800/40 text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-bold text-zinc-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <p className="font-mono text-[10px] text-zinc-400">
                        Code: {item.itemNumber || item.barcodeNumber || item.customBarcode || "ITEM"} • Price: {formatCurrency(item.salesPrice || item.sellingPrice || item.mrp)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                        item.currentStock <= 0
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        {item.currentStock || 0} Units Left
                      </span>
                      <button
                        onClick={() => {
                          setRestockItem(item);
                          setRestockQty("50");
                        }}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-500 shadow-xs active:scale-95 transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        Restock
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Selling Products (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Top Sellers ({period})
                  </h2>
                  <p className="text-[10px] text-zinc-400">Most billed items</p>
                </div>
              </div>
              <Link
                href="/history"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                All sales
              </Link>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="py-8 text-center text-xs text-zinc-400">Loading top sellers...</div>
              ) : !data?.topProducts || data.topProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No sales recorded in this period.
                </div>
              ) : (
                data.topProducts.map((p: any, rank: number) => (
                  <div
                    key={p._id || rank}
                    className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/40 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {rank + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-900 dark:text-white truncate">
                          {p.productName}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-mono">{p.barcodeNumber || "N/A"}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-black text-zinc-900 dark:text-white">
                        {formatCurrency(p.revenue)}
                      </p>
                      <p className="text-[10px] text-zinc-500">{p.totalSold} units</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Live POS Transaction Stream */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-3.5">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xs font-bold text-zinc-900 dark:text-white">
                Live POS Transaction Stream
              </h2>
            </div>
            <Link
              href="/history"
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              View Full History
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 font-semibold uppercase text-zinc-400 dark:border-zinc-800">
                  <th className="py-2.5 px-3">Invoice</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-400">
                      Loading transactions...
                    </td>
                  </tr>
                ) : !data?.recentInvoices || data.recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-zinc-400">
                      No invoices generated yet.
                    </td>
                  </tr>
                ) : (
                  data.recentInvoices.map((inv: any) => (
                    <tr key={inv._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-3 font-semibold text-zinc-800 dark:text-zinc-200">
                        {inv.customer?.name || "Walk-in"}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-500">
                        {inv.customer?.mobile || "N/A"}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${
                          inv.paymentMethod?.toLowerCase().includes("upi")
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                            : inv.paymentMethod?.toLowerCase().includes("card")
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}>
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-zinc-900 dark:text-white">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Link
                          href={`/api/bills/${inv.invoiceNumber}/pdf`}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-bold text-zinc-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          <Eye className="h-3 w-3" /> PDF
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: 1-Click Restock Modal from Dashboard        */}
      {/* ==================================================== */}
      {restockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Quick Restock</h3>
                <p className="text-[10px] text-zinc-400 truncate max-w-xs">{restockItem.name}</p>
              </div>
              <button onClick={() => setRestockItem(null)}>
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleQuickRestockSubmit} className="space-y-3 text-xs">
              <div>
                <p className="text-zinc-500">Current Stock: <strong className="text-rose-600">{restockItem.currentStock || 0} units</strong> (Min: {restockItem.minStock || 5})</p>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Units to Inflow (+)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-extrabold outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="rounded-xl border border-zinc-200 px-3 py-1.5 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRestocking}
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                >
                  {isRestocking ? "Updating..." : "Add Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: Quick Product Create Modal                  */}
      {/* ==================================================== */}
      {isQuickProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Quick Add Product</h3>
              <button onClick={() => setIsQuickProductOpen(false)}>
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleQuickProductSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kids Toy Car X100"
                  value={quickProduct.name}
                  onChange={(e) => setQuickProduct({ ...quickProduct, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="999"
                    value={quickProduct.sellingPrice}
                    onChange={(e) => setQuickProduct({ ...quickProduct, sellingPrice: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Opening Units
                  </label>
                  <input
                    type="number"
                    value={quickProduct.openingStock}
                    onChange={(e) => setQuickProduct({ ...quickProduct, openingStock: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickProductOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                >
                  {isCreatingProduct ? "Saving..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
