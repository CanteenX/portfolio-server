import { MODULE_KEYS } from "@admin-platform/shared-types";
import type { ModuleKey } from "@admin-platform/shared-types";
import mongoose, { Schema } from "mongoose";

export type ResourceRecordDocument = {
  moduleKey: ModuleKey;
  title: string;
  description?: string;
  status: "active" | "inactive" | "archived";
  data?: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
};

const resourceRecordSchema = new Schema<ResourceRecordDocument>(
  {
    moduleKey: { type: String, enum: MODULE_KEYS, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    data: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: String },
    updatedBy: { type: String }
  },
  { timestamps: true }
);

resourceRecordSchema.index({ moduleKey: 1, createdAt: -1 });

export const ResourceRecordModel =
  mongoose.models.ResourceRecord ??
  mongoose.model<ResourceRecordDocument>("ResourceRecord", resourceRecordSchema);
