import { ERROR_CODES } from "@admin-platform/shared-types";
import type { RoleKey } from "@admin-platform/shared-types";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { z } from "zod";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { requireRbacPermission } from "../../core/rbac/rbac-permission.middleware";
import { requireRole } from "../../core/rbac/role.middleware";
import {
  SEO_CATEGORIES,
  SeoMetaModel,
  isValidCanonicalUrl,
  normalizeSlug
} from "./seo-meta.model";

const router = Router();

const ADMIN_ROLES: RoleKey[] = ["super_admin", "admin"];
const SEO_MENU = "/website/seo-manager";

const readRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false
});
const writeRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

/** Trimmed, de-duplicated, empties dropped — what the model's contract expects. */
const keywordsSchema = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const raw = Array.isArray(value) ? value : value.split(",");
    return [...new Set(raw.map((k) => k.trim()).filter(Boolean))];
  });

const writeSchema = z.object({
  slug: z.string().min(1).max(255),
  pageTitle: z.string().min(1).max(120).trim(),
  category: z.enum(SEO_CATEGORIES).default("Marketing"),
  icon: z.string().max(100).default(""),
  metaTitle: z.string().max(300).default(""),
  metaDescription: z.string().max(600).default(""),
  keywords: keywordsSchema,
  canonicalUrl: z.string().max(2000).default(""),
  ogTitle: z.string().max(300).default(""),
  ogDescription: z.string().max(600).default(""),
  ogImage: z.string().max(2000).default(""),
  ogType: z.string().max(40).default("website"),
  noIndex: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

const updateSchema = writeSchema.partial();

/**
 * Applies the model's two contracts to a parsed payload.
 *
 * Both are rejections rather than coercions on purpose: a slug the normaliser
 * cannot make sense of, or a canonical that would de-index the page, means the
 * field was misunderstood, and silently storing something else would hide that.
 */
function applyContracts<T extends { slug?: string; canonicalUrl?: string }>(payload: T): T {
  if (payload.slug !== undefined) {
    const slug = normalizeSlug(payload.slug);
    if (!slug) {
      throw new AppError(
        400,
        ERROR_CODES.BAD_REQUEST,
        "Slug must be a route path such as /services, not a full URL"
      );
    }
    payload.slug = slug;
  }

  if (payload.canonicalUrl !== undefined && !isValidCanonicalUrl(payload.canonicalUrl)) {
    throw new AppError(
      400,
      ERROR_CODES.BAD_REQUEST,
      "Canonical URL must be a complete http(s) address or a path starting with /"
    );
  }

  return payload;
}

function ensureObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

// ─── PUBLIC ──────────────────────────────────────────────────────────────────

/**
 * One row by route. Returns 200 with `null` rather than 404 when absent: the
 * website treats "no row" as "use the page's own copy", which is a normal
 * state, not an error worth a failed request in its logs.
 */
router.get("/api/v1/public/seo", readRateLimiter, async (req, res, next) => {
  try {
    const slug = normalizeSlug(req.query.slug);
    if (!slug) {
      res.json({ item: null });
      return;
    }
    const item = await SeoMetaModel.findOne({ slug, isActive: true }).lean().exec();
    res.json({ item: item ?? null });
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN ───────────────────────────────────────────────────────────────────

router.get(
  "/api/v1/seo",
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(SEO_MENU, "read"),
  async (_req: AuthenticatedRequest, res, next) => {
    try {
      const items = await SeoMetaModel.find().sort({ category: 1, slug: 1 }).lean().exec();
      res.json({ items });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/seo/:id",
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(SEO_MENU, "read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureObjectId(req.params.id);
      const item = await SeoMetaModel.findById(req.params.id).lean().exec();
      if (!item) throw new AppError(404, ERROR_CODES.NOT_FOUND, "SEO row not found");
      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/v1/seo",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(SEO_MENU, "write"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = applyContracts(writeSchema.parse(req.body ?? {}));
      const created = await SeoMetaModel.create(payload);
      res.status(201).json(created.toObject());
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "A row already exists for that route"));
        return;
      }
      next(error);
    }
  }
);

router.patch(
  "/api/v1/seo/:id",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(SEO_MENU, "edit"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureObjectId(req.params.id);
      const payload = applyContracts(updateSchema.parse(req.body ?? {}));
      const updated = await SeoMetaModel.findByIdAndUpdate(
        req.params.id,
        { $set: payload },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();
      if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "SEO row not found");
      res.json(updated);
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "A row already exists for that route"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/seo/:id",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(SEO_MENU, "delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureObjectId(req.params.id);
      const removed = await SeoMetaModel.findByIdAndDelete(req.params.id).exec();
      if (!removed) throw new AppError(404, ERROR_CODES.NOT_FOUND, "SEO row not found");
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export const seoRoutes = router;
