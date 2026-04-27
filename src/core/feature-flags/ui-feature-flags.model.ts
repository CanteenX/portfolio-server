import mongoose, { Schema } from "mongoose";

export type UIFeatureFlagsDocument = {
  clientCode: string;
  flags: Record<string, boolean>;
  updatedBy?: string;
};

const uiFeatureFlagsSchema = new Schema<UIFeatureFlagsDocument>(
  {
    clientCode: { type: String, required: true, unique: true },
    flags: { type: Schema.Types.Mixed, required: true, default: {} },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const UIFeatureFlagsModel =
  mongoose.models.UIFeatureFlags ??
  mongoose.model<UIFeatureFlagsDocument>("UIFeatureFlags", uiFeatureFlagsSchema);
