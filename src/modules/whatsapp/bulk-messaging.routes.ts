/**
 * WhatsApp Bulk Messaging Routes
 *
 * Bulk messaging endpoints for sending WhatsApp messages to audiences at scale.
 * Each bulk messaging run targets specific users based on audience filters.
 *
 * Core Operations:
 * - Create/update/delete bulk messaging configurations
 * - Start/pause/resume message sending
 * - Monitor progress and statistics
 * - Retry failed messages
 * - Preview target audience
 * - Test send before launching
 * - Analytics across campaigns
 *
 * Workflow:
 * 1. Create bulk messaging (draft status)
 * 2. Preview audience to verify target users
 * 3. Test send to verify template + variables
 * 4. Start bulk messaging → publishes to RabbitMQ → worker processes
 * 5. Monitor progress in real-time
 * 6. Pause/resume if needed
 * 7. Retry failed messages
 *
 * Permissions:
 * - whatsapp.read - View bulk messagings and stats
 * - whatsapp.create - Create bulk messagings
 * - whatsapp.update - Edit and control (start/pause/resume)
 * - whatsapp.delete - Delete bulk messagings
 */

import { Router } from "express";
import { moduleGuards } from "../../core/http/module-guards";
import * as handlers from "./bulk-messaging.handlers";

const router = Router();

// ─── Audience Preview & Test Send ──────────────────────────
// These come first to avoid route conflicts with /:id pattern

/**
 * POST /api/v1/whatsapp/bulk-messaging/preview-audience
 * Preview target audience size and sample users
 * Used before creating bulk messaging to verify filters
 */
router.post(
  "/api/v1/whatsapp/bulk-messaging/preview-audience",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  handlers.previewAudience
);

/**
 * POST /api/v1/whatsapp/bulk-messaging/test-send
 * Send test message to up to 5 phone numbers
 * Used to verify template and variables before launching
 */
router.post(
  "/api/v1/whatsapp/bulk-messaging/test-send",
  ...moduleGuards("whatsapp", "whatsapp.create"),
  handlers.testSendBulkMessaging
);

/**
 * GET /api/v1/whatsapp/bulk-messaging/analytics
 * Get analytics across all campaigns (or filtered by campaign)
 */
router.get(
  "/api/v1/whatsapp/bulk-messaging/analytics",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  handlers.getCampaignAnalytics
);

// ─── Campaign-Scoped Operations ────────────────────────────

/**
 * POST /api/v1/whatsapp/campaigns/:campaignId/bulk-messaging
 * Create new bulk messaging under a campaign
 */
router.post(
  "/api/v1/whatsapp/campaigns/:campaignId/bulk-messaging",
  ...moduleGuards("whatsapp", "whatsapp.create"),
  handlers.createBulkMessaging
);

/**
 * POST /api/v1/whatsapp/campaigns/:campaignId/bulk-messaging/list
 * List bulk messagings for a specific campaign
 * Uses POST to support complex filters in body
 */
router.post(
  "/api/v1/whatsapp/campaigns/:campaignId/bulk-messaging/list",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  handlers.listBulkMessagings
);

// ─── Bulk Messaging Operations ─────────────────────────────

/**
 * GET /api/v1/whatsapp/bulk-messaging/:id
 * Get bulk messaging details with populated template and campaign
 */
router.get(
  "/api/v1/whatsapp/bulk-messaging/:id",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  handlers.getBulkMessagingById
);

/**
 * PUT /api/v1/whatsapp/bulk-messaging/:id
 * Update bulk messaging configuration
 * Cannot edit while processing (must pause first)
 */
router.put(
  "/api/v1/whatsapp/bulk-messaging/:id",
  ...moduleGuards("whatsapp", "whatsapp.update"),
  handlers.updateBulkMessaging
);

/**
 * DELETE /api/v1/whatsapp/bulk-messaging/:id
 * Delete bulk messaging and associated message queue entries
 * Cannot delete while processing (must pause first)
 */
router.delete(
  "/api/v1/whatsapp/bulk-messaging/:id",
  ...moduleGuards("whatsapp", "whatsapp.delete"),
  handlers.deleteBulkMessaging
);

// ─── State Control ─────────────────────────────────────────

/**
 * POST /api/v1/whatsapp/bulk-messaging/:id/start
 * Start sending messages (publishes to RabbitMQ)
 * If scheduled, sets status to "queued" instead
 */
router.post(
  "/api/v1/whatsapp/bulk-messaging/:id/start",
  ...moduleGuards("whatsapp", "whatsapp.update"),
  handlers.startBulkMessaging
);

/**
 * POST /api/v1/whatsapp/bulk-messaging/:id/pause
 * Pause message sending
 * Messages already sent continue, but no new messages are sent
 */
router.post(
  "/api/v1/whatsapp/bulk-messaging/:id/pause",
  ...moduleGuards("whatsapp", "whatsapp.update"),
  handlers.pauseBulkMessaging
);

/**
 * POST /api/v1/whatsapp/bulk-messaging/:id/resume
 * Resume paused message sending
 */
router.post(
  "/api/v1/whatsapp/bulk-messaging/:id/resume",
  ...moduleGuards("whatsapp", "whatsapp.update"),
  handlers.resumeBulkMessaging
);

// ─── Monitoring & Recovery ─────────────────────────────────

/**
 * GET /api/v1/whatsapp/bulk-messaging/:id/progress
 * Get real-time progress statistics
 * Returns percentage, counts, timestamps
 */
router.get(
  "/api/v1/whatsapp/bulk-messaging/:id/progress",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  handlers.getBulkMessagingProgress
);

/**
 * POST /api/v1/whatsapp/bulk-messaging/:id/retry-failed
 * Retry failed messages (transient errors only, max 3 retries)
 * Automatically restarts bulk messaging if completed/failed
 */
router.post(
  "/api/v1/whatsapp/bulk-messaging/:id/retry-failed",
  ...moduleGuards("whatsapp", "whatsapp.update"),
  handlers.retryFailedMessages
);

/**
 * POST /api/v1/whatsapp/bulk-messaging/:id/failed-messages
 * Get paginated list of failed messages with error details
 * Supports filtering by error category and phone number search
 */
router.post(
  "/api/v1/whatsapp/bulk-messaging/:id/failed-messages",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  handlers.getFailedMessages
);

export const bulkMessagingRoutes = router;
