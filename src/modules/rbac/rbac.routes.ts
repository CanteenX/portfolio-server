import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";
import { ERROR_CODES } from "@admin-platform/shared-types";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { requireRole } from "../../core/rbac/role.middleware";
import type { ActionCode } from "../../core/rbac/rbac-permission.middleware";
import { requireRbacPermission } from "../../core/rbac/rbac-permission.middleware";
import { auditLogService } from "../../core/audit/audit-log.service";
import { env } from "../../config/env";
import { UserModel } from "../../core/auth/user.model";
import type { MenuMasterDocument } from "./menu-master.model";
import { MenuMasterModel } from "./menu-master.model";
import { ActionTypeModel } from "./action-type.model";
import type { RoleMasterDocument } from "./role-master.model";
import { RoleMasterModel } from "./role-master.model";
import type { EmployeeDocument } from "./employee.model";
import { EmployeeModel } from "./employee.model";
import { RbacTaskModel } from "./rbac-task.model";

const router = Router();
const SUPER_ONLY = [authenticateJwt, requireRole(["super_admin"])];

/**
 * The RBAC screens are screens like any other, so they are granted like any
 * other — by a row in MenuMaster, not by being an admin.
 *
 * Until now `/api/v1/rbac/*` was guarded by role alone, which meant every admin
 * could read and write the access-control tables regardless of what their role
 * actually granted. The menu URLs below must match the React route paths
 * exactly: `useRbacPagePermissions` resolves a screen's grants by
 * longest-prefix match on `location.pathname`, so a mismatch hides every button
 * on a screen the server would have allowed.
 */
const RBAC_MENUS = "/rbac/menus";
const RBAC_ACTIONS = "/rbac/actions";
const RBAC_ROLES = "/rbac/roles";
const RBAC_EMPLOYEES = "/rbac/employees";
const RBAC_TASKS = "/rbac/tasks";

function guard(menuUrl: string, action: ActionCode) {
  return [
    authenticateJwt,
    requireRole(["super_admin", "admin"]),
    requireRbacPermission(menuUrl, action),
  ];
}

type LeanEmployee = EmployeeDocument & { _id: mongoose.Types.ObjectId };
type LeanRole = RoleMasterDocument & { _id: mongoose.Types.ObjectId };
type LeanMenu = MenuMasterDocument & { _id: mongoose.Types.ObjectId };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSearchRegex(raw: string): RegExp {
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

async function getEmployeeForUser(userId: string): Promise<LeanEmployee | null> {
  return EmployeeModel.findOne(
    { userId: new mongoose.Types.ObjectId(userId) }
  ).lean().exec() as unknown as LeanEmployee | null;
}

async function getDescendantIds(employeeId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId[]> {
  const descendants = await EmployeeModel.find(
    { ancestorIds: employeeId },
    { _id: 1 }
  ).lean().exec() as unknown as Array<{ _id: mongoose.Types.ObjectId }>;
  return descendants.map((d) => d._id);
}

/**
 * The actor's own ceiling, as a set of `menuId:actionTypeId` keys.
 *
 * Split out of the old `validateStrictSubset` because two different questions
 * need it: "may they save these permissions" and "may they hand out this
 * role". Both reduce to a containment test against this set.
 */
async function loadActorGrantSet(actorEmployeeId: string): Promise<Set<string>> {
  const actor = await EmployeeModel.findById(actorEmployeeId).lean().exec() as unknown as LeanEmployee | null;
  if (!actor?.roleId) {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      "You have no role assigned — ask a super admin to assign one before managing roles or employees."
    );
  }
  const actorRole = await RoleMasterModel.findById(actor.roleId).lean().exec() as unknown as LeanRole | null;
  if (!actorRole) {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      "Your assigned role no longer exists — ask a super admin to reassign one."
    );
  }
  return new Set<string>(
    actorRole.permissions
      .filter((p) => p.granted)
      .map((p) => `${p.menuId}:${p.actionTypeId}`)
  );
}

/**
 * Exported for the containment unit tests. The HTTP suites cover the same rule
 * end-to-end, but they can only reach it through a role that some fixture had
 * to construct — which makes "equal sets are allowed" awkward to state and easy
 * to get subtly wrong in the fixture rather than in the code.
 */
