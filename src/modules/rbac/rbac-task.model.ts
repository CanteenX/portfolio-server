import mongoose, { Schema } from "mongoose";

export type RbacTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type RbacTaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type RbacTaskDocument = {
  _id: mongoose.Types.ObjectId;
  clientCode: string;
  title: string;
  description: string;
  status: RbacTaskStatus;
  priority: RbacTaskPriority;
  assignedTo: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  dueDate: Date | null;
  createdBy: string;
  updatedBy: string;
};

const rbacTaskSchema = new Schema<RbacTaskDocument>(
  {
    clientCode: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000, default: "" },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "DONE"],
      required: true,
      default: "TODO",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true,
      default: "MEDIUM",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    dueDate: { type: Date, default: null },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

rbacTaskSchema.index({ clientCode: 1, assignedTo: 1 });
rbacTaskSchema.index({ clientCode: 1, assignedBy: 1 });

export const RbacTaskModel =
  mongoose.models.RbacTask ??
  mongoose.model<RbacTaskDocument>("RbacTask", rbacTaskSchema);
