import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(amount: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted}/-`;
}

export function formatCurrency(amount: number, currency = "INR"): string {
  const formatted = formatAmount(amount);
  if (currency === "INR" || currency === "Rs." || currency === "RS") {
    return `₹${formatted}`;
  }
  return `${currency} ${formatted}`;
}

export function sanitizeExcelValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  // Formula injection prevention
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return str;
}
