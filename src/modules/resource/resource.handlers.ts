import { ERROR_CODES } from "@admin-platform/shared-types";
import type { ModuleKey, ModuleRecord } from "@admin-platform/shared-types";
import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AppError } from "../../core/errors/app-error";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { ResourceRecordModel } from "./resource.model";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  data: z.record(z.unknown()).optional()
});

const updateSchema = createSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field is required"
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

function toModuleRecord(document: any): ModuleRecord {
  return {
    id: String(document._id),
    moduleKey: document.moduleKey,
    title: document.title,
    description: document.description,
    status: document.status,
    data: document.data,
    createdBy: document.createdBy,
    updatedBy: document.updatedBy,
    createdAt: document.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: document.updatedAt?.toISOString?.() ?? new Date().toISOString()
  };
}

function ensureValidId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid record id");
  }
}

export function listModuleRecordsHandler(moduleKey: ModuleKey): RequestHandler {
  return async (req, res, next) => {
    try {
      const { page, limit } = listSchema.parse(req.query);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ResourceRecordModel.find({ moduleKey }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
        ResourceRecordModel.countDocuments({ moduleKey }).exec()
      ]);

      res.json({
        items: items.map(toModuleRecord),
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid list query"));
        return;
      }
      next(error);
    }
  };
}

export function createModuleRecordHandler(moduleKey: ModuleKey): RequestHandler {
  return async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createSchema.parse(req.body ?? {});
      const created = await ResourceRecordModel.create({
        moduleKey,
        ...payload,
        createdBy: req.user?.id,
        updatedBy: req.user?.id
      });
      res.status(201).json(toModuleRecord(created.toObject()));
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid create payload"));
        return;
      }
      next(error);
    }
  };
}

export function getModuleRecordByIdHandler(moduleKey: ModuleKey): RequestHandler {
  return async (req, res, next) => {
    try {
      ensureValidId(req.params.id);
      const document = await ResourceRecordModel.findOne({
        _id: req.params.id,
        moduleKey
      })
        .lean()
        .exec();

      if (!document) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Record not found");
      }

      res.json(toModuleRecord(document));
    } catch (error) {
      next(error);
    }
  };
}

export function updateModuleRecordHandler(moduleKey: ModuleKey): RequestHandler {
  return async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidId(req.params.id);
      const payload = updateSchema.parse(req.body ?? {});
      const document = await ResourceRecordModel.findOneAndUpdate(
        { _id: req.params.id, moduleKey },
        {
          ...payload,
          updatedBy: req.user?.id
        },
        { new: true }
      )
        .lean()
        .exec();

      if (!document) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Record not found");
      }

      res.json(toModuleRecord(document));
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid update payload"));
        return;
      }
      next(error);
    }
  };
}

export function deleteModuleRecordHandler(moduleKey: ModuleKey): RequestHandler {
  return async (req, res, next) => {
    try {
      ensureValidId(req.params.id);
      const document = await ResourceRecordModel.findOneAndDelete({
        _id: req.params.id,
        moduleKey
      })
        .lean()
        .exec();

      if (!document) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Record not found");
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
