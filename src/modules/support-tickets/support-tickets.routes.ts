import { ERROR_CODES } from "@admin-platform/shared-types";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { SupportTicketModel } from "./support-tickets.models";

const router = Router();

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(8000),
  requesterName: z.string().min(1).max(160),
  requesterEmail: z.string().email(),
  channel: z.enum(["email", "chat", "phone", "web"]).default("web"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  assignedToUserId: z.string().min(1).max(120).optional()
});

const updateTicketSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(8000).optional(),
  requesterName: z.string().min(1).max(160).optional(),
  requesterEmail: z.string().email().optional(),
  channel: z.enum(["email", "chat", "phone", "web"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  assignedToUserId: z.string().min(1).max(120).nullable().optional()
});

const transitionTicketSchema = z.object({
  to: z.enum(["open", "in_progress", "pending_customer", "resolved", "closed"]),
  note: z.string().max(1000).optional()
});

const addCommentSchema = z.object({
  message: z.string().min(1).max(4000),
  isInternal: z.boolean().default(false)
});

const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

const supportTicketWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

function assertAllowedTransition(from: string, to: string): void {
  const allowedTransitions: Record<string, string[]> = {
    open: ["in_progress", "pending_customer", "resolved", "closed"],
    in_progress: ["pending_customer", "resolved", "closed"],
    pending_customer: ["in_progress", "resolved", "closed"],
    resolved: ["in_progress", "closed"],
    closed: []
  };

  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid transition ${from} -> ${to}`);
  }
}

function nextTicketNumber(): string {
  return `TKT-${Date.now()}-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

function toTicketResponse(ticket: any, includeInternalComments: boolean) {
  const rawTicket = typeof ticket?.toObject === "function" ? ticket.toObject() : ticket;
  const comments = Array.isArray(rawTicket?.comments) ? rawTicket.comments : [];

  return {
    ...rawTicket,
    comments: includeInternalComments ? comments : comments.filter((item: { isInternal?: boolean }) => !item.isInternal)
  };
}

router.get(
  "/api/v1/support-tickets/tickets",
  ...moduleGuards("support-tickets", "support-tickets.read"),
  async (req, res, next) => {
    try {
      const { page, limit } = listTicketsQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const [total, items] = await Promise.all([
        SupportTicketModel.countDocuments().exec(),
        SupportTicketModel.find({}, { comments: 0 })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec()
      ]);

      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid support ticket list query"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/support-tickets/tickets",
  supportTicketWriteRateLimiter,
  ...moduleGuards("support-tickets", "support-tickets.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createTicketSchema.parse(req.body ?? {});
      const created = await SupportTicketModel.create({
        ticketNumber: nextTicketNumber(),
        ...payload,
        comments: [
          {
            authorUserId: req.user!.id,
            authorEmail: req.user!.email,
            message: "Ticket created",
            isInternal: true,
            createdAt: new Date()
          }
        ]
      });
      res.status(201).json(toTicketResponse(created, req.user!.role === "super_admin"));
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid support ticket payload"));
        return;
      }
      next(error);
    }
  }
);

router.patch(
  "/api/v1/support-tickets/tickets/:id",
  supportTicketWriteRateLimiter,
  ...moduleGuards("support-tickets", "support-tickets.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = updateTicketSchema.parse(req.body ?? {});
      const existingTicket = (await SupportTicketModel.findById(req.params.id).select({ status: 1 }).exec()) as {
        status: "open" | "in_progress" | "pending_customer" | "resolved" | "closed";
      } | null;
      if (!existingTicket) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Support ticket not found");
      }
      if (existingTicket.status === "closed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Closed tickets cannot be updated");
      }

      const updatePayload: Record<string, unknown> = { ...payload };
      if (payload.assignedToUserId === null) {
        delete updatePayload.assignedToUserId;
      }

      const updateOperation =
        payload.assignedToUserId === null
          ? {
              $set: updatePayload,
              $unset: { assignedToUserId: "" }
            }
          : {
              $set: updatePayload
            };

      const updated = await SupportTicketModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      })
        .lean()
        .exec();
      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Support ticket not found");
      }
      res.json(toTicketResponse(updated, req.user!.role === "super_admin"));
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid support ticket update payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/support-tickets/tickets/:id/transition",
  supportTicketWriteRateLimiter,
  ...moduleGuards("support-tickets", "support-tickets.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = transitionTicketSchema.parse(req.body ?? {});
      const ticket = await SupportTicketModel.findById(req.params.id).exec();
      if (!ticket) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Support ticket not found");
      }

      assertAllowedTransition(ticket.status, payload.to);
      ticket.status = payload.to;
      if (payload.to === "in_progress" && !ticket.firstResponseAt) {
        ticket.firstResponseAt = new Date();
      }
      if (payload.to === "resolved" && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }
      if (payload.to === "closed") {
        ticket.closedAt = new Date();
        if (!ticket.resolvedAt) {
          ticket.resolvedAt = new Date();
        }
      }

      if (payload.note && payload.note.trim()) {
        ticket.comments.push({
          authorUserId: req.user!.id,
          authorEmail: req.user!.email,
          message: payload.note.trim(),
          isInternal: req.user!.role === "super_admin",
          createdAt: new Date()
        });
      }

      await ticket.save();
      res.json(toTicketResponse(ticket, req.user!.role === "super_admin"));
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid support ticket transition payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/support-tickets/tickets/:id/comments",
  supportTicketWriteRateLimiter,
  ...moduleGuards("support-tickets", "support-tickets.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = addCommentSchema.parse(req.body ?? {});
      const ticket = await SupportTicketModel.findById(req.params.id).exec();
      if (!ticket) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Support ticket not found");
      }
      if (ticket.status === "closed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Closed tickets cannot be commented");
      }

      const isInternalComment = req.user!.role === "super_admin" ? payload.isInternal : false;
      ticket.comments.push({
        authorUserId: req.user!.id,
        authorEmail: req.user!.email,
        message: payload.message.trim(),
        isInternal: isInternalComment,
        createdAt: new Date()
      });
      if (!ticket.firstResponseAt) {
        ticket.firstResponseAt = new Date();
      }
      await ticket.save();
      res.json(toTicketResponse(ticket, req.user!.role === "super_admin"));
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid support ticket comment payload"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/support-tickets/tickets/:id",
  supportTicketWriteRateLimiter,
  ...moduleGuards("support-tickets", "support-tickets.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const ticket = await SupportTicketModel.findById(req.params.id).exec();
      if (!ticket) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Support ticket not found");
      }
      if (ticket.status !== "closed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only closed tickets can be deleted");
      }
      await SupportTicketModel.deleteOne({ _id: ticket._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/support-tickets/insights",
  ...moduleGuards("support-tickets", "support-tickets.read"),
  async (_req, res, next) => {
    try {
      const [open, inProgress, pendingCustomer, resolved, closed, urgentOpen] = await Promise.all([
        SupportTicketModel.countDocuments({ status: "open" }).exec(),
        SupportTicketModel.countDocuments({ status: "in_progress" }).exec(),
        SupportTicketModel.countDocuments({ status: "pending_customer" }).exec(),
        SupportTicketModel.countDocuments({ status: "resolved" }).exec(),
        SupportTicketModel.countDocuments({ status: "closed" }).exec(),
        SupportTicketModel.countDocuments({
          status: { $in: ["open", "in_progress", "pending_customer"] },
          priority: "urgent"
        }).exec()
      ]);

      res.json({
        counts: {
          open,
          inProgress,
          pendingCustomer,
          resolved,
          closed,
          urgentOpen
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export const supportTicketRoutes = router;
