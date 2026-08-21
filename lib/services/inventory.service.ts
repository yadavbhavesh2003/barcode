import {
  connectToDatabase,
  ProductModel,
  InventoryTransactionModel,
  SystemSettingModel,
} from "../db/mongodb";
import { InventoryTransactionType } from "../types";
import { logAuditEvent } from "./audit.service";

export interface StockAdjustmentParams {
  productId: string;
  type: InventoryTransactionType;
  quantity: number; // positive number of units
  reason?: string;
  referenceId?: string;
  createdBy?: string;
}

export async function adjustProductStock({
  productId,
  type,
  quantity,
  reason,
  referenceId,
  createdBy = "Admin",
}: StockAdjustmentParams) {
  await connectToDatabase();

  const product = await ProductModel.findById(productId);
  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const allowNegativeSetting = await SystemSettingModel.findOne({
    key: "allow_negative_stock",
  });
  const allowNegative = allowNegativeSetting?.value === true;

  const isDeduction = ["SALE", "ADJUSTMENT_SUBTRACT", "DAMAGE"].includes(type);
  const delta = isDeduction ? -Math.abs(quantity) : Math.abs(quantity);

  const stockBefore = product.currentStock || 0;
  const stockAfter = stockBefore + delta;

  if (stockAfter < 0 && !allowNegative) {
    throw new Error(
      `INSUFFICIENT_STOCK: Product '${product.name}' only has ${stockBefore} units in stock.`
    );
  }

  // Update Product Stock
  product.currentStock = stockAfter;
  product.availableStock = stockAfter - (product.reservedStock || 0);
  await product.save();

  // Create immutable ledger entry
  const transaction = await InventoryTransactionModel.create({
    productId: product._id,
    productName: product.name,
    itemNumber: product.itemNumber,
    type,
    quantity: delta,
    stockBefore,
    stockAfter,
    referenceId,
    reason: reason || `${type} of ${quantity} units`,
    createdBy,
  });

  await logAuditEvent({
    userName: createdBy,
    action: `INVENTORY_${type}`,
    entity: "Product",
    entityId: product._id.toString(),
    oldValue: { currentStock: stockBefore },
    newValue: { currentStock: stockAfter, delta, referenceId },
  });

  return { product, transaction };
}
