import { ERROR_CODES } from "@admin-platform/shared-types";
import type { RoleKey } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import type { Model } from "mongoose";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import { requireRole } from "../../core/rbac/role.middleware";
import { requireRbacPermission } from "../../core/rbac/rbac-permission.middleware";
import { revalidateWebsite, SOCIAL_PROOF_PATHS } from "../../core/revalidate/revalidate.service";
import {
  PortfolioTestimonialModel,
  PortfolioClientLogoModel,
  PortfolioMetricModel
} from "./portfolio-social-proof.models";

const ADMIN_ROLES: RoleKey[] = ["super_admin", "admin"];

const router = Router();

const writeRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

const testimonialSchema = z.object({
  quote: z.string().min(1).max(1200).trim(),
  authorName: z.string().min(1).max(120).trim(),
  authorRole: z.string().max(120).trim().default(""),
  authorCompany: z.string().max(120).trim().default(""),
  avatar: z.string().max(500).trim().default(""),
  rating: z.number().int().min(1).max(5).optional(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

const clientLogoSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  logo: z.string().max(500).trim().default(""),
  websiteUrl: z.string().max(500).trim().default(""),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

const metricSchema = z.object({
  value: z.string().min(1).max(40).trim(),
  label: z.string().min(1).max(120).trim(),
  description: z.string().max(400).trim().default(""),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

/**
 * The three social-proof collections differ only in their schema and menu, so
 * their twelve endpoints are generated rather than written out. Hand-writing
 * them invites the usual drift: one resource forgetting to revalidate, another
 * validating an ObjectId and the third trusting the path param.
 */
function registerResource<T>(options: {
  path: string;
  menuUrl: string;
  model: Model<T>;
  create: z.ZodType<Record<string, unknown>>;
  label: string;
}): void {
  const { path, menuUrl, model, create, label } = options;
  const update = (create as unknown as z.ZodObject<z.ZodRawShape>).partial();

  const ensureId = (id: string): void => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
    }
  };

  const onZodError = (error: unknown, next: (err?: unknown) => void): boolean => {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, error.issues[0]?.message ?? `Invalid ${label} payload`));
      return true;
    }
    return false;
  };

  // Public: only active rows, ordered. Never paginated — these lists are short
  // by nature and the website renders all of them at once.
  router.get(`/api/v1/public/portfolio/${path}`, async (_req, res, next) => {
    try {
      const items = await model.find({ isActive: true } as never).sort({ order: 1 }).lean().exec();
      res.json({ items, total: items.length });
    } catch (error) {
      next(error);
    }
  });

  router.get(
    `/api/v1/portfolio/${path}`,
    authenticateJwt,
    requireRole(ADMIN_ROLES),
    requireRbacPermission(menuUrl, "read"),
    async (_req: AuthenticatedRequest, res, next) => {
      try {
        const items = await model.find().sort({ order: 1 }).lean().exec();
        res.json({ items, total: items.length });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    `/api/v1/portfolio/${path}`,
    writeRateLimiter,
    authenticateJwt,
    requireRole(ADMIN_ROLES),
    requireRbacPermission(menuUrl, "write"),
    async (req: AuthenticatedRequest, res, next) => {
      try {
        const payload = create.parse(req.body ?? {});
        const created = await model.create(payload as never);
        revalidateWebsite(SOCIAL_PROOF_PATHS);
        res.status(201).json(created);
      } catch (error) {
        if (onZodError(error, next)) return;
        next(error);
      }
    }
  );

  router.patch(
    `/api/v1/portfolio/${path}/:id`,
    writeRateLimiter,
    authenticateJwt,
    requireRole(ADMIN_ROLES),
    requireRbacPermission(menuUrl, "edit"),
    async (req: AuthenticatedRequest, res, next) => {
      try {
        ensureId(req.params.id);
        const payload = update.parse(req.body ?? {});
        const updated = await model
          .findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true })
          .lean()
          .exec();
        if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, `${label} not found`);
        revalidateWebsite(SOCIAL_PROOF_PATHS);
        res.json(updated);
      } catch (error) {
        if (onZodError(error, next)) return;
        next(error);
      }
    }
  );

  router.delete(
    `/api/v1/portfolio/${path}/:id`,
    writeRateLimiter,
    authenticateJwt,
    requireRole(ADMIN_ROLES),
    requireRbacPermission(menuUrl, "delete"),
    async (req: AuthenticatedRequest, res, next) => {
      try {
        ensureId(req.params.id);
        const deleted = await model.findByIdAndDelete(req.params.id).lean().exec();
        if (!deleted) throw new AppError(404, ERROR_CODES.NOT_FOUND, `${label} not found`);
        revalidateWebsite(SOCIAL_PROOF_PATHS);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );
}

registerResource({
  path: "testimonials",
  menuUrl: "/portfolio/social-proof",
  model: PortfolioTestimonialModel,
  create: testimonialSchema as never,
  label: "Testimonial"
});

registerResource({
  path: "client-logos",
  menuUrl: "/portfolio/social-proof",
  model: PortfolioClientLogoModel,
  create: clientLogoSchema as never,
  label: "Client logo"
});

registerResource({
  path: "metrics",
  menuUrl: "/portfolio/social-proof",
  model: PortfolioMetricModel,
  create: metricSchema as never,
  label: "Metric"
});

export const portfolioSocialProofRoutes = router;
