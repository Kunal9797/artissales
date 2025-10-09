/**
 * Validation Utilities
 *
 * Input validation, normalization, and sanitization functions
 */

/**
 * Normalize phone number to E.164 format
 * Examples:
 *   9876543210 -> +919876543210
 *   +91 98765 43210 -> +919876543210
 *   919876543210 -> +919876543210
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle different formats
  if (digits.length === 10) {
    // Indian 10-digit number
    return `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    // 91XXXXXXXXXX format
    return `+${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    // 0XXXXXXXXXX format (remove leading 0)
    return `+91${digits.slice(1)}`;
  }

  // Return as-is if already in correct format or unknown format
  return phone.startsWith("+") ? phone : `+${digits}`;
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);

  // Check for Indian phone number: +91 followed by 10 digits
  const indianPhoneRegex = /^\+91[6-9]\d{9}$/;
  return indianPhoneRegex.test(normalized);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate pincode (Indian 6-digit format)
 */
export function isValidPincode(pincode: string): boolean {
  const pincodeRegex = /^[1-9]\d{5}$/;
  return pincodeRegex.test(pincode);
}

/**
 * Sanitize string input (trim, remove extra spaces)
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(
  obj: Record<string, any>,
  requiredFields: string[]
): {valid: boolean; missing: string[]} {
  const missing = requiredFields.filter((field) => {
    const value = obj[field];
    return value === undefined || value === null || value === "";
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate GPS accuracy (in meters)
 * @param accuracyM - Accuracy in meters
 * @param maxAccuracy - Maximum acceptable accuracy (default: 100m)
 */
export function isAcceptableGPSAccuracy(
  accuracyM: number,
  maxAccuracy = 100
): boolean {
  return accuracyM > 0 && accuracyM <= maxAccuracy;
}
