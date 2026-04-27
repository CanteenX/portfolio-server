import mongoose, { Schema } from "mongoose";
import type { ModuleKey } from "@admin-platform/shared-types";

export type FeatureConfigDocument = {
  clientCode: string;
  enabledModules: ModuleKey[];
  updatedBy?: string;
};

const featureConfigSchema = new Schema<FeatureConfigDocument>(
  {
    clientCode: { type: String, required: true, unique: true },
    enabledModules: { type: [String], required: true, default: [] },
    updatedBy: { type: String }
  },
  { timestamps: true }
);

export const FeatureConfigModel =
  mongoose.models.FeatureConfig ??
  mongoose.model<FeatureConfigDocument>("FeatureConfig", featureConfigSchema);
