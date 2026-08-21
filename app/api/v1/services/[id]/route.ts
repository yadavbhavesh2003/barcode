import { NextRequest } from "next/server";
import { connectToDatabase, ServiceModel } from "@/lib/db/mongodb";
import { sendSuccess, sendError } from "@/lib/utils/api-response";
import { logAuditEvent } from "@/lib/services/audit.service";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const service = await ServiceModel.findById(id);
    if (!service) {
      return sendError("SERVICE_NOT_FOUND", "Service not found", null, 404);
    }
    return sendSuccess(service);
  } catch (error: any) {
    return sendError("SERVICE_FETCH_FAILED", error.message, null, 500);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();

    const service = await ServiceModel.findById(id);
    if (!service) {
      return sendError("SERVICE_NOT_FOUND", "Service not found", null, 404);
    }

    const oldValues = {
      name: service.name,
      price: service.price,
      gstRate: service.gstRate,
      status: service.status,
    };

    if (body.name) service.name = body.name.trim();
    if (body.sacCode) service.sacCode = body.sacCode.trim();
    if (body.category) service.category = body.category.trim();
    if (body.pricingType) service.pricingType = body.pricingType;
    if (body.price !== undefined) service.price = Number(body.price);
    if (body.gstRate !== undefined) service.gstRate = Number(body.gstRate);
    if (body.isTaxInclusive !== undefined) service.isTaxInclusive = Boolean(body.isTaxInclusive);
    if (body.description !== undefined) service.description = body.description?.trim();
    if (body.turnaroundHours !== undefined) service.turnaroundHours = Number(body.turnaroundHours);
    if (body.status) service.status = body.status;

    await service.save();

    await logAuditEvent({
      userName: body.updatedBy || "Admin",
      action: "SERVICE_UPDATED",
      entity: "Service",
      entityId: service._id.toString(),
      oldValue: oldValues,
      newValue: body,
    });

    return sendSuccess(service);
  } catch (error: any) {
    return sendError("SERVICE_UPDATE_FAILED", error.message, null, 400);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const service = await ServiceModel.findById(id);
    if (!service) {
      return sendError("SERVICE_NOT_FOUND", "Service not found", null, 404);
    }

    service.status = "archived";
    await service.save();

    await logAuditEvent({
      userName: "Admin",
      action: "SERVICE_ARCHIVED",
      entity: "Service",
      entityId: service._id.toString(),
    });

    return sendSuccess({ message: "Service archived successfully", id });
  } catch (error: any) {
    return sendError("SERVICE_DELETE_FAILED", error.message, null, 500);
  }
}
