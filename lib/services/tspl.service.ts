import { formatAmount } from "../utils";
import { LabelItemData } from "./pdf.service";

export interface TSPLOptions {
  mode: "thermal2up" | "single" | "4x6" | "4x6_grid" | "4x6_2x5";
  labelWidthMm?: number;
  labelHeightMm?: number;
  gapXMm?: number;
  gapYMm?: number;
  website?: string;
  showHri?: boolean;
  barcodeRotation?: 0 | 90 | 180 | 270;
  layoutPreset?: "standard" | "barcode_bottom" | "vertical_left" | "vertical_right";
}

export class TSPLService {
  /**
   * Generate TSPL2 (TSC Printer Command Language) code for direct printing to TSC barcode printers.
   * This bypasses all browser PDF driver scaling and page height issues.
   */
  static generateTSPL(items: LabelItemData[], options: TSPLOptions): string {
    const labelWidth = options.labelWidthMm || 50;
    const labelHeight = options.labelHeightMm || 25;
    const gapY = options.gapYMm || 3;
    const gapX = options.gapXMm || 4;
    const website = options.website || "https://runrkids.in/";
    const showHri = options.showHri === true;
    const barcodeRotation = options.barcodeRotation || 0;
    const layoutPreset = options.layoutPreset || "standard";

    // 203 DPI: 1mm = 8 dots
    const dotsPerMm = 8;
    let commands: string[] = [];

    if (options.mode === "4x6_2x5") {
      const pageW = 101.6;
      const pageH = 152.4;
      commands.push(`SIZE ${pageW} mm, ${pageH} mm`);
      commands.push(`GAP ${gapY} mm, 0 mm`);
      commands.push(`DIRECTION 1`);
      commands.push(`SET TEAR ON`);

      const columns = 2;
      const rows = 5;
      const lWidth = 47.0;
      const lHeight = 23.5;
      const gapXDots = 2.6;
      const gapYDots = 4.0;
      const marginLeft = 2.5;
      const marginTop = 9.4;
      const labelsPerPage = 10;

      for (let i = 0; i < items.length; i += labelsPerPage) {
        commands.push(`CLS`);
        const chunk = items.slice(i, i + labelsPerPage);
        chunk.forEach((item, idx) => {
          const col = idx % columns;
          const row = Math.floor(idx / columns);
          const xOff = marginLeft + col * (lWidth + gapXDots);
          const yOff = marginTop + row * (lHeight + gapYDots);

          commands.push(
            ...this.generateLabelTSPL(
              item,
              xOff,
              lWidth,
              lHeight,
              dotsPerMm,
              website,
              showHri,
              barcodeRotation,
              layoutPreset
            )
          );
        });
        commands.push(`PRINT 1,1`);
      }
    } else if (options.mode === "4x6_grid") {
      const pageW = 101.6;
      const pageH = 152.4;
      commands.push(`SIZE ${pageW} mm, ${pageH} mm`);
      commands.push(`GAP ${gapY} mm, 0 mm`);
      commands.push(`DIRECTION 1`);
      commands.push(`SET TEAR ON`);

      const columns = 2;
      const rows = 6;
      const lWidth = 48.0;
      const lHeight = 23.5;
      const gapXDots = 2.0;
      const gapYDots = 1.5;
      const marginLeft = 1.8;
      const marginTop = 2.0;
      const labelsPerPage = columns * rows;

      for (let i = 0; i < items.length; i += labelsPerPage) {
        commands.push(`CLS`);
        const chunk = items.slice(i, i + labelsPerPage);
        chunk.forEach((item, idx) => {
          const col = idx % columns;
          const row = Math.floor(idx / columns);
          const xOff = marginLeft + col * (lWidth + gapXDots);
          const yOff = marginTop + row * (lHeight + gapYDots);

          commands.push(
            ...this.generateLabelTSPL(
              item,
              xOff,
              lWidth,
              lHeight,
              dotsPerMm,
              website,
              showHri,
              barcodeRotation,
              layoutPreset
            )
          );
        });
        commands.push(`PRINT 1,1`);
      }
    } else if (options.mode === "4x6") {
      const w46 = options.labelWidthMm || 101.6;
      const h46 = options.labelHeightMm || 152.4;
      commands.push(`SIZE ${w46} mm, ${h46} mm`);
      commands.push(`GAP ${gapY} mm, 0 mm`);
      commands.push(`DIRECTION 1`);
      commands.push(`SET TEAR ON`);

      for (const item of items) {
        commands.push(`CLS`);
        commands.push(
          ...this.generateLabelTSPL(
            item,
            0,
            w46,
            h46,
            dotsPerMm,
            website,
            showHri,
            barcodeRotation,
            layoutPreset
          )
        );
        commands.push(`PRINT 1,1`);
      }
    } else if (options.mode === "thermal2up") {
      const totalWidthMm = labelWidth * 2 + gapX; // 104mm
      commands.push(`SIZE ${totalWidthMm} mm, ${labelHeight} mm`);
      commands.push(`GAP ${gapY} mm, 0 mm`);
      commands.push(`DIRECTION 1`);
      commands.push(`SET TEAR ON`);

      // Process items 2 per row
      for (let i = 0; i < items.length; i += 2) {
        commands.push(`CLS`);

        // Left label (X offset = 0)
        const leftItem = items[i];
        commands.push(
          ...this.generateLabelTSPL(
            leftItem,
            0,
            labelWidth,
            labelHeight,
            dotsPerMm,
            website,
            showHri,
            barcodeRotation,
            layoutPreset
          )
        );

        // Right label (X offset = labelWidth + gapX)
        if (i + 1 < items.length) {
          const rightItem = items[i + 1];
          const xOffset = labelWidth + gapX;
          commands.push(
            ...this.generateLabelTSPL(
              rightItem,
              xOffset,
              labelWidth,
              labelHeight,
              dotsPerMm,
              website,
              showHri,
              barcodeRotation,
              layoutPreset
            )
          );
        }

        commands.push(`PRINT 1,1`);
      }
    } else {
      // 1-Up Single Roll
      commands.push(`SIZE ${labelWidth} mm, ${labelHeight} mm`);
      commands.push(`GAP ${gapY} mm, 0 mm`);
      commands.push(`DIRECTION 1`);
      commands.push(`SET TEAR ON`);

      for (const item of items) {
        commands.push(`CLS`);
        commands.push(
          ...this.generateLabelTSPL(
            item,
            0,
            labelWidth,
            labelHeight,
            dotsPerMm,
            website,
            showHri,
            barcodeRotation,
            layoutPreset
          )
        );
        commands.push(`PRINT 1,1`);
      }
    }

    return commands.join("\r\n") + "\r\n";
  }

