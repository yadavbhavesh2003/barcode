"use client";

import { useState, useEffect } from "react";
import { ExcelUploader } from "@/components/generator/ExcelUploader";
import { ProductPreviewTable } from "@/components/generator/ProductPreviewTable";
import { LabelLivePreview } from "@/components/generator/LabelLivePreview";
import { GenerationModal } from "@/components/generator/GenerationModal";
import { Printer, RefreshCw, Barcode as BarcodeIcon, FileSpreadsheet, CheckCircle2, History, Sparkles } from "lucide-react";
import Link from "next/link";

export default function GeneratorPage() {
  const [parseResult, setParseResult] = useState<any | null>(null);
  const [originalExcelRows, setOriginalExcelRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [summaryMetrics, setSummaryMetrics] = useState<any | null>(null);
  const [showHri, setShowHri] = useState(true);
  const [showBorder, setShowBorder] = useState(false);

  const handleFileParsed = (result: any) => {
    setParseResult(result);
    setOriginalExcelRows(JSON.parse(JSON.stringify(result.rows)));

    if (result.rows && result.rows.length > 0) {
      const firstValid = result.rows.find((r: any) => r.isValid) || result.rows[0];
      setSelectedRowIndex(firstValid.rowIndex);
      setSelectedRow(firstValid);
    }
  };

  const handleReset = () => {
    setParseResult(null);
    setOriginalExcelRows([]);
    setSelectedRowIndex(null);
    setSelectedRow(null);
  };

  // Switch all rows to 1 Label per Product
  const handleSetAllQuantityToOne = () => {
    if (!parseResult) return;
    const updatedRows = parseResult.rows.map((r: any) => ({ ...r, quantity: 1 }));
    const newTotalLabels = updatedRows
      .filter((r: any) => r.isValid)
      .reduce((acc: number, r: any) => acc + r.quantity, 0);

    setParseResult({
      ...parseResult,
      totalLabels: newTotalLabels,
      rows: updatedRows,
    });
  };

  // Restore quantities from uploaded Excel sheet
  const handleRestoreExcelQuantities = () => {
    if (!parseResult || originalExcelRows.length === 0) return;
    const restoredRows = JSON.parse(JSON.stringify(originalExcelRows));
    const newTotalLabels = restoredRows
      .filter((r: any) => r.isValid)
      .reduce((acc: number, r: any) => acc + r.quantity, 0);

    setParseResult({
      ...parseResult,
      totalLabels: newTotalLabels,
      rows: restoredRows,
    });
  };

  // Update quantity for a specific row
  const handleUpdateRowQuantity = (rowIndex: number, newQty: number) => {
    if (!parseResult) return;
    const updatedRows = parseResult.rows.map((r: any) =>
      r.rowIndex === rowIndex ? { ...r, quantity: newQty } : r
    );
    const newTotalLabels = updatedRows
      .filter((r: any) => r.isValid)
      .reduce((acc: number, r: any) => acc + r.quantity, 0);

    setParseResult({
      ...parseResult,
      totalLabels: newTotalLabels,
      rows: updatedRows,
    });

    if (selectedRow && selectedRow.rowIndex === rowIndex) {
      setSelectedRow({ ...selectedRow, quantity: newQty });
    }
  };

  // Update custom barcode for a specific row
  const handleUpdateRowBarcode = (rowIndex: number, newBarcode: string) => {
    if (!parseResult) return;
    const trimmed = newBarcode.trim();
    const updatedRows = parseResult.rows.map((r: any) =>
      r.rowIndex === rowIndex ? { ...r, customBarcode: trimmed || undefined } : r
    );

    setParseResult({
      ...parseResult,
      rows: updatedRows,
    });

    if (selectedRow && selectedRow.rowIndex === rowIndex) {
      setSelectedRow({ ...selectedRow, customBarcode: trimmed || undefined });
    }
  };

  const handleDownloadErrorReport = async () => {
    if (!parseResult) return;
    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parseResult.rows }),
      });
      if (!response.ok) throw new Error("Failed to generate error report");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `validation_errors_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert("Error downloading report: " + err.message);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/batches");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.batches) {
          const totalBatches = data.batches.length;
          const totalLabelsPrinted = data.batches.reduce(
            (acc: number, b: any) => acc + (b.totalLabels || 0),
            0
          );
          setSummaryMetrics({ totalBatches, totalLabelsPrinted });
        }
      }
    } catch (e) {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Bulk Barcode Generator
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              50mm × 25mm Direct Thermal
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Import Excel product sheets, preview live Code 128 labels, and generate print-ready PDFs.
          </p>
        </div>

        {summaryMetrics && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <div className="text-xs">
                <span className="text-zinc-500">Batches: </span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {summaryMetrics.totalBatches}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
              <Printer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs">
                <span className="text-zinc-500">Labels Generated: </span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {summaryMetrics.totalLabelsPrinted}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!parseResult ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <ExcelUploader
            onFileParsed={handleFileParsed}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Upload New File
              </button>

              <button
                type="button"
                onClick={handleSetAllQuantityToOne}
                className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 transition-all"
                title="Change all valid products to generate exactly 1 label"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Set 1 Label per Item
              </button>

              {originalExcelRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleRestoreExcelQuantities}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 transition-all"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  Restore Excel Qty
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={parseResult.validCount === 0}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50 transition-all"
              >
                <Printer className="h-4 w-4" />
                Generate & Print Batch ({parseResult.totalLabels} Labels)
              </button>
            </div>
          </div>

          {/* Side-by-side Grid: Preview Table + Live Label Preview */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ProductPreviewTable
                rows={parseResult.rows}
                selectedRowIndex={selectedRowIndex}
                onSelectRow={(row) => {
                  setSelectedRowIndex(row.rowIndex);
                  setSelectedRow(row);
                }}
                onUpdateRowQuantity={handleUpdateRowQuantity}
                onUpdateRowBarcode={handleUpdateRowBarcode}
                onSetAllQuantityToOne={handleSetAllQuantityToOne}
              />
            </div>

            <div className="lg:col-span-5">
              <LabelLivePreview
                productName={selectedRow?.productName || "PRODUCT NAME"}
                mrp={selectedRow?.mrp || 1599}
                salesPrice={selectedRow?.salesPrice || 1020}
                netQuantity={selectedRow?.netQuantity || "1U"}
                sampleBarcode={selectedRow?.customBarcode || "14378278"}
                showHri={showHri}
                showBorder={showBorder}
                onToggleShowHri={setShowHri}
                onToggleShowBorder={setShowBorder}
              />
            </div>
          </div>

          {/* Confirmation & PDF Generation Modal */}
          <GenerationModal
            isOpen={isConfirmModalOpen}
            onClose={() => setIsConfirmModalOpen(false)}
            parseResult={parseResult}
            initialShowHri={showHri}
            initialShowBorder={showBorder}
            onSuccess={() => {
              fetchSummary();
            }}
          />
        </div>
      )}
    </div>
  );
}
