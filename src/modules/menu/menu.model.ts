import mongoose, { Schema } from "mongoose";

// ── Menu Group ─────────────────────────────────────────────────────

export type MenuGroupDocument = {
  _id: mongoose.Types.ObjectId;
  clientCode: string;
  name: string;
  slug: string;
  order: number;
  isLink: boolean;
  route?: string;
  icon?: string;
  createdBy: string;
  updatedBy: string;
};

const menuGroupSchema = new Schema<MenuGroupDocument>(
  {
    clientCode: { type: String, required: true },
    name: { type: String, required: true, maxlength: 100 },
    slug: { type: String, required: true, maxlength: 100 },
    order: { type: Number, required: true, default: 0 },
    isLink: { type: Boolean, required: true, default: false },
    route: { type: String, maxlength: 255 },
    icon: { type: String, maxlength: 100 },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

menuGroupSchema.index({ clientCode: 1, slug: 1 }, { unique: true });
menuGroupSchema.index({ clientCode: 1, order: 1 });

export const MenuGroupModel =
  mongoose.models.MenuGroup ??
  mongoose.model<MenuGroupDocument>("MenuGroup", menuGroupSchema);

// ── Menu Item ──────────────────────────────────────────────────────

export type MenuItemDocument = {
  _id: mongoose.Types.ObjectId;
  clientCode: string;
  groupId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  route: string;
  icon: string;
  parentId: mongoose.Types.ObjectId | null;
  order: number;
  isParent: boolean;
  createdBy: string;
  updatedBy: string;
};

const menuItemSchema = new Schema<MenuItemDocument>(
  {
    clientCode: { type: String, required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "MenuGroup", required: true },
    name: { type: String, required: true, maxlength: 100 },
    slug: { type: String, required: true, maxlength: 100 },
    route: { type: String, required: true, maxlength: 255 },
    icon: { type: String, maxlength: 100, default: "" },
    parentId: { type: Schema.Types.ObjectId, ref: "MenuItem", default: null },
    order: { type: Number, required: true, default: 0 },
    isParent: { type: Boolean, required: true, default: false },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

menuItemSchema.index({ clientCode: 1, groupId: 1, slug: 1 }, { unique: true });
menuItemSchema.index({ clientCode: 1, groupId: 1, order: 1 });

export const MenuItemModel =
  mongoose.models.MenuItem ??
  mongoose.model<MenuItemDocument>("MenuItem", menuItemSchema);
