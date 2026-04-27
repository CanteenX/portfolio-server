/**
 * WhatsApp Webhook Handlers
 *
 * Processes webhook notifications from Meta WhatsApp Business API.
 * This file contains all the business logic for handling:
 * 1. Webhook verification (one-time setup with Meta)
 * 2. Message delivery status updates (sent/delivered/read/failed)
 * 3. Incoming messages from customers (WhatsApp Inbox)
 * 4. Opt-out keyword detection (STOP, UNSUBSCRIBE, etc.)
 *
 * Flow Overview:
 * ┌─────────────┐
 * │ Meta Server │ sends webhook → POST /webhook
 * └─────────────┘
 *       ↓
 *  validateSignature() ← verifies HMAC with WHATSAPP_APP_SECRET
 *       ↓
 *  handleStatusUpdate() ← processes entry.changes[]
 *       ↓
 *  ┌──────────────────┬──────────────────────┐
 *  ↓                  ↓                      ↓
 * processStatusUpdate()  processIncomingMessage()  detectOptOut()
 *  ↓                  ↓                      ↓
 * Update:            Create/Update:         Update:
 * - MessageQueue     - WAConversation       - User.whatsappOptOut
 * - BulkMessaging    - WAMessage
 * - WhatsAppLog      - Link campaigns
 * - WAMessage        - Emit socket event
 *
 * Configure WHATSAPP_APP_SECRET and WHATSAPP_WEBHOOK_VERIFY_TOKEN in .env
 */

import crypto from "crypto";
import type { Request, Response } from "express";
import mongoose from "mongoose";
import { env } from "../../config/env";
import { logger } from "../../core/logging/logger";
import { normalizePhoneNumber } from "../../core/utils/phone-utils";
import { WaOptOutModel } from "./models/wa-opt-out.model";
import {
  MessageQueueModel,
  BulkMessagingModel,
  WhatsAppLogModel,
  WAConversationModel,
  WAMessageModel,
} from "./models";
import type { ErrorCategory } from "./models/message-queue.model";
import type { MessageDirection } from "./types";
import { META_ERROR_CODES } from "./types";

/**
 * Status progression order for preventing backwards updates
 * sent(1) → delivered(2) → read(3)
 */
const STATUS_ORDER = { sent: 1, delivered: 2, read: 3 } as const;

/**
 * Meta message type mapping to our internal types
 */
const MESSAGE_TYPE_MAP = {
  text: "text",
  image: "image",
  video: "video",
  document: "document",
  audio: "audio",
  sticker: "sticker",
  location: "location",
  reaction: "reaction",
  interactive: "interactive",
} as const;

// ═══════════════════════════════════════════════════════════
// WEBHOOK VERIFICATION (One-time setup)
// ═══════════════════════════════════════════════════════════

/**
 * Verifies webhook with Meta (called once during webhook setup)
 *
 * When you configure the webhook URL in Meta Business Manager,
 * Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge.
 * We verify the token matches our WHATSAPP_WEBHOOK_VERIFY_TOKEN and echo back the challenge.
 *
 * @param req - Express request with query params from Meta
 * @param res - Express response to return challenge
 */
export const verifyWebhook = (req: Request, res: Response): void => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    logger.info("[WhatsApp Webhook] Verification successful");
    res.status(200).send(challenge);
    return;
  }

  logger.error("[WhatsApp Webhook] Verification failed", {
    mode,
    tokenMatch: token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  });
  res.status(403).send("Forbidden");
};

// ═══════════════════════════════════════════════════════════
// SIGNATURE VALIDATION (Security)
// ═══════════════════════════════════════════════════════════

/**
 * Validates HMAC signature sent by Meta to prevent webhook spoofing
 *
 * Meta signs each webhook request with your WHATSAPP_APP_SECRET.
 * We compute the expected signature and compare using timing-safe comparison.
 *
 * IMPORTANT: This requires the raw request body (Buffer) to compute the correct signature.
 * The webhook route uses express.raw() middleware to preserve the raw body.
 *
 * @param rawBody - Raw request body as Buffer
 * @param signature - x-hub-signature-256 header value from Meta
 * @returns true if signature is valid or APP_SECRET not configured (dev mode)
 */
