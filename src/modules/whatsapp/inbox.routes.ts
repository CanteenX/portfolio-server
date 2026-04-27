/**
 * WhatsApp Inbox Routes
 *
 * Two-way WhatsApp messaging inbox for customer communication.
 * Supports free-text replies (within 24h window) and template messages.
 *
 * Endpoints:
 * - POST /inbox/conversations - List conversations (POST for complex filters)
 * - GET /inbox/conversations/:id - Get conversation detail
 * - GET /inbox/conversations/:id/messages - Get message history (cursor-based pagination)
 * - POST /inbox/conversations/:id/reply - Send free-text reply (24h window required)
 * - POST /inbox/conversations/:id/send-template - Send template message
 * - GET /inbox/search - Search across all messages
 *
 * Real-time Updates:
 * - Socket.IO events: wa_new_message, wa_status_update, wa_message_sent
 * - Room: whatsapp_inbox_admin
 *
 * Database Collections: WA-Conversations, WA-Messages
 */

import { Router } from "express";
import { moduleGuards } from "../../core/http/module-guards";
import * as handlers from "./inbox.handlers";

const router = Router();

router.post("/api/v1/whatsapp/inbox/conversations", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.getConversations);
router.get("/api/v1/whatsapp/inbox/conversations/:id", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.getConversationDetail);
router.get("/api/v1/whatsapp/inbox/conversations/:id/messages", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.getMessages);
router.post("/api/v1/whatsapp/inbox/conversations/:id/reply", ...moduleGuards("whatsapp", "whatsapp.create"), handlers.sendReply);
router.post("/api/v1/whatsapp/inbox/conversations/:id/send-template", ...moduleGuards("whatsapp", "whatsapp.create"), handlers.sendTemplate);
router.get("/api/v1/whatsapp/inbox/search", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.searchMessages);

export const inboxRoutes = router;
