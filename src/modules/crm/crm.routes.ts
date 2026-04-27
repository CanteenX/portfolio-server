import { ERROR_CODES } from "@admin-platform/shared-types";
import { Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { CrmContactModel, CrmDealModel, CrmPipelineModel, type PipelineStage } from "./crm.models";

const router = Router();

const crmWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const contactSchema = z.object({
  displayName: z.string().min(1).max(200),
  primaryEmail: z.string().email().optional(),
  primaryPhone: z.string().max(40).optional(),
  companyName: z.string().max(200).optional(),
  ownerUserId: z.string().optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
  notes: z.string().max(2000).optional()
});

const pipelineSchema = z.object({
  name: z.string().min(1).max(120),
  isDefault: z.boolean().default(false),
  stages: z
    .array(
      z.object({
        key: z.string().min(1).max(60),
        label: z.string().min(1).max(120),
        order: z.number().int().min(0),
        isTerminalWon: z.boolean().optional(),
        isTerminalLost: z.boolean().optional()
      })
    )
    .min(1)
    .max(30)
});

const dealSchema = z.object({
  title: z.string().min(1),
  contactId: z.string().min(1),
  pipelineId: z.string().min(1),
  stageKey: z.string().min(1),
  amountValue: z.number().min(0).default(0),
  currency: z.string().min(3).max(3).default("USD"),
  expectedCloseDate: z.string().datetime().optional(),
  ownerUserId: z.string().optional(),
  lostReason: z.string().optional()
});

const stageTransitionSchema = z.object({
  stageKey: z.string().min(1),
  lostReason: z.string().optional()
});

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

function deriveDealStatus(stage: { isTerminalWon?: boolean; isTerminalLost?: boolean }): "open" | "won" | "lost" {
  if (stage.isTerminalWon) return "won";
  if (stage.isTerminalLost) return "lost";
  return "open";
}

router.get("/api/v1/crm/contacts", ...moduleGuards("crm", "crm.read"), async (_req, res, next) => {
  try {
    const items = await CrmContactModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/crm/contacts", crmWriteRateLimiter, ...moduleGuards("crm", "crm.create"), async (req, res, next) => {
  try {
    const payload = contactSchema.parse(req.body ?? {});
    const created = await CrmContactModel.create(payload);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid contact payload"));
      return;
    }
    next(error);
  }
});

router.patch("/api/v1/crm/contacts/:id", crmWriteRateLimiter, ...moduleGuards("crm", "crm.update"), async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const payload = contactSchema.partial().parse(req.body ?? {});
    const updated = await CrmContactModel.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    })
      .lean()
      .exec();
    if (!updated) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid contact update payload"));
      return;
    }
    next(error);
  }
});

router.delete("/api/v1/crm/contacts/:id", crmWriteRateLimiter, ...moduleGuards("crm", "crm.delete"), async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const hasDeals = await CrmDealModel.countDocuments({ contactId: req.params.id }).exec();
    if (hasDeals > 0) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot delete contact linked to deals");
    }
    const deleted = await CrmContactModel.findByIdAndDelete(req.params.id).lean().exec();
    if (!deleted) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/crm/pipelines", ...moduleGuards("crm", "crm.read"), async (_req, res, next) => {
  try {
    const items = await CrmPipelineModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/crm/pipelines", crmWriteRateLimiter, ...moduleGuards("crm", "crm.create"), async (req, res, next) => {
  try {
    const payload = pipelineSchema.parse(req.body ?? {});
    if (payload.isDefault) {
      await CrmPipelineModel.updateMany({}, { $set: { isDefault: false } }).exec();
    }
    const created = await CrmPipelineModel.create(payload);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid pipeline payload"));
      return;
    }
    next(error);
  }
});

router.patch("/api/v1/crm/pipelines/:id", crmWriteRateLimiter, ...moduleGuards("crm", "crm.update"), async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const payload = pipelineSchema.partial().parse(req.body ?? {});
    if (payload.isDefault) {
      await CrmPipelineModel.updateMany({}, { $set: { isDefault: false } }).exec();
    }
    const updated = await CrmPipelineModel.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    })
      .lean()
      .exec();
    if (!updated) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Pipeline not found");
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid pipeline update payload"));
      return;
    }
    next(error);
  }
});

