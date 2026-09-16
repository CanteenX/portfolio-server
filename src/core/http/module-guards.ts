import { ERROR_CODES } from "@admin-platform/shared-types";
import type { ModuleKey } from "@admin-platform/shared-types";
import type { NextFunction, Response } from "express";
import { env } from "../../config/env";
import { authenticateJwt } from "../auth/auth.middleware";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { AppError } from "../errors/app-error";
import { requireFeatureEnabled } from "../feature-flags/feature.middleware";
import { logger } from "../logging/logger";
import { MODULE_MENU_URL, resolveRbacAction } from "../rbac/module-menu-map";
import { requirePermission } from "../rbac/permission.middleware";
import { checkRbacPermission } from "../rbac/rbac-permission.middleware";
import { requireRole } from "../rbac/role.middleware";

/**
 * Persists one shadow-mode near-miss so the soak can be queried rather than
 * grepped. Swallows its own failures: this is observability for a request that
 * has already been allowed, so it must not be able to fail one.
 */
async function recordShadowDeny(detail: Record<string, unknown>): Promise<void> {
  try {
    const { auditLogService } = await import("../audit/audit-log.service");
    await auditLogService.log({
      action: "rbac.shadow_deny",
      entity: "rbac.module",
      entityId: String(detail.menuUrl ?? ""),
      userId: String(detail.userId ?? "unknown"),
      userEmail: detail.email ? String(detail.email) : undefined,
      metadata: detail
    });
  } catch (error) {
    logger.error("Could not persist shadow deny", {
      event: "rbac.shadow_deny_unrecorded",
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Menu-driven RBAC for the 14 legacy modules, staged behind RBAC_MODULE_MODE.
 *
 * These routes were written before RBAC existed and are still protected only by
 * `requirePermission`, which grants every admin everything — a rubber stamp.
 * Switching them to real grants in one deploy would 403 anyone whose role was
 * never populated, across every module simultaneously, so the switch is staged:
 * observe in `shadow`, then flip to `enforce` once the logs are quiet.
 */
function rbacModuleGuard(moduleKey: ModuleKey, permission: string) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    const mode = env.RBAC_MODULE_MODE;
    if (mode === "off") {
      next();
      return;
    }

    // super_admin bypasses by design — a menu granted to nobody is
    // super-admin-only automatically, which is the mechanism the whole scheme
    // rests on. It also means verifying this as a super_admin proves nothing.
    if (!req.user || req.user.role === "super_admin") {
      next();
      return;
    }

    const menuUrl = MODULE_MENU_URL[moduleKey];
    const actionCode = resolveRbacAction(permission);

    if (!menuUrl || !actionCode) {
      // Unmappable is an ops failure, not a permissions answer. Denying here
      // would take a module offline over a typo, so shadow and enforce both
      // allow — loudly.
      logger.error("RBAC module guard could not be evaluated", {
        event: "rbac.map_missing",
        moduleKey,
        permission,
        menuUrl: menuUrl ?? null,
        actionCode: actionCode ?? null
      });
      next();
      return;
    }

    try {
      const answer = await checkRbacPermission(req.user.id, menuUrl, actionCode);

      if (answer.allowed) {
        next();
        return;
      }

      const detail = {
        event: "rbac.shadow_deny",
        moduleKey,
        menuUrl,
        actionCode,
        permission,
        userId: req.user.id,
        email: req.user.email,
        method: req.method,
        path: req.originalUrl,
        menuFound: answer.menuFound,
        actionFound: answer.actionFound
      };

      if (mode === "shadow") {
        // The soak signal. Every line here is a request that WOULD break on
        // the day enforcement is switched on, so the gate for flipping is that
        // this stops appearing.
        logger.warn("RBAC would have denied this request", detail);
        // Also persisted, because the gate is "zero of these for seven days"
        // and stdout on a serverless host is both ephemeral and impossible to
        // aggregate over a week. A gate you cannot measure is not a gate.
        // Fire-and-forget: a failed audit write must never affect the request,
        // which in shadow mode is being allowed through regardless.
        void recordShadowDeny(detail);
        next();
        return;
      }

      if (!answer.menuFound || !answer.actionFound) {
        logger.error("RBAC lookup failed — run the RBAC seed", { ...detail, event: "rbac.seed_gap" });
      } else {
        logger.warn("RBAC denied this request", { ...detail, event: "rbac.deny" });
      }

      next(
        new AppError(
          403,
          ERROR_CODES.FORBIDDEN,
          `Access denied — no '${actionCode}' permission for this module`
        )
      );
    } catch (error) {
      // An evaluation that throws is a database problem, not a verdict.
      // Failing closed here would turn a blip into a site-wide 403.
      logger.error("RBAC module guard threw — allowing request", {
        event: "rbac.evaluation_error",
        moduleKey,
        menuUrl,
        actionCode,
        error: error instanceof Error ? error.message : String(error)
      });
      next();
    }
  };
}

/**
 * `requireFeatureEnabled` MUST stay ahead of the RBAC check.
 *
 * A disabled module answers FEATURE_DISABLED today, and an integration test
 * asserts exactly that. Putting RBAC first would answer FORBIDDEN instead —
 * same status, different code, and a silently different message for anyone
 * debugging a switched-off module.
 */
export function moduleGuards(moduleKey: ModuleKey, permission: string) {
  return [
    authenticateJwt,
    requireRole(["super_admin", "admin"]),
    requireFeatureEnabled(moduleKey),
    requirePermission(permission),
    rbacModuleGuard(moduleKey, permission)
  ];
}
