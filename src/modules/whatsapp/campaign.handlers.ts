/**
 * WhatsApp Campaign Handlers
 *
 * Request handlers for campaign management operations.
 * Campaigns organize bulk messaging runs into logical groups with shared settings.
 *
 * Handler Functions:
 * - createCampaign: Create new campaign with name, description, default template
 * - listCampaigns: Paginated list with search, filtering, sorting
 * - getCampaignById: Get campaign details + bulk messaging history
 * - updateCampaign: Update campaign fields
 * - deleteCampaign: Archive campaign (soft delete)
 * - getCampaignStats: Aggregate stats across all bulk messagings
 *
 * Database Collections Used:
 * - BM-Campaigns: Campaign documents
 * - BM-BulkMessagings: Bulk messaging runs (for stats aggregation)
 * - BM-MessageQueue: Message queue (for active message check during delete)
 *
 * TODO: CHANGE THIS - Update populate() refs if template model name differs
 */

import { ERROR_CODES } from "@admin-platform/shared-types";
import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { logger } from "../../core/logging/logger";
import { CampaignModel, BulkMessagingModel, MessageQueueModel, WhatsAppTemplateModel } from "./models";

// ═══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════

/**
 * Zod schema for creating a campaign
 */
const createCampaignSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  defaultTemplateId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

/**
 * Zod schema for listing campaigns with filters
 */
const listCampaignsSchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
  sorton: z.string().optional(),
  sortdir: z.enum(["asc", "desc"]).optional(),
  match: z.string().max(200).optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
});

/**
 * Zod schema for updating campaign
 */
const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
  defaultTemplateId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Validates MongoDB ObjectId string
 * @param id - ObjectId string to validate
 * @throws AppError if invalid
 */
function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid campaign ID format");
  }
}

// ═══════════════════════════════════════════════════════════
// HANDLER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Create a new campaign
 *
 * POST /api/v1/whatsapp/campaigns
 *
 * Request Body:
 * - name: Campaign name (required, max 200 chars)
 * - description: Campaign description (optional, max 1000 chars)
 * - defaultTemplateId: Default template for this campaign (optional)
 * - tags: Array of tags for categorization (optional, max 20 tags)
 *
 * Response: Created campaign object with 201 status
 *
 * @param req - Authenticated request with campaign data in body
 * @param res - Express response
 * @param next - Express next function for error handling
 */
export const createCampaign = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = createCampaignSchema.parse(req.body ?? {});

    // Validate template exists if provided
    if (payload.defaultTemplateId) {
      const templateExists = await WhatsAppTemplateModel.exists({
        _id: payload.defaultTemplateId,
      });
      if (!templateExists) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Default template not found");
      }
    }

    const campaign = await CampaignModel.create({
      name: payload.name,
      description: payload.description || "",
      defaultTemplateId: payload.defaultTemplateId || null,
      tags: payload.tags || [],
      createdBy: new mongoose.Types.ObjectId(req.user!.id),
      status: "draft",
      stats: {
        totalBulkMessagings: 0,
        totalMessages: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      },
    });

    logger.info("[WhatsApp Campaign] Created campaign", {
      campaignId: campaign._id,
      name: campaign.name,
      userId: req.user!.id,
    });

    res.status(201).json(campaign.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid campaign data"));
      return;
    }
    next(error);
  }
};

/**
 * List campaigns with filtering, sorting, and pagination
 *
 * POST /api/v1/whatsapp/campaigns/list
 *
 * Request Body (all optional):
 * - skip: Number of records to skip (pagination)
 * - per_page: Records per page (default 10, max 100)
 * - sorton: Field to sort by (default: createdAt)
 * - sortdir: Sort direction ("asc" or "desc", default: desc)
 * - match: Search string (searches name and description)
 * - status: Filter by status (draft/active/paused/archived)
 *
 * Response: { count: number, data: Campaign[] }
 *
 * Implementation Notes:
 * - Uses MongoDB aggregation pipeline for efficient pagination
 * - Excludes archived campaigns by default unless status filter applied
 * - Case-insensitive search on name and description
 *
 * @param req - Authenticated request with filter params in body
 * @param res - Express response
 * @param next - Express next function
 */
