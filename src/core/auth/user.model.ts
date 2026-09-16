import mongoose, { Schema } from "mongoose";
import type { RoleKey } from "@admin-platform/shared-types";

export type UserDocument = {
  email: string;
  passwordHash: string;
  role: RoleKey;
};

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["super_admin", "admin"], required: true },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);
