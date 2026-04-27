import mongoose, { Schema } from "mongoose";

export type RolePermissionEntry = {
  menuId: string;
  actionTypeId: string;
  granted: boolean;
};

export type RoleMasterDocument = {
  _id: mongoose.Types.ObjectId;
  clientCode: string;
  roleName: string;
  permissions: RolePermissionEntry[];
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string;
};

const rolePermissionSchema = new Schema(
  {
    menuId: { type: String, required: true },
    actionTypeId: { type: String, required: true },
    granted: { type: Boolean, required: true, default: false },
  },
  { _id: false }
);

const roleMasterSchema = new Schema<RoleMasterDocument>(
  {
    clientCode: { type: String, required: true },
    roleName: { type: String, required: true, maxlength: 60 },
    permissions: { type: [rolePermissionSchema], default: [] },
    isActive: { type: Boolean, required: true, default: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

roleMasterSchema.index({ clientCode: 1, roleName: 1 }, { unique: true });

export const RoleMasterModel =
  mongoose.models.RoleMaster ??
  mongoose.model<RoleMasterDocument>("RoleMaster", roleMasterSchema);
