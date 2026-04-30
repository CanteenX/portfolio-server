import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import { PortfolioMemberModel } from "./portfolio-team.models";

const router = Router();

const writeRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false });
const readRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });

const slugParamSchema = z.string().min(1).max(200).regex(/^[a-z0-9-]+$/);

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

const skillSchema = z.object({ name: z.string(), level: z.number().min(0).max(100) });
const educationSchema = z.object({ year: z.string(), degree: z.string(), school: z.string() });
const experienceSchema = z.object({ period: z.string(), role: z.string(), company: z.string(), desc: z.string() });
const projectRefSchema = z.object({ type: z.string(), title: z.string(), tags: z.array(z.string()).default([]) });
const certificateSchema = z.object({ title: z.string() });
const urlOrEmpty = z.string().url().optional().or(z.literal(""));
const socialsSchema = z.object({
  github: urlOrEmpty,
  linkedin: urlOrEmpty,
  portfolio: urlOrEmpty
});

const createMemberSchema = z.object({
  id: z.string().min(1).max(50).trim(),
  slug: z.string().min(1).max(200).trim().toLowerCase(),
  name: z.string().min(1).max(200).trim(),
  role: z.string().min(1).max(200).trim(),
  avatar: z.string().max(2000).default(""),
  glow: z.string().max(50).default("#ffffff"),
  accent: z.string().max(200).default("from-white to-gray-400"),
  power: z.string().max(500).default(""),
  bio: z.string().default(""),
  personal: z.object({
    location: z.string().default(""),
    email: z.string().default(""),
    languages: z.array(z.string()).default([])
  }).default({}),
  skills: z.array(skillSchema).default([]),
  education: z.array(educationSchema).default([]),
  experience: z.array(experienceSchema).default([]),
  projects: z.array(projectRefSchema).default([]),
  certificates: z.array(certificateSchema).default([]),
  socials: socialsSchema.default({}),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

const updateMemberSchema = createMemberSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// ─── PUBLIC ROUTES (no auth) ─────────────────────────────────────────────────

router.get("/api/v1/public/portfolio/team", readRateLimiter, async (_req, res, next) => {
  try {
    const items = await PortfolioMemberModel.find({ isActive: true }).lean().exec();
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/public/portfolio/team/:slug", readRateLimiter, async (req, res, next) => {
  try {
    const slug = slugParamSchema.parse(req.params.slug);
    const member = await PortfolioMemberModel.findOne({ slug, isActive: true }).lean().exec();
    if (!member) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Team member not found");
    }
    res.json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid slug"));
      return;
    }
    next(error);
  }
});

// ─── ADMIN ROUTES (auth required) ────────────────────────────────────────────

router.get("/api/v1/portfolio/team", authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { page, limit } = listQuerySchema.parse(req.query ?? {});
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      PortfolioMemberModel.countDocuments().exec(),
      PortfolioMemberModel.find().sort({ order: 1 }).skip(skip).limit(limit).lean().exec()
    ]);
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/portfolio/team", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = createMemberSchema.parse(req.body ?? {});
    const created = await PortfolioMemberModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid team member payload"));
      return;
    }
    next(error);
  }
});

router.get("/api/v1/portfolio/team/:id", authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const member = await PortfolioMemberModel.findById(req.params.id).lean().exec();
    if (!member) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Team member not found");
    res.json(member);
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/team/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const payload = updateMemberSchema.parse(req.body ?? {});
    const updated = await PortfolioMemberModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Team member not found");
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid team member update payload"));
      return;
    }
    next(error);
  }
});

router.delete("/api/v1/portfolio/team/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const member = await PortfolioMemberModel.findById(req.params.id).exec();
    if (!member) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Team member not found");
    await PortfolioMemberModel.deleteOne({ _id: member._id }).exec();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const portfolioTeamRoutes = router;
