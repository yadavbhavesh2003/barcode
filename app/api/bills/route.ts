import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, InvoiceModel, ProductModel, BarcodeModel, SystemSettingModel } from "@/lib/db/mongodb";
import { InvoicePDFService, InvoiceData } from "@/lib/services/invoice-pdf.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName = "Walk-in Customer",
      customerPhone = "",
      items = [],
      discount = 0,
      paymentMode = "Cash",
      pdfFormat = "a4", // "a4" | "thermal"
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cannot generate bill: cart has no items." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. Calculate invoice totals
    let totalSales = 0;
    let totalTaxable = 0;
    let totalGst = 0;
    let totalQuantity = 0;

    const formattedItems = items.map((item: any) => {
      const qty = Number(item.quantity) || 1;
      const salesPrice = Number(item.salesPrice) || 0;
      const mrp = Number(item.mrp) || salesPrice;
      const lineTotal = salesPrice * qty;

      // Extract GST percent e.g. "5.00%" or 0.05 -> 5%
      let rawGst = String(item.gstRate || "5").replace("%", "").trim();
      let gstPct = parseFloat(rawGst) || 5;
      if (gstPct < 1 && gstPct > 0) gstPct = gstPct * 100;

      const lineTaxable = lineTotal / (1 + gstPct / 100);
      const lineGst = lineTotal - lineTaxable;

      totalSales += lineTotal;
      totalTaxable += lineTaxable;
      totalGst += lineGst;
      totalQuantity += qty;

      const cleanGstRate = gstPct % 1 === 0 ? `${gstPct}%` : `${gstPct.toFixed(2)}%`;

      return {
        productId: item.productId,
        barcode: String(item.barcode),
        productName: String(item.productName),
        hsn: String(item.hsn || "9503"),
        mrp,
        salesPrice,
        quantity: qty,
        gstRate: cleanGstRate,
        gstAmount: Math.round(lineGst * 100) / 100,
        totalAmount: lineTotal,
      };
    });

    const disc = Number(discount || 0);
    const grandTotal = Math.max(0, totalSales - disc);
    const subtotal = Math.round(totalTaxable * 100) / 100;

    // 2. Generate unique Invoice Number (e.g. INV-20260821-0001)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const todayRegex = new RegExp(`^INV-${todayStr}-`);
    const countToday = await InvoiceModel.countDocuments({ invoiceNumber: todayRegex });
    const invoiceSeq = String(countToday + 1).padStart(4, "0");
    const invoiceNumber = `INV-${todayStr}-${invoiceSeq}`;

    // 3. Save Invoice to MongoDB
    const invoiceDoc = await InvoiceModel.create({
      invoiceNumber,
      customerName,
      customerPhone,
      items: formattedItems,
      totalItems: formattedItems.length,
      totalQuantity,
      subtotal,
      totalGst,
      discount: Number(discount || 0),
      grandTotal,
      paymentMode,
      status: "paid",
    });

    // 4. Fetch store settings
    const settingRows = await SystemSettingModel.find().lean();
    const settings: Record<string, string> = {};
    for (const r of settingRows) {
      settings[r.key] = r.value;
    }

    const invoiceData: InvoiceData = {
      invoiceNumber,
      customerName,
      customerPhone,
      paymentMode,
      createdAt: invoiceDoc.createdAt,
      items: formattedItems,
      subtotal,
      totalGst,
      discount: Number(discount || 0),
      grandTotal,
      storeWebsite: settings.website || "https://runrkids.in/",
      storeName: "RUNR KIDS",
    };

    // 5. Generate PDF
    let pdfBytes: Uint8Array;
    if (pdfFormat === "thermal") {
      pdfBytes = InvoicePDFService.generateThermalReceipt(invoiceData);
    } else {
      pdfBytes = InvoicePDFService.generateA4Invoice(invoiceData);
    }

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    return NextResponse.json({
      success: true,
      invoiceId: String(invoiceDoc._id),
      invoiceNumber,
      totalItems: formattedItems.length,
      totalQuantity,
      grandTotal,
      pdfBase64,
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
