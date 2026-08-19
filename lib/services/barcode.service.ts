import { connectToDatabase, SequenceTrackerModel } from "../db/mongodb";

export interface ReservedBarcodes {
  barcodes: string[];
  startBarcode: string;
  endBarcode: string;
}

export class BarcodeService {
  /**
   * Atomically reserves `count` sequential 8-digit unique barcodes in MongoDB.
   * Format: Zero-padded 8 digits (00000001 to 99999999).
   */
  static async reserveBarcodes(count: number): Promise<ReservedBarcodes> {
    if (count <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    await connectToDatabase();

    // Atomic MongoDB findOneAndUpdate with $inc
    const tracker = await SequenceTrackerModel.findOneAndUpdate(
      { _id: "barcode_counter" },
      { $inc: { currentVal: count } },
      { returnDocument: "after", upsert: true }
    );

    const endVal = tracker.currentVal;
    const startVal = endVal - count + 1;

    // Check max boundary (99,999,999)
    if (endVal > 99999999) {
      throw new Error(
        `Barcode sequence limit reached. Cannot generate ${count} barcodes (Max allowed: 99,999,999, Current: ${endVal}).`
      );
    }

    const barcodes: string[] = [];
    for (let i = startVal; i <= endVal; i++) {
      const code = String(i).padStart(8, "0");
      barcodes.push(code);
    }

    return {
      barcodes,
      startBarcode: barcodes[0],
      endBarcode: barcodes[barcodes.length - 1],
    };
  }

  /**
   * Validate if a string is a valid 8-digit numeric barcode.
   */
  static validateBarcodeFormat(code: string): boolean {
    return /^\d{8}$/.test(code);
  }
}
