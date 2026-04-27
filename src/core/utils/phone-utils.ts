/**
 * Normalizes a phone number to E.164 format without the leading '+'.
 *
 * Supports numbers with or without country code. If the country code is
 * absent and the local number is 10 digits, defaults to India (+91).
 *
 * @returns Normalized digits string (e.g. "919876543210") or null if invalid.
 */
export function normalizePhoneNumber(phone: string, defaultCountryCode = "91"): string | null {
  if (!phone) return null;

  const cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  if (!cleaned) return null;

  const withoutLeadingZero = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;

  if (withoutLeadingZero.startsWith(defaultCountryCode) && withoutLeadingZero.length === defaultCountryCode.length + 10) {
    return withoutLeadingZero;
  }

  if (withoutLeadingZero.length === 10) {
    return defaultCountryCode + withoutLeadingZero;
  }

  return withoutLeadingZero;
}
