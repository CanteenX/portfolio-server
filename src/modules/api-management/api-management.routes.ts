import { ERROR_CODES } from "@admin-platform/shared-types";
import { createHash, randomBytes } from "crypto";
import { Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { env } from "../../config/env";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { ApiAccessKeyAuditEventModel, ApiAccessKeyModel } from "./api-management.models";

const router = Router();

const apiManagementWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const createKeySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  scopes: z.array(z.string().min(1).max(80)).max(32).default([]),
  expiresAt: z.string().datetime().optional()
});

const revokeKeySchema = z.object({
  reason: z.string().max(500).optional()
});

const regenerateKeySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  scopes: z.array(z.string().min(1).max(80)).max(32).optional(),
  expiresAt: z.string().datetime().optional()
});

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

function hashApiKey(plaintextKey: string): string {
  return createHash("sha256").update(`${env.API_KEY_HASH_SALT}:${plaintextKey}`).digest("hex");
}

function generatePlaintextApiKey(): string {
  const envLabel = env.NODE_ENV === "production" ? "live" : "test";
  return `apk_${envLabel}_${randomBytes(24).toString("base64url")}`;
}

function toPublicKey(document: any) {
  return {
    _id: String(document._id),
    name: document.name,
    description: document.description ?? "",
    scopes: Array.isArray(document.scopes) ? document.scopes : [],
    status: document.status,
    keyPrefix: document.keyPrefix,
    keyLast4: document.keyLast4,
    createdByUserId: document.createdByUserId,
    revokedAt: document.revokedAt ?? null,
    revokedByUserId: document.revokedByUserId ?? null,
    lastUsedAt: document.lastUsedAt ?? null,
    expiresAt: document.expiresAt ?? null,
    rotatedFromKeyId: document.rotatedFromKeyId ? String(document.rotatedFromKeyId) : null,
    createdAt: document.createdAt ?? null,
    updatedAt: document.updatedAt ?? null
  };
}

async function createKeyRecord(input: {
  name: string;
  description?: string;
  scopes: string[];
  expiresAt?: Date;
  createdByUserId: string;
  rotatedFromKeyId?: mongoose.Types.ObjectId;
  session?: mongoose.ClientSession;
}) {
  const plaintextKey = generatePlaintextApiKey();
  const keyHash = hashApiKey(plaintextKey);
  const created = await ApiAccessKeyModel.create(
    [
      {
        name: input.name,
        description: input.description ?? "",
        scopes: input.scopes,
        status: "active",
        keyPrefix: plaintextKey.slice(0, 12),
        keyLast4: plaintextKey.slice(-4),
        keyHash,
        createdByUserId: input.createdByUserId,
        expiresAt: input.expiresAt,
        rotatedFromKeyId: input.rotatedFromKeyId
      }
    ],
    input.session ? { session: input.session } : undefined
  );

  return {
    plaintextKey,
    key: created[0]
  };
}

