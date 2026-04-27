import mongoose, { Schema } from "mongoose";

export type BrandingDocument = {
  clientCode: string;
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  updatedBy?: string;
};

const brandingSchema = new Schema<BrandingDocument>(
  {
    clientCode: { type: String, required: true, unique: true },
    companyName: { type: String, required: true, default: "Admin Platform" },
    logoUrl: { type: String, default: "" },
    primaryColor: { type: String, required: true, default: "#1976d2" },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const BrandingModel =
  mongoose.models.Branding ??
  mongoose.model<BrandingDocument>("Branding", brandingSchema);