export function assertPermissionsWithinCeiling(
  actorGrants: Set<string>,
  newPermissions: Array<{ menuId: string; actionTypeId: string; granted: boolean }>
): void {
  for (const perm of newPermissions) {
    if (perm.granted && !actorGrants.has(`${perm.menuId}:${perm.actionTypeId}`)) {
      throw new AppError(
        403,
        ERROR_CODES.FORBIDDEN,
        "Cannot save role: contains permissions exceeding your current access level."
      );
    }
  }
}

async function validateStrictSubset(
  actorEmployeeId: string,
  newPermissions: Array<{ menuId: string; actionTypeId: string; granted: boolean }>
): Promise<void> {
  assertPermissionsWithinCeiling(await loadActorGrantSet(actorEmployeeId), newPermissions);
}

/**
 * May this actor hand out this role?
 *
 * Grant-containment: yes if every permission the role grants is one the actor
 * already holds. Authorship is deliberately NOT consulted.
 *
 * The check this replaces asked whether the role was created inside the actor's
 * subtree, and skipped the test entirely when `createdBy` was null. Every
 * seeded role — "Administrator" above all — has `createdBy: null`, so the guard
 * never fired and any admin could assign themselves everything.
 *
 * Tightening authorship instead would have been worse than the hole: it makes
 * `Administrator` permanently unassignable and leaves the owner unable to
 * onboard anybody. Containment keeps every assignment that works today working,
 * because an actor holding Administrator contains every other role by
 * definition; only exceeding your own ceiling becomes impossible.
 */
async function assertRoleAssignable(actorEmployeeId: string, roleId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(roleId)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid role id.");
  }

  // isActive matters: loadRoleFor() requires it when grants are actually
  // evaluated, so assigning a soft-deleted role leaves the assignee with no
  // effective access at all. That fails closed rather than open, but it looks
  // to the admin like a successful assignment — so refuse it here instead of
  // letting someone discover it as a mystery lockout.
  const role = await RoleMasterModel.findOne({
    _id: roleId,
    clientCode: env.CLIENT_CODE,
    isActive: true,
  }).lean().exec() as unknown as LeanRole | null;
  if (!role) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Role not found or inactive.");

  const actorGrants = await loadActorGrantSet(actorEmployeeId);
  const exceeding = (role.permissions ?? []).filter(
    (p) => p.granted && !actorGrants.has(`${p.menuId}:${p.actionTypeId}`)
  );

  if (exceeding.length > 0) {
    throw new AppError(
      403,
      ERROR_CODES.FORBIDDEN,
      `Cannot assign "${role.roleName}": it grants ${exceeding.length} permission(s) beyond your own access level.`
    );
  }
}

/** Records who changed whose role, and to what. `logger.warn` is ephemeral on Vercel. */
async function auditRoleAssignment(options: {
  actorUserId: string;
  actorEmail?: string;
  employeeId: string;
  before: mongoose.Types.ObjectId | string | null;
  after: mongoose.Types.ObjectId | string | null;
}): Promise<void> {
  try {
    await auditLogService.log({
      action: "rbac.employee.role_assigned",
      entity: "Employee",
      entityId: options.employeeId,
      userId: options.actorUserId,
      userEmail: options.actorEmail,
      before: { roleId: options.before ? String(options.before) : null },
      after: { roleId: options.after ? String(options.after) : null },
    });
  } catch {
    // An audit write that fails must not roll back a change the caller was
    // authorised to make; the alternative is a permissions system that breaks
    // when the log collection does.
  }
}

// ─── MenuMaster ───────────────────────────────────────────────────────────────

const menuMasterSchema = z.object({
  menuName: z.string().min(1).max(100),
  isParentMenu: z.boolean().default(false),
  parentMenu: z.string().nullable().optional(),
  menuUrl: z.string().max(255).default(""),
  sequence: z.number().int().min(0).default(0),
  icon: z.string().max(100).default(""),
  isActive: z.boolean().default(true),
});

