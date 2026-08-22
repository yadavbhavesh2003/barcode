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
        .lean();

      const seen = new Set<string>();
      const formatted: any[] = [];
      for (const b of recentBarcodes as any[]) {
        const prod = b.productId || {};
        const barcodeValue = (b.barcodeNumber || b.barcodeValue || prod.customBarcode || prod.barcodeNumber || "").trim();
        if (barcodeValue && !seen.has(barcodeValue)) {
          seen.add(barcodeValue);
          formatted.push({
            barcodeId: String(b._id || ""),
            productId: String(prod._id || ""),
            barcode: barcodeValue,
            status: b.status || "active",
            createdAt: b.createdAt || new Date(),
            productName: prod.name || b.productName || "N/A",
            hsn: prod.hsnSac || prod.hsn || "9503",
            mrp: prod.mrp || 0,
            salesPrice: prod.sellingPrice || prod.salesPrice || 0,
            currentStock: prod.currentStock !== undefined ? prod.currentStock : prod.openingStock || 0,
            netQuantity: prod.unitOfMeasure || "1U",
            gstAmount: prod.gstAmount,
            gstRate: prod.gstRate,
            amount: prod.amount,
            batchId: "",
            batchNumber: "N/A",
            fileName: "N/A",
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

    const trimmedQuery = query.trim();
    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "i");

    // 1. Direct exact match check on ProductModel (Fastest & most reliable for POS Scanner)
    const exactProduct = await ProductModel.findOne({
      $or: [
        { barcodeNumber: trimmedQuery },
        { itemNumber: trimmedQuery },
        { customBarcode: trimmedQuery },
        { sku: trimmedQuery },
      ],
      status: { $ne: "archived" },
    }).lean();

    if (exactProduct) {
      const prodBarcode = (
        (exactProduct as any).barcodeNumber ||
        (exactProduct as any).itemNumber ||
        (exactProduct as any).customBarcode ||
        trimmedQuery
      ).trim();

      const exactRecord = {
        barcodeId: String(exactProduct._id),
        productId: String(exactProduct._id),
        barcode: prodBarcode,
        status: "active",
        createdAt: exactProduct.createdAt || new Date(),
        productName: exactProduct.name || "N/A",
        hsn: exactProduct.hsnSac || (exactProduct as any).hsn || "9503",
        mrp: exactProduct.mrp || 0,
        salesPrice: exactProduct.sellingPrice || (exactProduct as any).salesPrice || exactProduct.mrp || 0,
        currentStock:
          exactProduct.currentStock !== undefined
            ? exactProduct.currentStock
            : exactProduct.openingStock || 0,
        minStock: 1,
        netQuantity: exactProduct.unitOfMeasure || "1U",
        gstAmount: (exactProduct as any).gstAmount,
        gstRate: exactProduct.gstRate || 5,
        amount: (exactProduct as any).amount,
        batchId: "",
        batchNumber: "Catalog Match",
        fileName: "N/A",
      };

      return NextResponse.json({
        success: true,
        count: 1,
        records: [exactRecord],
        record: exactRecord,
      });
    }

    // 2. Search ProductModel by name, shortName, category, brand, or regex on barcodes
    const searchConditions: any[] = [
      { barcodeNumber: regex },
      { itemNumber: regex },
      { customBarcode: regex },
      { sku: regex },
      { name: regex },
      { shortName: regex },
      { category: regex },
      { brand: regex },
    ];

    // Add individual word tokens
    const words = trimmedQuery.split(/\s+/).filter((w) => w.length >= 2);
    for (const w of words) {
      const wRegex = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      searchConditions.push({ name: wRegex });
      searchConditions.push({ category: wRegex });
    }

    // Add fuzzy match on name for short terms (e.g. babie / barbie)
    if (trimmedQuery.length >= 3 && trimmedQuery.length <= 15) {
      try {
        const fuzzyPattern = trimmedQuery
          .split("")
          .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join(".*");
        const fuzzyReg = new RegExp(fuzzyPattern, "i");
        searchConditions.push({ name: fuzzyReg });
      } catch (e) {
        // ignore invalid regex
      }
    }

    const matchedProducts = await ProductModel.find({
      $or: searchConditions,
      status: { $ne: "archived" },
    })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    const matchedProductIds = matchedProducts.map((p: any) => p._id);

    // 3. Search BarcodeModel by barcodeNumber or matched product IDs
    const matchedBarcodes = await BarcodeModel.find({
      $or: [
        { barcodeNumber: regex },
        { barcodeValue: regex },
        { productId: { $in: matchedProductIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("productId")
      .lean();

    const seenBarcodes = new Set<string>();
    const formattedRecords: any[] = [];

    // Add matched products first
    for (const prod of matchedProducts as any[]) {
      const prodBarcode = (
        prod.barcodeNumber ||
        prod.itemNumber ||
        prod.customBarcode ||
        prod.sku ||
        String(prod._id)
      ).trim();

      if (!seenBarcodes.has(prodBarcode)) {
        seenBarcodes.add(prodBarcode);
        formattedRecords.push({
          barcodeId: String(prod._id || ""),
          productId: String(prod._id || ""),
          barcode: prodBarcode,
          status: "active",
          createdAt: prod.createdAt || new Date(),
          productName: prod.name || "N/A",
          hsn: prod.hsnSac || prod.hsn || "9503",
          mrp: prod.mrp || 0,
          salesPrice: prod.sellingPrice || prod.salesPrice || prod.mrp || 0,
          currentStock:
            prod.currentStock !== undefined ? prod.currentStock : prod.openingStock || 0,
          minStock: 1,
          netQuantity: prod.unitOfMeasure || "1U",
          gstAmount: prod.gstAmount,
          gstRate: prod.gstRate || 5,
          amount: prod.amount,
          batchId: "",
          batchNumber: "Product Catalog",
          fileName: "N/A",
        });
      }
    }

    // Add barcode records
    for (const b of matchedBarcodes as any[]) {
      const prod = b.productId || {};
      const barcodeValue = (
        b.barcodeNumber ||
        b.barcodeValue ||
        prod.customBarcode ||
        prod.barcodeNumber ||
        ""
      ).trim();

      if (!barcodeValue) continue;

      if (!seenBarcodes.has(barcodeValue)) {
        seenBarcodes.add(barcodeValue);
        formattedRecords.push({
          barcodeId: String(b._id || ""),
          productId: String(prod._id || ""),
          barcode: barcodeValue,
          status: b.status || "active",
          createdAt: b.createdAt || new Date(),
          productName: prod.name || b.productName || "N/A",
          hsn: prod.hsnSac || prod.hsn || "9503",
          mrp: prod.mrp || 0,
          salesPrice: prod.sellingPrice || prod.salesPrice || prod.mrp || 0,
          currentStock:
            prod.currentStock !== undefined ? prod.currentStock : prod.openingStock || 0,
          minStock: 1,
          netQuantity: prod.unitOfMeasure || "1U",
          gstAmount: prod.gstAmount,
          gstRate: prod.gstRate || 5,
          amount: prod.amount,
          batchId: "",
          batchNumber: "Barcode Master",
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