export const listCampaigns = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = listCampaignsSchema.parse(req.body ?? {});

    const pipeline: any[] = [];

    // Build match stage
    const matchStage: any = { status: { $ne: "archived" } };
    if (params.status) {
      matchStage.status = params.status;
    }
    pipeline.push({ $match: matchStage });

    // Search filter (name or description)
    if (params.match) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: params.match, $options: "i" } },
            { description: { $regex: params.match, $options: "i" } },
          ],
        },
      });
    }

    // Sort stage
    const sortField = params.sorton || "createdAt";
    const sortDirection = params.sortdir === "asc" ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    // Pagination with count
    pipeline.push({
      $facet: {
        stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
        stage2: [{ $skip: params.skip }, { $limit: params.per_page }],
      },
    });

    pipeline.push({ $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true } });

    pipeline.push({
      $project: {
        count: { $ifNull: ["$stage1.count", 0] },
        data: "$stage2",
      },
    });

    const result = await CampaignModel.aggregate(pipeline);

    const response = result.length > 0 ? result[0] : { count: 0, data: [] };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid filter parameters"));
      return;
    }
    next(error);
  }
};

/**
 * Get campaign details by ID
 *
 * GET /api/v1/whatsapp/campaigns/:id
 *
 * Returns:
 * - Campaign document with populated defaultTemplateId
 * - Array of bulk messaging runs for this campaign
 *
 * Response: { ...campaign, bulkMessagings: BulkMessaging[] }
 *
 * @param req - Request with campaign ID in params
 * @param res - Express response
 * @param next - Express next function
 */
export const getCampaignById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);

    // TODO: CHANGE THIS - Update populate field names if template model differs
    const campaign = (await CampaignModel.findById(req.params.id)
      .populate("defaultTemplateId", "name metaTemplateName category")
      .lean()
      .exec()) as any;

    if (!campaign || campaign.status === "archived") {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Campaign not found");
    }

    // Fetch bulk messaging history for this campaign
    const bulkMessagings = await BulkMessagingModel.find({ campaignId: campaign._id })
      .populate("templateId", "name metaTemplateName")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    res.status(200).json({
      ...campaign,
      bulkMessagings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update campaign
 *
 * PUT /api/v1/whatsapp/campaigns/:id
 *
 * Request Body (all optional):
 * - name: Campaign name
 * - description: Campaign description
 * - status: Campaign status (draft/active/paused/archived)
 * - defaultTemplateId: Default template ObjectId
 * - tags: Array of tag strings
 *
 * Response: Updated campaign object
 *
 * @param req - Request with campaign ID and update data
 * @param res - Express response
 * @param next - Express next function
 */
export const updateCampaign = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);
    const payload = updateCampaignSchema.parse(req.body ?? {});

    // Validate template exists if being updated
    if (payload.defaultTemplateId !== undefined && payload.defaultTemplateId !== null) {
      const templateExists = await WhatsAppTemplateModel.exists({
        _id: payload.defaultTemplateId,
      });
      if (!templateExists) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Default template not found");
      }
    }

    const campaign = await CampaignModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(payload.name && { name: payload.name }),
          ...(payload.description !== undefined && { description: payload.description }),
          ...(payload.status && { status: payload.status }),
          ...(payload.defaultTemplateId !== undefined && {
            defaultTemplateId: payload.defaultTemplateId || null,
          }),
          ...(payload.tags && { tags: payload.tags }),
        },
      },
      { new: true, runValidators: true }
    ).exec();

    if (!campaign) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Campaign not found");
    }

    logger.info("[WhatsApp Campaign] Updated campaign", {
      campaignId: campaign._id,
      updates: Object.keys(payload),
      userId: req.user!.id,
    });

    res.status(200).json(campaign.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid update data"));
      return;
    }
    next(error);
  }
};