router.get("/api/v1/rbac/menus", ...guard(RBAC_MENUS, "read"), async (req, res, next) => {
  try {
    const search = (req.query.search as string | undefined)?.trim();
    const filter: Record<string, unknown> = { clientCode: env.CLIENT_CODE };
    if (search) {
      const rx = buildSearchRegex(search);
      filter.$or = [{ menuName: rx }, { menuUrl: rx }];
    }
    const menus = await MenuMasterModel.find(filter)
      .sort({ isRoot: -1, sequence: 1 })
      .lean()
      .exec();
    res.json(menus);
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/rbac/menus", ...SUPER_ONLY, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = menuMasterSchema.parse(req.body);
    const parentId = data.parentMenu ? new mongoose.Types.ObjectId(data.parentMenu) : null;
    if (parentId) {
      const parent = await MenuMasterModel.findOne({ _id: parentId, clientCode: env.CLIENT_CODE }).lean<MenuMasterDocument>().exec();
      if (!parent) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Parent menu not found.");
      if (!parent.isParentMenu) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Selected parent menu is not marked as a parent (dropdown).");
    }
    const isRoot = !parentId;
    const menu = await MenuMasterModel.create({
      ...data,
      isRoot,
      parentMenu: parentId,
      clientCode: env.CLIENT_CODE,
      createdBy: req.user!.id,
      updatedBy: req.user!.id,
    });
    res.status(201).json(menu);
  } catch (error) {
    next(error);
  }
});

router.put("/api/v1/rbac/menus/:id", ...SUPER_ONLY, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = menuMasterSchema.partial().parse(req.body);
    const parentId = data.parentMenu !== undefined
      ? (data.parentMenu ? new mongoose.Types.ObjectId(data.parentMenu) : null)
      : undefined;
    if (parentId) {
      if (parentId.toString() === req.params.id) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "A menu cannot be its own parent.");
      }
      const parent = await MenuMasterModel.findOne({ _id: parentId, clientCode: env.CLIENT_CODE }).lean<MenuMasterDocument>().exec();
      if (!parent) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Parent menu not found.");
      if (!parent.isParentMenu) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Selected parent menu is not marked as a parent (dropdown).");
    }
    const isRoot = parentId === null ? true : parentId === undefined ? undefined : false;
    const update: Record<string, unknown> = { ...data, updatedBy: req.user!.id };
    if (parentId !== undefined) update.parentMenu = parentId;
    if (isRoot !== undefined) update.isRoot = isRoot;
    const menu = await MenuMasterModel.findOneAndUpdate(
      { _id: req.params.id, clientCode: env.CLIENT_CODE },
      update,
      { new: true }
    ).lean().exec();
    if (!menu) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Menu not found.");
    res.json(menu);
  } catch (error) {
    next(error);
  }
});

router.delete("/api/v1/rbac/menus/:id", ...SUPER_ONLY, async (req: AuthenticatedRequest, res, next) => {
  try {
    const hasChildren = await MenuMasterModel.exists({
      parentMenu: new mongoose.Types.ObjectId(req.params.id),
      clientCode: env.CLIENT_CODE,
    });
    if (hasChildren) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot delete: menu has sub-menus. Remove sub-menus first.");
    }
    await MenuMasterModel.deleteOne({ _id: req.params.id, clientCode: env.CLIENT_CODE });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ─── ActionTypeMaster ─────────────────────────────────────────────────────────

const actionTypeSchema = z.object({
  actionName: z.string().min(1).max(60),
  actionCode: z.string().min(1).max(30).toUpperCase(),
  isActive: z.boolean().default(true),
});

router.get("/api/v1/rbac/actions", ...guard(RBAC_ACTIONS, "read"), async (req, res, next) => {
  try {
    const search = (req.query.search as string | undefined)?.trim();
    const filter: Record<string, unknown> = { clientCode: env.CLIENT_CODE };
    if (search) {
      const rx = buildSearchRegex(search);
      filter.$or = [{ actionName: rx }, { actionCode: rx }];
    }
    const actions = await ActionTypeModel.find(filter)
      .sort({ actionName: 1 })
      .lean()
      .exec();
    res.json(actions);
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/rbac/actions", ...SUPER_ONLY, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = actionTypeSchema.parse(req.body);
    const action = await ActionTypeModel.create({ ...data, clientCode: env.CLIENT_CODE });
    res.status(201).json(action);
  } catch (error) {
    next(error);
  }
});

router.put("/api/v1/rbac/actions/:id", ...SUPER_ONLY, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = actionTypeSchema.partial().parse(req.body);
    const action = await ActionTypeModel.findOneAndUpdate(
      { _id: req.params.id, clientCode: env.CLIENT_CODE },
      data,
      { new: true }
    ).lean().exec();
    if (!action) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Action type not found.");
    res.json(action);
  } catch (error) {
    next(error);
  }
});

