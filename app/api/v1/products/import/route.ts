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

      // Extract fields flexibly
      const itemNumber = String(
        row["Item Number"] || row["Item No"] || row["Barcode"] || row["Code"] || row["itemNumber"] || ""
      ).trim();
      const name = String(
        row["Item Name"] || row["Product Name"] || row["Name"] || row["Description"] || row["name"] || ""
      ).trim();
      const hsnSac = String(row["HSN/SAC"] || row["HSN"] || row["hsnSac"] || "9503").trim();
      const mrp = parseFloat(String(row["MRP"] || row["mrp"] || "0").replace(/[^0-9.]/g, "")) || 0;
      const quantity = parseInt(String(row["Quantity"] || row["Qty"] || row["quantity"] || "1"), 10) || 1;
      const unitPrice =
        parseFloat(String(row["Price/Unit"] || row["Selling Price"] || row["Price"] || row["sellingPrice"] || mrp || "0").replace(/[^0-9.]/g, "")) || mrp;
      const gstRateRaw = String(row["GST Rate"] || row["GST %"] || row["gstRate"] || "5%");
      const gstRate = parseFloat(gstRateRaw.replace(/[^0-9.]/g, "")) || 5;

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
          $or: [{ itemNumber }, { barcodeNumber: itemNumber }],
        });

        if (existingDb) {
          existingInDbRows.push({
            ...rowData,
            existingProductId: existingDb._id,
            existingProductName: existingDb.name,
          });
          continue;
        }
      }

      validRows.push(rowData);
    }

    // If mode is execute, perform database insertion
    const createdProducts = [];
    if (mode === "execute" && validRows.length > 0) {
      for (const validRow of validRows) {
        try {
          const product = await createProduct({
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
          createdProducts.push(product);
        } catch (e: any) {
          invalidRows.push({ ...validRow, errors: [e.message] });
        }
      }
    }

    return sendSuccess({
      summary: {
        totalRows: rawRows.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        duplicateCount: duplicateRows.length,
        existingInDbCount: existingInDbRows.length,
        importedCount: createdProducts.length,
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