  private static generateLabelTSPL(
    item: LabelItemData,
    offsetXmm: number,
    labelWidthMm: number,
    labelHeightMm: number,
    d: number, // dots per mm (8)
    website: string,
    showHri: boolean,
    rotation: 0 | 90 | 180 | 270 = 0,
    preset: "standard" | "barcode_bottom" | "vertical_left" | "vertical_right" = "standard"
  ): string[] {
    const lines: string[] = [];

    const xBase = Math.round(offsetXmm * d);
    const wDots = Math.round(labelWidthMm * d);
    const hDots = Math.round(labelHeightMm * d);

    // 1. Outer rounded box border
    lines.push(`BOX ${xBase + 8},8,${xBase + wDots - 8},${hDots - 8},2,1`);

    // Map rotation degrees to TSPL rotation flag: 0->0, 90->1, 180->2, 270->3
    const tsplRotMap: Record<number, number> = { 0: 0, 90: 1, 180: 2, 270: 3 };
    const rotVal = tsplRotMap[rotation] ?? 0;
    const hriFlag = showHri ? 1 : 0;
    const cleanTitle = item.productName.toUpperCase().replace(/"/g, '\\"');

    if (preset === "vertical_left") {
      // Barcode vertically on left
      const bcX = xBase + 24;
      const bcY = 24;
      lines.push(`BARCODE ${bcX},${bcY},"128",140,${hriFlag},${rotVal || 1},2,4,"${item.barcode}"`);
      lines.push(`BAR ${xBase + 68},12,1,${hDots - 24}`);

      const rightCenterX = xBase + 72 + Math.round((wDots - 72) / 2);
      lines.push(`TEXT ${rightCenterX},16,"2",0,1,1,2,"${cleanTitle}"`);
      lines.push(`TEXT ${rightCenterX},70,"3",0,1,1,2,"SALE PRICE: ${formatAmount(item.salesPrice)}"`);
      lines.push(`BAR ${xBase + 72},95,${wDots - 80},1`);
      lines.push(`TEXT ${rightCenterX},115,"2",0,1,1,2,"MRP: ${formatAmount(item.mrp)}"`);
      lines.push(`BAR ${xBase + 72},135,${wDots - 80},1`);
      lines.push(`TEXT ${xBase + 76},166,"1",0,1,1,"NET QTY: ${item.netQuantity || "1U"}"`);
      lines.push(`TEXT ${xBase + wDots - 20},166,"1",0,1,1,3,"${website}"`);
    } else if (preset === "vertical_right") {
      const leftCenterX = xBase + Math.round((wDots - 72) / 2);
      lines.push(`TEXT ${leftCenterX},16,"2",0,1,1,2,"${cleanTitle}"`);
      lines.push(`TEXT ${leftCenterX},70,"3",0,1,1,2,"SALE PRICE: ${formatAmount(item.salesPrice)}"`);
      lines.push(`BAR ${xBase + 16},95,${wDots - 88},1`);
      lines.push(`TEXT ${leftCenterX},115,"2",0,1,1,2,"MRP: ${formatAmount(item.mrp)}"`);
      lines.push(`BAR ${xBase + 16},135,${wDots - 88},1`);
      lines.push(`TEXT ${xBase + 20},166,"1",0,1,1,"NET QTY: ${item.netQuantity || "1U"}"`);
      lines.push(`TEXT ${xBase + wDots - 76},166,"1",0,1,1,3,"${website}"`);

      lines.push(`BAR ${xBase + wDots - 68},12,1,${hDots - 24}`);
      const bcX = xBase + wDots - 48;
      const bcY = 24;
      lines.push(`BARCODE ${bcX},${bcY},"128",140,${hriFlag},${rotVal || 1},2,4,"${item.barcode}"`);
    } else if (preset === "barcode_bottom") {
      const titleX = xBase + Math.round(wDots / 2);
      lines.push(`TEXT ${titleX},16,"2",0,1,1,2,"${cleanTitle}"`);
      lines.push(`TEXT ${titleX},50,"3",0,1,1,2,"SALE PRICE: ${formatAmount(item.salesPrice)}"`);
      lines.push(`BAR ${xBase + 16},72,${wDots - 32},1`);
      lines.push(`TEXT ${titleX},82,"2",0,1,1,2,"MRP: ${formatAmount(item.mrp)}"`);
      lines.push(`BAR ${xBase + 16},100,${wDots - 32},1`);

      const bcY = 106;
      const bcX = xBase + Math.round((wDots - 220) / 2);
      lines.push(`BARCODE ${bcX},${bcY},"128",55,${hriFlag},${rotVal},2,4,"${item.barcode}"`);

      const footerY = 166;
      lines.push(`TEXT ${xBase + 20},${footerY},"1",0,1,1,"NET QTY: ${item.netQuantity || "1U"}"`);
      lines.push(`TEXT ${xBase + wDots - 20},${footerY},"1",0,1,1,3,"${website}"`);
    } else {
      // "standard"
      const titleX = xBase + Math.round(wDots / 2);
      lines.push(`TEXT ${titleX},16,"2",0,1,1,2,"${cleanTitle}"`);

      const bcY = 40;
      const bcX = xBase + Math.round((wDots - 220) / 2);
      lines.push(`BARCODE ${bcX},${bcY},"128",38,${hriFlag},${rotVal},2,4,"${item.barcode}"`);

      const saleY = 96;
      lines.push(`TEXT ${titleX},${saleY},"3",0,1,1,2,"SALE PRICE: ${formatAmount(item.salesPrice)}"`);
      lines.push(`BAR ${xBase + 16},125,${wDots - 32},1`);

      const mrpY = 132;
      lines.push(`TEXT ${titleX},${mrpY},"2",0,1,1,2,"MRP: ${formatAmount(item.mrp)}"`);
      lines.push(`BAR ${xBase + 16},155,${wDots - 32},1`);

      const footerY = 166;
      lines.push(`TEXT ${xBase + 20},${footerY},"1",0,1,1,"NET QTY: ${item.netQuantity || "1U"}"`);
      lines.push(`TEXT ${xBase + wDots - 20},${footerY},"1",0,1,1,3,"${website}"`);
    }

    return lines;
  }
}