router.delete("/api/v1/rbac/actions/:id", ...SUPER_ONLY, async (_req, res, next) => {
  try {
    await ActionTypeModel.deleteOne({ _id: _req.params.id, clientCode: env.CLIENT_CODE });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ─── RoleMaster ───────────────────────────────────────────────────────────────

const rolePermissionEntrySchema = z.object({
  menuId: z.string(),
  actionTypeId: z.string(),
  granted: z.boolean(),
});

const roleMasterCreateSchema = z.object({
  roleName: z.string().min(1).max(60),
  permissions: z.array(rolePermissionEntrySchema).default([]),
  isActive: z.boolean().default(true),
});

router.get("/api/v1/rbac/roles", ...guard(RBAC_ROLES, "read"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const search = (req.query.search as string | undefined)?.trim();
    const searchFilter = search
      ? { $or: [{ roleName: buildSearchRegex(search) }] }
      : {};

    const isSuperAdmin = req.user!.role === "super_admin";
    if (isSuperAdmin) {
      const roles = await RoleMasterModel.find({ clientCode: env.CLIENT_CODE, ...searchFilter })
        .sort({ roleName: 1 })
        .lean()
        .exec();
      return res.json(roles);
    }
    const employee = await getEmployeeForUser(req.user!.id);
    if (!employee) return res.json([]);

    const descendantIds = await getDescendantIds(employee._id);
    const visibleCreators = [
      employee._id.toString(),
      ...descendantIds.map((id) => id.toString()),
    ];
    const roles = await RoleMasterModel.find({
      clientCode: env.CLIENT_CODE,
      createdBy: { $in: visibleCreators },
      ...searchFilter,
    })
      .sort({ roleName: 1 })
      .lean()
      .exec();
    res.json(roles);
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/rbac/roles", ...guard(RBAC_ROLES, "write"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = roleMasterCreateSchema.parse(req.body);
    const isSuperAdmin = req.user!.role === "super_admin";
    let createdBy: string | null = null;

    if (!isSuperAdmin) {
      const employee = await getEmployeeForUser(req.user!.id);
      if (!employee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      await validateStrictSubset(employee._id.toString(), data.permissions);
      createdBy = employee._id.toString();
    }

    const role = await RoleMasterModel.create({
      ...data,
      clientCode: env.CLIENT_CODE,
      createdBy,
      updatedBy: req.user!.id,
    });
    res.status(201).json(role);
  } catch (error) {
    next(error);
  }
});

router.put("/api/v1/rbac/roles/:id", ...guard(RBAC_ROLES, "edit"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = roleMasterCreateSchema.partial().parse(req.body);
    const isSuperAdmin = req.user!.role === "super_admin";

    const existing = await RoleMasterModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE,
    }).lean().exec() as unknown as LeanRole | null;
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Role not found.");

    if (!isSuperAdmin) {
      const employee = await getEmployeeForUser(req.user!.id);
      if (!employee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");

      // Editing your own role is self-escalation wearing a different hat: the
      // subset check compares the payload against the very role being rewritten,
      // so each save ratchets the ceiling it is measured against.
      if (employee.roleId && String(employee.roleId) === existing._id.toString()) {
        throw new AppError(
          403,
          ERROR_CODES.FORBIDDEN,
          "You cannot edit the role you are assigned to. Ask a super admin."
        );
      }

      const descendantIds = await getDescendantIds(employee._id);
      const visibleCreators = [
        employee._id.toString(),
        ...descendantIds.map((id) => id.toString()),
      ];
      if (!existing.createdBy || !visibleCreators.includes(existing.createdBy)) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You do not have permission to edit this role.");
      }
      if (data.permissions) {
        await validateStrictSubset(employee._id.toString(), data.permissions);
      }
    }

    const updated = await RoleMasterModel.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedBy: req.user!.id },
      { new: true }
    ).lean().exec();
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/api/v1/rbac/roles/:id", ...guard(RBAC_ROLES, "delete"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const isSuperAdmin = req.user!.role === "super_admin";
    const existing = await RoleMasterModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE,
    }).lean().exec() as unknown as LeanRole | null;
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Role not found.");

    if (!isSuperAdmin) {
      const employee = await getEmployeeForUser(req.user!.id);
      if (!employee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      const descendantIds = await getDescendantIds(employee._id);
      const visibleCreators = [
        employee._id.toString(),
        ...descendantIds.map((id) => id.toString()),
      ];
      if (!existing.createdBy || !visibleCreators.includes(existing.createdBy)) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You do not have permission to delete this role.");
      }
    }

    const assignedCount = await EmployeeModel.countDocuments({
      roleId: new mongoose.Types.ObjectId(req.params.id),
    });
    if (assignedCount > 0) {
      throw new AppError(
        400,
        ERROR_CODES.BAD_REQUEST,
        `Cannot delete: ${assignedCount} employee(s) are assigned this role.`
      );
    }

    await RoleMasterModel.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/rbac/roles/:id/impact", ...guard(RBAC_ROLES, "read"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const roleId = req.params.id;
    const removingParam = req.query.removing as string | undefined;
    const removingPerms = removingParam ? removingParam.split(",") : [];

    let affectedRoles = 0;
    if (removingPerms.length > 0) {
      const orClauses = removingPerms.map((perm) => {
        const [menuId, actionTypeId] = perm.split(":");
        return { permissions: { $elemMatch: { menuId, actionTypeId, granted: true } } };
      });
      affectedRoles = await RoleMasterModel.countDocuments({
        clientCode: env.CLIENT_CODE,
        _id: { $ne: new mongoose.Types.ObjectId(roleId) },
        $or: orClauses,
      });
    }

    const affectedEmployees = await EmployeeModel.countDocuments({
      roleId: new mongoose.Types.ObjectId(roleId),
    });

    res.json({ affectedRoles, affectedEmployees });
  } catch (error) {
    next(error);
  }
});

