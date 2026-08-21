"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";
import {
  TrendingUp,
  Receipt,
  AlertTriangle,
  Package,
  ShoppingCart,
  PlusCircle,
  Upload,
  Barcode,
  ScanLine,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Boxes,
  IndianRupee,
  Wrench,
  Users,
  ShieldCheck,
  Zap,
  Activity,
  Plus,
  RefreshCw,
  Server,
  ArrowRight,
  X,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "this_month" | "all_time">("today");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quick Restock Modal from Dashboard
  const [restockItem, setRestockItem] = useState<any>(null);
  const [restockQty, setRestockQty] = useState("50");
  const [isRestocking, setIsRestocking] = useState(false);

  // Quick Create Modals
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState({ name: "", mrp: "", sellingPrice: "", openingStock: "50", category: "General" });
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  useEffect(() => {
    fetchDashboardData(period);
  }, [period]);

  const fetchDashboardData = async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/dashboard?period=${selectedPeriod}`);
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
          createdBy: user?.name || "Store Manager",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRestockItem(null);
        fetchDashboardData(period);
      } else {
        alert(json.error?.message || "Restock failed");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
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
        setIsQuickProductOpen(false);
        setQuickProduct({ name: "", mrp: "", sellingPrice: "", openingStock: "50", category: "General" });
        fetchDashboardData(period);
      } else {
        alert(json.error?.message || "Failed to create product");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Top Header & Period Filter Toolbar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Operations Command Center
              </h1>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                PRO MAX
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Real-time enterprise metrics for products, services, inventory, POS billing, and system compliance.
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
            href="/pos"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 p-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition-all"
          >
            <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
            <span>POS Billing</span>
          </Link>

          <button
            onClick={() => setIsQuickProductOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs font-bold text-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Add Product</span>
          </button>

          <Link
            href="/services"
            className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs font-bold text-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <Wrench className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Add Service</span>
          </Link>

          <Link
            href="/barcodes"
            className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs font-bold text-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <Barcode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Print Labels</span>
          </Link>

          <Link
            href="/scanner"
            className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs font-bold text-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <ScanLine className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Scan Terminal</span>
          </Link>

          <Link
            href="/customers"
            className="flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-3 text-xs font-bold text-zinc-800 hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 active:scale-95 transition-all"
          >
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Customers ({data?.customers?.totalCount || 0})</span>
          </Link>
        </div>

        {/* 5 High-Impact KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Revenue */}
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
              <div className="text-xl font-extrabold text-zinc-900 dark:text-white">
                {loading ? "..." : formatCurrency(data?.sales?.totalRevenue)}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {data?.sales?.totalBills || 0} invoices ({data?.sales?.totalUnits || 0} units)
              </p>
            </div>
          </div>

          {/* Average Order Value (AOV) */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Avg Ticket (AOV)
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-extrabold text-zinc-900 dark:text-white">
                {loading ? "..." : formatCurrency(data?.sales?.aov)}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                Tax collected: {formatCurrency(data?.sales?.totalTax)}
              </p>
            </div>
          </div>

          {/* Pending Receivables */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Pending Balances
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-extrabold text-zinc-900 dark:text-white">
                {loading ? "..." : formatCurrency(data?.sales?.pendingAmount)}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {data?.sales?.pendingCount || 0} unpaid balances
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
              <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                {loading ? "..." : data?.inventory?.lowStockCount || 0}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {data?.inventory?.outOfStockCount || 0} items completely out
              </p>
            </div>
          </div>

          {/* Inventory Valuation */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Inventory Valuation
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl font-extrabold text-zinc-900 dark:text-white">
                {loading ? "..." : formatCurrency(data?.inventory?.totalValuation)}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {data?.inventory?.totalProducts || 0} active products
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Low Stock Actionable Watchlist & Top Selling Products */}
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
                    Products at or below minimum threshold — restock with 1-click
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
                        Code: {item.itemNumber || item.barcodeNumber} • Min: {item.minStock}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                        {item.currentStock} Units Left
                      </span>
                      <button
                        onClick={() => {
                          setRestockItem(item);
                          setRestockQty("50");
                        }}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-500 shadow-xs active:scale-95"
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
                <h2 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Top Sellers ({period})
                </h2>
              </div>
              <Link
                href="/reports"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Full report
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
                        <p className="text-[10px] text-zinc-400 font-mono">{p.barcodeNumber}</p>
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

        {/* Section 2: Recent Live Invoices & Real-time Audit Trail */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Recent Invoices (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Live POS Transaction Stream
                </h2>
              </div>
              <Link
                href="/invoices"
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                All invoices
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 font-semibold uppercase text-zinc-400 dark:border-zinc-800">
                    <th className="py-2.5 px-2">Invoice</th>
                    <th className="py-2.5 px-2">Customer</th>
                    <th className="py-2.5 px-2">Method</th>
                    <th className="py-2.5 px-2 text-right">Amount</th>
                    <th className="py-2.5 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-400">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : !data?.recentInvoices || data.recentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-zinc-400">
                        No invoices generated yet.
                      </td>
                    </tr>
                  ) : (
                    data.recentInvoices.map((inv: any) => (
                      <tr key={inv._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                        <td className="py-2.5 px-2 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-2 text-zinc-800 dark:text-zinc-200">
                          {inv.customer?.name || "Walk-in"}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {inv.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-zinc-900 dark:text-white">
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                              inv.paymentStatus === "PAID"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                            }`}
                          >
                            {inv.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time Audit & Operational Health (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Audit Feed */}
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Compliance & Activity Trail
                  </h2>
                </div>
                <Link
                  href="/audit"
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Logs
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                {loading ? (
                  <div className="py-4 text-center text-zinc-400">Loading audit feed...</div>
                ) : !data?.recentAudits || data.recentAudits.length === 0 ? (
                  <div className="py-4 text-center text-zinc-400">No activity logged yet.</div>
                ) : (
                  data.recentAudits.map((a: any) => (
                    <div
                      key={a._id}
                      className="flex items-center justify-between py-1 border-b border-zinc-100/60 dark:border-zinc-800/60 last:border-0"
                    >
                      <div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{a.userName}</span>
                        <span className="text-[10px] text-zinc-400 ml-1.5 font-mono">
                          [{a.action}]
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Operational Health Monitor Card */}
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-900 p-4 shadow-xs text-white space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Server className="h-4 w-4" />
                  <span>System Engine Status</span>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-zinc-800 font-mono text-zinc-300">
                <div>
                  <span className="text-zinc-500 block">Database:</span>
                  <span className="text-emerald-400 font-bold">MongoDB Cluster Online</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Allocated Barcodes:</span>
                  <span className="text-white font-bold">{data?.operationalHealth?.lastAllocatedBarcode || 100000}</span>
                </div>
              </div>
            </div>
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
                <p className="text-zinc-500">Current Stock: <strong className="text-rose-600">{restockItem.currentStock} units</strong> (Min: {restockItem.minStock})</p>
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
                  placeholder="e.g. Wireless Mouse X100"
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
                    className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
