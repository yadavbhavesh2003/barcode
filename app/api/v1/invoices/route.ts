import { NextRequest } from "next/server";
import { connectToDatabase, InvoiceModel } from "@/lib/db/mongodb";
import { createInvoice } from "@/lib/services/invoice.service";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const invoiceNumber = searchParams.get("invoiceNumber") || "";
    const customer = searchParams.get("customer") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const filter: any = {};

    if (invoiceNumber) {
      filter.invoiceNumber = { $regex: invoiceNumber.trim(), $options: "i" };
    }
    if (customer) {
      filter.$or = [
        { "customer.name": { $regex: customer.trim(), $options: "i" } },
        { "customer.mobile": { $regex: customer.trim(), $options: "i" } },
      ];
    }
    if (paymentStatus && paymentStatus !== "ALL") {
      filter.paymentStatus = paymentStatus;
    }
    if (paymentMethod && paymentMethod !== "ALL") {
      filter.paymentMethod = paymentMethod;
    }
    if (status && status !== "ALL") {
      filter.status = status;
    }
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.invoiceDate.$lte = end;
      }
    }

    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      InvoiceModel.find(filter).sort({ invoiceDate: -1 }).skip(skip).limit(limit),
      InvoiceModel.countDocuments(filter),
    ]);

    return sendSuccess(invoices, 200, {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    return sendError("INVOICE_FETCH_FAILED", error.message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const invoice = await createInvoice(body);
    return sendSuccess(invoice, 201);
  } catch (error: any) {
    return sendError("INVOICE_CREATION_FAILED", error.message, null, 400);
  }
}
