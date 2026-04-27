/**
 * WhatsApp Template Handlers
 *
 * Manages WhatsApp message templates that must be pre-approved by Meta.
 * Templates contain variables ({{1}}, {{2}}) that are resolved at send time.
 *
 * Key Features:
 * - Auto-detect variables from template body text
 * - Sync approved templates from Meta Graph API
 * - Submit new templates to Meta for approval
 * - Variable management with field mapping
 *
 * Meta Template Lifecycle:
 * NOT_SUBMITTED → PENDING (submitted) → APPROVED / REJECTED
 *
 * TODO: CHANGE THIS - Set WHATSAPP_WABA_ID and WHATSAPP_ACCESS_TOKEN in .env
 */

import { ERROR_CODES } from "@admin-platform/shared-types";
import type { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { env } from "../../config/env";
import { logger } from "../../core/logging/logger";
import { WhatsAppTemplateModel } from "./models";

// ═══════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  metaTemplateName: z.string().min(1).max(200).trim(),
  language: z.string().default("en"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).default("MARKETING"),
  bodyText: z.string().max(1024).optional(),
  headerText: z.string().max(60).optional(),
  footerText: z.string().max(60).optional(),
  variables: z.array(z.object({
    position: z.number().int().min(1),
    description: z.string().optional(),
    sampleValue: z.string().optional(),
    fieldMapping: z.string().optional(),
    customValue: z.string().optional(),
  })).optional(),
});

const listTemplatesSchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  per_page: z.coerce.number().int().min(1).max(100).default(10),
  sorton: z.string().optional(),
  sortdir: z.enum(["asc", "desc"]).optional(),
  match: z.string().max(200).optional(),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).optional(),
  metaStatus: z.string().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  metaTemplateName: z.string().min(1).max(200).trim().optional(),
  language: z.string().optional(),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).optional(),
  bodyText: z.string().max(1024).optional(),
  headerText: z.string().max(60).optional(),
  footerText: z.string().max(60).optional(),
  variables: z.array(z.object({
    position: z.number().int().min(1),
    description: z.string().optional(),
    sampleValue: z.string().optional(),
    fieldMapping: z.string().optional(),
    customValue: z.string().optional(),
  })).optional(),
  status: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid ID format");
  }
}

/**
 * Parse {{1}}, {{2}}, etc. from body text and return variables array
 * Auto-detects variable placeholders and preserves existing variable config
 */
function extractVariablesFromText(bodyText: string | undefined, existingVariables: any[] = []): any[] {
  if (!bodyText) return existingVariables;
  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const positions = [...new Set(matches.map((m) => parseInt(m.replace(/[{}]/g, ""), 10)))].sort((a, b) => a - b);

  return positions.map((pos) => {
    const existing = existingVariables.find((v: any) => v.position === pos);
    return existing || {
      position: pos,
      description: `Variable ${pos}`,
      sampleValue: "",
      fieldMapping: "custom",
      customValue: "",
    };
  });
}

// ═══════════════════════════════════════════════════════════
// HANDLER FUNCTIONS
// ═══════════════════════════════════════════════════════════

export const createTemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = createTemplateSchema.parse(req.body ?? {});

    // Auto-detect variables from bodyText if none provided
    const resolvedVars = (payload.variables && payload.variables.length > 0)
      ? payload.variables
      : extractVariablesFromText(payload.bodyText);

    const template = await WhatsAppTemplateModel.create({
      name: payload.name,
      metaTemplateName: payload.metaTemplateName,
      language: payload.language,
      category: payload.category,
      bodyText: payload.bodyText || "",
      headerText: payload.headerText || "",
      footerText: payload.footerText || "",
      variables: resolvedVars,
    });

    logger.info("[WhatsApp Template] Created template", { templateId: template._id, name: template.name });
    res.status(201).json(template.toObject());
  } catch (error: any) {
    if (error.code === 11000) {
      next(new AppError(409, ERROR_CODES.BAD_REQUEST, "A template with this Meta template name and language already exists"));
      return;
    }
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid template data"));
      return;
    }
    next(error);
  }
};

