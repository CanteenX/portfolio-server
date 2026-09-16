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
import { revalidateWebsite, postPathsFor } from "../../core/revalidate/revalidate.service";
import { PortfolioPostModel } from "./portfolio-posts.models";

const ADMIN_ROLES: RoleKey[] = ["super_admin", "admin"];
const MENU_URL = "/portfolio/posts";

/** The index and the RSS feed never need a post's body. */
const LIST_FIELDS = "slug title excerpt coverImage category tags authorName authorRole publishedAt readingMinutes isFeatured order";

const router = Router();

const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

const blockSchema = z.object({
  type: z.enum(["paragraph", "heading", "quote", "code", "list"]).default("paragraph"),
  label: z.string().max(200).trim().default(""),
  text: z.string().max(20000).default("")
});

const createSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers and hyphens"),
  title: z.string().min(1).max(200).trim(),
  excerpt: z.string().max(400).trim().default(""),
  coverImage: z.string().max(500).trim().default(""),
  category: z.string().max(80).trim().default(""),
  tags: z.array(z.string().max(40).trim()).max(20).default([]),
  authorName: z.string().max(120).trim().default(""),
  authorRole: z.string().max(120).trim().default(""),
  publishedAt: z.string().max(40).trim().default(""),
  readingMinutes: z.number().int().min(0).max(240).default(0),
  blocks: z.array(blockSchema).max(300).default([]),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
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
    next(new AppError(400, ERROR_CODES.BAD_REQUEST, error.issues[0]?.message ?? "Invalid post payload"));
    return true;
  }
  return false;
}

/**
 * Public index — published only, newest first.
 *
 * Undated posts sort last rather than first: an empty `publishedAt` sorts below
 * any real date in descending order, which is the right place for a post
 * somebody published without dating.
 */
router.get("/api/v1/public/portfolio/posts", async (_req, res, next) => {
  try {
    const items = await PortfolioPostModel.find({ isPublished: true })
      .select(LIST_FIELDS)
      .sort({ publishedAt: -1, order: 1 })
      .lean()
      .exec();
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/public/portfolio/posts/:slug", async (req, res, next) => {
  try {
    const post = await PortfolioPostModel.findOne({
      slug: String(req.params.slug).toLowerCase(),
      isPublished: true
    })
      .lean()
      .exec();
    if (!post) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Post not found");
    res.json(post);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/api/v1/portfolio/posts",
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "read"),
  async (_req: AuthenticatedRequest, res, next) => {
    try {
      const items = await PortfolioPostModel.find()
        .select(LIST_FIELDS + " isPublished")
        .sort({ publishedAt: -1, order: 1 })
        .lean()
        .exec();
      res.json({ items, total: items.length });
    } catch (error) {
      next(error);
    }
  }
);

/** Single post including blocks, for the editor. */
router.get(
  "/api/v1/portfolio/posts/:id",
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureId(req.params.id);
      const post = await PortfolioPostModel.findById(req.params.id).lean().exec();
      if (!post) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Post not found");
      res.json(post);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/v1/portfolio/posts",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "write"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createSchema.parse(req.body ?? {});
      if (await PortfolioPostModel.exists({ slug: payload.slug })) {
        throw new AppError(409, ERROR_CODES.BAD_REQUEST, "A post with that slug already exists");
      }
      const created = await PortfolioPostModel.create(payload);
      revalidateWebsite(postPathsFor(payload.slug));
      res.status(201).json(created);
    } catch (error) {
      if (onZodError(error, next)) return;
      next(error);
    }
  }
);

router.patch(
  "/api/v1/portfolio/posts/:id",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "edit"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureId(req.params.id);
      const payload = updateSchema.parse(req.body ?? {});
      const before = await PortfolioPostModel.findById(req.params.id).select("slug").lean().exec();
      if (!before) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Post not found");

      if (payload.slug && payload.slug !== slugOf(before)) {
        if (await PortfolioPostModel.exists({ slug: payload.slug })) {
          throw new AppError(409, ERROR_CODES.BAD_REQUEST, "A post with that slug already exists");
        }
      }

      const updated = await PortfolioPostModel.findByIdAndUpdate(
        req.params.id,
        { $set: payload },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();
      if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Post not found");

      revalidateWebsite([...postPathsFor(slugOf(before)), ...postPathsFor(slugOf(updated))]);
      res.json(updated);
    } catch (error) {
      if (onZodError(error, next)) return;
      next(error);
    }
  }
);

router.delete(
  "/api/v1/portfolio/posts/:id",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireRbacPermission(MENU_URL, "delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureId(req.params.id);
      const deleted = await PortfolioPostModel.findByIdAndDelete(req.params.id).lean().exec();
      if (!deleted) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Post not found");
      revalidateWebsite(postPathsFor(slugOf(deleted)));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export const portfolioPostsRoutes = router;
