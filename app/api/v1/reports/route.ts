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
            totalDiscount: { $sum: "$totalDiscount" },
            billsCount: { $sum: 1 },
            itemsSold: { $sum: "$totalQuantity" },
          },
        },
        { $sort: { _id: -1 } },
      ]);

      return sendSuccess({ type: reportType, data: salesData });
    }

    if (reportType === "payment_breakdown" || reportType === "gst_report") {
      const match: any = { status: "ACTIVE" };
      if (startDateStr || endDateStr) match.invoiceDate = dateFilter;

      const paymentBreakdown = await InvoiceModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalTurnover: { $sum: "$grandTotal" },
            totalDiscount: { $sum: "$totalDiscount" },
            totalInvoices: { $sum: 1 },
            totalUnits: { $sum: "$totalQuantity" },
            cashRevenue: {
              $sum: {
                $cond: [{ $eq: [{ $toUpper: "$paymentMethod" }, "CASH"] }, "$grandTotal", 0],
              },
            },
            cashCount: {
              $sum: {
                $cond: [{ $eq: [{ $toUpper: "$paymentMethod" }, "CASH"] }, 1, 0],
              },
            },
            upiRevenue: {
              $sum: {
                $cond: [{ $eq: [{ $toUpper: "$paymentMethod" }, "UPI"] }, "$grandTotal", 0],
              },
            },
            upiCount: {
              $sum: {
                $cond: [{ $eq: [{ $toUpper: "$paymentMethod" }, "UPI"] }, 1, 0],
              },
            },
            cardRevenue: {
              $sum: {
                $cond: [{ $eq: [{ $toUpper: "$paymentMethod" }, "CARD"] }, "$grandTotal", 0],
              },
            },
            cardCount: {
              $sum: {
                $cond: [{ $eq: [{ $toUpper: "$paymentMethod" }, "CARD"] }, 1, 0],
              },
            },
          },
        },
      ]);

      return sendSuccess({ type: reportType, data: paymentBreakdown[0] || {} });
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
            unitPrice: { $first: "$items.unitPrice" },
            totalQuantitySold: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.lineTotal" },
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