// ─── Employee ─────────────────────────────────────────────────────────────────

const employeeCreateSchema = z.object({
  employeeName: z.string().min(1).max(100),
  emailOffice: z.string().email(),
  department: z.string().max(100).default(""),
  contact: z.string().max(20).default(""),
  roleId: z.string().nullable().optional(),
  parentEmployeeId: z.string().nullable().optional(),
  password: z.string().min(8),
});

const employeeUpdateSchema = z.object({
  employeeName: z.string().min(1).max(100).optional(),
  emailOffice: z.string().email().optional(),
  department: z.string().max(100).optional(),
  contact: z.string().max(20).optional(),
  roleId: z.string().nullable().optional(),
});

router.get("/api/v1/rbac/employees", ...guard(RBAC_EMPLOYEES, "read"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const search = (req.query.search as string | undefined)?.trim();
    const searchFilter = search
      ? {
          $or: [
            { employeeName: buildSearchRegex(search) },
            { emailOffice: buildSearchRegex(search) },
            { department: buildSearchRegex(search) },
          ],
        }
      : {};

    const isSuperAdmin = req.user!.role === "super_admin";

    if (isSuperAdmin) {
      const employees = await EmployeeModel.find({ clientCode: env.CLIENT_CODE, ...searchFilter })
        .populate("roleId", "roleName")
        .populate("parentEmployeeId", "employeeName")
        .sort({ employeeName: 1 })
        .lean()
        .exec();
      return res.json(employees);
    }

    const currentEmployee = await getEmployeeForUser(req.user!.id);
    if (!currentEmployee) return res.json([]);

    const descendantIds = await getDescendantIds(currentEmployee._id);
    const visibleIds = [currentEmployee._id, ...descendantIds];

    const employees = await EmployeeModel.find({
      clientCode: env.CLIENT_CODE,
      _id: { $in: visibleIds },
      ...searchFilter,
    })
      .populate("roleId", "roleName")
      .populate("parentEmployeeId", "employeeName")
      .sort({ employeeName: 1 })
      .lean()
      .exec();
    res.json(employees);
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/rbac/employees", ...guard(RBAC_EMPLOYEES, "write"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = employeeCreateSchema.parse(req.body);
    const isSuperAdmin = req.user!.role === "super_admin";

    let createdBy: string | null = null;
    let ancestorIds: mongoose.Types.ObjectId[] = [];
    let resolvedParentId: mongoose.Types.ObjectId | null = null;

    // Resolved once. The three separate lookups this replaces could each have
    // returned a different answer, and the role check quietly skipped itself
    // when its own copy came back null.
    const actor = isSuperAdmin ? null : await getEmployeeForUser(req.user!.id);
    if (!isSuperAdmin && !actor) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
    }

    if (data.parentEmployeeId) {
      const parent = await EmployeeModel.findById(data.parentEmployeeId).lean().exec() as unknown as LeanEmployee | null;
      if (!parent) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Parent employee not found.");

      if (actor) {
        const descendantIds = await getDescendantIds(actor._id);
        const allowedParentIds = [
          actor._id.toString(),
          ...descendantIds.map((id) => id.toString()),
        ];
        if (!allowedParentIds.includes(parent._id.toString())) {
          throw new AppError(403, ERROR_CODES.FORBIDDEN, "Cannot assign this parent: outside your hierarchy.");
        }
        createdBy = actor._id.toString();
      }

      ancestorIds = [...parent.ancestorIds, parent._id];
      resolvedParentId = parent._id;
    } else if (actor) {
      createdBy = actor._id.toString();
      ancestorIds = [...actor.ancestorIds, actor._id];
      resolvedParentId = actor._id;
    }

    if (data.roleId && actor) {
      await assertRoleAssignable(actor._id.toString(), data.roleId);
    }

    const existingUser = await UserModel.findOne({ email: data.emailOffice }).lean().exec();
    if (existingUser) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "A user with this email already exists.");

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await UserModel.create({
      email: data.emailOffice,
      passwordHash,
      role: "admin",
    });

    const employee = await EmployeeModel.create({
      clientCode: env.CLIENT_CODE,
      userId: user._id,
      employeeName: data.employeeName,
      emailOffice: data.emailOffice,
      department: data.department,
      contact: data.contact,
      roleId: data.roleId ? new mongoose.Types.ObjectId(data.roleId) : null,
      parentEmployeeId: resolvedParentId,
      ancestorIds,
      isActive: true,
      createdBy,
      updatedBy: req.user!.id,
    });

    if (data.roleId) {
      await auditRoleAssignment({
        actorUserId: req.user!.id,
        actorEmail: req.user!.email,
        employeeId: String(employee._id),
        before: null,
        after: data.roleId,
      });
    }

    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
});

