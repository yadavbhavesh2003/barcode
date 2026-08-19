import { jsPDF } from "jspdf";
import bwipjs from "bwip-js";
import { formatAmount } from "../utils";

export interface LabelItemData {
  productName: string;
  mrp: number;
  salesPrice: number;
  netQuantity: string;
  barcode: string;
}

export interface PDFOptions {
  mode: "single" | "a4" | "thermal2up";
  labelWidthMm?: number;
  labelHeightMm?: number;
  website?: string;
  currency?: string;
  showHri?: boolean;
  showBorder?: boolean;
  offsetXmm?: number;
  offsetYmm?: number;
  scalePct?: number;
  barcodeHeightMm?: number;
  // A4 specific grid options
  a4MarginTopMm?: number;
  a4MarginLeftMm?: number;
  a4GapXMm?: number;
  a4GapYMm?: number;
  a4Columns?: number;
  a4Rows?: number;
}

export interface LabelTemplateConfig {
  width: number;
  height: number;
  margin: number;
  productName: { x: number; y: number; width: number; height: number };
  barcode: { x: number; y: number; width: number; height: number };
  hri: { x: number; y: number; width: number; height: number };
  netQuantity: { x: number; y: number; width: number; height: number };
  mrp: { x: number; y: number; width: number; height: number };
  salesPrice: { x: number; y: number; width: number; height: number };
  website: { x: number; y: number; width: number; height: number };
}

export class PDFService {
  /**
   * Default Label Template Configuration (50mm x 25mm landscape in mm)
   */
  static getDefaultTemplate(): LabelTemplateConfig {
    return {
      width: 50,
      height: 25,
      margin: 1.2,
      productName: { x: 1.2, y: 1.0, width: 47.6, height: 3.5 },
      barcode: { x: 6.0, y: 3.8, width: 38.0, height: 5.0 },
      hri: { x: 1.2, y: 10.2, width: 47.6, height: 2.0 },
      netQuantity: { x: 1.2, y: 23.2, width: 20.0, height: 1.8 },
      mrp: { x: 12.0, y: 18.6, width: 26.0, height: 2.4 },
      salesPrice: { x: 1.2, y: 14.5, width: 47.6, height: 3.8 },
      website: { x: 25.0, y: 23.2, width: 23.0, height: 1.8 },
    };
  }

