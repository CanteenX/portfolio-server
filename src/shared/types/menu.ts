// ── Permission Actions ──────────────────────────────────────────────
export const PERMISSION_ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "export",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

// ── Menu Item ──────────────────────────────────────────────────────
export type MenuItem = {
  _id: string;
  name: string;
  slug: string;
  route: string;
  icon: string;
  parentId: string | null;
  groupId: string;
  order: number;
  isParent: boolean;
  children?: MenuItem[];
};

// ── Menu Group ─────────────────────────────────────────────────────
export type MenuGroup = {
  _id: string;
  name: string;
  slug: string;
  order: number;
  isLink: boolean;
  route?: string;
  icon?: string;
  menus: MenuItem[];
};

// ── Permission Entry (per menu or menu group for a role) ───────────
export type MenuPermissionEntry = {
  menuId?: string;
  menuGroupId?: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
};

// ── Structured Role Permissions ────────────────────────────────────
export type StructuredRolePermissions = {
  roleId: string;
  permissions: MenuPermissionEntry[];
};

// ── Quick Link ─────────────────────────────────────────────────────
export type QuickLink = {
  _id: string;
  name: string;
  url: string;
  iconUrl?: string;
  order: number;
};
