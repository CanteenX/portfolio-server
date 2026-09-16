import mongoose, { Schema } from "mongoose";

/**
 * Frequently asked questions.
 *
 * `category` groups questions on the page — "Engagement", "Delivery",
 * "Commercials" — and is free text rather than an enum so a new grouping is an
 * edit, not a migration. Ungrouped questions render first, under no heading.
 *
 * Kept as its own collection rather than a field on settings because the
 * FAQPage structured data wants one node per question, and because these rows
 * are reordered and retired individually.
 */
export type PortfolioFaqDocument = {
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  order: number;
};

const faqSchema = new Schema<PortfolioFaqDocument>(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true, trim: true, maxlength: 4000 },
    category: { type: String, default: "", trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

faqSchema.index({ isActive: 1, order: 1 });

export const PortfolioFaqModel =
  mongoose.models.PortfolioFaq ?? mongoose.model<PortfolioFaqDocument>("PortfolioFaq", faqSchema);
