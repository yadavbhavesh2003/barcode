"use client";

import { useState, useEffect } from "react";
import { ExcelUploader } from "@/components/generator/ExcelUploader";
import { ValidationSummary } from "@/components/generator/ValidationSummary";
import { ProductPreviewTable } from "@/components/generator/ProductPreviewTable";
import { LabelLivePreview } from "@/components/generator/LabelLivePreview";
import { GenerationModal } from "@/components/generator/GenerationModal";
import { Sparkles, RotateCcw, CheckCircle2, Hash, Layers } from "lucide-react";

export default function Home() {
  const [parseResult, setParseResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [summaryMetrics, setSummaryMetrics] = useState<any | null>(null);

  // Store original Excel quantities so user can switch modes seamlessly
  const [originalExcelRows, setOriginalExcelRows] = useState<any[]>([]);

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/batches");
      const data = await res.json();
      if (data.success && data.summary) {
        setSummaryMetrics(data.summary);
      }
    } catch (err) {
      console.error("Failed to load dashboard summary:", err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

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
      const res = await fetch("/api/excel/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parseResult.rows }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "validation_error_report.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading report:", err);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Top Summary Metric Cards */}
      {summaryMetrics && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Labels</span>
            <p className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {(summaryMetrics.totalBarcodes || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Issued Today</span>
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {(summaryMetrics.todayBarcodes || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Products Catalog</span>
            <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {(summaryMetrics.totalProducts || 0).toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Batches</span>
            <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {(summaryMetrics.totalBatches || 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Primary Workflow Section */}
      {!parseResult ? (
        <ExcelUploader
          onFileParsed={handleFileParsed}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Header Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Step 2: Review Data & Generate PDF
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Inspect parsed product list and preview printable 50×25 mm label output.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quantity Mode Selector Buttons */}
              <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950">
                <button
                  type="button"
                  onClick={handleSetAllQuantityToOne}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    parseResult.totalLabels === parseResult.validRowsCount
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  <Hash className="h-3.5 w-3.5" />
                  1 Label Per Product ({parseResult.validRowsCount})
                </button>
                <button
                  type="button"
                  onClick={handleRestoreExcelQuantities}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    parseResult.totalLabels !== parseResult.validRowsCount
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Excel Quantities ({originalExcelRows.reduce((a, b) => a + (b.isValid ? b.quantity : 0), 0)})
                </button>
              </div>

              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Upload Another File
              </button>

              <button
                disabled={parseResult.hasFatalErrors || parseResult.totalLabels === 0}
                onClick={() => setIsConfirmModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Generate {parseResult.totalLabels.toLocaleString()} Printable Labels PDF
              </button>
            </div>
          </div>

          {/* Validation Summary */}
          <ValidationSummary
            parseResult={parseResult}
            onDownloadReport={handleDownloadErrorReport}
          />

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
              />
            </div>
          </div>

          {/* Confirmation & PDF Generation Modal */}
          <GenerationModal
            isOpen={isConfirmModalOpen}
            onClose={() => setIsConfirmModalOpen(false)}
            parseResult={parseResult}
            onSuccess={() => {
              fetchSummary();
            }}
          />
        </div>
      )}
    </div>
  );
}
