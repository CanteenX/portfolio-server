/**
 * WhatsApp Inbox Handlers
 *
 * Two-way WhatsApp messaging inbox for customer communication.
 * Supports free-text replies (within 24h service window) and template messages.
 *
 * Key Concepts:
 * - 24-Hour Service Window: After a customer sends a message, you have 24 hours
 *   to reply with free-text. After that, only template messages are allowed.
 * - Conversation Resolution: Conversations can be accessed by WAConversation ID
 *   or by "user_{userId}" placeholder (for contacts without conversations yet).
 * - Real-time Updates: All message actions emit Socket.IO events to admin panel.
 *
 * TODO: CHANGE THIS - Update user model references for contact lookup
 * TODO: CHANGE THIS - Implement sendFreeTextReply() and sendTemplateFromChat()
 *   in the service layer (currently placeholders)
 *
 * Database Collections: WA-Conversations, WA-Messages
 */

import { ERROR_CODES } from "@admin-platform/shared-types";
import type { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { env } from "../../config/env";
import { logger } from "../../core/logging/logger";
import {
  WAConversationModel,
  WAMessageModel,
  CampaignModel,
  WhatsAppTemplateModel,
} from "./models";

// ═══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════

const getConversationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  campaignId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
});

const getMessagesQuerySchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const sendReplySchema = z.object({
  text: z.string().min(1).max(4096).trim(),
  replyToWaMessageId: z.string().optional(),
});

const sendTemplateSchema = z.object({
  templateId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  variables: z.array(z.string()).optional(),
});

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200).trim(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Check if 24-hour service window is still open
 * Free-text replies are only allowed within 24h of last inbound message
 */
function isWithin24hWindow(lastInboundAt: Date | null | undefined): boolean {
  if (!lastInboundAt) return false;
  const windowEnd = new Date(lastInboundAt).getTime() + 24 * 60 * 60 * 1000;
  return Date.now() < windowEnd;
}

/**
 * Normalize phone number to 91XXXXXXXXXX format
 * TODO: CHANGE THIS - Update for other country codes if needed
 */
function normalizePhone(phone: string): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("91") && cleaned.length === 12) return cleaned;
  if (cleaned.length === 10) return "91" + cleaned;
  return cleaned;
}

/**
 * Resolve conversation from ID (ObjectId or "user_{userId}" placeholder)
 *
 * TODO: CHANGE THIS - Update RegisteredUser reference to your actual User model
 * The "user_xxx" placeholder pattern requires looking up the user's phone number
 * to find or create a conversation.
 */
async function resolveConversation(id: string): Promise<any | null> {
  // If it's a regular ObjectId, look up directly
  if (mongoose.Types.ObjectId.isValid(id) && !id.startsWith("user_")) {
    return WAConversationModel.findById(id);
  }

  // It's a user_xxx placeholder - need to find user's phone
  // TODO: CHANGE THIS - Replace with your actual User model
  // const userId = id.replace("user_", "");
  // const user = await UserModel.findById(userId, { name: 1, mobile: 1 }).lean();
  // if (!user?.mobile) return null;
  // const phone = normalizePhone(user.mobile);
  // ... upsert conversation

  logger.warn("[WhatsApp Inbox] user_ prefix resolution not yet implemented - update resolveConversation()");
  return null;
}

/**
 * Send free-text reply via Meta Graph API
 * TODO: CHANGE THIS - Move to service layer (meta-api.service.ts)
 */
