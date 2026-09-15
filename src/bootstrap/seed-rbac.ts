import mongoose from "mongoose";
import { env } from "../config/env";
import { logger } from "../core/logging/logger";
import { ACTION_CODES, invalidateRbacLookups } from "../core/rbac/rbac-permission.middleware";
import { UserModel } from "../core/auth/user.model";
import { ActionTypeModel } from "../modules/rbac/action-type.model";
import { EmployeeModel } from "../modules/rbac/employee.model";
import { MenuMasterModel } from "../modules/rbac/menu-master.model";
import { RoleMasterModel } from "../modules/rbac/role-master.model";

/** The migration role existing admins are mapped onto. */
const ADMIN_ROLE_NAME = "Administrator";

/**
 * Seeds the rows the RBAC system resolves against.
 *
 * THIS IS NOT OPTIONAL. requireRbacPermission() looks a menu up BY URL; with no
 * row, every guarded request 403s for every non-super-admin, and the failure is
 * indistinguishable from "this role was not granted it" unless you read the
 * server log. Menus and action types are data, so an unseeded database is an
 * RBAC system that denies everything.
 *
 * Idempotent: re-running only fills gaps. Existing rows are left alone so an
 * admin's edits (renames, icon changes, re-sequencing) survive a redeploy.
 */

const ACTION_NAMES: Record<string, string> = {
  read: "Read",
  write: "Write",
  edit: "Edit",
  delete: "Delete",
  print: "Print",
  mail: "Mail"
};

/**
 * Root rows are sidebar section headings, not navigable pages, so their
 * menuUrl is a placeholder that no React route matches. The unique index is on
 * (clientCode, menuUrl), so each placeholder still has to be distinct.
 */
type MenuSeed = {
  menuUrl: string;
  menuName: string;
  icon: string;
  sequence: number;
  children?: { menuUrl: string; menuName: string; icon: string; sequence: number }[];
};

const MENU_TREE: MenuSeed[] = [
  {
    menuUrl: "#portfolio",
    menuName: "Portfolio CMS",
    icon: "LayoutDashboard",
    sequence: 10,
    children: [
      { menuUrl: "/portfolio/projects", menuName: "Projects", icon: "FolderKanban", sequence: 1 },
      { menuUrl: "/portfolio/team", menuName: "Team", icon: "Users", sequence: 2 },
      { menuUrl: "/portfolio/contacts", menuName: "Contacts", icon: "Mail", sequence: 3 },
      { menuUrl: "/portfolio/settings", menuName: "Site Settings", icon: "Settings", sequence: 4 },
      {
        menuUrl: "/portfolio/projects/masters",
        menuName: "Project Masters",
        icon: "ListChecks",
        sequence: 5
      },
      {
        menuUrl: "/portfolio/masters/tech-stacks",
        menuName: "Tech Stacks",
        icon: "Layers",
        sequence: 6
      }
    ]
  },
  {
    menuUrl: "#modules",
    menuName: "Modules",
    icon: "Layers",
    sequence: 40,
    children: [
      { menuUrl: "/calendar", menuName: "Calendar", icon: "CalendarDays", sequence: 1 },
      { menuUrl: "/chat", menuName: "Chat", icon: "MessageSquare", sequence: 2 },
      { menuUrl: "/mailbox", menuName: "Mailbox", icon: "Mail", sequence: 3 },
      { menuUrl: "/projects", menuName: "Projects", icon: "FolderKanban", sequence: 4 },
      { menuUrl: "/tasks", menuName: "Tasks", icon: "CheckSquare", sequence: 5 },
      { menuUrl: "/todo", menuName: "Todo", icon: "ListChecks", sequence: 6 },
      { menuUrl: "/invoices", menuName: "Invoices", icon: "FileText", sequence: 7 },
      { menuUrl: "/support-tickets", menuName: "Support Tickets", icon: "Headphones", sequence: 8 },
      { menuUrl: "/file-manager", menuName: "File Manager", icon: "HardDrive", sequence: 9 },
      { menuUrl: "/crm", menuName: "CRM", icon: "Users", sequence: 10 },
      { menuUrl: "/ecommerce", menuName: "Ecommerce", icon: "ShoppingCart", sequence: 11 },
      { menuUrl: "/job", menuName: "Jobs", icon: "Briefcase", sequence: 12 },
      { menuUrl: "/api-management", menuName: "API Management", icon: "KeyRound", sequence: 13 }
    ]
  },
  {
    menuUrl: "#settings",
    menuName: "Settings",
    icon: "Settings",
    sequence: 80,
    children: [
      { menuUrl: "/settings/system", menuName: "System", icon: "Settings", sequence: 1 },
      { menuUrl: "/settings/branding", menuName: "Branding", icon: "FileEdit", sequence: 2 },
      { menuUrl: "/settings/users", menuName: "Users", icon: "Users", sequence: 3 },
      { menuUrl: "/settings/custom-roles", menuName: "Custom Roles", icon: "KeyRound", sequence: 4 },
      { menuUrl: "/settings/payments", menuName: "Payments", icon: "ShoppingCart", sequence: 5 },
      { menuUrl: "/settings/audit-log", menuName: "Audit Log", icon: "FileText", sequence: 6 },
      {
        menuUrl: "/settings/feature-toggles",
        menuName: "Feature Toggles",
        icon: "CheckSquare",
        sequence: 7
      },
      {
        menuUrl: "/settings/menu-management",
        menuName: "Menu Management",
        icon: "ListChecks",
        sequence: 8
      }
    ]
  },
  {
    menuUrl: "#access-control",
    menuName: "Access Control",
    icon: "KeyRound",
    sequence: 90,
    children: [
      { menuUrl: "/rbac/menus", menuName: "Menus", icon: "ListChecks", sequence: 1 },
      { menuUrl: "/rbac/actions", menuName: "Action Types", icon: "CheckSquare", sequence: 2 },
      { menuUrl: "/rbac/roles", menuName: "Roles", icon: "KeyRound", sequence: 3 },
      { menuUrl: "/rbac/employees", menuName: "Employees", icon: "Users", sequence: 4 },
      { menuUrl: "/rbac/tasks", menuName: "Tasks", icon: "CheckSquare", sequence: 5 }
    ]
  }
];

