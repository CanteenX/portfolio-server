import mongoose, { Schema } from "mongoose";

export type EmployeeDocument = {
  _id: mongoose.Types.ObjectId;
  clientCode: string;
  userId: mongoose.Types.ObjectId;
  employeeName: string;
  emailOffice: string;
  department: string;
  contact: string;
  roleId: mongoose.Types.ObjectId | null;
  parentEmployeeId: mongoose.Types.ObjectId | null;
  ancestorIds: mongoose.Types.ObjectId[];
  isActive: boolean;
  /**
   * "Leave this employee's access alone."
   *
   * The seed promotes any admin holding no effective grants to the
   * Administrator role, because before enforcement existed nobody had a reason
   * to populate a role and the alternative is locking out the owner on deploy.
   * That rule cannot distinguish "never configured" from "deliberately stripped
   * of access", so without this flag, revoking someone's grants lasts only
   * until the next cold start — and the boot log is the only trace.
   *
   * Set on deactivation and by anyone intentionally reducing access.
   */
  accessLocked: boolean;
  createdBy: string | null;
  updatedBy: string;
};

const employeeSchema = new Schema<EmployeeDocument>(
  {
    clientCode: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    employeeName: { type: String, required: true, maxlength: 100 },
    emailOffice: { type: String, required: true },
    department: { type: String, maxlength: 100, default: "" },
    contact: { type: String, maxlength: 20, default: "" },
    roleId: { type: Schema.Types.ObjectId, ref: "RoleMaster", default: null },
    parentEmployeeId: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    ancestorIds: { type: [Schema.Types.ObjectId], default: [] },
    isActive: { type: Boolean, required: true, default: true },
    accessLocked: { type: Boolean, required: true, default: false },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

employeeSchema.index({ clientCode: 1 });
employeeSchema.index({ ancestorIds: 1 });
employeeSchema.index({ clientCode: 1, emailOffice: 1 });

export const EmployeeModel =
  mongoose.models.Employee ??
  mongoose.model<EmployeeDocument>("Employee", employeeSchema);
