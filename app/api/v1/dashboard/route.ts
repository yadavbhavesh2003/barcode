import { NextRequest } from "next/server";
import {
  connectToDatabase,
  InvoiceModel,
  ProductModel,
  ServiceModel,
  CustomerModel,
  BarcodeModel,
  AuditLogModel,
  SequenceTrackerModel,
} from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today"; // "today", "7d", "30d", "this_month", "all_time"

    const now = new Date();
    let startDate = new Date();

    if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "7d") {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "30d") {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "all_time") {
      startDate = new Date(2000, 0, 1);
    }

    const matchFilter: any = {
      status: "ACTIVE",
      invoiceDate: { $gte: startDate, $lte: now },
    };

    // 1. Sales & Invoices Aggregation for Period
    const salesAgg = await InvoiceModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$grandTotal" },
          totalBills: { $sum: 1 },
          totalTax: { $sum: "$totalGst" },
          totalUnits: { $sum: "$totalQuantity" },
          totalDiscount: { $sum: "$totalDiscount" },
        },
      },
    ]);

    const salesStats = salesAgg[0] || {
      totalRevenue: 0,
      totalBills: 0,
      totalTax: 0,
      totalUnits: 0,
      totalDiscount: 0,
    };

    const aov = salesStats.totalBills > 0 ? Math.round(salesStats.totalRevenue / salesStats.totalBills) : 0;

    // 2. Pending Receivables
    const pendingAgg = await InvoiceModel.aggregate([
      {
        $match: {
          paymentStatus: { $in: ["PENDING", "PARTIAL"] },
          status: "ACTIVE",
        },
      },
      {
        $group: {
          _id: null,
          totalPendingAmount: { $sum: "$balanceAmount" },
          pendingCount: { $sum: 1 },
        },
      },
    ]);
    const pendingStats = pendingAgg[0] || { totalPendingAmount: 0, pendingCount: 0 };

    // 3. Products & Stock Status
    const productStats = await ProductModel.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalUnitsInStock: { $sum: "$currentStock" },
          totalValuation: { $sum: { $multiply: ["$currentStock", "$sellingPrice"] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ["$currentStock", "$minStock"] }, 1, 0],
            },
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $lte: ["$currentStock", 0] }, 1, 0],
            },
          },
        },
      },
    ]);
    const prodSummary = productStats[0] || {
      totalProducts: 0,
      totalUnitsInStock: 0,
      totalValuation: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    };

    // 4. Services Count & Summary
    const [activeServicesCount, totalServicesCount] = await Promise.all([
      ServiceModel.countDocuments({ status: "active" }),
      ServiceModel.countDocuments({ status: { $ne: "archived" } }),
    ]);

    // 5. Customers Count
    const totalCustomers = await CustomerModel.countDocuments();

    // 6. Top Selling Products in Period
    const topProducts = await InvoiceModel.aggregate([
      { $match: matchFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.productName" },
          barcodeNumber: { $first: "$items.barcodeNumber" },
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    // 7. Low Stock Priority Items (for quick restock)
    const lowStockItems = await ProductModel.find({
      status: "active",
      $expr: { $lte: ["$currentStock", "$minStock"] },
    })
      .limit(6)
      .select("name itemNumber barcodeNumber currentStock minStock sellingPrice");

    // 8. Recent Invoices
    const recentInvoices = await InvoiceModel.find({ status: "ACTIVE" })
      .sort({ invoiceDate: -1 })
      .limit(6)
      .select("invoiceNumber customer grandTotal paymentMethod paymentStatus invoiceDate");

    // 9. Recent Live Audit Events
    const recentAudits = await AuditLogModel.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select("userName action entity entityId createdAt");

    // 10. Operational Status & Sequence Information
    const barcodeSeq = await SequenceTrackerModel.findById("barcode_counter");

    return sendSuccess({
      period,
      sales: {
        totalRevenue: salesStats.totalRevenue,
        totalBills: salesStats.totalBills,
        totalTax: salesStats.totalTax,
        totalUnits: salesStats.totalUnits,
        totalDiscount: salesStats.totalDiscount,
        aov,
        pendingAmount: pendingStats.totalPendingAmount,
        pendingCount: pendingStats.pendingCount,
      },
      inventory: {
        totalProducts: prodSummary.totalProducts,
        totalUnitsInStock: prodSummary.totalUnitsInStock,
        totalValuation: prodSummary.totalValuation,
        lowStockCount: prodSummary.lowStockCount,
        outOfStockCount: prodSummary.outOfStockCount,
      },
      services: {
        activeCount: activeServicesCount,
        totalCount: totalServicesCount,
      },
      customers: {
        totalCount: totalCustomers,
      },
      topProducts,
      lowStockItems,
      recentInvoices,
      recentAudits,
      operationalHealth: {
        dbConnected: true,
        lastAllocatedBarcode: barcodeSeq?.currentVal || 100000,
        serverTime: new Date(),
      },
    });
  } catch (error: any) {
    return sendError("DASHBOARD_STATS_FAILED", error.message, null, 500);
  }
}
