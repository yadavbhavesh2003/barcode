import { jsPDF } from "jspdf";
import { formatAmount } from "@/lib/utils";

export interface InvoiceItemData {
  barcode: string;
  productName: string;
  hsn?: string;
  mrp: number;
  salesPrice: number;
  quantity: number;
  totalAmount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  paymentMode?: string;
  createdAt?: Date | string;
  items: InvoiceItemData[];
  subtotal: number;
  discount?: number;
  otherCharges?: number;
  grandTotal: number;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeWebsite?: string;
}

export class InvoicePDFService {
  /**
   * Converts a number to Indian Currency Words (e.g., 747 -> "Seven Hundred and Forty-Seven Rupees Only")
   */
  private static numberToWords(amount: number): string {
    const a = [
      "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
      "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const num = Math.floor(amount);
    if (num === 0) return "Zero Rupees Only";

    const inWords = (n: number): string => {
      let str = "";
      if (n > 9999999) {
        str += inWords(Math.floor(n / 10000000)) + "Crore ";
        n %= 10000000;
      }
      if (n > 99999) {
        str += inWords(Math.floor(n / 100000)) + "Lakh ";
        n %= 100000;
      }
      if (n > 999) {
        str += inWords(Math.floor(n / 1000)) + "Thousand ";
        n %= 1000;
      }
      if (n > 99) {
        str += inWords(Math.floor(n / 100)) + "Hundred ";
        n %= 100;
      }
      if (n > 0) {
        if (str !== "") str += "and ";
        if (n < 20) {
          str += a[n];
        } else {
          str += b[Math.floor(n / 10)] + " ";
          if (n % 10 > 0) str += a[n % 10];
        }
      }
      return str;
    };

    return inWords(num).trim() + " Rupees Only";
  }

  /**
   * Generate Full A4 Professional Retail Estimate / Bill PDF with Prominent Savings & Discount
   */
  static generateA4Invoice(data: InvoiceData): Uint8Array {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4", // 210mm x 297mm
    });

