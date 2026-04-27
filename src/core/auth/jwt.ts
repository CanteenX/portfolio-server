import jwt from "jsonwebtoken";
import type { RoleKey } from "@admin-platform/shared-types";
import { env } from "../../config/env";

type JwtPayload = {
  sub: string;
  email: string;
  role: RoleKey;
};

function getSecret(role: RoleKey): string {
  return role === "super_admin" ? env.JWT_SECRET_SUPER_ADMIN : env.JWT_SECRET_ADMIN;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(payload.role), {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
}

export function verifyToken(token: string): JwtPayload {
  const secrets = [env.JWT_SECRET_SUPER_ADMIN, env.JWT_SECRET_ADMIN];
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret) as JwtPayload;
    } catch {
      // try next secret
    }
  }
  throw new jwt.JsonWebTokenError("Invalid or expired token");
}
