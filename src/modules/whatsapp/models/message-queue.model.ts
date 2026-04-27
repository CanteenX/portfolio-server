/**
 * Message Queue Model
 *
 * Individual WhatsApp messages ready to be sent via Meta API.
 * Each bulk messaging creates thousands of MessageQueue documents,
 * one per recipient. The worker processes this queue in batches.
 *
 * Workflow:
 * 1. Bulk messaging starts → creates MessageQueue docs with status "pending"
 * 2. Worker cron (every 10s) picks batch of 20 pending messages
 * 3. Worker atomically locks messages (prevents duplicate sends)
 * 4. Worker calls Meta API for each message
 * 5. Worker updates status to "sent" or "failed"
 * 6. Meta webhook updates status to "delivered" or "read"
 *
 * Key Features:
 * - Atomic locking mechanism prevents duplicate sends
 * - Retry logic with exponential backoff for transient failures
 * - Error classification (transient/permanent/rate_limit/policy)
 * - Stores pre-resolved Meta API components (ready to send)
 * - Deduplication: one message per user per bulk messaging
 *
 * Database Collection: BM-MessageQueue
 *
 * IMPORTANT Performance Note:
 * This collection can grow very large (millions of documents).
 * Indexes are critical for query performance. The worker relies on
 * the compound index (status, nextRetryAt, lockedAt) for efficient polling.
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Message Status Lifecycle:
 * - pending: Queued, waiting for worker to pick up
 * - processing: Worker has locked this message and is sending
 * - sent: Successfully sent to Meta API (confirmed by Meta)
 * - delivered: Delivered to recipient's device (webhook update)
 * - read: Opened by recipient (webhook update)
 * - failed: Send/delivery failed (permanent or retry exhausted)
 * - skipped: Intentionally skipped (e.g., invalid phone number)
 */
export type MessageStatus = "pending" | "processing" | "sent" | "delivered" | "read" | "failed" | "skipped";

/**
 * Error Categories for Retry Logic
 * - transient: Temporary issue, worth retrying (e.g., network timeout)
 * - permanent: Will never succeed, don't retry (e.g., invalid phone number)
 * - rate_limit: Hit Meta API rate limit, back off and retry
 * - policy: Meta policy violation, don't retry (e.g., spam detected)
 */
export type ErrorCategory = "transient" | "permanent" | "rate_limit" | "policy";

/**
 * Message Queue Document Interface
 */
export interface MessageQueueDocument extends Document {
  /**
   * Parent bulk messaging run
   * Reference to BulkMessaging model
   */
  bulkMessagingId: mongoose.Types.ObjectId;

  /**
   * Recipient user ID
   * TODO: CHANGE THIS - Update ref to match your user model
   * Currently references "RegisteredUser" from BusinessMeet
   */
  userId: mongoose.Types.ObjectId;

  /**
   * Recipient phone number in normalized format
   * Example: "919876543210" (country code + number, no spaces/dashes)
   */
  phoneNumber: string;

  /**
   * Meta template name to send
   * Example: "welcome_message" or "renewal_reminder"
   * Must match a APPROVED template in Meta Business Manager
   */
  templateName: string;

  /**
   * Template language code
   * Example: "en_US", "en", "hi", "es"
   */
  templateLanguage: string;

  /**
   * Pre-resolved Meta API components
   * This is the exact payload sent to Meta's /messages endpoint
   * Stored here to avoid re-resolving variables on every retry
   *
   * Example:
   * [
   *   {
   *     type: "body",
   *     parameters: [
   *       { type: "text", text: "John Doe" },
   *       { type: "text", text: "Acme Corp" }
   *     ]
   *   }
   * ]
   */
  components: Array<Record<string, any>>;

  /** Current message status */
  status: MessageStatus;

  /**
   * Meta's message ID (returned after successful send)
   * Used to track delivery/read status via webhook
   */
  messageId?: string;

  /** Error message if send/delivery failed */
  error?: string;

  /** Meta API error code (numeric code from error response) */
  errorCode?: number;

  /** Classified error category for retry logic */
  errorCategory?: ErrorCategory;

  /** How many times we've tried to send this message */
  retryCount: number;

  /** Maximum retry attempts (default 3) */
  maxRetries: number;

  /** When to retry next (null if no retry scheduled) */
  nextRetryAt?: Date;

  /** Last time we attempted to send */
  lastAttemptAt?: Date;

  /** Timestamps for status transitions */
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;

  /**
   * Processing Lock Mechanism
   * Prevents multiple workers from picking the same message
   *
   * Worker process:
   * 1. Find pending message WHERE lockedAt IS NULL
   * 2. Atomically set lockedAt = NOW, lockedBy = worker_instance_id
   * 3. Send message
   * 4. Update status and clear lock
   *
   * Stale lock cleanup cron (every 5 min) resets locks older than 2 minutes
   */
  lockedAt?: Date;

  /** Worker instance ID that locked this message (UUID) */
  lockedBy?: string;

  /**
   * Cost to send this message (in currency units)
   * Calculated based on template type, destination, etc.
   */
  cost: number;

  /** Auto-generated timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message Queue Schema Definition
 */
const MessageQueueSchema = new Schema<MessageQueueDocument>(
  {
    bulkMessagingId: {
      type: Schema.Types.ObjectId,
      ref: "BulkMessaging",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "RegisteredUser", // TODO: CHANGE THIS - Update to your user model
      required: true,
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
    templateLanguage: {
      type: String,
      default: "en_US",
      trim: true,
      maxlength: 10,
    },
    components: [{ type: Schema.Types.Mixed }],
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "delivered", "read", "failed", "skipped"],
      default: "pending",
      index: true,
    },
    messageId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100,
    },
    error: {
      type: String,
      default: null,
      maxlength: 500,
    },
    errorCode: {
      type: Number,
      default: null,
    },
    errorCategory: {
      type: String,
      enum: ["transient", "permanent", "rate_limit", "policy"],
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    lockedAt: {
      type: Date,
      default: null,
    },
    lockedBy: {
      type: String,
      default: null,
      maxlength: 100,
    },
    cost: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    collection: "BM-MessageQueue",
  }
);

/**
 * Critical Indexes for Performance
 *
 * 1. MOST IMPORTANT - Worker polling index:
 *    Finds pending/failed messages ready to send
 *    Partial index reduces index size by only indexing relevant documents
 */
MessageQueueSchema.index(
  { status: 1, nextRetryAt: 1, lockedAt: 1 },
  {
    partialFilterExpression: {
      status: { $in: ["pending", "failed"] },
    },
  }
);

/**
 * 2. Progress tracking index:
 *    Admin dashboard queries "show me all messages for this bulk messaging by status"
 */
MessageQueueSchema.index({ bulkMessagingId: 1, status: 1 });

/**
 * 3. Webhook lookup index:
 *    When Meta webhook arrives with messageId, quickly find the corresponding document
 *    Sparse index because only sent messages have messageId
 */
MessageQueueSchema.index({ messageId: 1 }, { sparse: true });

/**
 * 4. User history index:
 *    "Show me all WhatsApp messages sent to this user"
 */
MessageQueueSchema.index({ userId: 1, createdAt: -1 });

/**
 * 5. Deduplication index:
 *    Ensures one message per user per bulk messaging
 *    Prevents accidental duplicate sends if bulk messaging is restarted
 */
MessageQueueSchema.index({ bulkMessagingId: 1, userId: 1 }, { unique: true });

/**
 * Export the MessageQueue model
 */
export const MessageQueueModel =
  mongoose.models.MessageQueue ??
  mongoose.model<MessageQueueDocument>("MessageQueue", MessageQueueSchema);
