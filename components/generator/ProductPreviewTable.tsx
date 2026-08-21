"use client";

import { useState, useMemo } from "react";
import { Search, Filter, AlertTriangle, XCircle, CheckCircle2, ChevronLeft, ChevronRight, Hash } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ParsedProductRow {
  rowIndex: number;
  customBarcode?: string;
  productName: string;
  hsn?: string;
  mrp: number;
  salesPrice: number;
  quantity: number;
  netQuantity: string;
  gstAmount?: number;
  gstRate?: string;
  amount?: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ProductPreviewTableProps {
  rows: ParsedProductRow[];
  selectedRowIndex: number | null;
  onSelectRow: (row: ParsedProductRow) => void;
  onUpdateRowQuantity: (rowIndex: number, newQty: number) => void;
  onUpdateRowBarcode?: (rowIndex: number, newBarcode: string) => void;
  onSetAllQuantityToOne: () => void;
}

export function ProductPreviewTable({
  rows,
  selectedRowIndex,
  onSelectRow,
  onUpdateRowQuantity,
  onUpdateRowBarcode,
  onSetAllQuantityToOne,
}: ProductPreviewTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "valid" | "errors" | "warnings">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredRows = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return rows.filter((r) => {
      if (term) {
        const matchesName = r.productName.toLowerCase().includes(term);
        const matchesBarcode = r.customBarcode ? r.customBarcode.toLowerCase().includes(term) : false;
        const matchesHsn = r.hsn ? r.hsn.toLowerCase().includes(term) : false;
        if (!matchesName && !matchesBarcode && !matchesHsn) return false;
      }

      if (statusFilter === "valid") return r.isValid && r.warnings.length === 0;
      if (statusFilter === "errors") return !r.isValid;
      if (statusFilter === "warnings") return r.warnings.length > 0;

      return true;
    });
  }, [rows, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Parsed Products Preview ({rows.length})
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Click row to preview label. Custom <span className="font-semibold">Barcode #</span> and <span className="font-semibold">Qty</span> are editable.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Action to force 1 label per product */}
          <button
            onClick={onSetAllQuantityToOne}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900 transition-all"
            title="Set every product to 1 label (Print 1 label per row)"
          >
            <Hash className="h-3.5 w-3.5" />
            Set 1 Label Per Product
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, barcode, HSN..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-52 sm:w-64 rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950">
            {(["all", "valid", "warnings", "errors"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setStatusFilter(f);
                  setCurrentPage(1);
                }}
                className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                  statusFilter === f
                    ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2.5 font-semibold w-12">Row</th>
              <th className="px-3 py-2.5 font-semibold w-32"># (Barcode)</th>
              <th className="px-3.5 py-2.5 font-semibold">Item Name</th>
              <th className="px-3 py-2.5 font-semibold">HSN</th>
              <th className="px-3 py-2.5 font-semibold">MRP</th>
              <th className="px-3 py-2.5 font-semibold">Price/Unit</th>
              <th className="px-3 py-2.5 font-semibold w-20">Qty</th>
              <th className="px-3 py-2.5 font-semibold">Net Qty</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                  No matching products found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((r) => {
                const isSelected = selectedRowIndex === r.rowIndex;
                return (
                  <tr
                    key={r.rowIndex}
                    onClick={() => onSelectRow(r)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-950/40"
                        : "hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-zinc-400">{r.rowIndex}</td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        placeholder="Auto 8-digit"
                        value={r.customBarcode || ""}
                        onChange={(e) => {
                          if (onUpdateRowBarcode) {
                            onUpdateRowBarcode(r.rowIndex, e.target.value);
                          }
                        }}
                        className="h-7 w-28 rounded border border-zinc-200 bg-white px-2 font-mono text-xs font-semibold text-indigo-600 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-indigo-400"
                      />
                    </td>
                    <td className="px-3.5 py-2.5 font-medium text-zinc-900 dark:text-white">
                      <div>{r.productName || "<Missing Name>"}</div>
                      {r.errors.length > 0 && (
                        <div className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">
                          {r.errors.join(", ")}
                        </div>
                      )}
                      {r.warnings.length > 0 && (
                        <div className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                          {r.warnings.join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-zinc-600 dark:text-zinc-400">
                      {r.hsn || "-"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-zinc-700 dark:text-zinc-300">
                      {r.mrp ? formatCurrency(r.mrp) : "-"}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-zinc-900 dark:text-white">
                      {r.salesPrice ? formatCurrency(r.salesPrice) : "-"}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min="1"
                        max="50000"
                        value={r.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1) {
                            onUpdateRowQuantity(r.rowIndex, val);
                          }
                        }}
                        className="h-7 w-16 rounded border border-zinc-300 bg-white px-2 font-mono text-xs font-semibold text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-400">
                      {r.netQuantity}
                    </td>
                    <td className="px-3 py-2.5">
                      {!r.isValid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-400">
                          <XCircle className="h-3 w-3" /> Error
                        </span>
                      ) : r.warnings.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> Warning
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Valid
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div>
          Showing page {currentPage} of {totalPages} ({filteredRows.length} items)
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-zinc-200 p-1.5 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md border border-zinc-200 p-1.5 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
