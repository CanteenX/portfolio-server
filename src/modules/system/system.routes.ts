import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  MODULE_DEFINITIONS,
  MODULE_KEYS,
  PERMISSION_ACTIONS,
} from "@admin-platform/shared-types";
import type { ModuleKey } from "@admin-platform/shared-types";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { auditLogService } from "../../core/audit/audit-log.service";
import { featureConfigService } from "../../core/feature-flags/feature-config.service";
import { uiFeatureFlagsService } from "../../core/feature-flags/ui-feature-flags.service";
import { UI_FEATURE_FLAG_KEYS } from "@admin-platform/shared-types";
import { requireRole } from "../../core/rbac/role.middleware";
import { getPermissionsByRole } from "../../core/rbac/permissions";
import { ERROR_CODES } from "@admin-platform/shared-types";
import { env } from "../../config/env";
import { PAYMENT_PROVIDER_KEYS } from "../../core/payments/payment.types";
import { SupportTicketModel } from "../support-tickets/support-tickets.models";
import { TaskModel } from "../tasks/tasks.models";
import { CalendarEventModel } from "../calendar/calendar.models";
import { CrmDealModel } from "../crm/crm.models";
import { JobPostingModel, JobApplicationModel } from "../job/job.models";
import { systemSettingsService } from "./system-settings.service";
import { brandingService } from "./branding.service";
import { customRoleService } from "../../core/rbac/custom-role.service";
import { menuService } from "../menu/menu.service";
import { quickLinksService } from "./quick-links.service";
import { notificationService } from "./notification.service";
import { UserModel } from "../../core/auth/user.model";
import { CrmContactModel } from "../crm/crm.models";
import { TodoItemModel } from "../todo/todo.models";
import { ProjectModel } from "../projects/projects.models";

const router = Router();

const systemWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const featureConfigSchema = z.object({
  enabledModules: z.array(z.enum(MODULE_KEYS)),
});

router.get(
  "/api/v1/system/session-bootstrap",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const features = await featureConfigService.getEnabledFeatures();
      const role = req.user!.role;
      let permissions = getPermissionsByRole(role);

      // If admin has a custom role, restrict permissions to that role's set
      let customRole: { id: string; name: string } | undefined;
      if (role === "admin") {
        const userDoc = (await UserModel.findById(req.user!.id)
          .lean()
          .exec()) as unknown as { customRoleId?: string } | null;
        if (userDoc?.customRoleId) {
          const crPerms = await customRoleService.getPermissionsForRole(
            userDoc.customRoleId,
          );
          if (crPerms) {
            permissions = crPerms;
            const crDetails = await customRoleService.getById(
              userDoc.customRoleId,
            );
            if (crDetails) {
              customRole = { id: crDetails.id, name: crDetails.name };
            }
          }
        }
      }

      const [uiFeatureFlags, menuGroups] = await Promise.all([
        uiFeatureFlagsService.getFlags(),
        menuService.listGroupsWithMenus(),
      ]);

      // For admin with custom role, include structured permissions
      let currentRolePermissions;
      if (role === "admin" && customRole) {
        const userDoc2 = (await UserModel.findById(req.user!.id)
          .lean()
          .exec()) as unknown as { customRoleId?: string } | null;
        if (userDoc2?.customRoleId) {
          currentRolePermissions =
            await customRoleService.getStructuredPermissions(
              userDoc2.customRoleId,
            );
        }
      }

      res.json({
        user: req.user,
        permissions,
        features,
        uiFeatureFlags,
        menuGroups,
        ...(currentRolePermissions ? { currentRolePermissions } : {}),
        moduleCatalog: MODULE_DEFINITIONS,
        ...(customRole ? { customRole } : {}),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/api/v1/system/module-catalog",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  (_req, res) => {
    res.json({
      modules: MODULE_DEFINITIONS,
    });
  },
);

router.get(
  "/api/v1/system/feature-config",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const features = await featureConfigService.getEnabledFeatures();
      res.json({ features });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/api/v1/system/feature-config",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { enabledModules } = featureConfigSchema.parse(req.body ?? {}) as {
        enabledModules: ModuleKey[];
      };
      const previousFeatures = await featureConfigService.getEnabledFeatures();
      await featureConfigService.upsertEnabledModules(
        enabledModules,
        req.user!.id,
      );
      const features = await featureConfigService.getEnabledFeatures();

      await auditLogService.log({
        action: "feature_config.update",
        entity: "feature_config",
        userId: req.user!.id,
        userEmail: req.user!.email,
        before: previousFeatures,
        after: features,
      });

      res.json({ features });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid feature config payload",
          ),
        );
        return;
      }
      next(error);
    }
  },
);

