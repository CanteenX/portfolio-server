import mongoose, { Schema } from "mongoose";

export type ActionTypeDocument = {
  _id: mongoose.Types.ObjectId;
  clientCode: string;
  actionName: string;
  actionCode: string;
  isActive: boolean;
};

const actionTypeSchema = new Schema<ActionTypeDocument>(
  {
    clientCode: { type: String, required: true },
    actionName: { type: String, required: true, maxlength: 60 },
    actionCode: { type: String, required: true, maxlength: 30 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

actionTypeSchema.index({ clientCode: 1, actionCode: 1 }, { unique: true });

export const ActionTypeModel =
  mongoose.models.ActionType ??
  mongoose.model<ActionTypeDocument>("ActionType", actionTypeSchema);
