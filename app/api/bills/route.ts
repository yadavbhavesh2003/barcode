import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, InvoiceModel, ProductModel, BarcodeModel, SystemSettingModel } from "@/lib/db/mongodb";
import { InvoicePDFService, InvoiceData } from "@/lib/services/invoice-pdf.service";
import { WhatsAppService, WhatsAppInvoiceData } from "@/lib/services/whatsapp.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName = "Walk-in Customer",
      customerPhone = "",
      items = [],
      discount = 0,
      otherCharges = 0,
      paymentMode = "Cash",
      pdfFormat = "a4", // "a4" | "thermal"
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cannot generate bill: cart has no items." },
        { status: 400 }
      );
    }

    const trimmedName = String(customerName || "").trim();
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: "Customer name is mandatory to generate a bill." },
        { status: 400 }
      );
    }

    const trimmedPhone = String(customerPhone || "").trim();
    if (!trimmedPhone || !WhatsAppService.isValidPhoneNumber(trimmedPhone)) {
      return NextResponse.json(
        { success: false, error: "Customer 10-digit mobile number is mandatory to generate a bill." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. Calculate invoice totals (No GST logic)
    let subtotal = 0;
    let totalQuantity = 0;

    const formattedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const salesPrice = Number(item.salesPrice) || 0;
      const mrp = Number(item.mrp) || salesPrice;
      const lineTotal = salesPrice * qty;

      subtotal += lineTotal;
      totalQuantity += qty;

      return {
        productId: item.productId,
        barcode: String(item.barcode),
        productName: String(item.productName),
        hsn: String(item.hsn || "9503"),
        mrp,
        salesPrice,
        quantity: qty,
        totalAmount: lineTotal,
      };
    });

    const disc = Number(discount || 0);
    const other = Number(otherCharges || 0);
    const grandTotal = Math.max(0, subtotal - disc + other);

    // 2. Generate unique Estimate / Invoice Number (e.g. EST-20260821-0001)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const todayRegex = new RegExp(`^(EST|INV)-${todayStr}-`);
    const countToday = await InvoiceModel.countDocuments({ invoiceNumber: todayRegex });
    const invoiceSeq = String(countToday + 1).padStart(4, "0");
    const invoiceNumber = `EST-${todayStr}-${invoiceSeq}`;

    // 3. Save Invoice/Estimate to MongoDB
    const invoiceDoc = await InvoiceModel.create({
      invoiceNumber,
      customerName,
      customerPhone,
      items: formattedItems,
      totalItems: formattedItems.length,
      totalQuantity,
      subtotal,
      discount: disc,
      otherCharges: other,
      grandTotal,
      paymentMode,
      pdfFormat,
      status: "paid",
    });

    // 4. Fetch store settings
    // Load store settings merged with .env
    const settingRows = await SystemSettingModel.find().lean();
    const dbSettings: Record<string, string> = {};
    for (const r of settingRows) {
      dbSettings[r.key] = r.value;
    }

    const config = WhatsAppService.getResolvedConfig(dbSettings);

    const invoiceData: InvoiceData = {
      invoiceNumber,
      customerName,
      customerPhone,
      paymentMode,
      createdAt: invoiceDoc.createdAt,
      items: formattedItems,
      subtotal,
      discount: disc,
      otherCharges: other,
      grandTotal,
      storeWebsite: config.storeWebsite,
      storeName: config.storeName,
    };

    // 5. Generate PDF
    let pdfBytes: Uint8Array;
    if (pdfFormat === "thermal") {
      pdfBytes = InvoicePDFService.generateThermalReceipt(invoiceData);
    } else {
      pdfBytes = InvoicePDFService.generateA4Invoice(invoiceData);
    }

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // 6. Generate WhatsApp message & deep link
    const origin =
      config.appUrl ||
      req.headers.get("origin") ||
      (req.headers.get("host") ? `http://${req.headers.get("host")}` : "") ||
      config.storeWebsite ||
      "";

    const defaultCountryCode = config.defaultCountryCode;
    const normalizedPhone = WhatsAppService.normalizePhoneNumber(customerPhone, defaultCountryCode);

    const whatsappData: WhatsAppInvoiceData = {
      invoiceId: String(invoiceDoc._id),
      invoiceNumber,
      customerName,
      customerPhone,
      createdAt: invoiceDoc.createdAt,
      paymentMode,
      items: formattedItems,
      subtotal,
      discount: disc,
      otherCharges: other,
      grandTotal,
      pdfFormat,
    };

    const whatsappMessage = WhatsAppService.formatWhatsAppReceiptText(whatsappData, dbSettings, origin);
    const whatsappDeepLink = WhatsAppService.getWhatsAppDeepLink(normalizedPhone, whatsappMessage, defaultCountryCode);

    return NextResponse.json({
      success: true,
      invoiceId: String(invoiceDoc._id),
      invoiceNumber,
      customerName,
      customerPhone,
      normalizedPhone,
      totalItems: formattedItems.length,
      totalQuantity,
      grandTotal,
      pdfBase64,
      whatsappDeepLink,
      whatsappMessage,
      cloudApiSent: false,
      hasMetaConfig: config.hasMetaCredentials,
    });
  } catch (error: any) {
    console.error("Bill generation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate bill." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const limit = Number(searchParams.get("limit") || 20);

    await connectToDatabase();

    const query: any = {};
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
      ];
    }

    const invoices = await InvoiceModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const totalCount = await InvoiceModel.countDocuments();
    const totalRevenueResult = await InvoiceModel.aggregate([
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      invoices,
      totalCount,
      totalRevenue,
    });
  } catch (error: any) {
    console.error("Failed to list invoices:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list invoices." },
      { status: 500 }
    );
  }
}