// ── UI Feature Flags (admin+ read, super_admin write) ────────────

const uiFeatureFlagsSchema = z.object({
  flags: z.record(
    z.enum(UI_FEATURE_FLAG_KEYS as unknown as [string, ...string[]]),
    z.boolean(),
  ),
});

router.get(
  "/api/v1/system/ui-feature-flags",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const flags = await uiFeatureFlagsService.getFlags();
      res.json(flags);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/api/v1/system/ui-feature-flags",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { flags } = uiFeatureFlagsSchema.parse(req.body ?? {});
      const previous = await uiFeatureFlagsService.getFlags();
      const updated = await uiFeatureFlagsService.upsertFlags(
        flags as Record<string, boolean>,
        req.user!.id,
      );

      await auditLogService.log({
        action: "ui_feature_flags.update",
        entity: "ui_feature_flags",
        userId: req.user!.id,
        userEmail: req.user!.email,
        before: previous as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid UI feature flags payload",
          ),
        );
        return;
      }
      next(error);
    }
  },
);

// ── Payment settings (super_admin only) ──────────────────────────

router.get(
  "/api/v1/system/payment-settings",
  authenticateJwt,
  requireRole(["super_admin"]),
  (_req, res) => {
    const providers = PAYMENT_PROVIDER_KEYS.map((id) => {
      const configured =
        id === "stripe"
          ? Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
          : id === "paypal"
            ? Boolean(
                env.PAYPAL_CLIENT_ID &&
                env.PAYPAL_CLIENT_SECRET &&
                env.PAYPAL_WEBHOOK_ID,
              )
            : Boolean(
                env.RAZORPAY_KEY_ID &&
                env.RAZORPAY_KEY_SECRET &&
                env.RAZORPAY_WEBHOOK_SECRET,
              );

      return {
        id,
        displayName: id.charAt(0).toUpperCase() + id.slice(1),
        configured,
        webhookPath: `/api/v1/payments/webhooks/${id}`,
      };
    });

    const allowedRedirectOrigins = env.PAYMENT_ALLOWED_REDIRECT_ORIGINS.split(
      ",",
    )
      .map((o) => o.trim())
      .filter(Boolean);

    res.json({
      providers,
      defaultSuccessUrl: env.PAYMENT_DEFAULT_SUCCESS_URL,
      defaultCancelUrl: env.PAYMENT_DEFAULT_CANCEL_URL,
      allowedRedirectOrigins,
      paypalMode: env.PAYPAL_MODE,
    });
  },
);

// ── Dashboard KPIs (admin+) ─────────────────────────────────────

router.get(
  "/api/v1/system/dashboard-kpis",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const todayEnd = new Date(todayStart.getTime() + 86_400_000);

      const [
        openTickets,
        activeTasks,
        todayEvents,
        openDeals,
        pipelineValue,
        openJobs,
        pendingApplications,
      ] = await Promise.all([
        SupportTicketModel.countDocuments({
          status: { $in: ["open", "in_progress", "pending_customer"] },
        }).exec(),
        TaskModel.countDocuments({
          status: { $in: ["todo", "in_progress", "review"] },
        }).exec(),
        CalendarEventModel.countDocuments({
          status: "scheduled",
          startDate: { $gte: todayStart, $lt: todayEnd },
        }).exec(),
        CrmDealModel.countDocuments({ status: "open" }).exec(),
        CrmDealModel.aggregate([
          { $match: { status: "open" } },
          { $group: { _id: null, total: { $sum: "$amountValue" } } },
        ]).exec(),
        JobPostingModel.countDocuments({ status: "open" }).exec(),
        JobApplicationModel.countDocuments({ status: "submitted" }).exec(),
      ]);

      res.json({
        openTickets,
        activeTasks,
        todayEvents,
        openDeals,
        pipelineValue: pipelineValue[0]?.total ?? 0,
        openJobs,
        pendingApplications,
      });
    } catch (error) {
      next(error);
    }
  },
);

