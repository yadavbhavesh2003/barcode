"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ScanLine,
  Camera,
  Search,
  ShoppingCart,
  Printer,
  CheckCircle2,
  AlertCircle,
  Package,
  Plus,
  RefreshCw,
} from "lucide-react";

export default function ScannerPage() {
  const [scannedCode, setScannedCode] = useState("");
  const [productResult, setProductResult] = useState<any>(null);
  const [notFoundInfo, setNotFoundInfo] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleLookup = async (code: string) => {
    if (!code.trim()) return;
    try {
      setIsSearching(true);
      setProductResult(null);
      setNotFoundInfo(null);

      const res = await fetch(`/api/v1/scanner/lookup?code=${encodeURIComponent(code.trim())}`);
      const json = await res.json();

      if (json.success && json.data) {
        setProductResult(json.data);
        setRecentScans((prev) => [
          { code: code.trim(), product: json.data, timestamp: new Date() },
          ...prev.slice(0, 8),
        ]);
      } else {
        setNotFoundInfo({
          code: code.trim(),
          details: json.error?.details,
        });
      }
    } catch (e) {
      console.error("Scanner lookup error:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center max-w-lg mx-auto">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-3 shadow-xs">
            <ScanLine className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            High-Speed Barcode Terminal
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Supports hardware USB/Bluetooth barcode guns, handheld scanners, and instant indexed product queries.
          </p>
        </div>

        {/* Big Search & Scan Input Box */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-md dark:border-zinc-800/80 dark:bg-zinc-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup(scannedCode);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <input
                ref={inputRef}
                type="text"
                value={scannedCode}
                onChange={(e) => setScannedCode(e.target.value)}
                placeholder="Scan or enter barcode / SKU number..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-12 pr-4 py-3 text-sm font-mono font-semibold outline-none focus:border-indigo-600 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !scannedCode}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 transition-all"
            >
              {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Lookup Product
            </button>
          </form>
        </div>

        {/* Found Product Result Card */}
        {productResult && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-md dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> REGISTERED PRODUCT
                </span>
                <h2 className="mt-2 text-lg font-bold text-zinc-900 dark:text-white">
                  {productResult.name}
                </h2>
                <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  Barcode: {productResult.barcodeNumber} • Item No: {productResult.itemNumber} • HSN: {productResult.hsnSac}
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                  {formatCurrency(productResult.sellingPrice)}
                </p>
                {productResult.mrp > productResult.sellingPrice && (
                  <p className="text-xs text-zinc-400 line-through">
                    MRP: {formatCurrency(productResult.mrp)}
                  </p>
                )}
                <span className="inline-block mt-1 rounded-md bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  GST {productResult.gstRate}%
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/40">
              <Link
                href="/pos"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-xs"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Add to POS Bill
              </Link>
              <Link
                href="/barcodes"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <Printer className="h-3.5 w-3.5 text-indigo-500" />
                Print Sticker
              </Link>
              <Link
                href="/inventory"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <Package className="h-3.5 w-3.5" />
                Stock: {productResult.currentStock} Units
              </Link>
            </div>
          </div>
        )}

        {/* Unknown Barcode Card */}
        {notFoundInfo && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-md dark:border-amber-900/50 dark:bg-amber-950/20 space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-6 w-6" />
              <div>
                <h3 className="text-base font-bold">Barcode Not Found</h3>
                <p className="font-mono text-xs">Code: {notFoundInfo.code}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              This barcode is not assigned to any item in your catalog. Choose an action:
            </p>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/products"
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Product
              </Link>
              <Link
                href="/barcodes"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Assign to Existing Product
              </Link>
            </div>
          </div>
        )}

        {/* Recent Scans Session Log */}
        {recentScans.length > 0 && (
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Recent Scans In This Session
            </h3>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {recentScans.map((scan, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-zinc-900 dark:text-white truncate">
                      {scan.product.name}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-400">{scan.code}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {formatCurrency(scan.product.sellingPrice)}
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      {scan.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
