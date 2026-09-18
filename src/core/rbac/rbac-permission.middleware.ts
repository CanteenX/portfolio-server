import { ERROR_CODES } from "@admin-platform/shared-types";
import type { NextFunction, Response } from "express";
import mongoose from "mongoose";
import { env } from "../../config/env";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { AppError } from "../errors/app-error";
import { logger } from "../logging/logger";
import { ActionTypeModel } from "../../modules/rbac/action-type.model";
import { EmployeeModel } from "../../modules/rbac/employee.model";
import { MenuMasterModel } from "../../modules/rbac/menu-master.model";
import { RoleMasterModel } from "../../modules/rbac/role-master.model";

/**
 * Menu-driven RBAC enforcement: user -> employee -> role -> permissions[menuId + actionTypeId].
 *
 * Menus and action types are data, not code, so a new screen is granted by
 * adding rows rather than by editing a route list. That is the whole point of
 * the design and the reason the lookup is by `menuUrl` string rather than by id.
 */

/** The action vocabulary. Mirrors the six columns of the role permission matrix. */
export const ACTION_CODES = ["read", "write", "edit", "delete", "print", "mail"] as const;
export type ActionCode = (typeof ACTION_CODES)[number];

// ── Lookup cache ──────────────────────────────────────────────────────────────

/**
 * menuUrl -> menuId and actionCode -> actionTypeId, cached in-process.
 *
 * These two tables change only when an admin edits them in the RBAC screens,
 * while the guarded routes read them on every request. Without the cache each
 * guarded call costs four round-trips; with it, two.
 *
 * The TTL is deliberately short. This process is one of N serverless instances,
 * so a cache entry cannot be invalidated across the fleet — expiry is the only
 * mechanism available, and a minute is the longest an admin should wait for a
 * newly created menu to start resolving.
 *
 * Grants themselves are NEVER cached: revoking a role must take effect on the
 * next request, not up to a minute later.
 */
const LOOKUP_TTL_MS = 60_000;

type CacheEntry = { id: string | null; expiresAt: number };
const menuIdCache = new Map<string, CacheEntry>();
const actionIdCache = new Map<string, CacheEntry>();

function readCache(cache: Map<string, CacheEntry>, key: string): string | null | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.id;
}

function writeCache(cache: Map<string, CacheEntry>, key: string, id: string | null): void {
  cache.set(key, { id, expiresAt: Date.now() + LOOKUP_TTL_MS });
}

/** Drops the cached lookups. Call after any write to MenuMaster or ActionType. */
export function invalidateRbacLookups(): void {
  menuIdCache.clear();
  actionIdCache.clear();
}

async function resolveMenuId(menuUrl: string): Promise<string | null> {
  const cached = readCache(menuIdCache, menuUrl);
  if (cached !== undefined) return cached;

  const menu = await MenuMasterModel.findOne({
    clientCode: env.CLIENT_CODE,
    menuUrl,
    isActive: true
  })
    .select("_id")
    .lean()
    .exec();

  const id = menu ? String((menu as { _id: mongoose.Types.ObjectId })._id) : null;
  writeCache(menuIdCache, menuUrl, id);
  return id;
}

async function resolveActionTypeId(actionCode: string): Promise<string | null> {
  const cached = readCache(actionIdCache, actionCode);
  if (cached !== undefined) return cached;

  const action = await ActionTypeModel.findOne({
    clientCode: env.CLIENT_CODE,
    actionCode,
    isActive: true
  })
    .select("_id")
    .lean()
    .exec();

  const id = action ? String((action as { _id: mongoose.Types.ObjectId })._id) : null;
  writeCache(actionIdCache, actionCode, id);
  return id;
}

// ── Grant lookup ──────────────────────────────────────────────────────────────

type GrantedRole = {
  roleId: string;
  roleName: string;
  permissions: { menuId: string; actionTypeId: string; granted: boolean }[];
};

/**
 * Resolves the caller's role and its grants, or null when they have no employee
 * record or no role assigned. Never cached — see the TTL note above.
 */
async function loadRoleFor(userId: string): Promise<GrantedRole | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;

  const employee = (await EmployeeModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true
  })
    .select("roleId")
    .lean()
    .exec()) as { roleId?: mongoose.Types.ObjectId | null } | null;

  if (!employee?.roleId) return null;

  const role = (await RoleMasterModel.findOne({ _id: employee.roleId, isActive: true })
    .select("roleName permissions")
    .lean()
    .exec()) as
    | {
        _id: mongoose.Types.ObjectId;
        roleName: string;
        permissions: { menuId: string; actionTypeId: string; granted: boolean }[];
      }
    | null;

  if (!role) return null;

  return {
    roleId: String(role._id),
    roleName: role.roleName,
    permissions: role.permissions ?? []
  };
}