router.get("/api/v1/crm/deals", ...moduleGuards("crm", "crm.read"), async (_req, res, next) => {
  try {
    const items = await CrmDealModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/crm/deals", crmWriteRateLimiter, ...moduleGuards("crm", "crm.create"), async (req, res, next) => {
  try {
    const payload = dealSchema.parse(req.body ?? {});
    ensureValidObjectId(payload.contactId);
    ensureValidObjectId(payload.pipelineId);

    const [contact, pipeline] = await Promise.all([
      CrmContactModel.findById(payload.contactId).exec(),
      CrmPipelineModel.findById(payload.pipelineId).exec()
    ]);

    if (!contact) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
    if (!pipeline) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Pipeline not found");

    const stage = pipeline.stages.find((item: PipelineStage) => item.key === payload.stageKey);
    if (!stage) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stage not found in pipeline");
    if (stage.isTerminalLost && !payload.lostReason) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Lost reason is required for lost stage");
    }

    const created = await CrmDealModel.create({
      ...payload,
      contactId: new mongoose.Types.ObjectId(payload.contactId),
      pipelineId: new mongoose.Types.ObjectId(payload.pipelineId),
      expectedCloseDate: payload.expectedCloseDate ? new Date(payload.expectedCloseDate) : undefined,
      status: deriveDealStatus(stage)
    });

    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid deal payload"));
      return;
    }
    next(error);
  }
});

router.patch("/api/v1/crm/deals/:id", crmWriteRateLimiter, ...moduleGuards("crm", "crm.update"), async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const payload = dealSchema.partial().parse(req.body ?? {});
    if (payload.stageKey !== undefined || payload.pipelineId !== undefined || payload.lostReason !== undefined) {
      throw new AppError(
        400,
        ERROR_CODES.BAD_REQUEST,
        "Use /api/v1/crm/deals/:id/stage for pipeline, stage, or lost reason transitions"
      );
    }
    if (payload.contactId) {
      ensureValidObjectId(payload.contactId);
      const contact = await CrmContactModel.findById(payload.contactId).exec();
      if (!contact) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
      }
    }
    const updated = await CrmDealModel.findByIdAndUpdate(
      req.params.id,
      {
        ...payload,
        expectedCloseDate: payload.expectedCloseDate ? new Date(payload.expectedCloseDate) : undefined
      },
      { new: true, runValidators: true }
    )
      .lean()
      .exec();
    if (!updated) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Deal not found");
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid deal update payload"));
      return;
    }
    next(error);
  }
});

router.post("/api/v1/crm/deals/:id/stage", crmWriteRateLimiter, ...moduleGuards("crm", "crm.update"), async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const payload = stageTransitionSchema.parse(req.body ?? {});
    const deal = await CrmDealModel.findById(req.params.id).exec();
    if (!deal) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Deal not found");

    const pipeline = await CrmPipelineModel.findById(deal.pipelineId).exec();
    if (!pipeline) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Pipeline not found");

    const stage = pipeline.stages.find((item: PipelineStage) => item.key === payload.stageKey);
    if (!stage) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stage not found in pipeline");

    if (stage.isTerminalLost && !payload.lostReason) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Lost reason is required for lost stage");
    }

    deal.stageKey = payload.stageKey;
    deal.status = deriveDealStatus(stage);
    deal.lostReason = stage.isTerminalLost ? payload.lostReason : undefined;
    await deal.save();
    res.json(deal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid stage transition payload"));
      return;
    }
    next(error);
  }
});

router.get("/api/v1/crm/insights", ...moduleGuards("crm", "crm.read"), async (_req, res, next) => {
  try {
    const [contactCount, openDeals, wonDeals, lostDeals] = await Promise.all([
      CrmContactModel.countDocuments().exec(),
      CrmDealModel.countDocuments({ status: "open" }).exec(),
      CrmDealModel.countDocuments({ status: "won" }).exec(),
      CrmDealModel.countDocuments({ status: "lost" }).exec()
    ]);

    res.json({
      counts: {
        contacts: contactCount,
        openDeals,
        wonDeals,
        lostDeals
      }
    });
  } catch (error) {
    next(error);
  }
});

export const crmRoutes = router;
