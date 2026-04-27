/**
 * WhatsApp Models Index
 *
 * Central export point for all WhatsApp-related Mongoose models.
 * Import from this file to access any WhatsApp model throughout the application.
 *
 * Usage:
 * import { CampaignModel, BulkMessagingModel } from './models';
 */

// Campaign exports
export { CampaignModel, type CampaignDocument, type CampaignStatus, type CampaignStats } from "./campaign.model";

// Bulk Messaging exports
export {
  BulkMessagingModel,
  type BulkMessagingDocument,
  type BulkMessagingStatus,
  type AudienceFilter,
  type SendWindow,
  type VariableOverride,
  type BulkMessagingStats,
} from "./bulk-messaging.model";

// Message Queue exports
export {
  MessageQueueModel,
  type MessageQueueDocument,
  type MessageStatus,
  type ErrorCategory,
} from "./message-queue.model";

// Template exports
export {
  WhatsAppTemplateModel,
  type WhatsAppTemplateDocument,
  type MetaTemplateStatus,
  type TemplateCategory,
  type TemplateVariable,
  type HeaderType,
  type ButtonType,
  type TemplateButton,
} from "./template.model";

// Audience Type exports
export {
  AudienceTypeModel,
  type AudienceTypeDocument,
  type AudienceConditions,
} from "./audience-type.model";

// WhatsApp Log exports
export {
  WhatsAppLogModel,
  type WhatsAppLogDocument,
  type LogMessageStatus,
  type RelatedTo,
  type RelatedModel,
} from "./whatsapp-log.model";

// Trigger exports
export {
  WhatsAppTriggerModel,
  type WhatsAppTriggerDocument,
  type VariableMapping,
  type VariableSource,
  type AvailableParam,
} from "./trigger.model";

// Conversation exports
export {
  WAConversationModel,
  type WAConversationDocument,
  type ConversationStatus,
  type LastMessage,
  type ConversationMetadata,
} from "./conversation.model";

// Message exports
export {
  WAMessageModel,
  type WAMessageDocument,
  type MessageDirection,
  type MessageType,
  type MessageContent,
  type StatusTimestamps,
} from "./message.model";