/**
 * Delete (archive) campaign
 *
 * DELETE /api/v1/whatsapp/campaigns/:id
 *
 * Soft delete - sets status to "archived" instead of removing from database.
 * Prevents deletion if bulk messaging is actively processing messages.
 *
 * Safety Checks:
 * 1. Find bulk messagings with status "queued" or "processing"
 * 2. Check if those bulk messagings have pending/processing messages in queue
 * 3. Reject deletion if active messages exist
 * 4. Otherwise, archive the campaign
 *
 * Response: Success message with 200 status
 *
 * @param req - Request with campaign ID
 * @param res - Express response
 * @param next - Express next function
 */
export const deleteCampaign = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);

    // Check for active bulk messaging runs
    const activeBulkMessagings = await BulkMessagingModel.find({
      campaignId: req.params.id,
      status: { $in: ["queued", "processing"] },
    })
      .select("_id")
      .lean()
      .exec();

    if (activeBulkMessagings.length > 0) {
      const activeBMIds = activeBulkMessagings.map((bm) => bm._id);

      // Check if these bulk messagings have pending messages
      const pendingMessagesCount = await MessageQueueModel.countDocuments({
        bulkMessagingId: { $in: activeBMIds },
        status: { $in: ["pending", "processing"] },
      }).exec();

      if (pendingMessagesCount > 0) {
        throw new AppError(
          400,
          ERROR_CODES.BAD_REQUEST,
          `Cannot delete campaign — ${pendingMessagesCount} messages are still being processed. Pause or wait for completion first.`
        );
      }
    }

    // Soft delete by setting status to archived
    const campaign = await CampaignModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "archived" } },
      { new: true }
    ).exec();

    if (!campaign) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Campaign not found");
    }

    logger.info("[WhatsApp Campaign] Archived campaign", {
      campaignId: campaign._id,
      name: campaign.name,
      userId: req.user!.id,
    });

    res.status(200).json({
      message: "Campaign archived successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get campaign aggregate statistics
 *
 * GET /api/v1/whatsapp/campaigns/:id/stats
 *
 * Aggregates stats across all bulk messagings in this campaign.
 *
 * Returns:
 * - totalBulkMessagings: Count of bulk messaging runs
 * - totalMessages: Total recipients across all runs
 * - totalSent: Messages sent
 * - totalDelivered: Messages delivered
 * - totalRead: Messages read
 * - totalFailed: Messages failed
 * - totalQueued: Messages queued
 *
 * Implementation:
 * Uses MongoDB aggregation to sum stats from all bulk messaging documents.
 *
 * @param req - Request with campaign ID
 * @param res - Express response
 * @param next - Express next function
 */
export const getCampaignStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);

    // Verify campaign exists
    const campaign = await CampaignModel.findById(req.params.id).exec();
    if (!campaign) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Campaign not found");
    }

    // Aggregate stats from all bulk messagings
    const stats = await BulkMessagingModel.aggregate([
      { $match: { campaignId: campaign._id } },
      {
        $group: {
          _id: null,
          totalBulkMessagings: { $sum: 1 },
          totalMessages: { $sum: "$stats.totalRecipients" },
          totalSent: { $sum: "$stats.sent" },
          totalDelivered: { $sum: "$stats.delivered" },
          totalRead: { $sum: "$stats.read" },
          totalFailed: { $sum: "$stats.failed" },
          totalQueued: { $sum: "$stats.queued" },
        },
      },
    ]);

    const data =
      stats.length > 0
        ? stats[0]
        : {
            totalBulkMessagings: 0,
            totalMessages: 0,
            totalSent: 0,
            totalDelivered: 0,
            totalRead: 0,
            totalFailed: 0,
            totalQueued: 0,
          };

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
