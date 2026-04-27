/**
 * WhatsApp Conversation Model
 *
 * Represents a 2-way WhatsApp chat between the business and a user.
 * Each conversation is identified by phone number and contains a history
 * of messages exchanged.
 *
 * How It Works:
 * 1. Inbound message arrives via Meta webhook → create/update conversation
 * 2. Admin replies from inbox → update conversation.lastMessage
 * 3. Real-time updates via Socket.IO to admin panel
 * 4. 24-hour service window tracking for free-text replies
 *
 * Use Cases:
 * - Customer support inbox
 * - Marketing campaign replies
 * - Two-way communication with broadcast recipients
 * - Opt-out management
 *
 * Key Features:
 * - Links to campaigns that messaged this user
 * - Unread counter for admin notifications
 * - Last inbound timestamp for 24h window check
 * - Contact name from Meta profile
 *
 * Database Collection: WA-Conversations
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Message Direction
 * Note: This type is also exported from message.model.ts
 * Import from message.model.ts for canonical definition
 */
export type MessageDirection = "inbound" | "outbound";

/**
 * Conversation Status
 */
export type ConversationStatus = "active" | "archived";

/**
 * Last Message Summary
 * Stored directly in conversation for quick list rendering
 */
export interface LastMessage {
  /** Message content text or media description */
  content: string;

  /** Who sent it */
  direction: MessageDirection;

  /** Message type (text, image, video, etc.) */
  type: string;

  /** When it was sent */
  timestamp: Date;
}

/**
 * Conversation Metadata
 * Additional WhatsApp-specific fields
 */
export interface ConversationMetadata {
  /** WhatsApp ID from Meta (different from phone number) */
  waId?: string;
}

/**
 * WhatsApp Conversation Document Interface
 */
export interface WAConversationDocument extends Document {
  /**
   * User's phone number (normalized format: 91XXXXXXXXXX)
   * Unique identifier for the conversation
   */
  phoneNumber: string;

  /**
   * Contact display name
   * Synced from Meta profile or user's name in your database
   */
  contactName?: string;

  /** Last message summary for conversation list preview */
  lastMessage?: LastMessage;

  /** Timestamp of last message (inbound or outbound) */
  lastMessageAt: Date;

  /**
   * Timestamp of last INBOUND message
   * Used to calculate 24-hour service window for free-text replies
   * If null or > 24 hours ago, must use template message
   */
  lastInboundAt?: Date;

  /** Unread message count (admin hasn't viewed) */
  unreadCount: number;

  /**
   * Campaign IDs that sent messages to this user
   * Links inbox conversations back to marketing campaigns
   * Plain ObjectIds, no cross-database populate
   */
  campaignIds: mongoose.Types.ObjectId[];

  /** Conversation status */
  status: ConversationStatus;

  /** Additional WhatsApp metadata */
  metadata: ConversationMetadata;

  /** Auto-generated timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WhatsApp Conversation Schema Definition
 */
const WAConversationSchema = new Schema<WAConversationDocument>(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 20,
    },
    contactName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200,
    },
    lastMessage: {
      content: { type: String, default: "", maxlength: 500 },
      direction: { type: String, enum: ["inbound", "outbound"] },
      type: { type: String, default: "text", maxlength: 50 },
      timestamp: { type: Date },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastInboundAt: {
      type: Date,
      default: null,
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    campaignIds: [{ type: Schema.Types.ObjectId }],
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    metadata: {
      waId: { type: String, default: "", maxlength: 100 },
    },
  },
  {
    timestamps: true,
    collection: "WA-Conversations",
  }
);

/**
 * Indexes for query optimization
 *
 * 1. phoneNumber unique: One conversation per phone number
 */
WAConversationSchema.index({ phoneNumber: 1 }, { unique: true });

/**
 * 2. Conversation list: Active conversations, newest message first
 */
WAConversationSchema.index({ status: 1, lastMessageAt: -1 });

/**
 * 3. Campaign filter: Show conversations from specific campaign
 */
WAConversationSchema.index({ campaignIds: 1 });

/**
 * 4. Recent inbound: Find conversations with recent inbound messages
 *    Used for 24h service window checks
 */
WAConversationSchema.index({ lastInboundAt: -1 });

/**
 * 5. Unread conversations: Inbox notification badge
 */
WAConversationSchema.index({ status: 1, unreadCount: 1 });

/**
 * Export the WAConversation model
 */
export const WAConversationModel =
  mongoose.models.WAConversation ??
  mongoose.model<WAConversationDocument>("WAConversation", WAConversationSchema);
