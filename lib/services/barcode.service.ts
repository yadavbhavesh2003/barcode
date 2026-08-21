import {
  connectToDatabase,
  BarcodeModel,
  ProductModel,
  SequenceTrackerModel,
} from "../db/mongodb";
import { BarcodeType, BarcodeSource } from "../types";
import {
  calculateGS1CheckDigit,
  validateBarcodeFormat,
  verifyBarcodeSource,
  formatSequentialCode,
} from "../utils/barcode";
import { logAuditEvent } from "./audit.service";

export interface GenerateBarcodeOptions {
  productId?: string;
  type?: BarcodeType;
  source?: BarcodeSource;
  customCode?: string;
  prefix?: string;
  suffix?: string;
  assignedBy?: string;
}

/**
 * Generates an atomic unique internal 8-digit barcode.
 */
export async function generateNextBarcodeSequence(
  prefix: string = "",
  suffix: string = ""
): Promise<string> {
  await connectToDatabase();

  let isUnique = false;
  let barcode = "";
  let attempts = 0;

  while (!isUnique && attempts < 20) {
    attempts++;
    const counter = await SequenceTrackerModel.findByIdAndUpdate(
      "barcode_counter",
      { $inc: { currentVal: 1 } },
      { returnDocument: "after", upsert: true }
    );

    barcode = formatSequentialCode(counter.currentVal, prefix, suffix, 8);

    const existing = await BarcodeModel.findOne({ barcodeNumber: barcode });
    if (!existing) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    throw new Error("Unable to allocate unique barcode sequence after maximum retries");
  }

  return barcode;
}

/**
 * Assigns or creates a barcode for a product with full uniqueness and format checks.
 */
export async function assignBarcodeToProduct({
  productId,
  barcodeNumber,
  barcodeType = "CODE128",
  source = "INTERNAL_CUSTOM",
  assignedBy = "Admin",
}: {
  productId: string;
  barcodeNumber: string;
  barcodeType?: BarcodeType;
  source?: BarcodeSource;
  assignedBy?: string;
}) {
  await connectToDatabase();

  const cleanCode = barcodeNumber.trim();

  // 1. Format validation
  const formatValidation = validateBarcodeFormat(cleanCode, barcodeType);
  if (!formatValidation.valid) {
    throw new Error(`FORMAT_INVALID: ${formatValidation.error}`);
  }

  // 2. GS1 Separation check
  const sourceValidation = verifyBarcodeSource(cleanCode, source, barcodeType);
  if (!sourceValidation.valid) {
    throw new Error(`GS1_INVALID: ${sourceValidation.error}`);
  }

  // 3. Absolute uniqueness check
  const existingBarcode = await BarcodeModel.findOne({ barcodeNumber: cleanCode });
  if (existingBarcode) {
    if (existingBarcode.productId.toString() !== productId) {
      const conflictingProduct = await ProductModel.findById(existingBarcode.productId);
      const err: any = new Error(
        `Barcode '${cleanCode}' is already assigned to '${conflictingProduct?.name || "another product"}'`
      );
      err.code = "BARCODE_ALREADY_EXISTS";
      err.details = {
        barcode: cleanCode,
        existingProduct: conflictingProduct?.name,
        existingProductId: conflictingProduct?._id,
        existingBarcodeType: existingBarcode.barcodeType,
        assignedAt: existingBarcode.createdAt,
      };
      throw err;
    }
  }

  const product = await ProductModel.findById(productId);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  let barcodeRecord;
  if (existingBarcode) {
    existingBarcode.barcodeType = barcodeType;
    existingBarcode.source = source;
    existingBarcode.status = "active";
    existingBarcode.productName = product.name;
    barcodeRecord = await existingBarcode.save();
  } else {
    barcodeRecord = await BarcodeModel.create({
      barcodeNumber: cleanCode,
      barcodeType,
      source,
      productId: product._id,
      productName: product.name,
      status: "active",
      assignmentDate: new Date(),
      assignedBy,
    });
  }

  // Sync to product
  product.barcodeNumber = cleanCode;
  product.barcodeType = barcodeType;
  product.barcodeSource = source;
  await product.save();

  await logAuditEvent({
    userName: assignedBy,
    action: "BARCODE_ASSIGNED",
    entity: "Barcode",
    entityId: barcodeRecord._id.toString(),
    newValue: { barcodeNumber: cleanCode, productId, productName: product.name },
  });

  return barcodeRecord;
}

/**
 * Increments print count for barcode records.
 */
export async function recordBarcodePrint(barcodeNumbers: string[], printedBy: string = "Admin") {
  await connectToDatabase();
  await BarcodeModel.updateMany(
    { barcodeNumber: { $in: barcodeNumbers } },
    {
      $inc: { printCount: 1 },
      $set: { lastPrintedAt: new Date() },
    }
  );

  await logAuditEvent({
    userName: printedBy,
    action: "BARCODE_PRINTED",
    entity: "Barcode",
    newValue: { count: barcodeNumbers.length, barcodes: barcodeNumbers.slice(0, 10) },
  });
}

/**
 * Legacy & Batch Barcode Service Adapter
 */
export const BarcodeService = {
  async reserveBarcodes(count: number): Promise<{ barcodes: string[]; startBarcode: string; endBarcode: string }> {
    await connectToDatabase();
    const tracker = await SequenceTrackerModel.findByIdAndUpdate(
      "barcode_counter",
      { $inc: { currentVal: count } },
      { returnDocument: "after", upsert: true }
    );

    const endNum = tracker.currentVal;
    const startNum = endNum - count + 1;

    const barcodes: string[] = [];
    for (let num = startNum; num <= endNum; num++) {
      barcodes.push(formatSequentialCode(num, "", "", 8));
    }

    return {
      barcodes,
      startBarcode: barcodes[0],
      endBarcode: barcodes[barcodes.length - 1],
    };
  },
};
