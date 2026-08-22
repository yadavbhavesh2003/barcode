import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, InvoiceModel, SystemSettingModel } from "@/lib/db/mongodb";
import { WhatsAppService, WhatsAppInvoiceData } from "@/lib/services/whatsapp.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const phoneOverride = body.phone?.trim();
    const sendViaCloudApi = Boolean(body.sendViaCloudApi);

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

    // Load store settings merged with .env
    const settingRows = await SystemSettingModel.find().lean();
    const dbSettings: Record<string, string> = {};
    for (const r of settingRows) {
      dbSettings[r.key] = r.value;
    }

    const config = WhatsAppService.getResolvedConfig(dbSettings);
    const defaultCountryCode = config.defaultCountryCode;
    const targetPhone = phoneOverride || invoice.customerPhone || invoice.customer?.mobile || "";
    const normalizedPhone = WhatsAppService.normalizePhoneNumber(targetPhone, defaultCountryCode);

    // Determine base URL for PDF download link
    const origin =
      config.appUrl ||
      req.headers.get("origin") ||
      (req.headers.get("host") ? `http://${req.headers.get("host")}` : "") ||
      config.storeWebsite ||
      "";

    const whatsappData: WhatsAppInvoiceData = {
      invoiceId: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName || invoice.customer?.name || "Walk-in Customer",
      customerPhone: invoice.customerPhone || invoice.customer?.mobile || "",
      createdAt: invoice.createdAt || invoice.invoiceDate || new Date(),
      paymentMode: invoice.paymentMode || (invoice.payments && invoice.payments[0]?.method) || "Cash",
      items: (invoice.items as any) || [],
      subtotal: invoice.subtotal || invoice.grandTotal,
      discount: invoice.discount || invoice.totalDiscount || 0,
      otherCharges: invoice.otherCharges || 0,
      grandTotal: invoice.grandTotal,
      pdfFormat: invoice.pdfFormat || "a4",
    };

    const messageText = WhatsAppService.formatWhatsAppReceiptText(whatsappData, dbSettings, origin);
    const deepLinkUrl = WhatsAppService.getWhatsAppDeepLink(normalizedPhone, messageText, defaultCountryCode);

    let cloudApiResult: { sent: boolean; messageId?: string; error?: string } = {
      sent: false,
    };

    // If Meta Cloud API is configured AND (sendViaCloudApi is true OR settings mode is cloud_api/both)
    const hasMetaConfig = config.hasMetaCredentials;

    const shouldAttemptCloudApi =
      hasMetaConfig &&
      (sendViaCloudApi || dbSettings.whatsapp_mode === "cloud_api" || dbSettings.whatsapp_mode === "both");

    if (shouldAttemptCloudApi && normalizedPhone) {
      const pdfUrl = `${origin.replace(/\/$/, "")}/api/bills/${invoice._id}/pdf?format=${
        (invoice as any).pdfFormat || "a4"
      }`;

      if (config.templateName) {
        // Method 1: Send Approved Template
        const templateRes = await WhatsAppService.sendMetaWhatsAppTemplate({
          accessToken: config.accessToken,
          phoneNumberId: config.phoneNumberId,
          recipientPhone: normalizedPhone,
          templateName: config.templateName,
          languageCode: config.templateLang || "en",
          bodyParameters: [
            invoice.customerName || "Customer",
            invoice.invoiceNumber,
            String(invoice.grandTotal),
            pdfUrl,
          ],
          headerPdfUrl: pdfUrl,
        });

        if (templateRes.success) {
          cloudApiResult = { sent: true, messageId: templateRes.messageId };
        } else {
          cloudApiResult = { sent: false, error: templateRes.error };
        }
      } else {
        // Fallback: Send plain formatted message via Meta Graph API
        const textRes = await WhatsAppService.sendMetaWhatsAppTextMessage({
          accessToken: config.accessToken,
          phoneNumberId: config.phoneNumberId,
          recipientPhone: normalizedPhone,
          text: messageText,
        });

        if (textRes.success) {
          cloudApiResult = { sent: true, messageId: textRes.messageId };
        } else {
          cloudApiResult = { sent: false, error: textRes.error };
        }
      }
    }

    return NextResponse.json({
      success: true,
      phone: normalizedPhone,
      deepLinkUrl,
      messageText,
      cloudApiResult,
      invoiceNumber: invoice.invoiceNumber,
      hasMetaConfig: Boolean(hasMetaConfig),
    });
  } catch (error: any) {
    console.error("WhatsApp delivery error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process WhatsApp request." },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const phoneOverride = searchParams.get("phone")?.trim();

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

    const settingRows = await SystemSettingModel.find().lean();
    const settings: Record<string, string> = {};
    for (const r of settingRows) {
      settings[r.key] = r.value;
    }

    const defaultCountryCode = settings.whatsapp_default_country_code || "91";
    const targetPhone = phoneOverride || invoice.customerPhone || invoice.customer?.mobile || "";
    const normalizedPhone = WhatsAppService.normalizePhoneNumber(targetPhone, defaultCountryCode);

    const origin =
      req.headers.get("origin") ||
      (req.headers.get("host") ? `http://${req.headers.get("host")}` : "") ||
      settings.website ||
      "";

    const whatsappData: WhatsAppInvoiceData = {
      invoiceId: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName || invoice.customer?.name || "Walk-in Customer",
      customerPhone: invoice.customerPhone || invoice.customer?.mobile || "",
      createdAt: invoice.createdAt || invoice.invoiceDate || new Date(),
      paymentMode: invoice.paymentMode || (invoice.payments && invoice.payments[0]?.method) || "Cash",
      items: (invoice.items as any) || [],
      subtotal: invoice.subtotal || invoice.grandTotal,
      discount: invoice.discount || invoice.totalDiscount || 0,
      otherCharges: invoice.otherCharges || 0,
      grandTotal: invoice.grandTotal,
      pdfFormat: invoice.pdfFormat || "a4",
    };

    const messageText = WhatsAppService.formatWhatsAppReceiptText(whatsappData, settings, origin);
    const deepLinkUrl = WhatsAppService.getWhatsAppDeepLink(normalizedPhone, messageText, defaultCountryCode);

    return NextResponse.json({
      success: true,
      phone: normalizedPhone,
      deepLinkUrl,
      messageText,
      hasMetaConfig: Boolean(settings.whatsapp_access_token && settings.whatsapp_phone_number_id),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate WhatsApp details." },
      { status: 500 }
    );
  }
}
