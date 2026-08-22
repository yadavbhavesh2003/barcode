"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/lib/context/ToastContext";
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
  Loader2,
} from "lucide-react";

export default function InventoryPage() {
  const { toast } = useToast();
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

  // Live debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStock(searchQuery, filterType);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, filterType]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchStock = async (query: string = searchQuery, filter: string = filterType) => {
    try {
      setLoading(true);
      const url = new URL("/api/v1/inventory", window.location.origin);
      if (filter !== "all") url.searchParams.set("filter", filter);
      if (query.trim()) url.searchParams.set("query", query.trim());

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setProducts(json.data?.products || (Array.isArray(json.data) ? json.data : []));
        if (json.data?.stats) setStats(json.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/v1/inventory/transactions?limit=50");
      const json = await res.json();
      if (json.success) {
        setTransactions(Array.isArray(json.data) ? json.data : json.data?.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setTransactions([]);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStock();
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
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
        toast.success(`Stock adjusted for '${selectedProduct.name}'!`, "Stock Updated");
        setIsAdjustModalOpen(false);
        setSelectedProduct(null);
        setAdjustQty("");
        setAdjustReason("");
        fetchStock();
        fetchTransactions();
      } else {
        toast.error(json.error?.message || "Adjustment failed");
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
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
              <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Live search stock by name, code, SKU, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-9 py-2 text-xs outline-none focus:border-indigo-600 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 transition-colors"
                      title="Clear Search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {loading && (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600 shrink-0" />
                )}
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
                    <th className="py-3 px-4 text-right">MRP</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Stock Valuation</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading stock...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-400">
                        No inventory matching current filters.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const mrp = Number(p.mrp || 0);
                      const unitPrice = Number(p.salesPrice || p.sellingPrice || mrp || 0);
                      const currentStock = Number(p.currentStock || 0);
                      return (
                        <tr key={p._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {p.itemNumber || p.barcodeNumber || p.customBarcode || "ITEM"}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-white">
                            {p.name}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-bold ${
                                currentStock <= 0
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                                  : currentStock === 1
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 ring-1 ring-amber-500/30"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                              }`}
                            >
                              {currentStock <= 0
                                ? "0 (Out of Stock)"
                                : `${currentStock} ${p.unitOfMeasure || p.netQuantity || "Units"}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-zinc-400 font-mono">
                            1 Unit
                          </td>
                          <td className="py-3.5 px-4 text-right text-zinc-400 font-mono">
                            {mrp > 0 ? formatCurrency(mrp) : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-white font-mono">
                            {formatCurrency(currentStock * unitPrice)}
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
                      );
                    })
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
                ) : (transactions || []).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      No stock transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  (transactions || []).map((t) => (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Stock Reconciliation & Refill
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Code: {selectedProduct.itemNumber || selectedProduct.barcodeNumber} &bull; {selectedProduct.hsnSac || "HSN: 9503"}
                </p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Product Summary Card */}
            <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/70 p-3 dark:border-zinc-800/80 dark:bg-zinc-800/40 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  {selectedProduct.name}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  MRP: <strong className="text-zinc-700 dark:text-zinc-300 font-mono">{formatCurrency(selectedProduct.mrp)}</strong> &bull; Selling Price: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(selectedProduct.sellingPrice || selectedProduct.salesPrice)}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">In Stock</span>
                <span className="inline-flex rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-mono">
                  {selectedProduct.currentStock} {selectedProduct.unitOfMeasure || "PCS"}
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4 text-xs">
              {/* Adjustment Type */}
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Adjustment Type *
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-medium"
                >
                  <option value="PURCHASE">➕ Stock Inflow / Supplier Refill (+)</option>
                  <option value="ADJUSTMENT_ADD">➕ Manual Stock Addition / Count Correction (+)</option>
                  <option value="ADJUSTMENT_SUBTRACT">➖ Deduct Stock / Audit Shrinkage (-)</option>
                  <option value="DAMAGE">❌ Damaged / Expired / Return (-)</option>
                </select>
              </div>

              {/* Quantity Input + Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Quantity (Units) *
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    {["ADJUSTMENT_SUBTRACT", "DAMAGE"].includes(adjustType)
                      ? `Max deductable: ${selectedProduct.currentStock} units`
                      : "Enter units to add"}
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={["ADJUSTMENT_SUBTRACT", "DAMAGE"].includes(adjustType) ? selectedProduct.currentStock : undefined}
                  required
                  placeholder="e.g. 10"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-mono font-bold outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />

                {/* Quick Addition Chips */}
                {!["ADJUSTMENT_SUBTRACT", "DAMAGE"].includes(adjustType) && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-zinc-400 font-medium">Quick Presets:</span>
                    {[5, 10, 25, 50, 100].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setAdjustQty(String(qty))}
                        className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition-colors"
                      >
                        +{qty}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Real-time Calculation & Projection Pill */}
              {Number(adjustQty) > 0 && (
                (() => {
                  const isMinus = ["ADJUSTMENT_SUBTRACT", "DAMAGE"].includes(adjustType);
                  const delta = isMinus ? -Math.abs(Number(adjustQty)) : Math.abs(Number(adjustQty));
                  const projectedStock = selectedProduct.currentStock + delta;
                  const isNegative = projectedStock < 0;
                  const unitPrice = Number(selectedProduct.sellingPrice || selectedProduct.salesPrice || selectedProduct.mrp || 0);

                  return (
                    <div
                      className={`rounded-xl border p-3 text-xs transition-colors ${
                        isNegative
                          ? "border-rose-300 bg-rose-50/80 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                          : "border-indigo-100 bg-indigo-50/60 dark:border-indigo-950/60 dark:bg-indigo-950/30"
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-zinc-500 dark:text-zinc-400">Projected Stock After:</span>
                        <strong
                          className={`font-mono text-sm ${
                            isNegative
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-indigo-700 dark:text-indigo-300"
                          }`}
                        >
                          {selectedProduct.currentStock} {isMinus ? "-" : "+"} {Math.abs(Number(adjustQty))} = {projectedStock} units
                        </strong>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/50 pt-1.5 dark:border-zinc-800">
                        <span>Valuation Impact:</span>
                        <strong className="font-mono text-zinc-900 dark:text-white">
                          {delta > 0 ? `+${formatCurrency(delta * unitPrice)}` : `-${formatCurrency(Math.abs(delta) * unitPrice)}`}
                        </strong>
                      </div>

                      {isNegative && (
                        <p className="mt-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          ⚠️ Insufficient stock. Maximum deduction allowed is {selectedProduct.currentStock} units.
                        </p>
                      )}
                    </div>
                  );
                })()
              )}

              {/* Reason for Adjustment */}
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Reference Note / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physical inventory count correction or supplier invoice #PO-104"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isAdjusting ||
                    !adjustQty ||
                    Number(adjustQty) <= 0 ||
                    (["ADJUSTMENT_SUBTRACT", "DAMAGE"].includes(adjustType) &&
                      Number(adjustQty) > selectedProduct.currentStock)
                  }
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 font-bold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
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
