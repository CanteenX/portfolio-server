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

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

const featureSchema = z.object({ title: z.string(), description: z.string() });
const gallerySchema = z.object({ src: z.string(), caption: z.string() });
const codeSnippetSchema = z.object({ language: z.string(), label: z.string(), code: z.string() });

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
  liveUrl: z.string().max(2000).optional(),
  githubUrl: z.string().max(2000).optional(),
  problem: z.string().default(""),
  solution: z.string().default(""),
  features: z.array(featureSchema).default([]),
  gallery: z.array(gallerySchema).default([]),
  roi: z.array(z.string()).default([]),
  codeSnippet: codeSnippetSchema.optional(),
  architecture: z.string().default(""),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

const updateProjectSchema = createProjectSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// ─── PUBLIC ROUTES (no auth) ─────────────────────────────────────────────────

router.get("/api/v1/public/portfolio/projects", async (_req, res, next) => {
  try {
    const items = await PortfolioProjectModel.find({ isActive: true }).sort({ order: 1 }).lean().exec();
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/public/portfolio/projects/:slug", async (req, res, next) => {
  try {
    const project = await PortfolioProjectModel.findOne({ slug: req.params.slug, isActive: true }).lean().exec();
    if (!project) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
    }
    res.json(project);
  } catch (error) {
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
