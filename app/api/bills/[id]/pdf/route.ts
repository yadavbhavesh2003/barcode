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

    const invoice = await InvoiceModel.findById(id).lean();
    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found." },
        { status: 404 }
      );
    }

    const effectiveFormat = searchParams.get("format") || (invoice as any).pdfFormat || "a4";

    const settingRows = await SystemSettingModel.find().lean();
    const settings: Record<string, string> = {};
    for (const r of settingRows) {
      settings[r.key] = r.value;
    }

    const invoiceData: InvoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      paymentMode: invoice.paymentMode,
      createdAt: invoice.createdAt,
      items: invoice.items as any,
      subtotal: invoice.subtotal,
      totalGst: invoice.totalGst,
      discount: invoice.discount,
      grandTotal: invoice.grandTotal,
      storeWebsite: settings.website || "https://runrkids.in/",
      storeName: "RUNR KIDS",
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
