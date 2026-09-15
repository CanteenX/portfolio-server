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
import { buildRbacSnapshot } from "../../core/rbac/rbac-permission.middleware";


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

// GET /api/v1/auth/user/me — RBAC snapshot for the current user
//
// Delegates to buildRbacSnapshot so this and the session bootstrap can never
// disagree about what a user may do. They used to compute the same map
// independently, which is how a client ends up rendering buttons the server
// then rejects.
router.get(
  "/api/v1/auth/user/me",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const snapshot = await buildRbacSnapshot(req.user!.id, req.user!.role);
      res.json({
        user: req.user,
        allowedMenus: snapshot.allowedMenus,
        permissions: snapshot.permissions,
        employeeId: snapshot.employeeId,
        roleName: snapshot.roleName
      });
    } catch (error) {
      next(error);
    }
  }
);

export const authRoutes = router;