router.put("/api/v1/rbac/employees/:id", ...guard(RBAC_EMPLOYEES, "edit"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = employeeUpdateSchema.parse(req.body);
    const isSuperAdmin = req.user!.role === "super_admin";

    const existing = await EmployeeModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE,
    }).lean().exec() as unknown as LeanEmployee | null;
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Employee not found.");

    if (!isSuperAdmin) {
      const currentEmployee = await getEmployeeForUser(req.user!.id);
      if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");

      const isSelf = currentEmployee._id.toString() === existing._id.toString();

      // Self is NOT in this list any more. Including it was the escalation
      // hole: it let an admin aim the role-assignment path at their own row.
      const descendantIds = await getDescendantIds(currentEmployee._id);
      const subordinateIds = descendantIds.map((id) => id.toString());

      if (!isSelf && !subordinateIds.includes(existing._id.toString())) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You do not have permission to edit this employee.");
      }

      if (isSelf) {
        // Editing your own profile is fine; editing your own privileges is the
        // attack. Compared against the stored value rather than merely being
        // present, because the admin panel posts the whole object back and
        // refusing an unchanged field would block editing your own phone number.
        const requestedRole = data.roleId === undefined ? undefined : (data.roleId ? String(data.roleId) : null);
        const currentRole = existing.roleId ? String(existing.roleId) : null;
        if (requestedRole !== undefined && requestedRole !== currentRole) {
          throw new AppError(
            403,
            ERROR_CODES.FORBIDDEN,
            "You cannot change your own role. Ask a super admin or your manager."
          );
        }

        if (data.emailOffice !== undefined && data.emailOffice !== existing.emailOffice) {
          // emailOffice cascades into the User login address below, so allowing
          // it would let an account move its own credentials.
          throw new AppError(
            403,
            ERROR_CODES.FORBIDDEN,
            "You cannot change your own office email — it is also your login address."
          );
        }
      }

      if (data.roleId) {
        await assertRoleAssignable(currentEmployee._id.toString(), data.roleId);
      }
    }

    const updatePayload: Record<string, unknown> = {
      employeeName: data.employeeName,
      department: data.department,
      contact: data.contact,
      updatedBy: req.user!.id,
    };

    if (data.roleId !== undefined) {
      updatePayload.roleId = data.roleId ? new mongoose.Types.ObjectId(data.roleId) : null;
    }
    if (data.emailOffice !== undefined) {
      updatePayload.emailOffice = data.emailOffice;
    }

    const updated = await EmployeeModel.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    ).lean().exec();

    if (data.emailOffice && data.emailOffice !== existing.emailOffice) {
      await UserModel.findByIdAndUpdate(existing.userId, { email: data.emailOffice });
    }

    if (data.roleId !== undefined) {
      const before = existing.roleId ? String(existing.roleId) : null;
      const after = data.roleId ? String(data.roleId) : null;
      if (before !== after) {
        await auditRoleAssignment({
          actorUserId: req.user!.id,
          actorEmail: req.user!.email,
          employeeId: String(existing._id),
          before,
          after,
        });
      }
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/rbac/employees/:id/cascade-impact", ...guard(RBAC_EMPLOYEES, "read"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const empId = new mongoose.Types.ObjectId(req.params.id);
    const descendantIds = await getDescendantIds(empId);
    res.json({ affectedCount: descendantIds.length });
  } catch (error) {
    next(error);
  }
});

