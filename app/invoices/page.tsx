"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/context/ToastContext";
import {
  Receipt,
  Search,
  Filter,
  Eye,
  Printer,
  Ban,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  FileText,
  Clock,
  ArrowDownLeft,
  Edit3,
  History,
  RotateCcw,
  Loader2,
} from "lucide-react";

export default function InvoicesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 15, total: 0, pages: 1 });
  const [searchInvoice, setSearchInvoice] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [restoreStock, setRestoreStock] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [revisingId, setRevisingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices(1);
  }, [paymentStatusFilter, paymentMethodFilter]);

  const fetchInvoices = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        invoiceNumber: searchInvoice,
        customer: searchCustomer,
        paymentStatus: paymentStatusFilter,
        paymentMethod: paymentMethodFilter,
      });

      const res = await fetch(`/api/v1/invoices?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.data || []);
        if (json.pagination) setPagination(json.pagination);
      }
    } catch (e) {
      console.error("Invoice fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!selectedInvoice || !cancelReason) return;
    try {
      setIsCancelling(true);
      const res = await fetch(`/api/v1/invoices/${selectedInvoice._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reason: cancelReason,
          restoreStock,
          cancelledBy: "POS Admin",
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Invoice #${selectedInvoice.invoiceNumber} cancelled successfully`, "Invoice Cancelled");
        setIsCancelModalOpen(false);
        setSelectedInvoice(null);
        setCancelReason("");
        fetchInvoices(pagination.page);
      } else {
        toast.error(json.error?.message || "Failed to cancel invoice", "Cancellation Error");
      }
    } catch (e: any) {
      toast.error("Error: " + e.message, "System Error");
    } finally {
      setIsCancelling(false);
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
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Invoice History & Tax Bills
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Traceable GST invoices with historical line item pricing snapshots, payments, and reprint capabilities.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
          <div>
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              placeholder="e.g. INV/2026-27/000001"
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchInvoices(1)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
              Customer Name / Phone
            </label>
            <input
              type="text"
              placeholder="Search customer..."
              value={searchCustomer}
              onChange={(e) => setSearchCustomer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchInvoices(1)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
              Payment Status
            </label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PENDING">Pending</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => fetchInvoices(1)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
            >
              <Search className="h-4 w-4" />
              Apply Filters
            </button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading invoice records...
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        <div className="flex items-center gap-1.5">
                          <span>{inv.invoiceNumber}</span>
                          {(inv.isRevised || (inv.revisionCount || 0) > 0) && (
                            <span className="rounded bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-400/30">
                              Rev #{inv.revisionCount || 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500">
                        {new Date(inv.invoiceDate).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {inv.customer?.name || "Walk-in"}
                        </p>
                        {inv.customer?.mobile && (
                          <p className="text-[10px] text-zinc-400 font-mono">
                            {inv.customer.mobile}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">
                        {inv.itemsCount} ({inv.totalQuantity} units)
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="rounded bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {inv.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-white">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            inv.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                              : inv.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                          }`}
                        >
                          {inv.status === "CANCELLED" ? "CANCELLED" : inv.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="View Invoice Snapshot & Audit History"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {inv.status !== "CANCELLED" && (
                            <button
                              disabled={revisingId === inv._id}
                              onClick={() => {
                                setRevisingId(inv._id);
                                router.push(`/billing?revise=${inv._id}`);
                              }}
                              className="p-1 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
                              title="Revise / Edit Bill (POS)"
                            >
                              {revisingId === inv._id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                              ) : (
                                <Edit3 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                          {inv.status !== "CANCELLED" && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsCancelModalOpen(true);
                              }}
                              className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Cancel / Void Bill"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>
              Showing {invoices.length} of {pagination.total} invoices (Page {pagination.page} of{" "}
              {pagination.pages})
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchInvoices(pagination.page - 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1 font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchInvoices(pagination.page + 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1 font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: Invoice Details & Snapshot Viewer           */}
      {/* ==================================================== */}
      {selectedInvoice && !isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <span className="font-mono text-xs text-indigo-600 font-bold">
                  {selectedInvoice.invoiceNumber}
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Tax Invoice Snapshot
                </h3>
              </div>
              <button onClick={() => setSelectedInvoice(null)}>
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            {/* Bill Header Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl">
              <div>
                <p className="text-zinc-400">Customer:</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedInvoice.customer?.name || "Walk-in Customer"}
                </p>
                {selectedInvoice.customer?.mobile && (
                  <p className="text-zinc-500 font-mono">{selectedInvoice.customer.mobile}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-zinc-400">Date & Time:</p>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {new Date(selectedInvoice.invoiceDate).toLocaleString()}
                </p>
                <p className="text-zinc-500">Billed by: {selectedInvoice.billedBy}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">HSN</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">GST</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {selectedInvoice.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-medium">{item.productName}</td>
                      <td className="p-2.5 font-mono text-zinc-400">{item.hsnSac}</td>
                      <td className="p-2.5 text-center">{item.quantity}</td>
                      <td className="p-2.5 text-right">₹{item.unitPrice}</td>
                      <td className="p-2.5 text-right">₹{item.totalGst}</td>
                      <td className="p-2.5 text-right font-bold">₹{item.lineTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-1 text-xs border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <div className="flex justify-between text-zinc-500">
                <span>Taxable Value:</span>
                <span>₹{selectedInvoice.taxableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>CGST:</span>
                <span>₹{selectedInvoice.cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>SGST:</span>
                <span>₹{selectedInvoice.sgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-zinc-900 dark:text-white pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <span>Grand Total:</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(selectedInvoice.grandTotal)}
                </span>
              </div>
            </div>

            {/* Revision & Audit History Timeline */}
            {selectedInvoice.revisions && selectedInvoice.revisions.length > 0 && (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                  <History className="h-4 w-4 text-amber-600" />
                  <span>Revision & Stock Audit Trail ({selectedInvoice.revisions.length} previous revision{selectedInvoice.revisions.length > 1 ? "s" : ""})</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedInvoice.revisions.map((rev: any, rIdx: number) => (
                    <div
                      key={rIdx}
                      className="rounded-lg bg-white p-2.5 shadow-2xs border border-amber-100 dark:bg-zinc-800 dark:border-zinc-700 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-700 dark:text-amber-400">
                          Revision #{rev.revisionNumber} ({rev.reason || "Manual Edit"})
                        </span>
                        <span className="text-zinc-400 font-mono">
                          {new Date(rev.revisedAt).toLocaleString()} by {rev.revisedBy}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded">
                        <span>Previous Total: <strong>₹{rev.previousGrandTotal?.toLocaleString()}</strong> ({rev.previousTotalQuantity} units)</span>
                        <span className="font-mono text-zinc-400">{rev.previousItems?.length} items</span>
                      </div>

                      {rev.stockAdjustments && rev.stockAdjustments.length > 0 && (
                        <div className="text-[10px] space-y-0.5 pt-0.5">
                          <p className="font-semibold text-zinc-400 uppercase tracking-wider">Inventory Reconciled:</p>
                          {rev.stockAdjustments.map((adj: any, aIdx: number) => (
                            <div key={aIdx} className="flex items-center justify-between font-mono text-zinc-500">
                              <span>• {adj.productName} (Qty: {adj.oldQuantity} → {adj.newQuantity})</span>
                              <span className={adj.deltaQuantity > 0 ? "text-rose-600 font-bold" : adj.deltaQuantity < 0 ? "text-emerald-600 font-bold" : ""}>
                                {adj.deltaQuantity > 0 ? `-${adj.deltaQuantity} deducted` : adj.deltaQuantity < 0 ? `+${Math.abs(adj.deltaQuantity)} returned` : "No change"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {selectedInvoice.status !== "CANCELLED" && (
                <button
                  disabled={revisingId === selectedInvoice._id}
                  onClick={() => {
                    const id = selectedInvoice._id;
                    setRevisingId(id);
                    setSelectedInvoice(null);
                    router.push(`/billing?revise=${id}`);
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 transition-colors shadow-2xs disabled:opacity-50"
                >
                  {revisingId === selectedInvoice._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                  Revise This Bill (POS)
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
              >
                <Printer className="h-4 w-4" />
                Print Tax Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: Cancel / Void Invoice Dialog                */}
      {/* ==================================================== */}
      {isCancelModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <Ban className="h-5 w-5" />
              <span>Cancel / Void Invoice</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Are you sure you want to void invoice{" "}
              <strong className="text-zinc-900 dark:text-white">
                {selectedInvoice.invoiceNumber}
              </strong>
              ? This action is permanently recorded in the audit log.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Reason for cancellation *
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Customer returned items / Wrong barcode scanned"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-rose-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={restoreStock}
                onChange={(e) => setRestoreStock(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="text-zinc-700 dark:text-zinc-300">
                Automatically restore product inventory quantities
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelInvoice}
                disabled={!cancelReason || isCancelling}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
