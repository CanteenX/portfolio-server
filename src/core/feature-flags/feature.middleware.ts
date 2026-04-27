import { ERROR_CODES } from "@admin-platform/shared-types";
import type { ModuleKey } from "@admin-platform/shared-types";
import type { NextFunction, Response } from "express";
import { AppError } from "../errors/app-error";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { featureConfigService } from "./feature-config.service";

export function requireFeatureEnabled(moduleKey: ModuleKey) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Not authenticated"));
      return;
    }

    if (req.user.role === "super_admin") {
      next();
      return;
    }

    const features = await featureConfigService.getEnabledFeatures();
    if (!features[moduleKey]) {
      next(new AppError(403, ERROR_CODES.FEATURE_DISABLED, `${moduleKey} is disabled`));
      return;
    }

    next();
  };
}
