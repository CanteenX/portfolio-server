import mongoose, { Schema } from "mongoose";

/**
 * One service the business sells.
 *
 * Replaces `PortfolioSettings.services`, which was a bare `string[]`. The
 * website joined those strings back to hardcoded descriptions BY EXACT TITLE
 * MATCH, so renaming "CRM Panel" to "CRM & Admin Panels" in the admin panel
 * silently blanked that service's description and tags on the live /services
 * page. The lookup key was editable content — the rename could not help but
 * break it.
 *
 * `slug` is the stable identity. Titles are free to change.
 */
export type PortfolioServiceDocument = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  /** Key into the website's icon registry; unknown values fall back to a default. */
  icon: string;
  /** Bullet points for the homepage carousel's expanded panel. */
  pointers: string[];
  /** Short capability chips shown under the carousel subtitle. */
  highlights: string[];
  /**
   * Whether this service appears in the contact form's dropdown. Kept separate
   * from `isActive` so a service can be advertised while not yet accepting
   * enquiries, and vice versa.
   */
  showInContactForm: boolean;
  isActive: boolean;
  order: number;
};

const portfolioServiceSchema = new Schema<PortfolioServiceDocument>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    subtitle: { type: String, default: "", trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 2000 },
    tags: { type: [String], default: [] },
    icon: { type: String, default: "", trim: true },
    pointers: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    showInContactForm: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

portfolioServiceSchema.index({ isActive: 1, order: 1 });

export const PortfolioServiceModel =
  mongoose.models.PortfolioService ??
  mongoose.model<PortfolioServiceDocument>("PortfolioService", portfolioServiceSchema);
