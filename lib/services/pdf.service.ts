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
  mode: "single" | "a4" | "thermal2up" | "4x6" | "4x6_grid" | "4x6_2x5";
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
  barcodeRotation?: 0 | 90 | 180 | 270;
  layoutPreset?: "standard" | "barcode_bottom" | "vertical_left" | "vertical_right";
  // A4 specific grid options
  a4MarginTopMm?: number;
  a4MarginLeftMm?: number;
  a4GapXMm?: number;
  a4GapYMm?: number;
  a4Columns?: number;
  a4Rows?: number;
  autoCenter?: boolean;
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
   * Render a Code 128 barcode image buffer using bwip-js with optional rotation.
   */
  static async generateBarcodeImage(
    code: string,
    rotation: 0 | 90 | 180 | 270 = 0
  ): Promise<string> {
    let rotCode: "N" | "R" | "I" | "L" = "N";
    if (rotation === 90) rotCode = "R";
    else if (rotation === 180) rotCode = "I";
    else if (rotation === 270) rotCode = "L";

    const pngBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: code,
      scale: 4,
      height: 10,
      rotate: rotCode,
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

    const labelWidth = options.labelWidthMm || 35.56;
    const labelHeight = options.labelHeightMm || 25;
    const website = options.website || "https://runrkids.in/";
    const currency = options.currency || "INR";
    const showHri = options.showHri === true;
    const showBorder = options.showBorder === true; // Default false (border off by default)
    const offsetX = options.offsetXmm || 0;
    const offsetY = options.offsetYmm || 0;
    const barcodeRotation = options.barcodeRotation || 0;
    const layoutPreset = options.layoutPreset || "standard";

    // Pre-generate barcode base64 images with exact requested rotation
    const barcodeImages: Record<string, string> = {};
    for (const item of items) {
      if (!barcodeImages[item.barcode]) {
        barcodeImages[item.barcode] = await this.generateBarcodeImage(item.barcode, barcodeRotation);
      }
    }

    const template = this.getDefaultTemplate();

    if (options.mode === "4x6_2x5") {
      const pageW = 101.6;
      const pageH = 152.4;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [pageW, pageH] });

      const columns  = options.a4Columns   ?? 2;
      const lWidth   = options.labelWidthMm  || 47.0;
      const lHeight  = options.labelHeightMm || 23.5;

      const gapX = options.a4GapXMm ?? 2.6;
      const gapY = options.a4GapYMm ?? 4.0; // Always honor requested vertical gap

      // Calculate max rows that fit per page with requested gapY
      const topPad = (options.a4MarginTopMm !== undefined && options.a4MarginTopMm > 0) ? options.a4MarginTopMm : 4.0;
      const availH = pageH - topPad;
      const rowH   = lHeight + gapY;

      let rows = options.a4Rows ?? 5;
      if (topPad + rows * lHeight + (rows - 1) * gapY > pageH + 0.5) {
        rows = Math.max(1, Math.floor((availH + gapY) / rowH));
      }

      const totalGridW = columns * lWidth + (columns - 1) * gapX;
      const totalGridH = rows * lHeight + (rows - 1) * gapY;

      const autoMarginLeft = Math.max(0, (pageW - totalGridW) / 2);
      const autoMarginTop  = Math.max(2.0, (pageH - totalGridH) / 2);

      const isAutoCenter = options.autoCenter !== false;
      const marginLeft = isAutoCenter ? autoMarginLeft : (options.a4MarginLeftMm ?? autoMarginLeft);
      const marginTop  = (options.a4MarginTopMm !== undefined && options.a4MarginTopMm > 0)
        ? options.a4MarginTopMm
        : (isAutoCenter ? autoMarginTop : 4.0);

      const labelsPerPage = columns * rows;
      let labelIdx = 0;

      for (let i = 0; i < items.length; i++) {
        if (i > 0 && i % labelsPerPage === 0) {
          doc.addPage([pageW, pageH], "portrait");
          labelIdx = 0;
        }
        const col = labelIdx % columns;
        const row = Math.floor(labelIdx / columns);
        const x = marginLeft + col * (lWidth  + gapX) + offsetX;
        const y = marginTop  + row * (lHeight + gapY) + offsetY;
        this.renderSingleLabelAt(doc, items[i], barcodeImages[items[i].barcode],
          x, y, lWidth, lHeight, website, currency, showHri, showBorder,
          template, layoutPreset, barcodeRotation);
        labelIdx++;
      }

      return new Uint8Array(doc.output("arraybuffer"));
    } else if (options.mode === "4x6_grid") {
      const pageW = 101.6;
      const pageH = 152.4;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [pageW, pageH] });

      const columns  = options.a4Columns   ?? 2;
      const lWidth   = options.labelWidthMm  || (columns === 1 ? 96.0 : columns === 3 ? 31.0 : 47.0);
      const lHeight  = options.labelHeightMm || 23.5;

      const gapX = options.a4GapXMm ?? (columns === 1 ? 0 : columns === 3 ? 2.0 : 2.6);
      const gapY = options.a4GapYMm ?? (columns === 1 ? 4.0 : 2.0); // Always honor requested vertical gap

      // Calculate max rows that fit per page with requested gapY
      const topPad = (options.a4MarginTopMm !== undefined && options.a4MarginTopMm > 0) ? options.a4MarginTopMm : 4.0;
      const availH = pageH - topPad;
      const rowH   = lHeight + gapY;

      let rows = options.a4Rows ?? (columns === 1 ? 5 : 6);
      if (topPad + rows * lHeight + (rows - 1) * gapY > pageH + 0.5) {
        rows = Math.max(1, Math.floor((availH + gapY) / rowH));
      }

      const totalGridW = columns * lWidth + (columns - 1) * gapX;
      const totalGridH = rows * lHeight + (rows - 1) * gapY;

      const autoMarginLeft = Math.max(0, (pageW - totalGridW) / 2);
      const autoMarginTop  = Math.max(2.0, (pageH - totalGridH) / 2);

      const isAutoCenter = options.autoCenter !== false;
      const marginLeft = isAutoCenter ? autoMarginLeft : (options.a4MarginLeftMm ?? autoMarginLeft);
      const marginTop  = (options.a4MarginTopMm !== undefined && options.a4MarginTopMm > 0)
        ? options.a4MarginTopMm
        : (isAutoCenter ? autoMarginTop : 4.0);

      const labelsPerPage = columns * rows;
      let labelIdx = 0;

      for (let i = 0; i < items.length; i++) {
        if (i > 0 && i % labelsPerPage === 0) {
          doc.addPage([pageW, pageH], "portrait");
          labelIdx = 0;
        }
        const col = labelIdx % columns;
        const row = Math.floor(labelIdx / columns);
        const x = marginLeft + col * (lWidth  + gapX) + offsetX;
        const y = marginTop  + row * (lHeight + gapY) + offsetY;
        this.renderSingleLabelAt(doc, items[i], barcodeImages[items[i].barcode],
          x, y, lWidth, lHeight, website, currency, showHri, showBorder,
          template, layoutPreset, barcodeRotation);
        labelIdx++;
      }

      return new Uint8Array(doc.output("arraybuffer"));
    } else if (options.mode === "4x6") {
      const pageW = 101.6;
      const pageH = 152.4;
      const lWidth = options.labelWidthMm || 101.6;
      const lHeight = options.labelHeightMm || 152.4;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pageW, pageH],
      });

      // Calculate label position on 4"x6" paper
      const isAutoCenter = options.autoCenter !== false;
      const labelX = isAutoCenter ? Math.max(0, (pageW - lWidth) / 2) + offsetX : (options.a4MarginLeftMm || 0) + offsetX;

      // Vertical position: use explicit top margin if provided; else auto-center if smaller than page, or default 8mm padding
      const customTopMargin = options.a4MarginTopMm;
      let labelY = offsetY;
      if (customTopMargin !== undefined && customTopMargin > 0) {
        labelY += customTopMargin;
      } else if (isAutoCenter && lHeight < pageH) {
        labelY += Math.max(8.0, (pageH - lHeight) / 2);
      } else {
        labelY += 8.0; // default top padding to prevent top-edge clipping
      }

      for (let i = 0; i < items.length; i++) {
        if (i > 0) doc.addPage([pageW, pageH], "portrait");
        const item = items[i];
        const bg = barcodeImages[item.barcode];

        this.renderSingleLabelAt(
          doc,
          item,
          bg,
          labelX,
          labelY,
          lWidth,
          lHeight,
          website,
          currency,
          showHri,
          showBorder,
          template,
          layoutPreset,
          barcodeRotation
        );
      }

      return new Uint8Array(doc.output("arraybuffer"));
    } else if (options.mode === "single") {
      const orientation = labelWidth >= labelHeight ? "landscape" : "portrait";
      const doc = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: [labelWidth, labelHeight],
      });

      for (let i = 0; i < items.length; i++) {
        if (i > 0) doc.addPage([labelWidth, labelHeight], orientation);
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
          template,
          layoutPreset,
          barcodeRotation
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
      const gapX = options.a4GapXMm ?? 4;
      const rollWidth = labelWidth * 2 + gapX;

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
          template,
          layoutPreset,
          barcodeRotation
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
            template,
            layoutPreset,
            barcodeRotation
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
          template,
          layoutPreset,
          barcodeRotation
        );
        labelIdx++;
      }

      return new Uint8Array(doc.output("arraybuffer"));
    }
  }

  /**
   * Render single label at specific (x, y) physical millimeter coordinates matching layoutPreset and barcodeRotation.
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
    tmpl: LabelTemplateConfig,
    layoutPreset: "standard" | "barcode_bottom" | "vertical_left" | "vertical_right" = "standard",
    barcodeRotation: 0 | 90 | 180 | 270 = 0
  ) {
    // 0. OUTER ROUNDED BORDER BOX
    if (showBorder) {
      doc.setLineWidth(w > 80 ? 0.8 : 0.3);
      doc.setDrawColor(0, 0, 0);
      doc.roundedRect(x, y, w, h, 1.2, 1.2);
    }

    if (h > 100 || (w > 80 && h > 80)) {
      // Single Giant Label Mode (1 Label fills entire page height e.g. 4"x6" or 2.4"x6")
      const margin = 4.0;
      const contentW = w - margin * 2;
      const sy = h / 152.4; // Height scale factor

      // 1. PRODUCT TITLE
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(Math.min(16.0, Math.max(10.0, 16.0 * (w / 101.6))));
      let splitName = doc.splitTextToSize(item.productName.toUpperCase(), contentW - 8);
      if (splitName.length > 2) splitName = splitName.slice(0, 2);
      doc.text(splitName, x + w / 2, y + 18.0 * sy, { align: "center" });

      // 2. GIANT BARCODE
      const isVertical = barcodeRotation === 90 || barcodeRotation === 270;
      const bcW = isVertical ? 22.0 * (w / 101.6) : Math.min(85.0 * (w / 101.6), contentW - 10);
      const bcH = (isVertical ? 50.0 : (showHri ? 26.0 : 32.0)) * sy;
      const bcX = x + (w - bcW) / 2;
      const bcY = y + 26.0 * sy;
      doc.addImage(barcodeImg, "PNG", bcX, bcY, bcW, bcH);

      // 3. HRI NUMBER
      if (showHri) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(Math.min(10.0, Math.max(7.0, 10.0 * (w / 101.6))));
        const spacedBarcode = item.barcode.split("").join(" ");
        doc.text(spacedBarcode, x + w / 2, bcY + bcH + 5.5 * sy, { align: "center" });
      }

      // 4. SALE PRICE HERO
      doc.setFont("helvetica", "bold");
      const titleFont = Math.min(16.0, Math.max(10.0, 16.0 * (w / 101.6)));
      const priceFont = Math.min(26.0, Math.max(14.0, 26.0 * (w / 101.6)));
      doc.setFontSize(titleFont);
      const labelW = doc.getTextWidth("SALE PRICE: ");
      doc.setFontSize(priceFont);
      const amountStr = formatAmount(item.salesPrice);
      const priceW = doc.getTextWidth(amountStr);
      const startX = x + w / 2 - (labelW + priceW) / 2;

      doc.setFontSize(titleFont);
      doc.text("SALE PRICE: ", startX, y + 84.0 * sy);
      doc.setFontSize(priceFont);
      doc.text(amountStr, startX + labelW, y + 84.0 * sy);

      // Separator 1
      doc.setLineWidth(0.4);
      doc.setDrawColor(40, 40, 40);
      doc.line(x + margin + 4, y + 92.0 * sy, x + w - margin - 4, y + 92.0 * sy);

      // 5. MRP SECTION
      doc.setFont("helvetica", "bold");
      doc.setFontSize(Math.min(16.0, Math.max(10.0, 16.0 * (w / 101.6))));
      doc.text(`MRP: ${formatAmount(item.mrp)}`, x + w / 2, y + 108.0 * sy, { align: "center" });

      // Separator 2
      doc.line(x + margin + 4, y + 116.0 * sy, x + w - margin - 4, y + 116.0 * sy);

      // 6. FOOTER ROW
      doc.setFont("helvetica", "bold");
      doc.setFontSize(Math.min(11.0, Math.max(7.0, 11.0 * (w / 101.6))));
      doc.text(`NET QTY: ${item.netQuantity || "1U"}`, x + margin + 6, y + 138.0 * sy);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(Math.min(10.0, Math.max(6.0, 10.0 * (w / 101.6))));
      doc.text(website, x + w - margin - 6, y + 138.0 * sy, { align: "right" });

      return;
    }

    const marginX = 1.8;

    if (layoutPreset === "vertical_left") {
      // 1. Barcode on Left side (Vertical 90° / 270°)
      const bcW = 6.0;
      const bcH = Math.min(21.0, h - 3.0);
      const bcX = x + 1.2;
      const bcY = y + (h - bcH) / 2;
      doc.addImage(barcodeImg, "PNG", bcX, bcY, bcW, bcH);

      // Vertical Separator Line
      doc.setLineWidth(0.12);
      doc.setDrawColor(60, 60, 60);
      doc.line(x + 8.2, y + 1.5, x + 8.2, y + h - 1.5);

      // Right content area
      const rx = x + 8.8;
      const rw = w - 9.8;
      const rCenterX = rx + rw / 2;

      // Product Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.0);
      let splitName = doc.splitTextToSize(item.productName.toUpperCase(), rw);
      if (splitName.length > 2) splitName = splitName.slice(0, 2);
      doc.text(splitName, rCenterX, y + 2.8, { align: "center" });

      // Sale Price Hero
      this.renderSalePriceHero(doc, item.salesPrice, rCenterX, y + 9.0, rw);

      // Separator 1
      doc.setLineWidth(0.12);
      doc.setDrawColor(40, 40, 40);
      doc.line(rx, y + 11.2, rx + rw, y + 11.2);

      // MRP
      this.renderCenteredMrp(doc, item.mrp, rCenterX, y + 15.0, rw);

      // Separator 2
      doc.line(rx, y + 17.2, rx + rw, y + 17.2);

      // Footer
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.0);
      doc.text(`NET QTY: ${item.netQuantity || "1U"}`, rx, y + 22.0);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.8);
      doc.text(website, rx + rw, y + 22.0, { align: "right" });
    } else if (layoutPreset === "vertical_right") {
      // Barcode on Right side (Vertical 90° / 270°)
      const bcW = 6.0;
      const bcH = Math.min(21.0, h - 3.0);
      const bcX = x + w - 7.2;
      const bcY = y + (h - bcH) / 2;
      doc.addImage(barcodeImg, "PNG", bcX, bcY, bcW, bcH);

      // Vertical Separator Line
      doc.setLineWidth(0.12);
      doc.setDrawColor(60, 60, 60);
      doc.line(x + w - 8.2, y + 1.5, x + w - 8.2, y + h - 1.5);

      // Left content area
      const lx = x + 1.5;
      const lw = w - 10.0;
      const lCenterX = lx + lw / 2;

      // Product Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.0);
      let splitName = doc.splitTextToSize(item.productName.toUpperCase(), lw);
      if (splitName.length > 2) splitName = splitName.slice(0, 2);
      doc.text(splitName, lCenterX, y + 2.8, { align: "center" });

      // Sale Price Hero
      this.renderSalePriceHero(doc, item.salesPrice, lCenterX, y + 9.0, lw);

      // Separator 1
      doc.setLineWidth(0.12);
      doc.setDrawColor(40, 40, 40);
      doc.line(lx, y + 11.2, lx + lw, y + 11.2);

      // MRP
      this.renderCenteredMrp(doc, item.mrp, lCenterX, y + 15.0, lw);

      // Separator 2
      doc.line(lx, y + 17.2, lx + lw, y + 17.2);

      // Footer
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.0);
      doc.text(`NET QTY: ${item.netQuantity || "1U"}`, lx, y + 22.0);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(4.8);
      doc.text(website, lx + lw, y + 22.0, { align: "right" });
    } else if (layoutPreset === "barcode_bottom") {
      const contentW = w - marginX * 2;

      // 1. Title at top (Auto-Scaled)
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);

      const titleStr = item.productName.toUpperCase();
      let fontSize = 6.5;
      doc.setFontSize(fontSize);
      let textW = doc.getTextWidth(titleStr);

      while (textW > contentW && fontSize > 4.0) {
        fontSize -= 0.15;
        doc.setFontSize(fontSize);
        textW = doc.getTextWidth(titleStr);
      }

      doc.text(titleStr, x + w / 2, y + 2.8, { align: "center" });

      // 2. SALE PRICE HERO
      this.renderSalePriceHero(doc, item.salesPrice, x + w / 2, y + 6.5, contentW);

      // Separator 1
      doc.setLineWidth(0.12);
      doc.setDrawColor(40, 40, 40);
      doc.line(x + marginX, y + 7.8, x + w - marginX, y + 7.8);

      // 3. MRP
      this.renderCenteredMrp(doc, item.mrp, x + w / 2, y + 10.2, contentW);

      // Separator 2
      doc.line(x + marginX, y + 11.4, x + w - marginX, y + 11.4);

      // 4. Barcode at bottom
      const isVertical = barcodeRotation === 90 || barcodeRotation === 270;
      const bcW = isVertical ? 5.5 : Math.min(38.0, contentW);
      const bcH = isVertical ? 9.5 : 7.0;
      const bcX = x + (w - bcW) / 2;
      const bcY = y + 12.0;
      doc.addImage(barcodeImg, "PNG", bcX, bcY, bcW, bcH);

      // 5. Footer
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.text(`NET QTY: ${item.netQuantity || "1U"}`, x + marginX, y + 21.2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.8);
      doc.text(website, x + w - marginX, y + 21.2, { align: "right" });
    } else {
      // "standard" preset (Barcode at top centered)
      const contentW = w - marginX * 2;

      // 1. PRODUCT TITLE (Top Centered - Auto-Scaled)
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);

      const titleStr = item.productName.toUpperCase();
      let fontSize = 6.5;
      doc.setFontSize(fontSize);
      let textW = doc.getTextWidth(titleStr);

      while (textW > contentW && fontSize > 4.0) {
        fontSize -= 0.15;
        doc.setFontSize(fontSize);
        textW = doc.getTextWidth(titleStr);
      }

      doc.text(titleStr, x + w / 2, y + 2.5, { align: "center" });

      // 2. BARCODE IMAGE & HRI NUMBER
      const isVertical = barcodeRotation === 90 || barcodeRotation === 270;
      const bcW = isVertical ? 5.5 : Math.min(32.0, contentW);
      const bcH = isVertical ? 8.5 : (showHri ? 3.6 : 4.6);
      const bcX = x + (w - bcW) / 2;
      const bcY = y + 3.6;

      doc.addImage(barcodeImg, "PNG", bcX, bcY, bcW, bcH);

      // 3. HRI NUMBER (Properly positioned below the barcode bars with zero overlap)
      if (showHri) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.0);
        doc.setTextColor(0, 0, 0);
        const spacedBarcode = item.barcode.split("").join(" ");
        doc.text(spacedBarcode, x + w / 2, y + 8.4, { align: "center" });
      }

      // 4. SALE PRICE HERO SECTION
      this.renderSalePriceHero(doc, item.salesPrice, x + w / 2, y + 12.6, contentW);

      // 5. HORIZONTAL SEPARATOR LINE #1
      doc.setLineWidth(0.12);
      doc.setDrawColor(40, 40, 40);
      doc.line(x + marginX, y + 13.8, x + w - marginX, y + 13.8);

      // 6. MRP SECTION
      this.renderCenteredMrp(doc, item.mrp, x + w / 2, y + 16.4, contentW);

      // 7. HORIZONTAL SEPARATOR LINE #2
      doc.setLineWidth(0.12);
      doc.setDrawColor(40, 40, 40);
      doc.line(x + marginX, y + 17.6, x + w - marginX, y + 17.6);

      // 8. FOOTER ROW
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.text(`NET QTY: ${item.netQuantity || "1U"}`, x + marginX, y + 20.8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.text(website, x + w - marginX, y + 20.8, { align: "right" });
    }
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
