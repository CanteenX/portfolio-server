import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { ChatConversationModel, ChatMessageModel } from "./chat.models";
import { addClient, removeClient, broadcastToConversation } from "./chat-events";

const router = Router();

const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

const createConversationSchema = z.object({
  title: z.string().min(1).max(200),
  participantUserIds: z.array(z.string().min(1).max(120)).min(1).max(100)
});

const updateConversationSchema = z.object({
  title: z.string().min(1).max(200)
});

const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000)
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(4000)
});

const chatWriteRateLimiter = rateLimit({
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

function ensureParticipantOrSuperAdmin(req: AuthenticatedRequest, participantUserIds: string[]): void {
  if (req.user!.role !== "super_admin" && !participantUserIds.includes(req.user!.id)) {
    throw new AppError(403, ERROR_CODES.FORBIDDEN, "You are not a participant in this conversation");
  }
}

router.get(
  "/api/v1/chat/conversations",
  ...moduleGuards("chat", "chat.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { page, limit } = listConversationsQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const filter: Record<string, unknown> = {};
      if (req.user!.role !== "super_admin") {
        filter.participantUserIds = req.user!.id;
      }
      const [total, items] = await Promise.all([
        ChatConversationModel.countDocuments(filter).exec(),
        ChatConversationModel.find(filter)
          .sort({ lastMessageAt: -1 })
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
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid conversation list query"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/chat/conversations",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createConversationSchema.parse(req.body ?? {});
      const created = await ChatConversationModel.create({
        title: payload.title.trim(),
        participantUserIds: Array.from(new Set(payload.participantUserIds)),
        status: "active",
        messageCount: 0,
        createdByUserId: req.user!.id
      });
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid conversation payload"));
        return;
      }
      next(error);
    }
  }
);

router.get(
  "/api/v1/chat/conversations/:id",
  ...moduleGuards("chat", "chat.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const conversation = await ChatConversationModel.findById(req.params.id).lean().exec() as
        | ({ participantUserIds: string[] } & Record<string, unknown>)
        | null;
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds);
      res.json(conversation);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/api/v1/chat/conversations/:id",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = updateConversationSchema.parse(req.body ?? {});
      const existing = await ChatConversationModel.findById(req.params.id).exec();
      if (!existing) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, existing.participantUserIds as string[]);
      existing.title = payload.title.trim();
      await existing.save();
      res.json(existing.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid conversation update payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/chat/conversations/:id/archive",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const conversation = await ChatConversationModel.findById(req.params.id).exec();
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds as string[]);
      if (conversation.status !== "active") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only active conversations can be archived");
      }
      conversation.status = "archived";
      await conversation.save();
      res.json(conversation.toObject());
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/api/v1/chat/conversations/:id",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const conversation = await ChatConversationModel.findById(req.params.id).exec();
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds as string[]);
      if (conversation.status !== "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only archived conversations can be deleted");
      }
      await ChatConversationModel.deleteOne({ _id: conversation._id }).exec();
      await ChatMessageModel.deleteMany({ conversationId: conversation._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/chat/conversations/:id/messages",
  ...moduleGuards("chat", "chat.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const { page, limit } = listMessagesQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;

      const conversation = await ChatConversationModel.findById(req.params.id).lean().exec() as
        | ({ participantUserIds: string[] } & Record<string, unknown>)
        | null;
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds);

      const [total, items] = await Promise.all([
        ChatMessageModel.countDocuments({ conversationId: req.params.id }).exec(),
        ChatMessageModel.find({ conversationId: req.params.id })
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
  "/api/v1/chat/conversations/:id/messages",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = sendMessageSchema.parse(req.body ?? {});
      const conversation = await ChatConversationModel.findById(req.params.id).exec();
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds as string[]);
      if (conversation.status === "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Archived conversations cannot receive new messages");
      }

      const message = await ChatMessageModel.create({
        conversationId: new mongoose.Types.ObjectId(req.params.id),
        senderUserId: req.user!.id,
        senderEmail: req.user!.email,
        content: payload.content.trim()
      });

      await ChatConversationModel.updateOne(
        { _id: conversation._id },
        { $inc: { messageCount: 1 }, $set: { lastMessageAt: new Date() } }
      ).exec();

      broadcastToConversation(req.params.id, "message", message.toObject());

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

router.patch(
  "/api/v1/chat/messages/:id",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = editMessageSchema.parse(req.body ?? {});
      const message = await ChatMessageModel.findById(req.params.id).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      if (message.senderUserId !== req.user!.id) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only edit your own messages");
      }

      message.content = payload.content.trim();
      message.editedAt = new Date();
      await message.save();

      broadcastToConversation(String(message.conversationId), "message_edited", message.toObject());

      res.json(message.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid message edit payload"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/chat/messages/:id",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const message = await ChatMessageModel.findById(req.params.id).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      if (message.senderUserId !== req.user!.id) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only delete your own messages");
      }

      const conversation = await ChatConversationModel.findById(message.conversationId).exec();
      if (conversation && conversation.messageCount > 0) {
        conversation.messageCount -= 1;
        await conversation.save();
      }

      const conversationIdStr = String(message.conversationId);
      const deletedId = String(message._id);
      await ChatMessageModel.deleteOne({ _id: message._id }).exec();

      broadcastToConversation(conversationIdStr, "message_deleted", { _id: deletedId });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/chat/insights",
  ...moduleGuards("chat", "chat.read"),
  async (_req, res, next) => {
    try {
      const [totalConversations, activeConversations, archivedConversations, totalMessages] = await Promise.all([
        ChatConversationModel.countDocuments().exec(),
        ChatConversationModel.countDocuments({ status: "active" }).exec(),
        ChatConversationModel.countDocuments({ status: "archived" }).exec(),
        ChatMessageModel.countDocuments().exec()
      ]);

      res.json({
        counts: {
          totalConversations,
          activeConversations,
          archivedConversations,
          totalMessages
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── SSE stream (real-time messages) ─────────────────────────────

// SSE auth: native EventSource can't set headers, so accept ?token= query param
router.get(
  "/api/v1/chat/conversations/:id/stream",
  (req, _res, next) => {
    const token = req.query.token;
    if (typeof token === "string" && token && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${token}`;
    }
    next();
  },
  ...moduleGuards("chat", "chat.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);

      const conversation = await ChatConversationModel.findById(req.params.id).lean().exec() as
        | ({ participantUserIds: string[] } & Record<string, unknown>)
        | null;
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds);

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write("event: connected\ndata: {}\n\n");

      addClient({ res, userId: req.user!.id, conversationId: req.params.id });

      const heartbeat = setInterval(() => {
        res.write(": heartbeat\n\n");
      }, 30_000);

      req.on("close", () => {
        clearInterval(heartbeat);
        removeClient(res);
      });
    } catch (error) {
      next(error);
    }
  }
);

export const chatRoutes = router;
