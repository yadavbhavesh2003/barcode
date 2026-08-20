import { NextRequest, NextResponse } from "next/server";
import {
  connectToDatabase,
  GenerationBatchModel,
  ProductModel,
  BarcodeModel,
  SystemSettingModel,
  AuditLogModel,
} from "@/lib/db/mongodb";
import { BarcodeService } from "@/lib/services/barcode.service";
import { PDFService, LabelItemData, PDFOptions } from "@/lib/services/pdf.service";

interface IncomingBatchRequest {
  fileName: string;
  pdfOptions?: PDFOptions;
  products: {
    productName: string;
    mrp: number;
    salesPrice: number;
    quantity: number;
    netQuantity?: string;
  }[];
}

export async function POST(req: NextRequest) {
  try {
    const body: IncomingBatchRequest = await req.json();
    const { fileName, pdfOptions, products } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { success: false, error: "No products provided for batch generation." },
        { status: 400 }
      );
    }

    const totalLabels = products.reduce((acc, p) => acc + p.quantity, 0);
    if (totalLabels <= 0) {
      return NextResponse.json(
        { success: false, error: "Total labels must be greater than 0." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. Reserve 8-digit unique barcodes atomically in MongoDB
    const reservation = await BarcodeService.reserveBarcodes(totalLabels);
    const { barcodes, startBarcode, endBarcode } = reservation;

    // 2. Generate batch number e.g. BATCH-20260819-0001
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const todayRegex = new RegExp(`^BATCH-${todayStr}-`);
    const countToday = await GenerationBatchModel.countDocuments({
      batchNumber: todayRegex,
    });
    const batchSeq = String(countToday + 1).padStart(4, "0");
    const batchNumber = `BATCH-${todayStr}-${batchSeq}`;

    // 3. Create GenerationBatch record
    const batchDoc = await GenerationBatchModel.create({
      batchNumber,
      fileName: fileName || "products.xlsx",
      totalProducts: products.length,
      totalLabels,
      startBarcode,
      endBarcode,
      status: "reserved",
      createdBy: "Admin",
    });

    const batchId = batchDoc._id;
    let barcodeIndex = 0;
    const labelItems: LabelItemData[] = [];
    const barcodeDocs = [];

    // 4. Create Product & Barcode records
    for (const prod of products) {
      const prodDoc = await ProductModel.create({
        name: prod.productName,
        mrp: prod.mrp,
        salesPrice: prod.salesPrice,
        netQuantity: prod.netQuantity || "1U",
      });

      for (let q = 0; q < prod.quantity; q++) {
        const barcodeValue = barcodes[barcodeIndex++];
        barcodeDocs.push({
          barcodeValue,
          productId: prodDoc._id,
          batchId: batchId,
          status: "active",
        });

        labelItems.push({
          productName: prod.productName,
          mrp: prod.mrp,
          salesPrice: prod.salesPrice,
          netQuantity: prod.netQuantity || "1U",
          barcode: barcodeValue,
        });
      }
    }

    await BarcodeModel.insertMany(barcodeDocs);

    // 5. Retrieve settings to merge with PDF options
    const settingRows = await SystemSettingModel.find().lean();
    const settings: Record<string, string> = {};
    for (const r of settingRows) {
      settings[r.key] = r.value;
    }

    const mergedPdfOptions: PDFOptions = {
      mode: pdfOptions?.mode || "4x6_2x5",
      labelWidthMm: pdfOptions?.labelWidthMm !== undefined ? Number(pdfOptions.labelWidthMm) : Number(settings.label_width_mm || 50),
      labelHeightMm: pdfOptions?.labelHeightMm !== undefined ? Number(pdfOptions.labelHeightMm) : Number(settings.label_height_mm || 25),
      website: pdfOptions?.website || settings.website || "https://runrkids.in/",
      currency: settings.currency || "INR",
      showHri: pdfOptions?.showHri === true, // Default false per user request
      showBorder: pdfOptions?.showBorder !== false, // Default true
      offsetXmm: Number(settings.printer_offset_x_mm || 0),
      offsetYmm: Number(settings.printer_offset_y_mm || 0),
      scalePct: Number(settings.printer_scale_pct || 100),
      a4MarginTopMm: pdfOptions?.a4MarginTopMm ?? Number(settings.a4_margin_top_mm || 10),
      a4MarginLeftMm: pdfOptions?.a4MarginLeftMm ?? Number(settings.a4_margin_left_mm || 12),
      a4GapXMm: pdfOptions?.a4GapXMm ?? Number(settings.a4_gap_x_mm || 4),
      a4GapYMm: pdfOptions?.a4GapYMm ?? Number(settings.a4_gap_y_mm || 3),
      a4Columns: pdfOptions?.a4Columns ?? Number(settings.a4_columns || 2),
      a4Rows: pdfOptions?.a4Rows ?? Number(settings.a4_rows || 5),
      barcodeHeightMm: pdfOptions?.barcodeHeightMm ?? Number(settings.barcode_height_mm || 6.5),
      barcodeRotation: pdfOptions?.barcodeRotation ?? (Number(settings.barcode_rotation || 0) as 0 | 90 | 180 | 270),
      layoutPreset: pdfOptions?.layoutPreset ?? ((settings.layout_preset || "standard") as any),
    };

    // 6. Generate PDF Buffer
    const pdfBuffer = await PDFService.generatePDF(labelItems, mergedPdfOptions);

    // 7. Mark batch completed
    await GenerationBatchModel.updateOne({ _id: batchId }, { status: "completed" });

    // 8. Audit log
    await AuditLogModel.create({
      action: "Batch Created",
      details: JSON.stringify({
        batchId: String(batchId),
        batchNumber,
        totalLabels,
        startBarcode,
        endBarcode,
      }),
    });

    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      batchId: String(batchId),
      batchNumber,
      totalProducts: products.length,
      totalLabels,
      startBarcode,
      endBarcode,
      pdfBase64: base64Pdf,
    });
  } catch (error: any) {
    console.error("Batch creation failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create batch." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const batches = await GenerationBatchModel.find().sort({ createdAt: -1 }).lean();

    const formattedBatches = batches.map((b: any) => ({
      id: String(b._id),
      batchNumber: b.batchNumber,
      fileName: b.fileName,
      totalProducts: b.totalProducts,
      totalLabels: b.totalLabels,
      startBarcode: b.startBarcode,
      endBarcode: b.endBarcode,
      status: b.status,
      createdBy: b.createdBy,
      createdAt: b.createdAt,
    }));

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const totalBarcodes = await BarcodeModel.countDocuments();
    const totalBatches = await GenerationBatchModel.countDocuments();
    const totalProducts = await ProductModel.countDocuments();
    const todayBarcodes = await BarcodeModel.countDocuments({
      createdAt: { $gte: startOfToday },
    });

    return NextResponse.json({
      success: true,
      batches: formattedBatches,
      summary: {
        totalBarcodes,
        totalBatches,
        totalProducts,
        todayBarcodes,
      },
    });
  } catch (error) {
    console.error("Failed to list batches:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list batches." },
      { status: 500 }
    );
  }
}
