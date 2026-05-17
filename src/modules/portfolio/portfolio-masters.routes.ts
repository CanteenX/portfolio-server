import { ERROR_CODES } from "@admin-platform/shared-types";
import fs from "node:fs";
import path from "node:path";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { z } from "zod";
import { env } from "../../config/env";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import { TechStackModel, CategoryModel, YearModel, ClientModel } from "./portfolio-masters.models";

const router = Router();
const writeRateLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

// ── Upload setup ──────────────────────────────────────────────────────────────

const uploadDir = path.isAbsolute(env.FILE_UPLOAD_DIR)
  ? path.join(env.FILE_UPLOAD_DIR, "portfolio")
  : path.join(process.cwd(), env.FILE_UPLOAD_DIR, "portfolio");
try {
  fs.mkdirSync(uploadDir, { recursive: true });
} catch {
  // Filesystem may be read-only (e.g. Vercel /var/task). Multer init below will fail loudly only when used.
}

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({
  storage,
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

router.post(
  "/api/v1/portfolio/upload/image",
  writeRateLimiter,
  authenticateJwt,
  upload.single("image"),
  (req, res, next) => {
    try {
      if (!req.file) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "No image uploaded");
      res.json({ url: `/uploads/portfolio/${req.file.filename}` });
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

router.get("/api/v1/portfolio/tech-stacks", authenticateJwt, async (_req, res, next) => {
  try {
    const items = await TechStackModel.find().sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/portfolio/tech-stacks", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = techStackWriteSchema.parse(req.body ?? {});
    const created = await TechStackModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/tech-stacks/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
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

router.delete("/api/v1/portfolio/tech-stacks/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
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

router.get("/api/v1/portfolio/categories", authenticateJwt, async (_req, res, next) => {
  try {
    const items = await CategoryModel.find().sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/portfolio/categories", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = categoryWriteSchema.parse(req.body ?? {});
    const created = await CategoryModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/categories/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
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

router.delete("/api/v1/portfolio/categories/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
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

router.get("/api/v1/portfolio/years", authenticateJwt, async (_req, res, next) => {
  try {
    const items = await YearModel.find().sort({ order: 1, year: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/portfolio/years", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = yearWriteSchema.parse(req.body ?? {});
    const created = await YearModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/years/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
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

router.delete("/api/v1/portfolio/years/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
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

router.get("/api/v1/portfolio/clients", authenticateJwt, async (_req, res, next) => {
  try {
    const items = await ClientModel.find().sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/portfolio/clients", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = clientWriteSchema.parse(req.body ?? {});
    const created = await ClientModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/clients/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
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

router.delete("/api/v1/portfolio/clients/:id", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
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
