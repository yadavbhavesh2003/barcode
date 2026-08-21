"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  Receipt,
  Printer,
  ShieldCheck,
  Save,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({
    company_name: "RUNR KIDS RETAIL PVT LTD",
    company_tagline: "Quality Kids Wear & Toys",
    company_address: "Shop 12-14, Galleria Mall, Sector 21",
    company_phone: "+91 98765 43210",
    company_email: "support@runrkids.in",
    company_website: "https://runrkids.in/",
    company_gstin: "27AABCU9603R1ZM",
    invoice_prefix: "INV",
    invoice_terms: "1. Goods once sold will only be exchanged within 7 days. 2. No cash refund.",
    allow_negative_stock: false,
    label_width_mm: "35.56",
    label_height_mm: "25.4",
    label_margin_top_mm: "3",
    label_margin_left_mm: "3",
    label_gap_v_mm: "3",
    label_gap_h_mm: "3",
    currency: "INR",
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/settings");
      const json = await res.json();
      if (json.success && json.data) {
        setSettings((prev: any) => ({ ...prev, ...json.data }));
      }
    } catch (e) {
      console.error("Settings fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert(json.error?.message || "Failed to update settings");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50/50 p-4 sm:p-6 lg:p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              System Administration & Configuration
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage store profile, GSTIN tax configuration, POS receipt terms, and printer specifications.
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All Settings
          </button>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Configuration saved and applied across all modules successfully!
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
          {/* SECTION 1: Company Profile */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              <Building2 className="h-4 w-4" />
              <span>Company & Store Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Legal Company Name *
                </label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  GSTIN Tax Number *
                </label>
                <input
                  type="text"
                  value={settings.company_gstin}
                  onChange={(e) => setSettings({ ...settings, company_gstin: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 font-mono outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Store Address
                </label>
                <input
                  type="text"
                  value={settings.company_address}
                  onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={settings.company_phone}
                  onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: POS Billing & Invoicing */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              <Receipt className="h-4 w-4" />
              <span>POS Invoicing & Sequence Rules</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={settings.invoice_prefix}
                  onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 font-mono outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                <p className="text-[10px] text-zinc-400 mt-1">Format: {settings.invoice_prefix}/YYYY-YY/XXXXXX</p>
              </div>

              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_negative_stock === true}
                    onChange={(e) =>
                      setSettings({ ...settings, allow_negative_stock: e.target.checked })
                    }
                    className="rounded text-indigo-600"
                  />
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Allow Selling when Stock is Zero (Negative Stock)
                  </span>
                </label>
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Receipt Terms & Conditions
                </label>
                <textarea
                  rows={2}
                  value={settings.invoice_terms}
                  onChange={(e) => setSettings({ ...settings, invoice_terms: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Default 1-Up Thermal Label Specs */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
              <Printer className="h-4 w-4" />
              <span>Thermal Printer Calibration (1-Up Roll Sticker Default)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Default Width (mm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.label_width_mm}
                  onChange={(e) => setSettings({ ...settings, label_width_mm: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Default Height (mm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.label_height_mm}
                  onChange={(e) => setSettings({ ...settings, label_height_mm: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Top Margin (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.label_margin_top_mm}
                  onChange={(e) =>
                    setSettings({ ...settings, label_margin_top_mm: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Vertical Gap (mm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.label_gap_v_mm}
                  onChange={(e) => setSettings({ ...settings, label_gap_v_mm: e.target.value })}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