async function sendFreeTextReply(phoneNumber: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { success: false, error: "WhatsApp API not configured" };
  }

  const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",
        text: { body: text },
      }),
    });

    const data = await response.json();
    if (response.ok && data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || JSON.stringify(data) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send template message from chat via Meta Graph API
 * TODO: CHANGE THIS - Move to service layer (meta-api.service.ts)
 */
async function sendTemplateFromChat(
  phoneNumber: string,
  templateName: string,
  components: any[],
  language: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { success: false, error: "WhatsApp API not configured" };
  }

  const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: language || "en" },
          ...(components.length > 0 && { components }),
        },
      }),
    });

    const data = await response.json();
    if (response.ok && data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || JSON.stringify(data) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════
// HANDLER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * List conversations
 *
 * Two modes:
 * 1. Campaign-filtered: Shows conversations linked to a specific campaign
 * 2. General inbox: Shows all conversations sorted by last message
 *
 * TODO: CHANGE THIS - General mode currently only shows WAConversations.
 *   Source code merges with RegisteredUser contacts. Implement for your user model.
 */
export const getConversations = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = getConversationsSchema.parse(req.body ?? {});
    const skip = (params.page - 1) * params.limit;

    // Campaign-filtered mode
    if (params.campaignId) {
      const match: any = {
        status: "active",
        campaignIds: new mongoose.Types.ObjectId(params.campaignId),
      };
      if (params.search) {
        match.$or = [
          { phoneNumber: { $regex: params.search, $options: "i" } },
          { contactName: { $regex: params.search, $options: "i" } },
        ];
      }

      const [conversations, total] = await Promise.all([
        WAConversationModel.find(match).sort({ lastMessageAt: -1 }).skip(skip).limit(params.limit).lean(),
        WAConversationModel.countDocuments(match),
      ]);

      const data = conversations.map((c: any) => ({
        ...c,
        isWithin24h: isWithin24hWindow(c.lastInboundAt),
        hasConversation: true,
      }));

      res.status(200).json({
        data,
        totalCount: total,
        totalPages: Math.ceil(total / params.limit),
        currentPage: params.page,
      });
      return;
    }

    // General inbox: all conversations
    const match: any = { status: "active" };
    if (params.search) {
      match.$or = [
        { phoneNumber: { $regex: params.search, $options: "i" } },
        { contactName: { $regex: params.search, $options: "i" } },
      ];
    }

    const [conversations, total] = await Promise.all([
      WAConversationModel.find(match).sort({ lastMessageAt: -1 }).skip(skip).limit(params.limit).lean(),
      WAConversationModel.countDocuments(match),
    ]);

    const data = conversations.map((c: any) => ({
      ...c,
      isWithin24h: isWithin24hWindow(c.lastInboundAt),
      hasConversation: true,
    }));

    res.status(200).json({
      data,
      totalCount: total,
      totalPages: Math.ceil(total / params.limit),
      currentPage: params.page,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid filter parameters"));
      return;
    }
    next(error);
  }
};

/**
 * Get conversation detail with campaign info
 */
export const getConversationDetail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Handle user_ prefix placeholder
    if (id.startsWith("user_")) {
      // TODO: CHANGE THIS - Implement user lookup for your model
      throw new AppError(501, ERROR_CODES.INTERNAL_ERROR, "User contact resolution not yet implemented. Update getConversationDetail handler.");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid conversation ID");
    }

    const conversation = (await WAConversationModel.findById(id).lean()) as any;
    if (!conversation) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
    }

    // Fetch linked campaign names
    let campaigns: any[] = [];
    if (conversation.campaignIds?.length > 0) {
      campaigns = await CampaignModel.find(
        { _id: { $in: conversation.campaignIds } },
        { name: 1 }
      ).lean();
    }

    res.status(200).json({
      ...conversation,
      isWithin24h: isWithin24hWindow(conversation.lastInboundAt),
      hasConversation: true,
      campaigns,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get message history for a conversation (cursor-based pagination)
 *
 * Pagination: Uses `before` timestamp for infinite scroll
 * Returns messages newest-first, then reversed for chronological display
 */
export const getMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const params = getMessagesQuerySchema.parse(req.query ?? {});

    // Handle user_ prefix - no messages yet
    if (id.startsWith("user_")) {
      res.status(200).json({ data: [], hasMore: false });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid conversation ID");
    }

    const query: any = { conversationId: new mongoose.Types.ObjectId(id) };
    if (params.before) {
      query.timestamp = { $lt: new Date(params.before) };
    }

    const messages = await WAMessageModel.find(query)
      .sort({ timestamp: -1 })
      .limit(params.limit)
      .populate("replyToId", "content type direction timestamp")
      .lean();

    // Reset unread count when conversation is opened
    await WAConversationModel.findByIdAndUpdate(id, { $set: { unreadCount: 0 } });

    res.status(200).json({
      data: messages.reverse(), // Chronological order for display
      hasMore: messages.length === params.limit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid query parameters"));
      return;
    }
    next(error);
  }
};

/**
 * Send free-text reply
 *
 * Requires 24-hour service window to be open (customer must have
 * sent a message within the last 24 hours).
 */
export const sendReply = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const payload = sendReplySchema.parse(req.body ?? {});

    const conversation = await resolveConversation(id);
    if (!conversation) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
    }

    // Enforce 24h window
    if (!isWithin24hWindow(conversation.lastInboundAt)) {
      throw new AppError(
        403,
        ERROR_CODES.FORBIDDEN,
        "24-hour customer service window has expired. Send a template to re-engage."
      );
    }

    const result = await sendFreeTextReply(conversation.phoneNumber, payload.text);
    if (!result.success) {
      throw new AppError(502, ERROR_CODES.INTERNAL_ERROR, result.error || "Failed to send message");
    }

    // Resolve reply reference
    let replyToId: mongoose.Types.ObjectId | null = null;
    if (payload.replyToWaMessageId) {
      const replyMsg = await WAMessageModel.findOne({ waMessageId: payload.replyToWaMessageId });
      if (replyMsg) replyToId = replyMsg._id as mongoose.Types.ObjectId;
    }

    const now = new Date();
    const waMessage = await WAMessageModel.create({
      conversationId: conversation._id,
      waMessageId: result.messageId,
      direction: "outbound",
      type: "text",
      content: { text: payload.text },
      replyToWaMessageId: payload.replyToWaMessageId || null,
      replyToId,
      status: "pending",
      sentBy: req.user!.id,
      timestamp: now,
    });

    // Update conversation
    await WAConversationModel.findByIdAndUpdate(conversation._id, {
      $set: {
        lastMessage: {
          content: payload.text,
          direction: "outbound",
          type: "text",
          timestamp: now,
        },
        lastMessageAt: now,
      },
    });

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.to("whatsapp_inbox_admin").emit("wa_message_sent", {
        conversationId: conversation._id,
        message: waMessage.toObject(),
      });
    }

    res.status(200).json({
      data: waMessage.toObject(),
      conversationId: conversation._id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid reply data"));
      return;
    }
    next(error);
  }
};

