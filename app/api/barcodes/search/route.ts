import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, BarcodeModel } from "@/lib/db/mongodb";

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
    const barcodeRecord = await BarcodeModel.findOne({ barcodeValue: code })
      .populate("productId")
      .populate("batchId")
      .lean();

    if (!barcodeRecord) {
      return NextResponse.json(
        { success: false, error: `Barcode '${code}' not found in database.` },
        { status: 404 }
      );
    }

    const prod = barcodeRecord.productId as any;
    const batch = barcodeRecord.batchId as any;

    const formattedRecord = {
      barcodeId: String(barcodeRecord._id),
      barcode: barcodeRecord.barcodeValue,
      status: barcodeRecord.status,
      createdAt: barcodeRecord.createdAt,
      productName: prod?.name || "N/A",
      hsn: prod?.hsn || "N/A",
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