/**
 * The two negative answers are kept DISTINCT rather than collapsed to a boolean,
 * because they mean completely different things operationally: `menuFound:
 * false` is "the seed has not been run", an ops problem, while `allowed: false`
 * is "this role was not granted it", a permissions problem. Collapsing them is
 * how a missing seed row gets diagnosed for an hour as a permissions bug.
 */
export type PermissionAnswer = {
  menuFound: boolean;
  actionFound: boolean;
  /**
   * False when the caller has no employee record or no role on it. Kept apart
   * from `allowed` for the same reason as the two above: "nobody gave you a
   * role" is fixed by an admin assigning one, while "your role lacks this" is
   * fixed by editing the role. A single 403 for both sends people to the wrong
   * screen.
   */
  hasRole: boolean;
  allowed: boolean;
};

export async function checkRbacPermission(
  userId: string,
  menuUrl: string,
  actionCode: string
): Promise<PermissionAnswer> {
  const [menuId, actionTypeId] = await Promise.all([
    resolveMenuId(menuUrl),
    resolveActionTypeId(actionCode)
  ]);

  if (!menuId) {
    return { menuFound: false, actionFound: Boolean(actionTypeId), hasRole: true, allowed: false };
  }
  if (!actionTypeId) return { menuFound: true, actionFound: false, hasRole: true, allowed: false };

  const role = await loadRoleFor(userId);
  if (!role) return { menuFound: true, actionFound: true, hasRole: false, allowed: false };

  const allowed = role.permissions.some(
    (entry) =>
      entry.granted && String(entry.menuId) === menuId && String(entry.actionTypeId) === actionTypeId
  );

  return { menuFound: true, actionFound: true, hasRole: true, allowed };
}

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * Requires `actionCode` on the menu registered at `menuUrl`.
 *
 * super_admin — and only super_admin — bypasses the check. A menu granted to
 * nobody is therefore super-admin-only automatically. That is the mechanism,
 * not a side effect.
 *
 * Place it AFTER authenticateJwt and requireRole in the chain.
 */
export function requireRbacPermission(menuUrl: string, actionCode: ActionCode) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Not authenticated"));
        return;
      }

      if (req.user.role === "super_admin") {
        next();
        return;
      }

      const answer = await checkRbacPermission(req.user.id, menuUrl, actionCode);

      if (!answer.menuFound || !answer.actionFound) {
        // Deny, but make the cause obvious in the logs: this is a seeding gap,
        // and it will look identical to a permissions bug from the client side.
        logger.error("RBAC lookup failed — run the RBAC seed", {
          menuUrl,
          actionCode,
          menuFound: answer.menuFound,
          actionFound: answer.actionFound
        });
        next(new AppError(403, ERROR_CODES.FORBIDDEN, "Permission denied"));
        return;
      }

      if (!answer.hasRole) {
        next(
          new AppError(
            403,
            ERROR_CODES.FORBIDDEN,
            "You have no role assigned — ask a super admin to assign one."
          )
        );
        return;
      }

      if (!answer.allowed) {
        next(
          new AppError(
            403,
            ERROR_CODES.FORBIDDEN,
            `Access denied — no '${actionCode}' permission for this module`
          )
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Requires `actionCode` on AT LEAST ONE of `menuUrls`.
 *
 * For endpoints shared by several screens — the image uploader is the case that
 * motivated it — where tying the grant to a single menu would lock out someone
 * legitimately editing one of the others.
 */
export function requireAnyRbacPermission(menuUrls: readonly string[], actionCode: ActionCode) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Not authenticated"));
        return;
      }

      if (req.user.role === "super_admin") {
        next();
        return;
      }

      const answers = await Promise.all(
        menuUrls.map((menuUrl) => checkRbacPermission(req.user!.id, menuUrl, actionCode))
      );

      if (answers.some((answer) => answer.allowed)) {
        next();
        return;
      }

      if (!answers.some((answer) => answer.menuFound)) {
        logger.error("RBAC lookup failed for every candidate menu — run the RBAC seed", {
          menuUrls,
          actionCode
        });
      }

      next(
        new AppError(
          403,
          ERROR_CODES.FORBIDDEN,
          `Access denied — no '${actionCode}' permission for this module`
        )
      );
    } catch (error) {
      next(error);
    }
  };
}

// ── Permission map for clients ────────────────────────────────────────────────

