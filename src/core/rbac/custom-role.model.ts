import mongoose, { Schema } from "mongoose";

export type StructuredPermissionDoc = {
  menuId?: string;
  menuGroupId?: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
};

export type CustomRoleDocument = {
  _id: mongoose.Types.ObjectId;
  clientCode: string;
  name: string;
  permissions: string[];
  structuredPermissions: StructuredPermissionDoc[];
  createdBy: string;
  updatedBy: string;
};

const structuredPermissionSchema = new Schema(
  {
    menuId: { type: String },
    menuGroupId: { type: String },
    read: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    export: { type: Boolean, default: false },
  },
  { _id: false }
);

const customRoleSchema = new Schema<CustomRoleDocument>(
  {
    clientCode: { type: String, required: true },
    name: { type: String, required: true, maxlength: 60 },
    permissions: { type: [String], required: true, default: [] },
    structuredPermissions: { type: [structuredPermissionSchema], default: [] },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

customRoleSchema.index({ clientCode: 1, name: 1 }, { unique: true });

export const CustomRoleModel =
  mongoose.models.CustomRole ??
  mongoose.model<CustomRoleDocument>("CustomRole", customRoleSchema);
