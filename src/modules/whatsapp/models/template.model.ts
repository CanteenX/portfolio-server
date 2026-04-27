/**
 * WhatsApp Template Model
 *
 * Stores WhatsApp message templates synced from Meta Business Manager.
 * Templates must be pre-approved by Meta before they can be used.
 *
 * Template Categories (Meta defined):
 * - MARKETING: Promotional messages (requires user opt-in, quiet hours apply)
 * - UTILITY: Transactional/service messages (no opt-in needed, anytime send)
 * - AUTHENTICATION: OTP and verification codes (highest priority delivery)
 *
 * Template Structure:
 * - Header: Optional (text, image, video, or document)
 * - Body: Required, main message content with {{1}}, {{2}} variables
 * - Footer: Optional static text
 * - Buttons: Optional (URL, phone number, or quick reply buttons)
 *
 * Lifecycle:
 * 1. Create template locally
 * 2. Submit to Meta for approval via API
 * 3. Meta reviews (can take 24-48 hours)
 * 4. Status updates to APPROVED
 * 5. Template can now be used in bulk messaging
 *
 * Database Collection: BM-WhatsAppTemplates
 */

import mongoose, { Schema, Document } from "mongoose";

/**
 * Meta Template Status:
 * - NOT_SUBMITTED: Created locally, not yet submitted to Meta
 * - PENDING: Submitted, waiting for Meta review
 * - APPROVED: Approved by Meta, ready to use
 * - REJECTED: Rejected by Meta (policy violation, formatting issue, etc.)
 * - PAUSED: Temporarily disabled by Meta or admin
 * - DISABLED: Permanently disabled
 */
export type MetaTemplateStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | "PAUSED" | "DISABLED";

/**
 * Template Category (defined by Meta WhatsApp Business API)
 */
export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

/**
 * Header Type for template
 */
export type HeaderType = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";

/**
 * Button Type for template
 */
export type ButtonType = "URL" | "PHONE_NUMBER" | "QUICK_REPLY";

/**
 * Template Button Configuration
 */
export interface TemplateButton {
  /** Button type */
  type: ButtonType;

  /** Button text shown to user (max 20 chars) */
  text: string;

  /** URL to open (if type is URL) */
  url?: string;

  /** Phone number to call (if type is PHONE_NUMBER) */
  phoneNumber?: string;
}

/**
 * Template Variable Definition
 * Maps {{1}}, {{2}}, {{3}} placeholders to user data fields
 *
 * Example:
 * Body text: "Hi {{1}}, your plan {{2}} expires on {{3}}"
 * Variables:
 * [
 *   { position: 1, fieldMapping: "user.name" },
 *   { position: 2, fieldMapping: "plan.planName" },
 *   { position: 3, fieldMapping: "plan.expiryDate" }
 * ]
 */
export interface TemplateVariable {
  /** Variable position (1-based index) */
  position: number;

  /** Human-readable description (e.g., "User's first name") */
  description?: string;

  /** Sample value for Meta approval (e.g., "John Doe") */
  sampleValue?: string;

  /**
   * Field mapping to user data
   * TODO: CHANGE THIS - Update field paths to match your user schema
   *
   * Supported mappings (BusinessMeet specific):
   * - user.name, user.mobile, user.email
   * - personalProfile.name, personalProfile.designation
   * - businessProfile.businessName, businessProfile.cityName
   * - plan.planName, plan.expiryDate
   * - custom (uses customValue instead)
   */
  fieldMapping?: string;

  /** Custom static value (if fieldMapping is "custom") */
  customValue?: string;
}

/**
 * WhatsApp Template Document Interface
 */
export interface WhatsAppTemplateDocument extends Document {
  /**
   * Human-readable template name (internal use)
   * Example: "Welcome Message", "Renewal Reminder"
   */
  name: string;

  /**
   * Meta template name (must match name in Meta Business Manager)
   * Example: "welcome_message", "renewal_reminder"
   * Rules: lowercase, underscores only, no spaces
   */
  metaTemplateName: string;

  /**
   * Template language code
   * Example: "en", "en_US", "hi", "es"
   */
  language: string;

  /** Template category */
  category: TemplateCategory;

  /** Body text with {{1}}, {{2}} variable placeholders */
  bodyText: string;

  /** Optional header text */
  headerText?: string;

  /** Optional footer text (max 60 chars) */
  footerText?: string;

