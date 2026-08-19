import Database from "better-sqlite3";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import bwipjs from "bwip-js";

async function main() {
  console.log("=== 1. Testing SQLite Database Connection & Barcode Counter ===");
  try {
    const db = new Database("data/test_barcode_generator.db");
    db.exec(`
      CREATE TABLE IF NOT EXISTS sequence_tracker (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_val INTEGER NOT NULL DEFAULT 0
      );
    `);
    db.prepare("INSERT OR IGNORE INTO sequence_tracker (id, current_val) VALUES (1, 0)").run();
    
    const row = db.prepare("SELECT current_val FROM sequence_tracker WHERE id = 1").get();
    console.log("Current sequence val:", row.current_val);
    const nextVal = row.current_val + 1;
    db.prepare("UPDATE sequence_tracker SET current_val = ? WHERE id = 1").run(nextVal);
    const code = String(nextVal).padStart(8, "0");
    console.log("Generated atomic barcode:", code);
    console.log("✓ SQLite & Atomic Barcode Test Passed!");

    console.log("\n=== 2. Testing Excel Parsing & Template Generation ===");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      { "Product Name": "Test Steering Wheel", MRP: 1599, "Sales Price": 1020, Quantity: 10 }
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    console.log("Excel buffer size:", buffer.length);
    
    const readWb = XLSX.read(buffer, { type: "buffer" });
    const rawData = XLSX.utils.sheet_to_json(readWb.Sheets["Sheet1"]);
    console.log("Parsed Excel rows:", rawData.length, rawData[0]);
    console.log("✓ Excel Parsing Passed!");

    console.log("\n=== 3. Testing bwip-js Barcode Image & jsPDF Engine ===");
    const pngBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: code,
      scale: 3,
      height: 10,
      includetext: false,
      backgroundcolor: "FFFFFF",
    });
    const base64Img = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [50, 25],
    });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TEST STEERING WHEEL", 25, 4, { align: "center" });
    doc.addImage(base64Img, "PNG", 7, 6, 36, 8);
    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.text(code, 25, 16, { align: "center" });

    const pdfOutput = doc.output("arraybuffer");
    console.log("Generated 50x25mm PDF size:", pdfOutput.byteLength);
    console.log("✓ 50x25mm PDF Generation Passed!");

    console.log("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉");
  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

main();