export type RbacPermissionMap = Record<string, string[]>;

export type RbacSnapshot = {
  permissions: RbacPermissionMap;
  allowedMenus: unknown[];
  employeeId: string | null;
  roleName: string | null;
};

/**
 * Builds the `menuUrl -> actionCode[]` map the admin panel gates its UI with,
 * plus the menu rows it renders the sidebar from.
 *
 * Shared by GET /auth/user/me and the session bootstrap so the two can never
 * disagree about what a user may do — a drift that would show the user buttons
 * the server then rejects.
 *
 * super_admin receives every active menu with every active action.
 */
export async function buildRbacSnapshot(userId: string, role: string): Promise<RbacSnapshot> {
  const [menus, actions] = await Promise.all([
    MenuMasterModel.find({ clientCode: env.CLIENT_CODE, isActive: true })
      .sort({ isRoot: -1, sequence: 1 })
      .lean()
      .exec(),
    ActionTypeModel.find({ clientCode: env.CLIENT_CODE, isActive: true }).lean().exec()
  ]);

  if (role === "super_admin") {
    const everyAction = actions.map((a) => (a as unknown as { actionCode: string }).actionCode);
    const permissions: RbacPermissionMap = {};
    for (const menu of menus) {
      permissions[(menu as unknown as { menuUrl: string }).menuUrl] = [...everyAction];
    }
    return { permissions, allowedMenus: menus, employeeId: null, roleName: "Super Admin" };
  }

  const employee = (await EmployeeModel.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true
  })
    .lean()
    .exec()) as { _id: mongoose.Types.ObjectId; roleId?: mongoose.Types.ObjectId | null } | null;

  const grantedRole = await loadRoleFor(userId);
  if (!employee || !grantedRole) {
    return { permissions: {}, allowedMenus: [], employeeId: employee ? String(employee._id) : null, roleName: null };
  }

  const menuUrlById = new Map(
    menus.map((m) => {
      const typed = m as unknown as { _id: mongoose.Types.ObjectId; menuUrl: string };
      return [String(typed._id), typed.menuUrl];
    })
  );
  const actionCodeById = new Map(
    actions.map((a) => {
      const typed = a as unknown as { _id: mongoose.Types.ObjectId; actionCode: string };
      return [String(typed._id), typed.actionCode];
    })
  );

  const permissions: RbacPermissionMap = {};
  const grantedMenuIds = new Set<string>();

  for (const entry of grantedRole.permissions) {
    if (!entry.granted) continue;
    const menuUrl = menuUrlById.get(String(entry.menuId));
    const actionCode = actionCodeById.get(String(entry.actionTypeId));
    if (!menuUrl || !actionCode) continue;

    grantedMenuIds.add(String(entry.menuId));
    if (!permissions[menuUrl]) permissions[menuUrl] = [];
    if (!permissions[menuUrl].includes(actionCode)) permissions[menuUrl].push(actionCode);
  }

  // Include the ancestor chain of every granted screen, for navigation only.
  //
  // A group header such as `#portfolio` is a folder, not a screen: it has no
  // page and nothing to authorise. Requiring each role to hold a separate grant
  // on it meant the Administrator role — which granted 38 screens and zero
  // group headers — rendered as three empty headings with 35 screens orphaned
  // and unreachable from the sidebar. Every future role would have hit the
  // same trap the moment someone forgot to tick a folder.
  //
  // Ancestors are added to allowedMenus ONLY. They are deliberately not added
  // to `permissions`, so seeing a folder never grants an action on it; the
  // server-side guards still answer from the role's real grants alone.
  const parentById = new Map(
    menus.map((m) => {
      const typed = m as unknown as { _id: mongoose.Types.ObjectId; parentMenu?: mongoose.Types.ObjectId | null };
      return [String(typed._id), typed.parentMenu ? String(typed.parentMenu) : null];
    })
  );
  const visibleMenuIds = new Set(grantedMenuIds);
  for (const id of grantedMenuIds) {
    let parent = parentById.get(id) ?? null;
    // Bounded walk: a corrupt parent cycle must not hang the request.
    for (let depth = 0; parent && depth < 8; depth += 1) {
      if (visibleMenuIds.has(parent)) break;
      visibleMenuIds.add(parent);
      parent = parentById.get(parent) ?? null;
    }
  }

  const allowedMenus = menus.filter((m) =>
    visibleMenuIds.has(String((m as unknown as { _id: mongoose.Types.ObjectId })._id))
  );

  return {
    permissions,
    allowedMenus,
    employeeId: String(employee._id),
    roleName: grantedRole.roleName
  };
}