router.get("/api/v1/api-management/keys", ...moduleGuards("api-management", "api-management.read"), async (_req, res, next) => {
  try {
    const keys = await ApiAccessKeyModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items: keys.map((item) => toPublicKey(item)) });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/api/v1/api-management/keys",
  apiManagementWriteRateLimiter,
  ...moduleGuards("api-management", "api-management.create"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createKeySchema.parse(req.body ?? {});
      const { plaintextKey, key } = await createKeyRecord({
        name: payload.name,
        description: payload.description,
        scopes: payload.scopes,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
        createdByUserId: req.user!.id
      });

      await ApiAccessKeyAuditEventModel.create({
        keyId: key._id,
        action: "issued",
        actorUserId: req.user!.id,
        metadata: {
          scopes: payload.scopes
        }
      });

      res.status(201).json({
        key: toPublicKey(key.toObject()),
        plaintextKey
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid API key payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/api-management/keys/:id/revoke",
  apiManagementWriteRateLimiter,
  ...moduleGuards("api-management", "api-management.update"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = revokeKeySchema.parse(req.body ?? {});
      const key = await ApiAccessKeyModel.findById(req.params.id).exec();
      if (!key) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "API key not found");
      }

      if (key.status !== "revoked") {
        key.status = "revoked";
        key.revokedAt = new Date();
        key.revokedByUserId = req.user!.id;
        await key.save();

        await ApiAccessKeyAuditEventModel.create({
          keyId: key._id,
          action: "revoked",
          actorUserId: req.user!.id,
          metadata: {
            reason: payload.reason ?? ""
          }
        });
      }

      res.json(toPublicKey(key.toObject()));
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid revoke payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/api-management/keys/:id/regenerate",
  apiManagementWriteRateLimiter,
  ...moduleGuards("api-management", "api-management.create"),
  async (req: AuthenticatedRequest, res, next) => {
    const session = await mongoose.startSession();
    try {
      ensureValidObjectId(req.params.id);
      const payload = regenerateKeySchema.parse(req.body ?? {});

      let createdPublicKey: Record<string, unknown> | null = null;
      let plaintextKey = "";

      await session.withTransaction(async () => {
        const currentKey = await ApiAccessKeyModel.findById(req.params.id).session(session).exec();
        if (!currentKey) {
          throw new AppError(404, ERROR_CODES.NOT_FOUND, "API key not found");
        }
        if (currentKey.status !== "active") {
          throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only active keys can be regenerated");
        }

        currentKey.status = "revoked";
        currentKey.revokedAt = new Date();
        currentKey.revokedByUserId = req.user!.id;
        await currentKey.save({ session });

        const created = await createKeyRecord({
          name: payload.name ?? currentKey.name,
          description: payload.description ?? currentKey.description,
          scopes: payload.scopes ?? currentKey.scopes,
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : currentKey.expiresAt,
          createdByUserId: req.user!.id,
          rotatedFromKeyId: currentKey._id,
          session
        });

        plaintextKey = created.plaintextKey;
        createdPublicKey = toPublicKey(created.key.toObject());

        await ApiAccessKeyAuditEventModel.create(
          [
            {
              keyId: currentKey._id,
              action: "revoked",
              actorUserId: req.user!.id,
              metadata: {
                reason: "regenerated",
                regeneratedToKeyId: created.key._id.toString()
              }
            },
            {
              keyId: created.key._id,
              action: "regenerated",
              actorUserId: req.user!.id,
              metadata: {
                regeneratedFromKeyId: currentKey._id.toString()
              }
            }
          ],
          { session }
        );
      });

      res.status(201).json({
        key: createdPublicKey,
        plaintextKey
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid regenerate payload"));
        return;
      }
      next(error);
    } finally {
      await session.endSession();
    }
  }
);

router.get(
  "/api/v1/api-management/keys/:id/events",
  ...moduleGuards("api-management", "api-management.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const key = await ApiAccessKeyModel.findById(req.params.id).lean().exec();
      if (!key) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "API key not found");
      }
      const events = await ApiAccessKeyAuditEventModel.find({ keyId: req.params.id })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
        .exec();

      res.json({
        items: events.map((event) => ({
          _id: String(event._id),
          keyId: String(event.keyId),
          action: event.action,
          actorUserId: event.actorUserId,
          metadata: event.metadata ?? {},
          createdAt: event.createdAt ?? null
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/api/v1/api-management/insights",
  ...moduleGuards("api-management", "api-management.read"),
  async (_req, res, next) => {
    try {
      const now = new Date();
      const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const [totalKeys, activeKeys, revokedKeys, expiringSoon] = await Promise.all([
        ApiAccessKeyModel.countDocuments().exec(),
        ApiAccessKeyModel.countDocuments({ status: "active" }).exec(),
        ApiAccessKeyModel.countDocuments({ status: "revoked" }).exec(),
        ApiAccessKeyModel.countDocuments({
          status: "active",
          expiresAt: {
            $gte: now,
            $lte: next30Days
          }
        }).exec()
      ]);

      res.json({
        counts: {
          totalKeys,
          activeKeys,
          revokedKeys,
          expiringSoon
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export const apiManagementRoutes = router;
