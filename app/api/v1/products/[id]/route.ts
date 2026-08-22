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
      currentStock: product.currentStock,
      gstRate: product.gstRate,
      category: product.category,
    };

    // 1. Check if stock was modified in edit form
    const newStockInput = body.openingStock !== undefined ? Number(body.openingStock) : body.currentStock !== undefined ? Number(body.currentStock) : undefined;
    const oldStock = product.currentStock || 0;

    if (newStockInput !== undefined && !isNaN(newStockInput) && newStockInput !== oldStock) {
      const delta = newStockInput - oldStock;
      product.currentStock = newStockInput;
      product.availableStock = newStockInput - (product.reservedStock || 0);

      // Import models dynamically to avoid cyclic deps
      const { InventoryTransactionModel, NotificationModel } = await import("@/lib/db/mongodb");
      
      // Log immutable inventory transaction
      await InventoryTransactionModel.create({
        productId: product._id,
        productName: product.name,
        itemNumber: product.itemNumber,
        type: delta > 0 ? "ADJUSTMENT_ADD" : "ADJUSTMENT_SUBTRACT",
        quantity: delta,
        stockBefore: oldStock,
        stockAfter: newStockInput,
        referenceId: `PRODUCT-EDIT-${Date.now()}`,
        reason: `Stock modified via Product Master Edit (${oldStock} → ${newStockInput} units)`,
        createdBy: body.updatedBy || "Catalog Admin",
      });

      // Low stock notification if dropped below threshold
      if (newStockInput <= (product.minStock || 5)) {
        await NotificationModel.create({
          title: `⚠️ Low Stock Alert: ${product.name}`,
          message: `${product.name} stock was edited to ${newStockInput} units (Threshold: ${product.minStock || 5}).`,
          type: "warning",
          category: "stock",
          isRead: false,
          link: "/inventory",
        });
      }
    }

    // 2. Check for duplicate barcode if modified
    const targetCode = (body.barcodeNumber || body.itemNumber)?.trim();
    if (targetCode) {
      const duplicate = await ProductModel.findOne({
        _id: { $ne: product._id },
        $or: [
          { itemNumber: targetCode },
          { barcodeNumber: targetCode },
          { customBarcode: targetCode },
          { sku: targetCode },
        ],
        status: { $ne: "archived" },
      });
      if (duplicate) {
        return sendError(
          "BARCODE_ALREADY_EXISTS",
          `Barcode / Item Code '${targetCode}' is already assigned to '${duplicate.name}'. Duplicate barcodes cannot be reused.`,
          null,
          409
        );
      }
      product.itemNumber = targetCode;
      product.barcodeNumber = targetCode;
      product.customBarcode = targetCode;
      product.sku = targetCode;
    }

    // 3. Update all catalog & pricing fields
    if (body.name) product.name = body.name.trim();
    if (body.shortName !== undefined) product.shortName = body.shortName?.trim();
    if (body.description !== undefined) product.description = body.description?.trim();
    if (body.category) product.category = body.category.trim();
    if (body.brand) product.brand = body.brand.trim();
    if (body.hsnSac) {
      product.hsnSac = body.hsnSac.trim();
      (product as any).hsn = body.hsnSac.trim();
    }
    if (body.unitOfMeasure) product.unitOfMeasure = body.unitOfMeasure.trim();
    
    const nextMrp = body.mrp !== undefined ? Number(body.mrp) : product.mrp;
    const nextSellingPrice = body.sellingPrice !== undefined ? Number(body.sellingPrice) : product.sellingPrice;

    if (nextSellingPrice > nextMrp) {
      return sendError(
        "SELLING_PRICE_EXCEEDS_MRP",
        `Selling Price (₹${nextSellingPrice}) cannot exceed Maximum Retail Price (MRP ₹${nextMrp}).`,
        null,
        400
      );
    }

    if (body.mrp !== undefined) product.mrp = nextMrp;
    if (body.costPrice !== undefined) product.costPrice = Number(body.costPrice);
    if (body.sellingPrice !== undefined) {
      product.sellingPrice = nextSellingPrice;
      (product as any).salesPrice = nextSellingPrice;
    }
    if (body.discountPct !== undefined) product.discountPct = Number(body.discountPct);
    if (body.gstRate !== undefined) {
      let gRate = Number(body.gstRate);
      if (gRate > 0 && gRate < 1) gRate = Math.round(gRate * 100);
      product.gstRate = gRate;
    }
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
