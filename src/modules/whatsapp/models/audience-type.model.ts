/**
 * Audience Type Model
 *
 * Stores reusable audience segments for WhatsApp campaigns.
 * Instead of configuring the same audience filter repeatedly,
 * admins can save frequently-used segments (e.g., "Premium Users in Mumbai")
 * and reuse them across multiple bulk messagings.
 *
 * Use Cases:
 * - Geographic segments: "All users in Maharashtra"
 * - User type segments: "Paid members only"
 * - Engagement segments: "Users not messaged in last 30 days"
 * - Combined segments: "Premium users in Delhi with incomplete profiles"
 *
 * Features:
 * - Same filter structure as BulkMessaging.audienceFilter
 * - Estimated count tracking (refreshed periodically)
 * - Can be combined with other filters at runtime
 *
 * Database Collection: BM-AudienceTypes
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Audience Conditions
 * Identical structure to BulkMessaging.audienceFilter
 * TODO: CHANGE THIS - Update to match your user database schema
 */
export interface AudienceConditions {
  userTypes?: Array<"prospect" | "organic" | "member" | "premium">;
  profileCompleteness?: "any" | "complete" | "incomplete";
  cityIds?: mongoose.Types.ObjectId[];
  stateIds?: mongoose.Types.ObjectId[];
  industryIds?: mongoose.Types.ObjectId[];
  planIds?: mongoose.Types.ObjectId[];
  planExpiryBefore?: Date;
  planExpiryAfter?: Date;
  registeredBefore?: Date;
  registeredAfter?: Date;
  lastActiveBefore?: Date;
  lastActiveAfter?: Date;
  excludeRecentlyMessaged?: number;
}

/**
 * Audience Type Document Interface
 */
export interface AudienceTypeDocument extends Document {
  /** Human-readable name (e.g., "Premium Users - Mumbai") */
  name: string;

  /** Optional description explaining this segment */
  description?: string;

  /** Audience targeting conditions */
  conditions: AudienceConditions;

  /** Whether this audience type can be used */
  isActive: boolean;

  /**
   * Cached count of users matching this audience
   * Refreshed periodically to avoid expensive queries every time
   */
  estimatedCount: number;

  /** When the count was last refreshed */
  lastCountRefreshedAt?: Date;

  /**
   * User who created this audience type
   * TODO: CHANGE THIS - Update ref to match your user/admin model
   */
  createdBy?: mongoose.Types.ObjectId;

  /** Auto-generated timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Audience Type Schema Definition
 */
const AudienceTypeSchema = new Schema<AudienceTypeDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      unique: true, // Prevent duplicate audience type names
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    conditions: {
      userTypes: {
        type: [String],
        enum: ["prospect", "organic", "member", "premium"],
        default: [],
      },
      profileCompleteness: {
        type: String,
        enum: ["any", "complete", "incomplete"],
        default: "any",
      },
      cityIds: [{ type: Schema.Types.ObjectId, ref: "City" }], // TODO: CHANGE THIS
      stateIds: [{ type: Schema.Types.ObjectId, ref: "State" }], // TODO: CHANGE THIS
      industryIds: [{ type: Schema.Types.ObjectId, ref: "Industry" }], // TODO: CHANGE THIS
      planIds: [{ type: Schema.Types.ObjectId, ref: "PlanMaster" }], // TODO: CHANGE THIS
      planExpiryBefore: { type: Date, default: null },
      planExpiryAfter: { type: Date, default: null },
      registeredBefore: { type: Date, default: null },
      registeredAfter: { type: Date, default: null },
      lastActiveBefore: { type: Date, default: null },
      lastActiveAfter: { type: Date, default: null },
      excludeRecentlyMessaged: { type: Number, default: 0, min: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    estimatedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastCountRefreshedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // TODO: CHANGE THIS - Update if your user model has different name
    },
  },
  {
    timestamps: true,
    collection: "BM-AudienceTypes",
  }
);

/**
 * Indexes for query optimization
 */
AudienceTypeSchema.index({ isActive: 1 });
AudienceTypeSchema.index({ name: 1 }, { unique: true });
AudienceTypeSchema.index({ createdAt: -1 });

/**
 * Export the AudienceType model
 */
export const AudienceTypeModel =
  mongoose.models.AudienceType ??
  mongoose.model<AudienceTypeDocument>("AudienceType", AudienceTypeSchema);
