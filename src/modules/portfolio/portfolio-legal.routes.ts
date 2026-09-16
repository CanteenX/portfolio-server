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
import { revalidateWebsite, legalPathsFor } from "../../core/revalidate/revalidate.service";
import { LegalDocumentModel } from "./portfolio-legal.models";

/**
 * Legal document CRUD.
 *
 * The menu this guards — `/portfolio/legal` — is seeded but deliberately left
 * out of the grantable set, so `requireRbacPermission` passes only for
 * super_admin. Who may change a published privacy policy is not a delegation
 * decision; see D-B6 in the plan.
 */
const ADMIN_ROLES: RoleKey[] = ["super_admin", "admin"];
const MENU_URL = "/portfolio/legal";

const router = Router();

const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

const sectionSchema = z.object({
  heading: z.string().max(200).trim().default(""),
  body: z.string().max(20000).trim().default("")
});

const createSchema = z.object({
  // Lowercase URL segment only. This string becomes a public path, so it is
  // constrained here rather than sanitised at render time.
  slug: z
    .string()
    .min(1)
    .max(80)
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers and hyphens"),
  title: z.string().min(1).max(160).trim(),
  lastUpdated: z.string().max(40).trim().default(""),
  intro: z.string().max(4000).trim().default(""),
  sections: z.array(sectionSchema).max(60).default([]),
  isPublished: z.boolean().default(false),
  order: z.number().int().default(0)
});

const updateSchema = createSchema.partial();

function ensureId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

/** `.lean()` erases the document type, and only the slug is read back. */
function slugOf(document: unknown): string {
  return (document as { slug: string }).slug;
}

function onZodError(error: unknown, next: (err?: unknown) => void): boolean {
  if (error instanceof z.ZodError) {
    next(new AppError(400, ERROR_CODES.BAD_REQUEST, error.issues[0]?.message ?? "Invalid legal document"));
    return true;
  }
  return false;
}

/** Public index — published only, used for the footer and the sitemap. */
router.get("/api/v1/public/portfolio/legal", async (_req, res, next) => {
  try {
    const items = await LegalDocumentModel.find({ isPublished: true })
      .select("slug title lastUpdated order")
      .sort({ order: 1 })
      .lean()
      .exec();
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});

/**
 * Public read of one document.
 *
 * 404 rather than an empty body when the document is missing or still a draft:
 * the site falls back to the copy it ships with, and it can only do that if it
 * can tell the difference between "no published override" and "an override
 * that is blank".
 */
router.get("/api/v1/public/portfolio/legal/:slug", async (req, res, next) => {
  try {
    const document = await LegalDocumentModel.findOne({
      slug: String(req.params.slug).toLowerCase(),
      isPublished: true
    })
      .lean()
      .exec();
    if (!document) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Legal document not found");
    res.json(document);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/api/v1/portfolio/legal",
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "read"),
  async (_req: AuthenticatedRequest, res, next) => {
    try {
      const items = await LegalDocumentModel.find().sort({ order: 1 }).lean().exec();
      res.json({ items, total: items.length });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/v1/portfolio/legal",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "write"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createSchema.parse(req.body ?? {});
      const clash = await LegalDocumentModel.exists({ slug: payload.slug });
      if (clash) {
        throw new AppError(409, ERROR_CODES.BAD_REQUEST, "A legal document with that slug already exists");
      }
      const created = await LegalDocumentModel.create(payload);
      revalidateWebsite(legalPathsFor(payload.slug));
      res.status(201).json(created);
    } catch (error) {
      if (onZodError(error, next)) return;
      next(error);
    }
  }
);

router.patch(
  "/api/v1/portfolio/legal/:id",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "edit"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureId(req.params.id);
      const payload = updateSchema.parse(req.body ?? {});
      const before = await LegalDocumentModel.findById(req.params.id).select("slug").lean().exec();
      if (!before) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Legal document not found");

      if (payload.slug && payload.slug !== slugOf(before)) {
        const clash = await LegalDocumentModel.exists({ slug: payload.slug });
        if (clash) {
          throw new AppError(409, ERROR_CODES.BAD_REQUEST, "A legal document with that slug already exists");
        }
      }

      const updated = await LegalDocumentModel.findByIdAndUpdate(
        req.params.id,
        { $set: payload },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();
      if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Legal document not found");

      // Both slugs: renaming one leaves the old URL cached with the old body
      // until something invalidates it.
      revalidateWebsite([...legalPathsFor(slugOf(before)), ...legalPathsFor(slugOf(updated))]);
      res.json(updated);
    } catch (error) {
      if (onZodError(error, next)) return;
      next(error);
    }
  }
);

router.delete(
  "/api/v1/portfolio/legal/:id",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureId(req.params.id);
      const deleted = await LegalDocumentModel.findByIdAndDelete(req.params.id).lean().exec();
      if (!deleted) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Legal document not found");
      revalidateWebsite(legalPathsFor(slugOf(deleted)));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export const portfolioLegalRoutes = router;
