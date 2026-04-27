import mongoose, { Schema } from "mongoose";

export type WaOptOutDocument = {
  phone: string;
  clientCode: string;
  optedOutAt: Date;
  keyword: string;
};

const waOptOutSchema = new Schema<WaOptOutDocument>(
  {
    phone: { type: String, required: true, index: true },
    clientCode: { type: String, required: true, index: true },
    optedOutAt: { type: Date, default: Date.now },
    keyword: { type: String, required: true },
  },
  { timestamps: false }
);

waOptOutSchema.index({ phone: 1, clientCode: 1 }, { unique: true });

export const WaOptOutModel =
  mongoose.models.WaOptOut ??
  mongoose.model<WaOptOutDocument>("WaOptOut", waOptOutSchema);
