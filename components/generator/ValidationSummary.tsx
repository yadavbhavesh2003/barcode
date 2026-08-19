"use client";

import { CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, Download } from "lucide-react";

interface ValidationSummaryProps {
  parseResult: {
    fileName: string;
    totalRows: number;
    totalProducts: number;
    totalLabels: number;
    validRowsCount: number;
    warningCount: number;
    errorCount: number;
    rows: any[];
    hasFatalErrors: boolean;
  };
  onDownloadReport: () => void;
}

export function ValidationSummary({ parseResult, onDownloadReport }: ValidationSummaryProps) {
  const {
    fileName,
    totalProducts,
    totalLabels,
    validRowsCount,
    warningCount,
    errorCount,
    hasFatalErrors,
  } = parseResult;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{fileName}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Excel Data Validation Report</p>
          </div>
        </div>

        {errorCount > 0 && (
          <button
            onClick={onDownloadReport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-400 dark:hover:bg-red-950 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Download Error Report ({errorCount})
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/40">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Products</span>
          <p className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            {totalProducts.toLocaleString()}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 dark:border-indigo-950/50 dark:bg-indigo-950/20">
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Total Labels
          </span>
          <p className="text-lg font-bold tracking-tight text-indigo-700 dark:text-indigo-300">
            {totalLabels.toLocaleString()}
          </p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 dark:border-emerald-950/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Valid Rows
          </div>
          <p className="text-lg font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
            {validRowsCount.toLocaleString()}
          </p>
        </div>

        {/* Metric 4 */}
        <div
          className={`rounded-xl border p-3.5 ${
            errorCount > 0
              ? "border-red-200 bg-red-50/40 dark:border-red-950/50 dark:bg-red-950/20"
              : "border-amber-100 bg-amber-50/40 dark:border-amber-950/50 dark:bg-amber-950/20"
          }`}
        >
          <div className="flex items-center gap-1 text-xs font-medium">
            {errorCount > 0 ? (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <XCircle className="h-3.5 w-3.5" />
                Errors
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Warnings
              </span>
            )}
          </div>
          <p
            className={`text-lg font-bold tracking-tight ${
              errorCount > 0
                ? "text-red-700 dark:text-red-300"
                : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {errorCount > 0 ? errorCount : warningCount}
          </p>
        </div>
      </div>
    </div>
  );
}
