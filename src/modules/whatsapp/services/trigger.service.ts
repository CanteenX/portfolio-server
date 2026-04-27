/**
 * WhatsApp Trigger Service
 *
 * Event-driven auto-messaging system. When application events occur
 * (e.g., CONNECTION_REQUEST_SENT, MEETING_BOOKED), this service automatically
 * sends the configured WhatsApp template to the user.
 *
 * How It Works:
 * 1. Admin creates trigger: eventKey + template + variable mapping
 * 2. App fires event: triggerWhatsAppEvent("CONNECTION_REQUEST_SENT", { userId, requestId })
 * 3. Service resolves variables from context + user DB lookup
 * 4. Sends template via Meta API
 * 5. Logs to WhatsAppLog + creates conversation record
 *
 * Integration:
 * - Call triggerWhatsAppEvent() from anywhere in your app
 * - Triggers are cached in memory (5 min TTL)
 * - Variables resolved via template-variables.service.ts
 *
 * TODO: CHANGE THIS - Update user model references for phone lookup
 * TODO: CHANGE THIS - Add custom event keys for your app
 */

import mongoose from "mongoose";
import { logger } from "../../../core/logging/logger";
import { getCachedTriggers } from "../trigger.handlers";
import { resolveTemplateVariables, buildMetaComponents } from "./template-variables.service";
import { sendTemplateMessage, normalizePhone } from "./meta-api.service";
import {
  WhatsAppLogModel,
  WAConversationModel,
  WAMessageModel,
  WhatsAppTriggerModel,
} from "../models";

export interface TriggerEventContext {
  userId?: string; // User to send message to
  phoneNumber?: string; // Alternative: direct phone number (if no userId)
  [key: string]: any; // Additional context for variable resolution
}

/**
 * Fire a WhatsApp trigger event
 *
 * Call this from anywhere in your application when an event occurs.
 *
 * Examples:
 * ```
 * // Connection request sent
 * await triggerWhatsAppEvent("CONNECTION_REQUEST_SENT", {
 *   userId: "123",
 *   senderName: "John Doe",
 *   requestId: "456"
 * });
 *
 * // Meeting booked
 * await triggerWhatsAppEvent("MEETING_BOOKED", {
 *   userId: "789",
 *   meetingDate: "2024-03-15",
 *   meetingTime: "10:00 AM"
 * });
 * ```
 */