/**
 * Send template message from inbox
 *
 * Templates can be sent at any time (no 24h window restriction).
 * Only APPROVED templates can be sent.
 */
export const sendTemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const payload = sendTemplateSchema.parse(req.body ?? {});

    const conversation = await resolveConversation(id);
    if (!conversation) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
    }

    const template = (await WhatsAppTemplateModel.findById(payload.templateId)) as any;
    if (!template) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }

    if (template.metaStatus !== "APPROVED") {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Template is not approved by Meta");
    }

    // Build components from variables
    const components: any[] = [];
    if (payload.variables?.length) {
      components.push({
        type: "body",
        parameters: payload.variables.map((v) => ({ type: "text", text: v })),
      });
    }

    const result = await sendTemplateFromChat(
      conversation.phoneNumber,
      template.metaTemplateName,
      components,
      template.language
    );

    if (!result.success) {
      throw new AppError(502, ERROR_CODES.INTERNAL_ERROR, result.error || "Failed to send template");
    }

    const now = new Date();
    const waMessage = await WAMessageModel.create({
      conversationId: conversation._id,
      waMessageId: result.messageId,
      direction: "outbound",
      type: "template",
      content: {
        text: template.bodyText || template.name,
        templateName: template.metaTemplateName,
        templateData: { variables: payload.variables, templateId: payload.templateId },
      },
      status: "pending",
      sentBy: req.user!.id,
      timestamp: now,
    });

    // Update conversation
    await WAConversationModel.findByIdAndUpdate(conversation._id, {
      $set: {
        lastMessage: {
          content: `[Template: ${template.name}]`,
          direction: "outbound",
          type: "template",
          timestamp: now,
        },
        lastMessageAt: now,
      },
    });

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.to("whatsapp_inbox_admin").emit("wa_message_sent", {
        conversationId: conversation._id,
        message: waMessage.toObject(),
      });
    }

    res.status(200).json({
      data: waMessage.toObject(),
      conversationId: conversation._id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid template data"));
      return;
    }
    next(error);
  }
};

/**
 * Search across all messages
 */
export const searchMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = searchQuerySchema.parse(req.query ?? {});
    const skip = (params.page - 1) * params.limit;

    const [messages, total] = await Promise.all([
      WAMessageModel.find({ "content.text": { $regex: params.q, $options: "i" } })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(params.limit)
        .lean(),
      WAMessageModel.countDocuments({ "content.text": { $regex: params.q, $options: "i" } }),
    ]);

    // Attach conversation info
    const convIds = [...new Set(messages.map((m: any) => m.conversationId.toString()))];
    const convs = await WAConversationModel.find(
      { _id: { $in: convIds } },
      { phoneNumber: 1, contactName: 1 }
    ).lean();
    const convMap = Object.fromEntries(convs.map((c: any) => [c._id.toString(), c]));

    const data = messages.map((m: any) => ({
      ...m,
      conversation: convMap[m.conversationId.toString()] || null,
    }));

    res.status(200).json({
      data,
      totalCount: total,
      totalPages: Math.ceil(total / params.limit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid search parameters"));
      return;
    }
    next(error);
  }
};