router.put("/api/v1/rbac/employees/:id/status", ...guard(RBAC_EMPLOYEES, "edit"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const isSuperAdmin = req.user!.role === "super_admin";

    const existing = await EmployeeModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE,
    }).lean().exec() as unknown as LeanEmployee | null;
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Employee not found.");

    if (!isSuperAdmin) {
      const currentEmployee = await getEmployeeForUser(req.user!.id);
      if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      const descendantIds = await getDescendantIds(currentEmployee._id);
      if (!descendantIds.map((id) => id.toString()).includes(existing._id.toString())) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only change status of your sub-employees.");
      }
    }

    const empId = new mongoose.Types.ObjectId(req.params.id);
    const descendantIds = await getDescendantIds(empId);
    const allAffected = [empId, ...descendantIds];

    // Deactivating also locks access. Otherwise the seed's zero-grant backfill
    // reads a disabled admin as "never configured" and restores the
    // Administrator role on the next cold start — undoing the deactivation
    // without anyone touching this endpoint. Reactivating clears the lock, so
    // the two stay a single decision rather than two switches to remember.
    await EmployeeModel.updateMany(
      { _id: { $in: allAffected } },
      { isActive, accessLocked: !isActive, updatedBy: req.user!.id }
    );

    res.json({ success: true, affected: allAffected.length });
  } catch (error) {
    next(error);
  }
});

// ─── Tasks ────────────────────────────────────────────────────────────────────

const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  assignedTo: z.string(),
  dueDate: z.string().nullable().optional(),
});

const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().nullable().optional(),
});

