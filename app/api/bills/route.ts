import { NextRequest, NextResponse } from "next/server";
import {
  connectToDatabase,
  InvoiceModel,
  ProductModel,
  BarcodeModel,
  SystemSettingModel,
  CustomerModel,
  InventoryTransactionModel,
  NotificationModel,
} from "@/lib/db/mongodb";
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
        { success: false, error: "Cart is empty. Add at least one item to generate a bill." },
        { status: 400 }
      );
    }

    if (!customerName || customerName.trim() === "" || customerName.trim().toLowerCase() === "walk-in customer") {
      return NextResponse.json(
        { success: false, error: "Customer Name is required." },
        { status: 400 }
      );
    }

    if (!customerPhone || !WhatsAppService.isValidPhoneNumber(customerPhone)) {
      return NextResponse.json(
        { success: false, error: "A valid 10-digit Customer Mobile Number is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. Calculate line totals & subtotal
    let subtotal = 0;
    let totalQuantity = 0;
    let totalTaxableAmount = 0;
    let totalCgstAmount = 0;
    let totalSgstAmount = 0;
    let totalGstAmount = 0;

    const formattedItems = items.map((item: any) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const salesPrice = Number(item.salesPrice ?? item.unitPrice ?? 0);
      const mrp = Number(item.mrp ?? salesPrice);
      const lineTotal = salesPrice * qty;
      const gstRate = Number(item.gstRate ?? 5);

      // Tax inclusive calculation
      const gstFactor = 1 + gstRate / 100;
      const taxableAmount = Math.round((lineTotal / gstFactor) * 100) / 100;
      const totalGst = Math.round((lineTotal - taxableAmount) * 100) / 100;
      const cgstAmount = Math.round((totalGst / 2) * 100) / 100;
      const sgstAmount = Math.round((totalGst - cgstAmount) * 100) / 100;

      subtotal += lineTotal;
      totalQuantity += qty;
      totalTaxableAmount += taxableAmount;
      totalCgstAmount += cgstAmount;
      totalSgstAmount += sgstAmount;
      totalGstAmount += totalGst;

      return {
        productId: item.productId,
        barcodeNumber: String(item.barcodeNumber || item.barcode || "N/A"),
        barcode: String(item.barcode || item.barcodeNumber || "N/A"),
        productName: String(item.productName || "Product"),
        hsnSac: String(item.hsnSac || item.hsn || "9503"),
        hsn: String(item.hsn || item.hsnSac || "9503"),
        mrp,
        unitPrice: salesPrice,
        salesPrice,
        quantity: qty,
        discountPct: Number(item.discountPct || 0),
        discountAmount: Number(item.discountAmount || 0),
        taxableAmount,
        gstRate,
        cgstAmount,
        sgstAmount,
        igstAmount: 0,
        totalGst,
        lineTotal,
        totalAmount: lineTotal,
        itemType: item.itemType || "PRODUCT",
      };
    });

    // 2. Validate stock availability for all items before invoice creation
    const resolvedProductsMap = new Map<string, any>();
    for (const it of formattedItems) {
      let prod = null;
      if (it.productId && it.productId.length === 24) {
        prod = await ProductModel.findById(it.productId);
      }
      if (!prod && it.barcode) {
        prod = await ProductModel.findOne({
          $or: [
            { barcodeNumber: it.barcode },
            { customBarcode: it.barcode },
            { itemNumber: it.barcode },
            { sku: it.barcode },
          ],
        });
      }
      if (!prod && it.productName) {
        prod = await ProductModel.findOne({ name: it.productName.trim() });
      }

      if (prod) {
        if (it.barcode) resolvedProductsMap.set(it.barcode, prod);
        if (it.productId) resolvedProductsMap.set(it.productId, prod);
        if (it.productName) resolvedProductsMap.set(it.productName, prod);

        const available = prod.currentStock || 0;
        if (it.quantity > available) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient stock for '${prod.name}'. Only ${available} unit(s) available in stock (cannot bill ${it.quantity} units).`,
            },
            { status: 400 }
          );
        }
      }
    }

    const disc = Number(discount || 0);
    const other = Number(otherCharges || 0);
    const grandTotal = Math.max(0, subtotal - disc + other);

    // 3. Generate unique Estimate / Invoice Number (e.g. EST-20260821-0001)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const todayRegex = new RegExp(`^(EST|INV)-${todayStr}-`);
    const countToday = await InvoiceModel.countDocuments({ invoiceNumber: todayRegex });
    const invoiceSeq = String(countToday + 1).padStart(4, "0");
    const invoiceNumber = `EST-${todayStr}-${invoiceSeq}`;

    // 4. Save Invoice/Estimate to MongoDB
    const invoiceDoc: any = await InvoiceModel.create({
      invoiceNumber,
      customerName,
      customerPhone,
      items: formattedItems,
      totalItems: formattedItems.length,
      itemsCount: formattedItems.length,
      totalQuantity,
      subtotal,
      discount: disc,
      totalDiscount: disc,
      otherCharges: other,
      taxableAmount: totalTaxableAmount,
      cgstAmount: totalCgstAmount,
      sgstAmount: totalSgstAmount,
      igstAmount: 0,
      totalGst: totalGstAmount,
      grandTotal,
      paidAmount: grandTotal,
      paymentMode,
      paymentMethod: paymentMode === "Cash" ? "CASH" : paymentMode === "Card" ? "CARD" : "UPI",
      pdfFormat,
      status: "ACTIVE",
    });

    // 5. Automatically decrease inventory stock & log inventory transactions
    for (const it of formattedItems) {
      try {
        const prod =
          resolvedProductsMap.get(it.barcode) ||
          resolvedProductsMap.get(it.productId) ||
          resolvedProductsMap.get(it.productName);

        if (prod) {
          const prevStock = Number(prod.currentStock || 0);
          const newStock = Math.max(0, prevStock - it.quantity);

          await ProductModel.updateOne(
            { _id: prod._id },
            {
              $inc: {
                currentStock: -it.quantity,
                availableStock: -it.quantity,
              },
            }
          );

          await InventoryTransactionModel.create({
            productId: prod._id,
            productName: prod.name || it.productName,
            itemNumber: prod.itemNumber || it.barcode,
            type: "SALE",
            quantity: -it.quantity,
            stockBefore: prevStock,
            stockAfter: newStock,
            referenceId: invoiceNumber,
            reason: `POS Sale: ${invoiceNumber} - Customer: ${customerName} (${customerPhone})`,
            createdBy: "POS Billing",
          });

          // Check low stock trigger
          if (newStock <= (prod.minStock || 5)) {
            await NotificationModel.create({
              title: `⚠️ Low Stock Warning: ${prod.name}`,
              message: `${prod.name} is down to ${newStock} units (Safety threshold: ${prod.minStock || 5}).`,
              type: "warning",
              category: "stock",
              isRead: false,
              link: "/inventory",
            });
          }
        }
      } catch (stockErr) {
        console.error("Stock deduction error for item:", it, stockErr);
      }
    }

    // 6. Live Sale Notification for Real-Time Toast & Bell Drawer
    try {
      const custPart = customerName ? `to ${customerName}` : "";
      await NotificationModel.create({
        title: `🎉 Sale Recorded: ${invoiceNumber}`,
        message: `₹${grandTotal.toLocaleString("en-IN")} received via ${paymentMode} ${custPart} (${formattedItems.length} items)`,
        type: "success",
        category: "sales",
        isRead: false,
        link: `/history`,
      });
    } catch {
      // Non-blocking
    }

    // 5. Update or create Customer CRM profile
    try {
      if (customerPhone) {
        await CustomerModel.updateOne(
          { mobile: customerPhone.trim() },
          {
            $set: {
              name: customerName.trim(),
              mobile: customerPhone.trim(),
            },
            $inc: {
              totalSpend: grandTotal,
              totalInvoices: 1,
            },
          },
          { upsert: true }
        );
      }
    } catch (crmErr) {
      // Non-blocking
    }

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
