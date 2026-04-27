/**
 * WhatsApp Log Model
 *
 * Audit log for all WhatsApp messages sent by the system.
 * Provides a flat, append-only record of every message attempt,
 * separate from the MessageQueue which gets updated/deleted.
 *
 * Use Cases:
 * - Compliance and audit trail
 * - Cost tracking and billing
 * - Debugging delivery issues
 * - Analytics and reporting
 * - User communication history
 *
 * Key Differences from MessageQueue:
 * - MessageQueue: Operational, gets updated with status changes
 * - WhatsAppLog: Audit trail, immutable after creation
 * - Both are populated simultaneously for redundancy
 *
 * Database Collection: BM-WhatsAppLogs
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Related Model Types
 * Links log entries to their originating context
 */
export type RelatedModel = "ConnectionRequest" | "Meeting" | "BulkMessaging";

/**
 * Message Status (simplified from MessageQueue)
 */
export type LogMessageStatus = "sent" | "delivered" | "read" | "failed";

/**
 * Related Entity Reference
 * Tracks what triggered this WhatsApp message
 */
export interface RelatedTo {
  /** Type of entity that triggered this message */
  model: RelatedModel;

  /** Entity ID */
  id: mongoose.Types.ObjectId;
}

/**
 * WhatsApp Log Document Interface
 */
export interface WhatsAppLogDocument extends Document {
  /**
   * Recipient user ID
   * TODO: CHANGE THIS - Update ref to match your user model
   */
  userId?: mongoose.Types.ObjectId;

  /** Recipient phone number (normalized format: 91XXXXXXXXXX) */
  phoneNumber: string;

  /** Template name that was sent */
  templateName: string;

  /**
   * What triggered this message
   * Example: { model: "BulkMessaging", id: "507f1f77bcf86cd799439011" }
   */
  relatedTo?: RelatedTo;

  /**
   * Meta's message ID (if successfully sent)
   * Used to correlate with webhook updates
   */
  messageId?: string;

  /** Final status of this message */
  status: LogMessageStatus;

  /** Error message if send/delivery failed */
  error?: string;

  /** Meta API error code (numeric) */
  errorCode?: number;

  /** Cost to send this message */
  cost: number;

  /** When the message was sent */
  sentAt: Date;

  /** Auto-generated timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WhatsApp Log Schema Definition
 */
const WhatsAppLogSchema = new Schema<WhatsAppLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "RegisteredUser", // TODO: CHANGE THIS
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    templateName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    relatedTo: {
      model: {
        type: String,
        enum: ["ConnectionRequest", "Meeting", "BulkMessaging"],
      },
      id: { type: Schema.Types.ObjectId },
    },
    messageId: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
      index: true,
    },
    error: {
      type: String,
      maxlength: 500,
    },
    errorCode: {
      type: Number,
      default: null,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    sentAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "BM-WhatsAppLogs",
    strict: false, // Allow additional fields for flexibility
  }
);

/**
 * Indexes for query optimization
 *
 * 1. messageId lookup: Webhook correlates updates by messageId
 */
WhatsAppLogSchema.index({ messageId: 1 }, { sparse: true });

/**
 * 2. User history: "Show all messages sent to this user"
 */
WhatsAppLogSchema.index({ userId: 1, sentAt: -1 });

/**
 * 3. Phone number history: For non-registered users
 */
WhatsAppLogSchema.index({ phoneNumber: 1, sentAt: -1 });

/**
 * 4. Related entity: "Show all messages for this bulk messaging"
 */
WhatsAppLogSchema.index({ "relatedTo.model": 1, "relatedTo.id": 1 });

/**
 * 5. Date range queries: Reporting and analytics
 */
WhatsAppLogSchema.index({ sentAt: -1 });

/**
 * 6. Status reporting: Count failed/sent messages
 */
WhatsAppLogSchema.index({ status: 1, sentAt: -1 });

/**
 * Export the WhatsAppLog model
 */
export const WhatsAppLogModel =
  mongoose.models.WhatsAppLog ??
  mongoose.model<WhatsAppLogDocument>("WhatsAppLog", WhatsAppLogSchema);
