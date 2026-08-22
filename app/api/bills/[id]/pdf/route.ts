import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, InvoiceModel, SystemSettingModel } from "@/lib/db/mongodb";
import { InvoicePDFService, InvoiceData } from "@/lib/services/invoice-pdf.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "a4"; // "a4" | "thermal"

    await connectToDatabase();

    const invoice: any =
      (await InvoiceModel.findById(id).lean().catch(() => null)) ||
      (await InvoiceModel.findOne({ invoiceNumber: id }).lean());

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found." },
        { status: 404 }
      );
    }

    const effectiveFormat = searchParams.get("format") || invoice.pdfFormat || "a4";

    const settingRows = await SystemSettingModel.find().lean();
    const settings: Record<string, string> = {};
    for (const r of settingRows) {
      settings[r.key] = r.value;
    }

    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName || invoice.customer?.name || "Walk-in Customer",
      customerPhone: invoice.customerPhone || invoice.customer?.mobile || "",
      paymentMode: invoice.paymentMode || (invoice.payments && invoice.payments[0]?.method) || "Cash",
      createdAt: invoice.createdAt || invoice.invoiceDate || new Date(),
      items: invoice.items as any,
      subtotal: invoice.subtotal || invoice.grandTotal,
      discount: invoice.discount || invoice.totalDiscount || 0,
      otherCharges: invoice.otherCharges || 0,
      grandTotal: invoice.grandTotal,
      storeWebsite: settings.website || "https://runrkids.in/",
      storeName: settings.store_name || "RUNR KIDS",
    };

    let pdfBytes: Uint8Array;
    if (effectiveFormat === "thermal") {
      pdfBytes = InvoicePDFService.generateThermalReceipt(invoiceData);
    } else {
      pdfBytes = InvoicePDFService.generateA4Invoice(invoiceData);
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Invoice PDF download failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate invoice PDF." },
      { status: 500 }
    );
  }
}
