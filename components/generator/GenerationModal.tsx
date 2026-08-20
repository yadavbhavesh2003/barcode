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
  const [pdfMode, setPdfMode] = useState<"thermal2up" | "single" | "a4" | "4x6" | "4x6_grid" | "4x6_2x5">("4x6_2x5");
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
  const [barcodeRotation, setBarcodeRotation] = useState<0 | 90 | 180 | 270>(0);
  const [layoutPreset, setLayoutPreset] = useState<"standard" | "barcode_bottom" | "vertical_left" | "vertical_right">("standard");
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
          barcodeRotation: barcodeRotation,
          layoutPreset: layoutPreset,
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

  const handleDownloadTspl = () => {
    if (!generatedResult?.batchId) return;
    const link = document.createElement("a");
    link.href = `/api/batches/${generatedResult.batchId}/tspl?mode=${pdfMode}&hri=${showHri ? 1 : 0}`;
    link.download = `${generatedResult.batchNumber}.prn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDirectUsbPrint = async () => {
    if (!generatedResult?.batchId) return;
    if (typeof window === "undefined" || !("serial" in navigator)) {
      alert("Direct USB/Serial printing requires Google Chrome or Microsoft Edge browser.");
      return;
    }
    try {
      const res = await fetch(`/api/batches/${generatedResult.batchId}/tspl?mode=${pdfMode}&hri=${showHri ? 1 : 0}`);
      if (!res.ok) throw new Error("Failed to fetch TSPL commands.");
      const tsplText = await res.text();

      // Request Serial Port from User
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 }); // Default TSC baud rate 9600 / 115200

      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(tsplText));
      writer.releaseLock();
      await port.close();

      alert("Labels sent directly to TSC printer successfully!");
    } catch (err: any) {
      if (err.name !== "NotFoundError") {
        console.error("Direct USB print error:", err);
        alert("USB Print error: " + (err.message || "Failed to communicate with printer."));
      }
    }
  };

  const handlePrintPdfDirectly = () => {
    if (!generatedResult?.pdfBase64) return;

    let pWidth = pdfMode === "4x6_2x5" || pdfMode === "4x6_grid" || pdfMode === "4x6" ? 101.6 : pdfMode === "thermal2up" ? (labelWidth * 2 + gapX) : pdfMode === "single" ? labelWidth : 210;
    let pHeight = pdfMode === "4x6_2x5" || pdfMode === "4x6_grid" || pdfMode === "4x6" ? 152.4 : pdfMode === "a4" ? 297 : labelHeight;

    const base64Data = generatedResult.pdfBase64;
    const blob = base64ToBlob(base64Data, "application/pdf");
    const blobUrl = URL.createObjectURL(blob);

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Labels - ${generatedResult.batchNumber}</title>
            <style>
              @page {
                size: ${pWidth}mm ${pHeight}mm;
                margin: 0mm;
              }
              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
              }
              iframe {
                width: 100%;
                height: 100%;
                border: none;
              }
            </style>
          </head>
          <body>
            <iframe src="${blobUrl}"></iframe>
            <script>
              setTimeout(() => {
                window.focus();
                window.print();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } else {
      // Fallback iframe injection if popup blocked
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
    }
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
      <div className="my-8 w-full max-w-3xl sm:max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 transition-all">
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
                {generatedResult.totalLabels.toLocaleString()} Labels Rendered
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
                onClick={handleDirectUsbPrint}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 transition-all"
                title="Bypasses PDF driver completely by sending TSPL raw code via USB"
              >
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Direct USB/Serial Raw Print (TSC Hardware)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-750 transition-all"
                >
                  <Download className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Download PDF
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTspl}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300 transition-all"
                  title="Download TSPL .prn file for direct TSC printer raw command printing"
                >
                  <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Direct TSPL (.prn)
                </button>
              </div>

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

            {/* Category 1: Single Thermal Roll Presets (1 Label / Roll - TSC TE244 Hardware Compatible) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Printer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  1-Up Single Thermal Roll Presets (TSC TE244 Printer):
                </label>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                  1 Sticker per Row / Roll
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {/* Single Roll Preset 1: 2.0" x 1.0" (50x25mm) */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("single");
                    setLabelWidth(50);
                    setLabelHeight(25);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "single" && labelWidth === 50 && labelHeight === 25
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      2.0" × 1.0" Single Roll
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      50mm × 25mm Sticker
                    </div>
                  </div>
                </button>

                {/* Single Roll Preset 2: 2.4" x 1.0" (60.96x25mm) */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("single");
                    setLabelWidth(60.96);
                    setLabelHeight(25);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "single" && labelWidth === 60.96 && labelHeight === 25
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      2.4" × 1.0" Single Roll
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      61mm × 25mm Sticker
                    </div>
                  </div>
                </button>

                {/* Single Roll Preset 3: 1.4" x 1.0" (35.56x25mm) */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("single");
                    setLabelWidth(35.56);
                    setLabelHeight(25);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "single" && labelWidth === 35.56 && labelHeight === 25
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      1.4" × 1.0" Single Roll
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      35.5mm × 25mm Sticker
                    </div>
                  </div>
                </button>

                {/* Single Roll Preset 4: 2.0" x 1.5" (50x38mm) */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("single");
                    setLabelWidth(50);
                    setLabelHeight(38);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "single" && labelWidth === 50 && labelHeight === 38
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      2.0" × 1.5" Single Roll
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      50mm × 38mm Medium
                    </div>
                  </div>
                </button>

                {/* Single Roll Preset 5: 1.4" x 6.0" Giant Roll */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("4x6");
                    setLabelWidth(35.56);
                    setLabelHeight(152.4);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "4x6" && labelWidth === 35.56
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      1.4" × 6.0" Giant Roll ★
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      35.5mm × 152mm Full Page
                    </div>
                  </div>
                </button>

                {/* Single Roll Preset 6: 2.4" x 6.0" Giant Roll */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("4x6");
                    setLabelWidth(60.96);
                    setLabelHeight(152.4);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "4x6" && labelWidth === 60.96
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      2.4" × 6.0" Giant Roll ★
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      61mm × 152mm Full Page
                    </div>
                  </div>
                </button>

                {/* Single Roll Preset 7: 4.0" x 6.0" Giant Roll */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("4x6");
                    setLabelWidth(101.6);
                    setLabelHeight(152.4);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "4x6" && labelWidth === 101.6
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      4.0" × 6.0" Giant Roll
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      102mm × 152mm Shipping
                    </div>
                  </div>
                </button>

                {/* Single Roll Preset 8: 2.0" x 2.0" Square */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("single");
                    setLabelWidth(50);
                    setLabelHeight(50);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "single" && labelWidth === 50 && labelHeight === 50
                      ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      2.0" × 2.0" Square Roll
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      50mm × 50mm Square Tag
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Category 2: Multi-Label Sheets & 2-Up Thermal Rolls */}
            <div className="space-y-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <label className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <LayoutGrid className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Multi-Label Sheets & 2-Up Thermal Rolls:
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {/* 4x6 Sheet (2x5 = 10 Labels) */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("4x6_2x5");
                    setColumns(2);
                    setRows(5);
                    setLabelWidth(47.0);
                    setLabelHeight(23.5);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "4x6_2x5"
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      4" × 6" Sheet (2×5)
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      10 labels/sheet (47x23.5)
                    </div>
                  </div>
                </button>

                {/* 4x6 Sheet (2x6 = 12 Labels) */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("4x6_grid");
                    setColumns(2);
                    setRows(6);
                    setLabelWidth(48.0);
                    setLabelHeight(23.5);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "4x6_grid" && rows === 6
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      4" × 6" Sheet (2×6)
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      12 labels/sheet
                    </div>
                  </div>
                </button>

                {/* 2-Up Thermal Roll */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("thermal2up");
                    setLabelWidth(50);
                    setLabelHeight(25);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "thermal2up"
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <Printer className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      2-Up Thermal Roll
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      104mm × 25mm (2/row)
                    </div>
                  </div>
                </button>

                {/* A4 Sheet (2x5 = 10 Labels) */}
                <button
                  type="button"
                  onClick={() => {
                    setPdfMode("a4");
                    setA4Preset("2x5");
                    setColumns(2);
                    setRows(5);
                    setLabelWidth(90);
                    setLabelHeight(50);
                  }}
                  className={`flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all ${
                    pdfMode === "a4" && a4Preset === "2x5"
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/40 font-bold"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                      A4 Sheet (2×5)
                    </div>
                    <div className="text-[9.5px] text-zinc-500 leading-tight mt-0.5">
                      10 labels/A4 page
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Barcode Position & Layout Template Editor */}
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/40">
              <label className="text-xs font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                <span>Barcode Position & Layout Template:</span>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                  {layoutPreset.toUpperCase()} ({barcodeRotation}°)
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => {
                    setLayoutPreset("standard");
                    setBarcodeRotation(0);
                  }}
                  className={`rounded-lg border p-2 text-left transition-all ${layoutPreset === "standard"
                      ? "border-indigo-600 bg-white font-bold text-indigo-600 shadow-xs ring-1 ring-indigo-500/20 dark:bg-zinc-900 dark:text-indigo-400"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                >
                  <div className="text-[11px]">Standard (Top)</div>
                  <div className="text-[9.5px] text-zinc-400 font-normal">Horizontal Barcode Top</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLayoutPreset("barcode_bottom");
                    setBarcodeRotation(0);
                  }}
                  className={`rounded-lg border p-2 text-left transition-all ${layoutPreset === "barcode_bottom"
                      ? "border-indigo-600 bg-white font-bold text-indigo-600 shadow-xs ring-1 ring-indigo-500/20 dark:bg-zinc-900 dark:text-indigo-400"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                >
                  <div className="text-[11px]">Barcode Bottom</div>
                  <div className="text-[9.5px] text-zinc-400 font-normal">Horizontal Barcode Bottom</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLayoutPreset("vertical_left");
                    setBarcodeRotation(90);
                  }}
                  className={`rounded-lg border p-2 text-left transition-all ${layoutPreset === "vertical_left"
                      ? "border-indigo-600 bg-white font-bold text-indigo-600 shadow-xs ring-1 ring-indigo-500/20 dark:bg-zinc-900 dark:text-indigo-400"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                >
                  <div className="text-[11px]">Vertical Left</div>
                  <div className="text-[9.5px] text-zinc-400 font-normal">Rotated 90° on Left</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLayoutPreset("vertical_right");
                    setBarcodeRotation(90);
                  }}
                  className={`rounded-lg border p-2 text-left transition-all ${layoutPreset === "vertical_right"
                      ? "border-indigo-600 bg-white font-bold text-indigo-600 shadow-xs ring-1 ring-indigo-500/20 dark:bg-zinc-900 dark:text-indigo-400"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                >
                  <div className="text-[11px]">Vertical Right</div>
                  <div className="text-[9.5px] text-zinc-400 font-normal">Rotated 90° on Right</div>
                </button>
              </div>

              {/* Barcode Rotation Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Exact Barcode Rotation Angle:
                </span>
                <div className="flex items-center gap-1.5">
                  {([0, 90, 180, 270] as const).map((angle) => (
                    <button
                      key={angle}
                      type="button"
                      onClick={() => setBarcodeRotation(angle)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${barcodeRotation === angle
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        }`}
                    >
                      {angle}°
                    </button>
                  ))}
                </div>
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
                    className={`rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${a4Preset === "2x5"
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
                    className={`rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${a4Preset === "2x4"
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
                    className={`rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${a4Preset === "3x8"
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
                    className={`rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${a4Preset === "custom"
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

            {/* Active Media & Dimension Indicator Box */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/40 text-xs">
              <div className="flex items-center justify-between font-semibold text-indigo-900 dark:text-indigo-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Active Media Dimensions:
                </span>
                <span className="font-mono bg-indigo-100 dark:bg-indigo-900/70 px-2 py-0.5 rounded text-[11px] font-bold">
                  {labelWidth}mm × {labelHeight}mm ({(labelWidth / 25.4).toFixed(1)}" × {(labelHeight / 25.4).toFixed(1)}")
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <label className="text-zinc-600 dark:text-zinc-400 font-medium">Width (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labelWidth}
                    onChange={(e) => setLabelWidth(Number(e.target.value))}
                    className="h-8 w-full rounded-lg border border-zinc-300 px-2 font-mono font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  />
                  <span className="text-[9.5px] text-zinc-500 font-mono">{(labelWidth / 25.4).toFixed(2)}" inches</span>
                </div>

                <div>
                  <label className="text-zinc-600 dark:text-zinc-400 font-medium">Height (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labelHeight}
                    onChange={(e) => setLabelHeight(Number(e.target.value))}
                    className="h-8 w-full rounded-lg border border-zinc-300 px-2 font-mono font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  />
                  <span className="text-[9.5px] text-zinc-500 font-mono">{(labelHeight / 25.4).toFixed(2)}" inches</span>
                </div>

                <div>
                  <label className="text-zinc-600 dark:text-zinc-400 font-medium">Printer Mode</label>
                  <select
                    value={pdfMode}
                    onChange={(e) => setPdfMode(e.target.value as any)}
                    className="h-8 w-full rounded-lg border border-zinc-300 px-1 font-mono text-[10.5px] font-semibold dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="single">1-Up Single Roll</option>
                    <option value="4x6">Giant Roll / Full Page</option>
                    <option value="thermal2up">2-Up Thermal Roll</option>
                    <option value="4x6_2x5">4"×6" Sheet (2×5)</option>
                    <option value="a4">A4 Sheet Grid</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-600 dark:text-zinc-400 font-medium">Border Line</label>
                  <button
                    type="button"
                    onClick={() => setShowBorder(!showBorder)}
                    className={`h-8 w-full rounded-lg border text-[11px] font-semibold transition-all ${
                      showBorder
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    {showBorder ? "✓ Border ON" : "✕ Border OFF"}
                  </button>
                </div>
              </div>
            </div>

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
