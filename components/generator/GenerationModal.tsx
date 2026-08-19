"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  Sparkles,
  X,
  FileText,
  LayoutGrid,
  Sliders,
  ChevronDown,
  ChevronUp,
  Printer,
  Settings2,
} from "lucide-react";

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  parseResult: {
    fileName: string;
    totalProducts: number;
    totalLabels: number;
    rows: any[];
  };
  onSuccess: (batchData: any) => void;
}

export function GenerationModal({
  isOpen,
  onClose,
  parseResult,
  onSuccess,
}: GenerationModalProps) {
  const [pdfMode, setPdfMode] = useState<"thermal2up" | "single" | "a4">("thermal2up");
  const [a4Preset, setA4Preset] = useState<"2x5" | "2x4" | "3x8" | "custom">("2x5");

  // Dimension & Grid Parameters
  const [labelWidth, setLabelWidth] = useState(50);
  const [labelHeight, setLabelHeight] = useState(25);
  const [columns, setColumns] = useState(2);
  const [rows, setRows] = useState(5);
  const [marginTop, setMarginTop] = useState(10);
  const [marginLeft, setMarginLeft] = useState(12);
  const [gapX, setGapX] = useState(4);
  const [gapY, setGapY] = useState(3);
  const [barcodeHeight, setBarcodeHeight] = useState(6.5);

  const [showBorder, setShowBorder] = useState(true);
  const [showHri, setShowHri] = useState(false); // Default false (hidden) per user request
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const validRows = parseResult.rows.filter((r) => r.isValid);

  const handlePresetChange = (preset: "2x5" | "2x4" | "3x8" | "custom") => {
    setA4Preset(preset);
    if (preset === "2x5") {
      setColumns(2);
      setRows(5);
      setMarginLeft(12);
      setMarginTop(10);
      setGapX(4);
      setGapY(3);
    } else if (preset === "2x4") {
      setColumns(2);
      setRows(4);
      setMarginLeft(12);
      setMarginTop(15);
      setGapX(4);
      setGapY(5);
    } else if (preset === "3x8") {
      setColumns(3);
      setRows(8);
      setMarginLeft(10);
      setMarginTop(10);
      setGapX(3);
      setGapY(2);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const payload = {
        fileName: parseResult.fileName,
        pdfOptions: {
          mode: pdfMode,
          labelWidthMm: labelWidth,
          labelHeightMm: labelHeight,
          showBorder: showBorder,
          showHri: showHri,
          a4Columns: pdfMode === "a4" ? columns : 2,
          a4Rows: pdfMode === "a4" ? rows : 1,
          a4MarginLeftMm: marginLeft,
          a4MarginTopMm: marginTop,
          a4GapXMm: gapX,
          a4GapYMm: gapY,
          barcodeHeightMm: barcodeHeight,
        },
        products: validRows.map((r) => ({
          productName: r.productName,
          mrp: r.mrp,
          salesPrice: r.salesPrice,
          quantity: r.quantity,
          netQuantity: r.netQuantity,
        })),
      };

      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Generation failed.");
      }

      setGeneratedResult(data);
      onSuccess(data);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedResult?.pdfBase64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${generatedResult.pdfBase64}`;
    link.download = `${generatedResult.batchNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdfDirectly = () => {
    if (!generatedResult?.pdfBase64) return;
    const blob = base64ToBlob(generatedResult.pdfBase64, "application/pdf");
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
  };

  function base64ToBlob(base64: string, type = "application/pdf") {
    const binStr = atob(base64);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], { type });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {generatedResult ? "PDF Ready to Print / Download" : "Customize Print & PDF Options"}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {parseResult.fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {generatedResult ? (
          /* Post Generation View with Direct Print & Download options */
          <div className="my-6 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white">
                {generatedResult.totalLabels.toLocaleString()} Labels PDF Rendered
              </h4>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Batch Reference:{" "}
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {generatedResult.batchNumber}
                </span>
              </p>
            </div>

            <div className="mt-2 flex w-full flex-col gap-2.5">
              <button
                type="button"
                onClick={handlePrintPdfDirectly}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
              >
                <Printer className="h-4 w-4" /> Print PDF Directly Now
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-750 transition-all"
              >
                <Download className="h-4 w-4" /> Download PDF File
              </button>

              <button
                type="button"
                onClick={() => setGeneratedResult(null)}
                className="mt-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 underline"
              >
                <Settings2 className="h-3.5 w-3.5 inline mr-1" /> Re-customize Options & Re-render
              </button>
            </div>
          </div>
        ) : (
          /* Pre-Generation Configuration View */
          <div className="my-5 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/40 text-xs">
              <div>
                <span className="text-zinc-500">Total Products</span>
                <p className="font-bold text-zinc-900 dark:text-white">
                  {validRows.length.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Total Labels</span>
                <p className="font-bold text-indigo-600 dark:text-indigo-400">
                  {parseResult.totalLabels.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-900 dark:text-white">
                Printer / Media Type:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPdfMode("thermal2up")}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "thermal2up"
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <Printer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      2-Up Thermal Roll
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      2 stickers/row (Your photo)
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPdfMode("single")}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "single"
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      1-Up Thermal Roll
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      1 sticker/row (Single roll)
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPdfMode("a4")}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "a4"
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      A4 Sheet Paper
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      Multi-label grid
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Sticker Sheet Layout Presets (When A4 mode selected) */}
            {pdfMode === "a4" && (
              <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/40">
                <label className="text-xs font-semibold text-zinc-900 dark:text-white">
                  Sticker Sheet Presets:
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePresetChange("2x5")}
                    className={`rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${
                      a4Preset === "2x5"
                        ? "border-indigo-600 bg-white shadow-xs text-indigo-600 font-bold dark:bg-zinc-900 dark:text-indigo-400"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    <div>2 Cols × 5 Rows</div>
                    <div className="text-[10px] text-zinc-400 font-normal">
                      10 labels/page (Matches Photo 1)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetChange("2x4")}
                    className={`rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${
                      a4Preset === "2x4"
                        ? "border-indigo-600 bg-white shadow-xs text-indigo-600 font-bold dark:bg-zinc-900 dark:text-indigo-400"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    <div>2 Cols × 4 Rows</div>
                    <div className="text-[10px] text-zinc-400 font-normal">
                      8 labels/page (Matches Photo 1)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetChange("3x8")}
                    className={`rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${
                      a4Preset === "3x8"
                        ? "border-indigo-600 bg-white shadow-xs text-indigo-600 font-bold dark:bg-zinc-900 dark:text-indigo-400"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    <div>3 Cols × 8 Rows</div>
                    <div className="text-[10px] text-zinc-400 font-normal">
                      24 labels/page (3-Column Sheet)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetChange("custom")}
                    className={`rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${
                      a4Preset === "custom"
                        ? "border-indigo-600 bg-white shadow-xs text-indigo-600 font-bold dark:bg-zinc-900 dark:text-indigo-400"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                  >
                    <div>Custom Grid</div>
                    <div className="text-[10px] text-zinc-400 font-normal">
                      Manual Columns & Margin controls
                    </div>
                  </button>
                </div>

                {/* Toggles: Border Line & HRI Barcode Number */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBorder}
                      onChange={(e) => setShowBorder(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Draw Outer Border Line around each label (for cutting/peeling)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHri}
                      onChange={(e) => setShowHri(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Print 8-Digit Barcode Number below Barcode</span>
                  </label>
                </div>

                {/* Advanced Grid Settings Accordion */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="mt-2 flex w-full items-center justify-between text-[11px] font-semibold text-indigo-600 dark:text-indigo-400"
                >
                  <span className="flex items-center gap-1">
                    <Sliders className="h-3.5 w-3.5" />
                    Customize Margins, Barcode & Label Dimensions
                  </span>
                  {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="mt-3 grid grid-cols-3 gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px]">
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400">Label Width (mm)</label>
                      <input
                        type="number"
                        value={labelWidth}
                        onChange={(e) => setLabelWidth(Number(e.target.value))}
                        className="h-7 w-full rounded border border-zinc-300 px-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400">Label Height (mm)</label>
                      <input
                        type="number"
                        value={labelHeight}
                        onChange={(e) => setLabelHeight(Number(e.target.value))}
                        className="h-7 w-full rounded border border-zinc-300 px-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400">Barcode Height</label>
                      <select
                        value={barcodeHeight}
                        onChange={(e) => setBarcodeHeight(Number(e.target.value))}
                        className="h-7 w-full rounded border border-zinc-300 px-1 font-mono text-[10px] dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <option value={5.5}>Small (5.5mm)</option>
                        <option value={6.5}>Standard (6.5mm)</option>
                        <option value={8}>Tall (8.0mm)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400">Columns Across</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={columns}
                        onChange={(e) => {
                          setColumns(Number(e.target.value));
                          setA4Preset("custom");
                        }}
                        className="h-7 w-full rounded border border-zinc-300 px-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400">Rows Down</label>
                      <input
                        type="number"
                        min="1"
                        max="15"
                        value={rows}
                        onChange={(e) => {
                          setRows(Number(e.target.value));
                          setA4Preset("custom");
                        }}
                        className="h-7 w-full rounded border border-zinc-300 px-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400">Left Margin (mm)</label>
                      <input
                        type="number"
                        value={marginLeft}
                        onChange={(e) => setMarginLeft(Number(e.target.value))}
                        className="h-7 w-full rounded border border-zinc-300 px-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400">Top Margin (mm)</label>
                      <input
                        type="number"
                        value={marginTop}
                        onChange={(e) => setMarginTop(Number(e.target.value))}
                        className="h-7 w-full rounded border border-zinc-300 px-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400">Gap Horiz (mm)</label>
                      <input
                        type="number"
                        value={gapX}
                        onChange={(e) => setGapX(Number(e.target.value))}
                        className="h-7 w-full rounded border border-zinc-300 px-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400">Gap Vert (mm)</label>
                      <input
                        type="number"
                        value={gapY}
                        onChange={(e) => setGapY(Number(e.target.value))}
                        className="h-7 w-full rounded border border-zinc-300 px-2 font-mono dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building PDF Layout...
                </>
              ) : (
                `Generate ${parseResult.totalLabels.toLocaleString()} Labels PDF`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
