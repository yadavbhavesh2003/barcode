import { NextRequest } from "next/server";
import { connectToDatabase, ProductModel } from "@/lib/db/mongodb";
import { adjustProductStock } from "@/lib/services/inventory.service";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get("filter") || "all"; // "all", "low_stock", "out_of_stock"
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const match: any = { status: "active" };

    if (query) {
      match.$or = [
        { name: { $regex: query.trim(), $options: "i" } },
        { itemNumber: { $regex: query.trim(), $options: "i" } },
        { barcodeNumber: { $regex: query.trim(), $options: "i" } },
      ];
    }

    if (filterType === "low_stock") {
      match.$expr = { $lte: ["$currentStock", "$minStock"] };
    } else if (filterType === "out_of_stock") {
      match.currentStock = { $lte: 0 };
    }

    const skip = (page - 1) * limit;
    const [products, total, stats] = await Promise.all([
      ProductModel.find(match).sort({ currentStock: 1 }).skip(skip).limit(limit),
      ProductModel.countDocuments(match),
      ProductModel.aggregate([
        { $match: { status: "active" } },
        {
          $group: {
            _id: null,
            totalUnits: { $sum: "$currentStock" },
            totalValuation: { $sum: { $multiply: ["$currentStock", "$sellingPrice"] } },
            lowStockCount: {
              $sum: {
                $cond: [{ $lte: ["$currentStock", "$minStock"] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const statSummary = stats[0] || { totalUnits: 0, totalValuation: 0, lowStockCount: 0 };

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