const validateSignature = (rawBody: Buffer, signature: string | undefined): boolean => {
  const appSecret = env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    if (env.NODE_ENV === "production") {
      logger.error("[WhatsApp Webhook] WHATSAPP_APP_SECRET not configured in production — rejecting request");
      return false;
    }
    logger.warn("[WhatsApp Webhook] APP_SECRET not configured, skipping signature validation (dev only)");
    return true;
  }

  if (!signature) {
    logger.error("[WhatsApp Webhook] Missing x-hub-signature-256 header");
    return false;
  }

  const expectedSignature =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    logger.error("[WhatsApp Webhook] Signature validation error", { error: err });
    return false;
  }
};

// ═══════════════════════════════════════════════════════════
// MAIN WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════

/**
 * Main webhook handler for all Meta notifications
 *
 * Processes:
 * - value.statuses[] → delivery status updates (sent/delivered/read/failed)
 * - value.messages[] → incoming messages from customers
 *
 * Response Strategy:
 * - Respond with 200 OK immediately (Meta times out after 20 seconds)
 * - Process updates asynchronously after response sent
 * - Log errors but don't crash (Meta will retry failed webhooks)
 *
 * Body Parsing:
 * - req.body is a Buffer because we use express.raw() middleware
 * - We validate the signature on the raw buffer first
 * - Then parse JSON manually after validation
 *
 * @param req - Express request with raw webhook payload (Buffer)
 * @param res - Express response (return 200 immediately)
 */
export const handleStatusUpdate = async (req: Request, res: Response): Promise<void> => {
  // IMPORTANT: Respond immediately before processing (Meta 20s timeout)
  res.status(200).send("OK");

  // Get raw body buffer (from express.raw() middleware)
  const rawBody = req.body as Buffer;
  const signature = req.headers["x-hub-signature-256"] as string | undefined;

  // Validate HMAC signature using raw body
  if (!validateSignature(rawBody, signature)) {
    logger.error("[WhatsApp Webhook] Invalid signature, ignoring payload");
    return;
  }

  // Parse JSON after signature validation
  let body: any;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    logger.error("[WhatsApp Webhook] Failed to parse JSON payload", { error: err });
    return;
  }

  try {
    const entries = body?.entry || [];

    const io = req.app.get("io");

    for (const entry of entries) {
      const changes = entry?.changes || [];

      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        // ─── Process Delivery Status Updates ───────────────
        const statuses = value.statuses || [];
        for (const statusUpdate of statuses) {
          await processStatusUpdate(statusUpdate, io);
        }

        // ─── Process Incoming Messages ─────────────────────
        const messages = value.messages || [];
        const contacts = value.contacts || [];
        for (const msg of messages) {
          // Handle opt-out keywords (STOP, UNSUBSCRIBE, etc.)
          if (msg.type === "text" && msg.text?.body) {
            await handleOptOut(msg.from, msg.text.body);
          }

          // Store in WhatsApp Inbox (WAConversation + WAMessage)
          await processIncomingMessage(msg, contacts, value.metadata, io);
        }
      }
    }
  } catch (err) {
    logger.error("[WhatsApp Webhook] Processing error", { error: err });
  }
};

// ═══════════════════════════════════════════════════════════
// STATUS UPDATE PROCESSING
// ═══════════════════════════════════════════════════════════

/**
 * Processes a single message status update from Meta
 *
 * Updates multiple models to keep stats in sync:
 * 1. MessageQueue - individual message status for worker retry logic
 * 2. BulkMessaging - aggregate stats (sent/delivered/read/failed counts)
 * 3. WhatsAppLog - audit trail
 * 4. WAMessage - inbox message status for UI display
 *
 * Status Lifecycle:
 * pending → sent → delivered → read
 *                  ↓
 *                failed (permanent errors only update if status < delivered)
 *
 * @param statusUpdate - Status update object from Meta webhook
 * @param io - Socket.IO instance for real-time updates
 */
