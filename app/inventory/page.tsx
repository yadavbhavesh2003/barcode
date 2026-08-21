"use client";

import { useState, useEffect } from "react";
import {
  Boxes,
  ArrowDownUp,
  AlertTriangle,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  RefreshCw,
  X,
  History,
} from "lucide-react";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"stock" | "transactions">("stock");
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalUnits: 0, totalValuation: 0, lowStockCount: 0 });
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<string>("ADJUSTMENT_ADD");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    if (activeTab === "stock") {
      fetchStock();
    } else {
      fetchTransactions();
    }
  }, [activeTab, filterType]);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/v1/inventory?filter=${filterType}&query=${encodeURIComponent(searchQuery)}`
      );
      const json = await res.json();
      if (json.success) {
        setProducts(json.data.products || []);
        if (json.data.stats) setStats(json.data.stats);
      }
    } catch (e) {
      console.error("Inventory stock fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/inventory/transactions?limit=50`);
      const json = await res.json();
      if (json.success) {
        setTransactions(json.data || []);
      }
    } catch (e) {
      console.error("Transactions fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !adjustQty) return;
    try {
      setIsAdjusting(true);
      const res = await fetch("/api/v1/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct._id,
          type: adjustType,
          quantity: parseInt(adjustQty, 10),
          reason: adjustReason || "Manual stock adjustment",
          createdBy: "Inventory Manager",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAdjustModalOpen(false);
        setSelectedProduct(null);
        setAdjustQty("");
        setAdjustReason("");
        fetchStock();
      } else {
        alert(json.error?.message || "Adjustment failed");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsAdjusting(false);
    }
  };

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Inventory & Immutable Stock Ledger
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Audit-safe stock tracking, reorder level alerts, and transaction records for every sale and adjustment.
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setActiveTab("stock")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "stock"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <Boxes className="h-4 w-4" />
              Stock Overview
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "transactions"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <History className="h-4 w-4" />
              Ledger Transactions
            </button>
          </div>
        </div>

        {/* Top KPI Cards (Only on Stock tab) */}
        {activeTab === "stock" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
              <span className="text-xs font-semibold uppercase text-zinc-400">Total Units In Stock</span>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">
                {stats.totalUnits.toLocaleString()} units
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
              <span className="text-xs font-semibold uppercase text-zinc-400">Total Valuation</span>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                {formatCurrency(stats.totalValuation)}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
              <span className="text-xs font-semibold uppercase text-zinc-400">Low Stock Items</span>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
                {stats.lowStockCount} items
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: STOCK OVERVIEW */}
        {activeTab === "stock" && (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter stock by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchStock()}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-2 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {[
                  { id: "all", label: "All Items" },
                  { id: "low_stock", label: "Low Stock Only" },
                  { id: "out_of_stock", label: "Out of Stock" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      filterType === f.id
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <th className="py-3 px-4">Item Code</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">Min Level</th>
                    <th className="py-3 px-4 text-right">Unit Value</th>
                    <th className="py-3 px-4 text-right">Stock Valuation</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading stock...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-400">
                        No inventory matching current filters.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {p.itemNumber || p.barcodeNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-white">
                          {p.name}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-bold ${
                              p.currentStock <= p.minStock
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                            }`}
                          >
                            {p.currentStock} {p.unitOfMeasure || "PCS"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-zinc-400 font-mono">
                          {p.minStock}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {formatCurrency(p.sellingPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-white">
                          {formatCurrency(p.currentStock * p.sellingPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setIsAdjustModalOpen(true);
                            }}
                            className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSACTIONS LEDGER */}
        {activeTab === "transactions" && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4 text-center">Before</th>
                  <th className="py-3.5 px-4 text-center">Change</th>
                  <th className="py-3.5 px-4 text-center">After</th>
                  <th className="py-3.5 px-4">Reference / Reason</th>
                  <th className="py-3.5 px-4 text-right">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      Loading ledger transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      No stock transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-4 text-zinc-400">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-white">
                        {t.productName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-zinc-100 px-2 py-0.5 font-medium text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-zinc-400">{t.stockBefore}</td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className={
                            t.quantity > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-zinc-900 dark:text-white">
                        {t.stockAfter}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {t.reason || t.referenceId || "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-400">{t.createdBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Adjust Stock */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Adjust Stock: {selectedProduct.name}
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)}>
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <p className="text-zinc-500">Current Stock: <strong className="text-zinc-900 dark:text-white">{selectedProduct.currentStock} units</strong></p>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="ADJUSTMENT_ADD">Add Stock (+) - Received / Correct Count</option>
                  <option value="ADJUSTMENT_SUBTRACT">Deduct Stock (-) - Discrepancy / Shrinkage</option>
                  <option value="PURCHASE">Purchase Order Inflow (+)</option>
                  <option value="DAMAGE">Damaged / Expired (-)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Quantity (Units) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 10"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory count correction"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white hover:bg-indigo-500"
                >
                  {isAdjusting ? "Saving..." : "Record Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
