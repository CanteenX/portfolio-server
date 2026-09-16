import { ERROR_CODES } from "@admin-platform/shared-types";
import type { RoleKey } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import { requireRole } from "../../core/rbac/role.middleware";
import { requireRbacPermission } from "../../core/rbac/rbac-permission.middleware";
import { revalidateWebsite, SETTINGS_PATHS } from "../../core/revalidate/revalidate.service";

/** Both roles may reach these routes; what they may DO is decided per menu. */
const ADMIN_ROLES: RoleKey[] = ["super_admin", "admin"];
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
const pageCopySchema = z.object({
  eyebrow: z.string().default(""),
  title: z.string().default(""),
  lead: z.string().default("")
});
const engagementBandSchema = z.object({
  name: z.string(),
  range: z.string(),
  duration: z.string(),
  description: z.string()
});

const settingsSchema = z.object({
  hero: z.object({
    tagline: z.string().default(""),
    description: z.string().default(""),
    ctaPrimary: z.object({ label: z.string(), href: z.string() }).default({ label: "View Work", href: "/work" }),
    ctaSecondary: z.object({ label: z.string(), href: z.string() }).default({ label: "Contact Us", href: "/contact" }),
    featuredProjects: z.array(featuredProjectSchema).default([])
  }).default({}),
  navbar: z.object({
    brandName: z.string().default("NVENTRA"),
    links: z.array(linkSchema).default([])
  }).default({}),
  footer: z.object({
    description: z.string().default(""),
    email: z.string().default(""),
    version: z.string().default("v1.0"),
    links: z.array(linkSchema).default([])
  }).default({}),
  techMarquee: z.array(z.string()).default([]),
  // No `services`: Zod strips unknown keys, so an older admin build still
  // sending the field is accepted and the field is dropped rather than 400ing.
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
  pageCopy: z.object({
    work: pageCopySchema.optional(),
    services: pageCopySchema.optional(),
    team: pageCopySchema.optional(),
    about: pageCopySchema.optional(),
    process: pageCopySchema.optional(),
    contact: pageCopySchema.optional(),
    insights: pageCopySchema.optional(),
    faq: pageCopySchema.optional()
  }).default({}),
  contactCta: z.object({
    eyebrow: z.string().default(""),
    title: z.string().default(""),
    lead: z.string().default(""),
    primary: z.object({ label: z.string(), href: z.string() }).default({ label: "", href: "" }),
    secondary: z.object({ label: z.string(), href: z.string() }).default({ label: "", href: "" })
  }).default({}),
  contactForm: z.object({
    budgetBands: z.array(z.string()).default([]),
    timelines: z.array(z.string()).default([])
  }).default({}),
  engagement: z.object({
    eyebrow: z.string().default(""),
    title: z.string().default(""),
    lead: z.string().default(""),
    bands: z.array(engagementBandSchema).default([]),
    footnote: z.string().default("")
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

router.get("/api/v1/portfolio/settings", authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/settings", "read"), async (_req: AuthenticatedRequest, res, next) => {
  try {
    const settings = await PortfolioSettingsModel.findOne().lean().exec();
    res.json(settings ?? {});
  } catch (error) {
    next(error);
  }
});

router.put("/api/v1/portfolio/settings", writeRateLimiter, authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/settings", "edit"), async (req: AuthenticatedRequest, res, next) => {
  try {
    // deepPartial, then $set only the keys actually sent.
    //
    // settingsSchema gives every top-level key a .default(), so parsing a body
    // that omits `navbar` produced a fully-formed default navbar and $set it —
    // silently wiping that section. The admin SDK types this endpoint as
    // Partial<PortfolioSettings>, so sending one section is a supported call
    // that used to destroy the other nine.
    const payload = settingsSchema.deepPartial().parse(req.body ?? {});
    const changes = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    );

    if (Object.keys(changes).length === 0) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "No settings fields supplied");
    }

    const updated = await PortfolioSettingsModel.findOneAndUpdate(
      {},
      { $set: changes },
      { new: true, upsert: true, runValidators: true }
    )
      .lean()
      .exec();

    // Settings feed the navbar, footer and hero on every route, so a change
    // here is a change everywhere.
    revalidateWebsite(SETTINGS_PATHS);

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
