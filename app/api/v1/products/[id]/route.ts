import { NextRequest } from "next/server";
import { connectToDatabase, ProductModel } from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";
import { logAuditEvent } from "@/lib/services/audit.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const product = await ProductModel.findById(id);
    if (!product) {
      return sendError("PRODUCT_NOT_FOUND", "Product not found", null, 404);
    }
    return sendSuccess(product);
  } catch (error: any) {
    return sendError("PRODUCT_FETCH_FAILED", error.message, null, 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const product = await ProductModel.findById(id);
    if (!product) {
      return sendError("PRODUCT_NOT_FOUND", "Product not found", null, 404);
    }

    const oldValues = {
      name: product.name,
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,
      gstRate: product.gstRate,
      category: product.category,
    };

    // Update allowed fields
    if (body.name) product.name = body.name.trim();
    if (body.shortName !== undefined) product.shortName = body.shortName?.trim();
    if (body.description !== undefined) product.description = body.description?.trim();
    if (body.category) product.category = body.category.trim();
    if (body.brand) product.brand = body.brand.trim();
    if (body.hsnSac) product.hsnSac = body.hsnSac.trim();
    if (body.mrp !== undefined) product.mrp = Number(body.mrp);
    if (body.costPrice !== undefined) product.costPrice = Number(body.costPrice);
    if (body.sellingPrice !== undefined) product.sellingPrice = Number(body.sellingPrice);
    if (body.discountPct !== undefined) product.discountPct = Number(body.discountPct);
    if (body.gstRate !== undefined) product.gstRate = Number(body.gstRate);
    if (body.isTaxInclusive !== undefined) product.isTaxInclusive = Boolean(body.isTaxInclusive);
    if (body.minStock !== undefined) product.minStock = Number(body.minStock);
    if (body.reorderLevel !== undefined) product.reorderLevel = Number(body.reorderLevel);
    if (body.status) product.status = body.status;

    await product.save();

    await logAuditEvent({
      userName: body.updatedBy || "Admin",
      action: "PRODUCT_UPDATED",
      entity: "Product",
      entityId: product._id.toString(),
      oldValue: oldValues,
      newValue: body,
    });

    return sendSuccess(product);
  } catch (error: any) {
    return sendError("PRODUCT_UPDATE_FAILED", error.message, null, 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const product = await ProductModel.findById(id);
    if (!product) {
      return sendError("PRODUCT_NOT_FOUND", "Product not found", null, 404);
    }

    product.status = "archived";
    await product.save();

    await logAuditEvent({
      userName: "Admin",
      action: "PRODUCT_ARCHIVED",
      entity: "Product",
      entityId: product._id.toString(),
    });

    return sendSuccess({ message: "Product archived successfully", id });
  } catch (error: any) {
    return sendError("PRODUCT_DELETE_FAILED", error.message, null, 500);
  }
}
