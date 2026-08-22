import { NextRequest } from "next/server";
import { connectToDatabase, InvoiceModel } from "@/lib/db/mongodb";
import { cancelInvoice } from "@/lib/services/invoice.service";
import { sendSuccess, sendError } from "@/lib/utils/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const { CustomerModel } = await import("@/lib/db/mongodb");
    const invoice = await InvoiceModel.findById(id).lean();
    if (!invoice) {
      return sendError("INVOICE_NOT_FOUND", "Invoice not found", null, 404);
    }

    // Auto-enrich customer details from Customer Master if available
    const customerObj: any = invoice.customer || {};
    if (customerObj.mobile || customerObj.customerId) {
      let registeredCust: any = null;
      if (customerObj.customerId) {
        registeredCust = await CustomerModel.findById(customerObj.customerId).lean();
      }
      if (!registeredCust && customerObj.mobile) {
        registeredCust = await CustomerModel.findOne({ mobile: customerObj.mobile.trim() }).lean();
      }
      if (registeredCust && registeredCust.name && !registeredCust.name.toLowerCase().includes("walk-in")) {
        customerObj.name = registeredCust.name;
        if (registeredCust.mobile) customerObj.mobile = registeredCust.mobile;
        if (registeredCust.email) customerObj.email = registeredCust.email;
        if (registeredCust.address) customerObj.address = registeredCust.address;
        if (registeredCust.gstin) customerObj.gstin = registeredCust.gstin;
      }
      (invoice as any).customer = customerObj;
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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reviseInvoice } = await import("@/lib/services/invoice.service");

    const revised = await reviseInvoice({
      invoiceId: id,
      items: body.items,
      customer: body.customer,
      discount: body.discount,
      otherCharges: body.otherCharges,
      paymentMethod: body.paymentMethod || "CASH",
      paymentMode: body.paymentMode || "Cash",
      reason: body.reason || "POS Bill Revision",
      revisedBy: body.revisedBy || "Cashier",
    });

    return sendSuccess(revised, 200, { message: "Bill revised successfully" });
  } catch (error: any) {
    return sendError("INVOICE_REVISION_FAILED", error.message, null, 400);
  }
}