export const listTemplates = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const params = listTemplatesSchema.parse(req.body ?? {});
    const pipeline: any[] = [];

    const baseMatch: any = { status: { $ne: "deleted" } };
    if (params.category) baseMatch.category = params.category;
    if (params.metaStatus) baseMatch.metaStatus = params.metaStatus;
    pipeline.push({ $match: baseMatch });

    if (params.match) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: params.match, $options: "i" } },
            { metaTemplateName: { $regex: params.match, $options: "i" } },
            { bodyText: { $regex: params.match, $options: "i" } },
          ],
        },
      });
    }

    const sortField = params.sorton || "createdAt";
    const sortDirection = params.sortdir === "asc" ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    pipeline.push({
      $facet: {
        stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
        stage2: [{ $skip: params.skip }, { $limit: params.per_page }],
      },
    });
    pipeline.push({ $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true } });
    pipeline.push({ $project: { count: { $ifNull: ["$stage1.count", 0] }, data: "$stage2" } });

    const result = await WhatsAppTemplateModel.aggregate(pipeline);
    res.status(200).json(result.length > 0 ? result[0] : { count: 0, data: [] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid filter parameters"));
      return;
    }
    next(error);
  }
};

export const getTemplateById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);
    const template = await WhatsAppTemplateModel.findById(req.params.id).lean();
    if (!template || (template as any).status === "deleted") {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }
    res.status(200).json(template);
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);
    const payload = updateTemplateSchema.parse(req.body ?? {});

    // Auto-detect variables from bodyText if none provided
    const resolvedVars = (payload.variables && payload.variables.length > 0)
      ? payload.variables
      : extractVariablesFromText(payload.bodyText);

    const template = await WhatsAppTemplateModel.findByIdAndUpdate(
      req.params.id,
      { ...payload, variables: resolvedVars },
      { new: true, runValidators: true }
    );

    if (!template) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }

    logger.info("[WhatsApp Template] Updated template", { templateId: template._id });
    res.status(200).json(template.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid update data"));
      return;
    }
    next(error);
  }
};

