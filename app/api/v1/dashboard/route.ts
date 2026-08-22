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

    // Match invoices created in the target period (support both createdAt and invoiceDate)
    const dateMatchFilter: any = {
      $or: [
        { createdAt: { $gte: startDate, $lte: now } },
        { invoiceDate: { $gte: startDate, $lte: now } },
      ],
    };

    // 1. Fetch Invoices for target period
    const allPeriodInvoices = await InvoiceModel.find(dateMatchFilter).lean();

    let totalRevenue = 0;
    let totalBills = allPeriodInvoices.length;
    let totalUnits = 0;
    let totalDiscount = 0;
    let cashRevenue = 0;
    let upiRevenue = 0;
    let cardRevenue = 0;
    let cashCount = 0;
    let upiCount = 0;
    let cardCount = 0;

    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number; barcode: string }> = {};

    for (const inv of allPeriodInvoices as any[]) {
      const gTotal = Number(inv.grandTotal || 0);
      totalRevenue += gTotal;
      totalUnits += Number(inv.totalQuantity || inv.itemsCount || 0);
      totalDiscount += Number(inv.discount || inv.totalDiscount || 0);

      // Payment Mode Breakdown
      const mode = (inv.paymentMode || "").toUpperCase();
      const pmtMethod = (inv.payments && inv.payments[0]?.method ? inv.payments[0].method : mode).toUpperCase();

      if (pmtMethod.includes("UPI") || mode.includes("UPI") || mode.includes("GPAY") || mode.includes("PHONEPE")) {
        upiRevenue += gTotal;
        upiCount++;
      } else if (pmtMethod.includes("CARD") || mode.includes("CARD") || mode.includes("DEBIT") || mode.includes("CREDIT")) {
        cardRevenue += gTotal;
        cardCount++;
      } else {
        cashRevenue += gTotal;
        cashCount++;
      }

      // Products aggregate
      if (inv.items && Array.isArray(inv.items)) {
        for (const it of inv.items) {
          const key = it.productName || it.barcode || "Product";
          const qty = Number(it.quantity || 1);
          const rev = Number(it.totalAmount || it.lineTotal || (it.salesPrice || it.unitPrice || 0) * qty);

          if (!productSalesMap[key]) {
            productSalesMap[key] = {
              name: it.productName || "Item",
              quantity: 0,
              revenue: 0,
              barcode: it.barcode || it.barcodeNumber || "",
            };
          }
          productSalesMap[key].quantity += qty;
          productSalesMap[key].revenue += rev;
        }
      }
    }

    const aov = totalBills > 0 ? Math.round(totalRevenue / totalBills) : 0;

    // Sort Top Selling Products
    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6)
      .map((p) => ({
        productName: p.name,
        barcodeNumber: p.barcode,
        totalSold: p.quantity,
        revenue: p.revenue,
      }));

    // 2. Sales Trend Chart Data (Support 7d, 14d, 30d)
    const trendParam = searchParams.get("trend") || "7d";
    const trendDays = trendParam === "30d" ? 30 : trendParam === "14d" ? 14 : 7;
    const salesTrend: { date: string; label: string; dayName: string; revenue: number; bills: number }[] = [];

    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const dayInvoices = await InvoiceModel.find({
        $or: [
          { createdAt: { $gte: dayStart, $lte: dayEnd } },
          { invoiceDate: { $gte: dayStart, $lte: dayEnd } },
        ],
      }).lean();

      const dayRev = dayInvoices.reduce((sum: number, inv: any) => sum + Number(inv.grandTotal || 0), 0);
      const dayLabel = i === 0 ? "Today" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });

      salesTrend.push({
        date: d.toISOString().slice(0, 10),
        label: dayLabel,
        dayName,
        revenue: dayRev,
        bills: dayInvoices.length,
      });
    }

    // 3. Products & Stock Status (with fallback for legacy catalog items)
    const [totalProducts, allProducts] = await Promise.all([
      ProductModel.countDocuments({ status: { $ne: "archived" } }),
      ProductModel.find({ status: { $ne: "archived" } }).lean(),
    ]);

    let totalUnitsInStock = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of allProducts as any[]) {
      const stock = Number(
        p.currentStock !== undefined && p.currentStock !== null
          ? p.currentStock
          : p.quantity !== undefined
          ? p.quantity
          : p.openingStock || 0
      );
      const price = Number(p.salesPrice || p.sellingPrice || p.mrp || 0);
      totalUnitsInStock += stock;
      totalValuation += stock * price;
      if (stock <= 0) {
        outOfStockCount++;
      } else if (stock <= 1) {
        lowStockCount++;
      }
    }

    // 4. Low Stock Priority Items (Stock <= 1 unit)
    const lowStockItemsRaw = await ProductModel.find({
      status: { $ne: "archived" },
      currentStock: { $lte: 1 },
    })
      .sort({ currentStock: 1 })
      .limit(6)
      .select("name itemNumber barcodeNumber customBarcode currentStock minStock sellingPrice salesPrice mrp quantity")
      .lean();

    const lowStockItems = lowStockItemsRaw.map((item: any) => ({
      ...item,
      currentStock: Number(
        item.currentStock !== undefined && item.currentStock !== null
          ? item.currentStock
          : item.quantity !== undefined
          ? item.quantity
          : 0
      ),
      minStock: 1,
    }));

    // 5. Recent Live Invoices
    const recentInvoicesRaw = await InvoiceModel.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .lean();

    const recentInvoices = recentInvoicesRaw.map((inv: any) => ({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      customer: {
        name: inv.customer?.name || inv.customerName || "Walk-in Customer",
        mobile: inv.customer?.mobile || inv.customerPhone || "",
      },
      grandTotal: inv.grandTotal,
      paymentMethod: inv.paymentMode || (inv.payments && inv.payments[0]?.method) || "Cash",
      paymentStatus: inv.status || "PAID",
      invoiceDate: inv.createdAt || inv.invoiceDate,
      totalItems: inv.totalItems || (inv.items ? inv.items.length : 0),
    }));

    // 6. Customers Count & Batches Count
    const [totalCustomers, totalBatches] = await Promise.all([
      CustomerModel.countDocuments(),
      BarcodeModel.countDocuments(),
    ]);

    return sendSuccess({
      period,
      sales: {
        totalRevenue,
        totalBills,
        totalUnits,
        totalDiscount,
        aov,
        cashRevenue,
        upiRevenue,
        cardRevenue,
        cashCount,
        upiCount,
        cardCount,
      },
      salesTrend,
      paymentBreakdown: {
        cash: { amount: cashRevenue, count: cashCount },
        upi: { amount: upiRevenue, count: upiCount },
        card: { amount: cardRevenue, count: cardCount },
      },
      inventory: {
        totalProducts,
        totalUnitsInStock,
        totalValuation,
        lowStockCount,
        outOfStockCount,
      },
      customers: {
        totalCount: totalCustomers,
      },
      topProducts,
      lowStockItems,
      recentInvoices,
      operationalHealth: {
        dbConnected: true,
        totalBarcodes: totalBatches,
        serverTime: new Date(),
      },
    });
  } catch (error: any) {
    return sendError("DASHBOARD_STATS_FAILED", error.message, null, 500);
  }
}