// ── Audit log (super_admin only) ────────────────────────────────

router.get(
  "/api/v1/system/audit-log",
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const entity =
        typeof req.query.entity === "string" ? req.query.entity : undefined;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const result = await auditLogService.getRecent({ entity, limit, offset });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// ── System settings (super_admin) ───────────────────────────────

const systemSettingsSchema = z.object({
  timezone: z.string().min(1).max(60),
  defaultCurrency: z.string().min(3).max(3),
  locale: z.string().min(2).max(20),
});

router.get(
  "/api/v1/system/settings",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const settings = await systemSettingsService.get();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/api/v1/system/settings",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = systemSettingsSchema.parse(req.body ?? {});
      const previous = await systemSettingsService.get();
      const updated = await systemSettingsService.upsert(payload, req.user!.id);

      await auditLogService.log({
        action: "system_settings.update",
        entity: "system_settings",
        userId: req.user!.id,
        userEmail: req.user!.email,
        before: previous as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid system settings payload",
          ),
        );
        return;
      }
      next(error);
    }
  },
);

// ── Custom roles / sub-roles (super_admin only) ───────────────

const customRoleSchema = z.object({
  name: z.string().min(1).max(60),
  permissions: z.array(z.string().min(1)),
});

router.get(
  "/api/v1/system/custom-roles",
  authenticateJwt,
  requireRole(["super_admin"]),
  async (_req, res, next) => {
    try {
      const roles = await customRoleService.list();
      res.json({ roles });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/api/v1/system/custom-roles",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = customRoleSchema.parse(req.body ?? {});
      const role = await customRoleService.create(payload, req.user!.id);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid custom role payload",
          ),
        );
        return;
      }
      next(error);
    }
  },
);

router.put(
  "/api/v1/system/custom-roles/:id",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = customRoleSchema.parse(req.body ?? {});
      const role = await customRoleService.update(
        req.params.id,
        payload,
        req.user!.id,
      );
      if (!role) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"));
        return;
      }
      res.json(role);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid custom role payload",
          ),
        );
        return;
      }
      next(error);
    }
  },
);

router.delete(
  "/api/v1/system/custom-roles/:id",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const deleted = await customRoleService.remove(req.params.id);
      if (!deleted) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"));
        return;
      }
      // Unassign from any users who had this role
      await UserModel.updateMany(
        { customRoleId: req.params.id },
        { $unset: { customRoleId: 1 } },
      );
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  },
);

// ── Structured permissions per role ─────────────────────────────

const structuredPermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      menuId: z.string().optional(),
      menuGroupId: z.string().optional(),
      read: z.boolean(),
      create: z.boolean(),
      update: z.boolean(),
      delete: z.boolean(),
      export: z.boolean(),
    }),
  ),
});

router.get(
  "/api/v1/system/custom-roles/:id/permissions",
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const perms = await customRoleService.getStructuredPermissions(
        req.params.id,
      );
      if (perms === null) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"));
        return;
      }
      res.json({ permissions: perms });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/api/v1/system/custom-roles/:id/permissions",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { permissions } = structuredPermissionsSchema.parse(req.body ?? {});
      const previous = await customRoleService.getStructuredPermissions(
        req.params.id,
      );
      if (previous === null) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"));
        return;
      }

      const updated = await customRoleService.updateStructuredPermissions(
        req.params.id,
        permissions,
        req.user!.id,
      );

      if (!updated) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"));
        return;
      }

      await auditLogService.log({
        action: "custom_role.permissions_update",
        entity: "custom_role",
        userId: req.user!.id,
        userEmail: req.user!.email,
        before: {
          roleId: req.params.id,
          permissions: previous,
        } as unknown as Record<string, unknown>,
        after: {
          roleId: req.params.id,
          permissions: updated.structuredPermissions,
        } as unknown as Record<string, unknown>,
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid permissions payload",
          ),
        );
        return;
      }
      next(error);
    }
  },
);

