import { connectToDatabase, SequenceTrackerModel, ProductModel, BarcodeModel, GenerationBatchModel } from "../lib/db/mongodb.js";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import bwipjs from "bwip-js";

async function main() {
  console.log("=== 1. Testing MongoDB Connection & Atomic Sequence Counter ===");
  await connectToDatabase();

  const tracker = await SequenceTrackerModel.findOneAndUpdate(
    { _id: "barcode_counter" },
    { $inc: { currentVal: 1 } },
    { new: true, upsert: true }
  );

  const code = String(tracker.currentVal).padStart(8, "0");
  console.log("Generated MongoDB atomic barcode:", code);
  if (!/^\d{8}$/.test(code)) throw new Error("MongoDB sequence test failed!");
  console.log("✓ MongoDB Atomic Counter Test Passed!");

  console.log("\n=== 2. Testing bwip-js & PDF Generator Engine ===");
  const pngBuffer = await bwipjs.toBuffer({
    bcid: "code128",
    text: code,
    scale: 3,
    height: 10,
    includetext: false,
    backgroundcolor: "FFFFFF",
  });

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [50, 25],
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("STEERING WHEEL 868", 25, 4, { align: "center" });
  doc.addImage(`data:image/png;base64,${pngBuffer.toString("base64")}`, "PNG", 7, 6, 36, 8);
  doc.setFont("courier", "bold");
  doc.setFontSize(7);
  doc.text(code, 25, 16, { align: "center" });

  const pdfOutput = doc.output("arraybuffer");
  console.log("Generated PDF Byte Length:", pdfOutput.byteLength);
  console.log("✓ PDF Generator Engine Test Passed!");

  console.log("\nALL MONGODB INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
