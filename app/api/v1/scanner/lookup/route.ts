import { NextRequest } from "next/server";
import { connectToDatabase, ProductModel, BarcodeModel } from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get("code") || "").trim();

    if (!code) {
      return sendError("INVALID_CODE", "Please provide a barcode or item code to scan", null, 400);
    }

    // 1. Direct indexed match on Product itemNumber, barcodeNumber, or SKU
    let product = await ProductModel.findOne({
      $or: [{ barcodeNumber: code }, { itemNumber: code }, { sku: code }],
      status: { $ne: "archived" },
    });

    // 2. If not directly found on product, check Barcode model
    if (!product) {
      const barcodeRecord = await BarcodeModel.findOne({ barcodeNumber: code, status: "active" });
      if (barcodeRecord && barcodeRecord.productId) {
        product = await ProductModel.findById(barcodeRecord.productId);
      }
    }

    if (!product) {
      // Return structured NOT FOUND response with quick actions
      return sendError(
        "BARCODE_NOT_FOUND",
        `Barcode '${code}' is not registered in the system.`,
        {
          scannedCode: code,
          actions: ["CREATE_PRODUCT", "ASSIGN_BARCODE", "SEARCH_PRODUCT"],
        },
        404
      );
    }

    return sendSuccess({
      productId: product._id,
      itemNumber: product.itemNumber,
      barcodeNumber: product.barcodeNumber || code,
      name: product.name,
      shortName: product.shortName,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      currentStock: product.currentStock,
      availableStock: product.availableStock,
      gstRate: product.gstRate,
      hsnSac: product.hsnSac,
      isTaxInclusive: product.isTaxInclusive,
      category: product.category,
      unitOfMeasure: product.unitOfMeasure,
    });
  } catch (error: any) {
    return sendError("SCANNER_ERROR", error.message || "Failed to process scan", null, 500);
  }
}
