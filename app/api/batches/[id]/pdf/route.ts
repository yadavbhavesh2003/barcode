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

    const savedOpts = (batch.pdfOptions as any) || {};

    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") as any) || savedOpts.mode || "single";
    const qCols = url.searchParams.get("cols");
    const qRows = url.searchParams.get("rows");

    const pdfOptions: PDFOptions = {
      mode,
      labelWidthMm: Number(url.searchParams.get("width") || savedOpts.labelWidthMm || settings.label_width_mm || 50),
      labelHeightMm: Number(url.searchParams.get("height") || savedOpts.labelHeightMm || settings.label_height_mm || 25),
      website: savedOpts.website || settings.website || "https://runrkids.in/",
      currency: savedOpts.currency || settings.currency || "INR",
      showHri: url.searchParams.has("hri")
        ? url.searchParams.get("hri") === "1"
        : (savedOpts.showHri !== undefined ? savedOpts.showHri : true),
      showBorder: url.searchParams.has("border")
        ? url.searchParams.get("border") === "1"
        : (savedOpts.showBorder === true),
      offsetXmm: Number(savedOpts.offsetXmm ?? settings.printer_offset_x_mm ?? 0),
      offsetYmm: Number(savedOpts.offsetYmm ?? settings.printer_offset_y_mm ?? 0),
      scalePct: Number(savedOpts.scalePct ?? settings.printer_scale_pct ?? 100),
      a4MarginTopMm: Number(url.searchParams.get("marginTop") || savedOpts.a4MarginTopMm || settings.a4_margin_top_mm || 10),
      a4MarginLeftMm: Number(url.searchParams.get("marginLeft") || savedOpts.a4MarginLeftMm || settings.a4_margin_left_mm || 12),
      a4GapXMm: Number(url.searchParams.get("gapX") || savedOpts.a4GapXMm || settings.a4_gap_x_mm || 4),
      a4GapYMm: Number(url.searchParams.get("gapY") || savedOpts.a4GapYMm || settings.a4_gap_y_mm || 3),
      a4Columns: qCols ? Number(qCols) : Number(savedOpts.a4Columns || settings.a4_columns || 2),
      a4Rows: qRows ? Number(qRows) : Number(savedOpts.a4Rows || settings.a4_rows || 5),
      barcodeRotation: savedOpts.barcodeRotation ?? (Number(settings.barcode_rotation || 0) as any),
      layoutPreset: savedOpts.layoutPreset ?? settings.layout_preset ?? "standard",
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
