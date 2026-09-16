import mongoose, { Schema } from "mongoose";
import type { RoleKey } from "@admin-platform/shared-types";

export type UserDocument = {
  email: string;
  passwordHash: string;
  role: RoleKey;
  /** Derived from `role`. Read-only — see the virtual below. */
  isSuperAdmin: boolean;
};

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["super_admin", "admin"], required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * `isSuperAdmin` as a derived value, deliberately not a stored column.
 *
 * Two sources of truth for "is this person a super admin" can disagree — a row
 * with `role: "admin"` and `isSuperAdmin: true` has no correct answer, and
 * every guard would have to check both consistently forever or one of them
 * becomes an escalation path.
 *
 * It matters more here than it would elsewhere, because `role` is not just a
 * label: `verifyToken` selects the signing secret from the claimed role
 * (JWT_SECRET_SUPER_ADMIN vs JWT_SECRET_ADMIN), so a forged super-admin token
 * fails signature verification. A stored boolean would move that decision into
 * a database field, where flipping one byte is a full privilege escalation
 * rather than a forgery that cannot be signed.
 *
 * As a virtual it appears on the user object and in JSON exactly as a column
 * would, but there is nothing to flip: it always reflects `role`.
 *
 * The admin frontend computes the same thing client-side in
 * `src/shared/rbac/guards.ts`; this makes the server agree by construction.
 */
userSchema.virtual("isSuperAdmin").get(function (this: { role: RoleKey }): boolean {
  return this.role === "super_admin";
});

export const UserModel = mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);