// ── User management (super_admin only) ────────────────────────

const createUserSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(128),
  role: z.enum(["super_admin", "admin"]),
});

const updateUserSchema = z.object({
  email: z.string().email().max(200).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.enum(["super_admin", "admin"]).optional(),
});

router.get(
  "/api/v1/system/users",
  authenticateJwt,
  requireRole(["super_admin"]),
  async (_req, res, next) => {
    try {
      const users = await UserModel.find({}, { passwordHash: 0 }).lean().exec();
      res.json({ users });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/api/v1/system/users",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { email, password, role } = createUserSchema.parse(req.body ?? {});
      const existing = await UserModel.findOne({ email }).exec();
      if (existing) {
        next(
          new AppError(
            409,
            ERROR_CODES.BAD_REQUEST,
            "A user with this email already exists",
          ),
        );
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await UserModel.create({ email, passwordHash, role });

      await auditLogService.log({
        action: "CREATE",
        entity: "user",
        entityId: String(user._id),
        userId: req.user!.id,
        userEmail: req.user!.email,
        after: { email, role } as unknown as Record<string, unknown>,
      });

      const { passwordHash: _, ...safe } = user.toObject();
      res.status(201).json(safe);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid user payload"),
        );
        return;
      }
      next(error);
    }
  },
);

router.put(
  "/api/v1/system/users/:userId",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = updateUserSchema.parse(req.body ?? {});
      const update: Record<string, unknown> = {};
      if (payload.email) update.email = payload.email;
      if (payload.role) update.role = payload.role;
      if (payload.password)
        update.passwordHash = await bcrypt.hash(payload.password, 10);

      if (Object.keys(update).length === 0) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "No fields to update"));
        return;
      }

      const user = await UserModel.findByIdAndUpdate(
        req.params.userId,
        { $set: update },
        { new: true, projection: { passwordHash: 0 } },
      )
        .lean()
        .exec();

      if (!user) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "User not found"));
        return;
      }

      await auditLogService.log({
        action: "UPDATE",
        entity: "user",
        entityId: req.params.userId,
        userId: req.user!.id,
        userEmail: req.user!.email,
        after: {
          email: payload.email,
          role: payload.role,
        } as unknown as Record<string, unknown>,
      });

      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid user payload"),
        );
        return;
      }
      next(error);
    }
  },
);

router.delete(
  "/api/v1/system/users/:userId",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      // Prevent self-deletion
      if (req.params.userId === req.user!.id) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Cannot delete your own account",
          ),
        );
        return;
      }

      const user = await UserModel.findByIdAndDelete(req.params.userId)
        .lean()
        .exec();
      if (!user) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "User not found"));
        return;
      }

      await auditLogService.log({
        action: "DELETE",
        entity: "user",
        entityId: req.params.userId,
        userId: req.user!.id,
        userEmail: req.user!.email,
      });

      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/api/v1/system/users/:userId/custom-role",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { customRoleId } = z
        .object({
          customRoleId: z.string().min(1).nullable(),
        })
        .parse(req.body ?? {});

      if (customRoleId) {
        const role = await customRoleService.getById(customRoleId);
        if (!role) {
          next(
            new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"),
          );
          return;
        }
      }

      const result = await UserModel.updateOne(
        { _id: req.params.userId },
        customRoleId
          ? { $set: { customRoleId } }
          : { $unset: { customRoleId: 1 } },
      );

      if (result.matchedCount === 0) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "User not found"));
        return;
      }

      res.json({ updated: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid payload"));
        return;
      }
      next(error);
    }
  },
);

// ── Quick Links (admin+ read, super_admin write) ───────────────

const quickLinkSchema2 = z.object({
  name: z.string().min(1).max(60),
  url: z.string().min(1).max(2048),
  iconUrl: z.string().max(2048).optional(),
  order: z.number().int().min(0).default(0),
});

router.get(
  "/api/v1/system/quick-links",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const links = await quickLinksService.list();
      res.json({ links });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/api/v1/system/quick-links",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = quickLinkSchema2.parse(req.body ?? {});
      const link = await quickLinksService.create(payload, req.user!.id);
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid quick link payload",
          ),
        );
        return;
      }
      next(error);
    }
  },
);

