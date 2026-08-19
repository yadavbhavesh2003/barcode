import * as XLSX from "xlsx";
import { sanitizeExcelValue } from "../utils";

export interface ParsedProductRow {
  rowIndex: number;
  productName: string;
  mrp: number;
  salesPrice: number;
  quantity: number;
  netQuantity: string;
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
          const key = keys.find((k) => k.trim().toLowerCase() === ph.toLowerCase());
          if (key) return item[key];
        }
        return undefined;
      };

      // 1. Product Name
      const rawName = getVal(["Product Name", "ProductName", "Name", "Title", "Item"]);
      let productName = sanitizeExcelValue(rawName);
      if (!productName) {
        errors.push("Product Name is required.");
      } else if (productName.length > 250) {
        errors.push("Product Name exceeds maximum allowed length of 250 characters.");
      }

      // 2. MRP
      const rawMrp = getVal(["MRP", "Mrp Price", "Maximum Retail Price", "List Price"]);
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

      // 3. Sales Price
      const rawSalesPrice = getVal([
        "Sales Price",
        "Sale Price",
        "Selling Price",
        "Price",
        "Offer Price",
      ]);
      let salesPrice = 0;
      if (rawSalesPrice === undefined || rawSalesPrice === "") {
        errors.push("Sales Price is required.");
      } else {
        const num = Number(String(rawSalesPrice).replace(/[^0-9.]/g, ""));
        if (isNaN(num) || num <= 0) {
          errors.push("Sales Price must be a number greater than 0.");
        } else {
          salesPrice = num;
        }
      }

      // Warning check: Sales Price > MRP
      if (mrp > 0 && salesPrice > 0 && salesPrice > mrp) {
        warnings.push(`Sales Price (Rs. ${salesPrice}) is greater than MRP (Rs. ${mrp}).`);
      }

      // 4. Quantity
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

      // 5. Net Quantity
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
        productName,
        mrp,
        salesPrice,
        quantity,
        netQuantity,
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
   * Create sample Excel template buffer with instructions and example rows.
   */
  static generateTemplateBuffer(): Buffer {
    const wb = XLSX.utils.book_new();

    const sampleData = [
      {
        "Product Name": "Steering Wheel 868",
        MRP: 1599,
        "Sales Price": 1020,
        Quantity: 1,
        "Net Quantity": "1U",
      },
      {
        "Product Name": "Racing Car 505",
        MRP: 1499,
        "Sales Price": 1199,
        Quantity: 1,
        "Net Quantity": "1U",
      },
      {
        "Product Name": "Remote Car 202",
        MRP: 999,
        "Sales Price": 799,
        Quantity: 1,
        "Net Quantity": "1U",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths
    ws["!cols"] = [
      { wch: 30 }, // Product Name
      { wch: 12 }, // MRP
      { wch: 14 }, // Sales Price
      { wch: 12 }, // Quantity
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
      "Product Name": r.productName,
      MRP: r.mrp || "",
      "Sales Price": r.salesPrice || "",
      Quantity: r.quantity || "",
      Status: r.isValid ? "VALID" : "INVALID",
      Errors: r.errors.join("; "),
      Warnings: r.warnings.join("; "),
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    ws["!cols"] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 40 },
      { wch: 40 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Validation Error Report");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }
}
