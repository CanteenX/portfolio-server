import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import { PortfolioContactModel } from "./portfolio-contacts.models";

const router = Router();

const submitRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

const submitContactSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().max(300).trim().toLowerCase(),
  service: z.string().max(200).default(""),
  callSlot: z.string().max(200).default(""),
  message: z.string().min(1).max(5000).trim()
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["new", "read", "replied"]).optional()
});

// ─── PUBLIC ROUTE (no auth) ──────────────────────────────────────────────────

router.post("/api/v1/public/portfolio/contact", submitRateLimiter, async (req, res, next) => {
  try {
    const payload = submitContactSchema.parse(req.body ?? {});
    const contact = await PortfolioContactModel.create(payload);
    res.status(201).json({ message: "Message received. We'll get back to you within 12 hours.", id: contact._id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid contact form data"));
      return;
    }
    next(error);
  }
});

// ─── ADMIN ROUTES (auth required) ────────────────────────────────────────────

router.get("/api/v1/portfolio/contacts", authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { page, limit, status } = listQuerySchema.parse(req.query ?? {});
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const [total, items] = await Promise.all([
      PortfolioContactModel.countDocuments(filter).exec(),
      PortfolioContactModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
    ]);
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
});

router.patch("/api/v1/portfolio/contacts/:id/status", authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    ensureValidObjectId(req.params.id);
    const { status } = z.object({ status: z.enum(["new", "read", "replied"]) }).parse(req.body ?? {});
    const updated = await PortfolioContactModel.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid status value"));
      return;
    }
    next(error);
  }
});

export const portfolioContactsRoutes = router;
