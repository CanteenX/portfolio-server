/**
 * Bulk Messaging Model
 *
 * Represents a single WhatsApp broadcast run targeting a specific audience.
 * Each bulk messaging belongs to a campaign and sends a template message to
 * filtered recipients.
 *
 * Workflow:
 * 1. Create: Admin selects template, defines audience filter
 * 2. Preview: System shows recipient count and sample users
 * 3. Start: Messages get queued into MessageQueue collection
 * 4. Processing: Worker picks messages and sends via Meta API
 * 5. Complete: All messages reach terminal state (sent/delivered/read/failed)
 *
 * Key Features:
 * - Advanced audience filtering (user type, location, profile completion, etc.)
 * - Variable overrides for template personalization
 * - Scheduled sending with quiet hours support
 * - Real-time progress tracking
 * - Budget control and cost estimation
 *
 * Database Collection: BM-BulkMessagings
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Bulk Messaging Status Lifecycle:
 * - draft: Being configured, not yet queued
 * - queued: Scheduled for future send, waiting for scheduledFor time
 * - processing: Messages are being sent by worker
 * - paused: Temporarily halted, can be resumed
 * - completed: All messages processed (sent/failed)
 * - failed: System error prevented completion
 */
export type BulkMessagingStatus = "draft" | "queued" | "processing" | "paused" | "completed" | "failed";

/**
 * Audience Filter Configuration
 * Defines which users should receive the broadcast
 *
 * TODO: CHANGE THIS - Update these filters to match your user database schema
 * Current filters are designed for BusinessMeet's user structure
 */
export interface AudienceFilter {
  /**
   * User types to target
   * - all: Everyone
   * - prospect: Not registered
   * - organic: Registered but not paid
   * - member: Paid subscribers
   * - premium: Premium tier subscribers
   */
  userType: Array<"all" | "prospect" | "organic" | "member" | "premium">;

  /** Saved audience type IDs (reusable segments) */
  audienceTypeIds?: mongoose.Types.ObjectId[];

  /**
   * Geographic filters
   * TODO: CHANGE THIS - Update refs to match your location models
   */
  cityIds?: mongoose.Types.ObjectId[];
  stateIds?: mongoose.Types.ObjectId[];

  /**
   * Industry/business category filter
   * TODO: CHANGE THIS - Update ref to match your industry/category model
   */
  industryIds?: mongoose.Types.ObjectId[];

  /**
   * Subscription plan filter
   * TODO: CHANGE THIS - Update ref to match your plan model
   */
  planIds?: mongoose.Types.ObjectId[];

  /** Profile completion state */
  profileCompleteness?: "any" | "complete" | "incomplete";

  /** Date range filters for plan expiry */
  planExpiryBefore?: Date;
  planExpiryAfter?: Date;

  /** Date range filters for user registration */
  registeredBefore?: Date;
  registeredAfter?: Date;

  /** Exclude users who were messaged in this time window */
  lastMessagedBefore?: Date;
  lastMessagedAfter?: Date;

  /** Exclude users messaged in last N hours (0 = no exclusion) */
  excludeRecentlyMessaged?: number;
}

/**
 * Template Variable Override
 * Allows customizing specific variables for this bulk messaging
 * without modifying the template itself
 */
export interface VariableOverride {
  /** Variable position (1, 2, 3, etc. corresponding to {{1}}, {{2}}, {{3}}) */
  position: number;

  /**
   * Field mapping (e.g., "user.name", "businessProfile.businessName")
   * TODO: CHANGE THIS - Update field paths to match your user schema
   */
  fieldMapping?: string;

  /** Static value to use for all recipients */
  customValue?: string;
}

/**
 * Send Window Configuration
 * Controls when messages can be sent (quiet hours support)
 */
export interface SendWindow {
  /** Start hour in 24h format (e.g., 9 = 9 AM) */
  startHour: number;

  /** End hour in 24h format (e.g., 21 = 9 PM) */
  endHour: number;

  /** Timezone for hour calculations */
  timezone: string;

  /**
   * Whether to respect quiet hours
   * Only applies to MARKETING category templates
   * UTILITY and AUTHENTICATION can send anytime
   */
  respectQuietHours: boolean;
}

/**
 * Bulk Messaging Statistics
 * Real-time counters updated by worker as messages are processed
 */
export interface BulkMessagingStats {
  /** Total number of recipients after audience filter */
  totalRecipients: number;

  /** Messages pending or being processed */
  queued: number;

  /** Successfully sent to Meta WhatsApp API */
  sent: number;

  /** Delivered to recipient's WhatsApp */
  delivered: number;

  /** Opened/read by recipient */
  read: number;

  /** Failed to send or deliver */
  failed: number;
}

/**
 * Bulk Messaging Document Interface
 */
