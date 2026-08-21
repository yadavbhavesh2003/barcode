import {
  connectToDatabase,
  ProductModel,
  BarcodeModel,
  InventoryTransactionModel,
} from "../db/mongodb";
import { IProduct } from "../types";
import { generateNextBarcodeSequence, assignBarcodeToProduct } from "./barcode.service";
import { logAuditEvent } from "./audit.service";

export interface CreateProductInput {
  itemNumber?: string;
  sku?: string;
  name: string;
  shortName?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  hsnSac?: string;
  unitOfMeasure?: string;
  mrp: number;
  costPrice?: number;
  sellingPrice: number;
  discountPct?: number;
  gstRate?: number;
  isTaxInclusive?: boolean;
  openingStock?: number;
  minStock?: number;
  reorderLevel?: number;
  maxStock?: number;
  barcodeNumber?: string;
  barcodeType?: any;
  barcodeSource?: any;
  createdBy?: string;
}

export async function createProduct(input: CreateProductInput) {
  await connectToDatabase();

  const name = input.name?.trim();
  if (!name) {
    throw new Error("Product name is required");
  }

  // 1. Determine Item Number (use provided or auto-generate)
  let itemNumber = input.itemNumber?.trim();
  if (!itemNumber) {
    itemNumber = await generateNextBarcodeSequence();
  }

  // Check if itemNumber already exists
  const existingItem = await ProductModel.findOne({ itemNumber });
  if (existingItem) {
    const err: any = new Error(`Item Number '${itemNumber}' already exists for product '${existingItem.name}'`);
    err.code = "ITEM_NUMBER_ALREADY_EXISTS";
    err.details = { itemNumber, existingProductName: existingItem.name, existingProductId: existingItem._id };
    throw err;
  }

  // 2. Determine Barcode
  let barcodeNumber = input.barcodeNumber?.trim();
  if (!barcodeNumber) {
    barcodeNumber = itemNumber;
  }

  // 3. Create Product
  const openingStock = Number(input.openingStock) || 0;
  const product = await ProductModel.create({
    itemNumber,
    sku: input.sku?.trim() || itemNumber,
    name,
    shortName: input.shortName?.trim(),
    description: input.description?.trim(),
    category: input.category?.trim() || "General",
    subcategory: input.subcategory?.trim(),
    brand: input.brand?.trim() || "Generic",
    hsnSac: input.hsnSac?.trim() || "9503",
    unitOfMeasure: input.unitOfMeasure?.trim() || "PCS",
    mrp: Number(input.mrp) || Number(input.sellingPrice) || 0,
    costPrice: Number(input.costPrice) || 0,
    sellingPrice: Number(input.sellingPrice) || 0,
    discountPct: Number(input.discountPct) || 0,
    gstRate: input.gstRate !== undefined ? Number(input.gstRate) : 5,
    isTaxInclusive: input.isTaxInclusive !== undefined ? Boolean(input.isTaxInclusive) : true,
    openingStock,
    currentStock: openingStock,
    reservedStock: 0,
    availableStock: openingStock,
    minStock: Number(input.minStock) || 5,
    reorderLevel: Number(input.reorderLevel) || 10,
    maxStock: Number(input.maxStock) || 1000,
    barcodeNumber,
    barcodeType: input.barcodeType || "CODE128",
    barcodeSource: input.barcodeSource || "INTERNAL_CUSTOM",
    status: "active",
    createdBy: input.createdBy || "Admin",
    updatedBy: input.createdBy || "Admin",
  });

  // 4. Assign Barcode Record
  await assignBarcodeToProduct({
    productId: product._id.toString(),
    barcodeNumber,
    barcodeType: input.barcodeType || "CODE128",
    source: input.barcodeSource || "INTERNAL_CUSTOM",
    assignedBy: input.createdBy || "Admin",
  });

  // 5. Initial Inventory Transaction if opening stock > 0
  if (openingStock > 0) {
    await InventoryTransactionModel.create({
      productId: product._id,
      productName: product.name,
      itemNumber: product.itemNumber,
      type: "OPENING_STOCK",
      quantity: openingStock,
      stockBefore: 0,
      stockAfter: openingStock,
      reason: "Initial opening stock upon product creation",
      createdBy: input.createdBy || "Admin",
    });
  }

  await logAuditEvent({
    userName: input.createdBy || "Admin",
    action: "PRODUCT_CREATED",
    entity: "Product",
    entityId: product._id.toString(),
    newValue: { name: product.name, itemNumber, barcodeNumber, mrp: product.mrp, sellingPrice: product.sellingPrice },
  });

  return product;
}

export async function searchProducts({
  query,
  category,
  brand,
  page = 1,
  limit = 20,
}: {
  query?: string;
  category?: string;
  brand?: string;
  page?: number;
  limit?: number;
}) {
  await connectToDatabase();

  const filter: any = { status: { $ne: "archived" } };

  if (query && query.trim()) {
    const q = query.trim();
    // Check exact barcode or item number match first
    const exactMatch = await ProductModel.findOne({
      $or: [{ barcodeNumber: q }, { itemNumber: q }, { sku: q }],
      status: { $ne: "archived" },
    });

    if (exactMatch) {
      return {
        products: [exactMatch],
        pagination: { page: 1, limit, total: 1, pages: 1 },
      };
    }

    // Otherwise regex partial search
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { shortName: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
      { brand: { $regex: q, $options: "i" } },
    ];
  }

  if (category && category !== "All") {
    filter.category = category;
  }
  if (brand && brand !== "All") {
    filter.brand = brand;
  }

  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    ProductModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ProductModel.countDocuments(filter),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}