    const storeName = data.storeName || "RUNR KIDS";
    const storeWebsite = data.storeWebsite || "https://runrkids.in/";
    const storeAddress = data.storeAddress || "";
    const storePhone = data.storePhone || "+91 98765 43210";
    const invoiceDate = data.createdAt
      ? new Date(data.createdAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })
      : new Date().toLocaleString("en-IN");

    // 1. Outer Frame Border
    doc.setDrawColor(210, 215, 225);
    doc.setLineWidth(0.35);
    doc.roundedRect(10, 10, 190, 277, 2, 2);

    // 2. Header Banner
    doc.setFillColor(24, 33, 47); // Dark Slate
    doc.roundedRect(10, 10, 190, 24, 2, 2, "F");

    // Store Title & Details
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(storeName, 15, 19);

    doc.setFontSize(8.0);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    // doc.text(`Contact: ${storePhone} | Web: ${storeWebsite}`, 15, 26.5);
    doc.text(`Web: ${storeWebsite}`, 15, 26.5);

    // Estimate Title on Right
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("RETAIL ESTIMATE", 193, 19, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("ESTIMATE / CASH MEMO", 193, 25.5, { align: "right" });

    // 3. Customer & Estimate Meta Grid
    doc.setTextColor(15, 23, 42);
    doc.setFillColor(248, 250, 252);
    doc.rect(10, 34, 190, 22, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 56, 200, 56);

    // Left: Customer info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("BILLED TO:", 15, 41);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(data.customerName || "Walk-in Customer", 15, 47);
    if (data.customerPhone) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Phone: ${data.customerPhone}`, 15, 52.5);
    }

    // Right: Invoice Meta
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Estimate No:", 130, 41);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(data.invoiceNumber, 156, 41);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text("Date & Time:", 130, 46.5);
    doc.text(invoiceDate, 156, 46.5);

    doc.text("Payment Mode:", 130, 52);
    doc.setFont("helvetica", "bold");
    doc.text(data.paymentMode || "Cash", 156, 52);

    // 4. Table Header (Clean Non-Overlapping Spacing)
    const tableTopY = 60;
    doc.setFillColor(238, 242, 246);
    doc.rect(10, tableTopY, 190, 8, "F");
    doc.setDrawColor(203, 213, 225);
    doc.line(10, tableTopY + 8, 200, tableTopY + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    doc.text("S.N.", 15, tableTopY + 5.5, { align: "center" });
    doc.text("BARCODE", 32, tableTopY + 5.5, { align: "center" });
    doc.text("ITEM DESCRIPTION", 52, tableTopY + 5.5);
    doc.text("HSN", 126, tableTopY + 5.5, { align: "center" });
    doc.text("MRP", 146, tableTopY + 5.5, { align: "right" });
    doc.text("SALE PRICE", 166, tableTopY + 5.5, { align: "right" });
    doc.text("QTY", 179, tableTopY + 5.5, { align: "center" });
    doc.text("TOTAL", 195, tableTopY + 5.5, { align: "right" });

    // 5. Table Rows
    let rowY = tableTopY + 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    data.items.forEach((item, index) => {
      // Alternate row background stripe
      if (index % 2 === 1) {
        doc.setFillColor(249, 250, 252);
        doc.rect(10, rowY - 5, 190, 7.5, "F");
      }

      doc.setTextColor(15, 23, 42);
      doc.text(String(index + 1), 15, rowY, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(item.barcode, 32, rowY, { align: "center" });

      doc.setFont("helvetica", "normal");
      const truncatedName = item.productName.length > 36 ? item.productName.slice(0, 34) + ".." : item.productName;
      doc.text(truncatedName, 52, rowY);

      doc.text(item.hsn || "9503", 126, rowY, { align: "center" });
      doc.text(formatAmount(item.mrp), 146, rowY, { align: "right" });
      doc.text(formatAmount(item.salesPrice), 166, rowY, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(String(item.quantity), 179, rowY, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.text(formatAmount(item.totalAmount), 195, rowY, { align: "right" });

      rowY += 7.5;
    });

    // Divider after items table
    doc.setDrawColor(203, 213, 225);
    doc.line(10, rowY - 1, 200, rowY - 1);

    // 6. Balanced Summary & Calculation Section (Directly Below Items)
    const minSummaryY = Math.max(rowY + 8, 115);
    const summaryY = Math.min(minSummaryY, 210);

    // Compute accurate MRP savings & customer discount (100% exact math)
    const subtotal = data.items.reduce((s, i) => s + (Number(i.totalAmount) || Number(i.salesPrice) * i.quantity || 0), 0);
    const totalMrp = data.items.reduce(
      (sum, item) => sum + (Number(item.mrp) || Number(item.salesPrice)) * item.quantity,
      0
    );
    const mrpSavings = Math.max(0, Math.round((totalMrp - subtotal) * 100) / 100);
    const additionalDiscount = Number(data.discount || 0);
    const totalClientSavings = Math.round((mrpSavings + additionalDiscount) * 100) / 100;
    const savingsPercent = totalMrp > 0 ? Math.round((totalClientSavings / totalMrp) * 100) : 0;

    // Amount in Words on Left
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TOTAL AMOUNT IN WORDS:", 15, summaryY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const amountInWords = this.numberToWords(data.grandTotal);
    doc.text(amountInWords, 15, summaryY + 5.5);

    // Prominent "YOU SAVED" Green Banner on Left (Client delight!)
    if (totalClientSavings > 0) {
      const bannerW = 95;
      const bannerH = 11;
      doc.setFillColor(236, 253, 245); // Emerald-50
      doc.roundedRect(15, summaryY + 10, bannerW, bannerH, 1.5, 1.5, "F");
      doc.setDrawColor(167, 243, 208); // Emerald-200
      doc.roundedRect(15, summaryY + 10, bannerW, bannerH, 1.5, 1.5, "D");

      doc.setTextColor(5, 150, 105); // Emerald-600
      doc.setFont("helvetica", "bold");
      const savingsText = `YOU SAVED TODAY: ${formatAmount(totalClientSavings)}${savingsPercent > 0 ? ` (${savingsPercent}% OFF MRP)` : ""}`;
      let textFont = 8.5;
      doc.setFontSize(textFont);
      let tw = doc.getTextWidth(savingsText);
      while (tw > bannerW - 6 && textFont > 6.0) {
        textFont -= 0.3;
        doc.setFontSize(textFont);
        tw = doc.getTextWidth(savingsText);
      }
      doc.text(savingsText, 15 + bannerW / 2, summaryY + 17.2, { align: "center" });
    }

    // Terms & Conditions
    const termsY = totalClientSavings > 0 ? summaryY + 26 : summaryY + 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("TERMS & CONDITIONS:", 15, termsY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("1. Goods once sold can only be exchanged within 7 days with original estimate/bill.", 15, termsY + 4.5);
    doc.text("2. Electronic and remote control toys carry manufacturer warranty only.", 15, termsY + 8.5);
    doc.text("3. Thank you for shopping with Runr Kids! Visit again.", 15, termsY + 12.5);

    // Financial Calculation Card on Right (Showing Full Savings Breakdown)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(118, summaryY - 3, 79, 44, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(118, summaryY - 3, 79, 44, 2, 2, "D");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    // Total MRP
    doc.text("Total MRP Value:", 123, summaryY + 3);
    doc.text(formatAmount(totalMrp), 193, summaryY + 3, { align: "right" });

    // Store Offer / MRP Discount
    if (mrpSavings > 0) {
      doc.setTextColor(5, 150, 105); // Emerald
      doc.text("Store Discount (MRP Off):", 123, summaryY + 8);
      doc.text(`-${formatAmount(mrpSavings)}`, 193, summaryY + 8, { align: "right" });
    }

    // Subtotal (Billed Rate)
    doc.setTextColor(71, 85, 105);
    doc.text("Subtotal:", 123, summaryY + 13);
    doc.text(formatAmount(subtotal), 193, summaryY + 13, { align: "right" });

    // Additional Customer Discount
    if (additionalDiscount > 0) {
      doc.setTextColor(22, 163, 74);
      doc.text("Additional Discount:", 123, summaryY + 18);
      doc.text(`-${formatAmount(additionalDiscount)}`, 193, summaryY + 18, { align: "right" });
    }

    // Other Charges
    if (data.otherCharges && data.otherCharges > 0) {
      doc.setTextColor(71, 85, 105);
      doc.text("Other / Adjustments:", 123, summaryY + 23);
      doc.text(`+${formatAmount(data.otherCharges)}`, 193, summaryY + 23, { align: "right" });
    }

    // Line above Grand Total
    doc.setDrawColor(203, 213, 225);
    doc.line(118, summaryY + 26.5, 197, summaryY + 26.5);

    // Grand Total Banner
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(120, summaryY + 28.5, 75, 10.5, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("GRAND TOTAL:", 125, summaryY + 35.5);
    doc.setFontSize(11);
    doc.text(`Rs. ${formatAmount(data.grandTotal)}`, 192, summaryY + 35.5, { align: "right" });

    // 7. Signature Footer
    const sigY = 270;
    doc.setDrawColor(203, 213, 225);
    doc.line(138, sigY, 194, sigY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`For ${storeName}`, 166, sigY - 2, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Authorized Signatory", 166, sigY + 4, { align: "center" });

    return new Uint8Array(doc.output("arraybuffer"));
  }

  /**
   * Generate Compact 80mm / 3-inch POS Thermal Receipt PDF with Savings Highlight
   */
  static generateThermalReceipt(data: InvoiceData): Uint8Array {
    const receiptWidthMm = 80;
    const baseHeight = 120;
    const itemHeight = 5.5;
    const dynamicHeight = Math.max(130, baseHeight + data.items.length * itemHeight);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [receiptWidthMm, dynamicHeight],
    });

    const storeName = data.storeName || "RUNR KIDS";
    const storeWebsite = data.storeWebsite || "https://runrkids.in/";
    const invoiceDate = data.createdAt
      ? new Date(data.createdAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      })
      : new Date().toLocaleString("en-IN");

    const subtotal = data.items.reduce((s, i) => s + (Number(i.totalAmount) || Number(i.salesPrice) * i.quantity || 0), 0);
    const totalMrp = data.items.reduce(
      (sum, item) => sum + (Number(item.mrp) || Number(item.salesPrice)) * item.quantity,
      0
    );
    const mrpSavings = Math.max(0, Math.round((totalMrp - subtotal) * 100) / 100);
    const additionalDiscount = Number(data.discount || 0);
    const totalClientSavings = Math.round((mrpSavings + additionalDiscount) * 100) / 100;

    let y = 8;
    // Store Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(storeName, receiptWidthMm / 2, y, { align: "center" });

    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(storeWebsite, receiptWidthMm / 2, y, { align: "center" });

    y += 3.5;
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(4, y, receiptWidthMm - 4, y);
    doc.setLineDashPattern([], 0);

    // Meta
    y += 4;
    doc.setFontSize(7.5);
    doc.text(`Estimate: ${data.invoiceNumber}`, 5, y);
    y += 3.5;
    doc.text(`Date: ${invoiceDate}`, 5, y);
    y += 3.5;
    doc.text(`Customer: ${data.customerName || "Walk-in"}`, 5, y);

    y += 3.5;
    doc.setLineDashPattern([1, 1], 0);
    doc.line(4, y, receiptWidthMm - 4, y);
    doc.setLineDashPattern([], 0);

    // Table Header
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("ITEM / DETAILS", 5, y);
    doc.text("QTY", 45, y, { align: "center" });
    doc.text("PRICE", 59, y, { align: "right" });
    doc.text("TOTAL", 75, y, { align: "right" });

    y += 2.5;
    doc.line(4, y, receiptWidthMm - 4, y);

    // Items with MRP & Sale Price
    y += 3.5;
    data.items.forEach((item) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const name = item.productName.length > 20 ? item.productName.slice(0, 18) + ".." : item.productName;
      doc.text(name, 5, y);
      doc.text(String(item.quantity), 45, y, { align: "center" });
      doc.text(formatAmount(item.salesPrice), 59, y, { align: "right" });
      doc.text(formatAmount(item.totalAmount), 75, y, { align: "right" });

      y += 3.2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(90, 90, 90);
      const mrp = Number(item.mrp) || item.salesPrice;
      if (mrp > item.salesPrice) {
        doc.text(`MRP: ${formatAmount(mrp)} | Sale: ${formatAmount(item.salesPrice)} (Save: ${formatAmount(mrp - item.salesPrice)})`, 5, y);
      } else {
        doc.text(`MRP / Sale: ${formatAmount(item.salesPrice)}`, 5, y);
      }
      doc.setTextColor(0, 0, 0);

      y += 3.8;
    });

    doc.setLineDashPattern([1, 1], 0);
    doc.line(4, y, receiptWidthMm - 4, y);
    doc.setLineDashPattern([], 0);

    // Summary & Savings
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text("Total Items:", 5, y);
    doc.text(String(data.items.length), 75, y, { align: "right" });

    if (totalMrp > subtotal) {
      y += 4;
      doc.text("Total MRP Value:", 5, y);
      doc.text(formatAmount(totalMrp), 75, y, { align: "right" });

      y += 4;
      doc.text("Store Discount:", 5, y);
      doc.text(`-${formatAmount(mrpSavings)}`, 75, y, { align: "right" });
    }

    y += 4;
    doc.text("Subtotal:", 5, y);
    doc.text(formatAmount(subtotal), 75, y, { align: "right" });

    if (additionalDiscount > 0) {
      y += 4;
      doc.text("Additional Discount:", 5, y);
      doc.text(`-${formatAmount(additionalDiscount)}`, 75, y, { align: "right" });
    }

    y += 2;
    doc.setLineWidth(0.3);
    doc.line(4, y, receiptWidthMm - 4, y);

    y += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("GRAND TOTAL:", 5, y);
    doc.text(`Rs. ${formatAmount(data.grandTotal)}`, 75, y, { align: "right" });

    if (totalClientSavings > 0) {
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(`*** YOU SAVED Rs. ${formatAmount(totalClientSavings)} ***`, receiptWidthMm / 2, y, { align: "center" });
    }

    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Thank you for shopping with Runr Kids!", receiptWidthMm / 2, y, { align: "center" });

    return new Uint8Array(doc.output("arraybuffer"));
  }
}
