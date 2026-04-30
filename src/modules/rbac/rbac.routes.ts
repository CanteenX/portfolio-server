import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { Router } from "express";
import { z } from "zod";
import { ERROR_CODES } from "@admin-platform/shared-types";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { AppError } from "../../core/errors/app-error";
import { requireRole } from "../../core/rbac/role.middleware";
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
const AUTH = [authenticateJwt, requireRole(["super_admin", "admin"])];
const SUPER_ONLY = [authenticateJwt, requireRole(["super_admin"])];

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

async function validateStrictSubset(
  actorEmployeeId: string,
  newPermissions: Array<{ menuId: string; actionTypeId: string; granted: boolean }>
): Promise<void> {
  const actor = await EmployeeModel.findById(actorEmployeeId).lean().exec() as unknown as LeanEmployee | null;
  if (!actor?.roleId) {
    throw new AppError(403, ERROR_CODES.FORBIDDEN, "You have no role assigned, cannot create/update roles.");
  }
  const actorRole = await RoleMasterModel.findById(actor.roleId).lean().exec() as unknown as LeanRole | null;
  if (!actorRole) {
    throw new AppError(403, ERROR_CODES.FORBIDDEN, "Your assigned role could not be found.");
  }
  const actorGranted = new Set<string>(
    actorRole.permissions
      .filter((p) => p.granted)
      .map((p) => `${p.menuId}:${p.actionTypeId}`)
  );
  for (const perm of newPermissions) {
    if (perm.granted && !actorGranted.has(`${perm.menuId}:${perm.actionTypeId}`)) {
      throw new AppError(
        403,
        ERROR_CODES.FORBIDDEN,
        "Cannot save role: contains permissions exceeding your current access level."
      );
    }
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

router.get("/api/v1/rbac/menus", ...AUTH, async (req, res, next) => {
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
      const parent = await MenuMasterModel.findOne({ _id: parentId, clientCode: env.CLIENT_CODE }).lean().exec();
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
      const parent = await MenuMasterModel.findOne({ _id: parentId, clientCode: env.CLIENT_CODE }).lean().exec();
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

router.get("/api/v1/rbac/actions", ...AUTH, async (req, res, next) => {
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

router.get("/api/v1/rbac/roles", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

router.post("/api/v1/rbac/roles", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

router.put("/api/v1/rbac/roles/:id", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

router.delete("/api/v1/rbac/roles/:id", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

router.get("/api/v1/rbac/roles/:id/impact", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

router.get("/api/v1/rbac/employees", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

router.post("/api/v1/rbac/employees", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = employeeCreateSchema.parse(req.body);
    const isSuperAdmin = req.user!.role === "super_admin";

    let createdBy: string | null = null;
    let ancestorIds: mongoose.Types.ObjectId[] = [];
    let resolvedParentId: mongoose.Types.ObjectId | null = null;

    if (data.parentEmployeeId) {
      const parent = await EmployeeModel.findById(data.parentEmployeeId).lean().exec() as unknown as LeanEmployee | null;
      if (!parent) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Parent employee not found.");

      if (!isSuperAdmin) {
        const currentEmployee = await getEmployeeForUser(req.user!.id);
        if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
        const descendantIds = await getDescendantIds(currentEmployee._id);
        const allowedParentIds = [
          currentEmployee._id.toString(),
          ...descendantIds.map((id) => id.toString()),
        ];
        if (!allowedParentIds.includes(parent._id.toString())) {
          throw new AppError(403, ERROR_CODES.FORBIDDEN, "Cannot assign this parent: outside your hierarchy.");
        }
        createdBy = currentEmployee._id.toString();
      }

      ancestorIds = [...parent.ancestorIds, parent._id];
      resolvedParentId = parent._id;
    } else if (!isSuperAdmin) {
      const currentEmployee = await getEmployeeForUser(req.user!.id);
      if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      createdBy = currentEmployee._id.toString();
      ancestorIds = [...currentEmployee.ancestorIds, currentEmployee._id];
      resolvedParentId = currentEmployee._id;
    }

    if (data.roleId && !isSuperAdmin) {
      const actor = await getEmployeeForUser(req.user!.id);
      if (actor) {
        const descendantIds = await getDescendantIds(actor._id);
        const visibleRoleCreators = [
          actor._id.toString(),
          ...descendantIds.map((id) => id.toString()),
        ];
        const role = await RoleMasterModel.findById(data.roleId).lean().exec() as unknown as LeanRole | null;
        if (role?.createdBy && !visibleRoleCreators.includes(role.createdBy)) {
          throw new AppError(403, ERROR_CODES.FORBIDDEN, "Cannot assign a role outside your visible roles.");
        }
      }
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

    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
});

router.put("/api/v1/rbac/employees/:id", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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
      const descendantIds = await getDescendantIds(currentEmployee._id);
      const visibleIds = [
        currentEmployee._id.toString(),
        ...descendantIds.map((id) => id.toString()),
      ];
      if (!visibleIds.includes(existing._id.toString())) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You do not have permission to edit this employee.");
      }

      if (data.roleId) {
        const role = await RoleMasterModel.findById(data.roleId).lean().exec() as unknown as LeanRole | null;
        const visibleRoleCreators = [
          currentEmployee._id.toString(),
          ...descendantIds.map((id) => id.toString()),
        ];
        if (role?.createdBy && !visibleRoleCreators.includes(role.createdBy)) {
          throw new AppError(403, ERROR_CODES.FORBIDDEN, "Cannot assign a role outside your visible roles.");
        }
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

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.get("/api/v1/rbac/employees/:id/cascade-impact", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
  try {
    const empId = new mongoose.Types.ObjectId(req.params.id);
    const descendantIds = await getDescendantIds(empId);
    res.json({ affectedCount: descendantIds.length });
  } catch (error) {
    next(error);
  }
});

router.put("/api/v1/rbac/employees/:id/status", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

    await EmployeeModel.updateMany(
      { _id: { $in: allAffected } },
      { isActive, updatedBy: req.user!.id }
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

router.get("/api/v1/rbac/tasks", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

router.get("/api/v1/rbac/tasks/assignees", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

router.post("/api/v1/rbac/tasks", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

router.put("/api/v1/rbac/tasks/:id", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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

router.delete("/api/v1/rbac/tasks/:id", ...AUTH, async (req: AuthenticatedRequest, res, next) => {
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
