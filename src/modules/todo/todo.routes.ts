import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { TodoItemModel } from "./todo.models";

const router = Router();

const createTodoSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.coerce.date().optional(),
  tags: z.array(z.string()).default([])
});

const updateTodoSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional()
});

const listTodosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(["pending", "completed"]).optional(),
  allUsers: z
    .string()
    .optional()
    .transform((val) => val === "true")
});

const todoWriteRateLimiter = rateLimit({
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

function ensureOwnerOrSuperAdmin(req: AuthenticatedRequest, todo: { ownerUserId: string }): void {
  if (req.user!.role !== "super_admin" && req.user!.id !== todo.ownerUserId) {
    throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only access your own todo items");
  }
}

router.get(
  "/api/v1/todo/items",
  ...moduleGuards("todo", "todo.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { page, limit, status, allUsers } = listTodosQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = {};
      if (status) {
        filter.status = status;
      }

      if (req.user!.role !== "super_admin" || !allUsers) {
        filter.ownerUserId = req.user!.id;
      }

      const [total, items] = await Promise.all([
        TodoItemModel.countDocuments(filter).exec(),
        TodoItemModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);

      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid todo item list query"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/todo/items",
  todoWriteRateLimiter,
  ...moduleGuards("todo", "todo.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createTodoSchema.parse(req.body ?? {});

      const created = await TodoItemModel.create({
        ...payload,
        status: "pending",
        ownerUserId: req.user!.id
      });

      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid todo item payload"));
        return;
      }
      next(error);
    }
  }
);

router.get(
  "/api/v1/todo/items/:id",
  ...moduleGuards("todo", "todo.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const todo = await TodoItemModel.findById(req.params.id).lean().exec() as
        | ({ ownerUserId: string } & Record<string, unknown>)
        | null;

      if (!todo) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }

      ensureOwnerOrSuperAdmin(req, todo);

      res.json(todo);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/api/v1/todo/items/:id",
  todoWriteRateLimiter,
  ...moduleGuards("todo", "todo.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = updateTodoSchema.parse(req.body ?? {});

      const existingTodo = await TodoItemModel.findById(req.params.id).exec();
      if (!existingTodo) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }

      ensureOwnerOrSuperAdmin(req, existingTodo);

      const updatePayload: Record<string, unknown> = { ...payload };
      const unsetFields: Record<string, string> = {};

      if (payload.description === null) {
        delete updatePayload.description;
        unsetFields.description = "";
      }
      if (payload.dueDate === null) {
        delete updatePayload.dueDate;
        unsetFields.dueDate = "";
      }

      const updateOperation =
        Object.keys(unsetFields).length > 0
          ? {
              $set: updatePayload,
              $unset: unsetFields
            }
          : {
              $set: updatePayload
            };

      const updated = await TodoItemModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      })
        .lean()
        .exec();

      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid todo item update payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/todo/items/:id/complete",
  todoWriteRateLimiter,
  ...moduleGuards("todo", "todo.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const todo = await TodoItemModel.findById(req.params.id).exec();

      if (!todo) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }

      ensureOwnerOrSuperAdmin(req, todo);

      if (todo.status === "completed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Todo item is already completed");
      }

      todo.status = "completed";
      todo.completedAt = new Date();
      await todo.save();

      res.json(todo.toObject());
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/v1/todo/items/:id/reopen",
  todoWriteRateLimiter,
  ...moduleGuards("todo", "todo.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const todo = await TodoItemModel.findById(req.params.id).exec();

      if (!todo) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }

      ensureOwnerOrSuperAdmin(req, todo);

      if (todo.status === "pending") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Todo item is already pending");
      }

      todo.status = "pending";
      todo.completedAt = undefined;
      await todo.save();

      res.json(todo.toObject());
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/api/v1/todo/items/:id",
  todoWriteRateLimiter,
  ...moduleGuards("todo", "todo.delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const todo = await TodoItemModel.findById(req.params.id).exec();

      if (!todo) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }

      ensureOwnerOrSuperAdmin(req, todo);

      await TodoItemModel.deleteOne({ _id: todo._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/todo/insights",
  ...moduleGuards("todo", "todo.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { allUsers } = listTodosQuerySchema.parse(req.query ?? {});

      const filter: Record<string, unknown> = {};
      if (req.user!.role !== "super_admin" || !allUsers) {
        filter.ownerUserId = req.user!.id;
      }

      const now = new Date();
      const [pending, completed, overdue, totalItems] = await Promise.all([
        TodoItemModel.countDocuments({ ...filter, status: "pending" }).exec(),
        TodoItemModel.countDocuments({ ...filter, status: "completed" }).exec(),
        TodoItemModel.countDocuments({ ...filter, status: "pending", dueDate: { $lt: now } }).exec(),
        TodoItemModel.countDocuments(filter).exec()
      ]);

      res.json({
        counts: {
          pending,
          completed,
          overdue,
          totalItems
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export const todoRoutes = router;
