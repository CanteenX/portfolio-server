import type { ModuleKey } from "@admin-platform/shared-types";
import { authenticateJwt } from "../auth/auth.middleware";
import { requireFeatureEnabled } from "../feature-flags/feature.middleware";
import { requirePermission } from "../rbac/permission.middleware";
import { requireRole } from "../rbac/role.middleware";

export function moduleGuards(moduleKey: ModuleKey, permission: string) {
  return [
    authenticateJwt,
    requireRole(["super_admin", "admin"]),
    requireFeatureEnabled(moduleKey),
    requirePermission(permission)
  ];
}
