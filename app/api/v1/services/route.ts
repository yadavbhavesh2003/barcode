import { NextRequest } from "next/server";
import { createService, searchServices } from "@/lib/services/service.service";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "ALL";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await searchServices({ query, category, status, page, limit });
    return sendSuccess(result.services, 200, result.pagination);
  } catch (error: any) {
    return sendError("SERVICE_FETCH_FAILED", error.message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const service = await createService(body);
    return sendSuccess(service, 201);
  } catch (error: any) {
    return sendError("SERVICE_CREATION_FAILED", error.message, null, 400);
  }
}
