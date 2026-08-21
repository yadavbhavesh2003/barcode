import { NextRequest } from "next/server";
import { connectToDatabase, InvoiceModel } from "@/lib/db/mongodb";
import { cancelInvoice } from "@/lib/services/invoice.service";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const invoice = await InvoiceModel.findById(id);
    if (!invoice) {
      return sendError("INVOICE_NOT_FOUND", "Invoice not found", null, 404);
    }
    return sendSuccess(invoice);
  } catch (error: any) {
    return sendError("INVOICE_FETCH_FAILED", error.message, null, 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, reason, restoreStock } = body;

    if (action === "cancel" || action === "void") {
      const invoice = await cancelInvoice({
        invoiceId: id,
        reason: reason || "User cancelled invoice",
        restoreStock: restoreStock !== false,
        cancelledBy: body.cancelledBy || "Admin",
      });
      return sendSuccess(invoice);
    }

    return sendError("INVALID_ACTION", "Action must be 'cancel' or 'void'", null, 400);
  } catch (error: any) {
    return sendError("INVOICE_ACTION_FAILED", error.message, null, 400);
  }
}
