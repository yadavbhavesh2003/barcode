"use client";

import { useState, useEffect } from "react";
import {
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  History as HistoryIcon,
  Search,
  Printer,
  Receipt,
  Barcode,
  Sparkles,
  CreditCard,
  Banknote,
  QrCode,
  Calendar,
} from "lucide-react";
import { formatAmount, formatCurrency } from "@/lib/utils";

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
  pdfOptions?: any;
  createdAt: string;
}

interface InvoiceRecord {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  totalGst?: number;
  discount?: number;
  grandTotal: number;
  paymentMode: string;
  pdfFormat?: string;
  createdAt: string;
}

export function BatchHistoryTable() {
  const [activeTab, setActiveTab] = useState<"batches" | "invoices">("batches");

  // Batches state
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [batchSearch, setBatchSearch] = useState("");

  // Invoices state
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [invoiceRevenue, setInvoiceRevenue] = useState(0);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState(0);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");

  const fetchBatches = async () => {
    setIsLoadingBatches(true);
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
      setIsLoadingBatches(false);
    }
  };

  const fetchInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const res = await fetch(`/api/bills?search=${encodeURIComponent(invoiceSearch)}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
        setInvoiceRevenue(data.totalRevenue || 0);
        setTotalInvoicesCount(data.totalCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (activeTab === "invoices") {
      fetchInvoices();
    }
  }, [activeTab, invoiceSearch]);

  const handlePrintBatchDirectly = async (batchId: string) => {
    try {
      const url = `/api/batches/${batchId}/pdf`;
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
      b.batchNumber.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.fileName.toLowerCase().includes(batchSearch.toLowerCase()) ||
      b.startBarcode.includes(batchSearch) ||
      b.endBarcode.includes(batchSearch)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Metric Cards Header */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Barcodes Generated</span>
          <p className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
            {(summary?.totalBarcodes || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Batches Saved</span>
          <p className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            {(summary?.totalBatches || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Invoices Billed</span>
          <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {totalInvoicesCount || (summary?.totalInvoices || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Billed Revenue</span>
          <p className="text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
            {formatCurrency(invoiceRevenue)}
          </p>
        </div>
      </div>

      {/* Main Tabbed Container */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("batches")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === "batches"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              <Barcode className="h-4 w-4" /> Barcode Batches History ({batches.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("invoices")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === "invoices"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              <Receipt className="h-4 w-4" /> Bill & Invoice History ({invoices.length})
            </button>
          </div>

          <div className="relative w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder={activeTab === "batches" ? "Search batch or barcode..." : "Search invoice # or phone..."}
              value={activeTab === "batches" ? batchSearch : invoiceSearch}
              onChange={(e) =>
                activeTab === "batches" ? setBatchSearch(e.target.value) : setInvoiceSearch(e.target.value)
              }
              className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        {/* Tab 1: Barcode Batches */}
        {activeTab === "batches" && (
          <div>
            {isLoadingBatches ? (
              <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="mt-2 text-xs">Loading barcode batch records...</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Batch ID</th>
                      <th className="px-4 py-3 font-semibold">Source File</th>
                      <th className="px-4 py-3 font-semibold">Labels Count</th>
                      <th className="px-4 py-3 font-semibold">Saved PDF Format</th>
                      <th className="px-4 py-3 font-semibold">Barcode Range</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3 font-semibold text-right">Reprint / Download</th>
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
                      filteredBatches.map((b) => {
                        const opts = b.pdfOptions || {};
                        const formatLabel = opts.labelWidthMm && opts.labelHeightMm
                          ? `${opts.labelWidthMm}×${opts.labelHeightMm}mm`
                          : "50×25mm";
                        const borderStatus = opts.showBorder ? "Border: On" : "Border: Off";
                        const hriStatus = opts.showHri !== false ? "HRI: On" : "HRI: Off";

                        return (
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
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[10.5px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                  {formatLabel}
                                </span>
                                <span className="inline-flex rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                  {borderStatus}
                                </span>
                                <span className="inline-flex rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                  {hriStatus}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                              {b.startBarcode} → {b.endBarcode}
                            </td>
                            <td className="px-4 py-3 text-zinc-500">
                              <div>{new Date(b.createdAt).toLocaleDateString()}</div>
                              <div className="text-[10px]">{b.createdBy}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handlePrintBatchDirectly(b.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300"
                                  title="Reprint batch in exact original format"
                                >
                                  <Printer className="h-3.5 w-3.5" /> Reprint
                                </button>

                                <a
                                  href={`/api/batches/${b.id}/pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                  title="Download PDF in exact original format"
                                >
                                  <Download className="h-3.5 w-3.5 text-indigo-600" /> PDF
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Customer Bill Invoices */}
        {activeTab === "invoices" && (
          <div>
            {isLoadingInvoices ? (
              <div className="flex flex-col items-center justify-center p-12 text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="mt-2 text-xs">Loading invoice records...</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Invoice No</th>
                      <th className="px-4 py-3 font-semibold">Date & Time</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold text-center">Items (Qty)</th>
                      <th className="px-4 py-3 font-semibold text-right">Grand Total</th>
                      <th className="px-4 py-3 font-semibold text-center">Payment</th>
                      <th className="px-4 py-3 font-semibold text-right">Reprint Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                          No invoices found. Generate bills in the Billing / POS section to view sales records here.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {inv.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-zinc-500">
                            {new Date(inv.createdAt).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-zinc-900 dark:text-white">
                              {inv.customerName || "Walk-in"}
                            </div>
                            {inv.customerPhone && (
                              <div className="text-[11px] text-zinc-400">{inv.customerPhone}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-zinc-900 dark:text-white">
                            {inv.totalQuantity} ({inv.totalItems} products)
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-zinc-900 dark:text-white">
                            {formatCurrency(inv.grandTotal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                              {inv.paymentMode || "Cash"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <a
                                href={`/api/bills/${inv._id}/pdf?format=a4`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                              >
                                <FileText className="h-3 w-3 text-indigo-600" /> A4 Bill
                              </a>
                              <a
                                href={`/api/bills/${inv._id}/pdf?format=thermal`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                              >
                                <Receipt className="h-3 w-3 text-amber-600" /> POS Receipt
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
        )}
      </div>
    </div>
  );
}
