import { ERROR_CODES } from "@admin-platform/shared-types";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { z } from "zod";
import { env } from "../../config/env";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { FileManagerEntryModel } from "./file-manager.models";
import type { FileManagerEntryDocument } from "./file-manager.models";
import { getStorageAdapter, generateStorageKey } from "./storage-adapter";
import { scanFile } from "./virus-scan.hook";
import { checkQuota, getUserStorageUsed } from "./quota.service";

const router = Router();

const entryNameSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => !/[\\/\u0000-\u001f]/.test(value), "Invalid entry name characters");

const listEntriesQuerySchema = z.object({
  parentId: z.string().optional(),
  status: z.enum(["active", "trashed", "all"]).default("active"),
  kind: z.enum(["file", "folder", "all"]).default("all"),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

const createFolderSchema = z.object({
  name: entryNameSchema,
  parentId: z.string().nullable().optional()
});

const createFileSchema = z.object({
  name: entryNameSchema,
  parentId: z.string().nullable().optional(),
  sizeBytes: z.number().int().min(0).max(1024 * 1024 * 1024),
  mimeType: z.string().max(180).optional(),
  tags: z.array(z.string().min(1).max(40)).max(25).default([])
});

const updateEntrySchema = z
  .object({
    name: entryNameSchema.optional(),
    tags: z.array(z.string().min(1).max(40)).max(25).optional(),
    isStarred: z.boolean().optional(),
    mimeType: z.string().max(180).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

const moveEntrySchema = z.object({
  targetParentId: z.string().nullable().optional()
});

const transitionEntrySchema = z.object({
  to: z.enum(["active", "trashed"])
});

const fileManagerWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

function isStrictObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

function parseNullableObjectId(value: string | null | undefined, fieldLabel: string): mongoose.Types.ObjectId | null {
  if (value === undefined || value === null || value === "" || value === "null") {
    return null;
  }
  if (!isStrictObjectId(value)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid ${fieldLabel}`);
  }
  return new mongoose.Types.ObjectId(value);
}

function extractExtension(name: string): string | undefined {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return undefined;
  }
  return name.slice(dotIndex + 1).toLowerCase();
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
  "application/zip", "application/x-zip-compressed",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/wav", "audio/ogg",
]);

// Magic-byte signatures for MIME type validation (client Content-Type is not trusted alone)
const MAGIC_SIGNATURES: Array<{ mime: string; offset: number; bytes: number[] }> = [
  { mime: "image/jpeg",    offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",     offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif",     offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp",    offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  { mime: "application/pdf", offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: "application/zip", offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
  { mime: "video/mp4",     offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { mime: "audio/mpeg",    offset: 0, bytes: [0xff, 0xfb] },
  { mime: "audio/wav",     offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "audio/ogg",     offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] },
];

const MAGIC_BUFFER_SIZE = 16;
const fsOpen = promisify(fs.open);
const fsRead = promisify(fs.read);
const fsClose = promisify(fs.close);

async function detectMimeFromFile(filePath: string): Promise<string | null> {
  let fd: number | undefined;
  try {
    fd = await fsOpen(filePath, "r");
    const buf = Buffer.alloc(MAGIC_BUFFER_SIZE);
    await fsRead(fd, buf, 0, MAGIC_BUFFER_SIZE, 0);
    for (const sig of MAGIC_SIGNATURES) {
      const slice = buf.slice(sig.offset, sig.offset + sig.bytes.length);
      if (slice.length === sig.bytes.length && sig.bytes.every((b, i) => slice[i] === b)) {
        return sig.mime;
      }
    }
    return null;
  } finally {
    if (fd !== undefined) await fsClose(fd);
  }
}

const MIME_ALIAS: Record<string, string[]> = {
  "application/zip": ["application/x-zip-compressed"],
  "video/mp4": ["video/webm"],
};

function mimeMatchesDetected(declared: string, detected: string | null): boolean {
  if (detected === null) return true; // no signature registered — allow (text/csv, office docs, etc.)
  if (declared === detected) return true;
  return (MIME_ALIAS[detected] ?? []).includes(declared);
}

const upload = multer({
  dest: path.resolve(env.FILE_UPLOAD_DIR ?? "uploads", "_tmp"),
  limits: { fileSize: env.FILE_UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, ERROR_CODES.BAD_REQUEST, `File type '${file.mimetype}' is not allowed`));
    }
  },
});

type FileManagerDoc = FileManagerEntryDocument & {
  _id: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

function toFileManagerEntry(document: FileManagerDoc) {
  return {
    _id: String(document._id),
    name: document.name,
    kind: document.kind,
    parentId: document.parentId ? String(document.parentId) : null,
    sizeBytes: typeof document.sizeBytes === "number" ? document.sizeBytes : undefined,
    mimeType: document.mimeType ?? undefined,
    extension: document.extension ?? undefined,
    storagePath: document.storagePath ?? undefined,
    scanStatus: document.scanStatus ?? undefined,
    status: document.status,
    tags: Array.isArray(document.tags) ? document.tags : [],
    isStarred: Boolean(document.isStarred),
    createdByUserId: document.createdByUserId,
    updatedByUserId: document.updatedByUserId,
    trashedAt: document.trashedAt?.toISOString?.() ?? undefined,
    createdAt: document.createdAt?.toISOString?.() ?? undefined,
    updatedAt: document.updatedAt?.toISOString?.() ?? undefined
  };
}

async function ensureParentFolderExists(parentId: mongoose.Types.ObjectId | null): Promise<void> {
  if (!parentId) {
    return;
  }
  const parent = (await FileManagerEntryModel.findById(parentId).select({ kind: 1, status: 1 }).lean().exec()) as
    | { kind: "folder" | "file"; status: "active" | "trashed" }
    | null;
  if (!parent || parent.kind !== "folder" || parent.status !== "active") {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Parent folder not found");
  }
}

async function ensureMoveDoesNotCreateCycle(
  entryId: string,
  targetParentId: mongoose.Types.ObjectId | null
): Promise<void> {
  if (!targetParentId) {
    return;
  }
  if (String(targetParentId) === entryId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Entry cannot be moved into itself");
  }

  let currentParentId: mongoose.Types.ObjectId | null = targetParentId;
  for (let depth = 0; depth < 120; depth += 1) {
    if (!currentParentId) {
      return;
    }
    const currentId = String(currentParentId);
    if (currentId === entryId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid move target");
    }
    const parent = (await FileManagerEntryModel.findById(currentParentId).select({ parentId: 1 }).lean().exec()) as
      | { parentId?: mongoose.Types.ObjectId | null }
      | null;
    if (!parent) {
      return;
    }
    currentParentId = parent.parentId ?? null;
  }

  throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Move validation exceeded maximum depth");
}

router.get(
  "/api/v1/file-manager/entries",
  ...moduleGuards("file-manager", "file-manager.read"),
  async (req, res, next) => {
    try {
      const query = listEntriesQuerySchema.parse(req.query ?? {});
      const parentId = parseNullableObjectId(query.parentId, "parentId");
      const skip = (query.page - 1) * query.limit;

      const filter: Record<string, unknown> = {
        parentId
      };

      if (query.status !== "all") {
        filter.status = query.status;
      }

      if (query.kind !== "all") {
        filter.kind = query.kind;
      }

      if (query.q && query.q.trim()) {
        filter.name = {
          $regex: query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i"
        };
      }

      const [items, total] = await Promise.all([
        FileManagerEntryModel.find(filter).sort({ kind: 1, name: 1, createdAt: -1 }).skip(skip).limit(query.limit).lean().exec(),
        FileManagerEntryModel.countDocuments(filter).exec()
      ]);

      res.json({
        items: (items as unknown as FileManagerDoc[]).map(toFileManagerEntry),
        page: query.page,
        limit: query.limit,
        total
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid file manager list query"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/file-manager/folders",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createFolderSchema.parse(req.body ?? {});
      const parentId = parseNullableObjectId(payload.parentId, "parentId");
      await ensureParentFolderExists(parentId);

      const created = await FileManagerEntryModel.create({
        name: payload.name.trim(),
        kind: "folder",
        parentId,
        status: "active",
        tags: [],
        isStarred: false,
        createdByUserId: req.user!.id,
        updatedByUserId: req.user!.id
      });
      res.status(201).json(toFileManagerEntry(created.toObject()));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid create folder payload"));
        return;
      }
      if (error?.code === 11000) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "An active folder with this name already exists"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/file-manager/files",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createFileSchema.parse(req.body ?? {});
      const parentId = parseNullableObjectId(payload.parentId, "parentId");
      await ensureParentFolderExists(parentId);

      const created = await FileManagerEntryModel.create({
        name: payload.name.trim(),
        kind: "file",
        parentId,
        sizeBytes: payload.sizeBytes,
        mimeType: payload.mimeType?.trim() || undefined,
        extension: extractExtension(payload.name.trim()),
        status: "active",
        tags: Array.from(new Set(payload.tags.map((item) => item.trim()).filter((item) => item.length > 0))),
        isStarred: false,
        createdByUserId: req.user!.id,
        updatedByUserId: req.user!.id
      });
      res.status(201).json(toFileManagerEntry(created.toObject()));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid create file payload"));
        return;
      }
      if (error?.code === 11000) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "An active file with this name already exists"));
        return;
      }
      next(error);
    }
  }
);

router.patch(
  "/api/v1/file-manager/entries/:id",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isStrictObjectId(req.params.id)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid entry id");
      }
      const payload = updateEntrySchema.parse(req.body ?? {});
      const existing = await FileManagerEntryModel.findById(req.params.id).exec();
      if (!existing) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "File manager entry not found");
      }
      if (existing.status === "trashed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Trashed entries cannot be updated");
      }

      if (payload.name !== undefined) {
        existing.name = payload.name.trim();
        if (existing.kind === "file") {
          existing.extension = extractExtension(existing.name);
        }
      }
      if (payload.tags !== undefined) {
        existing.tags = Array.from(new Set(payload.tags.map((item) => item.trim()).filter((item) => item.length > 0)));
      }
      if (payload.isStarred !== undefined) {
        existing.isStarred = payload.isStarred;
      }
      if (payload.mimeType !== undefined && existing.kind === "file") {
        existing.mimeType = payload.mimeType.trim() || undefined;
      }
      existing.updatedByUserId = req.user!.id;

      await existing.save();
      res.json(toFileManagerEntry(existing.toObject()));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid file manager update payload"));
        return;
      }
      if (error?.code === 11000) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "An active entry with this name already exists"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/file-manager/entries/:id/move",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isStrictObjectId(req.params.id)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid entry id");
      }
      const payload = moveEntrySchema.parse(req.body ?? {});
      const targetParentId = parseNullableObjectId(payload.targetParentId, "targetParentId");
      const entry = await FileManagerEntryModel.findById(req.params.id).exec();
      if (!entry) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "File manager entry not found");
      }
      if (entry.status === "trashed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Trashed entries cannot be moved");
      }

      await ensureParentFolderExists(targetParentId);
      if (entry.kind === "folder") {
        await ensureMoveDoesNotCreateCycle(String(entry._id), targetParentId);
      }

      entry.parentId = targetParentId;
      entry.updatedByUserId = req.user!.id;
      await entry.save();

      res.json(toFileManagerEntry(entry.toObject()));
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
  "/api/v1/file-manager/entries/:id/transition",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      if (!isStrictObjectId(req.params.id)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid entry id");
      }
      const payload = transitionEntrySchema.parse(req.body ?? {});
      const entry = await FileManagerEntryModel.findById(req.params.id).exec();
      if (!entry) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "File manager entry not found");
      }

      if (entry.status === payload.to) {
        res.json(toFileManagerEntry(entry.toObject()));
        return;
      }
      if (payload.to === "active" && entry.parentId) {
        const parent = (await FileManagerEntryModel.findById(entry.parentId)
          .select({ kind: 1, status: 1 })
          .lean()
          .exec()) as
          | { kind: "folder" | "file"; status: "active" | "trashed" }
          | null;
        if (!parent || parent.kind !== "folder" || parent.status !== "active") {
          throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot restore entry to an inactive parent folder");
        }
      }

      entry.status = payload.to;
      entry.trashedAt = payload.to === "trashed" ? new Date() : undefined;
      entry.updatedByUserId = req.user!.id;
      await entry.save();

      res.json(toFileManagerEntry(entry.toObject()));
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid transition payload"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/file-manager/entries/:id",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.delete"),
  async (req, res, next) => {
    try {
      if (!isStrictObjectId(req.params.id)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid entry id");
      }
      const entry = await FileManagerEntryModel.findById(req.params.id).exec();
      if (!entry) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "File manager entry not found");
      }
      if (entry.status !== "trashed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only trashed entries can be deleted permanently");
      }

      if (entry.kind === "folder") {
        const childCount = await FileManagerEntryModel.countDocuments({ parentId: entry._id }).exec();
        if (childCount > 0) {
          throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Folder must be empty before permanent deletion");
        }
      }

      await FileManagerEntryModel.deleteOne({ _id: entry._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/file-manager/insights",
  ...moduleGuards("file-manager", "file-manager.read"),
  async (_req, res, next) => {
    try {
      const [totalFiles, totalFolders, trashedEntries, starredEntries, sizeAggregation] = await Promise.all([
        FileManagerEntryModel.countDocuments({ kind: "file", status: "active" }).exec(),
        FileManagerEntryModel.countDocuments({ kind: "folder", status: "active" }).exec(),
        FileManagerEntryModel.countDocuments({ status: "trashed" }).exec(),
        FileManagerEntryModel.countDocuments({ isStarred: true, status: "active" }).exec(),
        FileManagerEntryModel.aggregate([
          {
            $match: {
              kind: "file",
              status: "active"
            }
          },
          {
            $group: {
              _id: null,
              totalSizeBytes: {
                $sum: "$sizeBytes"
              }
            }
          }
        ]).exec()
      ]);

      res.json({
        counts: {
          totalFiles,
          totalFolders,
          trashedEntries,
          starredEntries,
          totalSizeBytes: sizeAggregation[0]?.totalSizeBytes ?? 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ── Upload (multipart) ──────────────────────────────────────────

router.post(
  "/api/v1/file-manager/upload",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.create"),
  upload.single("file"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "No file provided");
      }

      const detectedMime = await detectMimeFromFile(file.path);
      if (!mimeMatchesDetected(file.mimetype, detectedMime)) {
        fs.unlinkSync(file.path);
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "File content does not match declared type");
      }

      const quota = await checkQuota(req.user!.id, file.size);
      if (!quota.allowed) {
        fs.unlinkSync(file.path);
        throw new AppError(400, ERROR_CODES.BAD_REQUEST,
          `Storage quota exceeded (${Math.round(quota.usedBytes / 1024 / 1024)}MB / ${Math.round(quota.quotaBytes / 1024 / 1024)}MB)`
        );
      }

      const parentIdRaw = typeof req.body?.parentId === "string" ? req.body.parentId : undefined;
      const parentId = parseNullableObjectId(parentIdRaw, "parentId");
      if (parentId) await ensureParentFolderExists(parentId);

      const scanResult = await scanFile(file.path);
      if (scanResult === "infected") {
        fs.unlinkSync(file.path);
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "File rejected by virus scanner");
      }

      const storageKey = generateStorageKey(req.user!.id, file.originalname);
      const adapter = getStorageAdapter();
      const storagePath = await adapter.store(storageKey, file.path);

      const originalName = file.originalname;
      const created = await FileManagerEntryModel.create({
        name: originalName,
        kind: "file",
        parentId,
        sizeBytes: file.size,
        mimeType: file.mimetype,
        extension: extractExtension(originalName),
        storagePath,
        scanStatus: scanResult,
        status: "active",
        tags: [],
        isStarred: false,
        createdByUserId: req.user!.id,
        updatedByUserId: req.user!.id,
      });

      res.status(201).json(toFileManagerEntry(created.toObject()));
    } catch (error: unknown) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      if (typeof error === "object" && error !== null && (error as Record<string, unknown>).code === 11000) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "A file with this name already exists"));
        return;
      }
      next(error);
    }
  }
);

// ── Download (auth-protected) ───────────────────────────────────

router.get(
  "/api/v1/file-manager/files/:id/download",
  ...moduleGuards("file-manager", "file-manager.read"),
  async (req, res, next) => {
    try {
      if (!isStrictObjectId(req.params.id)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid entry id");
      }

      const entry = await FileManagerEntryModel.findById(req.params.id).lean().exec() as unknown as FileManagerDoc | null;
      if (!entry || entry.kind !== "file") {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "File not found");
      }
      if (entry.status === "trashed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot download trashed files");
      }
      if (!entry.storagePath) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "File has no stored content (metadata-only entry)");
      }

      const adapter = getStorageAdapter();

      // If S3, try signed URL redirect; otherwise stream through API
      const signedUrl = await adapter.getDownloadUrl(entry.storagePath, entry.name);
      if (signedUrl) {
        res.redirect(302, signedUrl);
        return;
      }

      const stream = await adapter.retrieve(entry.storagePath);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(entry.name)}"`);
      if (entry.mimeType) {
        res.setHeader("Content-Type", entry.mimeType);
      }
      if (typeof entry.sizeBytes === "number") {
        res.setHeader("Content-Length", String(entry.sizeBytes));
      }
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// ── Quota info ──────────────────────────────────────────────────

router.get(
  "/api/v1/file-manager/quota",
  ...moduleGuards("file-manager", "file-manager.read"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const usedBytes = await getUserStorageUsed(req.user!.id);
      const quotaBytes = env.FILE_QUOTA_BYTES;
      res.json({
        usedBytes,
        quotaBytes,
        usedPercent: Math.round((usedBytes / quotaBytes) * 100),
        remainingBytes: Math.max(0, quotaBytes - usedBytes),
      });
    } catch (error) {
      next(error);
    }
  }
);

export const fileManagerRoutes = router;
