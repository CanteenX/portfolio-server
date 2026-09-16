import mongoose, { Schema } from "mongoose";

/**
 * Legal documents — privacy policy, terms, and whatever else the business has
 * to publish.
 *
 * Structured as headed sections rather than one blob of HTML or markdown. Two
 * reasons, both deliberate:
 *
 *  - Nothing the site renders from this collection is ever passed to
 *    `dangerouslySetInnerHTML`. A legal screen is editable by a human under
 *    time pressure and is the last place to accept arbitrary markup.
 *  - Sections give the rendered page real <h2> structure, which is what makes
 *    a policy navigable by a screen reader and legible to a crawler.
 *
 * Paragraph breaks inside `body` are blank lines; the renderer splits on them.
 *
 * `slug` is the URL segment. `/privacy` and `/terms` are wired to fixed routes
 * because they are linked from the footer and the sitemap; anything else
 * published here appears at `/legal/<slug>`.
 */
export type LegalSection = {
  heading: string;
  body: string;
};

export type LegalDocumentDocument = {
  slug: string;
  title: string;
  /**
   * Shown under the title. Free text rather than a Date because "Last updated"
   * on a policy is a statement the business makes, not a row timestamp — it
   * should not move because someone fixed a typo.
   */
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  /**
   * Unpublished documents are invisible to the site entirely, which is what
   * lets a draft revision be written without the live policy changing. The
   * shipped page keeps rendering until this is ticked.
   */
  isPublished: boolean;
  order: number;
};

const legalDocumentSchema = new Schema<LegalDocumentDocument>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    lastUpdated: { type: String, default: "", trim: true, maxlength: 40 },
    intro: { type: String, default: "", trim: true, maxlength: 4000 },
    sections: {
      type: [
        {
          heading: { type: String, default: "", trim: true, maxlength: 200 },
          body: { type: String, default: "", trim: true, maxlength: 20000 }
        }
      ],
      default: []
    },
    isPublished: { type: Boolean, default: false, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

legalDocumentSchema.index({ isPublished: 1, order: 1 });

export const LegalDocumentModel =
  mongoose.models.LegalDocument ??
  mongoose.model<LegalDocumentDocument>("LegalDocument", legalDocumentSchema);