export const deleteTemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);
    const template = await WhatsAppTemplateModel.findByIdAndUpdate(
      req.params.id,
      { status: "deleted" },
      { new: true }
    );

    if (!template) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }

    logger.info("[WhatsApp Template] Deleted template", { templateId: template._id });
    res.status(200).json({ message: "Template deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit template to Meta for approval
 *
 * Builds Meta components array from local template data and sends to
 * Meta Graph API. Updates local record with Meta's response.
 *
 * TODO: CHANGE THIS - Set WHATSAPP_WABA_ID and WHATSAPP_ACCESS_TOKEN in .env
 */
export const submitToMeta = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    ensureValidObjectId(req.params.id);

    if (!env.WHATSAPP_WABA_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "WHATSAPP_WABA_ID and WHATSAPP_ACCESS_TOKEN must be configured");
    }

    const template = (await WhatsAppTemplateModel.findById(req.params.id)) as any;
    if (!template || template.status === "deleted") {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }

    // Build Meta components array
    const components: any[] = [];

    if (template.headerText) {
      components.push({ type: "HEADER", format: "TEXT", text: template.headerText });
    }

    if (template.bodyText) {
      const bodyComponent: any = { type: "BODY", text: template.bodyText };
      const vars = (template.variables || []).sort((a: any, b: any) => a.position - b.position);
      if (vars.length > 0) {
        bodyComponent.example = {
          body_text: [vars.map((v: any) => v.sampleValue || `sample_${v.position}`)],
        };
      }
      components.push(bodyComponent);
    }

    if (template.footerText) {
      components.push({ type: "FOOTER", text: template.footerText });
    }

    const payload = {
      name: template.metaTemplateName,
      language: template.language || "en",
      category: template.category || "MARKETING",
      components,
    };

    const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_WABA_ID}/message_templates`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new AppError(502, ERROR_CODES.INTERNAL_ERROR, `Meta rejected the template: ${data.error?.message || JSON.stringify(data)}`);
    }

    await WhatsAppTemplateModel.findByIdAndUpdate(template._id, {
      metaTemplateId: data.id,
      metaStatus: data.status || "PENDING",
    });

    logger.info("[WhatsApp Template] Submitted to Meta", { templateId: template._id, metaStatus: data.status });
    res.status(200).json({
      message: `Template submitted to Meta - status: ${data.status || "PENDING"}`,
      metaTemplateId: data.id,
      metaStatus: data.status || "PENDING",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync approved templates from Meta Graph API
 *
 * Fetches all templates from Meta, creates/updates local records.
 * Only syncs APPROVED templates. Preserves existing variable mappings.
 *
 * TODO: CHANGE THIS - Set WHATSAPP_WABA_ID and WHATSAPP_ACCESS_TOKEN in .env
 */
export const syncFromMeta = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!env.WHATSAPP_WABA_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "WHATSAPP_WABA_ID and WHATSAPP_ACCESS_TOKEN must be configured");
    }

    const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_WABA_ID}/message_templates?limit=100`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new AppError(502, ERROR_CODES.INTERNAL_ERROR, `Failed to fetch from Meta: ${data.error?.message || JSON.stringify(data)}`);
    }

    const templates = data.data || [];
    let created = 0;
    let updated = 0;

    for (const metaTemplate of templates) {
      if (metaTemplate.status !== "APPROVED") continue;

      let bodyText = "";
      let headerText = "";
      let footerText = "";
      const variables: any[] = [];

      for (const component of metaTemplate.components || []) {
        if (component.type === "BODY") {
          bodyText = component.text || "";
          const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
          matches.forEach((match: string) => {
            const position = parseInt(match.replace(/[{}]/g, ""), 10);
            if (!variables.find((v) => v.position === position)) {
              const example = component.example?.body_text?.[0]?.[position - 1] || "";
              variables.push({
                position,
                description: `Variable ${position}`,
                sampleValue: example,
                fieldMapping: "custom",
                customValue: "",
              });
            }
          });
        } else if (component.type === "HEADER") {
          headerText = component.text || "";
        } else if (component.type === "FOOTER") {
          footerText = component.text || "";
        }
      }

      const existing = (await WhatsAppTemplateModel.findOne({
        metaTemplateName: metaTemplate.name,
        language: metaTemplate.language,
      })) as any;

      if (existing) {
        await WhatsAppTemplateModel.findByIdAndUpdate(existing._id, {
          $set: {
            category: metaTemplate.category || "MARKETING",
            bodyText,
            headerText,
            footerText,
            components: metaTemplate.components || [],
            variables: existing.variables?.length > 0 ? existing.variables : variables,
            metaTemplateId: metaTemplate.id || existing.metaTemplateId,
            metaStatus: "APPROVED",
            lastSyncedAt: new Date(),
          },
        });
        updated++;
      } else {
        await WhatsAppTemplateModel.create({
          name: metaTemplate.name,
          metaTemplateName: metaTemplate.name,
          language: metaTemplate.language,
          category: metaTemplate.category || "MARKETING",
          bodyText,
          headerText,
          footerText,
          components: metaTemplate.components || [],
          variables,
          metaTemplateId: metaTemplate.id || null,
          metaStatus: "APPROVED",
          lastSyncedAt: new Date(),
        });
        created++;
      }
    }

    logger.info("[WhatsApp Template] Sync complete", { totalFromMeta: templates.length, created, updated });
    res.status(200).json({
      message: `Sync complete: ${created} created, ${updated} updated`,
      totalFromMeta: templates.length,
      created,
      updated,
    });
  } catch (error) {
    next(error);
  }
};
