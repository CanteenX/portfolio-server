/**
 * WhatsApp Trigger Model
 *
 * Event-driven auto-messaging system. Maps business events (e.g., "user registered",
 * "connection request sent") to WhatsApp template messages.
 *
 * How It Works:
 * 1. Business logic fires event: sendNotification("CONNECTION_REQUEST_SENT", phone, userId, context)
 * 2. Trigger service looks up active trigger for event key
 * 3. Service resolves template variables using context + user data
 * 4. Message sent immediately via Meta API (bypasses queue)
 *
 * Use Cases:
 * - Welcome messages: "USER_REGISTERED" → welcome template
 * - Connection invites: "CONNECTION_REQUEST_SENT" → invite template
 * - Meeting confirmations: "MEETING_SCHEDULED" → confirmation template
 * - Payment receipts: "PAYMENT_SUCCESS" → receipt template
 *
 * Key Features:
 * - Cached in memory (5 min TTL) for fast lookups
 * - Flexible variable mapping (context, user fields, or static values)
 * - Can be enabled/disabled without code changes
 * - Available params documentation for developers
 *
 * Database Collection: BM-WhatsAppTriggers
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Variable Source Types
 * Determines where to get the value for a template variable
 */
export type VariableSource = "context" | "user_field" | "static";

/**
 * Available Parameter Definition
 * Documents what context parameters developers can pass when firing this trigger
 */
export interface AvailableParam {
  /** Parameter key (e.g., "userName", "meetingDate") */
  key: string;

  /** Human-readable label */
  label: string;

  /** Description/usage example */
  description?: string;
}

/**
 * Variable Mapping Configuration
 * Maps a template variable position to its data source
 *
 * Example Mapping:
 * Template body: "Hi {{1}}, {{2}} sent you a connection request"
 * Mappings:
 * [
 *   { position: 1, source: "user_field", fieldPath: "name" },
 *   { position: 2, source: "context", contextKey: "senderName" }
 * ]
 *
 * When fired: sendNotification("CONNECTION_REQUEST_SENT", phone, userId, { senderName: "John" })
 * Result: "Hi Alice, John sent you a connection request"
 */
export interface VariableMapping {
  /** Variable position in template (1, 2, 3...) */
  position: number;

  /** Where to get the value */
  source: VariableSource;

  /**
   * If source is "context": key in context object
   * Example: "senderName" maps to context.senderName
   */
  contextKey?: string;

  /**
   * If source is "user_field": path to user data field
   * TODO: CHANGE THIS - Update field paths to match your user schema
   * Example: "personalProfile.name" maps to user.personalProfile.name
   */
  fieldPath?: string;

  /**
   * If source is "static": hardcoded value
   * Example: "Data Setu Support Team"
   */
  staticValue?: string;
}

/**
 * WhatsApp Trigger Document Interface
 */
export interface WhatsAppTriggerDocument extends Document {
  /**
   * Unique event identifier (UPPER_SNAKE_CASE)
   * Examples: "CONNECTION_REQUEST_SENT", "MEETING_REMINDER", "PAYMENT_SUCCESS"
   * Must be unique across all triggers
   */
  eventKey: string;

  /** Human-readable name shown in admin panel */
  displayName: string;

  /** Description explaining when this trigger fires */
  description?: string;

  /**
   * Template to send when this event occurs
   * Reference to WhatsAppTemplate model
   * TODO: CHANGE THIS - Update ref if template model name differs
   */
  template?: mongoose.Types.ObjectId;

  /** Whether this trigger is active (can send messages) */
  isActive: boolean;

  /**
   * Parameters that developers can pass in context object
   * Used for documentation and admin UI
   */
  availableParams: AvailableParam[];

  /** How to map template variables to data sources */
  variableMapping: VariableMapping[];

  /** Auto-generated timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WhatsApp Trigger Schema Definition
 */
const WhatsAppTriggerSchema = new Schema<WhatsAppTriggerDocument>(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 100,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    template: {
      type: Schema.Types.ObjectId,
      ref: "WhatsAppTemplate", // TODO: CHANGE THIS
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    availableParams: [
      {
        key: { type: String, required: true, trim: true, maxlength: 50 },
        label: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, default: "", maxlength: 300 },
      },
    ],
    variableMapping: [
      {
        position: {
          type: Number,
          required: true,
          min: 1,
          max: 99,
        },
        source: {
          type: String,
          enum: ["context", "user_field", "static"],
          required: true,
        },
        contextKey: { type: String, default: "", trim: true, maxlength: 50 },
        fieldPath: { type: String, default: "", trim: true, maxlength: 100 },
        staticValue: { type: String, default: "", maxlength: 200 },
      },
    ],
  },
  {
    timestamps: true,
    collection: "BM-WhatsAppTriggers",
  }
);

/**
 * Indexes for query optimization
 *
 * 1. eventKey unique constraint: Prevents duplicate event handlers
 */
WhatsAppTriggerSchema.index({ eventKey: 1 }, { unique: true });

/**
 * 2. isActive filter: Only load active triggers into cache
 */
WhatsAppTriggerSchema.index({ isActive: 1 });

/**
 * 3. Template reference: Find all triggers using a specific template
 */
WhatsAppTriggerSchema.index({ template: 1 });

/**
 * Export the WhatsAppTrigger model
 */
export const WhatsAppTriggerModel =
  mongoose.models.WhatsAppTrigger ??
  mongoose.model<WhatsAppTriggerDocument>("WhatsAppTrigger", WhatsAppTriggerSchema);
