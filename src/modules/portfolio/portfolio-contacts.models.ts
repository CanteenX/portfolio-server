import mongoose, { Schema } from "mongoose";

export type PortfolioContactDocument = {
  name: string;
  email: string;
  service: string;
  callSlot: string;
  message: string;
  status: "new" | "read" | "replied";
};

const portfolioContactSchema = new Schema<PortfolioContactDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 300 },
    service: { type: String, default: "", trim: true },
    callSlot: { type: String, default: "", trim: true },
    message: { type: String, required: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
      index: true
    }
  },
  { timestamps: true }
);

portfolioContactSchema.index({ status: 1, createdAt: -1 });

export const PortfolioContactModel =
  mongoose.models.PortfolioContact ??
  mongoose.model<PortfolioContactDocument>("PortfolioContact", portfolioContactSchema);
