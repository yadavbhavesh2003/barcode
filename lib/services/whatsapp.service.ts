/**
 * WhatsApp Utility Service
 * Supports:
 * 1. Method 3: 1-Click WhatsApp Direct Share (wa.me deep linking with formatted receipt & PDF link)
 * 2. Method 1: Official Meta WhatsApp Business Cloud API automated template/text messaging
 */

export interface WhatsAppInvoiceData {
  invoiceId?: string;
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: Date | string;
  paymentMode?: string;
  items: Array<{
    productName: string;
    barcode?: string;
    salesPrice: number;
    quantity: number;
    totalAmount: number;
  }>;
  subtotal: number;
  discount?: number;
  otherCharges?: number;
  grandTotal: number;
  pdfFormat?: string;
}

export class WhatsAppService {
  /**
   * Validates if a phone number is a valid 10-digit Indian mobile number (or 0 / 91 prefixed)
   */
  static isValidPhoneNumber(rawPhone: string): boolean {
    if (!rawPhone) return false;
    const digitsOnly = rawPhone.replace(/\D/g, "");
    
    // Standard 10-digit Indian mobile (starts with 6, 7, 8, 9)
    if (digitsOnly.length === 10) {
      return /^[6-9]\d{9}$/.test(digitsOnly);
    }
    // 11 digits starting with 0 (e.g. 09876543210)
    if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
      return /^[6-9]\d{9}$/.test(digitsOnly.slice(1));
    }
    // 12 digits with 91 country code (e.g. 919876543210)
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      return /^[6-9]\d{9}$/.test(digitsOnly.slice(2));
    }
    return false;
  }

  /**
   * Resolves WhatsApp configuration merging process.env variables and DB settings
   */
  static getResolvedConfig(dbSettings: Record<string, string> = {}) {
    const phoneNumberId =
      process.env.WHATSAPP_PHONE_NUMBER_ID || dbSettings.whatsapp_phone_number_id || "";
    const accessToken =
      process.env.WHATSAPP_ACCESS_TOKEN || dbSettings.whatsapp_access_token || "";
    const businessAccountId =
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || dbSettings.whatsapp_business_account_id || "";
    const templateName =
      process.env.WHATSAPP_TEMPLATE_NAME || dbSettings.whatsapp_template_name || "bill_receipt";
    const templateLang =
      process.env.WHATSAPP_TEMPLATE_LANGUAGE || dbSettings.whatsapp_template_lang || "en";
    const defaultCountryCode =
      process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || dbSettings.whatsapp_default_country_code || "91";
    const storeName =
      process.env.STORE_NAME || dbSettings.store_name || "RUNR KIDS";
    const storeWebsite =
      process.env.STORE_WEBSITE || dbSettings.website || "https://runrkids.in/";
    const storePhone =
      process.env.STORE_PHONE || dbSettings.contact_phone || "+91 9737998216";
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || dbSettings.website || "";

    return {
      phoneNumberId,
      accessToken,
      businessAccountId,
      templateName,
      templateLang,
      defaultCountryCode,
      storeName,
      storeWebsite,
      storePhone,
      appUrl,
      hasMetaCredentials: Boolean(phoneNumberId && accessToken),
    };
  }

  /**
   * Cleans and normalizes phone numbers (e.g. +91 98765 43210 -> 919876543210)
   */
  static normalizePhoneNumber(rawPhone: string, defaultCountryCode = "91"): string {
    if (!rawPhone) return "";
    // Remove all non-digits
    let cleaned = rawPhone.replace(/\D/g, "");
    if (!cleaned) return "";

    // If Indian 10-digit number without country code, prepend defaultCountryCode
    if (cleaned.length === 10) {
      cleaned = defaultCountryCode.replace(/\D/g, "") + cleaned;
    }
    // If starts with 0 and followed by 10 digits (e.g. 09876543210)
    if (cleaned.length === 11 && cleaned.startsWith("0")) {
      cleaned = defaultCountryCode.replace(/\D/g, "") + cleaned.slice(1);
    }

    return cleaned;
  }

  /**
   * Formats a rich, beautiful text receipt suitable for WhatsApp sharing
   */
  static formatWhatsAppReceiptText(
    invoice: WhatsAppInvoiceData,
    settings: Record<string, string> = {},
    baseUrl = ""
  ): string {
    const storeName = settings.store_name || "RUNR KIDS";
    const storeWebsite = settings.website || "https://runrkids.in/";
    const greeting =
      settings.whatsapp_custom_greeting || `Thank you for shopping at *${storeName}*!`;
    const footer =
      settings.whatsapp_custom_footer ||
      `🧸 *${storeName}* — Visit us again at ${storeWebsite}`;

    const dateStr = new Date(invoice.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const formatInr = (num: number) =>
      `₹${Number(num || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    let lines: string[] = [];

    lines.push(`🛍️ *${storeName.toUpperCase()} - ESTIMATE / BILL*`);
    lines.push(`────────────────────────`);
    lines.push(`🧾 *Estimate No:* ${invoice.invoiceNumber}`);
    lines.push(`📅 *Date:* ${dateStr}`);
    if (invoice.customerName && invoice.customerName !== "Walk-in Customer") {
      lines.push(`👤 *Customer:* ${invoice.customerName}`);
    }
    lines.push(`💳 *Payment Mode:* ${invoice.paymentMode || "Cash"}`);
    lines.push(`────────────────────────`);
    lines.push(`📦 *ITEMS PURCHASED:*`);

    (invoice.items || []).forEach((item, index) => {
      lines.push(
        `${index + 1}. *${item.productName}*\n    ${item.quantity} x ${formatInr(
          item.salesPrice
        )} = *${formatInr(item.totalAmount)}*`
      );
    });

    lines.push(`────────────────────────`);
    lines.push(`Subtotal: ${formatInr(invoice.subtotal)}`);
    if (invoice.discount && invoice.discount > 0) {
      lines.push(`Discount: -${formatInr(invoice.discount)}`);
    }
    if (invoice.otherCharges && invoice.otherCharges > 0) {
      lines.push(`Other Adjustments: +${formatInr(invoice.otherCharges)}`);
    }
    lines.push(`*💰 GRAND TOTAL: ${formatInr(invoice.grandTotal)}*`);
    lines.push(`────────────────────────`);

    // PDF Download URL if base URL or invoice ID is available
    if (invoice.invoiceId) {
      const pdfUrl = baseUrl
        ? `${baseUrl.replace(/\/$/, "")}/api/bills/${invoice.invoiceId}/pdf?format=${
            invoice.pdfFormat || "a4"
          }`
        : `/api/bills/${invoice.invoiceId}/pdf?format=${invoice.pdfFormat || "a4"}`;

      lines.push(`📄 *Download / View PDF Copy:*`);
      lines.push(`${pdfUrl}`);
      lines.push(`────────────────────────`);
    }

    lines.push(greeting);
    lines.push(footer);

    return lines.join("\n");
  }

  /**
   * Generates wa.me deep link URL for Method 3 (1-Click Share)
   */
  static getWhatsAppDeepLink(phone: string, message: string, defaultCountryCode = "91"): string {
    const normalizedPhone = this.normalizePhoneNumber(phone, defaultCountryCode);
    const encodedText = encodeURIComponent(message);

    if (normalizedPhone) {
      return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
    }
    // Fallback if no phone number provided (user selects contact inside WhatsApp)
    return `https://wa.me/?text=${encodedText}`;
  }

  /**
   * Method 1: Send WhatsApp Message using Official Meta WhatsApp Business Cloud API
   * Supports sending pre-approved templates with parameters (e.g. {{1}} = name, {{2}} = invoice, {{3}} = total, {{4}} = pdfUrl)
   */
  static async sendMetaWhatsAppTemplate({
    accessToken,
    phoneNumberId,
    recipientPhone,
    templateName,
    languageCode = "en_US",
    bodyParameters = [],
    headerPdfUrl,
  }: {
    accessToken: string;
    phoneNumberId: string;
    recipientPhone: string;
    templateName: string;
    languageCode?: string;
    bodyParameters?: string[];
    headerPdfUrl?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string; raw?: any }> {
    try {
      const cleanedPhone = this.normalizePhoneNumber(recipientPhone);
      if (!cleanedPhone) {
        return { success: false, error: "Recipient phone number is invalid." };
      }
      if (!accessToken || !phoneNumberId || !templateName) {
        return {
          success: false,
          error: "Meta WhatsApp Cloud API credentials missing (Access Token, Phone ID, or Template Name).",
        };
      }

      const components: any[] = [];

      // If template has a document/PDF header
      if (headerPdfUrl) {
        components.push({
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: headerPdfUrl,
                filename: "Invoice_Receipt.pdf",
              },
            },
          ],
        });
      }

      // Template body parameters ({{1}}, {{2}}, ...)
      if (bodyParameters.length > 0) {
        components.push({
          type: "body",
          parameters: bodyParameters.map((param) => ({
            type: "text",
            text: String(param),
          })),
        });
      }

      const payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanedPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components,
        },
      };

      const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errMsg = data.error?.message || "Failed to send Meta WhatsApp message.";
        return { success: false, error: errMsg, raw: data };
      }

      const messageId = data.messages?.[0]?.id;
      return { success: true, messageId, raw: data };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error contacting Meta API." };
    }
  }

  /**
   * Method 1 Alternative: Send freeform text message via Meta WhatsApp API (requires open 24h conversation window)
   */
  static async sendMetaWhatsAppTextMessage({
    accessToken,
    phoneNumberId,
    recipientPhone,
    text,
  }: {
    accessToken: string;
    phoneNumberId: string;
    recipientPhone: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string; raw?: any }> {
    try {
      const cleanedPhone = this.normalizePhoneNumber(recipientPhone);
      if (!cleanedPhone) {
        return { success: false, error: "Recipient phone number is invalid." };
      }

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanedPhone,
        type: "text",
        text: {
          preview_url: true,
          body: text,
        },
      };

      const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          success: false,
          error: data.error?.message || "Failed to send text message via Meta API.",
          raw: data,
        };
      }

      return { success: true, messageId: data.messages?.[0]?.id, raw: data };
    } catch (err: any) {
      return { success: false, error: err.message || "Error contacting Meta API." };
    }
  }
}
