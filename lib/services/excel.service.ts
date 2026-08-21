import * as XLSX from "xlsx";
import { sanitizeExcelValue } from "../utils";

export interface ParsedProductRow {
  rowIndex: number;
  customBarcode?: string;
  productName: string;
  hsn?: string;
  mrp: number;
  salesPrice: number;
  quantity: number;
  netQuantity: string;
  gstAmount?: number;
  gstRate?: string;
  amount?: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExcelParseResult {
  fileName: string;
  totalRows: number;
  totalProducts: number;
  totalLabels: number;
  validRowsCount: number;
  warningCount: number;
  errorCount: number;
  rows: ParsedProductRow[];
  hasFatalErrors: boolean;
  defaultNetQuantity: string;
}

export class ExcelService {
  /**
   * Parse uploaded buffer (.xlsx, .xls, .csv) and validate contents.
   */
  static parseExcelBuffer(
    buffer: Buffer,
    fileName: string,
    defaultNetQuantity = "1U"
  ): ExcelParseResult {
    const workbook = XLSX.read(buffer, { type: "buffer" });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Uploaded Excel file contains no worksheets.");
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert sheet to JSON array of objects (using raw: false or true for cell values)
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
    });

    if (rawData.length === 0) {
      throw new Error("Uploaded Excel sheet is empty.");
    }

    const rows: ParsedProductRow[] = [];
    let totalLabels = 0;
    let warningCount = 0;
    let errorCount = 0;

