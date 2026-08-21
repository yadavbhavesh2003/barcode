import { NextRequest } from "next/server";
import { connectToDatabase, InvoiceModel, ProductModel, InventoryTransactionModel } from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "sales_summary"; // "sales_summary", "gst_report", "product_sales", "inventory_movement"
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const dateFilter: any = {};
    if (startDateStr) dateFilter.$gte = new Date(startDateStr);
    if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    if (reportType === "sales_summary") {
      const match: any = { status: "ACTIVE" };
      if (startDateStr || endDateStr) match.invoiceDate = dateFilter;

      const salesData = await InvoiceModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
            totalSales: { $sum: "$grandTotal" },
            taxableAmount: { $sum: "$taxableAmount" },
            totalGst: { $sum: "$totalGst" },
            billsCount: { $sum: 1 },
            itemsSold: { $sum: "$totalQuantity" },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      return sendSuccess({ type: reportType, data: salesData });
    }

    if (reportType === "gst_report") {
      const match: any = { status: "ACTIVE" };
      if (startDateStr || endDateStr) match.invoiceDate = dateFilter;

      const gstBreakdown = await InvoiceModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalTaxable: { $sum: "$taxableAmount" },
            totalCGST: { $sum: "$cgstAmount" },
            totalSGST: { $sum: "$sgstAmount" },
            totalIGST: { $sum: "$igstAmount" },
            totalGST: { $sum: "$totalGst" },
            totalInvoices: { $sum: 1 },
          },
        },
      ]);

      return sendSuccess({ type: reportType, data: gstBreakdown[0] || {} });
    }

    if (reportType === "product_sales") {
      const match: any = { status: "ACTIVE" };
      if (startDateStr || endDateStr) match.invoiceDate = dateFilter;

      const productSales = await InvoiceModel.aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            productName: { $first: "$items.productName" },
            barcodeNumber: { $first: "$items.barcodeNumber" },
            hsnSac: { $first: "$items.hsnSac" },
            totalQuantitySold: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.lineTotal" },
            totalTax: { $sum: "$items.totalGst" },
          },
        },
        { $sort: { totalQuantitySold: -1 } },
        { $limit: 50 },
      ]);

      return sendSuccess({ type: reportType, data: productSales });
    }

    return sendError("INVALID_REPORT_TYPE", "Report type not recognized", null, 400);
  } catch (error: any) {
    return sendError("REPORT_GENERATION_FAILED", error.message, null, 500);
  }
}
