"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Package,
  Wrench,
  Receipt,
  Users,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Barcode,
  ScanLine,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    products: any[];
    services: any[];
    invoices: any[];
    customers: any[];
  }>({ products: [], services: [], invoices: [], customers: [] });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent can toggle
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ products: [], services: [], invoices: [], customers: [] });
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ products: [], services: [], invoices: [], customers: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        const [prodRes, srvRes, invRes, custRes] = await Promise.all([
          fetch(`/api/v1/products?limit=4&query=${encodeURIComponent(query)}`).then((r) => r.json()),
          fetch(`/api/v1/services?limit=3&query=${encodeURIComponent(query)}`).then((r) => r.json()),
          fetch(`/api/v1/invoices?limit=3&query=${encodeURIComponent(query)}`).then((r) => r.json()),
          fetch(`/api/v1/customers?limit=3&query=${encodeURIComponent(query)}`).then((r) => r.json()),
        ]);

        setResults({
          products: prodRes.success ? prodRes.data || [] : [],
          services: srvRes.success ? srvRes.data || [] : [],
          invoices: invRes.success ? invRes.data || [] : [],
          customers: custRes.success ? custRes.data || [] : [],
        });
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    onClose();
    router.push(path);
  };

  const quickNav = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "POS Terminal", href: "/pos", icon: ShoppingCart },
    { label: "Inventory Stock", href: "/inventory", icon: Boxes },
    { label: "Barcode Studio", href: "/barcodes", icon: Barcode },
    { label: "Scanner Lookup", href: "/scanner", icon: ScanLine },
  ];

  const hasResults =
    results.products.length > 0 ||
    results.services.length > 0 ||
    results.invoices.length > 0 ||
    results.customers.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 z-10 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <Search className="h-5 w-5 text-zinc-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, services, invoices, customers..."
            className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden dark:text-white"
          />
          {isLoading ? (
            <Loader2 className="h-4 w-4 text-indigo-600 animate-spin mr-2" />
          ) : query ? (
            <button
              onClick={() => setQuery("")}
              className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Search Content Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Quick Navigation suggestions if no search query */}
          {!query && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Quick Navigation
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => navigateTo(item.href)}
                      className="flex items-center gap-2.5 rounded-xl border border-zinc-200/80 p-2.5 text-left text-xs font-semibold text-zinc-700 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-all"
                    >
                      <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Results Sections */}
          {query && hasResults && (
            <div className="space-y-4">
              {/* Products */}
              {results.products.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-indigo-500" /> Products
                    </p>
                    <button
                      onClick={() => navigateTo(`/products?query=${encodeURIComponent(query)}`)}
                      className="text-[11px] text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      View all <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {results.products.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => navigateTo(`/products?query=${encodeURIComponent(p.itemNumber)}`)}
                        className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            SKU: {p.itemNumber} | Barcode: {p.barcodeNumber || "N/A"}
                          </p>
                        </div>
                        <div className="text-right ml-2 shrink-0">
                          <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                            ₹{p.sellingPrice}
                          </p>
                          <p className="text-[10px] text-zinc-400">Stock: {p.currentStock}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {results.services.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 px-1 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-amber-500" /> Services
                  </p>
                  <div className="space-y-1">
                    {results.services.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => navigateTo("/services")}
                        className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">Code: {s.serviceCode}</p>
                        </div>
                        <p className="text-xs font-extrabold text-amber-600 dark:text-amber-400 shrink-0">
                          ₹{s.price}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {results.invoices.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 px-1 flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-emerald-500" /> Invoices
                  </p>
                  <div className="space-y-1">
                    {results.invoices.map((inv) => (
                      <button
                        key={inv._id}
                        onClick={() => navigateTo("/invoices")}
                        className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">
                            {inv.invoiceNumber}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {inv.customer?.name || "Walk-in"} • {inv.itemsCount} items
                          </p>
                        </div>
                        <div className="text-right ml-2 shrink-0">
                          <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            ₹{inv.grandTotal}
                          </p>
                          <span className="text-[9px] font-bold uppercase text-emerald-600">
                            {inv.paymentStatus}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {results.customers.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 px-1 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-500" /> Customers
                  </p>
                  <div className="space-y-1">
                    {results.customers.map((c) => (
                      <button
                        key={c._id}
                        onClick={() => navigateTo("/customers")}
                        className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">{c.mobile}</p>
                        </div>
                        <p className="text-xs text-zinc-400 shrink-0">
                          {c.totalInvoices || 0} bills
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No results message */}
          {query && !isLoading && !hasResults && (
            <div className="py-8 text-center">
              <Search className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                No matching results found
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Try searching for SKU, barcode number, invoice ID, or customer name.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-4 py-2 text-[11px] text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
          <span>Search anywhere with ⌘K</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
}
