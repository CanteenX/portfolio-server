import { ERROR_CODES } from "@admin-platform/shared-types";
import type { NextFunction, Response } from "express";
import { AppError } from "../errors/app-error";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { getPermissionsByRole } from "./permissions";

export function requirePermission(requiredPermission?: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Not authenticated"));
      return;
    }

    if (req.user.role === "super_admin" || !requiredPermission) {
      next();
      return;
    }

    const rolePermissions = new Set(getPermissionsByRole(req.user.role));
    if (!rolePermissions.has(requiredPermission)) {
      next(new AppError(403, ERROR_CODES.FORBIDDEN, "Permission denied"));
      return;
    }

    next();
  };
}
