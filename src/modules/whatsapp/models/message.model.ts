/**
 * WhatsApp Message Model
 *
 * Individual messages within a WhatsApp conversation (inbox feature).
 * Stores both inbound (user → business) and outbound (business → user) messages.
 *
 * Message Types Supported:
 * - text: Plain text message
 * - image: Photo with optional caption
 * - video: Video with optional caption
 * - document: PDF, DOCX, etc. with filename
 * - audio: Voice message or audio file
 * - sticker: WhatsApp sticker
 * - location: GPS coordinates
 * - reaction: Emoji reaction to another message
 * - interactive: Button/list replies
 * - template: Outbound template message
 * - unsupported: Unknown message type from Meta
 *
 * Database Collection: WA-Messages
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Message Direction
 */
export type MessageDirection = "inbound" | "outbound";

/**
 * Message Type
 */
export type MessageType =
  | "text"
  | "image"
  | "video"
  | "document"
  | "audio"
  | "sticker"
  | "location"
  | "reaction"
  | "interactive"
  | "template"
  | "unsupported";

/**
 * Message Status (for outbound messages)
 * Inbound messages are always "delivered" by default
 */
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";

/**
 * Message Content Structure
 * Polymorphic based on message type
 */
export interface MessageContent {
  /** Text content (for text messages or captions) */
  text?: string;

  /** Media URL or Meta media ID */
  mediaUrl?: string;

  /** MIME type (image/jpeg, video/mp4, etc.) */
  mimeType?: string;

  /** Original filename (for documents) */
  filename?: string;

  /** GPS latitude (for location messages) */
  latitude?: number;

  /** GPS longitude (for location messages) */
  longitude?: number;

  /** Template name (for outbound template messages) */
  templateName?: string;

  /** Template resolved data (for reference) */
  templateData?: Record<string, any>;
}

/**
 * Status Timestamps
 * Tracks message delivery lifecycle
 */
export interface StatusTimestamps {
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
}

/**
 * WhatsApp Message Document Interface
 */
export interface WAMessageDocument extends Document {
  /**
   * Parent conversation
   * Reference to WAConversation model
   */
  conversationId: mongoose.Types.ObjectId;

  /**
   * Meta's message ID
   * - For inbound: ID from webhook
   * - For outbound: ID returned by Meta API
   * Used for webhook correlation and reply threading
   */
  waMessageId?: string;

  /** Who sent this message */
  direction: MessageDirection;

  /** Message content type */
  type: MessageType;

  /** Message content (polymorphic based on type) */
  content: MessageContent;

  /**
   * Reply context
   * If this message is a reply, these fields link to parent message
   */
  replyToWaMessageId?: string;
  replyToId?: mongoose.Types.ObjectId;

  /** Delivery status (primarily for outbound messages) */
  status: MessageStatus;

  /** Timestamps for status transitions */
  statusTimestamps: StatusTimestamps;

  /** Error message if send/delivery failed */
  error?: string;

  /**
   * Who sent this outbound message (admin email/user ID)
   * For inbound messages, this is null
   */
  sentBy?: string;

  /** When the message was created/received */
  timestamp: Date;

  /** Auto-generated timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WhatsApp Message Schema Definition
 */
const WAMessageSchema = new Schema<WAMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "WAConversation",
      required: true,
      index: true,
    },
    waMessageId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "text",
        "image",
        "video",
        "document",
        "audio",
        "sticker",
        "location",
        "reaction",
        "interactive",
        "template",
        "unsupported",
      ],
      default: "text",
    },
    content: {
      text: { type: String, default: "", maxlength: 4000 },
      mediaUrl: { type: String, maxlength: 500 },
      mimeType: { type: String, maxlength: 100 },
      filename: { type: String, maxlength: 255 },
      latitude: { type: Number },
      longitude: { type: Number },
      templateName: { type: String, maxlength: 100 },
      templateData: { type: Schema.Types.Mixed },
    },
    replyToWaMessageId: {
      type: String,
      default: null,
      maxlength: 100,
    },
    replyToId: {
      type: Schema.Types.ObjectId,
      ref: "WAMessage",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read", "failed"],
      default: "sent",
      index: true,
    },
    statusTimestamps: {
      sentAt: { type: Date },
      deliveredAt: { type: Date },
      readAt: { type: Date },
      failedAt: { type: Date },
    },
    error: {
      type: String,
      default: null,
      maxlength: 500,
    },
    sentBy: {
      type: String,
      default: null,
      maxlength: 200,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "WA-Messages",
  }
);

/**
 * Indexes for query optimization
 *
 * 1. Conversation messages: Get all messages in a conversation, newest first
 */
WAMessageSchema.index({ conversationId: 1, timestamp: -1 });

/**
 * 2. waMessageId lookup: Webhook correlation
 *    Sparse and unique because only sent messages have waMessageId
 */
WAMessageSchema.index({ waMessageId: 1 }, { sparse: true, unique: true });

/**
 * 3. Reply threading: Find original message for reply context
 */
WAMessageSchema.index({ replyToWaMessageId: 1 }, { sparse: true });

/**
 * 4. Status filtering: Find all failed outbound messages
 */
WAMessageSchema.index({ direction: 1, status: 1, timestamp: -1 });

/**
 * Export the WAMessage model
 */
export const WAMessageModel =
  mongoose.models.WAMessage ??
  mongoose.model<WAMessageDocument>("WAMessage", WAMessageSchema);