const processStatusUpdate = async (statusUpdate: any, io: any): Promise<void> => {
  const { id: messageId, status, timestamp, errors } = statusUpdate;
  if (!messageId || !status) return;

  try {
    // ─── Update MessageQueue (worker queue) ────────────────
    const queueMsg = await MessageQueueModel.findOne({ messageId });

    if (queueMsg) {
      const currentOrder = STATUS_ORDER[queueMsg.status as keyof typeof STATUS_ORDER] || 0;
      const newOrder = STATUS_ORDER[status as keyof typeof STATUS_ORDER] || 0;

      if (status === "failed") {
        // Failed status handling
        const errorCode = errors?.[0]?.code || null;
        const errorTitle = errors?.[0]?.title || "Unknown error";
        const category = classifyError(errorCode);

        // Only update to failed if not yet delivered (prevent overwriting successful delivery)
        if (currentOrder < 2) {
          const prevStatus = queueMsg.status;
          await MessageQueueModel.findByIdAndUpdate(queueMsg._id, {
            $set: {
              status: "failed",
              error: errorTitle,
              errorCode,
              errorCategory: category,
              failedAt: new Date(parseInt(timestamp) * 1000),
            },
          });

          // Adjust BulkMessaging stats (decrement sent, increment failed)
          if (prevStatus === "sent") {
            await BulkMessagingModel.findByIdAndUpdate(queueMsg.bulkMessagingId, {
              $inc: { "stats.sent": -1, "stats.failed": 1 },
            });
          }
        }
      } else if (newOrder > currentOrder) {
        // Progressive status update (sent → delivered → read)
        const updateData: any = { status };
        const incData: Record<string, number> = {};

        if (status === "sent" && !queueMsg.sentAt) {
          updateData.sentAt = new Date(parseInt(timestamp) * 1000);
        }
        if (status === "delivered") {
          updateData.deliveredAt = new Date(parseInt(timestamp) * 1000);
          if (queueMsg.status === "sent") {
            incData["stats.sent"] = -1;
            incData["stats.delivered"] = 1;
          }
        }
        if (status === "read") {
          updateData.readAt = new Date(parseInt(timestamp) * 1000);
          if (queueMsg.status === "delivered") {
            incData["stats.delivered"] = -1;
            incData["stats.read"] = 1;
          } else if (queueMsg.status === "sent") {
            incData["stats.sent"] = -1;
            incData["stats.read"] = 1;
          }
        }

        await MessageQueueModel.findByIdAndUpdate(queueMsg._id, { $set: updateData });

        if (Object.keys(incData).length > 0) {
          await BulkMessagingModel.findByIdAndUpdate(queueMsg.bulkMessagingId, {
            $inc: incData,
          });
        }
      }
    }

    // ─── Update WhatsAppLog (audit trail) ──────────────────
    const whatsappLog = await WhatsAppLogModel.findOne({ messageId });
    if (whatsappLog) {
      const updateFields: any = { status };
      if (status === "failed" && errors?.[0]) {
        updateFields.error = errors[0].title || "Unknown error";
        updateFields.errorCode = errors[0].code || null;
      }
      await WhatsAppLogModel.findByIdAndUpdate(whatsappLog._id, { $set: updateFields });
    }

    // ─── Update WAMessage (inbox UI) ───────────────────────
    const waMsg = await WAMessageModel.findOne({ waMessageId: messageId });
    if (waMsg) {
      const waStatusUpdate: any = {};
      const tsDate = new Date(parseInt(timestamp) * 1000);

      if (status === "sent") {
        waStatusUpdate.status = "sent";
        waStatusUpdate["statusTimestamps.sentAt"] = tsDate;
      } else if (status === "delivered") {
        waStatusUpdate.status = "delivered";
        waStatusUpdate["statusTimestamps.deliveredAt"] = tsDate;
      } else if (status === "read") {
        waStatusUpdate.status = "read";
        waStatusUpdate["statusTimestamps.readAt"] = tsDate;
      } else if (status === "failed") {
        waStatusUpdate.status = "failed";
        waStatusUpdate["statusTimestamps.failedAt"] = tsDate;
        waStatusUpdate.error = errors?.[0]?.title || "Unknown error";
      }

      if (Object.keys(waStatusUpdate).length > 0) {
        await WAMessageModel.findByIdAndUpdate(waMsg._id, { $set: waStatusUpdate });

        // Emit real-time Socket.IO event to admin panel inbox
        if (io) {
          io.to("whatsapp_inbox_admin").emit("wa_status_update", {
            conversationId: waMsg.conversationId,
            waMessageId: messageId,
            status,
          });
        }
      }
    }
  } catch (err) {
    logger.error(`[WhatsApp Webhook] Error processing status for ${messageId}`, { error: err });
  }
};

