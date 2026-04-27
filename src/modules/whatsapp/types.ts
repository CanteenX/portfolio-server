/**
 * WhatsApp Module - Shared Types
 *
 * Common types used across WhatsApp models, services, and handlers.
 * Import these types when you need shared enums or interfaces.
 */

/**
 * Message direction for inbox conversations
 * - inbound: Customer sent to business
 * - outbound: Business sent to customer
 */
export type MessageDirection = "inbound" | "outbound";

/**
 * Meta WhatsApp API Error Codes
 * See: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 */
export const META_ERROR_CODES = {
  // Permanent errors (don't retry)
  INVALID_PHONE_NUMBER: 131047,
  PHONE_NOT_WHATSAPP: 131026,
  TEMPLATE_PARAM_COUNT_MISMATCH: 131051,
  TEMPLATE_NOT_EXISTS: 131049,
  RECIPIENT_UNAVAILABLE: 131042,

  // Policy errors (don't retry, flag for review)
  POLICY_VIOLATION: 368,
  SPAM_RATE_LIMIT: 131031,

  // Rate limit errors (back off and retry)
  RATE_LIMIT_HIT: 131056,
  TOO_MANY_MESSAGES: 131057,
  CLOUD_API_RATE_LIMIT: 80007,

  // Transient errors (retry with backoff)
  TEMPORARY_ERROR: 130472,
  TEMPLATE_PAUSED: 131053,
  MEDIA_DOWNLOAD_ERROR: 131021,
  INTERNAL_ERROR: 500,
  GENERIC_ERROR: 131000,
} as const;

/**
 * Normalized phone number format
 * Country code + number, no spaces/dashes
 * Example: "919876543210" (India)
 */
export type NormalizedPhoneNumber = string;

/**
 * Meta API Component Structure
 * Used in template variable resolution
 */
export interface MetaMessageComponent {
  type: "header" | "body" | "button" | "footer";
  parameters?: MetaComponentParameter[];
  sub_type?: "quick_reply" | "url";
  index?: number;
}

export interface MetaComponentParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
  video?: {
    link: string;
  };
}
