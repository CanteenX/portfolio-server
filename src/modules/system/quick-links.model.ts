import mongoose, { Schema } from "mongoose";

export type QuickLinkDocument = {
  _id: mongoose.Types.ObjectId;
  clientCode: string;
  name: string;
  url: string;
  iconUrl: string;
  order: number;
  createdBy: string;
  updatedBy: string;
};

const quickLinkSchema = new Schema<QuickLinkDocument>(
  {
    clientCode: { type: String, required: true },
    name: { type: String, required: true, maxlength: 60 },
    url: { type: String, required: true, maxlength: 2048 },
    iconUrl: { type: String, maxlength: 2048, default: "" },
    order: { type: Number, required: true, default: 0 },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

quickLinkSchema.index({ clientCode: 1, order: 1 });

export const QuickLinkModel =
  mongoose.models.QuickLink ??
  mongoose.model<QuickLinkDocument>("QuickLink", quickLinkSchema);
