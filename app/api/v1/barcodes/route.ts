import { NextRequest } from "next/server";
import { connectToDatabase, BarcodeModel, ProductModel } from "@/lib/db/mongodb";
import {
  generateNextBarcodeSequence,
  assignBarcodeToProduct,
  recordBarcodePrint,
} from "@/lib/services/barcode.service";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const type = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const filter: any = {};
    if (query) {
      filter.$or = [
        { barcodeNumber: { $regex: query.trim(), $options: "i" } },
        { productName: { $regex: query.trim(), $options: "i" } },
      ];
    }
    if (type) {
      filter.barcodeType = type;
    }

    const skip = (page - 1) * limit;
    const [barcodes, total] = await Promise.all([
      BarcodeModel.find(filter)
        .populate("productId", "name mrp sellingPrice currentStock category")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BarcodeModel.countDocuments(filter),
    ]);

    return sendSuccess(barcodes, 200, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    return sendError("BARCODE_FETCH_FAILED", error.message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body; // "assign", "bulk_generate", "record_print"

    if (mode === "record_print") {
      const { barcodeNumbers, printedBy } = body;
      await recordBarcodePrint(barcodeNumbers || [], printedBy);
      return sendSuccess({ message: "Print recorded successfully" });
    }

    if (mode === "bulk_generate") {
      const { prefix = "", suffix = "", quantity = 10 } = body;
      const count = Math.min(1000, Math.max(1, parseInt(quantity, 10) || 1));
      const generatedCodes: string[] = [];

      for (let i = 0; i < count; i++) {
        const code = await generateNextBarcodeSequence(prefix, suffix);
        generatedCodes.push(code);
      }

      return sendSuccess({
        generatedCodes,
        total: generatedCodes.length,
        startBarcode: generatedCodes[0],
        endBarcode: generatedCodes[generatedCodes.length - 1],
      });
    }

    // Default: assign to product
    const { productId, barcodeNumber, barcodeType, source, assignedBy } = body;
    if (!productId || !barcodeNumber) {
      return sendError("MISSING_FIELDS", "ProductId and BarcodeNumber are required", null, 400);
    }

    const barcodeRecord = await assignBarcodeToProduct({
      productId,
      barcodeNumber,
      barcodeType,
      source,
      assignedBy,
    });

    return sendSuccess(barcodeRecord, 201);
  } catch (error: any) {
    if (error.code === "BARCODE_ALREADY_EXISTS") {
      return sendError(error.code, error.message, error.details, 409);
    }
    return sendError("BARCODE_OPERATION_FAILED", error.message, null, 400);
  }
}
