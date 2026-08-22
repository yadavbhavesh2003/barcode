import { NextRequest, NextResponse } from "next/server";
import { PDFService, LabelItemData, PDFOptions } from "@/lib/services/pdf.service";

interface PreviewRequest {
  pdfOptions?: PDFOptions;
  products?: {
    customBarcode?: string;
    productName: string;
    hsn?: string;
    mrp: number;
    salesPrice: number;
    quantity: number;
    netQuantity?: string;
  }[];
}

export async function POST(req: NextRequest) {
  try {
    const body: PreviewRequest = await req.json();
    const { pdfOptions, products } = body;

    const sampleProducts = products && products.length > 0
      ? products
      : [
          { customBarcode: "14378278", productName: "2.4 WIRELESS VIDEOGAME BLUE", mrp: 4999, salesPrice: 1499, quantity: 2, netQuantity: "1U" },
        ];

    const cols = pdfOptions?.a4Columns || 2;
    const rows = pdfOptions?.a4Rows || 6;
    const targetSlots = Math.max(cols * rows, 10);

    const labelItems: LabelItemData[] = [];
    let mockBarcodeNum = 14378001;

    // Collect base products from request
    const baseList: LabelItemData[] = [];
    for (const prod of sampleProducts) {
      const qty = Math.min(Math.max(1, prod.quantity || 1), targetSlots);
      for (let q = 0; q < qty; q++) {
        baseList.push({
          productName: prod.productName || "2.4 WIRELESS VIDEOGAME BLUE",
          mrp: prod.mrp || 4999,
          salesPrice: prod.salesPrice || 1499,
          netQuantity: prod.netQuantity || "1U",
          barcode: prod.customBarcode && prod.customBarcode.trim() !== "" ? prod.customBarcode.trim() : String(mockBarcodeNum++),
        });
      }
    }

    // Repeat items to fill at least 1 full page grid if user has fewer items
    let idx = 0;
    while (labelItems.length < Math.min(targetSlots, 24)) {
      const item = baseList[idx % baseList.length];
      labelItems.push({
        ...item,
        barcode: item.barcode || String(mockBarcodeNum++),
      });
      idx++;
    }

    const pdfBuffer = await PDFService.generatePDF(
      labelItems,
      pdfOptions || { mode: "4x6_grid", labelWidthMm: 47, labelHeightMm: 23.5 }
    );

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      pdfBase64,
      totalLabels: labelItems.length,
    });
  } catch (err: any) {
    console.error("PDF Preview Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to render PDF preview." },
      { status: 500 }
    );
  }
}
