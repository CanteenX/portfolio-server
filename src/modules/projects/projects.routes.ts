import { ERROR_CODES } from "@admin-platform/shared-types";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { ProjectModel } from "./projects.models";

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(4000).optional(),
  status: z.enum(["planning", "active", "on_hold", "completed", "archived"]).default("planning"),
  ownerUserId: z.string().min(1).optional(),
  memberUserIds: z.array(z.string().min(1)).max(100).default([]),
  startDate: z.coerce.date().optional(),
  targetEndDate: z.coerce.date().optional(),
  actualEndDate: z.coerce.date().optional(),
  tags: z.array(z.string().min(1).max(50)).max(30).default([]),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium")
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(4000).optional(),
  ownerUserId: z.string().min(1).optional(),
  memberUserIds: z.array(z.string().min(1)).optional(),
  startDate: z.coerce.date().nullable().optional(),
  targetEndDate: z.coerce.date().nullable().optional(),
  actualEndDate: z.coerce.date().nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(30).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional()
});

const transitionProjectSchema = z.object({
  to: z.enum(["planning", "active", "on_hold", "completed", "archived"]),
  note: z.string().max(1000).optional()
});

const addMemberSchema = z.object({
  userId: z.string().min(1)
});

const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(["planning", "active", "on_hold", "completed", "archived"]).optional()
});

const projectWriteRateLimiter = rateLimit({
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
    planning: ["active", "archived"],
    active: ["on_hold", "completed", "archived"],
    on_hold: ["active", "archived"],
    completed: ["archived"],
    archived: []
  };

  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid transition ${from} -> ${to}`);
  }
}

router.get(
  "/api/v1/projects/projects",
  ...moduleGuards("projects", "projects.read"),
  async (req, res, next) => {
    try {
      const { page, limit, status } = listProjectsQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const filter = status ? { status } : {};

      const [total, items] = await Promise.all([
        ProjectModel.countDocuments(filter).exec(),
        ProjectModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);

      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project list query"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/projects/projects",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createProjectSchema.parse(req.body ?? {});
      const created = await ProjectModel.create({ ...payload, ownerUserId: req.user!.id });
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project payload"));
        return;
      }
      next(error);
    }
  }
);

router.get(
  "/api/v1/projects/projects/:id",
  ...moduleGuards("projects", "projects.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const project = await ProjectModel.findById(req.params.id).lean().exec();
      if (!project) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/api/v1/projects/projects/:id",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = updateProjectSchema.parse(req.body ?? {});
      const existingProject = await ProjectModel.findById(req.params.id).select({ status: 1 }).exec();
      if (!existingProject) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      if (existingProject.status === "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Archived projects cannot be updated");
      }

      const updatePayload: Record<string, unknown> = { ...payload };
      const unsetFields: Record<string, string> = {};

      if (payload.startDate === null) {
        delete updatePayload.startDate;
        unsetFields.startDate = "";
      }
      if (payload.targetEndDate === null) {
        delete updatePayload.targetEndDate;
        unsetFields.targetEndDate = "";
      }
      if (payload.actualEndDate === null) {
        delete updatePayload.actualEndDate;
        unsetFields.actualEndDate = "";
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

      const updated = await ProjectModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      })
        .lean()
        .exec();

      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project update payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/projects/projects/:id/transition",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = transitionProjectSchema.parse(req.body ?? {});
      const project = await ProjectModel.findById(req.params.id).exec();
      if (!project) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }

      assertAllowedTransition(project.status, payload.to);
      project.status = payload.to;

      if (payload.to === "completed" && !project.actualEndDate) {
        project.actualEndDate = new Date();
      }

      await project.save();
      res.json(project.toObject());
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project transition payload"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/projects/projects/:id",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const project = await ProjectModel.findById(req.params.id).exec();
      if (!project) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      if (project.status !== "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only archived projects can be deleted");
      }
      await ProjectModel.deleteOne({ _id: project._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/api/v1/projects/projects/:id/members",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = addMemberSchema.parse(req.body ?? {});
      const project = await ProjectModel.findById(req.params.id).exec();
      if (!project) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      if (project.status === "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot add members to archived projects");
      }
      if (project.memberUserIds.includes(payload.userId)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "User is already a member");
      }

      const updated = await ProjectModel.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { memberUserIds: payload.userId } },
        { new: true, runValidators: true }
      ).lean().exec();
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid add member payload"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/projects/projects/:id/members/:userId",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const { userId } = req.params;
      const project = await ProjectModel.findById(req.params.id).exec();
      if (!project) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      if (project.status === "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot remove members from archived projects");
      }

      if (!project.memberUserIds.includes(userId)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "User is not a member");
      }

      const updated = await ProjectModel.findByIdAndUpdate(
        req.params.id,
        { $pull: { memberUserIds: userId } },
        { new: true, runValidators: true }
      ).lean().exec();
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/projects/insights",
  ...moduleGuards("projects", "projects.read"),
  async (_req, res, next) => {
    try {
      const [planning, active, onHold, completed, archived, totalProjects] = await Promise.all([
        ProjectModel.countDocuments({ status: "planning" }).exec(),
        ProjectModel.countDocuments({ status: "active" }).exec(),
        ProjectModel.countDocuments({ status: "on_hold" }).exec(),
        ProjectModel.countDocuments({ status: "completed" }).exec(),
        ProjectModel.countDocuments({ status: "archived" }).exec(),
        ProjectModel.countDocuments().exec()
      ]);

      res.json({
        counts: {
          planning,
          active,
          onHold,
          completed,
          archived,
          totalProjects
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export const projectRoutes = router;
