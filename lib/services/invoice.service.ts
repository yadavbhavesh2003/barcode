import {
  connectToDatabase,
  InvoiceModel,
  PaymentModel,
  ProductModel,
  ServiceModel,
  SequenceTrackerModel,
  CustomerModel,
  NotificationModel,
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
      const availableStock = product.currentStock || 0;
      if (itemInput.quantity > availableStock) {
        throw new Error(
          `Insufficient stock for '${product.name}'. Only ${availableStock} unit(s) available in stock (cannot bill ${itemInput.quantity} units).`
        );
      }

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
        gstRate: itemInput.gstRate !== undefined ? Number(itemInput.gstRate) : Number(product.gstRate || 0),
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
        gstRate: itemInput.gstRate !== undefined ? Number(itemInput.gstRate) : Number(service.gstRate || 0),
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
        gstRate: itemInput.gstRate !== undefined ? Number(itemInput.gstRate) : 0,
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

  // 10. Live Sale Notification for Real-Time Header & Toasts
  try {
    const custName = invoice.customer?.name ? `to ${invoice.customer.name}` : "";
    const itemsSummary = preparedLineItems.slice(0, 2).map((i: any) => `${i.quantity}x ${i.productName}`).join(", ");
    const moreCount = preparedLineItems.length > 2 ? ` +${preparedLineItems.length - 2} more` : "";

    await NotificationModel.create({
      title: `🎉 Sale Recorded: ${invoice.invoiceNumber}`,
      message: `₹${invoice.grandTotal.toLocaleString("en-IN")} received via ${invoice.paymentMethod} ${custName} (${itemsSummary}${moreCount})`,
      type: "success",
      category: "sales",
      isRead: false,
      link: `/history`,
    });
  } catch (notifErr) {
    console.error("Failed to emit sale notification:", notifErr);
  }

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

export interface ReviseInvoiceInput {
  invoiceId: string;
  items: CreateInvoiceItemInput[];
  customer?: {
    customerId?: string;
    name: string;
    mobile?: string;
    email?: string;
    gstin?: string;
    address?: string;
  };
  discount?: number;
  otherCharges?: number;
  paymentMethod?: PaymentMethod;
  paymentMode?: string;
  reason?: string;
  revisedBy?: string;
}

/**
 * Revises an existing invoice with inventory delta reconciliation, audit snapshots, and ledger records.
 */
export async function reviseInvoice(input: ReviseInvoiceInput) {
  await connectToDatabase();

  const { invoiceId, items, customer, discount = 0, otherCharges = 0, paymentMethod, paymentMode, reason, revisedBy = "Cashier" } = input;

  const invoice = await InvoiceModel.findById(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  if (invoice.status === "CANCELLED" || invoice.status === "VOID") {
    throw new Error("Cannot revise a cancelled or voided invoice");
  }

  if (!items || items.length === 0) {
    throw new Error("Cannot revise bill to have 0 items. Cancel the bill instead.");
  }

  // 1. Map old product quantities
  const oldProductMap = new Map<string, { qty: number; name: string }>();
  for (const it of invoice.items || []) {
    if (it.productId && (it as any).itemType !== "SERVICE") {
      const pid = String(it.productId);
      const prev = oldProductMap.get(pid) || { qty: 0, name: it.productName };
      prev.qty += Number(it.quantity || 0);
      oldProductMap.set(pid, prev);
    }
  }

  // 2. Map new product quantities
  const newProductMap = new Map<string, { qty: number; name: string }>();
  for (const it of items) {
    if (it.productId && it.itemType !== "SERVICE") {
      const pid = String(it.productId);
      const prev = newProductMap.get(pid) || { qty: 0, name: it.productName || "Product" };
      prev.qty += Number(it.quantity || 0);
      newProductMap.set(pid, prev);
    }
  }

  // 3. Pre-check stock availability for any positive deltas (additions)
  const allProductIds = Array.from(new Set([...oldProductMap.keys(), ...newProductMap.keys()]));
  const dbProducts = await ProductModel.find({ _id: { $in: allProductIds } });
  const dbProductMap = new Map<string, any>(dbProducts.map((p) => [String(p._id), p]));

  const stockAdjustments: any[] = [];

  for (const pid of allProductIds) {
    const oldQty = oldProductMap.get(pid)?.qty || 0;
    const newQty = newProductMap.get(pid)?.qty || 0;
    const delta = newQty - oldQty; // positive = need more stock, negative = return stock

    const prod = dbProductMap.get(pid);
    const prodName = prod?.name || oldProductMap.get(pid)?.name || newProductMap.get(pid)?.name || "Item";

    if (delta > 0) {
      const available = Number(prod?.currentStock ?? prod?.openingStock ?? 0);
      if (available < delta) {
        throw new Error(
          `Insufficient stock for '${prodName}'. Revision requires +${delta} additional units, but only ${available} units available in inventory.`
        );
      }
    }

    stockAdjustments.push({
      productId: pid,
      productName: prodName,
      oldQuantity: oldQty,
      newQuantity: newQty,
      deltaQuantity: delta,
    });
  }

  // 4. Execute inventory adjustments
  const nextRevisionNumber = (invoice.revisionCount || 0) + 1;

  for (const adj of stockAdjustments) {
    if (adj.deltaQuantity > 0) {
      // Deduct additional stock
      await adjustProductStock({
        productId: adj.productId,
        type: "SALE",
        quantity: adj.deltaQuantity,
        referenceId: `${invoice.invoiceNumber} (Rev #${nextRevisionNumber})`,
        reason: `Bill Revision #${nextRevisionNumber} for ${invoice.invoiceNumber}: added +${adj.deltaQuantity} units of '${adj.productName}'`,
        createdBy: revisedBy,
      });
    } else if (adj.deltaQuantity < 0) {
      // Restore surplus stock back to inventory
      const restoreQty = Math.abs(adj.deltaQuantity);
      await adjustProductStock({
        productId: adj.productId,
        type: "RETURN",
        quantity: restoreQty,
        referenceId: `${invoice.invoiceNumber} (Rev #${nextRevisionNumber})`,
        reason: `Bill Revision #${nextRevisionNumber} for ${invoice.invoiceNumber}: returned ${restoreQty} units of '${adj.productName}'`,
        createdBy: revisedBy,
      });
    }
  }

  // 5. Calculate new line items and totals
  const preparedLineItems: any[] = [];

  for (const itemInput of items) {
    const prod = dbProductMap.get(String(itemInput.productId));
    const isService = itemInput.itemType === "SERVICE";

    const unitPrice = itemInput.unitPrice !== undefined ? Number(itemInput.unitPrice) : Number(prod?.sellingPrice || prod?.mrp || 0);
    const mrp = itemInput.mrp !== undefined ? Number(itemInput.mrp) : Number(prod?.mrp || unitPrice);
    const discountPct = Number(itemInput.discountPct || 0);
    const gstRate = itemInput.gstRate !== undefined ? Number(itemInput.gstRate) : Number(prod?.gstRate || 0);
    const quantity = Number(itemInput.quantity || 1);

    const productId = itemInput.productId || "item";
    const barcodeNumber = itemInput.barcodeNumber || prod?.barcodeNumber || prod?.itemNumber || "N/A";
    const productName = itemInput.productName || prod?.name || "Product";
    const hsnSac = itemInput.hsnSac || prod?.hsnSac || "9503";

    const calculated = calculateLineItem({
      productId,
      barcodeNumber,
      productName,
      hsnSac,
      mrp,
      unitPrice,
      quantity,
      discountPct,
      gstRate,
      isTaxInclusive: true,
    });

    (calculated as any).itemType = isService ? "SERVICE" : "PRODUCT";
    preparedLineItems.push(calculated);
  }

  const totals = calculateInvoiceTotals(preparedLineItems);
  const finalDiscount = Number(discount || 0);
  const finalOtherCharges = Number(otherCharges || 0);
  const grandTotal = Math.max(0, Math.round(totals.subtotal - finalDiscount + finalOtherCharges));

  // 6. Save revision snapshot in history
  const previousSnapshot = {
    revisionNumber: nextRevisionNumber,
    revisedAt: new Date(),
    revisedBy,
    reason: reason || "POS Bill Revision",
    previousItems: [...(invoice.items || [])],
    previousSubtotal: invoice.subtotal,
    previousDiscount: invoice.discount || invoice.totalDiscount || 0,
    previousGrandTotal: invoice.grandTotal,
    previousTotalQuantity: invoice.totalQuantity,
    stockAdjustments,
  };

  invoice.set("revisions", [...(invoice.revisions || []), previousSnapshot]);

  // 7. Update active invoice fields
  const oldGrandTotal = invoice.grandTotal;
  invoice.set("items", preparedLineItems);
  invoice.itemsCount = preparedLineItems.length;
  invoice.totalItems = preparedLineItems.length;
  invoice.totalQuantity = preparedLineItems.reduce((sum, it) => sum + it.quantity, 0);
  invoice.subtotal = totals.subtotal;
  invoice.discount = finalDiscount;
  invoice.totalDiscount = finalDiscount;
  invoice.otherCharges = finalOtherCharges;
  invoice.taxableAmount = totals.taxableAmount;
  invoice.cgstAmount = totals.cgstAmount;
  invoice.sgstAmount = totals.sgstAmount;
  invoice.igstAmount = totals.igstAmount;
  invoice.totalGst = totals.totalGst;
  invoice.grandTotal = grandTotal;
  invoice.paidAmount = grandTotal;

  if (customer?.name) invoice.customerName = customer.name.trim();
  if (customer?.mobile) invoice.customerPhone = customer.mobile.trim();
  if (customer) {
    invoice.customer = {
      ...(invoice.customer || {}),
      name: customer.name || invoice.customerName,
      mobile: customer.mobile || invoice.customerPhone,
      email: customer.email,
      gstin: customer.gstin,
      address: customer.address,
    };
  }

  if (paymentMethod) invoice.paymentMethod = paymentMethod;
  if (paymentMode) invoice.paymentMode = paymentMode;

  invoice.revisionCount = nextRevisionNumber;
  invoice.isRevised = true;
  invoice.revisedAt = new Date();
  invoice.revisedBy = revisedBy;

  await invoice.save();

  // 8. Update or create Customer totalSpend
  if (customer?.mobile) {
    const custMobile = customer.mobile.replace(/\D/g, "");
    if (custMobile.length >= 10) {
      await CustomerModel.findOneAndUpdate(
        { mobile: custMobile },
        {
          $set: { name: customer.name || "Customer", mobile: custMobile },
          $inc: { totalSpend: grandTotal - oldGrandTotal },
        },
        { upsert: true, returnDocument: "after" }
      );
    }
  }

  // 9. Audit Event & Live Notification
  await logAuditEvent({
    userName: revisedBy,
    action: "INVOICE_REVISED",
    entity: "Invoice",
    entityId: invoice._id.toString(),
    oldValue: {
      grandTotal: oldGrandTotal,
      itemsCount: previousSnapshot.previousItems.length,
      totalQuantity: previousSnapshot.previousTotalQuantity,
    },
    newValue: {
      revisionNumber: nextRevisionNumber,
      grandTotal,
      itemsCount: preparedLineItems.length,
      totalQuantity: invoice.totalQuantity,
      reason,
      stockAdjustments,
    },
  });

  try {
    await NotificationModel.create({
      title: `🔄 Bill Revised: ${invoice.invoiceNumber} (Rev #${nextRevisionNumber})`,
      message: `Revised by ${revisedBy}. Total: ₹${grandTotal.toLocaleString("en-IN")} (${preparedLineItems.length} items, ${invoice.totalQuantity} units). Inventory ledger reconciled.`,
      type: "info",
      category: "sales",
      isRead: false,
      link: `/invoices`,
    });
  } catch (notifErr) {
    console.error("Notification trigger error on revision:", notifErr);
  }

  return invoice;
}