async function seedActionTypes(): Promise<number> {
  let created = 0;
  for (const actionCode of ACTION_CODES) {
    const result = await ActionTypeModel.updateOne(
      { clientCode: env.CLIENT_CODE, actionCode },
      {
        $setOnInsert: {
          clientCode: env.CLIENT_CODE,
          actionName: ACTION_NAMES[actionCode] ?? actionCode,
          actionCode,
          isActive: true
        }
      },
      { upsert: true }
    ).exec();
    if (result.upsertedCount > 0) created += 1;
  }
  return created;
}

async function upsertMenu(
  menuUrl: string,
  fields: {
    menuName: string;
    icon: string;
    sequence: number;
    isRoot: boolean;
    isParentMenu: boolean;
    parentMenu: mongoose.Types.ObjectId | null;
  }
): Promise<{ id: mongoose.Types.ObjectId; created: boolean }> {
  const existing = (await MenuMasterModel.findOne({ clientCode: env.CLIENT_CODE, menuUrl })
    .select("_id")
    .lean()
    .exec()) as { _id: mongoose.Types.ObjectId } | null;

  if (existing) return { id: existing._id, created: false };

  const doc = await MenuMasterModel.create({
    clientCode: env.CLIENT_CODE,
    menuUrl,
    ...fields,
    isActive: true,
    createdBy: null,
    updatedBy: "seed"
  });

  return { id: doc._id, created: true };
}

/**
 * Gives every existing `admin` user an Employee record on a fully-granted
 * "Administrator" role.
 *
 * Before RBAC enforcement existed, any authenticated user could do anything on
 * the portfolio routes. Turning the guards on without this would lock out every
 * admin who has no Employee row — which is all of them — and the only way back
 * in would be a super_admin manually building a role first. The migration
 * therefore preserves the access people already had, and the owner narrows it
 * afterwards in the Roles screen.
 *
 * Only runs for admins with NO employee record. An admin already mapped to a
 * deliberately-narrow role is never widened.
 */