// ═══════════════════════════════════════════════════════════
// INCOMING MESSAGE PROCESSING
// ═══════════════════════════════════════════════════════════

/**
 * Extracts message content from Meta webhook payload
 *
 * Different message types have different content structures:
 * - text: msg.text.body
 * - image/video/document: mediaUrl (Meta ID), caption, mimeType
 * - location: latitude, longitude, name
 * - reaction: emoji
 * - interactive: button_reply or list_reply title
 *
 * @param msg - Message object from Meta webhook
 * @returns { type, content } - Normalized message type and content object
 */
const extractMessageContent = (msg: any): { type: string; content: Record<string, any> } => {
  const content: Record<string, any> = {};
  const type = MESSAGE_TYPE_MAP[msg.type as keyof typeof MESSAGE_TYPE_MAP] || "unsupported";

  switch (msg.type) {
    case "text":
      content.text = msg.text?.body || "";
      break;
    case "image":
      content.text = msg.image?.caption || "";
      content.mediaUrl = msg.image?.id || "";
      content.mimeType = msg.image?.mime_type || "";
      break;
    case "video":
      content.text = msg.video?.caption || "";
      content.mediaUrl = msg.video?.id || "";
      content.mimeType = msg.video?.mime_type || "";
      break;
    case "document":
      content.text = msg.document?.caption || "";
      content.mediaUrl = msg.document?.id || "";
      content.mimeType = msg.document?.mime_type || "";
      content.filename = msg.document?.filename || "";
      break;
    case "audio":
      content.mediaUrl = msg.audio?.id || "";
      content.mimeType = msg.audio?.mime_type || "";
      break;
    case "sticker":
      content.mediaUrl = msg.sticker?.id || "";
      content.mimeType = msg.sticker?.mime_type || "";
      break;
    case "location":
      content.latitude = msg.location?.latitude;
      content.longitude = msg.location?.longitude;
      content.text = msg.location?.name || "";
      break;
    case "reaction":
      content.text = msg.reaction?.emoji || "";
      break;
    case "interactive":
      const interactive = msg.interactive;
      if (interactive?.type === "button_reply") {
        content.text = interactive.button_reply?.title || "";
      } else if (interactive?.type === "list_reply") {
        content.text = interactive.list_reply?.title || "";
      }
      break;
    default:
      content.text = "[Unsupported message type]";
  }

  return { type, content };
};

/**
 * Processes an incoming message from a customer
 *
 * Flow:
 * 1. Normalize phone number
 * 2. Check for duplicate (waMessageId already exists)
 * 3. Upsert WAConversation (create if new, update lastMessage)
 * 4. Create WAMessage
 * 5. Link campaigns (find if this phone was targeted by any bulk messaging)
 * 6. Emit Socket.IO event for real-time inbox update
 *
 * @param msg - Message object from Meta webhook
 * @param contacts - Contact info from Meta (profile name)
 * @param metadata - Metadata from Meta (phone number ID, display phone)
 * @param io - Socket.IO instance for real-time updates
 */
