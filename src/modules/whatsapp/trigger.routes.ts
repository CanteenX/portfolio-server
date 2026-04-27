/**
 * WhatsApp Trigger Routes
 *
 * Event-driven auto-messaging system. Triggers automatically send WhatsApp
 * templates when specific events occur (e.g., CONNECTION_REQUEST_SENT,
 * MEETING_BOOKED, PAYMENT_RECEIVED).
 *
 * Endpoints:
 * - POST /triggers - Create trigger
 * - POST /triggers/list - List triggers with filtering
 * - GET /triggers/approved-templates - List approved templates for trigger assignment
 * - GET /triggers/:id - Get trigger detail
 * - PUT /triggers/:id - Update trigger
 * - DELETE /triggers/:id - Delete trigger
 *
 * Database Collection: BM-WhatsAppTriggers
 */

import { Router } from "express";
import { moduleGuards } from "../../core/http/module-guards";
import * as handlers from "./trigger.handlers";

const router = Router();

router.post("/api/v1/whatsapp/triggers", ...moduleGuards("whatsapp", "whatsapp.create"), handlers.createTrigger);
router.post("/api/v1/whatsapp/triggers/list", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.listTriggers);
router.get("/api/v1/whatsapp/triggers/approved-templates", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.listApprovedTemplates);
router.get("/api/v1/whatsapp/triggers/:id", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.getTriggerById);
router.put("/api/v1/whatsapp/triggers/:id", ...moduleGuards("whatsapp", "whatsapp.update"), handlers.updateTrigger);
router.delete("/api/v1/whatsapp/triggers/:id", ...moduleGuards("whatsapp", "whatsapp.delete"), handlers.deleteTrigger);

export const triggerRoutes = router;
