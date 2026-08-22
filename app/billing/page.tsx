"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Scan,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Printer,
  Download,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Search,
  Receipt,
  FileText,
  Clock,
  Sparkles,
  AlertCircle,
  Undo2,
  Package,
  MessageSquare,
  Send,
  Share2,
  Smartphone,
  Loader2,
} from "lucide-react";
import { formatAmount, formatCurrency } from "@/lib/utils";

interface CartItem {
  productId?: string;
  barcode: string;
  productName: string;
  hsn: string;
  mrp: number;
  salesPrice: number;
  quantity: number;
  totalAmount: number;
}

export default function BillingPage() {
  const [scanInput, setScanInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState<"Cash" | "UPI" | "Card">("Cash");
  const [discount, setDiscount] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [pdfFormat, setPdfFormat] = useState<"a4" | "thermal">("a4");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<{
    invoiceId: string;
    invoiceNumber: string;
    grandTotal: number;
    pdfBase64: string;
    customerPhone?: string;
    normalizedPhone?: string;
    whatsappDeepLink?: string;
    whatsappMessage?: string;
    cloudApiSent?: boolean;
    hasMetaConfig?: boolean;
  } | null>(null);

  // WhatsApp state
  const [whatsappPhoneInput, setWhatsappPhoneInput] = useState("");
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappFeedback, setWhatsappFeedback] = useState<{
    type: "success" | "error" | "info";
    msg: string;
  } | null>(null);

  // History WhatsApp Dialog State
  const [historyWhatsAppTarget, setHistoryWhatsAppTarget] = useState<any | null>(null);
  const [historyPhoneInput, setHistoryPhoneInput] = useState("");
  const [isHistoryWhatsAppSending, setIsHistoryWhatsAppSending] = useState(false);

  // Past bills list
  const [pastBills, setPastBills] = useState<any[]>([]);
  const [showPastBills, setShowPastBills] = useState(false);
  const [searchBillQuery, setSearchBillQuery] = useState("");

  const scanInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus scanner input
  useEffect(() => {
    scanInputRef.current?.focus();
  }, [generatedInvoice, showPastBills]);

  // Play crisp scanner beep using Web Audio API
  const playBeep = (freq = 1200, duration = 0.08) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio not permitted or supported
    }
  };

  const playErrorBeep = () => {
    playBeep(300, 0.2);
  };

  // Process and add barcode to cart automatically
  const processBarcode = useCallback(async (barcodeToSearch: string) => {
    const barcode = barcodeToSearch.trim();
    if (!barcode) return;

    setIsScanning(true);
    setScanStatus(`Scanning barcode ${barcode}...`);
    setStatusType("info");

    try {
      const res = await fetch(`/api/barcodes/search?code=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (data.success && data.record) {
        const item = data.record;
        playBeep(1400, 0.09);

        // Add or increment item in cart
        setCart((prevCart) => {
          const existingIndex = prevCart.findIndex((c) => c.barcode === barcode);
          if (existingIndex >= 0) {
            // Increment existing item
            const updated = [...prevCart];
            const current = updated[existingIndex];
            const newQty = current.quantity + 1;
            const lineTotal = current.salesPrice * newQty;
            updated[existingIndex] = {
              ...current,
              quantity: newQty,
              totalAmount: lineTotal,
            };
            return updated;
          } else {
            // Add new item to cart
            const salesPrice = Number(item.salesPrice) || Number(item.mrp) || 0;
            const mrp = Number(item.mrp) || salesPrice;

            return [
              ...prevCart,
              {
                productId: item.productId || item.barcodeId,
                barcode: item.barcode,
                productName: item.productName || "Unknown Toy",
                hsn: item.hsn || "9503",
                mrp,
                salesPrice,
                quantity: 1,
                totalAmount: salesPrice,
              },
            ];
          }
        });

        setScanStatus(`✓ Added "${item.productName}" (Barcode: ${barcode})`);
        setStatusType("success");
      } else {
        playErrorBeep();
        setScanStatus(`✗ Barcode "${barcode}" not found in database.`);
        setStatusType("error");
      }
    } catch (err: any) {
      playErrorBeep();
      setScanStatus(`Scan failed: ${err.message}`);
      setStatusType("error");
    } finally {
      setIsScanning(false);
      setScanInput("");
      scanInputRef.current?.focus();
    }
  }, []);

  // Global Barcode Scanner Gun Keystroke Interceptor
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // If user is typing in customer details input, do not intercept
      if (isInput && target !== scanInputRef.current) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.trim().length > 0) {
          e.preventDefault();
          const code = barcodeBuffer.trim();
          barcodeBuffer = "";
          setScanInput("");
          processBarcode(code);
        }
        return;
      }

      // Gun keystrokes come in very rapidly (< 60ms)
      if (e.key.length === 1) {
        if (timeDiff > 100) {
          barcodeBuffer = e.key;
        } else {
          barcodeBuffer += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [processBarcode]);

  // Handle manual or gun submission via form
  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (scanInput.trim()) {
      processBarcode(scanInput.trim());
    }
  };

  // Automatic submit on scanner input change (when full barcode scanned)
  const handleInputChange = (val: string) => {
    setScanInput(val);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    // If 8 or more digits entered from a scan gun, auto-submit within 120ms
    if (val.trim().length >= 8) {
      typingTimerRef.current = setTimeout(() => {
        processBarcode(val.trim());
      }, 120);
    }
  };

  // Quantity updates
  const updateQuantity = (barcode: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.barcode === barcode) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalAmount: item.salesPrice * newQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove single item from cart
  const removeItem = (barcode: string) => {
    const itemToRemove = cart.find((c) => c.barcode === barcode);
    setCart((prev) => prev.filter((item) => item.barcode !== barcode));
    if (itemToRemove) {
      setScanStatus(`Removed "${itemToRemove.productName}" from bill.`);
      setStatusType("info");
    }
    scanInputRef.current?.focus();
  };

  // Remove last scanned item
  const removeLastItem = () => {
    if (cart.length === 0) return;
    const lastItem = cart[cart.length - 1];
    setCart((prev) => prev.slice(0, -1));
    setScanStatus(`Removed "${lastItem.productName}" from bill.`);
    setStatusType("info");
    scanInputRef.current?.focus();
  };

  // Complete Form & Cart Reset (Main POS Screen)
  const resetBillingForm = useCallback(() => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMode("Cash");
    setDiscount(0);
    setOtherCharges(0);
    setScanInput("");
    setScanStatus(null);
    setStatusType("info");
    setTimeout(() => scanInputRef.current?.focus(), 50);
  }, []);

  // Clear entire cart and customer inputs
  const clearCart = () => {
    if (cart.length === 0 && customerPhone === "" && customerName === "") return;
    if (confirm("Reset and clear this customer bill form?")) {
      resetBillingForm();
    }
  };

  // Financial calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = Math.max(0, subtotal - Number(discount || 0) + Number(otherCharges || 0));

  // Phone number validator helper
  const isValidPhone = (rawPhone: string) => {
    if (!rawPhone) return false;
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
    if (digits.length === 11 && digits.startsWith("0")) return /^[6-9]/.test(digits.slice(1));
    if (digits.length === 12 && digits.startsWith("91")) return /^[6-9]/.test(digits.slice(2));
    return digits.length >= 10 && digits.length <= 15;
  };

  // Submit / Generate Estimate / Bill
  const handleGenerateBill = async () => {
    if (cart.length === 0) {
      alert("Cart is empty! Scan items with the barcode gun first.");
      return;
    }

    const currentCustomerName = customerName.trim();
    if (!currentCustomerName) {
      alert("Customer name is mandatory. Please enter the customer's name before generating the bill.");
      return;
    }

    const currentCustomerPhone = customerPhone.trim();
    if (!currentCustomerPhone) {
      alert("Customer mobile number is mandatory. Please enter a 10-digit mobile number before generating the bill.");
      return;
    }
    if (!isValidPhone(currentCustomerPhone)) {
      alert("Please enter a valid 10-digit mobile number (e.g. 9876543210).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: currentCustomerName,
          customerPhone: currentCustomerPhone,
          paymentMode,
          discount: Number(discount || 0),
          otherCharges: Number(otherCharges || 0),
          pdfFormat,
          items: cart,
        }),
      });

      const data = await res.json();
      if (data.success) {
        playBeep(1800, 0.15);
        setGeneratedInvoice({
          invoiceId: data.invoiceId,
          invoiceNumber: data.invoiceNumber,
          grandTotal: data.grandTotal,
          pdfBase64: data.pdfBase64,
          customerPhone: data.customerPhone || currentCustomerPhone,
          normalizedPhone: data.normalizedPhone,
          whatsappDeepLink: data.whatsappDeepLink,
          whatsappMessage: data.whatsappMessage,
          cloudApiSent: data.cloudApiSent,
          hasMetaConfig: data.hasMetaConfig,
        });
        setWhatsappPhoneInput(data.customerPhone || currentCustomerPhone || "");
        setWhatsappFeedback(null);

        // Reset the background POS form completely for the next sale
        resetBillingForm();
      } else {
        alert(`Failed to generate bill: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error generating bill: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Share in WhatsApp (Web/App deep link - Free Method 3)
  const handleShareWhatsAppWeb = async () => {
    if (!generatedInvoice) return;
    const phoneToUse = (whatsappPhoneInput || generatedInvoice.customerPhone || "").trim();

    if (phoneToUse && !isValidPhone(phoneToUse)) {
      setWhatsappFeedback({
        type: "error",
        msg: "Please enter a valid 10-digit mobile number (e.g. 9876543210).",
      });
      return;
    }

    setIsSendingWhatsApp(true);
    setWhatsappFeedback({ type: "info", msg: "Opening WhatsApp..." });

    try {
      const res = await fetch(`/api/bills/${generatedInvoice.invoiceId}/whatsapp?phone=${encodeURIComponent(phoneToUse)}`);
      const data = await res.json();

      if (data.success && data.deepLinkUrl) {
        window.open(data.deepLinkUrl, "_blank");
        setWhatsappFeedback({
          type: "success",
          msg: `✓ WhatsApp Web/App opened for ${data.phone ? "+" + data.phone : "customer"}! Click Send in WhatsApp.`,
        });
      } else {
        setWhatsappFeedback({
          type: "error",
          msg: data.error || "Failed to generate WhatsApp share link.",
        });
      }
    } catch (err: any) {
      setWhatsappFeedback({
        type: "error",
        msg: `Connection error: ${err.message}`,
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // 2. Send via Meta WhatsApp Cloud API (Automated Background Send - Method 1)
  const handleSendWhatsAppCloudApi = async () => {
    if (!generatedInvoice) return;
    const phoneToUse = (whatsappPhoneInput || generatedInvoice.customerPhone || "").trim();

    if (!phoneToUse || !isValidPhone(phoneToUse)) {
      setWhatsappFeedback({
        type: "error",
        msg: "Please enter a valid 10-digit mobile number (e.g. 9876543210).",
      });
      return;
    }

    setIsSendingWhatsApp(true);
    setWhatsappFeedback({ type: "info", msg: "Sending message via Meta WhatsApp Cloud API..." });

    try {
      const res = await fetch(`/api/bills/${generatedInvoice.invoiceId}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneToUse, sendViaCloudApi: true }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.cloudApiResult?.sent) {
          setWhatsappFeedback({
            type: "success",
            msg: `✓ Bill sent directly to customer (+${data.phone}) via Meta WhatsApp Cloud API!`,
          });
        } else {
          // Cloud API returned error or was not configured
          setWhatsappFeedback({
            type: "error",
            msg: `Meta API: ${data.cloudApiResult?.error || "Credentials not configured in Settings. Use 'Share in WhatsApp' or enter credentials in Settings."}`,
          });
        }
      } else {
        setWhatsappFeedback({
          type: "error",
          msg: data.error || "Failed to dispatch via WhatsApp API.",
        });
      }
    } catch (err: any) {
      setWhatsappFeedback({
        type: "error",
        msg: `API error: ${err.message}`,
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // WhatsApp Action for Past Bills
  const handleOpenHistoryWhatsApp = (bill: any) => {
    setHistoryWhatsAppTarget(bill);
    setHistoryPhoneInput(bill.customerPhone || "");
  };

  const handleSendHistoryWhatsApp = async () => {
    if (!historyWhatsAppTarget) return;
    setIsHistoryWhatsAppSending(true);

    try {
      const res = await fetch(`/api/bills/${historyWhatsAppTarget._id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: historyPhoneInput.trim(),
          sendViaCloudApi: true,
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.cloudApiResult?.sent) {
          alert(`✓ Bill receipt successfully sent to +${data.phone} via Meta Cloud API!`);
        } else {
          window.open(data.deepLinkUrl, "_blank");
        }
        setHistoryWhatsAppTarget(null);
      } else {
        alert(`WhatsApp error: ${data.error || "Failed to process WhatsApp request"}`);
      }
    } catch (err: any) {
      alert(`Error sending WhatsApp bill: ${err.message}`);
    } finally {
      setIsHistoryWhatsAppSending(false);
    }
  };

  // Print PDF directly
  const handlePrintDirectly = () => {
    if (!generatedInvoice?.pdfBase64) return;
    const byteCharacters = atob(generatedInvoice.pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedInvoice?.pdfBase64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${generatedInvoice.pdfBase64}`;
    link.download = `${generatedInvoice.invoiceNumber}.pdf`;
    link.click();
  };

  // Fetch past invoices
  const fetchPastBills = async () => {
    try {
      const res = await fetch(`/api/bills?search=${encodeURIComponent(searchBillQuery)}`);
      const data = await res.json();
      if (data.success) {
        setPastBills(data.invoices || []);
      }
    } catch (err) {
      console.error("Failed to load past bills:", err);
    }
  };

  useEffect(() => {
    if (showPastBills) {
      fetchPastBills();
    }
  }, [showPastBills, searchBillQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Barcode Scanner Billing & Estimate POS
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Aim scanner gun & pull trigger. Products automatically add to the estimate bill with instant discount and total calculations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPastBills(!showPastBills)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition-all ${
              showPastBills
                ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            {showPastBills ? "Return to Scanner POS" : "View Past Estimates / Bills"}
          </button>
        </div>
      </div>

      {showPastBills ? (
        /* Past Invoices History View */
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Estimate & Bill History
            </h2>
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search Estimate # or Customer Phone..."
                value={searchBillQuery}
                onChange={(e) => setSearchBillQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50/70 font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300">
                <tr>
                  <th className="py-3 px-4">Estimate No</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {pastBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No estimates found. Generate a bill above to record your first sale!
                    </td>
                  </tr>
                ) : (
                  pastBills.map((bill) => (
                    <tr key={bill._id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {bill.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {new Date(bill.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">
                          {bill.customerName || "Walk-in"}
                        </div>
                        {bill.customerPhone && (
                          <div className="text-[11px] text-zinc-400">{bill.customerPhone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {bill.totalQuantity} ({bill.totalItems} unique)
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white">
                        {formatCurrency(bill.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          {bill.paymentMode || "Cash"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <a
                          href={`/api/bills/${bill._id}/pdf?format=a4`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                        >
                          <FileText className="h-3 w-3 text-indigo-600" /> A4 PDF
                        </a>
                        <a
                          href={`/api/bills/${bill._id}/pdf?format=thermal`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                        >
                          <Receipt className="h-3 w-3 text-amber-600" /> POS Receipt
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenHistoryWhatsApp(bill)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          title="Send or share bill receipt via WhatsApp"
                        >
                          <MessageSquare className="h-3 w-3 text-emerald-600" /> WhatsApp
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Active Billing / POS View */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Barcode Gun Scanner Bar & Scanned Items Table */}
          <div className="lg:col-span-8 space-y-4">
            {/* Dedicated High-Visibility Scanner Gun Input */}
            <div className="rounded-2xl border-2 border-indigo-600 bg-indigo-50/60 p-4 dark:border-indigo-500 dark:bg-indigo-950/40 shadow-sm">
              <form onSubmit={handleScanSubmit} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Scan className="h-4 w-4 animate-pulse text-indigo-600 dark:text-indigo-400" />
                    Barcode Scanner Gun Active:
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full">
                    <Sparkles className="h-3 w-3" /> Auto-Adds on Gun Trigger
                  </span>
                </div>

                <div className="relative flex items-center">
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Aim scan gun & pull trigger (auto adds instantly)..."
                    className="h-12 w-full rounded-xl border border-indigo-300 bg-white px-4 text-base font-mono font-bold tracking-wider text-zinc-900 shadow-inner focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-indigo-800 dark:bg-zinc-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={isScanning || !scanInput.trim()}
                    className="absolute right-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition-all"
                  >
                    {isScanning ? "Scanning..." : "Add Item"}
                  </button>
                </div>

                {/* Scan notification badge */}
                {scanStatus && (
                  <div
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      statusType === "success"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : statusType === "error"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    {statusType === "success" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {scanStatus}
                  </div>
                )}
              </form>
            </div>

            {/* Scanned Cart Table */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Bill Cart ({cart.length} Products / {totalQuantity} Units)
                  </h2>
                </div>

                {cart.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={removeLastItem}
                      className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 transition-all"
                      title="Undo / Remove the most recently scanned item"
                    >
                      <Undo2 className="h-3.5 w-3.5" /> Undo Last Item
                    </button>

                    <button
                      type="button"
                      onClick={clearCart}
                      className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Clear Cart
                    </button>
                  </div>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="my-12 flex flex-col items-center justify-center text-center text-zinc-400">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 mb-3">
                    <Package className="h-8 w-8 text-zinc-400 animate-bounce" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    Cart is Empty — Ready to Scan
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mt-1">
                    Scan toy barcodes using your scanner gun. Products appear here with instant pricing and quantity controls.
                  </p>
                </div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-100 bg-zinc-50/60 font-bold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300">
                      <tr>
                        <th className="py-2.5 px-3">Product Name & Code</th>
                        <th className="py-2.5 px-3">HSN</th>
                        <th className="py-2.5 px-3 text-right">MRP</th>
                        <th className="py-2.5 px-3 text-right">Sale Price</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                      {cart.map((item) => (
                        <tr key={item.barcode} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="py-3 px-3">
                            <div className="font-bold text-zinc-900 dark:text-white uppercase leading-tight text-xs">
                              {item.productName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-zinc-500 dark:text-zinc-400 font-mono">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">#{item.barcode}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-500">
                            {item.hsn}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-zinc-500">
                            {formatAmount(item.mrp)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-white">
                            {formatAmount(item.salesPrice)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.barcode, -1)}
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                                title="Decrease Quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-7 text-center font-mono font-bold text-xs text-zinc-900 dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.barcode, 1)}
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                                title="Increase Quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                            {formatAmount(item.totalAmount)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.barcode)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-300 transition-all"
                              title="Remove this product from cart"
                            >
                              <Trash2 className="h-3 w-3" /> Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Customer Details, Payment, Summary & Generate Bill */}
          <div className="lg:col-span-4 space-y-4">
            {/* Customer Details Box */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Customer & Payment Details
                </h3>
                <button
                  type="button"
                  onClick={resetBillingForm}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-white transition-all"
                  title="Reset customer details, payment method, discounts, and cart for a new sale"
                >
                  <Undo2 className="h-3 w-3" /> Reset / New Sale
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Customer Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {customerName.trim() ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ Provided
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400">
                      * Mandatory
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className={`mt-1 h-9 w-full rounded-xl border px-3 text-xs focus:outline-none dark:bg-zinc-950 dark:text-white transition-all ${
                    !customerName.trim()
                      ? "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-indigo-500 dark:border-zinc-800"
                      : "border-emerald-400 bg-emerald-50/30 text-emerald-950 focus:border-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Customer Mobile Number <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {customerPhone.trim() ? (
                    <span className={`text-[10px] font-semibold ${
                      isValidPhone(customerPhone)
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-500 dark:text-rose-400"
                    }`}>
                      {isValidPhone(customerPhone) ? "✓ Valid Mobile" : "⚠ 10 digits required"}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400">
                      * Mandatory
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+\s-]/g, "");
                    setCustomerPhone(val);
                  }}
                  placeholder="e.g. 9876543210 (10 digits)"
                  maxLength={15}
                  required
                  className={`mt-1 h-9 w-full rounded-xl border px-3 text-xs focus:outline-none dark:bg-zinc-950 dark:text-white transition-all ${
                    customerPhone.trim() && !isValidPhone(customerPhone)
                      ? "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500 dark:border-rose-800 dark:bg-rose-950/30"
                      : customerPhone.trim() && isValidPhone(customerPhone)
                      ? "border-emerald-400 bg-emerald-50/30 text-emerald-950 focus:border-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30"
                      : "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-indigo-500 dark:border-zinc-800"
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-500">
                  Payment Mode
                </label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode("Cash")}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-bold transition-all ${
                      paymentMode === "Cash"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                    }`}
                  >
                    <Banknote className="h-4 w-4 text-emerald-600" /> Cash
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode("UPI")}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-bold transition-all ${
                      paymentMode === "UPI"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                    }`}
                  >
                    <QrCode className="h-4 w-4 text-indigo-600" /> UPI / QR
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode("Card")}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs font-bold transition-all ${
                      paymentMode === "Card"
                        ? "border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                    }`}
                  >
                    <CreditCard className="h-4 w-4 text-blue-600" /> Card
                  </button>
                </div>
              </div>
            </div>

            {/* Bill Summary & Grand Total Card (No GST Mentions) */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Estimate / Bill Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Subtotal ({totalQuantity} items):</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">
                    {formatAmount(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Discount (Rs.):</span>
                  <input
                    type="number"
                    min="0"
                    value={discount || ""}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="h-7 w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-right font-mono text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Other / Adjustments (Rs.):</span>
                  <input
                    type="number"
                    min="0"
                    value={otherCharges || ""}
                    onChange={(e) => setOtherCharges(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="h-7 w-24 rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-right font-mono text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                  />
                </div>

                <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-base font-extrabold text-zinc-900 dark:text-white">
                    <span>Grand Total:</span>
                    <span className="font-mono text-xl text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Estimate Output Format Selector */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-zinc-500">
                  Bill Format:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPdfFormat("a4")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                      pdfFormat === "a4"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" /> A4 Retail Estimate
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfFormat("thermal")}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                      pdfFormat === "thermal"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-800 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
                    }`}
                  >
                    <Receipt className="h-3.5 w-3.5" /> 80mm POS Receipt
                  </button>
                </div>
              </div>

              {/* Action: Generate Bill */}
              <button
                type="button"
                onClick={handleGenerateBill}
                disabled={isSubmitting || cart.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50 transition-all"
              >
                <Printer className="h-4 w-4" />
                {isSubmitting ? "Generating Estimate..." : "Submit & Generate Bill PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Generated Success Modal */}
      {generatedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Estimate / Bill Generated Successfully
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    Estimate: {generatedInvoice.invoiceNumber} | Grand Total: {formatCurrency(generatedInvoice.grandTotal)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setGeneratedInvoice(null);
                  setWhatsappPhoneInput("");
                  setWhatsappFeedback(null);
                  resetBillingForm();
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: PDF Live Preview Iframe */}
            <div className="flex-1 bg-zinc-100 p-4 dark:bg-zinc-950 min-h-[420px]">
              <iframe
                src={`data:application/pdf;base64,${generatedInvoice.pdfBase64}`}
                className="h-[420px] w-full rounded-xl border border-zinc-300 bg-white shadow-inner dark:border-zinc-800"
                title="Estimate PDF Preview"
              />
            </div>

            {/* WhatsApp Fast Share Strip */}
            <div className="border-t border-emerald-100 bg-emerald-50/80 px-6 py-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      WhatsApp Bill Options
                    </span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Choose to open/share in WhatsApp Web or dispatch via WhatsApp API
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Smartphone className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="tel"
                      value={whatsappPhoneInput}
                      onChange={(e) => setWhatsappPhoneInput(e.target.value)}
                      placeholder="WhatsApp Mobile Number..."
                      className="h-8 w-52 rounded-lg border border-emerald-300 bg-white pl-8 pr-2.5 text-xs text-zinc-900 focus:border-emerald-600 focus:outline-none dark:border-emerald-800 dark:bg-zinc-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsAppWeb()}
                    disabled={isSendingWhatsApp}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-all"
                    title="Open WhatsApp Web or App with pre-filled formatted receipt and PDF link"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share on WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppCloudApi()}
                    disabled={isSendingWhatsApp}
                    className="flex items-center gap-1.5 rounded-lg border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-all"
                    title="Send via official Meta WhatsApp Business Cloud API in the background"
                  >
                    {isSendingWhatsApp ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send via WhatsApp API
                  </button>
                </div>
              </div>

              {whatsappFeedback && (
                <div
                  className={`mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    whatsappFeedback.type === "success"
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200"
                      : whatsappFeedback.type === "error"
                      ? "bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200"
                      : "bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200"
                  }`}
                >
                  {whatsappFeedback.type === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : whatsappFeedback.type === "error" ? (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                  ) : (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  )}
                  {whatsappFeedback.msg}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => {
                  setGeneratedInvoice(null);
                  setWhatsappPhoneInput("");
                  setWhatsappFeedback(null);
                  resetBillingForm();
                }}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                Start New Estimate (Scan Next Customer)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <Download className="h-4 w-4 text-indigo-600" /> Download PDF
                </button>

                <button
                  type="button"
                  onClick={handlePrintDirectly}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
                >
                  <Printer className="h-4 w-4" /> Print Bill Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Bill WhatsApp Dialog Modal */}
      {historyWhatsAppTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  WhatsApp Bill Options
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryWhatsAppTarget(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {historyWhatsAppTarget.invoiceNumber}
                </div>
                <div className="text-zinc-600 dark:text-zinc-400">
                  Customer: <strong>{historyWhatsAppTarget.customerName || "Walk-in"}</strong> | Total: <strong>{formatCurrency(historyWhatsAppTarget.grandTotal)}</strong>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Recipient WhatsApp Mobile Number
                </label>
                <div className="relative mt-1">
                  <Smartphone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="tel"
                    value={historyPhoneInput}
                    onChange={(e) => setHistoryPhoneInput(e.target.value)}
                    placeholder="e.g. 9876543210 or +91 98765 43210"
                    className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-8 pr-3 font-mono text-xs text-zinc-900 focus:border-emerald-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => setHistoryWhatsAppTarget(null)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!historyWhatsAppTarget) return;
                  try {
                    const res = await fetch(`/api/bills/${historyWhatsAppTarget._id}/whatsapp?phone=${encodeURIComponent(historyPhoneInput.trim())}`);
                    const data = await res.json();
                    if (data.success && data.deepLinkUrl) {
                      window.open(data.deepLinkUrl, "_blank");
                      setHistoryWhatsAppTarget(null);
                    } else {
                      alert(data.error || "Failed to generate WhatsApp share link.");
                    }
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
              >
                <Share2 className="h-3.5 w-3.5" /> Share on WhatsApp
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!historyWhatsAppTarget) return;
                  if (!historyPhoneInput.trim()) {
                    alert("Please enter customer's mobile number.");
                    return;
                  }
                  setIsHistoryWhatsAppSending(true);
                  try {
                    const res = await fetch(`/api/bills/${historyWhatsAppTarget._id}/whatsapp`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ phone: historyPhoneInput.trim(), sendViaCloudApi: true }),
                    });
                    const data = await res.json();
                    if (data.success && data.cloudApiResult?.sent) {
                      alert(`✓ Bill receipt successfully sent to +${data.phone} via Meta WhatsApp Cloud API!`);
                      setHistoryWhatsAppTarget(null);
                    } else {
                      alert(`WhatsApp API: ${data.cloudApiResult?.error || data.error || "Failed. Ensure Meta API credentials are configured in Settings or use 'Share on WhatsApp'."}`);
                    }
                  } catch (e: any) {
                    alert(`API Error: ${e.message}`);
                  } finally {
                    setIsHistoryWhatsAppSending(false);
                  }
                }}
                disabled={isHistoryWhatsAppSending}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
              >
                {isHistoryWhatsAppSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send via API
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
