"use client";

import { useState, useRef, useEffect } from "react";
import bwipjs from "bwip-js";
import { Search, Printer, AlertCircle, Loader2, Barcode as BarcodeIcon, Tag, Calendar, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export function BarcodeSearch() {
  const [queryCode, setQueryCode] = useState("");
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isReprinting, setIsReprinting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryCode.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    setSearchResult(null);

    try {
      const res = await fetch(`/api/barcodes/search?code=${encodeURIComponent(queryCode.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Barcode not found.");
      }

      setSearchResult(data.record);
    } catch (err: any) {
      setErrorMsg(err.message || "Could not find barcode record.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchResult && canvasRef.current) {
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: "code128",
          text: searchResult.barcode,
          scale: 3,
          height: 10,
          includetext: false,
          backgroundcolor: "FFFFFF",
        });
      } catch (err) {
        console.error("Barcode canvas error:", err);
      }
    }
  }, [searchResult]);

  const handleReprint = async () => {
    if (!searchResult) return;
    setIsReprinting(true);

    try {
      const res = await fetch(`/api/barcodes/${searchResult.barcode}/reprint`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Reprint failed.");
      }

      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${data.pdfBase64}`;
      link.download = `label_${searchResult.barcode}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || "Failed to download reprint label.");
    } finally {
      setIsReprinting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Search Input Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <BarcodeIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Barcode Search & Reprint
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Lookup any 8-digit barcode to view product info and print individual labels.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Enter 8-digit barcode (e.g. 58310472)..."
              value={queryCode}
              onChange={(e) => setQueryCode(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm font-mono text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !queryCode.trim()}
            className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </button>
        </form>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Search Result Card */}
      {searchResult && (
        <div className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div>
              <span className="text-xs font-medium text-zinc-400">Barcode ID</span>
              <h3 className="font-mono text-xl font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
                {searchResult.barcode}
              </h3>
            </div>

            <button
              onClick={handleReprint}
              disabled={isReprinting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {isReprinting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Reprint Single Label
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-zinc-400">Product Name</span>
                <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase">
                  {searchResult.productName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs font-medium text-zinc-400">MRP</span>
                  <p className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(searchResult.mrp)}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-zinc-400">Sales Price</span>
                  <p className="text-sm font-mono font-bold text-zinc-900 dark:text-white">
                    {formatCurrency(searchResult.salesPrice)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs font-medium text-zinc-400">Net Quantity</span>
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {searchResult.netQuantity}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-zinc-400">Batch Ref</span>
                  <p className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {searchResult.batchNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Barcode Visual Card */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-950">
              <canvas ref={canvasRef} className="max-h-[45px] max-w-[90%]" />
              <span className="mt-1 font-mono text-xs font-bold tracking-widest text-zinc-900 dark:text-white">
                {searchResult.barcode}
              </span>
              <span className="mt-2 text-[10px] text-zinc-400">
                Created: {new Date(searchResult.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
