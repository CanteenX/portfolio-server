import { ERROR_CODES } from "@admin-platform/shared-types";
import type { NextFunction, Response } from "express";
import { AppError } from "../errors/app-error";
import type { AuthenticatedRequest } from "../auth/auth.types";

export function requireRole(allowedRoles: Array<"super_admin" | "admin">) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Not authenticated"));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError(403, ERROR_CODES.FORBIDDEN, "Role is not allowed"));
      return;
    }

    next();
  };
}