router.get("/api/v1/rbac/tasks", ...guard(RBAC_TASKS, "read"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const search = (req.query.search as string | undefined)?.trim();
    const isSuperAdmin = req.user!.role === "super_admin";

    if (isSuperAdmin) {
      const filter: Record<string, unknown> = { clientCode: env.CLIENT_CODE };
      if (search) {
        const rx = buildSearchRegex(search);
        filter.$or = [{ title: rx }, { description: rx }];
      }
      const tasks = await RbacTaskModel.find(filter)
        .populate("assignedTo", "employeeName emailOffice")
        .populate("assignedBy", "employeeName emailOffice")
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      return res.json(tasks);
    }

    const currentEmployee = await getEmployeeForUser(req.user!.id);
    if (!currentEmployee) return res.json([]);

    const descendantIds = await getDescendantIds(currentEmployee._id);
    const visibleIds = [currentEmployee._id, ...descendantIds];

    const visibilityClause = {
      $or: [
        { assignedBy: currentEmployee._id },
        { assignedTo: { $in: visibleIds } },
      ],
    };
    const filter: Record<string, unknown> = search
      ? {
          clientCode: env.CLIENT_CODE,
          $and: [
            visibilityClause,
            { $or: [{ title: buildSearchRegex(search) }, { description: buildSearchRegex(search) }] },
          ],
        }
      : { clientCode: env.CLIENT_CODE, ...visibilityClause };

    const tasks = await RbacTaskModel.find(filter)
      .populate("assignedTo", "employeeName emailOffice")
      .populate("assignedBy", "employeeName emailOffice")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/rbac/tasks/assignees", ...guard(RBAC_TASKS, "read"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const isSuperAdmin = req.user!.role === "super_admin";

    if (isSuperAdmin) {
      const employees = await EmployeeModel.find({ clientCode: env.CLIENT_CODE, isActive: true })
        .select("employeeName emailOffice department")
        .sort({ employeeName: 1 })
        .lean()
        .exec();
      return res.json(employees);
    }

    const currentEmployee = await getEmployeeForUser(req.user!.id);
    if (!currentEmployee) return res.json([]);

    const descendantIds = await getDescendantIds(currentEmployee._id);
    const employees = await EmployeeModel.find({
      _id: { $in: descendantIds },
      clientCode: env.CLIENT_CODE,
      isActive: true,
    })
      .select("employeeName emailOffice department")
      .sort({ employeeName: 1 })
      .lean()
      .exec();
    res.json(employees);
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/rbac/tasks", ...guard(RBAC_TASKS, "write"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = taskCreateSchema.parse(req.body);
    const isSuperAdmin = req.user!.role === "super_admin";

    const currentEmployee = await getEmployeeForUser(req.user!.id);
    if (!currentEmployee && !isSuperAdmin) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
    }

    if (!isSuperAdmin && currentEmployee) {
      const descendantIds = await getDescendantIds(currentEmployee._id);
      const allowedAssigneeIds = descendantIds.map((id) => id.toString());
      if (!allowedAssigneeIds.includes(data.assignedTo)) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "Tasks can only be assigned to sub-employees (downward only).");
      }
    }

    const assignedByEmpId = currentEmployee?._id ?? new mongoose.Types.ObjectId();

    const task = await RbacTaskModel.create({
      clientCode: env.CLIENT_CODE,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assignedTo: new mongoose.Types.ObjectId(data.assignedTo),
      assignedBy: assignedByEmpId,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      createdBy: req.user!.id,
      updatedBy: req.user!.id,
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

router.put("/api/v1/rbac/tasks/:id", ...guard(RBAC_TASKS, "edit"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = taskUpdateSchema.parse(req.body);
    const existing = await RbacTaskModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE,
    }).lean().exec() as unknown as { assignedBy: mongoose.Types.ObjectId; assignedTo: mongoose.Types.ObjectId } | null;
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found.");

    const isSuperAdmin = req.user!.role === "super_admin";
    if (!isSuperAdmin) {
      const currentEmployee = await getEmployeeForUser(req.user!.id);
      if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      const isAssigner = existing.assignedBy.toString() === currentEmployee._id.toString();
      const isAssignee = existing.assignedTo.toString() === currentEmployee._id.toString();
      if (!isAssigner && !isAssignee) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only update tasks you assigned or were assigned.");
      }
    }

    const updatePayload: Record<string, unknown> = {
      ...data,
      updatedBy: req.user!.id,
    };
    if (data.dueDate !== undefined) {
      updatePayload.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const updated = await RbacTaskModel.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    ).lean().exec();
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/api/v1/rbac/tasks/:id", ...guard(RBAC_TASKS, "delete"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const existing = await RbacTaskModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE,
    }).lean().exec() as unknown as { assignedBy: mongoose.Types.ObjectId } | null;
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found.");

    const isSuperAdmin = req.user!.role === "super_admin";
    if (!isSuperAdmin) {
      const currentEmployee = await getEmployeeForUser(req.user!.id);
      if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      if (existing.assignedBy.toString() !== currentEmployee._id.toString()) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only delete tasks you created.");
      }
    }

    await RbacTaskModel.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export { router as rbacRoutes };
