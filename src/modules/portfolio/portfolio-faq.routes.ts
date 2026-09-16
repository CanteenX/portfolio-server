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
import { revalidateWebsite, FAQ_PATHS } from "../../core/revalidate/revalidate.service";
import { PortfolioFaqModel } from "./portfolio-faq.models";

const ADMIN_ROLES: RoleKey[] = ["super_admin", "admin"];
const MENU_URL = "/portfolio/faq";

const router = Router();

const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

const createSchema = z.object({
  question: z.string().min(1).max(300).trim(),
  answer: z.string().min(1).max(4000).trim(),
  category: z.string().max(80).trim().default(""),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

const updateSchema = createSchema.partial();

function ensureId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

function onZodError(error: unknown, next: (err?: unknown) => void): boolean {
  if (error instanceof z.ZodError) {
    next(new AppError(400, ERROR_CODES.BAD_REQUEST, error.issues[0]?.message ?? "Invalid FAQ payload"));
    return true;
  }
  return false;
}

router.get("/api/v1/public/portfolio/faqs", async (_req, res, next) => {
  try {
    const items = await PortfolioFaqModel.find({ isActive: true }).sort({ order: 1 }).lean().exec();
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/api/v1/portfolio/faqs",
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "read"),
  async (_req: AuthenticatedRequest, res, next) => {
    try {
      const items = await PortfolioFaqModel.find().sort({ order: 1 }).lean().exec();
      res.json({ items, total: items.length });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/v1/portfolio/faqs",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "write"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const created = await PortfolioFaqModel.create(createSchema.parse(req.body ?? {}));
      revalidateWebsite(FAQ_PATHS);
      res.status(201).json(created);
    } catch (error) {
      if (onZodError(error, next)) return;
      next(error);
    }
  }
);

router.patch(
  "/api/v1/portfolio/faqs/:id",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "edit"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureId(req.params.id);
      const payload = updateSchema.parse(req.body ?? {});
      const updated = await PortfolioFaqModel.findByIdAndUpdate(
        req.params.id,
        { $set: payload },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();
      if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "FAQ not found");
      revalidateWebsite(FAQ_PATHS);
      res.json(updated);
    } catch (error) {
      if (onZodError(error, next)) return;
      next(error);
    }
  }
);

router.delete(
  "/api/v1/portfolio/faqs/:id",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureId(req.params.id);
      const deleted = await PortfolioFaqModel.findByIdAndDelete(req.params.id).lean().exec();
      if (!deleted) throw new AppError(404, ERROR_CODES.NOT_FOUND, "FAQ not found");
      revalidateWebsite(FAQ_PATHS);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export const portfolioFaqRoutes = router;