  /**
   * Render a Code 128 barcode image buffer using bwip-js.
   */
  static async generateBarcodeImage(code: string): Promise<string> {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: code,
      scale: 4,
      height: 10,
      includetext: false,
      backgroundcolor: "FFFFFF",
    });

    const base64 = pngBuffer.toString("base64");
    return `data:image/png;base64,${base64}`;
  }

  /**
   * Validate A4 Grid boundaries to ensure labels never extend outside 210mm x 297mm.
   */
  static validateA4Bounds(options: PDFOptions) {
    if (options.mode !== "a4") return;

    const labelWidth = options.labelWidthMm || 50;
    const labelHeight = options.labelHeightMm || 25;
    const marginTop = options.a4MarginTopMm ?? 10;
    const marginLeft = options.a4MarginLeftMm ?? 12;
    const gapX = options.a4GapXMm ?? 4;
    const gapY = options.a4GapYMm ?? 3;
    const columns = options.a4Columns ?? 2;
    const rows = options.a4Rows ?? 5;

    const totalWidth = marginLeft + columns * labelWidth + (columns - 1) * gapX;
    const totalHeight = marginTop + rows * labelHeight + (rows - 1) * gapY;

    if (totalWidth > 210.1) {
      throw new Error(
        `A4 Grid configuration (${columns} columns × ${labelWidth}mm + ${marginLeft}mm margin = ${totalWidth.toFixed(1)}mm) exceeds A4 physical width (210mm). Please reduce columns or margins.`
      );
    }

    if (totalHeight > 297.1) {
      throw new Error(
        `A4 Grid configuration (${rows} rows × ${labelHeight}mm + ${marginTop}mm margin = ${totalHeight.toFixed(1)}mm) exceeds A4 physical height (297mm). Please reduce rows or margins.`
      );
    }
  }

  /**
   * Draw a crisp vector Indian Rupee (₹) symbol in PDF matching Helvetica font weight.
   */
  static drawRupeeSymbol(doc: jsPDF, x: number, y: number, heightMm = 1.4, isBold = true) {
    const lineWidth = heightMm * (isBold ? 0.16 : 0.12);
    doc.setLineWidth(lineWidth);
    doc.setDrawColor(0, 0, 0);

    const topY = y - heightMm * 0.65;
    const midY = y - heightMm * 0.35;
    const botY = y + heightMm * 0.25;
    const barW = heightMm * 0.52;

    // Top horizontal bar
    doc.line(x, topY, x + barW, topY);
    // Middle horizontal bar
    doc.line(x, midY, x + barW * 0.85, midY);
    // Vertical stem & upper loop
    doc.line(x + barW * 0.15, topY, x + barW * 0.15, midY + heightMm * 0.2);
    doc.line(x + barW * 0.15, midY + heightMm * 0.2, x + barW * 0.55, midY + heightMm * 0.2);
    // Diagonal leg
    doc.line(x + barW * 0.2, midY + heightMm * 0.2, x + barW * 0.7, botY);
  }

  /**
   * Render SALE PRICE in giant bold hero font centered horizontally (no rupee sign).
   */
  private static renderSalePriceHero(
    doc: jsPDF,
    amount: number,
    centerX: number,
    y: number,
    maxW: number
  ) {
    let labelFont = 7.2;
    let priceFont = 11.5;

    const amountStr = formatAmount(amount); // e.g. "1,020/-"

    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelFont);
    const labelW = doc.getTextWidth("SALE PRICE: ");

    doc.setFontSize(priceFont);
    const priceW = doc.getTextWidth(amountStr);

    let totalW = labelW + priceW;

    // Auto-scale if long price
    while (totalW > maxW && priceFont > 7.0) {
      priceFont -= 0.3;
      labelFont -= 0.15;
      doc.setFontSize(labelFont);
      const lW = doc.getTextWidth("SALE PRICE: ");
      doc.setFontSize(priceFont);
      const pW = doc.getTextWidth(amountStr);
      totalW = lW + pW;
    }

    const startX = centerX - totalW / 2;

    // 1. Draw "SALE PRICE: "
    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelFont);
    doc.text("SALE PRICE: ", startX, y);

    // 2. Draw giant price "1,020/-"
    const amountX = startX + labelW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(priceFont);
    doc.text(amountStr, amountX, y);
  }

  /**
   * Render MRP centered horizontally (no rupee sign).
   */
  private static renderCenteredMrp(
    doc: jsPDF,
    mrp: number,
    centerX: number,
    y: number,
    maxW: number
  ) {
    let fontSize = 7.5;
    const amountStr = formatAmount(mrp); // e.g. "1,599/-"
    const text = `MRP: ${amountStr}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);

    let totalW = doc.getTextWidth(text);

    while (totalW > maxW && fontSize > 4.5) {
      fontSize -= 0.2;
      doc.setFontSize(fontSize);
      totalW = doc.getTextWidth(text);
    }

    doc.text(text, centerX, y, { align: "center" });
  }

  /**
   * Generate PDF document for an array of label items.
   */
  static async generatePDF(
    items: LabelItemData[],
    options: PDFOptions
  ): Promise<Uint8Array> {
    // Validate A4 grid bounds if in A4 mode
    this.validateA4Bounds(options);

    const labelWidth = options.labelWidthMm || 50;
    const labelHeight = options.labelHeightMm || 25;
    const website = options.website || "https://runrkids.in/";
    const currency = options.currency || "INR";
    const showHri = options.showHri === true; // Default OFF to hide barcode number in PDF
    const showBorder = options.showBorder !== false; // Default ON
    const offsetX = options.offsetXmm || 0;
    const offsetY = options.offsetYmm || 0;

    // Pre-generate barcode base64 images
    const barcodeImages: Record<string, string> = {};
    for (const item of items) {
      if (!barcodeImages[item.barcode]) {
        barcodeImages[item.barcode] = await this.generateBarcodeImage(item.barcode);
      }
    }

    const template = this.getDefaultTemplate();

    if (options.mode === "single") {
      // 50 x 25 mm Landscape PDF (1 label per page)
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [labelWidth, labelHeight],
      });

      for (let i = 0; i < items.length; i++) {
        if (i > 0) doc.addPage([labelWidth, labelHeight], "landscape");
        const item = items[i];
        const bg = barcodeImages[item.barcode];

        this.renderSingleLabelAt(
          doc,
          item,
          bg,
          offsetX,
          offsetY,
          labelWidth,
          labelHeight,
          website,
          currency,
          showHri,
          showBorder,
          template
        );
      }

      const pageCount = doc.getNumberOfPages();
      if (pageCount !== items.length) {
        throw new Error(
          `PDF Integrity failure: Expected ${items.length} labels, but generated ${pageCount} pages.`
        );
      }

      return new Uint8Array(doc.output("arraybuffer"));
    } else if (options.mode === "thermal2up") {
      // 2-Up Thermal Roll Paper (104 mm x 25 mm continuous roll row - 2 labels side-by-side per page/row)
      const gapX = options.a4GapXMm ?? 4;
      const rollWidth = labelWidth * 2 + gapX; // 104mm

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [rollWidth, labelHeight],
      });

      for (let i = 0; i < items.length; i += 2) {
        if (i > 0) doc.addPage([rollWidth, labelHeight], "landscape");

        // Left Label
        const itemLeft = items[i];
        const bgLeft = barcodeImages[itemLeft.barcode];
        this.renderSingleLabelAt(
          doc,
          itemLeft,
          bgLeft,
          offsetX,
          offsetY,
          labelWidth,
          labelHeight,
          website,
          currency,
          showHri,
          showBorder,
          template
        );

        // Right Label (if exists in pair)
        if (i + 1 < items.length) {
          const itemRight = items[i + 1];
          const bgRight = barcodeImages[itemRight.barcode];
          this.renderSingleLabelAt(
            doc,
            itemRight,
            bgRight,
            labelWidth + gapX + offsetX,
            offsetY,
            labelWidth,
            labelHeight,
            website,
            currency,
            showHri,
            showBorder,
            template
          );
        }
      }

      return new Uint8Array(doc.output("arraybuffer"));
    } else {
      // A4 Sheet multi-label grid layout (210 x 297 mm)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const marginTop = options.a4MarginTopMm ?? 10;
      const marginLeft = options.a4MarginLeftMm ?? 12;
      const gapX = options.a4GapXMm ?? 4;
      const gapY = options.a4GapYMm ?? 3;
      const columns = options.a4Columns ?? 2;
      const rows = options.a4Rows ?? 5;

      const labelsPerPage = columns * rows;
      let labelIdx = 0;

      for (let i = 0; i < items.length; i++) {
        if (i > 0 && i % labelsPerPage === 0) {
          doc.addPage("a4", "portrait");
          labelIdx = 0;
        }

        const col = labelIdx % columns;
        const row = Math.floor(labelIdx / columns);

        const x = marginLeft + col * (labelWidth + gapX) + offsetX;
        const y = marginTop + row * (labelHeight + gapY) + offsetY;

        const item = items[i];
        const bg = barcodeImages[item.barcode];

        this.renderSingleLabelAt(
          doc,
          item,
          bg,
          x,
          y,
          labelWidth,
          labelHeight,
          website,
          currency,
          showHri,
          showBorder,
          template
        );
        labelIdx++;
      }

      return new Uint8Array(doc.output("arraybuffer"));
    }
  }

  /**
   * Render single label at specific (x, y) physical millimeter coordinates matching exact NEW DESIGN.
   */
  private static renderSingleLabelAt(
    doc: jsPDF,
    item: LabelItemData,
    barcodeImg: string,
    x: number,
    y: number,
    w: number,
    h: number,
    website: string,
    currency: string,
    showHri: boolean,
    showBorder: boolean,
    tmpl: LabelTemplateConfig
  ) {
    // 0. OUTER ROUNDED BORDER BOX
    if (showBorder) {
      doc.setLineWidth(0.3); // Crisp 0.3mm border
      doc.setDrawColor(0, 0, 0);
      doc.roundedRect(x, y, w, h, 1.2, 1.2);
    }

    const marginX = 1.8;
    const contentW = w - marginX * 2; // 46.4mm width

    // 1. PRODUCT TITLE (Top Centered)
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);

    let fontSize = 6.5;
    doc.setFontSize(fontSize);
    let splitName = doc.splitTextToSize(item.productName.toUpperCase(), contentW);

    if (splitName.length > 2) {
      fontSize = 5.2;
      doc.setFontSize(fontSize);
      splitName = doc.splitTextToSize(item.productName.toUpperCase(), contentW).slice(0, 2);
      if (splitName[1] && splitName[1].length > 3) {
        splitName[1] = splitName[1].substring(0, splitName[1].length - 3) + "...";
      }
    }

    // Baseline for Title Line 1: y + 2.8mm
    doc.text(splitName, x + w / 2, y + 2.8, { align: "center" });

    // 2. BARCODE IMAGE (Centered below title)
    const bcW = Math.min(38.0, contentW);
    const bcH = 4.8; // 4.8mm tall
    const bcX = x + (w - bcW) / 2;
    const bcY = y + 3.8;

    doc.addImage(barcodeImg, "PNG", bcX, bcY, bcW, bcH);

    // 3. HRI NUMBER (Spaced code string e.g. 0 0 0 0 0 1 2 3 centered below barcode)
    if (showHri) {
      doc.setFont("courier", "bold");
      doc.setFontSize(5.5);
      const spacedBarcode = item.barcode.split("").join(" ");
      doc.text(spacedBarcode, x + w / 2, y + 10.1, { align: "center" });
    }

    // 4. SALE PRICE HERO SECTION (Centered, Giant Bold Numbers)
    this.renderSalePriceHero(doc, item.salesPrice, x + w / 2, y + 14.5, contentW);

    // 5. HORIZONTAL SEPARATOR LINE #1 (Below SALE PRICE)
    doc.setLineWidth(0.12);
    doc.setDrawColor(40, 40, 40);
    doc.line(x + marginX, y + 15.8, x + w - marginX, y + 15.8);

    // 6. MRP SECTION (Centered)
    this.renderCenteredMrp(doc, item.mrp, x + w / 2, y + 18.6, contentW);

    // 7. HORIZONTAL SEPARATOR LINE #2 (Below MRP)
    doc.setLineWidth(0.12);
    doc.setDrawColor(40, 40, 40);
    doc.line(x + marginX, y + 19.9, x + w - marginX, y + 19.9);

    // 8. FOOTER ROW (Bottom: Left NET QTY | Right Website)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.text(`NET QTY: ${item.netQuantity || "1U"}`, x + marginX, y + 23.2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.0);
    doc.text(website, x + w - marginX, y + 23.2, { align: "right" });
  }

  /**
   * Generate Print Test Label PDF with exact 50mm x 25mm measurement rulers matching new design.
   */
  static generateTestLabelPDF(): Uint8Array {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [50, 25],
    });

    doc.setLineWidth(0.3);
    doc.setDrawColor(0, 0, 0);
    doc.roundedRect(1, 1, 48, 23, 1.2, 1.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text("STEERING WHEEL 868", 25, 2.8, { align: "center" });

    // Barcode number (HRI) omitted when hidden by default
    // doc.setFont("courier", "bold");
    // doc.setFontSize(5.5);
    // doc.text("0 0 0 0 0 1 2 3", 25, 10.1, { align: "center" });

    this.renderSalePriceHero(doc, 1020, 25, 14.5, 46);

    doc.setLineWidth(0.12);
    doc.setDrawColor(40, 40, 40);
    doc.line(1.8, 15.8, 48.2, 15.8);

    this.renderCenteredMrp(doc, 1599, 25, 18.6, 46);

    doc.line(1.8, 19.9, 48.2, 19.9);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.text("NET QTY: 1U", 1.8, 23.2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.0);
    doc.text("https://runrkids.in/", 48.2, 23.2, { align: "right" });

    return new Uint8Array(doc.output("arraybuffer"));
  }
}
