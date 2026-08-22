"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import bwipjs from "bwip-js";
import {
  Search,
  Printer,
  AlertCircle,
  Loader2,
  Barcode as BarcodeIcon,
  Copy,
  Check,
  Calendar,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BarcodeRecord {
  barcodeId: string;
  productId?: string;
  barcode: string;
  status: string;
  createdAt: string | Date;
  productName: string;
  hsn?: string;
  mrp: number;
  salesPrice: number;
  netQuantity: string;
  gstAmount?: number;
  gstRate?: string;
  amount?: number;
  batchId?: string;
  batchNumber?: string;
  fileName?: string;
}

export function BarcodeSearch() {
  const [queryCode, setQueryCode] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BarcodeRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<BarcodeRecord | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isReprinting, setIsReprinting] = useState(false);
  const [reprintQuantity, setReprintQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedBarcode, setCopiedBarcode] = useState(false);
  const [reprintSuccessMsg, setReprintSuccessMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Initial load of recent distinct barcodes
  const loadRecentOrSearch = useCallback(async (searchQuery: string = "") => {
    setIsSearching(true);
    setErrorMsg(null);
    setReprintSuccessMsg(null);

    try {
      const url = searchQuery.trim()
        ? `/api/barcodes/search?query=${encodeURIComponent(searchQuery.trim())}`
        : `/api/barcodes/search`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (searchQuery.trim()) {
          throw new Error(data.error || `No records found matching '${searchQuery}'.`);
        } else {
          setSearchResults([]);
          setSelectedRecord(null);
          return;
        }
      }

      const records: BarcodeRecord[] = data.records || (data.record ? [data.record] : []);
      setSearchResults(records);
      setActiveQuery(searchQuery.trim());

      if (records.length > 0) {
        setSelectedRecord(records[0]);
      } else {
        setSelectedRecord(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to search records.";
      setErrorMsg(message);
      setSearchResults([]);
      setSelectedRecord(null);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    loadRecentOrSearch("");
  }, [loadRecentOrSearch]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    loadRecentOrSearch(queryCode);
  };

  const handleClear = () => {
    setQueryCode("");
    loadRecentOrSearch("");
    searchInputRef.current?.focus();
  };

  // Render barcode on canvas when selectedRecord changes
  useEffect(() => {
    if (selectedRecord && selectedRecord.barcode && selectedRecord.barcode !== "N/A" && canvasRef.current) {
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: "code128",
          text: selectedRecord.barcode,
          scale: 3,
          height: 10,
          includetext: false,
          backgroundcolor: "FFFFFF",
        });
      } catch (err) {
        console.error("Barcode canvas render error:", err);
      }
    }
  }, [selectedRecord]);

  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(true);
    setTimeout(() => setCopiedBarcode(false), 2000);
  };

  const handleReprint = async (recordToPrint?: BarcodeRecord, quantity: number = reprintQuantity) => {
    const target = recordToPrint || selectedRecord;
    if (!target || !target.barcode || target.barcode === "N/A") {
      alert("No valid barcode found to reprint.");
      return;
    }

    setIsReprinting(true);
    setReprintSuccessMsg(null);

    try {
      const res = await fetch(`/api/barcodes/${encodeURIComponent(target.barcode)}/reprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Reprint generation failed.");
      }

      // Trigger automatic download
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${data.pdfBase64}`;
      link.download = `label_${target.barcode}_qty${quantity}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setReprintSuccessMsg(`Reprint PDF downloaded (${quantity} label${quantity > 1 ? "s" : ""})!`);
      setTimeout(() => setReprintSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to download reprint label.";
      alert(message);
    } finally {
      setIsReprinting(false);
    }
  };

  const renderDetailCard = (record: BarcodeRecord) => (
    <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header with Barcode Badge */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <div>
          <span className="text-xs font-medium text-zinc-400">Selected Barcode</span>
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-2xl font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400">
              {record.barcode}
            </h3>
            <button
              onClick={() => handleCopyBarcode(record.barcode)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
              title="Copy Barcode"
            >
              {copiedBarcode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
          {record.status.toUpperCase()}
        </span>
      </div>

      {/* Barcode Visual Display Canvas */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-5 dark:border-zinc-700 dark:bg-zinc-950">
        <canvas ref={canvasRef} className="max-h-[55px] max-w-[95%]" />
        <span className="mt-2 font-mono text-sm font-bold tracking-widest text-zinc-900 dark:text-white">
          {record.barcode}
        </span>
        <span className="mt-1 text-[11px] text-zinc-400 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Latest: {new Date(record.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Product Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800">
          <span className="text-[11px] font-semibold uppercase text-zinc-400">Product Name</span>
          <p className="text-sm font-bold uppercase text-zinc-900 dark:text-white mt-0.5">
            {record.productName}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
          <span className="text-[11px] font-medium text-zinc-400">Sales Price</span>
          <p className="text-lg font-bold font-mono text-zinc-900 dark:text-white mt-0.5">
            {formatCurrency(record.salesPrice)}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
          <span className="text-[11px] font-medium text-zinc-400">Maximum Retail Price (MRP)</span>
          <p className="text-lg font-mono text-zinc-700 dark:text-zinc-300 mt-0.5">
            {formatCurrency(record.mrp)}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
          <span className="text-[11px] font-medium text-zinc-400">HSN / SAC</span>
          <p className="text-xs font-semibold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">
            {record.hsn || "9503"}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
          <span className="text-[11px] font-medium text-zinc-400">Net Quantity</span>
          <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
            {record.netQuantity || "1U"}
          </p>
        </div>

        {/* GST Details if available */}
        {(record.gstRate || record.gstAmount !== undefined || record.amount !== undefined) && (
          <div className="sm:col-span-2 grid grid-cols-3 gap-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 p-3 border border-indigo-100 dark:border-indigo-900/50">
            <div>
              <span className="text-[10px] text-zinc-400">GST Rate</span>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {record.gstRate || "-"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400">GST Amount</span>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {record.gstAmount !== undefined ? `₹${record.gstAmount}` : "-"}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400">Total Amount</span>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {record.amount !== undefined ? `₹${record.amount}` : "-"}
              </p>
            </div>
          </div>
        )}

        {/* Batch Reference */}
        <div className="sm:col-span-2 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
          <span className="text-[11px] font-medium text-zinc-400">Batch Reference</span>
          <p className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
            {record.batchNumber || "Direct Entry"} {record.fileName && record.fileName !== "N/A" ? `(${record.fileName})` : ""}
          </p>
        </div>
      </div>

      {/* Reprint Controls Bar */}
      <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Quantity:</span>
          <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => setReprintQuantity(Math.max(1, reprintQuantity - 1))}
              className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 flex items-center justify-center transition-colors"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="200"
              value={reprintQuantity}
              onChange={(e) => setReprintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 text-center text-xs font-bold font-mono bg-transparent text-zinc-900 dark:text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setReprintQuantity(reprintQuantity + 1)}
              className="h-7 w-7 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-100 flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>

          <div className="flex gap-1">
            {[1, 2, 5, 10].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => setReprintQuantity(qty)}
                className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
                  reprintQuantity === qty
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                {qty}x
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => handleReprint(record, reprintQuantity)}
          disabled={isReprinting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all"
        >
          {isReprinting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          Reprint {reprintQuantity} Label{reprintQuantity > 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Search Input Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <BarcodeIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Barcode & Product Search
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Search by 8-digit barcode, custom SKU code, or product name to inspect & reprint labels.
              </p>
            </div>
          </div>
          {activeQuery && (
            <button
              onClick={handleClear}
              className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              Reset to Recent
            </button>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by Barcode, SKU, or Product Name (e.g. Spidey Guitar, 14378017)..."
              value={queryCode}
              onChange={(e) => setQueryCode(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-10 text-sm text-zinc-900 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:bg-zinc-900 transition-all"
            />
            {queryCode && (
              <button
                type="button"
                onClick={() => setQueryCode("")}
                className="absolute right-3 top-3.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </form>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {reprintSuccessMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Check className="h-4 w-4 shrink-0" />
            <span>{reprintSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {searchResults.length === 1 && selectedRecord && (
        // Clean single result view (exact barcode or single match)
        <div className="max-w-2xl mx-auto w-full">
          {renderDetailCard(selectedRecord)}
        </div>
      )}

      {searchResults.length > 1 && selectedRecord && (
        // Multiple distinct results view (e.g. name search matching multiple products or recent list)
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Results List Panel (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {activeQuery ? `Results for "${activeQuery}"` : "Recent Barcodes"} ({searchResults.length})
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
              {searchResults.map((rec, idx) => {
                const isSelected =
                  selectedRecord?.barcodeId === rec.barcodeId ||
                  (selectedRecord?.barcode === rec.barcode && selectedRecord?.productName === rec.productName);

                return (
                  <div
                    key={`${rec.barcodeId || rec.barcode}-${idx}`}
                    onClick={() => setSelectedRecord(rec)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all text-left flex flex-col gap-2 ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/70 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/40"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold uppercase text-zinc-900 dark:text-white">
                          {rec.productName}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                            {rec.barcode}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            Qty: {rec.netQuantity || "1U"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white font-mono">
                          {formatCurrency(rec.salesPrice)}
                        </p>
                        {rec.mrp > rec.salesPrice && (
                          <p className="text-[10px] text-zinc-400 line-through font-mono">
                            {formatCurrency(rec.mrp)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400">
                      <span className="truncate max-w-[160px]">
                        {rec.batchNumber || "Direct Entry"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReprint(rec, 1);
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-zinc-100 hover:bg-indigo-600 hover:text-white px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-indigo-600 dark:hover:text-white transition-colors"
                          title="Reprint 1 label"
                        >
                          <Printer className="h-3 w-3" />
                          Reprint 1x
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Item Detail & Reprint Card (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {renderDetailCard(selectedRecord)}
          </div>
        </div>
      )}

      {/* Empty State when no results and not searching */}
      {searchResults.length === 0 && !isSearching && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-4">
            <Search className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            {activeQuery ? "No matching products or barcodes found" : "Ready to Search"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            {activeQuery
              ? `No barcode or product name matched "${activeQuery}". Try searching with a different product name, keyword, or barcode number.`
              : "Enter an 8-digit barcode, custom SKU, or product name above to lookup labels and reprint."}
          </p>
        </div>
      )}
    </div>
  );
}
