/**
 * WhatsApp Webhook Routes
 *
 * This file handles webhook endpoints called directly by Meta's WhatsApp Business API.
 * These endpoints receive real-time notifications about:
 * - Message delivery status updates (sent → delivered → read → failed)
 * - Incoming messages from customers
 * - User opt-out requests (STOP, UNSUBSCRIBE keywords)
 *
 * IMPORTANT: These routes are registered BEFORE express.json() middleware
 * in app.ts because signature verification requires the raw request body.
 *
 * Meta Documentation:
 * - Webhook setup: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/setup
 * - Payload format: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 *
 * Security:
 * - GET /webhook: Verifies webhook with Meta using a verify token
 * - POST /webhook: Validates HMAC signature before processing
 *   Uses express.raw() to preserve raw body for signature validation
 *
 * Configure Meta webhook URL:
 * - Webhook URL: https://your-domain.com/api/v1/whatsapp/webhook
 * - Verify Token: Set to match WHATSAPP_WEBHOOK_VERIFY_TOKEN in .env
 * - Subscribe to: messages, message_status webhook events
 */

import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { verifyWebhook, handleStatusUpdate } from "./webhook.handlers";

const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

/**
 * GET /api/v1/whatsapp/webhook
 * Meta webhook verification endpoint
 * Called once by Meta when you first configure the webhook URL
 */
router.get("/api/v1/whatsapp/webhook", verifyWebhook);

/**
 * POST /api/v1/whatsapp/webhook
 * Receives status updates and incoming messages from Meta
 * Called in real-time whenever a message status changes or a user sends a message
 *
 * Uses express.raw() middleware to preserve raw body for HMAC signature verification
 * The raw buffer is parsed manually in the handler after signature validation
 */
router.post(
  "/api/v1/whatsapp/webhook",
  webhookRateLimiter,
  express.raw({ type: "application/json" }),
  handleStatusUpdate
);

export const whatsappWebhookRoutes = router;
