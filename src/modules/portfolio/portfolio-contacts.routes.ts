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
import { sharedRateLimitStore } from "../../core/http/mongo-rate-limit-store";
import { sendMail } from "../../core/mail/mail.service";
import { logger } from "../../core/logging/logger";
import { env } from "../../config/env";

/** Both roles may reach these routes; what they may DO is decided per menu. */
const ADMIN_ROLES: RoleKey[] = ["super_admin", "admin"];
import { PortfolioContactModel } from "./portfolio-contacts.models";

const router = Router();

// Shared store: this is the one unauthenticated write endpoint on the site, and
// a per-instance counter let the 5/min cap be exceeded by fanning out requests.
const submitRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: sharedRateLimitStore("contact")
});

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

const submitContactSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().max(300).trim().toLowerCase(),
  phone: z.string().max(40).default(""),
  company: z.string().max(200).default(""),
  service: z.string().max(200).default(""),
  budgetBand: z.string().max(40).default(""),
  timeline: z.string().max(40).default(""),
  callSlot: z.string().max(200).default(""),
  message: z.string().min(1).max(5000).trim(),
  /** Verbatim wording of the consent the visitor ticked. */
  consentText: z.string().max(1000).default(""),
  /**
   * Honeypot. A real browser never fills this — it is visually hidden and
   * removed from the tab order — so anything in it is a bot, and the only
   * correct response is to look like success while storing nothing.
   */
  website: z.string().max(200).optional()
});

const SUBMIT_MESSAGE = "Message received. We'll get back to you within 12 hours.";

/**
 * Tells the team a lead arrived.
 *
 * The site promises a reply within 12 hours in two places; before this, a
 * submission was written to Mongo and nothing else happened, so honouring that
 * promise depended on somebody remembering to open the admin panel.
 *
 * Returns nothing and never throws: the lead is already saved, and a mail
 * problem must not turn a captured lead into a 500 the visitor sees.
 */
async function notifyNewLead(contact: {
  _id: unknown;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service?: string;
  budgetBand?: string;
  timeline?: string;
  callSlot?: string;
  message: string;
  referrer?: string;
}): Promise<void> {
  const to = env.LEAD_NOTIFY_TO;
  if (!to) {
    logger.warn("LEAD_NOTIFY_TO is unset — new lead saved but nobody was notified", {
      contactId: String(contact._id)
    });
    return;
  }

  const lines = [
    `Name:     ${contact.name}`,
    `Email:    ${contact.email}`,
    contact.phone ? `Phone:    ${contact.phone}` : null,
    contact.company ? `Company:  ${contact.company}` : null,
    contact.service ? `Service:  ${contact.service}` : null,
    contact.budgetBand ? `Budget:   ${contact.budgetBand}` : null,
    contact.timeline ? `Timeline: ${contact.timeline}` : null,
    contact.callSlot ? `Call slot: ${contact.callSlot}` : null,
    contact.referrer ? `Referrer: ${contact.referrer}` : null,
    "",
    contact.message
  ].filter((line): line is string => line !== null);

  const sent = await sendMail({
    to,
    subject: `New enquiry — ${contact.name}${contact.company ? ` (${contact.company})` : ""}`,
    text: lines.join("\n"),
    // So hitting reply in the mail client answers the person, not the mailbox.
    replyTo: contact.email
  });

  if (!sent) {
    logger.error("New lead saved but the notification did not send", {
      contactId: String(contact._id)
    });
  }
}

/** First value of a header that may legitimately arrive repeated. */
function headerValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * Attribution taken from the request, never from the payload.
 *
 * A client-supplied referrer is controlled by whoever is submitting, so
 * attribution built on it is fiction. UTM values come off the page URL the
 * browser reports, which is the same trade-off every analytics tool makes.
 */
function attributionFrom(req: {
  headers: Record<string, string | string[] | undefined>;
}): Record<string, string> {
  const referrer = headerValue(req.headers.referer ?? req.headers.referrer).slice(0, 500);

  let utmSource = "";
  let utmMedium = "";
  let utmCampaign = "";
  try {
    if (referrer) {
      const params = new URL(referrer).searchParams;
      utmSource = (params.get("utm_source") ?? "").slice(0, 120);
      utmMedium = (params.get("utm_medium") ?? "").slice(0, 120);
      utmCampaign = (params.get("utm_campaign") ?? "").slice(0, 120);
    }
  } catch {
    // An unparseable referer is not worth failing a lead over.
  }

  return { referrer, utmSource, utmMedium, utmCampaign };
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["new", "read", "replied"]).optional()
});

// ─── PUBLIC ROUTE (no auth) ──────────────────────────────────────────────────

router.post("/api/v1/public/portfolio/contact", submitRateLimiter, async (req, res, next) => {
  try {
    const { website, ...payload } = submitContactSchema.parse(req.body ?? {});

    // Honeypot tripped. Answer exactly as a success would, because telling a bot
    // it was detected only teaches whoever wrote it to stop filling the field.
    if (website && website.trim().length > 0) {
      logger.info("Contact submission rejected by honeypot");
      res.status(201).json({ message: SUBMIT_MESSAGE, id: null });
      return;
    }

    const contact = await PortfolioContactModel.create({
      ...payload,
      ...attributionFrom(req),
      // Timestamped server-side: a client clock is not evidence of when
      // consent was given.
      consentAt: payload.consentText ? new Date() : null
    });

    // Awaited, NOT fired after the response. On a serverless function nothing
    // keeps the invocation alive once the response completes, so a send started
    // afterwards can be frozen mid-flight and lost — the same failure mode as
    // the WhatsApp webhook. sendMail never throws, so a mail outage still
    // returns 201 and the lead is already durable either way.
    await notifyNewLead(contact);

    res.status(201).json({ message: SUBMIT_MESSAGE, id: contact._id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid contact form data"));
      return;
    }
    next(error);
  }
});

// ─── ADMIN ROUTES (auth required) ────────────────────────────────────────────

router.get("/api/v1/portfolio/contacts", authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/contacts", "read"), async (req: AuthenticatedRequest, res, next) => {
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

router.patch("/api/v1/portfolio/contacts/:id/status", authenticateJwt, requireRole(ADMIN_ROLES), requireRbacPermission("/portfolio/contacts", "edit"), async (req: AuthenticatedRequest, res, next) => {
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
