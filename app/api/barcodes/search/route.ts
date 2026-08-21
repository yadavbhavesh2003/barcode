import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, BarcodeModel, ProductModel } from "@/lib/db/mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Barcode query parameter is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    // 1. Search BarcodeModel for latest record of this barcode
    let barcodeRecord = await BarcodeModel.findOne({ barcodeValue: code })
      .sort({ createdAt: -1 })
      .populate("productId")
      .populate("batchId")
      .lean();

    let prod: any = barcodeRecord?.productId;
    let batch: any = barcodeRecord?.batchId;

    // 2. Fallback: Search ProductModel directly by customBarcode if not in BarcodeModel
    if (!prod) {
      const productDirect = await ProductModel.findOne({ customBarcode: code })
        .sort({ createdAt: -1 })
        .lean();
      if (productDirect) {
        prod = productDirect;
      }
    }

    if (!barcodeRecord && !prod) {
      return NextResponse.json(
        { success: false, error: `Barcode '${code}' not found in database.` },
        { status: 404 }
      );
    }

    const formattedRecord = {
      barcodeId: String(barcodeRecord?._id || prod?._id || ""),
      barcode: barcodeRecord?.barcodeValue || prod?.customBarcode || code,
      status: barcodeRecord?.status || "active",
      createdAt: barcodeRecord?.createdAt || prod?.createdAt || new Date(),
      productName: prod?.name || "N/A",
      hsn: prod?.hsn || "9503",
      mrp: prod?.mrp || 0,
      salesPrice: prod?.salesPrice || 0,
      netQuantity: prod?.netQuantity || "1U",
      gstAmount: prod?.gstAmount,
      gstRate: prod?.gstRate,
      amount: prod?.amount,
      batchId: String(batch?._id || ""),
      batchNumber: batch?.batchNumber || "N/A",
      fileName: batch?.fileName || "N/A",
    };

    return NextResponse.json({ success: true, record: formattedRecord });
  } catch (error) {
    console.error("Barcode search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search barcode." },
      { status: 500 }
    );
  }
}
