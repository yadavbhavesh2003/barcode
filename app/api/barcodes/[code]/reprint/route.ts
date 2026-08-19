import { NextRequest, NextResponse } from "next/server";
import {
  connectToDatabase,
  BarcodeModel,
  SystemSettingModel,
  AuditLogModel,
} from "@/lib/db/mongodb";
import { PDFService, LabelItemData, PDFOptions } from "@/lib/services/pdf.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const barcodeVal = code.trim();

    await connectToDatabase();
    const barcodeDoc = await BarcodeModel.findOne({ barcodeValue: barcodeVal })
      .populate("productId")
      .lean();

    if (!barcodeDoc) {
      return NextResponse.json(
        { success: false, error: `Barcode '${barcodeVal}' not found.` },
        { status: 404 }
      );
    }

    const prod = barcodeDoc.productId as any;
    const labelItem: LabelItemData = {
      productName: prod?.name || "PRODUCT",
      mrp: prod?.mrp || 0,
      salesPrice: prod?.salesPrice || 0,
      netQuantity: prod?.netQuantity || "1U",
      barcode: barcodeVal,
    };

    const settingRows = await SystemSettingModel.find().lean();
    const settings: Record<string, string> = {};
    for (const r of settingRows) {
      settings[r.key] = r.value;
    }

    const pdfOptions: PDFOptions = {
      mode: "single",
      labelWidthMm: Number(settings.label_width_mm || 50),
      labelHeightMm: Number(settings.label_height_mm || 25),
      website: settings.website || "https://runrkids.in/",
      currency: settings.currency || "INR",
      offsetXmm: Number(settings.printer_offset_x_mm || 0),
      offsetYmm: Number(settings.printer_offset_y_mm || 0),
    };

    const pdfBuffer = await PDFService.generatePDF([labelItem], pdfOptions);

    await AuditLogModel.create({
      action: "Label Reprinted",
      details: JSON.stringify({ barcode: barcodeVal, productName: labelItem.productName }),
    });

    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      barcode: barcodeVal,
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