export async function triggerWhatsAppEvent(
  eventKey: string,
  context: TriggerEventContext
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const normalizedKey = eventKey.toUpperCase();

    // Find active trigger for this event
    const triggers = await getCachedTriggers();
    const trigger = triggers.find((t: any) => t.eventKey === normalizedKey && t.isActive);

    if (!trigger) {
      logger.debug("[Trigger] No active trigger found", { eventKey: normalizedKey });
      return { success: false, error: "No active trigger found for this event" };
    }

    // Resolve phone number
    let phoneNumber: string | null = null;

    if (context.phoneNumber) {
      phoneNumber = normalizePhone(context.phoneNumber);
    } else if (context.userId) {
      phoneNumber = await getUserPhoneNumber(context.userId);
    }

    if (!phoneNumber) {
      logger.error("[Trigger] Cannot resolve phone number", {
        eventKey: normalizedKey,
        userId: context.userId,
      });
      return { success: false, error: "Cannot resolve user phone number" };
    }

    // Fetch user document for variable resolution
    let userDocument: any = null;
    if (context.userId) {
      userDocument = await getUserDocument(context.userId);
    }

    // Resolve template variables
    const variables = resolveTemplateVariables({
      variableMapping: trigger.variableMapping || [],
      context,
      userDocument,
    });

    const components = buildMetaComponents(variables);

    // Send template via Meta API
    const template = trigger.template; // Populated from cache
    if (!template) {
      logger.error("[Trigger] Template not populated", { triggerId: trigger._id });
      return { success: false, error: "Template not found" };
    }

    const result = await sendTemplateMessage({
      phoneNumber,
      templateName: template.metaTemplateName,
      languageCode: template.language || "en",
      components,
    });

    if (!result.success) {
      logger.error("[Trigger] Failed to send message", {
        eventKey: normalizedKey,
        phoneNumber,
        error: result.error,
      });

      // Log failure
      await WhatsAppLogModel.create({
        userId: context.userId ? new mongoose.Types.ObjectId(context.userId) : null,
        phoneNumber,
        eventType: normalizedKey,
        templateName: template.metaTemplateName,
        status: "failed",
        errorMessage: result.error,
        variables,
        triggerId: trigger._id,
      });

      return { success: false, error: result.error };
    }

    // Log success
    await WhatsAppLogModel.create({
      userId: context.userId ? new mongoose.Types.ObjectId(context.userId) : null,
      phoneNumber,
      eventType: normalizedKey,
      templateName: template.metaTemplateName,
      status: "sent",
      waMessageId: result.messageId,
      variables,
      triggerId: trigger._id,
    });

    // Update/create conversation record
    await upsertConversation(phoneNumber, result.messageId, template, context.userId);

    logger.info("[Trigger] Event processed", {
      eventKey: normalizedKey,
      phoneNumber,
      messageId: result.messageId,
      template: template.metaTemplateName,
    });

    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    logger.error("[Trigger] Exception processing event", {
      eventKey,
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Get user phone number from database
 *
 * TODO: CHANGE THIS - Replace with your actual User model lookup
 */
async function getUserPhoneNumber(userId: string): Promise<string | null> {
  logger.warn("[Trigger] Using placeholder getUserPhoneNumber - implement for your user model");

  // TODO: CHANGE THIS - Replace with actual user lookup
  // Example:
  // const user = await UserModel.findById(userId, { mobile: 1 }).lean();
  // if (!user?.mobile) return null;
  // return normalizePhone(user.mobile);

  // Placeholder
  return null;
}

/**
 * Get full user document for variable resolution
 *
 * TODO: CHANGE THIS - Replace with your actual User model lookup
 */
async function getUserDocument(userId: string): Promise<any | null> {
  logger.warn("[Trigger] Using placeholder getUserDocument - implement for your user model");

  // TODO: CHANGE THIS - Replace with actual user lookup
  // Example:
  // const user = await UserModel.findById(userId)
  //   .populate("personalProfile")
  //   .populate("businessProfile")
  //   .lean();
  // return user;

  // Placeholder
  return null;
}

/**
 * Create or update conversation record after trigger
 */
async function upsertConversation(
  phoneNumber: string,
  waMessageId: string | undefined,
  template: any,
  userId?: string
): Promise<void> {
  try {
    // Find existing conversation
    let conversation = await WAConversationModel.findOne({ phoneNumber });

    const now = new Date();
    const lastMessage = {
      content: `[Template: ${template.name}]`,
      direction: "outbound" as const,
      type: "template" as const,
      timestamp: now,
    };

    if (conversation) {
      // Update existing
      await WAConversationModel.findByIdAndUpdate(conversation._id, {
        $set: {
          lastMessage,
          lastMessageAt: now,
        },
      });
    } else {
      // Create new
      conversation = await WAConversationModel.create({
        phoneNumber,
        contactName: null, // Will be updated when user replies
        userId: userId ? new mongoose.Types.ObjectId(userId) : null,
        status: "active",
        lastMessage,
        lastMessageAt: now,
        lastInboundAt: null,
        unreadCount: 0,
        campaignIds: [],
      });
    }

    // Create message record
    if (waMessageId) {
      await WAMessageModel.create({
        conversationId: conversation._id,
        waMessageId,
        direction: "outbound",
        type: "template",
        content: {
          text: template.bodyText || template.name,
          templateName: template.metaTemplateName,
        },
        status: "pending",
        timestamp: now,
      });
    }
  } catch (error: any) {
    logger.error("[Trigger] Failed to upsert conversation", {
      phoneNumber,
      error: error.message,
    });
  }
}

/**
 * Get trigger by event key (for debugging/testing)
 */
export async function getTriggerByEventKey(eventKey: string): Promise<any | null> {
  const normalizedKey = eventKey.toUpperCase();
  return WhatsAppTriggerModel.findOne({ eventKey: normalizedKey, isActive: true })
    .populate("template")
    .lean();
}

/**
 * List all available trigger event keys (for admin UI dropdown)
 */
export async function listAvailableEventKeys(): Promise<string[]> {
  const triggers = await WhatsAppTriggerModel.find({}, { eventKey: 1 }).lean();
  return [...new Set(triggers.map((t: any) => t.eventKey))];
}