router.put(
  "/api/v1/system/quick-links/:id",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = quickLinkSchema2.parse(req.body ?? {});
      const link = await quickLinksService.update(
        req.params.id,
        payload,
        req.user!.id,
      );
      if (!link) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Quick link not found"));
        return;
      }
      res.json(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid quick link payload",
          ),
        );
        return;
      }
      next(error);
    }
  },
);

router.delete(
  "/api/v1/system/quick-links/:id",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const deleted = await quickLinksService.remove(req.params.id);
      if (!deleted) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Quick link not found"));
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  },
);

// ── Branding (admin+ read, super_admin write) ─────────────────

const brandingSchema = z.object({
  companyName: z.string().min(1).max(100),
  logoUrl: z.string().max(2048).default(""),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color (#RRGGBB)"),
});

router.get(
  "/api/v1/system/branding",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const branding = await brandingService.get();
      res.json(branding);
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/api/v1/system/branding",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = brandingSchema.parse(req.body ?? {});
      const previous = await brandingService.get();
      const updated = await brandingService.upsert(payload, req.user!.id);

      await auditLogService.log({
        action: "branding.update",
        entity: "branding",
        userId: req.user!.id,
        userEmail: req.user!.email,
        before: previous as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid branding payload",
          ),
        );
        return;
      }
      next(error);
    }
  },
);

// ── Global search (admin+) ─────────────────────────────────────

const MODEL_MAP: Record<
  string,
  { model: mongoose.Model<unknown>; searchFields: string[] }
> = {
  "support-tickets": {
    model: SupportTicketModel as mongoose.Model<unknown>,
    searchFields: ["subject", "requesterName", "requesterEmail"],
  },
  tasks: {
    model: TaskModel as mongoose.Model<unknown>,
    searchFields: ["title"],
  },
  projects: {
    model: ProjectModel as mongoose.Model<unknown>,
    searchFields: ["name"],
  },
  crm: {
    model: CrmContactModel as mongoose.Model<unknown>,
    searchFields: ["displayName", "primaryEmail", "companyName"],
  },
  job: {
    model: JobPostingModel as mongoose.Model<unknown>,
    searchFields: ["title", "department"],
  },
};

router.get(
  "/api/v1/system/search",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (q.length < 2) {
        res.json({ results: [] });
        return;
      }

      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const limit = 5;

      const searches = Object.entries(MODEL_MAP).map(
        async ([module, { model, searchFields }]) => {
          const orClauses = searchFields.map((field) => ({ [field]: regex }));
          const items = await model
            .find({ $or: orClauses })
            .limit(limit)
            .lean()
            .exec();
          return items.map((item: Record<string, unknown>) => ({
            module,
            id: String(item._id),
            label: String(item[searchFields[0]] ?? ""),
          }));
        },
      );

      const groups = await Promise.all(searches);
      const results = groups.flat();

      res.json({ results });
    } catch (error) {
      next(error);
    }
  },
);

// ── CSV export (admin+) ────────────────────────────────────────

router.get(
  "/api/v1/system/export/:module",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const moduleName = req.params.module;
      const entry = MODEL_MAP[moduleName];
      if (!entry) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            `Unknown module: ${moduleName}`,
          ),
        );
        return;
      }

      const maxRows = env.EXPORT_MAX_ROWS;
      const items = (await entry.model
        .find({})
        .limit(maxRows + 1)
        .lean()
        .exec()) as Record<string, unknown>[];
      const truncated = items.length > maxRows;
      const exportItems = truncated ? items.slice(0, maxRows) : items;

      if (exportItems.length === 0) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${moduleName}-export.csv"`,
        );
        res.send("");
        return;
      }

      const headers = Object.keys(exportItems[0]).filter((k) => k !== "__v");
      const escapeCell = (val: unknown): string => {
        const str = val instanceof Date ? val.toISOString() : String(val ?? "");
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      };

      const rows = [
        headers.join(","),
        ...exportItems.map((item) =>
          headers.map((h) => escapeCell(item[h])).join(","),
        ),
      ];

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${moduleName}-export.csv"`,
      );
      if (truncated) {
        res.setHeader("X-Export-Truncated", "true");
        res.setHeader("X-Export-Max-Rows", String(maxRows));
      }
      res.send(rows.join("\n"));
    } catch (error) {
      next(error);
    }
  },
);

