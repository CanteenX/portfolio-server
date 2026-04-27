import type { FeatureFlags, ModuleKey } from "./modules.js";
import type { MenuGroup, MenuPermissionEntry } from "./menu.js";
import type { UIFeatureFlags } from "./ui-feature-flags.js";

export const ROLE_KEYS = ["super_admin", "admin"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export type SessionBootstrapResponse = {
  user: {
    id: string;
    email: string;
    role: RoleKey;
  };
  permissions: string[];
  features: FeatureFlags;
  uiFeatureFlags?: UIFeatureFlags;
  menuGroups?: MenuGroup[];
  currentRolePermissions?: MenuPermissionEntry[];
  moduleCatalog: Array<{
    key: ModuleKey;
    label: string;
  }>;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    role: RoleKey;
  };
};
