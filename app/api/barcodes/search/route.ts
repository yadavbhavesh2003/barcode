import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, BarcodeModel, ProductModel } from "@/lib/db/mongodb";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = (
      searchParams.get("query") ||
      searchParams.get("q") ||
      searchParams.get("code") ||
      ""
    ).trim();

    await connectToDatabase();

    // If query is empty, return latest distinct 20 barcodes
    if (!query) {
      const recentBarcodes = await BarcodeModel.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("productId")
        .populate("batchId")
        .lean();

      const seen = new Set<string>();
      const formatted: any[] = [];
      for (const b of recentBarcodes as any[]) {
        const prod = b.productId || {};
        const batch = b.batchId || {};
        const barcodeValue = (b.barcodeValue || prod.customBarcode || "").trim();
        if (barcodeValue && !seen.has(barcodeValue)) {
          seen.add(barcodeValue);
          formatted.push({
            barcodeId: String(b._id || ""),
            productId: String(prod._id || ""),
            barcode: barcodeValue,
            status: b.status || "active",
            createdAt: b.createdAt || new Date(),
            productName: prod.name || "N/A",
            hsn: prod.hsn || "9503",
            mrp: prod.mrp || 0,
            salesPrice: prod.salesPrice || 0,
            netQuantity: prod.netQuantity || "1U",
            gstAmount: prod.gstAmount,
            gstRate: prod.gstRate,
            amount: prod.amount,
            batchId: String(batch._id || ""),
            batchNumber: batch.batchNumber || "N/A",
            fileName: batch.fileName || "N/A",
          });
          if (formatted.length >= 20) break;
        }
      }

      return NextResponse.json({
        success: true,
        count: formatted.length,
        records: formatted,
        record: formatted[0] || null,
      });
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "i");

    // 1. Search ProductModel by name or customBarcode
    const matchedProducts = await ProductModel.find({
      $or: [{ name: regex }, { customBarcode: regex }],
    })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    const matchedProductIds = matchedProducts.map((p: any) => p._id);

    // 2. Search BarcodeModel by barcodeValue or matched product IDs
    const matchedBarcodes = await BarcodeModel.find({
      $or: [{ barcodeValue: regex }, { productId: { $in: matchedProductIds } }],
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("productId")
      .populate("batchId")
      .lean();

    const seenBarcodes = new Set<string>();
    const formattedRecords: any[] = [];

    // Add barcode records (keeping ONLY the latest record for each distinct barcode)
    for (const b of matchedBarcodes as any[]) {
      const prod = b.productId || {};
      const batch = b.batchId || {};
      const barcodeValue = (b.barcodeValue || prod.customBarcode || "").trim();

      if (!barcodeValue) continue;

      // Group & deduplicate by barcodeValue to only keep the latest record
      if (!seenBarcodes.has(barcodeValue)) {
        seenBarcodes.add(barcodeValue);
        formattedRecords.push({
          barcodeId: String(b._id || ""),
          productId: String(prod._id || ""),
          barcode: barcodeValue,
          status: b.status || "active",
          createdAt: b.createdAt || prod.createdAt || new Date(),
          productName: prod.name || "N/A",
          hsn: prod.hsn || "9503",
          mrp: prod.mrp || 0,
          salesPrice: prod.salesPrice || 0,
          netQuantity: prod.netQuantity || "1U",
          gstAmount: prod.gstAmount,
          gstRate: prod.gstRate,
          amount: prod.amount,
          batchId: String(batch._id || ""),
          batchNumber: batch.batchNumber || "N/A",
          fileName: batch.fileName || "N/A",
        });
      }
    }

    // Also include matched products that might not have a BarcodeModel entry
    for (const prod of matchedProducts as any[]) {
      const prodBarcode = (prod.customBarcode || "").trim();
      const key = prodBarcode || String(prod._id);

      if (!seenBarcodes.has(key)) {
        seenBarcodes.add(key);
        formattedRecords.push({
          barcodeId: String(prod._id || ""),
          productId: String(prod._id || ""),
          barcode: prodBarcode || "N/A",
          status: "active",
          createdAt: prod.createdAt || new Date(),
          productName: prod.name || "N/A",
          hsn: prod.hsn || "9503",
          mrp: prod.mrp || 0,
          salesPrice: prod.salesPrice || 0,
          netQuantity: prod.netQuantity || "1U",
          gstAmount: prod.gstAmount,
          gstRate: prod.gstRate,
          amount: prod.amount,
          batchId: "",
          batchNumber: "Direct Entry",
          fileName: "N/A",
        });
      }
    }

    if (formattedRecords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          count: 0,
          records: [],
          record: null,
          error: `No records found matching '${query}'.`,
        },
        { status: 404 }
      );
    }

    // Rank results: exact barcode > exact name > startsWith > includes > latest createdAt
    const lowerQuery = query.toLowerCase();
    formattedRecords.sort((a, b) => {
      const aBarcodeExact = a.barcode.toLowerCase() === lowerQuery;
      const bBarcodeExact = b.barcode.toLowerCase() === lowerQuery;
      if (aBarcodeExact && !bBarcodeExact) return -1;
      if (!aBarcodeExact && bBarcodeExact) return 1;

      const aNameExact = a.productName.toLowerCase() === lowerQuery;
      const bNameExact = b.productName.toLowerCase() === lowerQuery;
      if (aNameExact && !bNameExact) return -1;
      if (!aNameExact && bNameExact) return 1;

      const aNameStarts = a.productName.toLowerCase().startsWith(lowerQuery);
      const bNameStarts = b.productName.toLowerCase().startsWith(lowerQuery);
      if (aNameStarts && !bNameStarts) return -1;
      if (!aNameStarts && bNameStarts) return 1;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      count: formattedRecords.length,
      records: formattedRecords,
      record: formattedRecords[0],
    });
  } catch (error) {
    console.error("Barcode search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search barcode and products." },
      { status: 500 }
    );
  }
}
