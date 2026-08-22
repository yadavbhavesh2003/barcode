"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Edit3,
  History,
  RotateCcw,
} from "lucide-react";
import { formatAmount, formatCurrency } from "@/lib/utils";
import { useToast } from "@/lib/context/ToastContext";

interface CartItem {
  productId?: string;
  barcode: string;
  productName: string;
  hsn: string;
  mrp: number;
  salesPrice: number;
  quantity: number;
  totalAmount: number;
  currentStock?: number;
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">Loading POS Terminal...</div>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviseParam = searchParams?.get("revise") || searchParams?.get("billId");

  const { toast } = useToast();
  const [scanInput, setScanInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");

  // Revise Bill State
  const [revisingInvoice, setRevisingInvoice] = useState<{
    id: string;
    invoiceNumber: string;
    originalTotal: number;
    revisionCount: number;
    createdAt?: string;
  } | null>(null);
  const [isLoadingRevision, setIsLoadingRevision] = useState(false);

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

  // Live Product Suggestions State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingScanRef = useRef(false);
  const lastScanEventRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  const loadedRevisionIdRef = useRef<string | null>(null);

  // Dismiss suggestions only when clicking outside the entire search container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Process and add barcode to cart automatically with strict debounce and de-duplication
  const processBarcode = useCallback(async (barcodeToSearch: string) => {
    const barcode = barcodeToSearch.trim();
    if (!barcode) return;

    // Throttle & De-duplicate: ignore duplicate triggers of the exact same code within 650ms
    const now = Date.now();
    if (
      lastScanEventRef.current.code === barcode &&
      now - lastScanEventRef.current.time < 650
    ) {
      setScanInput("");
      return;
    }

    // Lock to prevent concurrent multi-trigger execution
    if (isProcessingScanRef.current) {
      return;
    }

    isProcessingScanRef.current = true;
    lastScanEventRef.current = { code: barcode, time: now };

    // Clear pending timers & wipe input synchronously
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setScanInput("");

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
        const itemStock = item.currentStock !== undefined ? Number(item.currentStock) : 999;

        setCart((prevCart) => {
          const existingIndex = prevCart.findIndex((c) => c.barcode === barcode);
          if (existingIndex >= 0) {
            // Increment existing item
            const updated = [...prevCart];
            const current = updated[existingIndex];
            const newQty = current.quantity + 1;

            if (newQty > (current.currentStock ?? itemStock)) {
              toast.warning(`Only ${current.currentStock ?? itemStock} units in stock for '${current.productName}'.`);
            }

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
                currentStock: itemStock,
              },
            ];
          }
        });

        setScanStatus(`✓ Added "${item.productName}" (Barcode: ${barcode})`);
        setStatusType("success");
      } else {
        playErrorBeep();
        toast.error(`Barcode '${barcode}' not found in catalog.`, "Item Not Found");
        setScanStatus(`✗ Barcode "${barcode}" not found in database.`);
        setStatusType("error");
      }
    } catch (err: any) {
      playErrorBeep();
      toast.error(`Scan failed: ${err.message}`);
      setScanStatus(`Scan failed: ${err.message}`);
      setStatusType("error");
    } finally {
      setIsScanning(false);
      isProcessingScanRef.current = false;
      setScanInput("");
      scanInputRef.current?.focus();
    }
  }, [toast]);

  // Global Barcode Scanner Gun Keystroke Interceptor
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      // If user is typing in ANY input or textarea, do NOT intercept or buffer keystrokes
      if (isInput) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.trim().length >= 3) {
          e.preventDefault();
          const code = barcodeBuffer.trim();
          barcodeBuffer = "";
          processBarcode(code);
        } else {
          barcodeBuffer = "";
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

  // Fetch catalog suggestions when typing text
  const fetchProductSuggestions = async (term: string) => {
    const trimmed = (term || "").trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsSearchingSuggestions(true);
      const res = await fetch(`/api/barcodes/search?query=${encodeURIComponent(trimmed)}`);
      const json = await res.json();
      
      let items: any[] = [];
      if (json.success && Array.isArray(json.records)) {
        items = json.records;
      } else if (json.success && Array.isArray(json.data)) {
        items = json.data;
      }

      if (items.length > 0) {
        setSuggestions(items.slice(0, 10));
        setShowSuggestions(true);
        setSelectedSuggestionIndex(-1);
      } else {
        setSuggestions([]);
        setShowSuggestions(true);
      }
    } catch (e) {
      console.error("Suggestion fetch failed:", e);
      setSuggestions([]);
    } finally {
      setIsSearchingSuggestions(false);
    }
  };

  // Add product from live suggestion list
  const addItemFromSuggestion = (prod: any) => {
    playBeep(1400, 0.09);
    const barcode = (prod.barcode || prod.barcodeNumber || prod.itemNumber || "N/A").trim();
    const productName = prod.productName || prod.name || "Product";
    const itemStock =
      prod.currentStock !== undefined
        ? Number(prod.currentStock)
        : prod.quantity !== undefined
        ? Number(prod.quantity)
        : prod.openingStock ?? 999;
    const salesPrice = Number(prod.salesPrice || prod.sellingPrice || prod.mrp || 0);
    const mrp = Number(prod.mrp || salesPrice);
    const hsn = prod.hsn || prod.hsnSac || "9503";

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (c) =>
          (c.barcode && c.barcode === barcode) ||
          (c.productId && (c.productId === prod.productId || c.productId === prod._id || c.productId === prod.barcodeId))
      );
      if (existingIndex >= 0) {
        const updated = [...prevCart];
        const current = updated[existingIndex];
        const newQty = current.quantity + 1;

        if (newQty > (current.currentStock ?? itemStock)) {
          toast.warning(`Only ${current.currentStock ?? itemStock} units in stock for '${current.productName}'.`);
        }

        const lineTotal = current.salesPrice * newQty;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          totalAmount: lineTotal,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            productId: prod.productId || prod.barcodeId || prod._id,
            barcode,
            productName,
            hsn,
            mrp,
            salesPrice,
            quantity: 1,
            totalAmount: salesPrice,
            currentStock: itemStock,
          },
        ];
      }
    });

    setScanStatus(`✓ Added "${productName}" (Barcode: ${barcode})`);
    setStatusType("success");

    // Immediately cancel timers and hide suggestion dropdown
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    setScanInput("");
    if (scanInputRef.current) {
      scanInputRef.current.value = "";
    }
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // Re-focus scanner input cleanly without reopening dropdown
    setTimeout(() => {
      setShowSuggestions(false);
      scanInputRef.current?.focus();
    }, 60);
  };

  // Handle manual or gun submission via form
  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (showSuggestions && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      addItemFromSuggestion(suggestions[selectedSuggestionIndex]);
      return;
    }
    if (scanInput.trim()) {
      setShowSuggestions(false);
      processBarcode(scanInput.trim());
    }
  };

  // Automatic submit on scanner input change or live suggestion search
  const handleInputChange = (val: string) => {
    setScanInput(val);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const trimmed = val.trim();

    // Barcode Gun Mode: If pure numeric digits, completely suppress suggestion dropdown and auto-add
    if (/^\d+$/.test(trimmed)) {
      setShowSuggestions(false);
      setSuggestions([]);

      // If 6 or more digits from barcode scanner gun, auto-submit
      if (trimmed.length >= 6) {
        typingTimerRef.current = setTimeout(() => {
          if (trimmed) {
            setShowSuggestions(false);
            processBarcode(trimmed);
          }
        }, 180);
      }
      return;
    }

    // Manual Text Search Mode: Only show live suggestions when user types text with letters (min 2 chars)
    if (trimmed.length >= 2 && /[a-zA-Z]/.test(trimmed)) {
      searchDebounceRef.current = setTimeout(() => {
        fetchProductSuggestions(trimmed);
      }, 150);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
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

            if (delta > 0 && item.currentStock !== undefined && newQty > item.currentStock) {
              toast.warning(`Only ${item.currentStock} units in stock for '${item.productName}'.`);
            }

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

  // Load bill for revision if ?revise=<id> is in URL
  // Load bill for revision if ?revise=invoiceId is present in query parameters
  useEffect(() => {
    if (!reviseParam) {
      loadedRevisionIdRef.current = null;
      return;
    }

    if (loadedRevisionIdRef.current === reviseParam) return;
    loadedRevisionIdRef.current = reviseParam;

    const loadInvoiceForRevision = async () => {
      try {
        setIsLoadingRevision(true);
        const res = await fetch(`/api/v1/invoices/${reviseParam}`);
        const json = await res.json();
        if (json.success && json.data) {
          const inv = json.data;
          setRevisingInvoice({
            id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            originalTotal: inv.grandTotal,
            revisionCount: inv.revisionCount || 0,
            createdAt: inv.createdAt,
          });

          let custName = inv.customer?.name || inv.customerName || "";
          const custMobile = inv.customer?.mobile || inv.customerPhone || "";

          // If customer name is default Walk-In Customer or blank, and mobile is present, query Customer Master
          if ((!custName || custName.toLowerCase().includes("walk-in")) && custMobile) {
            try {
              const custRes = await fetch(`/api/v1/customers?query=${encodeURIComponent(custMobile.trim())}&limit=1`);
              const custJson = await custRes.json();
              if (custJson.success && Array.isArray(custJson.data) && custJson.data.length > 0) {
                const match = custJson.data.find((c: any) => c.mobile === custMobile.trim()) || custJson.data[0];
                if (match && match.name && !match.name.toLowerCase().includes("walk-in")) {
                  custName = match.name;
                }
              }
            } catch (e) {
              // ignore
            }
          }

          setCustomerName(custName);
          setCustomerPhone(custMobile);
          setDiscount(Number(inv.discount || inv.totalDiscount || 0));
          setOtherCharges(Number(inv.otherCharges || 0));
          
          const rawPay = String(inv.paymentMethod || inv.paymentMode || "CASH").toUpperCase();
          if (rawPay.includes("UPI")) {
            setPaymentMode("UPI");
          } else if (rawPay.includes("CARD")) {
            setPaymentMode("Card");
          } else {
            setPaymentMode("Cash");
          }

          // Populate cart items
          const mappedCart: CartItem[] = (inv.items || []).map((it: any) => ({
            productId: it.productId,
            barcode: it.barcodeNumber || it.barcode || "N/A",
            productName: it.productName,
            hsn: it.hsnSac || it.hsn || "9503",
            mrp: Number(it.mrp || it.unitPrice || 0),
            salesPrice: Number(it.unitPrice || it.salesPrice || 0),
            quantity: Number(it.quantity || 1),
            totalAmount: Number(it.lineTotal || (it.unitPrice * it.quantity) || 0),
            currentStock: 999, // Backend handles exact delta reconciliation
          }));
          setCart(mappedCart);
          toast.info(`Loaded Bill #${inv.invoiceNumber} for revision`, "Revision Mode Active", 4000);
        } else {
          toast.error(json.error?.message || "Failed to load invoice for revision", "Load Error");
        }
      } catch (err: any) {
        toast.error("Error loading bill: " + err.message);
      } finally {
        await new Promise((r) => setTimeout(r, 220));
        setIsLoadingRevision(false);
      }
    };

    loadInvoiceForRevision();
  }, [reviseParam, toast]);

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
    setRevisingInvoice(null);
    setTimeout(() => scanInputRef.current?.focus(), 50);
  }, []);

  // Clear entire cart and customer inputs
  const clearCart = () => {
    if (cart.length === 0 && customerPhone === "" && customerName === "") return;
    resetBillingForm();
    if (reviseParam) {
      router.replace("/billing");
    }
    toast.info("Customer bill form reset and cleared.", "Form Cleared");
  };

  // Financial calculations
  const subtotal = cart.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = Math.max(0, subtotal - Number(discount || 0) + Number(otherCharges || 0));

  // Phone number validator helper (Strict 10-digit Indian mobile format)
  const isValidPhone = (rawPhone: string) => {
    if (!rawPhone) return false;
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
    if (digits.length === 11 && digits.startsWith("0")) return /^[6-9]\d{9}$/.test(digits.slice(1));
    if (digits.length === 12 && digits.startsWith("91")) return /^[6-9]\d{9}$/.test(digits.slice(2));
    return false;
  };

  const getPhoneValidation = (rawPhone: string) => {
    const raw = (rawPhone || "").trim();
    if (!raw) return { valid: false, text: "* Mandatory", status: "empty" };
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 0) return { valid: false, text: "⚠ Digits only", status: "invalid" };
    if (digits.length < 10) return { valid: false, text: `⚠ 10 digits required (${digits.length}/10)`, status: "incomplete" };
    if (digits.length === 10) {
      if (/^[6-9]/.test(digits)) return { valid: true, text: "✓ Valid Mobile", status: "valid" };
      return { valid: false, text: "⚠ Must start with 6, 7, 8, or 9", status: "invalid" };
    }
    if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
      return { valid: true, text: "✓ Valid Mobile", status: "valid" };
    }
    if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
      return { valid: true, text: "✓ Valid Mobile (+91)", status: "valid" };
    }
    return { valid: false, text: `⚠ Max 10 digits (${digits.length} digits entered)`, status: "invalid" };
  };

  // Submit / Generate Estimate / Bill
  const handleGenerateBill = async () => {
    if (cart.length === 0) {
      toast.warning("Cart is empty! Scan items with the barcode gun first.", "Empty Cart");
      return;
    }

    const currentCustomerName = customerName.trim();
    if (!currentCustomerName) {
      toast.warning("Customer name is required before generating the bill.", "Customer Name Missing");
      return;
    }

    const currentCustomerPhone = customerPhone.trim();
    if (!currentCustomerPhone) {
      toast.warning("Customer mobile number is required before generating the bill.", "Mobile Number Missing");
      return;
    }
    if (!isValidPhone(currentCustomerPhone)) {
      toast.error("Please enter a valid 10-digit mobile number (e.g. 9876543210).", "Invalid Phone Number");
      return;
    }

    // Client-side Stock Pre-Check (only for brand new items not in revision)
    if (!revisingInvoice) {
      for (const item of cart) {
        if (item.currentStock !== undefined && item.quantity > item.currentStock) {
          toast.error(
            `Insufficient stock for '${item.productName}'. Only ${item.currentStock} units available, but ${item.quantity} are in cart.`,
            "Stock Limit Exceeded"
          );
          return;
        }
      }
    }

    setIsSubmitting(true);

    // If REVISION mode is active: call PUT /api/v1/invoices/[id]
    if (revisingInvoice) {
      try {
        const res = await fetch(`/api/v1/invoices/${revisingInvoice.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((c) => ({
              productId: c.productId,
              barcodeNumber: c.barcode,
              productName: c.productName,
              hsnSac: c.hsn,
              mrp: c.mrp,
              unitPrice: c.salesPrice,
              quantity: c.quantity,
            })),
            customer: {
              name: currentCustomerName,
              mobile: currentCustomerPhone,
            },
            paymentMethod: paymentMode === "Cash" ? "CASH" : paymentMode === "Card" ? "CARD" : "UPI",
            paymentMode,
            discount: Number(discount || 0),
            otherCharges: Number(otherCharges || 0),
            reason: `POS Revision #${(revisingInvoice.revisionCount || 0) + 1}`,
            revisedBy: "Cashier",
          }),
        });

        const data = await res.json();
        if (data.success) {
          playBeep(1800, 0.15);
          const nextRev = (revisingInvoice.revisionCount || 0) + 1;
          toast.success(
            `Bill #${revisingInvoice.invoiceNumber} successfully revised (Rev #${nextRev})! Stock ledger reconciled.`,
            "Bill Revised",
            6000
          );
          setRevisingInvoice(null);
          resetBillingForm();
          router.replace("/billing");
          router.push("/invoices");
        } else {
          toast.error(data.error?.message || data.error || "Failed to revise bill", "Revision Error", 6000);
        }
      } catch (err: any) {
        toast.error(`Error revising bill: ${err.message}`, "Server Error");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Normal New Bill Creation: call POST /api/bills
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
        toast.success(`Bill #${data.invoiceNumber} created successfully!`, "Sale Completed");
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
        toast.error(data.error || "Failed to generate bill", "Billing Error");
      }
    } catch (err: any) {
      toast.error(`Error generating bill: ${err.message}`, "Server Error");
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
                          onClick={() => {
                            setShowPastBills(false);
                            router.push(`/billing?revise=${bill._id}`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                          title="Revise / Edit this Bill in POS"
                        >
                          <Edit3 className="h-3 w-3 text-amber-600" /> Revise
                        </button>
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
      ) : isLoadingRevision ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-amber-200 bg-amber-50/50 p-16 text-center shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20 animate-in fade-in duration-200">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/50 shadow-inner">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Loading Bill for Revision...
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
            Retrieving bill line items, customer profile, inventory links, and previous totals...
          </p>
        </div>
      ) : (
        /* Active Billing / POS View */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Barcode Gun Scanner Bar & Scanned Items Table */}
          <div className="lg:col-span-8 space-y-4">
            {/* Revision Mode Banner */}
            {revisingInvoice && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-4 shadow-sm dark:border-amber-600 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                    <Edit3 className="h-5 w-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 px-2 py-0.5 rounded-md ring-1 ring-amber-500/30">
                        Revision Mode (Rev #{(revisingInvoice.revisionCount || 0) + 1})
                      </span>
                      <span className="font-mono font-bold">{revisingInvoice.invoiceNumber}</span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                      Original Amount: <strong>₹{revisingInvoice.originalTotal.toLocaleString()}</strong> • Modifying items will automatically adjust and record inventory ledger transactions.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRevisingInvoice(null);
                    resetBillingForm();
                    router.replace("/billing");
                  }}
                  className="rounded-xl border border-amber-400 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 dark:bg-zinc-900 dark:border-zinc-700 dark:text-amber-300 dark:hover:bg-zinc-800 transition-colors shadow-2xs shrink-0"
                >
                  Exit / Cancel Revision
                </button>
              </div>
            )}

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

                <div ref={searchContainerRef} className="relative z-30">
                  <div className="flex items-center">
                    <input
                      ref={scanInputRef}
                      type="text"
                      value={scanInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (showSuggestions && suggestions.length > 0) {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setSelectedSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                          } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
                            e.preventDefault();
                            addItemFromSuggestion(suggestions[selectedSuggestionIndex]);
                          } else if (e.key === "Escape") {
                            setShowSuggestions(false);
                          }
                        }
                      }}
                      onFocus={() => {
                        const trimmed = scanInput.trim();
                        if (trimmed.length >= 2 && /[a-zA-Z]/.test(trimmed)) {
                          if (suggestions.length > 0) {
                            setShowSuggestions(true);
                          } else {
                            fetchProductSuggestions(trimmed);
                          }
                        } else {
                          setShowSuggestions(false);
                        }
                      }}
                      placeholder="Aim scan gun & pull trigger, or type product name / code to search..."
                      className="h-12 w-full rounded-xl border border-indigo-300 bg-white pl-4 pr-28 text-sm sm:text-base font-mono font-bold tracking-wider text-zinc-900 shadow-inner focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-indigo-800 dark:bg-zinc-950 dark:text-white"
                    />
                    <div className="absolute right-2 flex items-center gap-1.5">
                      {isSearchingSuggestions && (
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                      )}
                      <button
                        type="submit"
                        disabled={isScanning || !scanInput.trim()}
                        className="rounded-lg bg-indigo-600 px-3 sm:px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-500 disabled:opacity-50 transition-all"
                      >
                        {isScanning ? "Scanning..." : "Add Item"}
                      </button>
                    </div>
                  </div>

                  {/* Live Suggestions Dropdown Popover */}
                  {showSuggestions && (
                    <div
                      className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-md p-2 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900/95 max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <span>Matching Products ({suggestions.length})</span>
                        <span className="text-[9.5px] font-normal lowercase tracking-normal">
                          ↑↓ keys • Enter to select • Esc
                        </span>
                      </div>

                      {isSearchingSuggestions && suggestions.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-xs text-zinc-400">
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          <span>Searching product catalog...</span>
                        </div>
                      ) : suggestions.length === 0 ? (
                        <div className="py-6 text-center text-xs text-zinc-400">
                          No products found matching &ldquo;{scanInput}&rdquo;
                        </div>
                      ) : (
                        suggestions.map((prod, idx) => {
                          const isSelected = selectedSuggestionIndex === idx;
                          const name = prod.productName || prod.name || "Product";
                          const code = prod.barcode || prod.barcodeNumber || prod.itemNumber || "N/A";
                          const stock =
                            prod.currentStock !== undefined
                              ? Number(prod.currentStock)
                              : prod.quantity !== undefined
                              ? Number(prod.quantity)
                              : prod.openingStock ?? 0;
                          const isOut = stock <= 0;
                          const sellingPrice = Number(prod.salesPrice || prod.sellingPrice || prod.mrp || 0);
                          const mrp = Number(prod.mrp || sellingPrice);

                          return (
                            <button
                              key={prod._id || prod.barcodeId || idx}
                              type="button"
                              onClick={() => addItemFromSuggestion(prod)}
                              onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                isSelected
                                  ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 ring-1 ring-indigo-500/30"
                                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs truncate">
                                    {name}
                                  </span>
                                  {prod.category && (
                                    <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                                      {prod.category}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 font-mono">
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                    #{code}
                                  </span>
                                  <span>•</span>
                                  <span
                                    className={
                                      isOut
                                        ? "text-rose-600 font-semibold"
                                        : stock <= 1
                                        ? "text-amber-600 font-semibold"
                                        : "text-emerald-600 font-semibold"
                                    }
                                  >
                                    {isOut ? "Out of Stock" : `Stock: ${stock}`}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0 flex items-center gap-2.5">
                                <div>
                                  <div className="font-bold text-xs text-zinc-900 dark:text-white font-mono">
                                    {formatCurrency(sellingPrice)}
                                  </div>
                                  {mrp > sellingPrice && (
                                    <div className="text-[10px] text-zinc-400 line-through font-mono">
                                      {formatCurrency(mrp)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs hover:bg-indigo-500 transition-colors">
                                  <Plus className="h-3.5 w-3.5" />
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
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
                      {cart.map((item) => {
                        const isOverStock = item.currentStock !== undefined && item.quantity > item.currentStock;
                        return (
                        <tr key={item.barcode} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 ${isOverStock ? "bg-rose-50/40 dark:bg-rose-950/20" : ""}`}>
                          <td className="py-3 px-3">
                            <div className="font-bold text-zinc-900 dark:text-white uppercase leading-tight text-xs">
                              {item.productName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-zinc-500 dark:text-zinc-400 font-mono">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">#{item.barcode}</span>
                              {item.currentStock !== undefined && (
                                <span className={`inline-flex items-center rounded-md px-1.5 py-0.2 font-semibold ${
                                  isOverStock
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"
                                    : item.currentStock <= 5
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                }`}>
                                  {isOverStock ? `⚠️ Max ${item.currentStock} in stock` : `Stock: ${item.currentStock}`}
                                </span>
                              )}
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
                      );
                    })}
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
                  {customerName.trim().length >= 2 ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      ✓ Provided
                    </span>
                  ) : customerName.trim().length > 0 ? (
                    <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400">
                      ⚠ Min 2 characters
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
                      : customerName.trim().length >= 2
                      ? "border-emerald-400 bg-emerald-50/30 text-emerald-950 focus:border-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30"
                      : "border-amber-400 bg-amber-50/30 text-amber-900 focus:border-amber-500 dark:border-amber-800 dark:bg-amber-950/30"
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Customer Mobile Number <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {(() => {
                    const phoneStatus = getPhoneValidation(customerPhone);
                    return (
                      <span
                        className={`text-[10px] font-semibold ${
                          phoneStatus.status === "valid"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : phoneStatus.status === "incomplete"
                            ? "text-amber-500 dark:text-amber-400"
                            : "text-rose-500 dark:text-rose-400"
                        }`}
                      >
                        {phoneStatus.text}
                      </span>
                    );
                  })()}
                </div>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={async (e) => {
                    let val = e.target.value.replace(/[^0-9+\s-]/g, "");
                    // If pure digits, cap at 10 digits
                    if (/^\d+$/.test(val) && val.length > 10) {
                      val = val.slice(0, 10);
                    } else if (val.length > 13) {
                      val = val.slice(0, 13);
                    }
                    setCustomerPhone(val);

                    // Auto-lookup registered customer on complete 10-digit mobile
                    const pureDigits = val.replace(/\D/g, "");
                    if (pureDigits.length === 10) {
                      try {
                        const res = await fetch(`/api/v1/customers?query=${pureDigits}&limit=1`);
                        const json = await res.json();
                        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                          const match = json.data.find((c: any) => c.mobile === pureDigits) || json.data[0];
                          if (match && match.name && (!customerName || customerName.toLowerCase().includes("walk-in"))) {
                            setCustomerName(match.name);
                            toast.info(`Found registered customer: ${match.name}`, "Customer Detected", 2500);
                          }
                        }
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  placeholder="e.g. 9876543210 (10 digits)"
                  maxLength={13}
                  required
                  className={`mt-1 h-9 w-full rounded-xl border px-3 text-xs focus:outline-none dark:bg-zinc-950 dark:text-white transition-all ${
                    !customerPhone.trim()
                      ? "border-zinc-200 bg-zinc-50 text-zinc-900 focus:border-indigo-500 dark:border-zinc-800"
                      : isValidPhone(customerPhone)
                      ? "border-emerald-400 bg-emerald-50/30 text-emerald-950 focus:border-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/30 font-semibold"
                      : "border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500 dark:border-rose-800 dark:bg-rose-950/30"
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

              {/* Action: Generate / Revise Bill */}
              <button
                type="button"
                onClick={handleGenerateBill}
                disabled={isSubmitting || cart.length === 0}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-50 transition-all ${
                  revisingInvoice
                    ? "bg-amber-600 shadow-amber-600/30 hover:bg-amber-500"
                    : "bg-indigo-600 shadow-indigo-600/25 hover:bg-indigo-500"
                }`}
              >
                {revisingInvoice ? (
                  <Edit3 className="h-4 w-4" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {isSubmitting
                  ? revisingInvoice
                    ? "Revising & Rebalancing Stock..."
                    : "Generating Estimate..."
                  : revisingInvoice
                  ? `Update & Re-Issue Revised Bill (₹${grandTotal.toLocaleString()})`
                  : "Submit & Generate Bill PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Generated Success Modal - Fully Laptop & Desktop Optimized */}
      {generatedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 sm:px-6 py-3 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>Bill Generated Successfully</span>
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      {generatedInvoice.invoiceNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    Grand Total: <strong className="text-zinc-900 dark:text-white font-bold">{formatCurrency(generatedInvoice.grandTotal)}</strong>
                  </p>
                </div>
              </div>

              {/* Fast Action Buttons in Header */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDirectly}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print Direct</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="hidden sm:flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  title="Download PDF"
                >
                  <Download className="h-4 w-4 text-indigo-600" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedInvoice(null);
                    setWhatsappPhoneInput("");
                    setWhatsappFeedback(null);
                    resetBillingForm();
                  }}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                  title="Close & Next Sale"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Two-Column Responsive Split */}
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-950/60">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                {/* Left Side: Summary & Quick Actions (5 Columns) */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-3">
                  {/* Bill Details Summary Card */}
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
                      <span className="text-xs text-zinc-500 font-medium">Grand Total</span>
                      <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                        {formatCurrency(generatedInvoice.grandTotal)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-400 block text-[10px] uppercase">Estimate No</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {generatedInvoice.invoiceNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block text-[10px] uppercase">Customer Mobile</span>
                        <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                          {generatedInvoice.customerPhone || "Walk-in"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Fast Share Card */}
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/30 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                          WhatsApp Receipt
                        </span>
                        <p className="text-[10.5px] text-emerald-700 dark:text-emerald-400">
                          Send receipt directly to customer
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="relative">
                        <Smartphone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                        <input
                          type="tel"
                          value={whatsappPhoneInput}
                          onChange={(e) => setWhatsappPhoneInput(e.target.value)}
                          placeholder="10-digit mobile number..."
                          className="h-8.5 w-full rounded-xl border border-emerald-300 bg-white pl-8 pr-2.5 text-xs text-zinc-900 focus:border-emerald-600 focus:outline-none dark:border-emerald-800 dark:bg-zinc-900 dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleShareWhatsAppWeb()}
                          disabled={isSendingWhatsApp}
                          className="flex items-center justify-center gap-1 rounded-xl border border-emerald-600 bg-emerald-600 px-2.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 disabled:opacity-50 transition-all"
                          title="Open WhatsApp Web or App"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Share Web</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppCloudApi()}
                          disabled={isSendingWhatsApp}
                          className="flex items-center justify-center gap-1 rounded-xl border border-indigo-600 bg-indigo-600 px-2.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 transition-all"
                          title="Send via Official WhatsApp API"
                        >
                          {isSendingWhatsApp ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          <span>Send API</span>
                        </button>
                      </div>
                    </div>

                    {whatsappFeedback && (
                      <div
                        className={`flex items-center gap-1.5 rounded-lg p-2 text-xs font-semibold ${
                          whatsappFeedback.type === "success"
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200"
                            : whatsappFeedback.type === "error"
                            ? "bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200"
                            : "bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200"
                        }`}
                      >
                        {whatsappFeedback.type === "success" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        ) : whatsappFeedback.type === "error" ? (
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        ) : (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 shrink-0" />
                        )}
                        <span className="text-[11px] leading-tight">{whatsappFeedback.msg}</span>
                      </div>
                    )}
                  </div>

                  {/* Primary Next Sale CTA */}
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedInvoice(null);
                      setWhatsappPhoneInput("");
                      setWhatsappFeedback(null);
                      resetBillingForm();
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-2.5 text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
                  >
                    <span>✓ Start New Sale (Scan Next)</span>
                  </button>
                </div>

                {/* Right Side: Responsive PDF Live Preview (7 Columns) */}
                <div className="lg:col-span-7 h-[360px] lg:h-[480px] rounded-2xl overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-white shadow-inner">
                  <iframe
                    src={`data:application/pdf;base64,${generatedInvoice.pdfBase64}`}
                    className="w-full h-full border-none"
                    title="Estimate PDF Preview"
                  />
                </div>
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
