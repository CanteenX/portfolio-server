import mongoose, { Schema } from "mongoose";

export type MenuMasterDocument = {
  _id: mongoose.Types.ObjectId;
  clientCode: string;
  menuName: string;
  isRoot: boolean;
  isParentMenu: boolean;
  parentMenu: mongoose.Types.ObjectId | null;
  menuUrl: string;
  sequence: number;
  icon: string;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string;
};

const menuMasterSchema = new Schema<MenuMasterDocument>(
  {
    clientCode: { type: String, required: true },
    menuName: { type: String, required: true, maxlength: 100 },
    isRoot: { type: Boolean, required: true, default: true },
    isParentMenu: { type: Boolean, required: true, default: false },
    parentMenu: {
      type: Schema.Types.ObjectId,
      ref: "MenuMaster",
      default: null,
    },
    menuUrl: { type: String, required: true, maxlength: 255 },
    sequence: { type: Number, required: true, default: 0 },
    icon: { type: String, maxlength: 100, default: "" },
    isActive: { type: Boolean, required: true, default: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true },
);

menuMasterSchema.index({ clientCode: 1, menuUrl: 1 }, { unique: true });
menuMasterSchema.index({ clientCode: 1, isRoot: 1, sequence: 1 });

export const MenuMasterModel =
  mongoose.models.MenuMaster ??
  mongoose.model<MenuMasterDocument>("MenuMaster", menuMasterSchema);
