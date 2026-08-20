import { NextRequest, NextResponse } from "next/server";
import {
  connectToDatabase,
  GenerationBatchModel,
  BarcodeModel,
  SystemSettingModel,
  AuditLogModel,
} from "@/lib/db/mongodb";
import { PDFService, LabelItemData, PDFOptions } from "@/lib/services/pdf.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const batch = await GenerationBatchModel.findById(id).lean();
    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Batch not found." },
        { status: 404 }
      );
    }

    const barcodeDocs = await BarcodeModel.find({ batchId: id })
      .populate("productId")
      .sort({ barcodeValue: 1 })
      .lean();

    if (barcodeDocs.length === 0) {
      return NextResponse.json(
        { success: false, error: "No barcode records found for this batch." },
        { status: 404 }
      );
    }

    const items: LabelItemData[] = barcodeDocs.map((b: any) => ({
      productName: b.productId?.name || "PRODUCT",
      mrp: b.productId?.mrp || 0,
      salesPrice: b.productId?.salesPrice || 0,
      netQuantity: b.productId?.netQuantity || "1U",
      barcode: b.barcodeValue,
    }));

    const settingRows = await SystemSettingModel.find().lean();
    const settings: Record<string, string> = {};
    for (const r of settingRows) {
      settings[r.key] = r.value;
    }

    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") as any) || "4x6_2x5";
    const qCols = url.searchParams.get("cols");
    const qRows = url.searchParams.get("rows");

    const pdfOptions: PDFOptions = {
      mode,
      labelWidthMm: Number(settings.label_width_mm || 50),
      labelHeightMm: Number(settings.label_height_mm || 25),
      website: settings.website || "https://runrkids.in/",
      currency: settings.currency || "INR",
      showHri: url.searchParams.get("hri") === "1", // Default false per user request
      showBorder: url.searchParams.get("border") !== "0",
      offsetXmm: Number(settings.printer_offset_x_mm || 0),
      offsetYmm: Number(settings.printer_offset_y_mm || 0),
      a4MarginTopMm: Number(url.searchParams.get("marginTop") || settings.a4_margin_top_mm || 10),
      a4MarginLeftMm: Number(url.searchParams.get("marginLeft") || settings.a4_margin_left_mm || 12),
      a4GapXMm: Number(url.searchParams.get("gapX") || settings.a4_gap_x_mm || 4),
      a4GapYMm: Number(url.searchParams.get("gapY") || settings.a4_gap_y_mm || 3),
      a4Columns: qCols ? Number(qCols) : Number(settings.a4_columns || 2),
      a4Rows: qRows ? Number(qRows) : Number(settings.a4_rows || 5),
    };

    const pdfBuffer = await PDFService.generatePDF(items, pdfOptions);

    await AuditLogModel.create({
      action: "PDF Downloaded",
      details: JSON.stringify({ batchId: id, batchNumber: batch.batchNumber, mode }),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${batch.batchNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate PDF." },
      { status: 500 }
    );
  }
}
