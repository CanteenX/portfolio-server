import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { TaskModel } from "./tasks.models";
import { ProjectModel } from "../projects/projects.models";

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(1).max(300).trim(),
  description: z.string().max(8000).optional(),
  projectId: z.string().min(1).optional(),
  status: z.enum(["todo", "in_progress", "review", "done", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assigneeUserId: z.string().min(1).optional(),
  reporterUserId: z.string().min(1).optional(),
  dueDate: z.coerce.date().optional(),
  tags: z.array(z.string().min(1).max(50)).max(30).default([]),
  estimatedHours: z.number().min(0).optional()
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).trim().optional(),
  description: z.string().max(8000).optional(),
  projectId: z.string().min(1).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeUserId: z.string().min(1).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(30).optional(),
  estimatedHours: z.number().min(0).nullable().optional()
});

const transitionTaskSchema = z.object({
  to: z.enum(["todo", "in_progress", "review", "done", "cancelled"])
});

const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(["todo", "in_progress", "review", "done", "cancelled"]).optional(),
  projectId: z.string().min(1).optional(),
  assigneeUserId: z.string().min(1).optional()
});

const taskWriteRateLimiter = rateLimit({
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
    todo: ["in_progress", "cancelled"],
    in_progress: ["review", "todo", "cancelled"],
    review: ["done", "in_progress", "cancelled"],
    done: ["todo"],
    cancelled: ["todo"]
  };

  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid transition ${from} -> ${to}`);
  }
}

router.get(
  "/api/v1/tasks/tasks",
  ...moduleGuards("tasks", "tasks.read"),
  async (req, res, next) => {
    try {
      const { page, limit, status, projectId, assigneeUserId } = listTasksQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;

      const filter: Record<string, unknown> = {};
      if (status) {
        filter.status = status;
      }
      if (projectId) {
        ensureValidObjectId(projectId);
        filter.projectId = new mongoose.Types.ObjectId(projectId);
      }
      if (assigneeUserId) {
        filter.assigneeUserId = assigneeUserId;
      }

      const [total, items] = await Promise.all([
        TaskModel.countDocuments(filter).exec(),
        TaskModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);

      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid task list query"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/tasks/tasks",
  taskWriteRateLimiter,
  ...moduleGuards("tasks", "tasks.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createTaskSchema.parse(req.body ?? {});

      if (payload.projectId) {
        ensureValidObjectId(payload.projectId);
        const projectExists = await ProjectModel.exists({ _id: payload.projectId }).exec();
        if (!projectExists) {
          throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
        }
      }

      const createPayload: Record<string, unknown> = { ...payload, reporterUserId: req.user!.id };
      if (payload.projectId) {
        createPayload.projectId = new mongoose.Types.ObjectId(payload.projectId);
      }

      const created = await TaskModel.create(createPayload);
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid task payload"));
        return;
      }
      next(error);
    }
  }
);

router.get(
  "/api/v1/tasks/tasks/:id",
  ...moduleGuards("tasks", "tasks.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const task = await TaskModel.findById(req.params.id).lean().exec();
      if (!task) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found");
      }
      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/api/v1/tasks/tasks/:id",
  taskWriteRateLimiter,
  ...moduleGuards("tasks", "tasks.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = updateTaskSchema.parse(req.body ?? {});

      if (payload.projectId) {
        ensureValidObjectId(payload.projectId);
        const projectExists = await ProjectModel.exists({ _id: payload.projectId }).exec();
        if (!projectExists) {
          throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
        }
      }

      const updatePayload: Record<string, unknown> = { ...payload };
      const unsetFields: Record<string, string> = {};

      if (payload.projectId) {
        updatePayload.projectId = new mongoose.Types.ObjectId(payload.projectId);
      } else if (payload.projectId === null) {
        delete updatePayload.projectId;
        unsetFields.projectId = "";
      }

      if (payload.assigneeUserId === null) {
        delete updatePayload.assigneeUserId;
        unsetFields.assigneeUserId = "";
      }

      if (payload.dueDate === null) {
        delete updatePayload.dueDate;
        unsetFields.dueDate = "";
      }

      if (payload.estimatedHours === null) {
        delete updatePayload.estimatedHours;
        unsetFields.estimatedHours = "";
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

      const updated = await TaskModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      })
        .lean()
        .exec();

      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found");
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid task update payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/tasks/tasks/:id/transition",
  taskWriteRateLimiter,
  ...moduleGuards("tasks", "tasks.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = transitionTaskSchema.parse(req.body ?? {});
      const task = await TaskModel.findById(req.params.id).exec();
      if (!task) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found");
      }

      const previousStatus = task.status;
      assertAllowedTransition(previousStatus, payload.to);
      task.status = payload.to;

      if (payload.to === "done") {
        task.completedAt = new Date();
      } else if (previousStatus === "done" || previousStatus === "cancelled") {
        task.completedAt = undefined;
      }

      await task.save();
      res.json(task.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid task transition payload"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/tasks/tasks/:id",
  taskWriteRateLimiter,
  ...moduleGuards("tasks", "tasks.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const task = await TaskModel.findById(req.params.id).exec();
      if (!task) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found");
      }
      if (task.status !== "done" && task.status !== "cancelled") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only done or cancelled tasks can be deleted");
      }
      await TaskModel.deleteOne({ _id: task._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/tasks/insights",
  ...moduleGuards("tasks", "tasks.read"),
  async (_req, res, next) => {
    try {
      const now = new Date();
      const [todo, inProgress, review, done, cancelled, totalTasks, overdue] = await Promise.all([
        TaskModel.countDocuments({ status: "todo" }).exec(),
        TaskModel.countDocuments({ status: "in_progress" }).exec(),
        TaskModel.countDocuments({ status: "review" }).exec(),
        TaskModel.countDocuments({ status: "done" }).exec(),
        TaskModel.countDocuments({ status: "cancelled" }).exec(),
        TaskModel.countDocuments().exec(),
        TaskModel.countDocuments({
          dueDate: { $lt: now },
          status: { $nin: ["done", "cancelled"] }
        }).exec()
      ]);

      res.json({
        counts: {
          todo,
          inProgress,
          review,
          done,
          cancelled,
          totalTasks,
          overdue
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export const taskRoutes = router;
