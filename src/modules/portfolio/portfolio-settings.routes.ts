import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import { PortfolioSettingsModel } from "./portfolio-settings.models";

const router = Router();

const writeRateLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

const linkSchema = z.object({ label: z.string(), href: z.string() });
const featuredProjectSchema = z.object({
  title: z.string(),
  description: z.string(),
  href: z.string(),
  image: z.string(),
  eyebrow: z.string()
});
const valueSchema = z.object({ icon: z.string(), title: z.string(), desc: z.string() });
const statSchema = z.object({ label: z.string(), value: z.string() });
const phaseSchema = z.object({ id: z.string(), n: z.string(), title: z.string(), description: z.string(), accent: z.string(), dot: z.string() });
const perkSchema = z.object({ title: z.string(), description: z.string(), icon: z.string(), gradient: z.string(), border: z.string() });
const playbookSchema = z.object({ phase: z.string(), name: z.string(), body: z.string() });

const settingsSchema = z.object({
  hero: z.object({
    tagline: z.string().default(""),
    description: z.string().default(""),
    ctaPrimary: z.object({ label: z.string(), href: z.string() }).default({ label: "View Work", href: "/work" }),
    ctaSecondary: z.object({ label: z.string(), href: z.string() }).default({ label: "Contact Us", href: "/contact" }),
    featuredProjects: z.array(featuredProjectSchema).default([])
  }).default({}),
  navbar: z.object({
    brandName: z.string().default("FORGE_COLLECTIVE"),
    links: z.array(linkSchema).default([])
  }).default({}),
  footer: z.object({
    description: z.string().default(""),
    email: z.string().default(""),
    version: z.string().default("v1.0"),
    links: z.array(linkSchema).default([])
  }).default({}),
  techMarquee: z.array(z.string()).default([]),
  services: z.array(z.string()).default([]),
  callSlots: z.array(z.string()).default([]),
  about: z.object({
    vision: z.string().default(""),
    mission: z.string().default(""),
    values: z.array(valueSchema).default([]),
    stats: z.array(statSchema).default([])
  }).default({}),
  process: z.object({
    phases: z.array(phaseSchema).default([]),
    perks: z.array(perkSchema).default([])
  }).default({}),
  teamPlaybook: z.array(playbookSchema).default([]),
  contactInfo: z.object({
    email: z.string().default(""),
    phone: z.string().default("")
  }).default({}),
  isActive: z.boolean().default(true)
});

// ─── PUBLIC ROUTE (no auth) ──────────────────────────────────────────────────

router.get("/api/v1/public/portfolio/settings", async (_req, res, next) => {
  try {
    const settings = await PortfolioSettingsModel.findOne({ isActive: true }).lean().exec();
    res.json(settings ?? {});
  } catch (error) {
    next(error);
  }
});

// ─── ADMIN ROUTES (auth required) ────────────────────────────────────────────

router.get("/api/v1/portfolio/settings", authenticateJwt, async (_req: AuthenticatedRequest, res, next) => {
  try {
    const settings = await PortfolioSettingsModel.findOne().lean().exec();
    res.json(settings ?? {});
  } catch (error) {
    next(error);
  }
});

router.put("/api/v1/portfolio/settings", writeRateLimiter, authenticateJwt, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = settingsSchema.parse(req.body ?? {});
    const updated = await PortfolioSettingsModel.findOneAndUpdate({}, { $set: payload }, { new: true, upsert: true, runValidators: true }).lean().exec();
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid settings payload"));
      return;
    }
    next(error);
  }
});

export const portfolioSettingsRoutes = router;
