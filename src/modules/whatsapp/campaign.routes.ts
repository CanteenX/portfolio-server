/**
 * WhatsApp Campaign Routes
 *
 * Campaign management endpoints for organizing WhatsApp bulk messaging efforts.
 * A campaign is a container for multiple bulk messaging runs with shared settings.
 *
 * Endpoints:
 * - POST /campaigns - Create new campaign
 * - POST /campaigns/list - List campaigns with filtering/pagination
 * - GET /campaigns/:id - Get campaign detail with bulk messaging history
 * - PUT /campaigns/:id - Update campaign settings
 * - DELETE /campaigns/:id - Archive campaign (soft delete)
 * - GET /campaigns/:id/stats - Get aggregate stats across all bulk messagings
 *
 * Use Cases:
 * - Marketing campaigns: "Summer Sale 2026", "Product Launch"
 * - Event campaigns: "Conference Reminders", "Webinar Series"
 * - Drip campaigns: "Onboarding Sequence", "Re-engagement Campaign"
 *
 * Permissions:
 * - whatsapp.read - View campaigns and stats
 * - whatsapp.create - Create campaigns
 * - whatsapp.update - Edit campaigns
 * - whatsapp.delete - Archive campaigns
 */

import { Router } from "express";
import { moduleGuards } from "../../core/http/module-guards";
import * as handlers from "./campaign.handlers";

const router = Router();

/**
 * POST /api/v1/whatsapp/campaigns
 * Create a new campaign
 */
router.post("/api/v1/whatsapp/campaigns", ...moduleGuards("whatsapp", "whatsapp.create"), handlers.createCampaign);

/**
 * POST /api/v1/whatsapp/campaigns/list
 * List campaigns with filtering, sorting, and pagination
 * Uses POST to support complex filter objects in body
 */
router.post("/api/v1/whatsapp/campaigns/list", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.listCampaigns);

/**
 * GET /api/v1/whatsapp/campaigns/:id
 * Get campaign detail including bulk messaging history
 */
router.get("/api/v1/whatsapp/campaigns/:id", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.getCampaignById);

/**
 * PUT /api/v1/whatsapp/campaigns/:id
 * Update campaign settings
 */
router.put("/api/v1/whatsapp/campaigns/:id", ...moduleGuards("whatsapp", "whatsapp.update"), handlers.updateCampaign);

/**
 * DELETE /api/v1/whatsapp/campaigns/:id
 * Archive campaign (soft delete, sets status to "archived")
 * Prevents deletion if bulk messaging is actively processing
 */
router.delete("/api/v1/whatsapp/campaigns/:id", ...moduleGuards("whatsapp", "whatsapp.delete"), handlers.deleteCampaign);

/**
 * GET /api/v1/whatsapp/campaigns/:id/stats
 * Get aggregate statistics across all bulk messagings in campaign
 * Returns: total sent, delivered, read, failed, queued counts
 */
router.get("/api/v1/whatsapp/campaigns/:id/stats", ...moduleGuards("whatsapp", "whatsapp.read"), handlers.getCampaignStats);

export const campaignRoutes = router;