const processIncomingMessage = async (
  msg: any,
  contacts: any[],
  metadata: any,
  io: any
): Promise<void> => {
  try {
    const phone = normalizePhone(msg.from);
    if (!phone) return;

    const contactName = contacts?.[0]?.profile?.name || "";
    const msgTimestamp = new Date(parseInt(msg.timestamp) * 1000);
    const { type, content } = extractMessageContent(msg);

    // Deduplication: check if this waMessageId already exists
    const existing = await WAMessageModel.findOne({ waMessageId: msg.id });
    if (existing) {
      logger.debug(`[WhatsApp Inbox] Duplicate message ${msg.id}, skipping`);
      return;
    }

    // ─── Upsert Conversation ───────────────────────────────
    const conversation = await WAConversationModel.findOneAndUpdate(
      { phoneNumber: phone },
      {
        $set: {
          contactName: contactName || undefined,
          lastMessage: {
            content: content.text || `[${type}]`,
            direction: "inbound" as MessageDirection,
            type,
            timestamp: msgTimestamp,
          },
          lastMessageAt: msgTimestamp,
          lastInboundAt: msgTimestamp,
          "metadata.waId": msg.from,
        },
        $inc: { unreadCount: 1 },
        $setOnInsert: {
          phoneNumber: phone,
          status: "active",
          campaignIds: [],
        },
      },
      { upsert: true, new: true }
    );

    // ─── Resolve Reply Context ─────────────────────────────
    // If this message is a reply to another message, link it
    let replyToId: mongoose.Types.ObjectId | null = null;
    const replyToWaMessageId = msg.context?.id || null;
    if (replyToWaMessageId) {
      const replyMsg = await WAMessageModel.findOne({ waMessageId: replyToWaMessageId });
      if (replyMsg) replyToId = replyMsg._id as mongoose.Types.ObjectId;
    }

    // ─── Create Message ────────────────────────────────────
    const waMessage = await WAMessageModel.create({
      conversationId: conversation._id,
      waMessageId: msg.id,
      direction: "inbound",
      type,
      content,
      replyToWaMessageId,
      replyToId,
      status: "delivered",
      statusTimestamps: { deliveredAt: msgTimestamp },
      timestamp: msgTimestamp,
    });

    // ─── Link Campaigns ────────────────────────────────────
    // Find if this phone number was targeted by any bulk messaging campaign
    try {
      const queueEntries = await MessageQueueModel.find(
        { phoneNumber: phone },
        { bulkMessagingId: 1 }
      ).lean();

      if (queueEntries.length > 0) {
        const bmIds = [...new Set(queueEntries.map((q) => String(q.bulkMessagingId)))];
        const bms = await BulkMessagingModel.find(
          { _id: { $in: bmIds } },
          { campaignId: 1 }
        ).lean();

        const campaignIds = [...new Set(bms.map((b) => b.campaignId).filter(Boolean))];
        if (campaignIds.length > 0) {
          await WAConversationModel.findByIdAndUpdate(conversation._id, {
            $addToSet: { campaignIds: { $each: campaignIds } },
          });
        }
      }
    } catch (linkErr) {
      logger.error("[WhatsApp Inbox] Campaign link error", { error: linkErr });
    }

    // ─── Emit Socket.IO Event ──────────────────────────────
    // Real-time update to admin panel inbox
    if (io) {
      io.to("whatsapp_inbox_admin").emit("wa_new_message", {
        conversationId: conversation._id,
        message: waMessage.toObject(),
        conversation: {
          _id: conversation._id,
          phoneNumber: conversation.phoneNumber,
          contactName: conversation.contactName,
          lastMessage: {
            content: content.text || `[${type}]`,
            direction: "inbound",
            type,
            timestamp: msgTimestamp,
          },
          lastMessageAt: msgTimestamp,
          unreadCount: conversation.unreadCount,
        },
      });
    }

    logger.info(`[WhatsApp Inbox] Processed incoming message from ${phone}`);
  } catch (err) {
    logger.error("[WhatsApp Inbox] Error processing incoming message", { error: err });
  }
};

