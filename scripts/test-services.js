const { BarcodeService } = require("../lib/services/barcode.service");
const { ExcelService } = require("../lib/services/excel.service");
const { PDFService } = require("../lib/services/pdf.service");

async function runTests() {
  console.log("=== 1. Testing Atomic Barcode Service ===");
  const res1 = BarcodeService.reserveBarcodes(3);
  console.log("Reserved 3 barcodes:", res1.barcodes);
  if (res1.barcodes.length !== 3 || !/^\d{8}$/.test(res1.barcodes[0])) {
    throw new Error("Barcode format test failed!");
  }
  console.log("✓ Barcode Service Passed!");

  console.log("\n=== 2. Testing Excel Service Template & Parsing ===");
  const templateBuffer = ExcelService.generateTemplateBuffer();
  console.log("Generated template buffer size:", templateBuffer.length);

  const parseResult = ExcelService.parseExcelBuffer(templateBuffer, "template.xlsx");
  console.log("Parsed template rows:", parseResult.totalProducts, "Total labels:", parseResult.totalLabels);
  if (parseResult.totalProducts !== 3 || parseResult.totalLabels !== 35) {
    throw new Error("Excel Parsing test failed!");
  }
  console.log("✓ Excel Service Passed!");

  console.log("\n=== 3. Testing PDF Service Engine ===");
  const pdfBytes = await PDFService.generatePDF(
    [
      {
        productName: "Steering Wheel 868",
        mrp: 1599,
        salesPrice: 1020,
        netQuantity: "1U",
        barcode: res1.barcodes[0],
      },
    ],
    { mode: "single", labelWidthMm: 50, labelHeightMm: 25 }
  );
  console.log("Generated 50x25mm PDF bytes:", pdfBytes.length);
  if (pdfBytes.length < 1000) {
    throw new Error("PDF byte length check failed!");
  }
  console.log("✓ PDF Service Engine Passed!");

  console.log("\nALL CORE SERVICES PASSED EMPIRICALLY! 🎉");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
