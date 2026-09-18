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

/**
 * Exported so the A-4 enforcement suite can assert that every module in
 * MODULE_MENU_URL actually has a row here. A mapped module absent from this
 * tree is a guaranteed 403 for the whole module the moment enforcement is on.
 */
// Moved to core so buildRbacSnapshot can use it without core depending on
// bootstrap. Re-exported here because callers already import it from this
// module. See core/rbac/super-admin-menus.ts for what membership means.
export { SUPER_ADMIN_ONLY_MENUS } from "../core/rbac/super-admin-menus";
import { SUPER_ADMIN_ONLY_MENUS } from "../core/rbac/super-admin-menus";

export const MENU_TREE: MenuSeed[] = [
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
      // Must exist before requireRbacPermission("/portfolio/services", …) can
      // ever pass: the guard resolves menus by URL, so an unseeded screen 403s
      // for every non-super-admin regardless of what their role grants.
      { menuUrl: "/portfolio/services", menuName: "Services", icon: "Layers", sequence: 7 },
      { menuUrl: "/portfolio/social-proof", menuName: "Social Proof", icon: "Star", sequence: 8 },
      // Seeded but never granted — see SUPER_ADMIN_ONLY_MENUS below.
      { menuUrl: "/portfolio/legal", menuName: "Legal Documents", icon: "Scale", sequence: 9 },
      { menuUrl: "/portfolio/faq", menuName: "FAQ", icon: "HelpCircle", sequence: 10 },
      { menuUrl: "/portfolio/posts", menuName: "Insights", icon: "PenLine", sequence: 11 },
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
    menuUrl: "#website",
    menuName: "Website",
    icon: "FileEdit",
    sequence: 20,
    children: [
      { menuUrl: "/website/seo-manager", menuName: "SEO Manager", icon: "Search", sequence: 1 }
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
      { menuUrl: "/api-management", menuName: "API Management", icon: "KeyRound", sequence: 13 },
      // The fourteenth module. Its absence here is what would have made
      // RBAC_MODULE_MODE=enforce a guaranteed 403 on every WhatsApp route:
      // no menu row means no grant is expressible, for anyone.
      { menuUrl: "/whatsapp", menuName: "WhatsApp", icon: "MessageSquare", sequence: 14 }
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
/**
 * Records a seed-time grant of access.
 *
 * `logger.warn` was the only trace, and on Vercel stdout survives about as long
 * as the invocation — so "who gave this account full access?" had no answer
 * after the fact. A promotion is a privilege change and belongs in the same
 * audit trail as every other one.
 */
async function auditPromotion(options: {
  employeeId: string;
  email: string;
  before: mongoose.Types.ObjectId | null;
  after: mongoose.Types.ObjectId;
  reason: string;
}): Promise<void> {
  logger.warn("Admin had no effective permissions — moved to the Administrator role", {
    email: options.email,
    reason: options.reason
  });

  try {
    const { auditLogService } = await import("../core/audit/audit-log.service");
    await auditLogService.log({
      action: "rbac.employee.seed_promoted",
      entity: "Employee",
      entityId: options.employeeId,
      userId: "seed",
      userEmail: options.email,
      before: { roleId: options.before ? String(options.before) : null },
      after: { roleId: String(options.after), reason: options.reason }
    });
  } catch (error) {
    // Never fail boot over the audit write. A server that will not start is a
    // worse outcome than a promotion recorded only in the log line above.
    logger.error("Failed to audit a seed promotion", { error: String(error) });
  }
}

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
    .select("_id permissions")
    .lean()
    .exec()) as
    | {
        _id: mongoose.Types.ObjectId;
        permissions?: { menuId: string; actionTypeId: string; granted: boolean }[];
      }
    | null;

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
    // Grant the pairs this role has never been asked about — newly seeded menus
    // — and nothing else.
    //
    // Keyed on menuId+actionTypeId WITHOUT `granted`, which is the whole point.
    // `$addToSet` of the full matrix compares entire subdocuments, so an
    // unticked box (granted:false) does not match the granted:true version and
    // gets inserted alongside it. The role then holds both, `some(granted &&
    // match)` finds the true one, and the untick is undone on the next cold
    // start — while the comment above the operation claimed it never revoked
    // anything. It did not revoke; it re-granted, which for the owner who
    // removed the permission is the same betrayal in the opposite direction.
    const known = new Set(
      (role.permissions ?? []).map((p) => `${String(p.menuId)}:${String(p.actionTypeId)}`)
    );
    const additions = permissions.filter((p) => !known.has(`${p.menuId}:${p.actionTypeId}`));

    if (additions.length > 0) {
      await RoleMasterModel.updateOne(
        { _id: role._id },
        { $push: { permissions: { $each: additions } } }
      ).exec();
    }
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
      .select("_id roleId accessLocked")
      .lean()
      .exec();

    if (existing) {
      const typed = existing as {
        _id: mongoose.Types.ObjectId;
        roleId?: mongoose.Types.ObjectId | null;
        accessLocked?: boolean;
      };

      // Somebody took this admin's access away on purpose. Promoting them would
      // hand it straight back on the next cold start, which is how a revocation
      // silently expires.
      if (typed.accessLocked) {
        logger.info("Skipped zero-grant promotion — employee is access-locked", {
          email: admin.email
        });
        continue;
      }

      // No role at all, or a role that grants literally nothing. Both mean the
      // same thing now that enforcement exists: this admin can reach no screen.
      //
      // A zero-grant role is not a deliberate restriction — before this branch
      // there was no permission check on the portfolio routes, so nobody ever
      // had a reason to populate one. Leaving it alone would silently revoke
      // access that worked yesterday, which is the exact lockout this backfill
      // exists to prevent.
      const currentGrants = typed.roleId
        ? ((
            (await RoleMasterModel.findById(typed.roleId).select("permissions").lean().exec()) as {
              permissions?: { granted: boolean }[];
            } | null
          )?.permissions ?? []).filter((p) => p.granted).length
        : 0;

      if (currentGrants === 0) {
        await EmployeeModel.updateOne({ _id: typed._id }, { $set: { roleId: role._id } }).exec();
        await auditPromotion({
          employeeId: String(typed._id),
          email: admin.email,
          before: typed.roleId ?? null,
          after: role._id,
          reason: "zero effective grants"
        });
        created += 1;
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
    const children = root.children ?? [];

    // If these screens are already registered — under a section this seed did
    // not create — adopt the existing rows instead of building a parallel
    // section beside them. Menus resolve BY URL, so the grants are correct
    // either way; creating the root regardless is what left empty duplicate
    // sections ("Portfolio CMS", "Modules") sitting next to the real ones.
    const existingChildren = (await MenuMasterModel.find({
      clientCode: env.CLIENT_CODE,
      menuUrl: { $in: children.map((c) => c.menuUrl) }
    })
      .select("_id menuUrl")
      .lean()
      .exec()) as unknown as { _id: mongoose.Types.ObjectId; menuUrl: string }[];

    if (children.length > 0 && existingChildren.length === children.length) {
      grantableMenuIds.push(
        ...existingChildren
          .filter((c) => !SUPER_ADMIN_ONLY_MENUS.has(c.menuUrl))
          .map((c) => c._id)
      );
      continue;
    }

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
      // page, so granting actions on it would mean nothing. Menus reserved to
      // the owner are seeded so the guard can resolve them, but never handed to
      // a role.
      if (!SUPER_ADMIN_ONLY_MENUS.has(child.menuUrl)) {
        grantableMenuIds.push(childResult.id);
      }
    }
  }

  // Remove placeholder sections this seed created that ended up with no
  // children, because their screens were already registered elsewhere. Only
  // the "#"-prefixed URLs are touched: those are this seed's own placeholders,
  // never a real navigable route, so nothing else can own them.
  const placeholderUrls = MENU_TREE.map((root) => root.menuUrl).filter((url) => url.startsWith("#"));
  const emptyPlaceholders = (await MenuMasterModel.find({
    clientCode: env.CLIENT_CODE,
    menuUrl: { $in: placeholderUrls }
  })
    .select("_id menuUrl")
    .lean()
    .exec()) as unknown as { _id: mongoose.Types.ObjectId; menuUrl: string }[];

  let removed = 0;
  for (const placeholder of emptyPlaceholders) {
    const childCount = await MenuMasterModel.countDocuments({ parentMenu: placeholder._id }).exec();
    if (childCount === 0) {
      await MenuMasterModel.deleteOne({ _id: placeholder._id }).exec();
      removed += 1;
    }
  }
  if (removed > 0) {
    invalidateRbacLookups();
    logger.info("Removed empty placeholder menu sections", { removed });
  }

  const employeesCreated = env.RBAC_BACKFILL_ENABLED
    ? await backfillAdminEmployees(grantableMenuIds)
    : 0;

  if (!env.RBAC_BACKFILL_ENABLED) {
    logger.info("RBAC admin backfill is disabled — no employee rows or roles were granted");
  }

  if (actionsCreated > 0 || menusCreated > 0) {
    // New rows mean the negative lookups cached during the gap are now wrong.
    invalidateRbacLookups();
  }

  if (actionsCreated > 0 || menusCreated > 0 || employeesCreated > 0) {
    logger.info("Seeded RBAC baseline", { actionsCreated, menusCreated, employeesCreated });
  }
}