// ═══════════════════════════════════════════════════════════
// OPT-OUT HANDLING
// ═══════════════════════════════════════════════════════════

/**
 * Handles opt-out keywords (STOP, UNSUBSCRIBE, OPT OUT, OPTOUT)
 *
 * When a user sends these keywords, we persist the opt-out to WaOptOut collection.
 * MARKETING templates will check this collection before sending.
 * UTILITY and AUTHENTICATION templates can still be sent.
 *
 * @param phoneNumber - User's phone number (normalized format)
 * @param messageText - Message text to check for opt-out keywords
 */
const handleOptOut = async (phoneNumber: string, messageText: string): Promise<void> => {
  const textUpper = messageText.trim().toUpperCase();
  const optOutKeywords = ["STOP", "UNSUBSCRIBE", "OPT OUT", "OPTOUT"];

  if (!optOutKeywords.includes(textUpper)) return;

  try {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) return;

    await WaOptOutModel.updateOne(
      { phone: normalized, clientCode: env.CLIENT_CODE },
      { $set: { optedOutAt: new Date(), keyword: textUpper } },
      { upsert: true }
    );

    logger.info(`[WhatsApp Webhook] Recorded opt-out for ${normalized} (keyword: ${textUpper})`);
  } catch (err) {
    logger.error(`[WhatsApp Webhook] Opt-out persistence error for ${phoneNumber}`, { error: err });
  }
};

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

const normalizePhone = normalizePhoneNumber;

/**
 * Classifies Meta API error code into category for retry logic
 *
 * Categories:
 * - permanent: Don't retry (invalid phone, template not exists, etc.)
 * - policy: Don't retry, flag for review (spam, rate limit, policy violation)
 * - rate_limit: Back off and retry (rate limit hit, too many messages)
 * - transient: Retry with backoff (temporary error, internal error, etc.)
 *
 * See: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
 *
 * @param errorCode - Meta API error code
 * @returns Error category for retry strategy
 */
const classifyError = (errorCode: number | null): ErrorCategory => {
  if (!errorCode) return "transient";

  const code = Number(errorCode);

  // Permanent errors (don't retry)
  const permanent = [
    META_ERROR_CODES.INVALID_PHONE_NUMBER,
    META_ERROR_CODES.PHONE_NOT_WHATSAPP,
    META_ERROR_CODES.TEMPLATE_PARAM_COUNT_MISMATCH,
    META_ERROR_CODES.TEMPLATE_NOT_EXISTS,
    META_ERROR_CODES.RECIPIENT_UNAVAILABLE,
  ] as number[];
  if (permanent.includes(code)) return "permanent";

  // Policy errors (don't retry, flag for review)
  const policy = [META_ERROR_CODES.POLICY_VIOLATION, META_ERROR_CODES.SPAM_RATE_LIMIT] as number[];
  if (policy.includes(code)) return "policy";

  // Rate limit errors (back off and retry)
  const rateLimit = [
    META_ERROR_CODES.RATE_LIMIT_HIT,
    META_ERROR_CODES.TOO_MANY_MESSAGES,
    META_ERROR_CODES.CLOUD_API_RATE_LIMIT,
  ] as number[];
  if (rateLimit.includes(code)) return "rate_limit";

  // Transient errors (retry with backoff)
  const transient = [
    META_ERROR_CODES.TEMPORARY_ERROR,
    META_ERROR_CODES.TEMPLATE_PAUSED,
    META_ERROR_CODES.MEDIA_DOWNLOAD_ERROR,
    META_ERROR_CODES.INTERNAL_ERROR,
    META_ERROR_CODES.GENERIC_ERROR,
  ] as number[];
  if (transient.includes(code)) return "transient";

  // Default to transient for unknown errors
  return "transient";
};
