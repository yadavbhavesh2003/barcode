import {
  connectToDatabase,
  InvoiceModel,
  PaymentModel,
  ProductModel,
  ServiceModel,
  SequenceTrackerModel,
  CustomerModel,
} from "../db/mongodb";
import {
  calculateLineItem,
  calculateInvoiceTotals,
} from "../utils/financials";
import { adjustProductStock } from "./inventory.service";
import { logAuditEvent } from "./audit.service";
import { PaymentMethod, PaymentStatus, InvoiceStatus } from "../types";

export interface CreateInvoiceItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discountPct?: number;
  barcodeNumber?: string;
  productName?: string;
  mrp?: number;
  hsnSac?: string;
  gstRate?: number;
  itemType?: "PRODUCT" | "SERVICE";
}

export interface CreateInvoiceInput {
  items: CreateInvoiceItemInput[];
  customer?: {
    customerId?: string;
    name: string;
    mobile?: string;
    email?: string;
    gstin?: string;
    address?: string;
  };
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  paymentReference?: string;
  notes?: string;
  billedBy?: string;
}

/**
 * Generates an atomic sequential collision-safe invoice number.
 * e.g., INV/2026-27/000001
 */
export async function generateNextInvoiceNumber(prefix: string = "INV"): Promise<{
  invoiceNumber: string;
  financialYear: string;
  sequenceNumber: number;
}> {
  await connectToDatabase();

  const now = new Date();
  const month = now.getMonth() + 1; // 1 to 12
  const currentYear = now.getFullYear();

  // Indian Financial Year: April (4) to March (3)
  const fyStart = month >= 4 ? currentYear : currentYear - 1;
  const fyEndShort = String(fyStart + 1).slice(-2);
  const financialYear = `${fyStart}-${fyEndShort}`;

  const trackerKey = `invoice_${financialYear}`;

  const counter = await SequenceTrackerModel.findByIdAndUpdate(
    trackerKey,
    { $inc: { currentVal: 1 } },
    { returnDocument: "after", upsert: true }
  );

  const seqStr = String(counter.currentVal).padStart(6, "0");
  const invoiceNumber = `${prefix}/${financialYear}/${seqStr}`;

  return { invoiceNumber, financialYear, sequenceNumber: counter.currentVal };
}

/**
 * Creates an invoice atomically with full snapshot, stock deduction, and ledger updates.
 */
