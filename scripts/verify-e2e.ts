// Complete End-to-End Integration Verification for System 2.0
import { connectToDatabase, ProductModel, BarcodeModel, InvoiceModel, InventoryTransactionModel } from "../lib/db/mongodb";
import { createProduct } from "../lib/services/product.service";
import { assignBarcodeToProduct } from "../lib/services/barcode.service";
import { createInvoice, cancelInvoice } from "../lib/services/invoice.service";
import { adjustProductStock } from "../lib/services/inventory.service";

async function runE2EVerification() {
  console.log("=== STARTING FULL SYSTEM 2.0 E2E INTEGRATION TEST ===");
  await connectToDatabase();

  const testSuffix = Date.now().toString().slice(-4);
  const testItemNo = `TEST${testSuffix}`;
  const testBarcode = `BAR${testSuffix}`;

  try {
    // 1. Create Product
    console.log("\n1. Testing Product Creation & Barcode Allocation...");
    const product = await createProduct({
      itemNumber: testItemNo,
      name: `Test Videogame Console ${testSuffix}`,
      category: "Toys",
      mrp: 2999,
      sellingPrice: 1999,
      gstRate: 5,
      openingStock: 100,
      barcodeNumber: testBarcode,
    });
    console.log(`✓ Product created successfully: ID = ${product._id}, Code = ${product.itemNumber}`);

    // Verify initial stock transaction
    const initialTx = await InventoryTransactionModel.findOne({ productId: product._id, type: "OPENING_STOCK" });
    if (!initialTx || initialTx.stockAfter !== 100) {
      throw new Error("Opening stock ledger entry failed");
    }
    console.log("✓ Initial opening stock ledger transaction confirmed (100 units)");

    // 2. Barcode Uniqueness Guarantee
    console.log("\n2. Testing Duplicate Barcode Collision Prevention...");
    let duplicateBlocked = false;
    try {
      await createProduct({
        itemNumber: `DUP${testSuffix}`,
        name: "Conflicting Product",
        mrp: 1000,
        sellingPrice: 800,
        barcodeNumber: testBarcode, // Same barcode
      });
    } catch (err: any) {
      if (err.code === "BARCODE_ALREADY_EXISTS") {
        duplicateBlocked = true;
        console.log(`✓ Duplicate barcode correctly rejected: ${err.message}`);
      }
    }
    if (!duplicateBlocked) {
      throw new Error("Duplicate barcode was NOT blocked!");
    }

    // 3. POS Billing & Invoice Creation
    console.log("\n3. Testing Atomic POS Billing & Stock Deduction...");
    const invoice = await createInvoice({
      items: [
        {
          productId: product._id.toString(),
          quantity: 2,
          unitPrice: 1999,
          discountPct: 0,
        },
      ],
      customer: {
        name: "John Doe",
        mobile: "9876543210",
      },
      paymentMethod: "UPI",
      paymentReference: "UPI-TEST-12345",
      billedBy: "POS Operator",
    });

    console.log(`✓ Invoice generated: ${invoice.invoiceNumber}`);
    console.log(`  - Subtotal: ₹${invoice.subtotal}`);
    console.log(`  - Taxable: ₹${invoice.taxableAmount}`);
    console.log(`  - Total GST: ₹${invoice.totalGst}`);
    console.log(`  - Grand Total: ₹${invoice.grandTotal}`);

    // 4. Verify Stock Deduction
    const updatedProduct = await ProductModel.findById(product._id);
    if (updatedProduct.currentStock !== 98) {
      throw new Error(`Stock deduction failed! Expected 98, got ${updatedProduct.currentStock}`);
    }
    console.log(`✓ Stock deducted accurately from 100 -> ${updatedProduct.currentStock} units`);

    // Verify Sale Ledger Record
    const saleTx = await InventoryTransactionModel.findOne({
      productId: product._id,
      type: "SALE",
      referenceId: invoice.invoiceNumber,
    });
    if (!saleTx || saleTx.quantity !== -2 || saleTx.stockAfter !== 98) {
      throw new Error("Sale inventory ledger transaction record incorrect");
    }
    console.log(`✓ Immutable SALE transaction ledger entry verified (Delta: ${saleTx.quantity}, Stock After: ${saleTx.stockAfter})`);

    // 5. Test Invoice Cancellation & Stock Restoration
    console.log("\n4. Testing Invoice Cancellation & Automatic Restocking...");
    const cancelledInvoice = await cancelInvoice({
      invoiceId: invoice._id.toString(),
      reason: "Customer changed mind",
      restoreStock: true,
      cancelledBy: "Store Manager",
    });

    if (cancelledInvoice.status !== "CANCELLED") {
      throw new Error("Invoice status was not updated to CANCELLED");
    }

    const restockedProduct = await ProductModel.findById(product._id);
    if (restockedProduct.currentStock !== 100) {
      throw new Error(`Restocking failed! Expected 100, got ${restockedProduct.currentStock}`);
    }
    console.log(`✓ Invoice voided and stock restored from 98 -> ${restockedProduct.currentStock} units`);

    // Cleanup test artifacts
    await ProductModel.findByIdAndDelete(product._id);
    await BarcodeModel.deleteMany({ barcodeNumber: testBarcode });
    await InvoiceModel.findByIdAndDelete(invoice._id);
    await InventoryTransactionModel.deleteMany({ productId: product._id });

    console.log("\n=======================================================");
    console.log("✓✓✓ ALL SYSTEM 2.0 E2E INTEGRATION TESTS PASSED ✓✓✓");
    console.log("=======================================================\n");
  } catch (e: any) {
    console.error("E2E Test Failure:", e);
    process.exit(1);
  }
}

runE2EVerification();
