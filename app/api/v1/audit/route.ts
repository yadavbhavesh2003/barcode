import { NextRequest } from "next/server";
import { connectToDatabase, AuditLogModel } from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "";
    const entity = searchParams.get("entity") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const filter: any = {};
    if (action && action !== "ALL") filter.action = action;
    if (entity && entity !== "ALL") filter.entity = entity;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLogModel.countDocuments(filter),
    ]);

    return sendSuccess(logs, 200, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    return sendError("AUDIT_FETCH_FAILED", error.message, null, 500);
  }
}