export interface BulkMessagingDocument extends Document {
  /**
   * Parent campaign
   * Reference to Campaign model
   */
  campaignId: mongoose.Types.ObjectId;

  /** Optional descriptive name for this bulk messaging run */
  name?: string;

  /**
   * Template to send
   * Reference to WhatsAppTemplate model
   * TODO: CHANGE THIS - Update ref if template model name differs
   */
  templateId: mongoose.Types.ObjectId;

  /** Audience targeting rules */
  audienceFilter: AudienceFilter;

  /** Template variable customizations for this run */
  variableOverrides: VariableOverride[];

  /** Real-time delivery statistics */
  stats: BulkMessagingStats;

  /** Current lifecycle status */
  status: BulkMessagingStatus;

  /**
   * When to start sending (null = send immediately)
   * Cron job checks this field every minute
   */
  scheduledFor?: Date;

  /** Time restrictions for sending */
  sendWindow: SendWindow;

  /** Estimated cost before sending (calculated during preview) */
  estimatedCost: number;

  /** Actual cost after completion */
  actualCost: number;

  /** Optional budget cap to prevent overspend */
  budgetLimit?: number;

  /** When message sending began */
  startedAt?: Date;

  /** When all messages reached terminal state */
  completedAt?: Date;

  /**
   * User who created this bulk messaging
   * TODO: CHANGE THIS - Update ref to match your user/admin model
   */
  createdBy?: mongoose.Types.ObjectId;

  /** Auto-generated timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bulk Messaging Schema Definition
 */
const BulkMessagingSchema = new Schema<BulkMessagingDocument>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppTemplate", // TODO: CHANGE THIS
      required: true,
    },
    audienceFilter: {
      userType: {
        type: [String],
        enum: ["all", "prospect", "organic", "member", "premium"],
        default: ["all"],
      },
      audienceTypeIds: [{ type: Schema.Types.ObjectId, ref: "AudienceType" }],
      cityIds: [{ type: Schema.Types.ObjectId, ref: "City" }], // TODO: CHANGE THIS
      stateIds: [{ type: Schema.Types.ObjectId, ref: "State" }], // TODO: CHANGE THIS
      industryIds: [{ type: Schema.Types.ObjectId, ref: "Industry" }], // TODO: CHANGE THIS
      planIds: [{ type: Schema.Types.ObjectId, ref: "PlanMaster" }], // TODO: CHANGE THIS
      profileCompleteness: {
        type: String,
        enum: ["any", "complete", "incomplete"],
        default: "any",
      },
      planExpiryBefore: { type: Date, default: null },
      planExpiryAfter: { type: Date, default: null },
      registeredBefore: { type: Date, default: null },
      registeredAfter: { type: Date, default: null },
      lastMessagedBefore: { type: Date, default: null },
      lastMessagedAfter: { type: Date, default: null },
      excludeRecentlyMessaged: { type: Number, default: 0, min: 0 },
    },
    variableOverrides: [
      {
        position: { type: Number, required: true, min: 1 },
        fieldMapping: { type: String },
        customValue: { type: String },
      },
    ],
    stats: {
      totalRecipients: { type: Number, default: 0, min: 0 },
      queued: { type: Number, default: 0, min: 0 },
      sent: { type: Number, default: 0, min: 0 },
      delivered: { type: Number, default: 0, min: 0 },
      read: { type: Number, default: 0, min: 0 },
      failed: { type: Number, default: 0, min: 0 },
    },
    status: {
      type: String,
      enum: ["draft", "queued", "processing", "paused", "completed", "failed"],
      default: "draft",
      index: true,
    },
    scheduledFor: { type: Date, default: null },
    sendWindow: {
      startHour: { type: Number, default: 9, min: 0, max: 23 },
      endHour: { type: Number, default: 21, min: 0, max: 23 },
      timezone: { type: String, default: "Asia/Kolkata" },
      respectQuietHours: { type: Boolean, default: true },
    },
    estimatedCost: { type: Number, default: 0, min: 0 },
    actualCost: { type: Number, default: 0, min: 0 },
    budgetLimit: { type: Number, default: null, min: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // TODO: CHANGE THIS - Update if your user model has different name
    },
  },
  {
    timestamps: true,
    collection: "BM-BulkMessagings",
  }
);

/**
 * Indexes for query optimization
 *
 * 1. status + scheduledFor: Cron job finds scheduled runs ready to launch
 * 2. campaignId + createdAt: List all bulk messagings for a campaign, newest first
 * 3. status: Filter by status for admin dashboard
 */
BulkMessagingSchema.index({ status: 1, scheduledFor: 1 });
BulkMessagingSchema.index({ campaignId: 1, createdAt: -1 });

/**
 * Export the BulkMessaging model
 */
export const BulkMessagingModel =
  mongoose.models.BulkMessaging ??
  mongoose.model<BulkMessagingDocument>("BulkMessaging", BulkMessagingSchema);
