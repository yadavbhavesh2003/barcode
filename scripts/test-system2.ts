// Test Suite for System 2.0 Core Engines
import {
  calculateGS1CheckDigit,
  validateBarcodeFormat,
  verifyBarcodeSource,
} from "../lib/utils/barcode";
import {
  calculateLineItem,
  calculateInvoiceTotals,
  round2,
} from "../lib/utils/financials";

function runTests() {
  console.log("=== STARTING SYSTEM 2.0 AUTOMATED TESTS ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. GS1 Check Digit Tests
  // EAN-13: 890103038345 -> Check digit is 8 (Sum = 92, 100 - 92 = 8)
  const ean13Check = calculateGS1CheckDigit("890103038345");
  assert(ean13Check === 8, `EAN-13 check digit for 890103038345 should be 8 (got ${ean13Check})`);

  // EAN-8: 9638507 -> Check digit is 4 (Sum = 46, 50 - 46 = 4)
  const ean8Check = calculateGS1CheckDigit("9638507");
  assert(ean8Check === 4, `EAN-8 check digit for 9638507 should be 4 (got ${ean8Check})`);

  // UPC-A: 01234567890 -> Check digit is 5
  const upcaCheck = calculateGS1CheckDigit("01234567890");
  assert(upcaCheck === 5, `UPC-A check digit for 01234567890 should be 5 (got ${upcaCheck})`);

  // ITF-14: 1001234567890 -> Check digit is 2
  const itfCheck = calculateGS1CheckDigit("1001234567890");
  assert(itfCheck === 2, `ITF-14 check digit for 1001234567890 should be 2 (got ${itfCheck})`);

  // 2. Barcode Format Validation Tests
  const validEan13 = validateBarcodeFormat("8901030383458", "EAN13");
  assert(validEan13.valid === true, "Valid EAN-13 format validation");

  const invalidEan13 = validateBarcodeFormat("8901030383450", "EAN13");
  assert(invalidEan13.valid === false, "Invalid EAN-13 check digit rejection");

  const validCode128 = validateBarcodeFormat("14378278", "CODE128");
  assert(validCode128.valid === true, "Valid Code 128 alphanumeric validation");

  // 3. GS1 Separation Tests
  const gs1SepOk = verifyBarcodeSource("8901030383458", "GS1_GTIN", "EAN13");
  assert(gs1SepOk.valid === true, "GS1 GTIN with standardized EAN-13 allowed");

  const gs1SepFail = verifyBarcodeSource("CUSTOM123", "GS1_GTIN", "CUSTOM");
  assert(gs1SepFail.valid === false, "GS1 GTIN rejection when non-standard format is used");

  // 4. Financial Calculations Tests
  // Product: 4IN1 GAMES, Price: 249, Qty: 2, GST: 5% inclusive
  const lineItem = calculateLineItem({
    productId: "p1",
    barcodeNumber: "14378082",
    productName: "4IN1 GAMES",
    mrp: 399,
    unitPrice: 249,
    quantity: 2,
    discountPct: 0,
    gstRate: 5,
    isTaxInclusive: true,
  });

  assert(lineItem.lineTotal === 498, `Line total should be ₹498.00 (got ${lineItem.lineTotal})`);
  assert(lineItem.taxableAmount === 474.29, `Taxable amount (incl tax) should be 474.29 (got ${lineItem.taxableAmount})`);
  assert(lineItem.totalGst === 23.71, `Total GST should be 23.71 (got ${lineItem.totalGst})`);

  // Invoice Totals with 2 items
  const lineItem2 = calculateLineItem({
    productId: "p2",
    barcodeNumber: "14378278",
    productName: "WIRELESS VIDEOGAME",
    mrp: 4999,
    unitPrice: 1499,
    quantity: 1,
    discountPct: 10, // 10% discount -> 1499 - 149.90 = 1349.10
    gstRate: 5,
    isTaxInclusive: true,
  });

  const totals = calculateInvoiceTotals([lineItem, lineItem2]);
  assert(totals.itemsCount === 2, `Invoice items count should be 2 (got ${totals.itemsCount})`);
  assert(totals.grandTotal === Math.round(498 + 1349.10), `Grand total rounded should be ₹1847 (got ${totals.grandTotal})`);

  console.log(`\n===================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
