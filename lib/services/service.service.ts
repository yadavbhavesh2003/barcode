import { connectToDatabase, ServiceModel } from "../db/mongodb";
import { IService, PricingType, ServiceStatus } from "../types";
import { logAuditEvent } from "./audit.service";

export interface CreateServiceInput {
  serviceCode?: string;
  name: string;
  sacCode?: string;
  category?: string;
  pricingType?: PricingType;
  price: number;
  gstRate?: number;
  isTaxInclusive?: boolean;
  description?: string;
  turnaroundHours?: number;
  createdBy?: string;
}

export async function createService(input: CreateServiceInput) {
  await connectToDatabase();

  const name = input.name?.trim();
  if (!name) {
    throw new Error("Service name is required");
  }

  let serviceCode = input.serviceCode?.trim();
  if (!serviceCode) {
    const count = await ServiceModel.countDocuments();
    serviceCode = `SRV-${String(1001 + count).padStart(4, "0")}`;
  }

  const existing = await ServiceModel.findOne({ serviceCode });
  if (existing) {
    const err: any = new Error(`Service code '${serviceCode}' already exists for '${existing.name}'`);
    err.code = "SERVICE_CODE_ALREADY_EXISTS";
    throw err;
  }

  const service = await ServiceModel.create({
    serviceCode,
    name,
    sacCode: input.sacCode?.trim() || "998313",
    category: input.category?.trim() || "Barcode Services",
    pricingType: input.pricingType || "FIXED",
    price: Number(input.price) || 0,
    gstRate: input.gstRate !== undefined ? Number(input.gstRate) : 18,
    isTaxInclusive: input.isTaxInclusive !== undefined ? Boolean(input.isTaxInclusive) : true,
    status: "active",
    description: input.description?.trim(),
    turnaroundHours: Number(input.turnaroundHours) || 24,
    createdBy: input.createdBy || "Admin",
    updatedBy: input.createdBy || "Admin",
  });

  await logAuditEvent({
    userName: input.createdBy || "Admin",
    action: "SERVICE_CREATED",
    entity: "Service",
    entityId: service._id.toString(),
    newValue: { name: service.name, serviceCode, price: service.price },
  });

  return service;
}

export async function searchServices({
  query,
  category,
  status = "active",
  page = 1,
  limit = 20,
}: {
  query?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  await connectToDatabase();

  const filter: any = {};
  if (status && status !== "ALL") {
    filter.status = status;
  } else {
    filter.status = { $ne: "archived" };
  }

  if (query && query.trim()) {
    const q = query.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { serviceCode: { $regex: q, $options: "i" } },
      { category: { $regex: q, $options: "i" } },
    ];
  }

  if (category && category !== "All") {
    filter.category = category;
  }

  const skip = (page - 1) * limit;
  const [services, total] = await Promise.all([
    ServiceModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ServiceModel.countDocuments(filter),
  ]);

  return {
    services,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}
