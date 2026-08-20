"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Printer, Loader2, CheckCircle2, Sliders, Globe, LayoutGrid } from "lucide-react";

export function SettingsForm() {
  const [settings, setSettings] = useState<Record<string, string>>({
    website: "https://runrkids.in/",
    net_quantity: "1U",
    label_width_mm: "50",
    label_height_mm: "25",
    printer_offset_x_mm: "0",
    printer_offset_y_mm: "0",
    printer_scale_pct: "100",
    currency: "INR",
    barcode_height_mm: "6.5",
    barcode_rotation: "0",
    layout_preset: "standard",
    a4_margin_top_mm: "10",
    a4_margin_left_mm: "12",
    a4_gap_x_mm: "4",
    a4_gap_y_mm: "3",
    a4_columns: "2",
    a4_rows: "5",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch((err) => console.error("Failed to load settings:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(true);
        setTimeout(() => setSuccessMsg(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12 text-zinc-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* 1. General Branding & Defaults */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            Label & Brand Defaults
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Footer Website URL
            </label>
            <input
              type="text"
              value={settings.website}
              onChange={(e) => handleChange("website", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Default Net Quantity
            </label>
            <input
              type="text"
              value={settings.net_quantity}
              onChange={(e) => handleChange("net_quantity", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Label Physical Width (mm)
            </label>
            <input
              type="number"
              value={settings.label_width_mm}
              onChange={(e) => handleChange("label_width_mm", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Label Physical Height (mm)
            </label>
            <input
              type="number"
              value={settings.label_height_mm}
              onChange={(e) => handleChange("label_height_mm", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* 2. Barcode Orientation & Layout Template Defaults */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <Sliders className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            Default Barcode Orientation & Layout Template
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Default Layout Preset
            </label>
            <select
              value={settings.layout_preset || "standard"}
              onChange={(e) => handleChange("layout_preset", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            >
              <option value="standard">Standard (Top Horizontal Barcode)</option>
              <option value="barcode_bottom">Barcode Bottom (Horizontal Barcode at Bottom)</option>
              <option value="vertical_left">Vertical Left (Rotated Barcode on Left Side)</option>
              <option value="vertical_right">Vertical Right (Rotated Barcode on Right Side)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Default Barcode Rotation Angle
            </label>
            <select
              value={settings.barcode_rotation || "0"}
              onChange={(e) => handleChange("barcode_rotation", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            >
              <option value="0">0° (Normal Horizontal)</option>
              <option value="90">90° (Vertical Right Clockwise)</option>
              <option value="180">180° (Inverted Upside-Down)</option>
              <option value="270">270° (Vertical Left Counter-Clockwise)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Default Sticker Sheet Grid Setup */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <LayoutGrid className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            Default Sticker Sheet Layout (Photo Matching)
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Default Columns Across
            </label>
            <input
              type="number"
              min="1"
              max="4"
              value={settings.a4_columns}
              onChange={(e) => handleChange("a4_columns", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Default Rows Down
            </label>
            <input
              type="number"
              min="1"
              max="15"
              value={settings.a4_rows}
              onChange={(e) => handleChange("a4_rows", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Barcode Image Height (mm)
            </label>
            <input
              type="number"
              step="0.5"
              value={settings.barcode_height_mm}
              onChange={(e) => handleChange("barcode_height_mm", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Left Margin (mm)
            </label>
            <input
              type="number"
              value={settings.a4_margin_left_mm}
              onChange={(e) => handleChange("a4_margin_left_mm", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Top Margin (mm)
            </label>
            <input
              type="number"
              value={settings.a4_margin_top_mm}
              onChange={(e) => handleChange("a4_margin_top_mm", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Horizontal Gap (mm)
            </label>
            <input
              type="number"
              value={settings.a4_gap_x_mm}
              onChange={(e) => handleChange("a4_gap_x_mm", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* 3. Printer Calibration Offsets */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            Printer Hardware Calibration
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Horizontal Offset X (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.printer_offset_x_mm}
              onChange={(e) => handleChange("printer_offset_x_mm", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Vertical Offset Y (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.printer_offset_y_mm}
              onChange={(e) => handleChange("printer_offset_y_mm", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Print Scale (%)
            </label>
            <input
              type="number"
              value={settings.printer_scale_pct}
              onChange={(e) => handleChange("printer_scale_pct", e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        {/* TSC PRINTER HARDWARE SETUP & CALIBRATION GUIDE */}
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <h4 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-amber-600" />
            TSC Thermal Printer Driver & Calibration Guide (Fixes Blank Paper Feeding)
          </h4>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
            <div className="space-y-1">
              <span className="font-semibold text-amber-900 dark:text-amber-300">1. Windows Printer Preferences:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Go to Control Panel → Devices and Printers → TSC Printer Preferences.</li>
                <li>Create Stock: <strong>Width 104.0mm, Height 25.0mm</strong> (for 2-Up roll).</li>
                <li>Set Type: <strong>Labels with Gaps</strong> (Gap height 2.0mm or 3.0mm).</li>
              </ul>
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-amber-900 dark:text-amber-300">2. Chrome Print Dialog Settings:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Paper Size: Select <strong>104 × 25 mm</strong> (Do NOT select A4).</li>
                <li>Scale: Select <strong>Actual Size (100%)</strong>.</li>
                <li>Margins: Select <strong>None</strong>.</li>
                <li>Calibrate Sensor: Turn printer ON while holding <strong>FEED</strong> button.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Save & Test Label Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href="/api/test-label"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all"
        >
          <Printer className="h-4 w-4" /> Print Test Calibration Label (50×25mm)
        </a>

        <div className="flex items-center gap-3">
          {successMsg && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Settings updated successfully!
            </span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </button>
        </div>
      </div>
    </form>
  );
}
