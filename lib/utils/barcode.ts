// Barcode Calculation, Validation, and GS1 Verification Utilities
import { BarcodeType, BarcodeSource } from "../types";

/**
 * Calculates GS1 Modulo-10 Check Digit for GTIN-8, GTIN-12 (UPC-A), GTIN-13 (EAN-13), GTIN-14 (ITF-14).
 * Algorithm: From right to left (excluding check digit position), alternate multiplying digits by 3 and 1, sum them, mod 10, subtract from 10.
 */
export function calculateGS1CheckDigit(digitsWithoutCheck: string): number {
  const digits = digitsWithoutCheck.replace(/\D/g, "");
  let sum = 0;
  let multiplier = 3;

  for (let i = digits.length - 1; i >= 0; i--) {
    const digit = parseInt(digits[i], 10);
    sum += digit * multiplier;
    multiplier = multiplier === 3 ? 1 : 3;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validates whether a barcode matches its declared format and check digit.
 */
export function validateBarcodeFormat(
  barcode: string,
  type: BarcodeType
): { valid: boolean; error?: string } {
  if (!barcode || typeof barcode !== "string") {
    return { valid: false, error: "Barcode cannot be empty" };
  }

  const clean = barcode.trim();

  switch (type) {
    case "EAN13": {
      if (!/^\d{13}$/.test(clean)) {
        return { valid: false, error: "EAN-13 must contain exactly 13 numeric digits" };
      }
      const dataPart = clean.slice(0, 12);
      const expectedCheck = calculateGS1CheckDigit(dataPart);
      const actualCheck = parseInt(clean[12], 10);
      if (expectedCheck !== actualCheck) {
        return {
          valid: false,
          error: `Invalid EAN-13 check digit. Expected ${expectedCheck}, received ${actualCheck}`,
        };
      }
      return { valid: true };
    }

    case "EAN8": {
      if (!/^\d{8}$/.test(clean)) {
        return { valid: false, error: "EAN-8 must contain exactly 8 numeric digits" };
      }
      const dataPart = clean.slice(0, 7);
      const expectedCheck = calculateGS1CheckDigit(dataPart);
      const actualCheck = parseInt(clean[7], 10);
      if (expectedCheck !== actualCheck) {
        return {
          valid: false,
          error: `Invalid EAN-8 check digit. Expected ${expectedCheck}, received ${actualCheck}`,
        };
      }
      return { valid: true };
    }

    case "UPCA": {
      if (!/^\d{12}$/.test(clean)) {
        return { valid: false, error: "UPC-A must contain exactly 12 numeric digits" };
      }
      const dataPart = clean.slice(0, 11);
      const expectedCheck = calculateGS1CheckDigit(dataPart);
      const actualCheck = parseInt(clean[11], 10);
      if (expectedCheck !== actualCheck) {
        return {
          valid: false,
          error: `Invalid UPC-A check digit. Expected ${expectedCheck}, received ${actualCheck}`,
        };
      }
      return { valid: true };
    }

    case "ITF14": {
      if (!/^\d{14}$/.test(clean)) {
        return { valid: false, error: "ITF-14 must contain exactly 14 numeric digits" };
      }
      const dataPart = clean.slice(0, 13);
      const expectedCheck = calculateGS1CheckDigit(dataPart);
      const actualCheck = parseInt(clean[13], 10);
      if (expectedCheck !== actualCheck) {
        return {
          valid: false,
          error: `Invalid ITF-14 check digit. Expected ${expectedCheck}, received ${actualCheck}`,
        };
      }
      return { valid: true };
    }

    case "CODE39": {
      // Allowed chars: 0-9, A-Z, space, -, ., $, /, +, %
      if (!/^[0-9A-Z\-. $/+%]+$/.test(clean)) {
        return {
          valid: false,
          error: "Code 39 only supports uppercase alphanumeric and - . $ / + % characters",
        };
      }
      return { valid: true };
    }

    case "CODE128": {
      // Standard ASCII 128
      if (!/^[\x00-\x7F]+$/.test(clean)) {
        return { valid: false, error: "Code 128 only supports standard ASCII characters" };
      }
      return { valid: true };
    }

    case "QR":
    case "CUSTOM":
    default:
      if (clean.length === 0 || clean.length > 255) {
        return { valid: false, error: "Custom barcode must be between 1 and 255 characters" };
      }
      return { valid: true };
  }
}

/**
 * Checks GS1 separation rules: verifies source classification
 */
export function verifyBarcodeSource(
  barcode: string,
  source: BarcodeSource,
  type: BarcodeType
): { valid: boolean; error?: string } {
  if (source === "GS1_GTIN" || source === "EXISTING_GS1") {
    if (!["EAN13", "EAN8", "UPCA", "ITF14"].includes(type)) {
      return {
        valid: false,
        error: `GS1 GTIN requires a standardized symbology (EAN-13, EAN-8, UPC-A, ITF-14), not ${type}`,
      };
    }
    const formatCheck = validateBarcodeFormat(barcode, type);
    if (!formatCheck.valid) {
      return formatCheck;
    }
  }

  return { valid: true };
}

/**
 * Formats a sequential numeric counter into an 8-digit or configured length code.
 */
export function formatSequentialCode(
  number: number,
  prefix: string = "",
  suffix: string = "",
  padLength: number = 8
): string {
  const padded = String(number).padStart(padLength, "0");
  return `${prefix}${padded}${suffix}`;
}