// ── Notifications (authenticated user) ─────────────────────────

router.get(
  "/api/v1/system/notifications",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const result = await notificationService.list(
        req.user!.id,
        limit,
        offset,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/api/v1/system/notifications/unread-count",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const count = await notificationService.unreadCount(req.user!.id);
      res.json({ unreadCount: count });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/api/v1/system/notifications/:id/read",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const found = await notificationService.markRead(
        req.params.id,
        req.user!.id,
      );
      if (!found) {
        next(
          new AppError(404, ERROR_CODES.NOT_FOUND, "Notification not found"),
        );
        return;
      }
      res.json({ read: true });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/api/v1/system/notifications/mark-all-read",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const count = await notificationService.markAllRead(req.user!.id);
      res.json({ marked: count });
    } catch (error) {
      next(error);
    }
  },
);

// ── GDPR data export (authenticated user) ─────────────────────

router.get(
  "/api/v1/system/gdpr-export",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const userEmail = req.user!.email;

      let userRecord: Record<string, unknown> | null = null;
      try {
        userRecord = (await UserModel.findById(userId).lean().exec()) as Record<
          string,
          unknown
        > | null;
      } catch {
        // userId may not be a valid ObjectId (e.g. in test environments)
      }

      const [tickets, tasks, events, todos, projects, contacts, deals] =
        await Promise.all([
          SupportTicketModel.find({ requesterEmail: userEmail }).lean().exec(),
          TaskModel.find({ assigneeUserId: userId }).lean().exec(),
          CalendarEventModel.find({ createdByUserId: userId }).lean().exec(),
          TodoItemModel.find({ ownerUserId: userId }).lean().exec(),
          ProjectModel.find({ ownerUserId: userId }).lean().exec(),
          CrmContactModel.find({ primaryEmail: userEmail }).lean().exec(),
          CrmDealModel.find({ ownerUserId: userId }).lean().exec(),
        ]);

      // Strip password hash from user record
      const sanitizedUser = userRecord
        ? { ...userRecord, passwordHash: undefined }
        : null;

      const bundle = {
        exportedAt: new Date().toISOString(),
        user: sanitizedUser,
        supportTickets: tickets,
        tasks,
        calendarEvents: events,
        todoItems: todos,
        projects,
        crmContacts: contacts,
        crmDeals: deals,
      };

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="gdpr-export-${userId}.json"`,
      );
      res.json(bundle);
    } catch (error) {
      next(error);
    }
  },
);

// ── CSV import (super_admin only) ─────────────────────────────

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

router.post(
  "/api/v1/system/import/:module",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const moduleName = req.params.module;
      const entry = MODEL_MAP[moduleName];
      if (!entry) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            `Unknown module: ${moduleName}`,
          ),
        );
        return;
      }

      const csvText = typeof req.body?.csv === "string" ? req.body.csv : "";
      if (!csvText.trim()) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Missing csv field in request body",
          ),
        );
        return;
      }

      const rows = parseCsv(csvText);
      if (rows.length === 0) {
        res.json({ imported: 0, errors: [] });
        return;
      }

      const maxImportRows = env.IMPORT_MAX_ROWS;
      if (rows.length > maxImportRows) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            `Import exceeds maximum of ${maxImportRows} rows`,
          ),
        );
        return;
      }

      // Filter out _id and __v — let MongoDB generate new IDs
      const sanitized = rows.map((row) => {
        const clean: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          if (key !== "_id" && key !== "__v") {
            clean[key] = value;
          }
        }
        return clean;
      });

      const errors: Array<{ row: number; message: string }> = [];
      let imported = 0;

      for (let i = 0; i < sanitized.length; i++) {
        try {
          await entry.model.create(sanitized[i]);
          imported++;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          errors.push({ row: i + 1, message });
        }
      }

      res.json({ imported, errors });
    } catch (error) {
      next(error);
    }
  },
);

export const systemRoutes = router;
