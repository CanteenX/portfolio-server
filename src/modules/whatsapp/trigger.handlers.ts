/**
 * WhatsApp Trigger Handlers
 *
 * Event-driven auto-messaging system. When specific events occur in your app
 * (e.g., connection request, meeting booked), the trigger system automatically
 * sends the appropriate WhatsApp template.
 *
 * How It Works:
 * 1. Admin creates a trigger (event key + template + variable mapping)
 * 2. When the event fires, the trigger service resolves variables and sends
 * 3. Variables can come from: context (runtime data), user_field (DB lookup), static values
 *
 * Trigger Cache:
 * - Triggers are cached in memory (5 min TTL) for performance
 * - Cache is cleared when triggers are created/updated/deleted
 *
 * Database Collection: BM-WhatsAppTriggers
 */

import { ERROR_CODES } from "@admin-platform/shared-types";
import type { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { logger } from "../../core/logging/logger";
import { WhatsAppTriggerModel, WhatsAppTemplateModel } from "./models";

// ═══════════════════════════════════════════════════════════
// TRIGGER CACHE
// ═══════════════════════════════════════════════════════════

/**
 * In-memory trigger cache for fast event-key lookups
 * Cleared when triggers are modified via admin panel
 */
let triggerCache: any[] | null = null;
let triggerCacheExpiry = 0;
const TRIGGER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function clearTriggerCache(): void {
  triggerCache = null;
  triggerCacheExpiry = 0;
  logger.debug("[WhatsApp Trigger] Cache cleared");
}

export async function getCachedTriggers(): Promise<any[]> {
  if (triggerCache && Date.now() < triggerCacheExpiry) {
    return triggerCache;
  }
  triggerCache = await WhatsAppTriggerModel.find({ isActive: true }).populate("template").lean();
  triggerCacheExpiry = Date.now() + TRIGGER_CACHE_TTL_MS;
  return triggerCache;
}

// ═══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════

const createTriggerSchema = z.object({
  eventKey: z.string().min(1).max(100).trim(),
  displayName: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  template: z.string().regex(/^[0-9a-fA-F]{24}$/),
  isActive: z.boolean().default(true),
  availableParams: z.array(z.object({
    key: z.string(),
    label: z.string(),
    source: z.string().optional(),
  })).optional(),
  variableMapping: z.array(z.object({
    position: z.number().int().min(1),
    source: z.enum(["context", "user_field", "static"]),
    key: z.string(),
    fallback: z.string().optional(),
  })).optional(),
});

const listTriggersSchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  sorton: z.string().optional(),
  sortdir: z.enum(["asc", "desc"]).optional(),
  match: z.string().max(200).optional(),
});

const updateTriggerSchema = z.object({
  displayName: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  template: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  isActive: z.boolean().optional(),
  availableParams: z.array(z.object({
    key: z.string(),
    label: z.string(),
    source: z.string().optional(),
  })).optional(),
  variableMapping: z.array(z.object({
    position: z.number().int().min(1),
    source: z.enum(["context", "user_field", "static"]),
    key: z.string(),
    fallback: z.string().optional(),
  })).optional(),
});

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid ID format");
  }
}

// ═══════════════════════════════════════════════════════════
// HANDLER FUNCTIONS
// ═══════════════════════════════════════════════════════════

export const createTrigger = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createTriggerSchema.parse(req.body ?? {});

    // Check for duplicate event key
    const existing = await WhatsAppTriggerModel.findOne({ eventKey: payload.eventKey.toUpperCase() });
    if (existing) {
      throw new AppError(409, ERROR_CODES.BAD_REQUEST, "A trigger with this event key already exists");
    }

    // Verify template exists
    const templateExists = await WhatsAppTemplateModel.exists({ _id: payload.template });
    if (!templateExists) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }

    const trigger = await WhatsAppTriggerModel.create({
      eventKey: payload.eventKey.toUpperCase(),
      displayName: payload.displayName,
      description: payload.description || "",
      template: payload.template,
      isActive: payload.isActive,
      availableParams: payload.availableParams || [],
      variableMapping: payload.variableMapping || [],
    });

    clearTriggerCache();

    logger.info("[WhatsApp Trigger] Created trigger", { triggerId: trigger._id, eventKey: trigger.eventKey });
    res.status(201).json(trigger.toObject());
  } catch (error: any) {
    if (error.code === 11000) {
      next(new AppError(409, ERROR_CODES.BAD_REQUEST, "A trigger with this event key already exists"));
      return;
    }
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid trigger data"));
      return;
    }
    next(error);
  }
};

export const listTriggers = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = listTriggersSchema.parse(req.body ?? {});
    const pipeline: any[] = [];

    if (params.match) {
      pipeline.push({
        $match: {
          $or: [
            { eventKey: { $regex: params.match, $options: "i" } },
            { displayName: { $regex: params.match, $options: "i" } },
            { description: { $regex: params.match, $options: "i" } },
          ],
        },
      });
    }

    const sortField = params.sorton || "createdAt";
    const sortDirection = params.sortdir === "asc" ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    // Lookup template info
    pipeline.push({
      $lookup: {
        from: "BM-WhatsAppTemplates",
        localField: "template",
        foreignField: "_id",
        as: "templateData",
      },
    });
    pipeline.push({
      $addFields: { templateInfo: { $arrayElemAt: ["$templateData", 0] } },
    });
    pipeline.push({ $project: { templateData: 0 } });

    pipeline.push({
      $facet: {
        stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
        stage2: [{ $skip: params.skip }, { $limit: params.per_page }],
      },
    });
    pipeline.push({ $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true } });
    pipeline.push({ $project: { count: { $ifNull: ["$stage1.count", 0] }, data: "$stage2" } });

    const result = await WhatsAppTriggerModel.aggregate(pipeline);
    res.status(200).json(result.length > 0 ? result[0] : { count: 0, data: [] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid filter parameters"));
      return;
    }
    next(error);
  }
};

export const getTriggerById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);
    const trigger = await WhatsAppTriggerModel.findById(req.params.id).populate("template").lean();
    if (!trigger) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Trigger not found");
    }
    res.status(200).json(trigger);
  } catch (error) {
    next(error);
  }
};

export const updateTrigger = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);
    const payload = updateTriggerSchema.parse(req.body ?? {});

    // Verify template if being updated
    if (payload.template) {
      const templateExists = await WhatsAppTemplateModel.exists({ _id: payload.template });
      if (!templateExists) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
      }
    }

    const trigger = await WhatsAppTriggerModel.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    ).populate("template");

    if (!trigger) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Trigger not found");
    }

    clearTriggerCache();

    logger.info("[WhatsApp Trigger] Updated trigger", { triggerId: trigger._id, eventKey: trigger.eventKey });
    res.status(200).json(trigger.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid update data"));
      return;
    }
    next(error);
  }
};

export const deleteTrigger = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);
    const trigger = await WhatsAppTriggerModel.findByIdAndDelete(req.params.id);
    if (!trigger) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Trigger not found");
    }

    clearTriggerCache();

    logger.info("[WhatsApp Trigger] Deleted trigger", { triggerId: trigger._id, eventKey: trigger.eventKey });
    res.status(200).json({ message: "Trigger deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * List all approved templates for trigger assignment
 * Used by the admin UI to show a dropdown of templates when creating triggers
 */
export const listApprovedTemplates = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const templates = await WhatsAppTemplateModel.find({
      metaStatus: "APPROVED",
      status: { $ne: "deleted" },
    })
      .select("_id name metaTemplateName language category bodyText variables")
      .lean();

    res.status(200).json(templates);
  } catch (error) {
    next(error);
  }
};