async function backfillAdminEmployees(menuIds: mongoose.Types.ObjectId[]): Promise<number> {
  const actions = (await ActionTypeModel.find({ clientCode: env.CLIENT_CODE, isActive: true })
    .select("_id")
    .lean()
    .exec()) as { _id: mongoose.Types.ObjectId }[];

  if (actions.length === 0 || menuIds.length === 0) return 0;

  const permissions = menuIds.flatMap((menuId) =>
    actions.map((action) => ({
      menuId: String(menuId),
      actionTypeId: String(action._id),
      granted: true
    }))
  );

  let role = (await RoleMasterModel.findOne({
    clientCode: env.CLIENT_CODE,
    roleName: ADMIN_ROLE_NAME
  })
    .select("_id")
    .lean()
    .exec()) as { _id: mongoose.Types.ObjectId } | null;

  if (!role) {
    const created = await RoleMasterModel.create({
      clientCode: env.CLIENT_CODE,
      roleName: ADMIN_ROLE_NAME,
      permissions,
      isActive: true,
      createdBy: null,
      updatedBy: "seed"
    });
    role = { _id: created._id };
  } else {
    // Keep the role current as new menus appear, but only ADD grants — never
    // revoke, because an owner may have deliberately unticked something.
    await RoleMasterModel.updateOne(
      { _id: role._id },
      { $addToSet: { permissions: { $each: permissions } } }
    ).exec();
  }

  const admins = (await UserModel.find({ role: "admin" })
    .select("_id email")
    .lean()
    .exec()) as unknown as { _id: mongoose.Types.ObjectId; email: string }[];

  let created = 0;
  for (const admin of admins) {
    // Match on emailOffice as well as userId: some databases carry a legacy
    // UNIQUE index on emailOffice, so an employee row created by another route
    // (or an earlier schema) collides on insert even though no row exists for
    // this userId.
    const existing = await EmployeeModel.findOne({
      $or: [{ userId: admin._id }, { emailOffice: admin.email }]
    })
      .select("_id roleId")
      .lean()
      .exec();

    if (existing) {
      // Adopt an orphan: a row with no role grants nothing, which is the
      // lockout this backfill exists to prevent.
      const typed = existing as { _id: mongoose.Types.ObjectId; roleId?: mongoose.Types.ObjectId | null };
      if (!typed.roleId) {
        await EmployeeModel.updateOne({ _id: typed._id }, { $set: { roleId: role._id } }).exec();
      }
      continue;
    }

    try {
      await EmployeeModel.create({
        clientCode: env.CLIENT_CODE,
        userId: admin._id,
        employeeName: admin.email.split("@")[0] ?? "Administrator",
        emailOffice: admin.email,
        department: "",
        contact: "",
        roleId: role._id,
        parentEmployeeId: null,
        ancestorIds: [],
        isActive: true,
        createdBy: null,
        updatedBy: "seed"
      });
      created += 1;
    } catch (error) {
      // A duplicate here means a concurrent boot won the race — two serverless
      // instances cold-starting together. Nothing to do, and certainly not
      // worth failing the boot over.
      if ((error as { code?: number }).code === 11000) continue;
      throw error;
    }
  }

  return created;
}

export async function seedRbacBaseline(): Promise<void> {
  const actionsCreated = await seedActionTypes();

  let menusCreated = 0;
  const grantableMenuIds: mongoose.Types.ObjectId[] = [];

  for (const root of MENU_TREE) {
    const { id: rootId, created } = await upsertMenu(root.menuUrl, {
      menuName: root.menuName,
      icon: root.icon,
      sequence: root.sequence,
      isRoot: true,
      isParentMenu: true,
      parentMenu: null
    });
    if (created) menusCreated += 1;

    for (const child of root.children ?? []) {
      const childResult = await upsertMenu(child.menuUrl, {
        menuName: child.menuName,
        icon: child.icon,
        sequence: child.sequence,
        isRoot: false,
        isParentMenu: false,
        parentMenu: rootId
      });
      if (childResult.created) menusCreated += 1;
      // Only leaf menus are grantable — a root row is a sidebar heading, not a
      // page, so granting actions on it would mean nothing.
      grantableMenuIds.push(childResult.id);
    }
  }

  const employeesCreated = await backfillAdminEmployees(grantableMenuIds);

  if (actionsCreated > 0 || menusCreated > 0) {
    // New rows mean the negative lookups cached during the gap are now wrong.
    invalidateRbacLookups();
  }

  if (actionsCreated > 0 || menusCreated > 0 || employeesCreated > 0) {
    logger.info("Seeded RBAC baseline", { actionsCreated, menusCreated, employeesCreated });
  }
}
