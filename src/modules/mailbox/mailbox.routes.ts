import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { MailboxMessageModel } from "./mailbox.models";
import { sendMail, syncInbound } from "./mail-adapter";

const router = Router();

const listMessagesQuerySchema = z.object({
  folder: z.enum(["inbox", "sent", "drafts", "trash", "archive"]).default("inbox"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  allUsers: z.coerce.boolean().default(false)
});

const createMessageSchema = z.object({
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(50000),
  fromAddress: z.string().email(),
  fromName: z.string().min(1).max(200),
  toAddresses: z.array(z.string().email()).min(1),
  ccAddresses: z.array(z.string().email()).default([]),
  bccAddresses: z.array(z.string().email()).default([]),
  folder: z.enum(["drafts", "sent"]).default("sent"),
  inReplyToId: z.string().optional()
});

const updateMessageSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(50000).optional(),
  toAddresses: z.array(z.string().email()).min(1).optional(),
  ccAddresses: z.array(z.string().email()).optional(),
  bccAddresses: z.array(z.string().email()).optional()
});

const moveMessageSchema = z.object({
  folder: z.enum(["inbox", "sent", "drafts", "trash", "archive"])
});

const mailboxSendRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

const mailboxWriteRateLimiter = rateLimit({
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

router.get(
  "/api/v1/mailbox/messages",
  ...moduleGuards("mailbox", "mailbox.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { folder, page, limit, allUsers } = listMessagesQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = { folder };
      if (req.user!.role !== "super_admin" || !allUsers) {
        filter.ownerUserId = req.user!.id;
      }

      const [total, items] = await Promise.all([
        MailboxMessageModel.countDocuments(filter).exec(),
        MailboxMessageModel.find(filter)
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
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid message list query"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/mailbox/messages",
  mailboxSendRateLimiter,
  ...moduleGuards("mailbox", "mailbox.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createMessageSchema.parse(req.body ?? {});

      let inReplyToObjectId: mongoose.Types.ObjectId | undefined = undefined;
      if (payload.inReplyToId) {
        ensureValidObjectId(payload.inReplyToId);
        inReplyToObjectId = new mongoose.Types.ObjectId(payload.inReplyToId);
      }

      const message = await MailboxMessageModel.create({
        subject: payload.subject.trim(),
        body: payload.body.trim(),
        fromAddress: payload.fromAddress.toLowerCase().trim(),
        fromName: payload.fromName.trim(),
        toAddresses: payload.toAddresses.map((email) => email.toLowerCase().trim()),
        ccAddresses: payload.ccAddresses.map((email) => email.toLowerCase().trim()),
        bccAddresses: payload.bccAddresses.map((email) => email.toLowerCase().trim()),
        folder: payload.folder,
        status: "unread",
        isStarred: false,
        hasAttachments: false,
        inReplyToId: inReplyToObjectId,
        ownerUserId: req.user!.id,
        sentAt: payload.folder === "sent" ? new Date() : undefined
      });

      res.status(201).json(message.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid message payload"));
        return;
      }
      next(error);
    }
  }
);

router.get(
  "/api/v1/mailbox/messages/:id",
  ...moduleGuards("mailbox", "mailbox.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);

      const filter: Record<string, unknown> = { _id: req.params.id };
      if (req.user!.role !== "super_admin") {
        filter.ownerUserId = req.user!.id;
      }

      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }

      if (message.status === "unread" && message.folder === "inbox" && message.ownerUserId === req.user!.id) {
        message.status = "read";
        await message.save();
      }

      res.json(message.toObject());
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/api/v1/mailbox/messages/:id",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = updateMessageSchema.parse(req.body ?? {});

      const filter: Record<string, unknown> = { _id: req.params.id };
      if (req.user!.role !== "super_admin") {
        filter.ownerUserId = req.user!.id;
      }

      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }

      if (message.folder !== "drafts") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only draft messages can be updated");
      }

      if (payload.subject !== undefined) {
        message.subject = payload.subject.trim();
      }
      if (payload.body !== undefined) {
        message.body = payload.body.trim();
      }
      if (payload.toAddresses !== undefined) {
        message.toAddresses = payload.toAddresses.map((email) => email.toLowerCase().trim());
      }
      if (payload.ccAddresses !== undefined) {
        message.ccAddresses = payload.ccAddresses.map((email) => email.toLowerCase().trim());
      }
      if (payload.bccAddresses !== undefined) {
        message.bccAddresses = payload.bccAddresses.map((email) => email.toLowerCase().trim());
      }

      await message.save();
      res.json(message.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid message update payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/mailbox/messages/:id/send",
  mailboxSendRateLimiter,
  ...moduleGuards("mailbox", "mailbox.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);

      const filter: Record<string, unknown> = { _id: req.params.id };
      if (req.user!.role !== "super_admin") {
        filter.ownerUserId = req.user!.id;
      }

      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }

      if (message.folder !== "drafts") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only draft messages can be sent");
      }

      const result = await sendMail({
        from: { name: message.fromName, address: message.fromAddress },
        to: message.toAddresses as string[],
        cc: (message.ccAddresses as string[]).length > 0 ? message.ccAddresses as string[] : undefined,
        bcc: (message.bccAddresses as string[]).length > 0 ? message.bccAddresses as string[] : undefined,
        subject: message.subject,
        html: message.body,
      });

      message.folder = "sent";
      message.sentAt = new Date();
      message.externalMessageId = result.messageId || undefined;
      await message.save();

      res.json(message.toObject());
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/v1/mailbox/messages/:id/move",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = moveMessageSchema.parse(req.body ?? {});

      const filter: Record<string, unknown> = { _id: req.params.id };
      if (req.user!.role !== "super_admin") {
        filter.ownerUserId = req.user!.id;
      }

      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }

      message.folder = payload.folder;
      await message.save();

      res.json(message.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid move payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/mailbox/messages/:id/star",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);

      const filter: Record<string, unknown> = { _id: req.params.id };
      if (req.user!.role !== "super_admin") {
        filter.ownerUserId = req.user!.id;
      }

      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }

      message.isStarred = !message.isStarred;
      await message.save();

      res.json(message.toObject());
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/v1/mailbox/messages/:id/read",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);

      const filter: Record<string, unknown> = { _id: req.params.id };
      if (req.user!.role !== "super_admin") {
        filter.ownerUserId = req.user!.id;
      }

      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }

      message.status = "read";
      await message.save();

      res.json(message.toObject());
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/api/v1/mailbox/messages/:id",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);

      const filter: Record<string, unknown> = { _id: req.params.id };
      if (req.user!.role !== "super_admin") {
        filter.ownerUserId = req.user!.id;
      }

      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }

      if (message.folder === "trash") {
        await MailboxMessageModel.deleteOne({ _id: message._id }).exec();
        res.status(204).send();
      } else {
        message.folder = "trash";
        await message.save();
        res.json(message.toObject());
      }
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/mailbox/insights",
  ...moduleGuards("mailbox", "mailbox.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const filter: Record<string, unknown> = {};
      if (req.user!.role !== "super_admin") {
        filter.ownerUserId = req.user!.id;
      }

      const [inbox, sent, drafts, trash, archive, unread, starred] = await Promise.all([
        MailboxMessageModel.countDocuments({ ...filter, folder: "inbox" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, folder: "sent" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, folder: "drafts" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, folder: "trash" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, folder: "archive" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, status: "unread" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, isStarred: true }).exec()
      ]);

      res.json({
        counts: {
          inbox,
          sent,
          drafts,
          trash,
          archive,
          unread,
          starred
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── Inbound sync (super_admin trigger) ──────────────────────────

router.post(
  "/api/v1/mailbox/sync-inbound",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.create"),
  async (_req, res, next) => {
    try {
      const result = await syncInbound();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export const mailboxRoutes = router;
