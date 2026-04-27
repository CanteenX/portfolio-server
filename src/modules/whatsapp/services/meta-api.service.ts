/**
 * Meta WhatsApp Business API Service
 *
 * Centralized service for all Meta Graph API interactions.
 * Handles message sending, template management, and phone number normalization.
 *
 * Key Features:
 * - Send text messages (24h window required)
 * - Send template messages (no window restriction)
 * - Submit templates for Meta approval
 * - Sync approved templates from Meta
 * - Phone number normalization (India +91)
 *
 * Meta Graph API Documentation:
 * https://developers.facebook.com/docs/whatsapp/cloud-api/
 *
 * TODO: CHANGE THIS - Update normalizePhone() for other country codes if needed
 */

import { env } from "../../../config/env";
import { logger } from "../../../core/logging/logger";

export interface SendTextMessageParams {
  phoneNumber: string;
  text: string;
  replyToWaMessageId?: string;
}

export interface SendTemplateMessageParams {
  phoneNumber: string;
  templateName: string;
  languageCode: string;
  components?: MetaComponent[];
}

export interface MetaComponent {
  type: "header" | "body" | "footer" | "button";
  parameters?: Array<{
    type: "text" | "currency" | "date_time";
    text?: string;
    currency?: { fallback_value: string; code: string; amount_1000: number };
    date_time?: { fallback_value: string };
  }>;
}

export interface MetaApiResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: number;
  data?: any;
}

/**
 * Normalize phone number to WhatsApp format
 * Default: 91XXXXXXXXXX (India)
 *
 * TODO: CHANGE THIS - Update for international numbers
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";

  // Remove all non-numeric characters
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");

  // Remove leading 0
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.slice(1);
  }

  // Add country code if missing (India: 91)
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }

  // Validate India format
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned;
  }

  // Return as-is if not matching expected pattern
  logger.warn("[Meta API] Phone number format unexpected", { phone, cleaned });
  return cleaned;
}

/**
 * Send free-text message via Meta Graph API
 * Requires 24-hour customer service window to be open
 */
export async function sendTextMessage(params: SendTextMessageParams): Promise<MetaApiResponse> {
  try {
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      return { success: false, error: "WhatsApp API credentials not configured" };
    }

    const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const body: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(params.phoneNumber),
      type: "text",
      text: { body: params.text },
    };

    // Add context for reply-to functionality
    if (params.replyToWaMessageId) {
      body.context = { message_id: params.replyToWaMessageId };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok && data.messages?.[0]?.id) {
      logger.debug("[Meta API] Text message sent", {
        to: params.phoneNumber,
        messageId: data.messages[0].id,
      });
      return { success: true, messageId: data.messages[0].id, data };
    }

    const errorMsg = data.error?.message || JSON.stringify(data);
    const errorCode = data.error?.code || response.status;

    logger.error("[Meta API] Text message failed", {
      to: params.phoneNumber,
      error: errorMsg,
      errorCode,
    });

    return { success: false, error: errorMsg, errorCode };
  } catch (err: any) {
    logger.error("[Meta API] Text message exception", {
      to: params.phoneNumber,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
}

/**
 * Send template message via Meta Graph API
 * Can be sent at any time (no 24h window restriction)
 */
export async function sendTemplateMessage(params: SendTemplateMessageParams): Promise<MetaApiResponse> {
  try {
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      return { success: false, error: "WhatsApp API credentials not configured" };
    }

    const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(params.phoneNumber),
      type: "template",
      template: {
        name: params.templateName,
        language: { code: params.languageCode || "en" },
        ...(params.components && params.components.length > 0 && { components: params.components }),
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok && data.messages?.[0]?.id) {
      logger.debug("[Meta API] Template message sent", {
        to: params.phoneNumber,
        template: params.templateName,
        messageId: data.messages[0].id,
      });
      return { success: true, messageId: data.messages[0].id, data };
    }

    const errorMsg = data.error?.message || JSON.stringify(data);
    const errorCode = data.error?.code || response.status;

    logger.error("[Meta API] Template message failed", {
      to: params.phoneNumber,
      template: params.templateName,
      error: errorMsg,
      errorCode,
    });

    return { success: false, error: errorMsg, errorCode };
  } catch (err: any) {
    logger.error("[Meta API] Template message exception", {
      to: params.phoneNumber,
      template: params.templateName,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
}

/**
 * Submit a template to Meta for approval
 */
export async function submitTemplate(
  templateName: string,
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION",
  language: string,
  components: any[]
): Promise<MetaApiResponse> {
  try {
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_WABA_ID) {
      return { success: false, error: "WhatsApp WABA credentials not configured" };
    }

    const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_WABA_ID}/message_templates`;

    const body = {
      name: templateName,
      language: language || "en",
      category: category || "MARKETING",
      components,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok && data.id) {
      logger.info("[Meta API] Template submitted", {
        templateName,
        metaTemplateId: data.id,
        status: data.status,
      });
      return { success: true, data };
    }

    const errorMsg = data.error?.message || JSON.stringify(data);
    logger.error("[Meta API] Template submission failed", {
      templateName,
      error: errorMsg,
    });

    return { success: false, error: errorMsg };
  } catch (err: any) {
    logger.error("[Meta API] Template submission exception", {
      templateName,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all templates from Meta (for sync)
 */
export async function fetchTemplatesFromMeta(limit = 100): Promise<MetaApiResponse> {
  try {
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_WABA_ID) {
      return { success: false, error: "WhatsApp WABA credentials not configured" };
    }

    const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_WABA_ID}/message_templates?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      },
    });

    const data = await response.json();

    if (response.ok && data.data) {
      logger.info("[Meta API] Templates fetched", {
        count: data.data.length,
      });
      return { success: true, data: data.data };
    }

    const errorMsg = data.error?.message || JSON.stringify(data);
    logger.error("[Meta API] Template fetch failed", { error: errorMsg });

    return { success: false, error: errorMsg };
  } catch (err: any) {
    logger.error("[Meta API] Template fetch exception", { error: err.message });
    return { success: false, error: err.message };
  }
}
