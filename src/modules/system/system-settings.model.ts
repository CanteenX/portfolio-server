import mongoose, { Schema } from "mongoose";

export type SystemSettingsDocument = {
  clientCode: string;
  timezone: string;
  defaultCurrency: string;
  locale: string;
  updatedBy?: string;
};

const systemSettingsSchema = new Schema<SystemSettingsDocument>(
  {
    clientCode: { type: String, required: true, unique: true },
    timezone: { type: String, required: true, default: "UTC" },
    defaultCurrency: { type: String, required: true, default: "USD", maxlength: 3 },
    locale: { type: String, required: true, default: "en-US" },
    updatedBy: { type: String }
  },
  { timestamps: true }
);

export const SystemSettingsModel =
  mongoose.models.SystemSettings ??
  mongoose.model<SystemSettingsDocument>("SystemSettings", systemSettingsSchema);
