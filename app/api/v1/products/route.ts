import { NextRequest } from "next/server";
import { createProduct, searchProducts } from "@/lib/services/product.service";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const category = searchParams.get("category") || "";
    const brand = searchParams.get("brand") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await searchProducts({ query, category, brand, page, limit });
    return sendSuccess(result.products, 200, result.pagination);
  } catch (error: any) {
    return sendError("PRODUCT_FETCH_FAILED", error.message || "Failed to fetch products", null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = await createProduct(body);
    return sendSuccess(product, 201);
  } catch (error: any) {
    if (error.code === "BARCODE_ALREADY_EXISTS" || error.code === "ITEM_NUMBER_ALREADY_EXISTS") {
      return sendError(error.code, error.message, error.details, 409);
    }
    return sendError("PRODUCT_CREATION_FAILED", error.message || "Failed to create product", null, 400);
  }
}
