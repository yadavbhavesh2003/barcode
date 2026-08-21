// Centralized Financial & Tax Calculation Engine (Safe Decimal Math)
import { IInvoiceItem } from "../types";

/**
 * Rounds a number to exactly two decimal places safely.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface LineItemCalculationInput {
  productId: string;
  barcodeNumber: string;
  productName: string;
  hsnSac?: string;
  mrp: number;
  unitPrice: number; // Base selling price
  quantity: number;
  discountPct?: number;
  gstRate: number; // e.g. 5, 12, 18, 28
  isTaxInclusive?: boolean;
  isInterstate?: boolean; // If true, IGST is used instead of CGST + SGST
}

/**
 * Computes exact line item financial breakdown.
 */
export function calculateLineItem(input: LineItemCalculationInput): IInvoiceItem {
  const quantity = Math.max(1, input.quantity || 1);
  const unitPrice = Math.max(0, input.unitPrice || 0);
  const discountPct = Math.max(0, Math.min(100, input.discountPct || 0));
  const gstRate = Math.max(0, input.gstRate || 0);
  const isTaxInclusive = !!input.isTaxInclusive;
  const isInterstate = !!input.isInterstate;

  // 1. Gross line price before discount
  const grossAmount = unitPrice * quantity;

  // 2. Discount amount
  const discountAmount = round2(grossAmount * (discountPct / 100));
  const netAmount = round2(grossAmount - discountAmount);

  let taxableAmount = 0;
  let totalGst = 0;

  if (isTaxInclusive) {
    // If tax inclusive: netAmount = taxableAmount * (1 + gstRate/100)
    // taxableAmount = netAmount / (1 + gstRate/100)
    taxableAmount = round2(netAmount / (1 + gstRate / 100));
    totalGst = round2(netAmount - taxableAmount);
  } else {
    // If tax exclusive: taxableAmount = netAmount, gst = taxableAmount * gstRate / 100
    taxableAmount = netAmount;
    totalGst = round2(taxableAmount * (gstRate / 100));
  }

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterstate) {
    igstAmount = totalGst;
  } else {
    cgstAmount = round2(totalGst / 2);
    sgstAmount = round2(totalGst - cgstAmount); // Balance to ensure no rounding discrepancy
  }

  const lineTotal = round2(taxableAmount + totalGst);

  return {
    productId: input.productId,
    barcodeNumber: input.barcodeNumber,
    productName: input.productName,
    hsnSac: input.hsnSac || "",
    mrp: input.mrp,
    unitPrice: round2(unitPrice),
    quantity,
    discountPct,
    discountAmount,
    taxableAmount,
    gstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGst,
    lineTotal,
  };
}

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGst: number;
  roundOff: number;
  grandTotal: number;
  itemsCount: number;
  totalQuantity: number;
}

/**
 * Aggregates all line items to calculate full invoice totals and round-off.
 */
export function calculateInvoiceTotals(items: IInvoiceItem[]): InvoiceTotals {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalGst = 0;
  let totalQuantity = 0;

  for (const item of items) {
    subtotal += item.mrp * item.quantity;
    totalDiscount += item.discountAmount;
    taxableAmount += item.taxableAmount;
    cgstAmount += item.cgstAmount;
    sgstAmount += item.sgstAmount;
    igstAmount += item.igstAmount;
    totalGst += item.totalGst;
    totalQuantity += item.quantity;
  }

  subtotal = round2(subtotal);
  totalDiscount = round2(totalDiscount);
  taxableAmount = round2(taxableAmount);
  cgstAmount = round2(cgstAmount);
  sgstAmount = round2(sgstAmount);
  igstAmount = round2(igstAmount);
  totalGst = round2(totalGst);

  const rawTotal = taxableAmount + totalGst;
  const grandTotal = Math.round(rawTotal);
  const roundOff = round2(grandTotal - rawTotal);

  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGst,
    roundOff,
    grandTotal,
    itemsCount: items.length,
    totalQuantity,
  };
}
