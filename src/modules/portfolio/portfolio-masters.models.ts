import mongoose, { Schema } from "mongoose";

// ── Tech Stack ────────────────────────────────────────────────────────────────

export type TechStackDocument = {
  name: string;
  image: string;
  description: string;
  isActive: boolean;
  order: number;
};

const techStackSchema = new Schema<TechStackDocument>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const TechStackModel =
  mongoose.models.PortfolioTechStack ??
  mongoose.model<TechStackDocument>("PortfolioTechStack", techStackSchema);

// ── Category ──────────────────────────────────────────────────────────────────

export type CategoryDocument = { name: string; isActive: boolean; order: number };

const categorySchema = new Schema<CategoryDocument>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const CategoryModel =
  mongoose.models.PortfolioCategory ??
  mongoose.model<CategoryDocument>("PortfolioCategory", categorySchema);

// ── Year ──────────────────────────────────────────────────────────────────────

export type YearDocument = { year: string; isActive: boolean; order: number };

const yearSchema = new Schema<YearDocument>(
  {
    year: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const YearModel =
  mongoose.models.PortfolioYear ??
  mongoose.model<YearDocument>("PortfolioYear", yearSchema);

// ── Client ────────────────────────────────────────────────────────────────────

export type ClientDocument = { name: string; isActive: boolean; order: number };

const clientSchema = new Schema<ClientDocument>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const ClientModel =
  mongoose.models.PortfolioClient ??
  mongoose.model<ClientDocument>("PortfolioClient", clientSchema);
