import { NextRequest } from "next/server";
import { connectToDatabase, InventoryTransactionModel } from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const filter: any = {};
    if (productId) filter.productId = productId;
    if (type && type !== "ALL") filter.type = type;

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      InventoryTransactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      InventoryTransactionModel.countDocuments(filter),
    ]);

    return sendSuccess(transactions, 200, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    return sendError("TRANSACTIONS_FETCH_FAILED", error.message, null, 500);
  }
}
