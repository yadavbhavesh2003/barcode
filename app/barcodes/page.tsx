"use client";

import { useState, useEffect, useRef } from "react";
import {
  Barcode,
  Printer,
  Sparkles,
  Layers,
  Settings,
  Plus,
  RefreshCw,
  Eye,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileDown,
} from "lucide-react";
import bwipjs from "bwip-js";

export default function BarcodesPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "generator" | "designer">("designer");
  const [barcodes, setBarcodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Generator State
  const [genMode, setGenMode] = useState<"single" | "bulk" | "sequential">("bulk");
  const [genPrefix, setGenPrefix] = useState("TOY");
  const [genQuantity, setGenQuantity] = useState("10");
  const [genResults, setGenResults] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Designer State (Default: 1.4" x 1.0" Roll Sticker)
  const [presetName, setPresetName] = useState("1-Up Roll (1.4 x 1.0 in)");
  const [labelWidthMm, setLabelWidthMm] = useState(35.56); // 1.4 inch
  const [labelHeightMm, setLabelHeightMm] = useState(25.4); // 1.0 inch
  const [marginTopMm, setMarginTopMm] = useState(3);
  const [marginLeftMm, setMarginLeftMm] = useState(3);
  const [barcodeHeightMm, setBarcodeHeightMm] = useState(8);
  const [fontSizePt, setFontSizePt] = useState(7);

  // Content Toggles
  const [showCompany, setShowCompany] = useState(true);
  const [companyName, setCompanyName] = useState("RUNR KIDS");
  const [showProduct, setShowProduct] = useState(true);
  const [sampleProductName, setSampleProductName] = useState("2.4 WIRELESS VIDEOGAME BLUE");
  const [sampleBarcode, setSampleBarcode] = useState("14378278");
  const [showMrp, setShowMrp] = useState(true);
  const [sampleMrp, setSampleMrp] = useState("4999");
  const [showPrice, setShowPrice] = useState(true);
  const [samplePrice, setSamplePrice] = useState("1499");
  const [showGst, setShowGst] = useState(true);
  const [showHsn, setShowHsn] = useState(true);
  const [sampleHsn, setSampleHsn] = useState("9503");
  const [showNetQty, setShowNetQty] = useState(true);
  const [showBorder, setShowBorder] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchBarcodes();
  }, []);

  useEffect(() => {
    renderBarcodePreview();
  }, [
    sampleBarcode,
    barcodeHeightMm,
    labelWidthMm,
    labelHeightMm,
    showBorder,
    fontSizePt,
    showCompany,
    showProduct,
    showPrice,
    showMrp,
    showGst,
  ]);

  const fetchBarcodes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/barcodes?limit=30");
      const json = await res.json();
      if (json.success) {
        setBarcodes(json.data || []);
      }
    } catch (e) {
      console.error("Barcode fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const renderBarcodePreview = () => {
    if (!canvasRef.current) return;
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: "code128",
        text: sampleBarcode || "14378278",
        scale: 2,
        height: barcodeHeightMm || 8,
        includetext: true,
        textxalign: "center",
        textsize: 9,
      });
    } catch (e) {
      console.error("BWIP Error:", e);
    }
  };

  const handleBulkGenerate = async () => {
    try {
      setIsGenerating(true);
      const res = await fetch("/api/v1/barcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "bulk_generate",
          prefix: genPrefix,
          quantity: parseInt(genQuantity, 10) || 10,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGenResults(json.data.generatedCodes);
        fetchBarcodes();
      } else {
        alert(json.error?.message || "Generation failed");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintTestLabel = () => {
    window.print();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Barcode Engine & Thermal Label Designer
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Configure 1-Up roll stickers, sequential generator, and GS1-compliant symbologies.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              onClick={() => setActiveTab("designer")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "designer"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <Sliders className="h-4 w-4" />
              Label Designer
            </button>
            <button
              onClick={() => setActiveTab("generator")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "generator"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <Plus className="h-4 w-4" />
              Generator
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeTab === "directory"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <Layers className="h-4 w-4" />
              Barcode Directory
            </button>
          </div>
        </div>

        {/* TAB 1: LABEL DESIGNER */}
        {activeTab === "designer" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-5 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 text-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Label Layout Settings
                  </h2>
                  <p className="text-zinc-400 text-[11px]">
                    Default Standard: 1-Up Roll Sticker (1.4 × 1.0 inch)
                  </p>
                </div>
                <button
                  onClick={handlePrintTestLabel}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                >
                  <Printer className="h-4 w-4" />
                  Print Test Label
                </button>
              </div>

              {/* Dimensions */}
              <div className="space-y-3">
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200">
                  1. Sticker Dimensions & Margins
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      value={labelWidthMm}
                      onChange={(e) => setLabelWidthMm(parseFloat(e.target.value) || 35.56)}
                      className="w-full rounded-xl border border-zinc-200 p-2 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      value={labelHeightMm}
                      onChange={(e) => setLabelHeightMm(parseFloat(e.target.value) || 25.4)}
                      className="w-full rounded-xl border border-zinc-200 p-2 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      Top Margin (mm)
                    </label>
                    <input
                      type="number"
                      value={marginTopMm}
                      onChange={(e) => setMarginTopMm(parseFloat(e.target.value) || 3)}
                      className="w-full rounded-xl border border-zinc-200 p-2 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      Barcode H (mm)
                    </label>
                    <input
                      type="number"
                      value={barcodeHeightMm}
                      onChange={(e) => setBarcodeHeightMm(parseFloat(e.target.value) || 8)}
                      className="w-full rounded-xl border border-zinc-200 p-2 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Elements & Field Toggles */}
              <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200">
                  2. Printed Field Toggles
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCompany}
                      onChange={(e) => setShowCompany(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">Company Name</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showProduct}
                      onChange={(e) => setShowProduct(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">Product Title</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">Selling Price</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMrp}
                      onChange={(e) => setShowMrp(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">MRP Strike</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showGst}
                      onChange={(e) => setShowGst(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">GST / Tax Info</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBorder}
                      onChange={(e) => setShowBorder(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300">Cut Border</span>
                  </label>
                </div>
              </div>

              {/* Sample Data Inputs */}
              <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-800 dark:text-zinc-200">
                  3. Preview Sample Content
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      Sample Code
                    </label>
                    <input
                      type="text"
                      value={sampleBarcode}
                      onChange={(e) => setSampleBarcode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 p-2 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                      Sample Title
                    </label>
                    <input
                      type="text"
                      value={sampleProductName}
                      onChange={(e) => setSampleProductName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 p-2 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Live Preview (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-100/70 p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/50">
              <div className="mb-4 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Eye className="h-3.5 w-3.5" />
                  Live WYSIWYG Label Preview (1.4" × 1.0")
                </span>
              </div>

              {/* Physical Thermal Sticker Simulation */}
              <div
                id="thermal-sticker-preview"
                style={{
                  width: `${labelWidthMm * 6.5}px`,
                  minHeight: `${labelHeightMm * 6.5}px`,
                }}
                className={`bg-white text-zinc-950 p-2.5 rounded-sm shadow-xl flex flex-col justify-between items-center text-center font-sans ${
                  showBorder ? "border border-dashed border-zinc-400" : ""
                }`}
              >
                {showCompany && (
                  <p className="font-black text-[9px] uppercase tracking-wider leading-tight text-zinc-800">
                    {companyName}
                  </p>
                )}

                {showProduct && (
                  <p className="font-bold text-[8px] leading-tight line-clamp-2 mt-0.5 text-zinc-900">
                    {sampleProductName}
                  </p>
                )}

                {/* Canvas Barcode */}
                <div className="my-1 flex justify-center overflow-hidden">
                  <canvas ref={canvasRef} className="max-w-full" />
                </div>

                <div className="w-full flex items-center justify-between text-[8px] font-bold border-t border-zinc-200 pt-0.5 mt-0.5">
                  {showMrp && (
                    <span className="text-zinc-500 line-through">MRP: ₹{sampleMrp}</span>
                  )}
                  {showPrice && (
                    <span className="text-zinc-950 font-black">Offer: ₹{samplePrice}</span>
                  )}
                </div>

                <div className="w-full flex justify-between text-[7px] text-zinc-500">
                  {showHsn && <span>HSN: {sampleHsn}</span>}
                  {showGst && <span>(Incl. of all taxes)</span>}
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 mt-4 text-center">
                Preserves exact quiet zones, standard X-dimensions, and barcode readability.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: GENERATOR */}
        {activeTab === "generator" && (
          <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-5 text-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Bulk Sequential Barcode Allocator
            </h2>
            <p className="text-zinc-400">
              Generates collision-safe unique sequential barcode identifiers for warehouse & inventory use.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Prefix (Optional)
                </label>
                <input
                  type="text"
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value)}
                  placeholder="e.g. TOY"
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Quantity to Generate
                </label>
                <input
                  type="number"
                  value={genQuantity}
                  onChange={(e) => setGenQuantity(e.target.value)}
                  min="1"
                  max="500"
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={handleBulkGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
            >
              {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate {genQuantity} Unique Codes
            </button>

            {genResults.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <p className="font-bold text-zinc-800 dark:text-zinc-200">
                  Allocated Barcodes ({genResults.length}):
                </p>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-200 p-3 font-mono text-[11px] grid grid-cols-2 sm:grid-cols-3 gap-2 dark:border-zinc-700">
                  {genResults.map((c, i) => (
                    <span key={i} className="text-indigo-600 dark:text-indigo-400">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DIRECTORY */}
        {activeTab === "directory" && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <th className="py-3 px-4">Barcode Number</th>
                    <th className="py-3 px-4">Assigned Product</th>
                    <th className="py-3 px-4">Symbology</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 text-center">Print Count</th>
                    <th className="py-3 px-4">Last Printed</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-400">
                        Loading barcodes...
                      </td>
                    </tr>
                  ) : barcodes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-400">
                        No barcodes found.
                      </td>
                    </tr>
                  ) : (
                    barcodes.map((b) => (
                      <tr key={b._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {b.barcodeNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">
                          {b.productId?.name || b.productName || "Unassigned"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] dark:bg-zinc-800">
                            {b.barcodeType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500">{b.source}</td>
                        <td className="py-3 px-4 text-center font-bold">{b.printCount || 0}</td>
                        <td className="py-3 px-4 text-zinc-400">
                          {b.lastPrintedAt ? new Date(b.lastPrintedAt).toLocaleDateString() : "Never"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
