import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { ERROR_CODES } from "@admin-platform/shared-types";
import { z } from "zod";
import { UserModel } from "../../core/auth/user.model";
import { signToken } from "../../core/auth/jwt";
import { AppError } from "../../core/errors/app-error";
import { authenticateJwt } from "../../core/auth/auth.middleware";
import type { AuthenticatedRequest } from "../../core/auth/auth.types";
import { requireRole } from "../../core/rbac/role.middleware";
import type { EmployeeDocument } from "../rbac/employee.model";
import { EmployeeModel } from "../rbac/employee.model";
import type { RoleMasterDocument } from "../rbac/role-master.model";
import { RoleMasterModel } from "../rbac/role-master.model";
import { MenuMasterModel } from "../rbac/menu-master.model";
import { ActionTypeModel } from "../rbac/action-type.model";
import { env } from "../../config/env";
import type mongoose from "mongoose";

type LeanEmployee = EmployeeDocument & { _id: mongoose.Types.ObjectId };
type LeanRole = RoleMasterDocument & { _id: mongoose.Types.ObjectId };

const router = Router();
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/api/v1/auth/login", loginRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body ?? {});

    const user = await UserModel.findOne({ email }).exec();
    if (!user) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid credentials");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid credentials");
    }

    const token = signToken({
      sub: String(user.id),
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: String(user.id),
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid login payload"));
      return;
    }
    next(error);
  }
});

// GET /api/v1/auth/user/me — returns RBAC allowedMenus + permissions map for the current user
router.get(
  "/api/v1/auth/user/me",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const isSuperAdmin = req.user!.role === "super_admin";

      if (isSuperAdmin) {
        const allMenus = await MenuMasterModel.find({
          // clientCode: env.CLIENT_CODE,
          isActive: true,
        })
          .sort({ isRoot: -1, sequence: 1 })
          .lean()
          .exec();
        const allActions = await ActionTypeModel.find({
          // clientCode: env.CLIENT_CODE,
          isActive: true,
        })
          .lean()
          .exec();
        const permissions: Record<string, string[]> = {};
        for (const menu of allMenus) {
          permissions[menu.menuUrl] = allActions.map((a) => a.actionCode);
        }
        return res.json({
          user: req.user,
          allowedMenus: allMenus,
          permissions,
        });
      }

      const employee = (await EmployeeModel.findOne({ userId: req.user!.id })
        .lean()
        .exec()) as unknown as LeanEmployee | null;

      if (!employee || !employee.roleId) {
        return res.json({ user: req.user, allowedMenus: [], permissions: {} });
      }

      const role = (await RoleMasterModel.findById(employee.roleId)
        .lean()
        .exec()) as unknown as LeanRole | null;
      if (!role) {
        return res.json({ user: req.user, allowedMenus: [], permissions: {} });
      }

      const grantedMenuIds = new Set(
        role.permissions.filter((p) => p.granted).map((p) => p.menuId),
      );

      const allowedMenus = await MenuMasterModel.find({
        _id: { $in: Array.from(grantedMenuIds) },
        clientCode: env.CLIENT_CODE,
        isActive: true,
      })
        .sort({ isRoot: -1, sequence: 1 })
        .lean()
        .exec();

      const actionTypeIds = new Set(
        role.permissions.filter((p) => p.granted).map((p) => p.actionTypeId),
      );
      const actionTypes = await ActionTypeModel.find({
        _id: { $in: Array.from(actionTypeIds) },
        clientCode: env.CLIENT_CODE,
        isActive: true,
      })
        .lean()
        .exec();
      const actionCodeMap = new Map(
        actionTypes.map((a) => {
          const typed = a as unknown as {
            _id: mongoose.Types.ObjectId;
            actionCode: string;
          };
          return [typed._id.toString(), typed.actionCode];
        }),
      );

      const permissions: Record<string, string[]> = {};
      for (const perm of role.permissions) {
        if (!perm.granted) continue;
        const menu = allowedMenus.find((m) => {
          const typed = m as unknown as { _id: mongoose.Types.ObjectId };
          return typed._id.toString() === perm.menuId;
        });
        const actionCode = actionCodeMap.get(perm.actionTypeId);
        if (menu && actionCode) {
          const typedMenu = menu as unknown as { menuUrl: string };
          if (!permissions[typedMenu.menuUrl])
            permissions[typedMenu.menuUrl] = [];
          permissions[typedMenu.menuUrl].push(actionCode);
        }
      }

      res.json({
        user: req.user,
        allowedMenus,
        permissions,
        employeeId: employee._id,
        roleName: role.roleName,
      });
    } catch (error) {
      next(error);
    }
  },
);

export const authRoutes = router;
