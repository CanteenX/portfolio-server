import { ERROR_CODES } from "@admin-platform/shared-types";
import type { RoleKey } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import { requireRole } from "../../core/rbac/role.middleware";
import { requireRbacPermission } from "../../core/rbac/rbac-permission.middleware";
import { revalidateWebsite, SERVICE_PATHS } from "../../core/revalidate/revalidate.service";
import { PortfolioServiceModel } from "./portfolio-services.models";

const ADMIN_ROLES: RoleKey[] = ["super_admin", "admin"];

const router = Router();

const writeRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

const createServiceSchema = z.object({
  slug: z.string().min(1).max(120).trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens"),
  title: z.string().min(1).max(120).trim(),
  subtitle: z.string().max(200).trim().default(""),
  description: z.string().max(2000).default(""),
  tags: z.array(z.string().trim()).default([]),
  icon: z.string().max(80).trim().default(""),
  pointers: z.array(z.string().trim()).default([]),
  highlights: z.array(z.string().trim()).default([]),
  showInContactForm: z.boolean().default(true),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

const updateServiceSchema = createServiceSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

// ─── PUBLIC ──────────────────────────────────────────────────────────────────

/**
 * The single source of truth for what the business sells.
 *
 * Three surfaces render from this one response — /services, the homepage
 * carousel and the contact form's dropdown — which is the point. They
 * previously held three separate hardcoded lists that had already drifted:
 * /services advertised eight, the carousel a different eight, and a service
 * missing from the dropdown could not be selected by a lead at all.
 */
router.get("/api/v1/public/portfolio/services", async (_req, res, next) => {
  try {
    const items = await PortfolioServiceModel.find({ isActive: true })
      .sort({ order: 1, title: 1 })
      .lean()
      .exec();
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN ───────────────────────────────────────────────────────────────────

router.get(
  "/api/v1/portfolio/services",
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission("/portfolio/services", "read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { page, limit } = listQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const [total, items] = await Promise.all([
        PortfolioServiceModel.countDocuments().exec(),
        PortfolioServiceModel.find().sort({ order: 1, title: 1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({ items, page, limit, total });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/v1/portfolio/services",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission("/portfolio/services", "write"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createServiceSchema.parse(req.body ?? {});
      const created = await PortfolioServiceModel.create(payload);
      revalidateWebsite(SERVICE_PATHS);
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, error.issues[0]?.message ?? "Invalid service payload"));
        return;
      }
      if ((error as { code?: number }).code === 11000) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "A service with that slug already exists."));
        return;
      }
      next(error);
    }
  }
);

router.get(
  "/api/v1/portfolio/services/:id",
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission("/portfolio/services", "read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const item = await PortfolioServiceModel.findById(req.params.id).lean().exec();
      if (!item) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Service not found");
      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/api/v1/portfolio/services/:id",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission("/portfolio/services", "edit"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = updateServiceSchema.parse(req.body ?? {});
      const updated = await PortfolioServiceModel.findByIdAndUpdate(
        req.params.id,
        { $set: payload },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();
      if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Service not found");
      revalidateWebsite(SERVICE_PATHS);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, error.issues[0]?.message ?? "Invalid service payload"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/portfolio/services/:id",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission("/portfolio/services", "delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const existing = await PortfolioServiceModel.findById(req.params.id).exec();
      if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Service not found");
      await PortfolioServiceModel.deleteOne({ _id: existing._id }).exec();
      revalidateWebsite(SERVICE_PATHS);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export const portfolioServicesRoutes = router;
