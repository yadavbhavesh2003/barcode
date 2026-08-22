import { NextRequest } from "next/server";
import { connectToDatabase, ProductModel } from "@/lib/db/mongodb";
import { adjustProductStock } from "@/lib/services/inventory.service";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all"; // "all", "low_stock", "out_of_stock"
    const query = (
      searchParams.get("query") ||
      searchParams.get("search") ||
      searchParams.get("q") ||
      ""
    ).trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const conditions: any[] = [{ status: { $ne: "archived" } }];

    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      conditions.push({
        $or: [
          { name: regex },
          { shortName: regex },
          { itemNumber: regex },
          { barcodeNumber: regex },
          { customBarcode: regex },
          { sku: regex },
          { category: regex },
          { brand: regex },
        ],
      });
    }

    if (filterType === "low_stock") {
      conditions.push({
        $or: [{ currentStock: { $lte: 1 } }, { currentStock: { $exists: false } }],
      });
    } else if (filterType === "out_of_stock") {
      conditions.push({ currentStock: { $lte: 0 } });
    }

    const match: any = conditions.length > 1 ? { $and: conditions } : conditions[0];

    const skip = (page - 1) * limit;
    const [products, total, allProdsForStats] = await Promise.all([
      ProductModel.find(match).sort({ currentStock: 1, _id: -1 }).skip(skip).limit(limit).lean(),
      ProductModel.countDocuments(match),
      ProductModel.find({ status: { $ne: "archived" } }).lean(),
    ]);

    let totalUnits = 0;
    let totalValuation = 0;
    let lowStockCount = 0;

    for (const p of allProdsForStats as any[]) {
      const stock = Number(p.currentStock || 0);
      const price = Number(p.salesPrice || p.sellingPrice || p.mrp || 0);
      totalUnits += stock;
      totalValuation += stock * price;
      if (stock <= 1) {
        lowStockCount++;
      }
    }

    const statSummary = { totalUnits, totalValuation, lowStockCount };

    return sendSuccess(
      {
        products,
        stats: {
          totalUnits: statSummary.totalUnits,
          totalValuation: statSummary.totalValuation,
          lowStockCount: statSummary.lowStockCount,
        },
      },
      200,
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      }
    );
  } catch (error: any) {
    return sendError("INVENTORY_FETCH_FAILED", error.message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, type, quantity, reason, createdBy } = body;

    if (!productId || !type || quantity === undefined) {
      return sendError("MISSING_FIELDS", "ProductId, Type, and Quantity are required", null, 400);
    }

    const result = await adjustProductStock({
      productId,
      type,
      quantity: Number(quantity),
      reason,
      createdBy,
    });

    return sendSuccess(result);
  } catch (error: any) {
    return sendError("STOCK_ADJUSTMENT_FAILED", error.message, null, 400);
  }
}