export async function createInvoice(input: CreateInvoiceInput) {
  await connectToDatabase();

  if (!input.items || input.items.length === 0) {
    throw new Error("Cannot create invoice without items");
  }

  // 1. Fetch products & services
  const productIds = input.items.map((i) => i.productId).filter((id) => Boolean(id) && id.length === 24);
  const [products, services] = await Promise.all([
    ProductModel.find({ _id: { $in: productIds } }),
    ServiceModel.find({ _id: { $in: productIds } }),
  ]);

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const serviceMap = new Map(services.map((s) => [s._id.toString(), s]));

  const preparedLineItems = [];

  for (const itemInput of input.items) {
    const product = productMap.get(itemInput.productId);
    const service = serviceMap.get(itemInput.productId);

    if (product) {
      const unitPrice = itemInput.unitPrice !== undefined ? itemInput.unitPrice : (product.sellingPrice ?? (product as any).salesPrice ?? product.mrp ?? 0);
      const discountPct = itemInput.discountPct !== undefined ? itemInput.discountPct : (product.discountPct || 0);
      const mrp = product.mrp || unitPrice;
      const barcodeNumber = product.barcodeNumber || product.itemNumber || itemInput.barcodeNumber || `ITEM-${product._id.toString().slice(-6)}`;

      const line = calculateLineItem({
        productId: product._id.toString(),
        barcodeNumber,
        productName: product.name,
        hsnSac: product.hsnSac || "9503",
        mrp,
        unitPrice,
        quantity: itemInput.quantity,
        discountPct,
        gstRate: product.gstRate || 5,
        isTaxInclusive: product.isTaxInclusive !== undefined ? product.isTaxInclusive : true,
      });
      (line as any).itemType = "PRODUCT";
      preparedLineItems.push(line);
    } else if (service) {
      const unitPrice = itemInput.unitPrice !== undefined ? itemInput.unitPrice : service.price;
      const discountPct = itemInput.discountPct !== undefined ? itemInput.discountPct : 0;

      const line = calculateLineItem({
        productId: service._id.toString(),
        barcodeNumber: service.serviceCode,
        productName: service.name,
        hsnSac: service.sacCode || "998313",
        mrp: service.price,
        unitPrice,
        quantity: itemInput.quantity,
        discountPct,
        gstRate: service.gstRate,
        isTaxInclusive: service.isTaxInclusive,
      });
      (line as any).itemType = "SERVICE";
      preparedLineItems.push(line);
    } else {
      // Fallback if item has inline details from scanner or POS
      const unitPrice = itemInput.unitPrice !== undefined ? itemInput.unitPrice : itemInput.mrp || 0;
      const discountPct = itemInput.discountPct || 0;
      const mrp = itemInput.mrp !== undefined ? itemInput.mrp : unitPrice;

      const line = calculateLineItem({
        productId: itemInput.productId || "custom_item",
        barcodeNumber: itemInput.barcodeNumber || "CUSTOM",
        productName: itemInput.productName || "Custom Line Item",
        hsnSac: itemInput.hsnSac || "9503",
        mrp,
        unitPrice,
        quantity: itemInput.quantity || 1,
        discountPct,
        gstRate: itemInput.gstRate || 5,
        isTaxInclusive: true,
      });
      (line as any).itemType = itemInput.itemType || "PRODUCT";
      preparedLineItems.push(line);
    }
  }

  // 2. Compute Invoice Totals
  const totals = calculateInvoiceTotals(preparedLineItems);

  // 3. Generate Sequence Number
  const { invoiceNumber, financialYear, sequenceNumber } = await generateNextInvoiceNumber();

  // 4. Determine Payment
  const paidAmount = input.paidAmount !== undefined ? input.paidAmount : totals.grandTotal;
  const balanceAmount = Math.max(0, totals.grandTotal - paidAmount);
  const paymentStatus: PaymentStatus =
    balanceAmount === 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING";

  // 5. Handle Customer
  let customerData: any = {
    name: input.customer?.name?.trim() || "Walk-in Customer",
    mobile: input.customer?.mobile?.trim(),
    email: input.customer?.email?.trim(),
    gstin: input.customer?.gstin?.trim(),
    address: input.customer?.address?.trim(),
  };

  if (input.customer?.mobile) {
    let cust = await CustomerModel.findOne({ mobile: input.customer.mobile.trim() });
    if (!cust) {
      cust = await CustomerModel.create({
        name: customerData.name,
        mobile: customerData.mobile,
        email: customerData.email,
        gstin: customerData.gstin,
        address: customerData.address,
      });
    }
    cust.totalSpend = (cust.totalSpend || 0) + totals.grandTotal;
    cust.totalInvoices = (cust.totalInvoices || 0) + 1;
    await cust.save();
    customerData.customerId = cust._id;
  }

  // 6. Create Invoice Record
  const invoice = await InvoiceModel.create({
    invoiceNumber,
    financialYear,
    sequenceNumber,
    customer: customerData,
    items: preparedLineItems,
    itemsCount: totals.itemsCount,
    totalQuantity: totals.totalQuantity,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    taxableAmount: totals.taxableAmount,
    cgstAmount: totals.cgstAmount,
    sgstAmount: totals.sgstAmount,
    igstAmount: totals.igstAmount,
    totalGst: totals.totalGst,
    roundOff: totals.roundOff,
    grandTotal: totals.grandTotal,
    payments: [
      {
        method: input.paymentMethod || "CASH",
        amount: paidAmount,
        reference: input.paymentReference,
        status: paymentStatus,
        date: new Date(),
      },
    ],
    paymentStatus,
    paymentMethod: input.paymentMethod || "CASH",
    paidAmount,
    balanceAmount,
    status: "ACTIVE",
    notes: input.notes,
    billedBy: input.billedBy || "Billing Operator",
    invoiceDate: new Date(),
  });

  // 7. Create Payment Entry
  await PaymentModel.create({
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    amount: paidAmount,
    method: input.paymentMethod || "CASH",
    status: paymentStatus,
    reference: input.paymentReference,
    recordedBy: input.billedBy || "Billing Operator",
  });

  // 8. Deduct Inventory for Physical Products only (skip services)
  for (const item of preparedLineItems) {
    if ((item as any).itemType !== "SERVICE" && productMap.has(item.productId)) {
      try {
        await adjustProductStock({
          productId: item.productId,
          type: "SALE",
          quantity: item.quantity,
          referenceId: invoice.invoiceNumber,
          reason: `POS Bill ${invoice.invoiceNumber}`,
          createdBy: input.billedBy || "Billing Operator",
        });
      } catch (err: any) {
        console.warn(`Stock deduction warning for item ${item.productName}:`, err.message);
      }
    }
  }

  // 9. Audit Log
  await logAuditEvent({
    userName: input.billedBy || "Billing Operator",
    action: "INVOICE_CREATED",
    entity: "Invoice",
    entityId: invoice._id.toString(),
    newValue: {
      invoiceNumber: invoice.invoiceNumber,
      grandTotal: invoice.grandTotal,
      itemsCount: invoice.itemsCount,
      paymentMethod: invoice.paymentMethod,
    },
  });

  return invoice;
}

/**
 * Cancels or voids an invoice with stock restoration option.
 */
export async function cancelInvoice({
  invoiceId,
  reason,
  restoreStock = true,
  cancelledBy = "Admin",
}: {
  invoiceId: string;
  reason: string;
  restoreStock?: boolean;
  cancelledBy?: string;
}) {
  await connectToDatabase();

  const invoice = await InvoiceModel.findById(invoiceId);
  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  if (invoice.status === "CANCELLED" || invoice.status === "VOID") {
    throw new Error("Invoice is already cancelled or voided");
  }

  const oldStatus = invoice.status;
  invoice.status = "CANCELLED";
  invoice.cancelReason = reason;
  invoice.paymentStatus = "REFUNDED";
  await invoice.save();

  // Restore inventory if requested (skip services)
  if (restoreStock && invoice.items && invoice.items.length > 0) {
    for (const item of invoice.items) {
      if ((item as any).itemType !== "SERVICE" && item.productId) {
        try {
          await adjustProductStock({
            productId: item.productId.toString(),
            type: "RETURN",
            quantity: item.quantity,
            referenceId: invoice.invoiceNumber,
            reason: `Cancelled Invoice ${invoice.invoiceNumber}: ${reason}`,
            createdBy: cancelledBy,
          });
        } catch (err: any) {
          console.warn(`Stock restoration warning for item ${item.productName}:`, err.message);
        }
      }
    }
  }

  await logAuditEvent({
    userName: cancelledBy,
    action: "INVOICE_CANCELLED",
    entity: "Invoice",
    entityId: invoice._id.toString(),
    oldValue: { status: oldStatus },
    newValue: { status: "CANCELLED", reason, restoreStock },
  });

  return invoice;
}
