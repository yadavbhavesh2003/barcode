"use client";

import { useState, useEffect } from "react";
import { Download, FileText, LayoutGrid, Loader2, CheckCircle2, History as HistoryIcon, Search, Printer } from "lucide-react";

interface BatchRecord {
  id: string;
  batchNumber: string;
  fileName: string;
  totalProducts: number;
  totalLabels: number;
  startBarcode: string;
  endBarcode: string;
  status: string;
  createdBy: string;
  createdAt: string;
}

export function BatchHistoryTable() {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      if (data.success) {
        setBatches(data.batches || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handlePrintBatchDirectly = async (batchId: string, mode: "single" | "a4") => {
    try {
      const url = `/api/batches/${batchId}/pdf?mode=${mode}&cols=${mode === "a4" ? 2 : 1}&rows=${mode === "a4" ? 5 : 1}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = blobUrl;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 300);
      };
    } catch (err) {
      console.error("Print failed:", err);
    }
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.startBarcode.includes(searchTerm) ||
      b.endBarcode.includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Metric Cards Header */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Labels</span>
            <p className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {(summary.totalBarcodes || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Issued Today</span>
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {(summary.todayBarcodes || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Products Catalog</span>
            <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {(summary.totalProducts || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Batches</span>
            <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {(summary.totalBatches || 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                Generation Batch History
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Track, print, and re-download previously generated barcode batches.
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search batch or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="mt-2 text-xs">Loading batch records...</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Batch ID</th>
                  <th className="px-4 py-3 font-semibold">Source File</th>
                  <th className="px-4 py-3 font-semibold">Labels</th>
                  <th className="px-4 py-3 font-semibold">Barcode Range</th>
                  <th className="px-4 py-3 font-semibold">Date & User</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Direct Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                      No batch history found.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {b.batchNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                        {b.fileName}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-zinc-900 dark:text-white">
                        {b.totalLabels.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {b.startBarcode} → {b.endBarcode}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        <div>{new Date(b.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px]">{b.createdBy}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Print 2-Col Sticker Sheet Direct */}
                          <button
                            onClick={() => handlePrintBatchDirectly(b.id, "a4")}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
                            title="Print 2-Column Sticker Sheet directly"
                          >
                            <Printer className="h-3 w-3" /> Print Sticker Sheet
                          </button>

                          {/* Download PDF File */}
                          <a
                            href={`/api/batches/${b.id}/pdf?mode=a4&cols=2&rows=5`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                            title="Download A4 2-Column Sticker Sheet PDF"
                          >
                            <Download className="h-3 w-3" /> Download PDF
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
