import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import { PortfolioProjectModel } from "./portfolio-projects.models";

const router = Router();

const writeRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
const readRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const slugParamSchema = z.string().min(1).max(200).regex(/^[a-z0-9-]+$/);

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

const featureSchema = z.object({ title: z.string(), description: z.string() });
const gallerySchema = z.object({ src: z.string(), caption: z.string() });
const codeSnippetSchema = z.object({ language: z.string(), label: z.string(), code: z.string() });
const roiItemSchema = z.object({
  value: z.string().default(""),
  label: z.string().default(""),
  description: z.string().default(""),
  icon: z.string().default("")
});
const screenSchema = z.object({
  label: z.string().default(""),
  caption: z.string().default(""),
  description: z.string().default(""),
  image: z.string().default("")
});
const workflowStepSchema = z.object({
  step: z.string().default(""),
  title: z.string().default(""),
  description: z.string().default("")
});

const createProjectSchema = z.object({
  slug: z.string().min(1).max(200).trim().toLowerCase(),
  title: z.string().min(1).max(300).trim(),
  category: z.string().min(1).max(100).trim(),
  metric: z.string().max(200).default(""),
  year: z.string().max(20).default(""),
  image: z.string().max(2000).default(""),
  client: z.string().max(300).default(""),
  timeframe: z.string().max(200).default(""),
  role: z.string().max(300).default(""),
  stack: z.array(z.string()).default([]),
  techStack: z.array(z.string()).default([]),
  liveUrl: z.string().url().max(2000).optional().or(z.literal("")),
  githubUrl: z.string().url().max(2000).optional().or(z.literal("")),
  problem: z.string().default(""),
  solution: z.string().default(""),
  features: z.array(featureSchema).default([]),
  gallery: z.array(gallerySchema).default([]),
  roi: z.array(roiItemSchema).default([]),
  roiSectionDescription: z.string().default(""),
  screens: z.array(screenSchema).default([]),
  workflowSteps: z.array(workflowStepSchema).default([]),
  stackSectionDescription: z.string().default(""),
  codeSnippet: codeSnippetSchema.nullish(),
  architecture: z.string().default(""),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

const updateProjectSchema = createProjectSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const listByParamsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().max(100).optional(),
  year: z.string().max(20).optional(),
  client: z.string().max(300).optional(),
  stack: z.union([z.string(), z.array(z.string())]).optional().transform((v) => {
    if (!v) return undefined;
    return Array.isArray(v) ? v : [v];
  }),
  search: z.string().max(200).optional()
});

// ─── PUBLIC ROUTES (no auth) ─────────────────────────────────────────────────

router.get("/api/v1/public/portfolio/projects/listbyparams", readRateLimiter, async (req, res, next) => {
  try {
    const { page, limit, category, year, client, stack, search } = listByParamsQuerySchema.parse(req.query ?? {});
    const filter: Record<string, unknown> = { isActive: true };
    if (category) filter["category"] = category;
    if (year) filter["year"] = year;
    if (client) filter["client"] = client;
    if (stack && stack.length > 0) filter["stack"] = { $in: stack };
    if (search) {
      const safeSearch = escapeRegex(search);
      filter["$or"] = [
        { title: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } }
      ];
    }
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      PortfolioProjectModel.countDocuments(filter).exec(),
      PortfolioProjectModel.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean().exec()
    ]);
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/public/portfolio/projects", readRateLimiter, async (_req, res, next) => {
  try {
    const items = await PortfolioProjectModel.find({ isActive: true }).sort({ order: 1 }).limit(200).lean().exec();
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/public/portfolio/projects/:slug", readRateLimiter, async (req, res, next) => {
  try {
    const slug = slugParamSchema.parse(req.params.slug);
    const project = await PortfolioProjectModel.findOne({ slug, isActive: true }).lean().exec();
    if (!project) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
    }
    res.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid slug"));
      return;
    }
    next(error);
  }
});

// ─── ADMIN ROUTES (auth required) ────────────────────────────────────────────

router.get("/api/v1/portfolio/projects", authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { page, limit } = listQuerySchema.parse(req.query ?? {});
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      PortfolioProjectModel.countDocuments().exec(),
      PortfolioProjectModel.find().sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean().exec()
    ]);
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/portfolio/projects", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = createProjectSchema.parse(req.body ?? {});
    const created = await PortfolioProjectModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project payload"));
      return;
    }
    next(error);
  }
});

router.get("/api/v1/portfolio/projects/:id", authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const project = await PortfolioProjectModel.findById(req.params.id).lean().exec();
    if (!project) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
    res.json(project);
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/projects/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const payload = updateProjectSchema.parse(req.body ?? {});
    const updated = await PortfolioProjectModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project update payload"));
      return;
    }
    next(error);
  }
});

router.delete("/api/v1/portfolio/projects/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const project = await PortfolioProjectModel.findById(req.params.id).exec();
    if (!project) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
    await PortfolioProjectModel.deleteOne({ _id: project._id }).exec();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const portfolioProjectsRoutes = router;
