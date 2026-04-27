/**
 * WhatsApp Template Routes
 *
 * Manages WhatsApp message templates synced with Meta Business API.
 * Templates must be approved by Meta before they can be used for outbound messaging.
 *
 * Endpoints:
 * - POST /templates - Create local template record
 * - POST /templates/list - List templates with filtering
 * - POST /templates/sync - Sync approved templates from Meta
 * - POST /templates/:id/submit-to-meta - Submit template for Meta approval
 * - GET /templates/:id - Get template detail
 * - PUT /templates/:id - Update template
 * - DELETE /templates/:id - Soft delete template
 *
 * Database Collection: BM-WhatsAppTemplates
 */

import { Router } from "express";
import { moduleGuards } from "../../core/http/module-guards";
import * as handlers from "./template.handlers";

const router = Router();

router.post("/api/v1/whatsapp/templates", ...moduleGuards("whatsapp", "whatsapp.create"), handlers.createTemplate);
router.post("/api/v1/whatsapp/templates/list", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.listTemplates);
router.post("/api/v1/whatsapp/templates/sync", ...moduleGuards("whatsapp", "whatsapp.update"), handlers.syncFromMeta);
router.post("/api/v1/whatsapp/templates/:id/submit-to-meta", ...moduleGuards("whatsapp", "whatsapp.update"), handlers.submitToMeta);
router.get("/api/v1/whatsapp/templates/:id", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.getTemplateById);
router.put("/api/v1/whatsapp/templates/:id", ...moduleGuards("whatsapp", "whatsapp.update"), handlers.updateTemplate);
router.delete("/api/v1/whatsapp/templates/:id", ...moduleGuards("whatsapp", "whatsapp.delete"), handlers.deleteTemplate);

export const templateRoutes = router;
