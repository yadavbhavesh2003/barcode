import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { connectToDatabase, ProductModel } from "@/lib/db/mongodb";
import { createProduct } from "@/lib/services/product.service";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mode = (formData.get("mode") as string) || "preview"; // "preview" or "execute"

    if (!file) {
      return sendError("NO_FILE", "Please upload an Excel or CSV file", null, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rawRows || rawRows.length === 0) {
      return sendError("EMPTY_FILE", "The uploaded sheet has no rows", null, 400);
    }

    const validRows: any[] = [];
    const invalidRows: any[] = [];
    const duplicateRows: any[] = [];
    const existingInDbRows: any[] = [];

    const seenBarcodes = new Set<string>();

    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];
      const rowIndex = index + 2; // Excel row index

      // Flexible column mapping (case-insensitive & trimmed)
      const keys = Object.keys(row);
      const getVal = (possibleHeaders: string[]): any => {
        for (const ph of possibleHeaders) {
          const key = keys.find(
            (k) => k.trim().toLowerCase().replace(/\s+/g, " ") === ph.toLowerCase().replace(/\s+/g, " ")
          );
          if (key && row[key] !== undefined && row[key] !== "") return row[key];
        }
        return undefined;
      };

      // Extract fields flexibly
      const itemNumber = String(
        getVal(["#", "Barcode", "Barcode Number", "Item Number", "Item No", "Code", "Custom Barcode", "SKU"]) || ""
      ).trim();

      const name = String(
        getVal(["Item name", "Item Name", "Product Name", "ProductName", "Name", "Description", "Title"]) || ""
      ).trim();

      const hsnSac = String(
        getVal(["HSN/ SAC", "HSN/SAC", "HSN / SAC", "HSN", "SAC", "HSN Code"]) || "9503"
      ).trim();

      const mrpRaw = getVal(["MRP", "Mrp Price", "Maximum Retail Price", "List Price", "M.R.P."]);
      const mrp = parseFloat(String(mrpRaw || "0").replace(/[^0-9.]/g, "")) || 0;

      const qtyRaw = getVal(["Quantity", "Qty", "Count", "Opening Stock", "Stock"]);
      const quantity = parseInt(String(qtyRaw || "1"), 10) || 1;

      const unitPriceRaw = getVal([
        "Price/ Unit",
        "Price/Unit",
        "Price / Unit",
        "Selling Price",
        "Sales Price",
        "Sale Price",
        "Price",
        "Rate",
        "Unit Price",
      ]);
      const unitPrice = parseFloat(String(unitPriceRaw || mrp || "0").replace(/[^0-9.]/g, "")) || mrp;

      const gstRateRaw = String(getVal(["GST Rate", "GST %", "Tax Rate", "Rate %"]) || "5%");
      let gstRate = parseFloat(gstRateRaw.replace(/[^0-9.]/g, "")) || 5;
      if (gstRate > 0 && gstRate < 1) {
        gstRate = Math.round(gstRate * 100);
      }

      const errors: string[] = [];

      if (!name) {
        errors.push("Product Name is missing");
      }
      if (mrp <= 0 && unitPrice <= 0) {
        errors.push("Price or MRP must be greater than 0");
      }

      const rowData = {
        rowIndex,
        itemNumber,
        name,
        hsnSac,
        mrp: mrp || unitPrice,
        sellingPrice: unitPrice,
        openingStock: quantity,
        gstRate,
        category: String(row["Category"] || "General").trim(),
        brand: String(row["Brand"] || "Generic").trim(),
        errors,
      };

      if (errors.length > 0) {
        invalidRows.push(rowData);
        continue;
      }

      if (itemNumber) {
        if (seenBarcodes.has(itemNumber)) {
          duplicateRows.push({ ...rowData, reason: `Duplicate barcode '${itemNumber}' within uploaded sheet` });
          continue;
        }
        seenBarcodes.add(itemNumber);

        const existingDb = await ProductModel.findOne({
          $or: [
            { itemNumber },
            { barcodeNumber: itemNumber },
            { customBarcode: itemNumber },
            { name: rowData.name },
          ],
        });

        if (existingDb) {
          existingInDbRows.push({
            ...rowData,
            existingProductId: existingDb._id,
            existingProductName: existingDb.name,
            currentStock: existingDb.currentStock || 0,
            newStockAfterImport: (existingDb.currentStock || 0) + rowData.openingStock,
          });
          // Also add to valid rows for refill execution
          validRows.push({
            ...rowData,
            isRefill: true,
            existingProductId: existingDb._id,
            currentStock: existingDb.currentStock || 0,
          });
          continue;
        }
      }

      validRows.push({ ...rowData, isRefill: false });
    }

    // If mode is execute, perform database insertion and stock increment with full transaction logs
    const createdProducts = [];
    const refilledProducts = [];

    if (mode === "execute" && validRows.length > 0) {
      const { InventoryTransactionModel, AuditLogModel } = await import("@/lib/db/mongodb");

      for (const validRow of validRows) {
        try {
          if (validRow.isRefill && validRow.existingProductId) {
            // REFILL EXISTING STOCK
            const product = await ProductModel.findById(validRow.existingProductId);
            if (product) {
              const stockBefore = product.currentStock || 0;
              const refillQty = validRow.openingStock || 0;
              const stockAfter = stockBefore + refillQty;

              product.currentStock = stockAfter;
              product.availableStock = (product.availableStock || 0) + refillQty;
              if (validRow.mrp) product.mrp = validRow.mrp;
              if (validRow.sellingPrice) {
                product.salesPrice = validRow.sellingPrice;
                product.sellingPrice = validRow.sellingPrice;
              }
              if (validRow.hsnSac) product.hsn = validRow.hsnSac;
              await product.save();

              // Log immutable inventory transaction
              await InventoryTransactionModel.create({
                productId: product._id,
                productName: product.name,
                type: "PURCHASE",
                quantity: refillQty,
                stockBefore,
                stockAfter,
                referenceId: `EXCEL-REFILL-${Date.now()}`,
                reason: `Excel Refill: Added ${refillQty} units (Row #${validRow.rowIndex})`,
                createdBy: "Excel Import Wizard",
                createdAt: new Date(),
              });

              refilledProducts.push({
                id: product._id,
                name: product.name,
                stockBefore,
                stockAfter,
                refillQty,
              });
            }
          } else {
            // CREATE NEW PRODUCT (createProduct already logs initial OPENING_STOCK)
            const newProduct = await createProduct({
              itemNumber: validRow.itemNumber || undefined,
              name: validRow.name,
              hsnSac: validRow.hsnSac,
              mrp: validRow.mrp,
              sellingPrice: validRow.sellingPrice,
              openingStock: validRow.openingStock,
              gstRate: validRow.gstRate,
              category: validRow.category,
              brand: validRow.brand,
              createdBy: "Import Wizard",
            });

            createdProducts.push(newProduct);
          }
        } catch (e: any) {
          invalidRows.push({ ...validRow, errors: [e.message] });
        }
      }

      // System audit log
      await AuditLogModel.create({
        action: "Bulk Excel Product Import",
        entity: "PRODUCT",
        module: "inventory",
        details: JSON.stringify({
          fileName: file.name,
          newCreated: createdProducts.length,
          refilled: refilledProducts.length,
          invalidCount: invalidRows.length,
        }),
        timestamp: new Date(),
      });
    }

    return sendSuccess({
      summary: {
        totalRows: rawRows.length,
        validCount: validRows.length,
        newProductsCount: validRows.filter((r) => !r.isRefill).length,
        refillStockCount: existingInDbRows.length,
        invalidCount: invalidRows.length,
        duplicateCount: duplicateRows.length,
        importedCount: createdProducts.length + refilledProducts.length,
        newCreatedCount: createdProducts.length,
        refilledCount: refilledProducts.length,
      },
      validRows: validRows.slice(0, 100),
      invalidRows,
      duplicateRows,
      existingInDbRows,
      mode,
    });
  } catch (error: any) {
    return sendError("IMPORT_FAILED", error.message || "Failed to process import file", null, 500);
  }
}