  /**
   * Meta template ID (assigned by Meta after approval)
   * Used for API calls to Meta
   */
  metaTemplateId?: string;

  /** Current approval status from Meta */
  metaStatus: MetaTemplateStatus;

  /** Header type */
  headerType: HeaderType;

  /** Header media URL (if headerType is IMAGE/VIDEO/DOCUMENT) */
  headerMediaUrl?: string;

  /** Action buttons */
  buttons: TemplateButton[];

  /**
   * Raw Meta template components
   * Stored for reference, synced from Meta's response
   */
  components: Array<Record<string, any>>;

  /** Variable definitions for personalization */
  variables: TemplateVariable[];

  /** Internal status (active/paused/deleted) */
  status: "active" | "paused" | "deleted";

  /** Last time template was synced from Meta */
  lastSyncedAt?: Date;

  /** Auto-generated timestamps */
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WhatsApp Template Schema Definition
 */
const WhatsAppTemplateSchema = new Schema<WhatsAppTemplateDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    metaTemplateName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      lowercase: true,
    },
    language: {
      type: String,
      default: "en",
      trim: true,
      maxlength: 10,
    },
    category: {
      type: String,
      enum: ["MARKETING", "UTILITY", "AUTHENTICATION"],
      default: "MARKETING",
      index: true,
    },
    bodyText: {
      type: String,
      default: "",
      maxlength: 1024,
    },
    headerText: {
      type: String,
      default: "",
      maxlength: 60,
    },
    footerText: {
      type: String,
      default: "",
      maxlength: 60,
    },
    metaTemplateId: {
      type: String,
      default: null,
      maxlength: 100,
    },
    metaStatus: {
      type: String,
      enum: ["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED", "PAUSED", "DISABLED"],
      default: "NOT_SUBMITTED",
      index: true,
    },
    headerType: {
      type: String,
      enum: ["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"],
      default: "TEXT",
    },
    headerMediaUrl: {
      type: String,
      default: "",
      maxlength: 500,
    },
    buttons: [
      {
        type: {
          type: String,
          enum: ["URL", "PHONE_NUMBER", "QUICK_REPLY"],
          required: true,
        },
        text: { type: String, required: true, maxlength: 25 },
        url: { type: String, maxlength: 500 },
        phoneNumber: { type: String, maxlength: 20 },
      },
    ],
    components: [{ type: Schema.Types.Mixed }],
    variables: [
      {
        position: {
          type: Number,
          required: true,
          min: 1,
          max: 99,
        },
        description: {
          type: String,
          default: "",
          maxlength: 200,
        },
        sampleValue: {
          type: String,
          default: "",
          maxlength: 100,
        },
        fieldMapping: {
          type: String,
          enum: [
            "user.name",
            "user.mobile",
            "user.email",
            "personalProfile.name",
            "personalProfile.designation",
            "businessProfile.businessName",
            "businessProfile.cityName",
            "businessProfile.industryName",
            "plan.planName",
            "plan.expiryDate",
            "custom",
          ],
          default: "custom",
        },
        customValue: {
          type: String,
          default: "",
          maxlength: 200,
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "paused", "deleted"],
      default: "active",
      index: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "BM-WhatsAppTemplates",
  }
);

/**
 * Indexes for query optimization
 *
 * 1. Unique constraint: One template per name+language combination
 *    Prevents duplicate templates when syncing from Meta
 */
WhatsAppTemplateSchema.index({ metaTemplateName: 1, language: 1 }, { unique: true });

/**
 * 2. Status filter: Find all active templates
 */
WhatsAppTemplateSchema.index({ status: 1 });

/**
 * 3. Category filter: Find all MARKETING templates
 */
WhatsAppTemplateSchema.index({ category: 1 });

/**
 * 4. Meta status filter: Find all APPROVED templates ready to use
 */
WhatsAppTemplateSchema.index({ metaStatus: 1 });

/**
 * 5. Compound index: Find approved templates of specific category
 *    Example: "Show me all APPROVED MARKETING templates"
 */
WhatsAppTemplateSchema.index({ metaStatus: 1, category: 1, status: 1 });

/**
 * Export the WhatsAppTemplate model
 */
export const WhatsAppTemplateModel =
  mongoose.models.WhatsAppTemplate ??
  mongoose.model<WhatsAppTemplateDocument>("WhatsAppTemplate", WhatsAppTemplateSchema);
