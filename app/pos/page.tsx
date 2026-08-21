"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Search,
  ScanLine,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Receipt,
  User,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  Sparkles,
  RefreshCw,
  Zap,
  Percent,
  ArrowRight,
  Split,
} from "lucide-react";
import { calculateLineItem, calculateInvoiceTotals } from "@/lib/utils/financials";

export default function POSBillingPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [lastScannedNotification, setLastScannedNotification] = useState<string | null>(null);

  // Customer State
  const [customer, setCustomer] = useState({
    name: "Walk-in Customer",
    mobile: "",
    email: "",
    gstin: "",
  });
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Unknown Barcode Modal State
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [quickProductName, setQuickProductName] = useState("");
  const [quickProductPrice, setQuickProductPrice] = useState("");

  // Payment & Checkout State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [tenderedAmount, setTenderedAmount] = useState<string>("");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [isProcessingBill, setIsProcessingBill] = useState(false);

  // Success / Receipt State
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Global scanner buffer
  const scanBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute Live Cart Totals
  const totals = useMemo(() => {
    return calculateInvoiceTotals(cart);
  }, [cart]);

  // Categories list
  const categories = ["All", "General", "Apparel", "Toys", "Footwear", "Stationery", "Accessories"];

  // 1. Initial product load & search
  useEffect(() => {
    performSearch("");
  }, [selectedCategory]);

  const performSearch = async (query: string) => {
    try {
      setIsSearching(true);
      const categoryParam = selectedCategory !== "All" ? `&category=${selectedCategory}` : "";
      const res = await fetch(`/api/v1/products?query=${encodeURIComponent(query)}${categoryParam}&limit=12`);
      const json = await res.json();
      if (json.success) {
        setSearchResults(json.data || []);
      }
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setIsSearching(false);
    }
  };

  // 2. Hardware Keyboard / USB Barcode Scanner Listener & Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkeys
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        const code = prompt("Scan or enter barcode number:");
        if (code) handleBarcodeScanned(code);
        return;
      }
      if (e.key === "F8") {
        e.preventDefault();
        if (cart.length > 0) {
          setIsPaymentModalOpen(true);
        }
        return;
      }
      if (e.key === "Escape") {
        setIsPaymentModalOpen(false);
        setIsCustomerModalOpen(false);
        setUnknownBarcode(null);
        setIsReceiptModalOpen(false);
        return;
      }

      // Check if user is typing inside an explicit input form
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (scanBufferRef.current.length >= 3) {
          const scannedCode = scanBufferRef.current.trim();
          scanBufferRef.current = "";
          handleBarcodeScanned(scannedCode);
        }
      } else if (e.key.length === 1) {
        if (timeDiff > 100) {
          scanBufferRef.current = "";
        }
        scanBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  // 3. Handle Scanned Code
  const handleBarcodeScanned = async (code: string) => {
    try {
      const res = await fetch(`/api/v1/scanner/lookup?code=${encodeURIComponent(code)}`);
      const json = await res.json();

      if (json.success && json.data) {
        addProductToCart(json.data);
        showScanToast(`✓ ${json.data.name} added!`);
      } else {
        setUnknownBarcode(code);
        setQuickProductName("");
        setQuickProductPrice("");
      }
    } catch (e) {
      console.error("Scanner lookup error:", e);
    }
  };

  const showScanToast = (msg: string) => {
    setLastScannedNotification(msg);
    setTimeout(() => {
      setLastScannedNotification(null);
    }, 2500);
  };

  // 4. Add Product to Cart (Auto-increments if already present)
  const addProductToCart = (product: any) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product._id || item.productId === product.productId
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const currentItem = updated[existingIndex];
        const newQty = currentItem.quantity + 1;
        updated[existingIndex] = calculateLineItem({
          productId: currentItem.productId,
          barcodeNumber: currentItem.barcodeNumber,
          productName: currentItem.productName,
          hsnSac: currentItem.hsnSac,
          mrp: currentItem.mrp,
          unitPrice: currentItem.unitPrice,
          quantity: newQty,
          discountPct: currentItem.discountPct,
          gstRate: currentItem.gstRate,
        });
        return updated;
      } else {
        const newLine = calculateLineItem({
          productId: product._id || product.productId,
          barcodeNumber: product.barcodeNumber || product.itemNumber,
          productName: product.name || product.productName,
          hsnSac: product.hsnSac || "9503",
          mrp: product.mrp,
          unitPrice: product.sellingPrice || product.unitPrice || product.mrp,
          quantity: 1,
          discountPct: product.discountPct || 0,
          gstRate: product.gstRate || 5,
        });
        return [...prev, newLine];
      }
    });
  };

  // 5. Update Item Quantity in Cart
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      updated[index] = calculateLineItem({
        productId: item.productId,
        barcodeNumber: item.barcodeNumber,
        productName: item.productName,
        hsnSac: item.hsnSac,
        mrp: item.mrp,
        unitPrice: item.unitPrice,
        quantity: newQty,
        discountPct: item.discountPct,
        gstRate: item.gstRate,
      });
      return updated;
    });
  };

  // 6. Update Line Discount
  const updateDiscount = (index: number, discountPct: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];
      updated[index] = calculateLineItem({
        productId: item.productId,
        barcodeNumber: item.barcodeNumber,
        productName: item.productName,
        hsnSac: item.hsnSac,
        mrp: item.mrp,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountPct: Math.max(0, Math.min(100, discountPct)),
        gstRate: item.gstRate,
      });
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  // 7. Quick Create Unknown Product & Add to Cart
  const handleQuickCreateProduct = async () => {
    if (!unknownBarcode || !quickProductName || !quickProductPrice) return;
    try {
      const res = await fetch("/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: quickProductName,
          barcodeNumber: unknownBarcode,
          itemNumber: unknownBarcode,
          mrp: parseFloat(quickProductPrice),
          sellingPrice: parseFloat(quickProductPrice),
          openingStock: 50,
          category: "General",
        }),
      });
      const json = await res.json();
      if (json.success) {
        addProductToCart(json.data);
        showScanToast(`✓ Created and added ${json.data.name}!`);
        setUnknownBarcode(null);
      } else {
        alert(json.error?.message || "Failed to create product");
      }
    } catch (e) {
      console.error("Quick create error:", e);
    }
  };

  // 8. Process Checkout and Create Invoice
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      setIsProcessingBill(true);
      const paid = tenderedAmount ? parseFloat(tenderedAmount) : totals.grandTotal;

      const payload = {
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPct: item.discountPct,
        })),
        customer: {
          name: customer.name || "Walk-in Customer",
          mobile: customer.mobile || undefined,
          email: customer.email || undefined,
          gstin: customer.gstin || undefined,
        },
        paymentMethod,
        paidAmount: paid,
        paymentReference: paymentRef || undefined,
        billedBy: user?.name || "POS Cashier",
      };

      const res = await fetch("/api/v1/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setCompletedInvoice(json.data);
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);
        clearCart();
        setTenderedAmount("");
        setPaymentRef("");
      } else {
        alert(json.error?.message || "Invoice creation failed");
      }
    } catch (e: any) {
      alert("Billing Error: " + e.message);
    } finally {
      setIsProcessingBill(false);
    }
  };

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* ==================================================== */}
      {/* LEFT PANE: Product Catalog & Search                 */}
      {/* ==================================================== */}
      <div className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {/* Top Shortcut Banner */}
        <div className="flex items-center justify-between px-4 py-2 bg-indigo-900 text-indigo-100 text-[11px] font-medium border-b border-indigo-950/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-indigo-800 px-1 py-0.2 text-[10px] font-mono">F2</kbd> Search
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-indigo-800 px-1 py-0.2 text-[10px] font-mono">F4</kbd> Scanner
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-indigo-800 px-1 py-0.2 text-[10px] font-mono">F8</kbd> Checkout
            </span>
          </div>

          {lastScannedNotification && (
            <span className="text-emerald-300 font-semibold animate-pulse truncate max-w-xs">
              {lastScannedNotification}
            </span>
          )}
        </div>

        {/* Search Bar & Category Filters */}
        <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  performSearch(e.target.value);
                }}
                placeholder="Scan barcode or search name / SKU (Press F2)..."
                className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-8 py-2 text-xs outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    performSearch("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                const code = prompt("Scan or enter barcode number:");
                if (code) handleBarcodeScanned(code);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 shrink-0 active:scale-95 transition-all"
            >
              <ScanLine className="h-4 w-4" />
              Scan (F4)
            </button>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all shrink-0 ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-3.5">
          {isSearching ? (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
              <RefreshCw className="h-5 w-5 animate-spin mr-2 text-indigo-500" /> Searching catalog...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-center p-6">
              <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                No products found
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 max-w-xs">
                Scan barcode or try another keyword
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {searchResults.map((product) => {
                const inCart = cart.find((c) => c.productId === product._id);
                return (
                  <div
                    key={product._id}
                    onClick={() => {
                      addProductToCart(product);
                      showScanToast(`✓ ${product.name} added!`);
                    }}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3 cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                      inCart
                        ? "border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/30 shadow-xs"
                        : "border-zinc-200/80 bg-white hover:border-indigo-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[9px] text-zinc-400 font-semibold">
                          {product.itemNumber || product.barcodeNumber}
                        </span>
                        <span className="rounded bg-zinc-100 px-1 py-0.2 text-[9px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {product.gstRate}%
                        </span>
                      </div>
                      <h3 className="mt-1 font-semibold text-xs text-zinc-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {product.name}
                      </h3>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-zinc-900 dark:text-white">
                          {formatCurrency(product.sellingPrice)}
                        </div>
                        {product.mrp > product.sellingPrice && (
                          <div className="text-[9px] text-zinc-400 line-through">
                            {formatCurrency(product.mrp)}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-400">
                        Qty: {product.currentStock}
                      </span>
                    </div>

                    {inCart && (
                      <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-md">
                        {inCart.quantity}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* RIGHT PANE: POS Cart & Instant Checkout              */}
      {/* ==================================================== */}
      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-white dark:bg-zinc-900 border-t lg:border-t-0 shadow-lg">
        {/* Cart Header */}
        <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-xs text-zinc-900 dark:text-white">Cart Details</h2>
              <p className="text-[10px] text-zinc-400">{totals.itemsCount} lines ({totals.totalQuantity} items)</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <User className="h-3 w-3 text-indigo-500" />
              <span className="max-w-[90px] truncate">{customer.name}</span>
            </button>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                title="Clear Cart"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Cart Line Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-center p-6 text-zinc-400">
              <ShoppingCart className="h-10 w-10 mb-2 stroke-[1.5] text-zinc-300 dark:text-zinc-700" />
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Cart is empty</p>
              <p className="text-[11px] mt-0.5">Scan barcodes or click catalog items on the left</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={`${item.productId}-${idx}`}
                className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/40 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {item.productName}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-400">
                      Code: {item.barcodeNumber} • GST: {item.gstRate}%
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </div>
                </div>

                {/* Steppers & Line Discount */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="flex h-5 w-5 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 active:scale-95"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(idx, parseInt(e.target.value, 10) || 1)}
                      className="w-8 text-center font-extrabold text-xs bg-transparent outline-none"
                    />
                    <button
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="flex h-5 w-5 items-center justify-center rounded-md bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 active:scale-95"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-400">Disc:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discountPct || ""}
                      placeholder="0%"
                      onChange={(e) => updateDiscount(idx, parseFloat(e.target.value) || 0)}
                      className="w-10 rounded border border-zinc-200 bg-white px-1 py-0.5 text-center text-[10px] outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                    />
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="p-1 text-zinc-300 hover:text-rose-500 ml-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Financial Breakdown & Action */}
        <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 space-y-2.5">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Total Discount</span>
                <span>-{formatCurrency(totals.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
              <span>Taxable Value</span>
              <span>{formatCurrency(totals.taxableAmount)}</span>
            </div>
            <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
              <span>GST (CGST + SGST)</span>
              <span>{formatCurrency(totals.totalGst)}</span>
            </div>
            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-zinc-400 text-[10px]">
                <span>Round Off</span>
                <span>{totals.roundOff > 0 ? `+${totals.roundOff}` : totals.roundOff}</span>
              </div>
            )}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between text-base font-extrabold text-zinc-900 dark:text-white">
              <span>Grand Total</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={cart.length === 0}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all ${
              cart.length === 0
                ? "bg-zinc-300 dark:bg-zinc-800 cursor-not-allowed text-zinc-500"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-500/20 active:scale-98"
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Pay & Generate Bill</span>
            <kbd className="rounded bg-black/20 px-1 py-0.5 text-[10px] font-mono">F8</kbd>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: Payment & Quick Cash Tender Dialog          */}
      {/* ==================================================== */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Collect Payment</h3>
                <p className="text-xs text-zinc-500">Bill Amount: <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{formatCurrency(totals.grandTotal)}</strong></p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "CASH", label: "Cash", icon: Banknote },
                { id: "UPI", label: "UPI / QR", icon: QrCode },
                { id: "CARD", label: "Card", icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition-all ${
                      paymentMethod === m.id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shadow-xs"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Cash Tender Chips */}
            {paymentMethod === "CASH" && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                  Quick Cash Received
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[totals.grandTotal, 500, 1000, 2000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTenderedAmount(String(amt))}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-indigo-50 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder={String(totals.grandTotal)}
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-extrabold outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />

                {tenderedAmount && parseFloat(tenderedAmount) >= totals.grandTotal && (
                  <div className="flex justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-xl">
                    <span>Change Due to Customer:</span>
                    <span>{formatCurrency(parseFloat(tenderedAmount) - totals.grandTotal)}</span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod !== "CASH" && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                  Transaction / UTR Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI-12345678"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={isProcessingBill}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition-all active:scale-98"
            >
              {isProcessingBill ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Finalizing Bill...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Complete & Print Slip
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: Unknown Barcode Scanned Flow                */}
      {/* ==================================================== */}
      {unknownBarcode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertCircle className="h-6 w-6" />
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Barcode Not Found
                </h3>
                <p className="font-mono text-xs text-zinc-500">{unknownBarcode}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              This code is not in your product master. Register it now:
            </p>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Product Name *"
                value={quickProductName}
                onChange={(e) => setQuickProductName(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <input
                type="number"
                placeholder="Selling Price (₹) *"
                value={quickProductPrice}
                onChange={(e) => setQuickProductPrice(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setUnknownBarcode(null)}
                className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              >
                Dismiss
              </button>
              <button
                onClick={handleQuickCreateProduct}
                disabled={!quickProductName || !quickProductPrice}
                className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Create & Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: Customer Quick Add / Details                */}
      {/* ==================================================== */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-3.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Customer Profile</h3>
              <button onClick={() => setIsCustomerModalOpen(false)}>
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Customer Name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <input
                type="text"
                placeholder="Mobile Number"
                value={customer.mobile}
                onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <input
                type="text"
                placeholder="GSTIN (Optional)"
                value={customer.gstin}
                onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <button
              onClick={() => setIsCustomerModalOpen(false)}
              className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: Printable Thermal Receipt Preview           */}
      {/* ==================================================== */}
      {isReceiptModalOpen && completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Bill Generated!
              </div>
              <button onClick={() => setIsReceiptModalOpen(false)}>
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            {/* Thermal Paper Styling */}
            <div
              id="printable-receipt"
              className="font-mono text-[11px] p-4 rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 space-y-2"
            >
              <div className="text-center pb-2 border-b border-dashed border-zinc-300 dark:border-zinc-600">
                <p className="font-extrabold text-xs uppercase">RUNR KIDS RETAIL PVT LTD</p>
                <p className="text-[10px]">Shop 12-14 Galleria Mall Sector 21</p>
                <p className="text-[10px]">GSTIN: 27AABCU9603R1ZM</p>
              </div>

              <div className="flex justify-between text-[10px]">
                <span>Bill: {completedInvoice.invoiceNumber}</span>
                <span>{new Date(completedInvoice.invoiceDate).toLocaleTimeString()}</span>
              </div>
              <div className="text-[10px]">
                <span>Cust: {completedInvoice.customer?.name}</span>
              </div>

              <div className="py-1 border-y border-dashed border-zinc-300 dark:border-zinc-600 space-y-1">
                {completedInvoice.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate max-w-[160px]">
                      {item.productName} x{item.quantity}
                    </span>
                    <span>₹{item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 pt-1">
                <div className="flex justify-between text-[10px]">
                  <span>Taxable Value:</span>
                  <span>₹{completedInvoice.taxableAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Total GST:</span>
                  <span>₹{completedInvoice.totalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-zinc-300 dark:border-zinc-600">
                  <span>Grand Total:</span>
                  <span>₹{completedInvoice.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] text-zinc-500 border-t border-dashed border-zinc-300 dark:border-zinc-600">
                Thank you for your business!
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
