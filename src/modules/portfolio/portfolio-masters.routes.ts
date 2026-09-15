import { ERROR_CODES } from "@admin-platform/shared-types";
import type { RoleKey } from "@admin-platform/shared-types";
import path from "node:path";
import { randomUUID } from "node:crypto";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import { requireRole } from "../../core/rbac/role.middleware";
import {
  requireAnyRbacPermission,
  requireRbacPermission
} from "../../core/rbac/rbac-permission.middleware";
import { persistBuffer } from "../../core/storage/file-store";
import { TechStackModel, CategoryModel, YearModel, ClientModel } from "./portfolio-masters.models";

/** Both roles may reach these routes; what they may DO is decided per menu. */
const ADMIN_ROLES: RoleKey[] = ["super_admin", "admin"];

/**
 * The image uploader is shared by every CMS screen, so it is gated on holding
 * `write` on ANY screen that embeds images rather than on one arbitrary menu —
 * otherwise a team-only editor could not upload an avatar.
 */
const IMAGE_UPLOAD_MENUS = [
  "/portfolio/projects",
  "/portfolio/team",
  "/portfolio/settings",
  "/portfolio/masters/tech-stacks",
  // OG share images are uploaded from the SEO Manager through this same endpoint.
  "/website/seo-manager"
];

const router = Router();
const writeRateLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

// ── Upload setup ──────────────────────────────────────────────────────────────

/**
 * SVG is deliberately absent.
 *
 * Objects land on a PUBLIC Supabase CDN URL with no Content-Disposition, so an
 * SVG served as image/svg+xml executes its own <script> when opened or framed
 * directly — stored XSS reachable by any authenticated user, not just an owner.
 * Raster formats cannot carry script, so the allow-list is raster-only.
 */
const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Leading byte signatures, because multer's `file.mimetype` is just a header the
 * client chose and can say "image/png" over arbitrary bytes. The stored object's
 * Content-Type is derived from that same claim, so trusting it would let a
 * caller publish any content type they like on the CDN origin.
 */
const MAGIC_BYTES: Record<string, (buffer: Buffer) => boolean> = {
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/gif": (b) => b.length > 6 && b.subarray(0, 6).toString("ascii").startsWith("GIF8"),
  "image/webp": (b) =>
    b.length > 12 &&
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP"
};

function contentMatchesMime(buffer: Buffer, mimetype: string): boolean {
  const check = MAGIC_BYTES[mimetype];
  return check ? check(buffer) : false;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, ERROR_CODES.BAD_REQUEST, "Only image files are allowed") as unknown as null, false);
    }
  }
});

// ── Image upload (auth required) ──────────────────────────────────────────────
// Storage backend selection lives entirely in persistBuffer(): Supabase when it
// is configured, local disk otherwise. The response carries whatever reference
// was stored — an absolute Supabase CDN URL, or a "/uploads/..." path — and the
// website's resolveImageUrl() handles both without caring which.

router.post(
  "/api/v1/portfolio/upload/image",
  writeRateLimiter,
  authenticateJwt,
  requireRole(ADMIN_ROLES),
  requireAnyRbacPermission(IMAGE_UPLOAD_MENUS, "write"),
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "No image uploaded");

      // Verify the bytes are what the client said they are, before the claimed
      // mimetype is used as the stored object's Content-Type on a public CDN.
      if (!contentMatchesMime(req.file.buffer, req.file.mimetype)) {
        throw new AppError(
          400,
          ERROR_CODES.BAD_REQUEST,
          "File content does not match its declared image type"
        );
      }

      // A UUID rather than Date.now()+Math.random: two uploads in the same
      // millisecond are plausible behind a rate limiter set to 60/min, and a
      // collision here would overwrite somebody else's image.
      const ext = path.extname(req.file.originalname).toLowerCase() || ".bin";
      const url = await persistBuffer(
        req.file.buffer,
        `${randomUUID()}${ext}`,
        req.file.mimetype,
        "portfolio"
      );
      res.json({ url });
    } catch (error) {
      next(error);
    }
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

// ── Tech Stack ────────────────────────────────────────────────────────────────

const techStackWriteSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  image: z.string().max(2000).default(""),
  description: z.string().max(500).default(""),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

router.get("/api/v1/public/portfolio/tech-stacks", async (_req, res, next) => {
  try {
    const items = await TechStackModel.find({ isActive: true }).sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/portfolio/tech-stacks", authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/masters/tech-stacks", "read"), async (_req, res, next) => {
  try {
    const items = await TechStackModel.find().sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/portfolio/tech-stacks", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/masters/tech-stacks", "write"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = techStackWriteSchema.parse(req.body ?? {});
    const created = await TechStackModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/tech-stacks/:id", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/masters/tech-stacks", "edit"), async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const payload = techStackWriteSchema.partial().parse(req.body ?? {});
    const updated = await TechStackModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Tech stack not found");
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/api/v1/portfolio/tech-stacks/:id", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/masters/tech-stacks", "delete"), async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const item = await TechStackModel.findByIdAndDelete(req.params.id).exec();
    if (!item) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Tech stack not found");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ── Category ──────────────────────────────────────────────────────────────────

const categoryWriteSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

router.get("/api/v1/public/portfolio/categories", async (_req, res, next) => {
  try {
    const items = await CategoryModel.find({ isActive: true }).sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/portfolio/categories", authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "read"), async (_req, res, next) => {
  try {
    const items = await CategoryModel.find().sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/portfolio/categories", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "write"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = categoryWriteSchema.parse(req.body ?? {});
    const created = await CategoryModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/categories/:id", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "edit"), async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const payload = categoryWriteSchema.partial().parse(req.body ?? {});
    const updated = await CategoryModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Category not found");
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/api/v1/portfolio/categories/:id", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "delete"), async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const item = await CategoryModel.findByIdAndDelete(req.params.id).exec();
    if (!item) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Category not found");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ── Year ──────────────────────────────────────────────────────────────────────

const yearWriteSchema = z.object({
  year: z.string().min(1).max(10).trim(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

router.get("/api/v1/public/portfolio/years", async (_req, res, next) => {
  try {
    const items = await YearModel.find({ isActive: true }).sort({ order: 1, year: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/portfolio/years", authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "read"), async (_req, res, next) => {
  try {
    const items = await YearModel.find().sort({ order: 1, year: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/portfolio/years", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "write"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = yearWriteSchema.parse(req.body ?? {});
    const created = await YearModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/years/:id", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "edit"), async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const payload = yearWriteSchema.partial().parse(req.body ?? {});
    const updated = await YearModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Year not found");
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/api/v1/portfolio/years/:id", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "delete"), async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const item = await YearModel.findByIdAndDelete(req.params.id).exec();
    if (!item) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Year not found");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ── Client ────────────────────────────────────────────────────────────────────

const clientWriteSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0)
});

router.get("/api/v1/public/portfolio/clients", async (_req, res, next) => {
  try {
    const items = await ClientModel.find({ isActive: true }).sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/portfolio/clients", authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "read"), async (_req, res, next) => {
  try {
    const items = await ClientModel.find().sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/portfolio/clients", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "write"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = clientWriteSchema.parse(req.body ?? {});
    const created = await ClientModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/clients/:id", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "edit"), async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const payload = clientWriteSchema.partial().parse(req.body ?? {});
    const updated = await ClientModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Client not found");
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/api/v1/portfolio/clients/:id", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/projects/masters", "delete"), async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const item = await ClientModel.findByIdAndDelete(req.params.id).exec();
    if (!item) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Client not found");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const portfolioMastersRoutes = router;
