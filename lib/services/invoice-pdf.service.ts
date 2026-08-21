import { jsPDF } from "jspdf";
import { formatAmount } from "@/lib/utils";

export interface InvoiceItemData {
  barcode: string;
  productName: string;
  hsn?: string;
  mrp: number;
  salesPrice: number;
  quantity: number;
  gstRate?: string;
  gstAmount?: number;
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
  totalGst?: number;
  discount?: number;
  grandTotal: number;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeWebsite?: string;
  storeGstin?: string;
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
   * Generate Full A4 Professional Tax Invoice PDF
   */
  static generateA4Invoice(data: InvoiceData): Uint8Array {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4", // 210mm x 297mm
    });

    const storeName = data.storeName || "RUNR KIDS";
    const storeWebsite = data.storeWebsite || "https://runrkids.in/";
    const storeAddress = data.storeAddress || "Retail Store & Distribution Hub, India";
    const storePhone = data.storePhone || "+91 98765 43210";
    const storeGstin = data.storeGstin || "24AAAAA0000A1Z5";
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
    doc.roundedRect(10, 10, 190, 26, 2, 2, "F");

    // Store Title & Details
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(storeName, 15, 19);

    doc.setFontSize(8.0);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    // doc.text(`${storeAddress} | GSTIN: ${storeGstin}`, 15, 25.5);
    doc.text(`Contact: ${storePhone} | Web: ${storeWebsite}`, 15, 30.5);

    // Invoice Title on Right
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("TAX INVOICE", 193, 20, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("ORIGINAL FOR RECIPIENT", 193, 26, { align: "right" });

    // 3. Customer & Invoice Meta Grid
    doc.setTextColor(15, 23, 42);
    doc.setFillColor(248, 250, 252);
    doc.rect(10, 36, 190, 22, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 58, 200, 58);

    // Left: Customer info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("BILLED TO:", 15, 43);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(data.customerName || "Walk-in Customer", 15, 49);
    if (data.customerPhone) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Phone: ${data.customerPhone}`, 15, 54.5);
    }

    // Right: Invoice Meta
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Invoice No:", 132, 43);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(data.invoiceNumber, 156, 43);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text("Date & Time:", 132, 48.5);
    doc.text(invoiceDate, 156, 48.5);

    doc.text("Payment Mode:", 132, 54);
    doc.setFont("helvetica", "bold");
    doc.text(data.paymentMode || "Cash", 156, 54);

    // 4. Table Header (Clean Non-Overlapping Spacing)
    const tableTopY = 62;
    doc.setFillColor(238, 242, 246);
    doc.rect(10, tableTopY, 190, 8, "F");
    doc.setDrawColor(203, 213, 225);
    doc.line(10, tableTopY + 8, 200, tableTopY + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    doc.text("S.N.", 15, tableTopY + 5.5, { align: "center" });
    doc.text("BARCODE", 30, tableTopY + 5.5, { align: "center" });
    doc.text("ITEM DESCRIPTION", 46, tableTopY + 5.5);
    doc.text("HSN", 112, tableTopY + 5.5, { align: "center" });
    doc.text("MRP", 130, tableTopY + 5.5, { align: "right" });
    doc.text("RATE", 148, tableTopY + 5.5, { align: "right" });
    doc.text("QTY", 162, tableTopY + 5.5, { align: "center" });
    doc.text("GST %", 175, tableTopY + 5.5, { align: "center" });
    doc.text("AMOUNT", 195, tableTopY + 5.5, { align: "right" });

    // 5. Table Rows
    let rowY = tableTopY + 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    data.items.forEach((item, index) => {
      // Alternate row background stripe
      if (index % 2 === 1) {
        doc.setFillColor(249, 250, 252);
        doc.rect(10, rowY - 5, 190, 7.5, "F");
      }

      doc.setTextColor(15, 23, 42);
      doc.text(String(index + 1), 15, rowY, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text(item.barcode, 30, rowY, { align: "center" });

      doc.setFont("helvetica", "normal");
      const truncatedName = item.productName.length > 32 ? item.productName.slice(0, 30) + ".." : item.productName;
      doc.text(truncatedName, 46, rowY);

      doc.text(item.hsn || "9503", 112, rowY, { align: "center" });
      doc.text(formatAmount(item.mrp), 130, rowY, { align: "right" });
      doc.text(formatAmount(item.salesPrice), 148, rowY, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(String(item.quantity), 162, rowY, { align: "center" });
      doc.setFont("helvetica", "normal");

      // Format clean GST rate (e.g. "5%" instead of "0.05")
      let cleanRate = item.gstRate || "5%";
      if (cleanRate === "0.05" || cleanRate === "0.05%") cleanRate = "5%";
      if (!cleanRate.includes("%")) cleanRate = `${parseFloat(cleanRate) * (parseFloat(cleanRate) < 1 ? 100 : 1)}%`;
      doc.text(cleanRate, 175, rowY, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.text(formatAmount(item.totalAmount), 195, rowY, { align: "right" });

      rowY += 7.5;
    });

    // Divider after items table
    doc.setDrawColor(203, 213, 225);
    doc.line(10, rowY - 1, 200, rowY - 1);

    // 6. Balanced Summary & Calculation Section
    // Dynamically position summary below items without excessive gap
    const minSummaryY = Math.max(rowY + 8, 120);
    const summaryY = Math.min(minSummaryY, 215);

    // Amount in Words
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TOTAL AMOUNT IN WORDS:", 15, summaryY);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const amountInWords = this.numberToWords(data.grandTotal);
    doc.text(amountInWords, 15, summaryY + 5.5);

    // Terms & Conditions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("TERMS & CONDITIONS:", 15, summaryY + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("1. Goods once sold can only be exchanged within 7 days with original invoice.", 15, summaryY + 21);
    doc.text("2. Electronic and remote control toys carry brand warranty only.", 15, summaryY + 25.5);
    doc.text("3. Thank you for shopping with Runr Kids! Visit again.", 15, summaryY + 30);

    // GST & Financial Calculation Card on Right
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(120, summaryY - 3, 77, 44, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(120, summaryY - 3, 77, 44, 2, 2, "D");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);

    // Accurate Tax Breakdown
    // Taxable Subtotal = GrandTotal / 1.05
    const taxableValue = data.subtotal > 0 && data.subtotal !== data.grandTotal
      ? data.subtotal
      : Math.round((data.grandTotal / 1.05) * 100) / 100;
    const computedGst = Math.max(0, Math.round((data.grandTotal - taxableValue) * 100) / 100);
    const cgst = Math.round((computedGst / 2) * 100) / 100;
    const sgst = computedGst - cgst;

    doc.text("Taxable Value (Subtotal):", 125, summaryY + 3);
    doc.text(formatAmount(taxableValue), 193, summaryY + 3, { align: "right" });

    doc.text("CGST (2.5%):", 125, summaryY + 8);
    doc.text(formatAmount(cgst), 193, summaryY + 8, { align: "right" });

    doc.text("SGST (2.5%):", 125, summaryY + 13);
    doc.text(formatAmount(sgst), 193, summaryY + 13, { align: "right" });

    doc.text("Total GST (5%):", 125, summaryY + 18);
    doc.text(formatAmount(computedGst), 193, summaryY + 18, { align: "right" });

    if (data.discount && data.discount > 0) {
      doc.setTextColor(22, 163, 74);
      doc.text("Discount:", 125, summaryY + 23);
      doc.text(`-${formatAmount(data.discount)}`, 193, summaryY + 23, { align: "right" });
    }

    // Line above Grand Total
    doc.setDrawColor(203, 213, 225);
    doc.line(120, summaryY + 26.5, 197, summaryY + 26.5);

    // Grand Total Banner
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(122, summaryY + 28.5, 73, 10.5, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("GRAND TOTAL:", 127, summaryY + 35.5);
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
   * Generate Compact 80mm / 3-inch POS Thermal Receipt PDF
   */
  static generateThermalReceipt(data: InvoiceData): Uint8Array {
    const receiptWidthMm = 80;
    const baseHeight = 120;
    const itemHeight = 6;
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
    doc.text("GSTIN: 24AAAAA0000A1Z5", receiptWidthMm / 2, y, { align: "center" });

    y += 3.5;
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(4, y, receiptWidthMm - 4, y);
    doc.setLineDashPattern([], 0);

    // Meta
    y += 4;
    doc.setFontSize(7.5);
    doc.text(`Invoice: ${data.invoiceNumber}`, 5, y);
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
    doc.text("ITEM", 5, y);
    doc.text("QTY", 48, y, { align: "center" });
    doc.text("RATE", 60, y, { align: "right" });
    doc.text("AMT", 75, y, { align: "right" });

    y += 2.5;
    doc.line(4, y, receiptWidthMm - 4, y);

    // Items
    y += 3.5;
    doc.setFont("helvetica", "normal");
    data.items.forEach((item) => {
      const name = item.productName.length > 20 ? item.productName.slice(0, 18) + ".." : item.productName;
      doc.text(name, 5, y);
      doc.text(String(item.quantity), 48, y, { align: "center" });
      doc.text(formatAmount(item.salesPrice), 60, y, { align: "right" });
      doc.text(formatAmount(item.totalAmount), 75, y, { align: "right" });
      y += 4;
    });

    doc.setLineDashPattern([1, 1], 0);
    doc.line(4, y, receiptWidthMm - 4, y);
    doc.setLineDashPattern([], 0);

    // Summary
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text("Total Items:", 5, y);
    doc.text(String(data.items.length), 75, y, { align: "right" });

    const taxableValue = Math.round((data.grandTotal / 1.05) * 100) / 100;
    const computedGst = Math.max(0, Math.round((data.grandTotal - taxableValue) * 100) / 100);

    y += 4;
    doc.text("Taxable Value:", 5, y);
    doc.text(formatAmount(taxableValue), 75, y, { align: "right" });

    y += 4;
    doc.text("GST (5%):", 5, y);
    doc.text(formatAmount(computedGst), 75, y, { align: "right" });

    y += 2;
    doc.setLineWidth(0.3);
    doc.line(4, y, receiptWidthMm - 4, y);

    y += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("GRAND TOTAL:", 5, y);
    doc.text(`Rs. ${formatAmount(data.grandTotal)}`, 75, y, { align: "right" });

    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Thank you for visiting Runr Kids!", receiptWidthMm / 2, y, { align: "center" });

    return new Uint8Array(doc.output("arraybuffer"));
  }
}
