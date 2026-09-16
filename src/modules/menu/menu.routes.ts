import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { ERROR_CODES } from "@admin-platform/shared-types";
import { requireRole } from "../../core/rbac/role.middleware";
import { requireRbacPermission } from "../../core/rbac/rbac-permission.middleware";
import type { ActionCode } from "../../core/rbac/rbac-permission.middleware";
import { menuService } from "./menu.service";

const router = Router();

const menuWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Sidebar editing is delegable.
 *
 * These routes shape the navigation, not who may reach what: a group here is a
 * heading, and hiding one revokes nothing. `requireRbacPermission` resolves
 * grants against MenuMaster rows, which live in a different collection and are
 * edited on the RBAC screens. Keeping sidebar tidy-ups behind the super admin
 * bought no safety and turned every reordering into a request.
 */
const MENU_MANAGEMENT = "/settings/menu-management";

const canEditMenus = (action: ActionCode) => [
  menuWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  requireRbacPermission(MENU_MANAGEMENT, action)
];

// ── Validation Schemas ─────────────────────────────────────────────

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  order: z.number().int().min(0).default(0),
  isLink: z.boolean().default(false),
  route: z.string().max(255).optional(),
  icon: z.string().max(100).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  order: z.number().int().min(0).optional(),
  isLink: z.boolean().optional(),
  route: z.string().max(255).optional(),
  icon: z.string().max(100).optional(),
});

const createItemSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  route: z.string().min(1).max(255),
  icon: z.string().max(100).default(""),
  parentId: z.string().nullable().optional(),
  order: z.number().int().min(0).default(0),
  isParent: z.boolean().default(false),
});

const updateItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  route: z.string().min(1).max(255).optional(),
  icon: z.string().max(100).optional(),
  parentId: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
  isParent: z.boolean().optional(),
});

const reorderSchema = z.object({
  order: z.number().int().min(0),
});

// ── Routes ─────────────────────────────────────────────────────────

// List all groups with nested menus (admin+)
router.get(
  "/api/v1/menus/groups",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const groups = await menuService.listGroupsWithMenus();
      res.json({ groups });
    } catch (error) {
      next(error);
    }
  }
);

// Create group
router.post(
  "/api/v1/menus/groups",
  ...canEditMenus("write"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createGroupSchema.parse(req.body ?? {});
      const group = await menuService.createGroup(payload, req.user!.id);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid menu group payload"));
        return;
      }
      next(error);
    }
  }
);

// Update group
router.put(
  "/api/v1/menus/groups/:id",
  ...canEditMenus("edit"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = updateGroupSchema.parse(req.body ?? {});
      const group = await menuService.updateGroup(req.params.id, payload, req.user!.id);
      if (!group) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu group not found"));
        return;
      }
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid menu group payload"));
        return;
      }
      next(error);
    }
  }
);

// Delete group
router.delete(
  "/api/v1/menus/groups/:id",
  ...canEditMenus("delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const deleted = await menuService.deleteGroup(req.params.id);
      if (!deleted) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu group not found"));
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);

// Create menu item
router.post(
  "/api/v1/menus/items",
  ...canEditMenus("write"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = createItemSchema.parse(req.body ?? {});
      const item = await menuService.createItem(payload, req.user!.id);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid menu item payload"));
        return;
      }
      next(error);
    }
  }
);

// Update menu item
router.put(
  "/api/v1/menus/items/:id",
  ...canEditMenus("edit"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = updateItemSchema.parse(req.body ?? {});
      const item = await menuService.updateItem(req.params.id, payload, req.user!.id);
      if (!item) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu item not found"));
        return;
      }
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid menu item payload"));
        return;
      }
      next(error);
    }
  }
);

// Delete menu item
router.delete(
  "/api/v1/menus/items/:id",
  ...canEditMenus("delete"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const deleted = await menuService.deleteItem(req.params.id);
      if (!deleted) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu item not found"));
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);

// Reorder menu item
router.patch(
  "/api/v1/menus/items/:id/reorder",
  ...canEditMenus("edit"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { order } = reorderSchema.parse(req.body ?? {});
      const updated = await menuService.reorderItem(req.params.id, order, req.user!.id);
      if (!updated) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu item not found"));
        return;
      }
      res.json({ updated: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid reorder payload"));
        return;
      }
      next(error);
    }
  }
);

// Reorder menu group
router.patch(
  "/api/v1/menus/groups/:id/reorder",
  ...canEditMenus("edit"),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { order } = reorderSchema.parse(req.body ?? {});
      const updated = await menuService.reorderGroup(req.params.id, order, req.user!.id);
      if (!updated) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu group not found"));
        return;
      }
      res.json({ updated: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid reorder payload"));
        return;
      }
      next(error);
    }
  }
);

export const menuRoutes = router;
