import mongoose, { Schema } from "mongoose";

/**
 * Social proof is three separate collections rather than one polymorphic one.
 *
 * A testimonial, a client logo and a headline metric share nothing but the fact
 * that marketing calls them all "social proof" — a single schema would be
 * mostly-null columns plus a discriminator, and every read would have to
 * re-narrow the type.
 *
 * All three ship EMPTY. The website collapses each section when it has no rows,
 * because an invented testimonial attributed to a named person at a named
 * company is not a placeholder — it is a false claim on a page that asks people
 * for money. The machinery is built now so real content is a paste, not a
 * deploy.
 */

export type PortfolioTestimonialDocument = {
  quote: string;
  authorName: string;
  authorRole: string;
  authorCompany: string;
  avatar: string;
  /** Optional, so a testimonial without one renders no stars rather than zero. */
  rating?: number;
  isActive: boolean;
  order: number;
};

const testimonialSchema = new Schema<PortfolioTestimonialDocument>(
  {
    quote: { type: String, required: true, trim: true, maxlength: 1200 },
    authorName: { type: String, required: true, trim: true, maxlength: 120 },
    authorRole: { type: String, default: "", trim: true, maxlength: 120 },
    authorCompany: { type: String, default: "", trim: true, maxlength: 120 },
    avatar: { type: String, default: "", trim: true },
    rating: { type: Number, min: 1, max: 5 },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

testimonialSchema.index({ isActive: 1, order: 1 });

export const PortfolioTestimonialModel =
  mongoose.models.PortfolioTestimonial ??
  mongoose.model<PortfolioTestimonialDocument>("PortfolioTestimonial", testimonialSchema);

export type PortfolioClientLogoDocument = {
  name: string;
  logo: string;
  /** Left blank unless the client has agreed to be linked. */
  websiteUrl: string;
  isActive: boolean;
  order: number;
};

const clientLogoSchema = new Schema<PortfolioClientLogoDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    logo: { type: String, default: "", trim: true },
    websiteUrl: { type: String, default: "", trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

clientLogoSchema.index({ isActive: 1, order: 1 });

export const PortfolioClientLogoModel =
  mongoose.models.PortfolioClientLogo ??
  mongoose.model<PortfolioClientLogoDocument>("PortfolioClientLogo", clientLogoSchema);

export type PortfolioMetricDocument = {
  /** Free text, not a number: "40+", "99.9%" and "8,000+" are all valid. */
  value: string;
  label: string;
  description: string;
  isActive: boolean;
  order: number;
};

const metricSchema = new Schema<PortfolioMetricDocument>(
  {
    value: { type: String, required: true, trim: true, maxlength: 40 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 400 },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

metricSchema.index({ isActive: 1, order: 1 });

export const PortfolioMetricModel =
  mongoose.models.PortfolioMetric ??
  mongoose.model<PortfolioMetricDocument>("PortfolioMetric", metricSchema);
