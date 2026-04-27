import { MODULE_KEYS } from "@admin-platform/shared-types";
import type { ModuleKey, RoleKey } from "@admin-platform/shared-types";

const defaultActions = ["read", "create", "update", "delete", "export"] as const;

function buildAdminPermissions(): string[] {
  const permissionList: string[] = [];
  for (const moduleKey of MODULE_KEYS) {
    for (const action of defaultActions) {
      permissionList.push(`${moduleKey}.${action}`);
    }
  }
  return permissionList;
}

const superAdminPermissions = buildAdminPermissions();
const adminPermissions = buildAdminPermissions();

const rolePermissions: Record<RoleKey, string[]> = {
  super_admin: superAdminPermissions,
  admin: adminPermissions
};

export function getPermissionsByRole(role: RoleKey): string[] {
  return rolePermissions[role] ?? [];
}

export function getDefaultFeatures(): Record<ModuleKey, boolean> {
  return MODULE_KEYS.reduce((acc, moduleKey) => {
    acc[moduleKey] = true;
    return acc;
  }, {} as Record<ModuleKey, boolean>);
}
