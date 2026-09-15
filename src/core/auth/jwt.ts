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

/**
 * Verifies a token against the secret that belongs to the role it claims.
 *
 * This used to try BOTH secrets in turn and return whichever payload verified,
 * which meant the `role` claim was trusted because it was *present*, not
 * because it was *signed by the matching key*. Anyone holding the admin secret
 * could mint `role: "super_admin"` and it would verify against the admin
 * secret and then be believed — defeating the entire point of provisioning two
 * separate keys, and handing out a super-admin bypass (see
 * requireRbacPermission) to whoever leaked the lesser secret.
 *
 * The role is read from the UNVERIFIED payload only to pick which key to check
 * against. That is safe: a forged role selects a secret the attacker does not
 * hold, so verification fails. The payload is never trusted until after
 * jwt.verify returns.
 */
export function verifyToken(token: string): JwtPayload {
  const claimed = jwt.decode(token) as Partial<JwtPayload> | null;
  const role = claimed?.role;

  if (role !== "super_admin" && role !== "admin") {
    throw new jwt.JsonWebTokenError("Invalid or expired token");
  }

  const payload = jwt.verify(token, getSecret(role)) as JwtPayload;

  // Defence in depth: a token whose verified role somehow differs from the one
  // used to select the key must not pass.
  if (payload.role !== role) {
    throw new jwt.JsonWebTokenError("Invalid or expired token");
  }

  return payload;
}
