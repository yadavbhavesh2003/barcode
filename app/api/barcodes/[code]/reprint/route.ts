import { NextRequest, NextResponse } from "next/server";
import {
  connectToDatabase,
  BarcodeModel,
  ProductModel,
  SystemSettingModel,
  AuditLogModel,
} from "@/lib/db/mongodb";
import { PDFService, LabelItemData, PDFOptions } from "@/lib/services/pdf.service";
import mongoose from "mongoose";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const barcodeVal = decodeURIComponent(code).trim();
    const body = await req.json().catch(() => ({}));
    const printQuantity = Math.max(1, Math.min(200, Number(body?.quantity || 1)));

    await connectToDatabase();

    // 1. Search in BarcodeModel
    let barcodeDoc = await BarcodeModel.findOne({ barcodeValue: barcodeVal })
      .populate("productId")
      .lean();

    let prod = (barcodeDoc?.productId || null) as any;

    // 2. Fallback to ProductModel if not found in BarcodeModel
    if (!prod) {
      const isObjectId = mongoose.Types.ObjectId.isValid(barcodeVal);
      const productDirect = await ProductModel.findOne(
        isObjectId
          ? { $or: [{ _id: barcodeVal }, { customBarcode: barcodeVal }] }
          : { customBarcode: barcodeVal }
      ).lean();

      if (productDirect) {
        prod = productDirect;
      }
    }

    if (!barcodeDoc && !prod) {
      return NextResponse.json(
        { success: false, error: `Barcode or product '${barcodeVal}' not found.` },
        { status: 404 }
      );
    }

    const actualBarcode = barcodeDoc?.barcodeValue || prod?.customBarcode || barcodeVal;

    const labelItem: LabelItemData = {
      productName: prod?.name || "PRODUCT",
      mrp: prod?.mrp || 0,
      salesPrice: prod?.salesPrice || 0,
      netQuantity: prod?.netQuantity || "1U",
      barcode: actualBarcode,
    };

    const labelItems: LabelItemData[] = Array(printQuantity).fill(labelItem);

    const settingRows = await SystemSettingModel.find().lean();
    const settings: Record<string, string> = {};
    for (const r of settingRows) {
      settings[r.key] = r.value;
    }

    const pdfOptions: PDFOptions = {
      mode: (body?.mode as any) || "single",
      labelWidthMm: Number(settings.label_width_mm || 50),
      labelHeightMm: Number(settings.label_height_mm || 25),
      website: settings.website || "https://runrkids.in/",
      currency: settings.currency || "INR",
      offsetXmm: Number(settings.printer_offset_x_mm || 0),
      offsetYmm: Number(settings.printer_offset_y_mm || 0),
      showHri: settings.show_hri !== "false",
      showBorder: settings.show_border === "true",
      layoutPreset: (settings.layout_preset as any) || "standard",
    };

    const pdfBuffer = await PDFService.generatePDF(labelItems, pdfOptions);

    await AuditLogModel.create({
      action: "Label Reprinted",
      details: JSON.stringify({
        barcode: actualBarcode,
        productName: labelItem.productName,
        quantity: printQuantity,
      }),
    });

    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      barcode: actualBarcode,
      quantity: printQuantity,
      pdfBase64: base64Pdf,
    });
  } catch (error: any) {
    console.error("Reprint failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate reprint PDF." },
      { status: 500 }
    );
  }
}