    rawData.forEach((item, idx) => {
      const rowIndex = idx + 2; // Row 1 is header
      const errors: string[] = [];
      const warnings: string[] = [];

      // Flexible column mapping (case-insensitive & trimmed)
      const keys = Object.keys(item);
      const getVal = (possibleHeaders: string[]): unknown => {
        for (const ph of possibleHeaders) {
          const key = keys.find(
            (k) => k.trim().toLowerCase().replace(/\s+/g, " ") === ph.toLowerCase().replace(/\s+/g, " ")
          );
          if (key && item[key] !== undefined && item[key] !== "") return item[key];
        }
        return undefined;
      };

      // 0. Custom Barcode / Number (# column)
      const rawBarcode = getVal([
        "#",
        "Barcode",
        "Barcode Number",
        "Barcode No",
        "Item Code",
        "Code",
        "Custom Barcode",
        "Item #",
        "Item No",
        "SKU",
      ]);
      let customBarcode: string | undefined = undefined;
      if (rawBarcode !== undefined && rawBarcode !== null) {
        const cleanedCode = String(rawBarcode).trim();
        if (cleanedCode !== "") {
          if (cleanedCode.length > 64) {
            errors.push("Barcode/Code exceeds maximum allowed length of 64 characters.");
          } else {
            customBarcode = cleanedCode;
          }
        }
      }

      // 1. Product Name / Item Name
      const rawName = getVal([
        "Item name",
        "Item Name",
        "Product Name",
        "ProductName",
        "Name",
        "Title",
        "Item",
        "Description",
      ]);
      let productName = sanitizeExcelValue(rawName);
      if (!productName) {
        errors.push("Item name / Product Name is required.");
      } else if (productName.length > 250) {
        errors.push("Item name exceeds maximum allowed length of 250 characters.");
      }

      // 2. HSN / SAC Code
      const rawHsn = getVal([
        "HSN/ SAC",
        "HSN/SAC",
        "HSN / SAC",
        "HSN",
        "SAC",
        "HSN Code",
        "HSN/SAC Code",
      ]);
      const hsn = rawHsn !== undefined && rawHsn !== null ? String(rawHsn).trim() : undefined;

      // 3. MRP
      const rawMrp = getVal(["MRP", "Mrp Price", "Maximum Retail Price", "List Price", "M.R.P."]);
      let mrp = 0;
      if (rawMrp === undefined || rawMrp === "") {
        errors.push("MRP is required.");
      } else {
        const num = Number(String(rawMrp).replace(/[^0-9.]/g, ""));
        if (isNaN(num) || num <= 0) {
          errors.push("MRP must be a number greater than 0.");
        } else {
          mrp = num;
        }
      }

      // 4. Sales Price / Price per Unit
      const rawSalesPrice = getVal([
        "Price/ Unit",
        "Price/Unit",
        "Price / Unit",
        "Price/ unit",
        "Sales Price",
        "Sale Price",
        "Selling Price",
        "Price",
        "Offer Price",
        "Unit Price",
        "Rate",
      ]);
      let salesPrice = 0;
      if (rawSalesPrice === undefined || rawSalesPrice === "") {
        errors.push("Price/ Unit (Sales Price) is required.");
      } else {
        const num = Number(String(rawSalesPrice).replace(/[^0-9.]/g, ""));
        if (isNaN(num) || num <= 0) {
          errors.push("Price/ Unit must be a number greater than 0.");
        } else {
          salesPrice = num;
        }
      }

      // Warning check: Sales Price > MRP
      if (mrp > 0 && salesPrice > 0 && salesPrice > mrp) {
        warnings.push(`Price/Unit (Rs. ${salesPrice}) is greater than MRP (Rs. ${mrp}).`);
      }

      // 5. Quantity
      const rawQty = getVal(["Quantity", "Qty", "Count", "Label Count", "Labels"]);
      let quantity = 1;
      if (rawQty !== undefined && rawQty !== "") {
        const num = Number(rawQty);
        if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
          errors.push("Quantity must be a positive integer.");
        } else if (num > 50000) {
          errors.push("Quantity exceeds max batch limit of 50,000 per row.");
        } else {
          quantity = num;
        }
      }

      // 6. GST Amount
      const rawGstAmt = getVal(["GST Amount", "GST Amt", "Tax Amount", "Tax Amt", "GST"]);
      let gstAmount: number | undefined = undefined;
      if (rawGstAmt !== undefined && rawGstAmt !== "") {
        const num = Number(String(rawGstAmt).replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) gstAmount = num;
      }

      // 7. GST Rate
      const rawGstRate = getVal(["GST Rate", "Tax Rate", "GST %", "Tax %", "Rate %"]);
      const gstRate = rawGstRate !== undefined && rawGstRate !== null ? String(rawGstRate).trim() : undefined;

      // 8. Amount
      const rawAmt = getVal(["Amount", "Total Amount", "Net Amount", "Total"]);
      let amount: number | undefined = undefined;
      if (rawAmt !== undefined && rawAmt !== "") {
        const num = Number(String(rawAmt).replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) amount = num;
      }

      // 9. Net Quantity
      const rawNetQty = getVal(["Net Quantity", "NetQty", "Unit", "Package Unit"]);
      let netQuantity = sanitizeExcelValue(rawNetQty);
      if (!netQuantity) {
        netQuantity = defaultNetQuantity;
      }

      const isValid = errors.length === 0;

      if (isValid) {
        totalLabels += quantity;
      } else {
        errorCount++;
      }

      if (warnings.length > 0) {
        warningCount += warnings.length;
      }

      rows.push({
        rowIndex,
        customBarcode,
        productName,
        hsn,
        mrp,
        salesPrice,
        quantity,
        netQuantity,
        gstAmount,
        gstRate,
        amount,
        isValid,
        errors,
        warnings,
      });
    });

    const validRowsCount = rows.filter((r) => r.isValid).length;

    return {
      fileName,
      totalRows: rows.length,
      totalProducts: rows.length,
      totalLabels,
      validRowsCount,
      warningCount,
      errorCount,
      rows,
      hasFatalErrors: errorCount > 0,
      defaultNetQuantity,
    };
  }

  /**
   * Create sample Excel template buffer with updated sheet structure matching user specification.
   */
  static generateTemplateBuffer(): Buffer {
    const wb = XLSX.utils.book_new();

    const sampleData = [
      {
        "#": "14378278",
        "Item name": "2.4 WIRELESS VIDEOGAME BLUE 9503",
        "HSN/ SAC": "9503",
        MRP: 4999,
        Quantity: 2,
        "Price/ Unit": 1499,
        "GST Amount": 285.62,
        "GST Rate": "5.00%",
        Amount: 2998,
        "Net Quantity": "1U",
      },
      {
        "#": "14378082",
        "Item name": "4IN1 GAMES",
        "HSN/ SAC": "9503",
        MRP: 399,
        Quantity: 15,
        "Price/ Unit": 249,
        "GST Amount": 285,
        "GST Rate": "5.00%",
        Amount: 3735,
        "Net Quantity": "1U",
      },
      {
        "#": "14378044",
        "Item name": "ALIA WITH POUCH",
        "HSN/ SAC": "9503",
        MRP: 799,
        Quantity: 1,
        "Price/ Unit": 499,
        "GST Amount": 38.05,
        "GST Rate": "5.00%",
        Amount: 499,
        "Net Quantity": "1U",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths
    ws["!cols"] = [
      { wch: 14 }, // # (Barcode Number)
      { wch: 36 }, // Item name
      { wch: 12 }, // HSN/ SAC
      { wch: 10 }, // MRP
      { wch: 10 }, // Quantity
      { wch: 14 }, // Price/ Unit
      { wch: 12 }, // GST Amount
      { wch: 12 }, // GST Rate
      { wch: 12 }, // Amount
      { wch: 14 }, // Net Quantity
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Barcode Template");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }

  /**
   * Create downloadable error report buffer for invalid uploaded rows.
   */
  static generateErrorReportBuffer(rows: ParsedProductRow[]): Buffer {
    const wb = XLSX.utils.book_new();

    const reportData = rows.map((r) => ({
      "Row Index": r.rowIndex,
      "# (Barcode)": r.customBarcode || "(Auto)",
      "Item name": r.productName,
      "HSN/ SAC": r.hsn || "",
      MRP: r.mrp || "",
      "Price/ Unit": r.salesPrice || "",
      Quantity: r.quantity || "",
      "GST Amount": r.gstAmount ?? "",
      "GST Rate": r.gstRate ?? "",
      Amount: r.amount ?? "",
      Status: r.isValid ? "VALID" : "INVALID",
      Errors: r.errors.join("; "),
      Warnings: r.warnings.join("; "),
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    ws["!cols"] = [
      { wch: 10 },
      { wch: 14 },
      { wch: 34 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 35 },
      { wch: 35 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Validation Error Report");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }
}
