import mongoose, { Schema } from "mongoose";

/**
 * One section's copy.
 *
 * Added for B-4. The three bespoke case studies each wrote their own headings —
 * "Engineered for accountability." against "Built for voice at scale." against
 * "Engineered for connection." — while the generic renderer hardcoded a single
 * set for every project. Migrating them onto the generic route without these
 * fields would have replaced three pieces of written positioning with the same
 * stock sentence three times, which is the kind of loss a migration is supposed
 * to avoid and the kind nobody notices in a diff of the code.
 *
 * Every field is optional. Empty means "use the renderer's default", so
 * existing projects are unaffected.
 */
export type SectionHeading = {
  eyebrow: string;
  title: string;
  lead: string;
};

const sectionHeadingSchema = {
  eyebrow: { type: String, default: "" },
  title: { type: String, default: "" },
  lead: { type: String, default: "" }
};

export type PortfolioProjectDocument = {
  slug: string;
  title: string;
  category: string;
  metric: string;
  year: string;
  image: string;
  client: string;
  timeframe: string;
  role: string;
  /**
   * The paragraph under the <h1>. Two of the three case studies open with one;
   * the call-bot page deliberately does not, which is why this is a field and
   * not a required part of the hero.
   */
  intro: string;
  /**
   * The hero's four-cell strip. Free-form label/value pairs rather than the
   * fixed Client/Timeframe/Role/Outcome quartet, because `ai-attendance` labels
   * its second cell "Scale" ("8,000+ daily users") — a timeframe would be a
   * lie there. Falls back to the fixed quartet when empty.
   */
  heroMeta: { label: string; value: string }[];
  sectionHeadings: {
    stack?: SectionHeading;
    roi?: SectionHeading;
    problem?: SectionHeading;
    solution?: SectionHeading;
    screens?: SectionHeading;
    features?: SectionHeading;
    workflow?: SectionHeading;
  };
  /**
   * Eyebrow prefix on the screens carousel: "Screen 01" by default, "Flow 01"
   * on the call-bot case study, where the panels are call flows and not app
   * screens.
   */
  screenLabelPrefix: string;
  stack: string[];
  techStack: string[];
  liveUrl?: string;
  githubUrl?: string;
  problem: string;
  solution: string;
  /**
   * `icon` and `accent` are what made the bespoke feature grids readable: six
   * cards with six different glyphs and accent colours, against the generic
   * renderer's six identical grey lightning bolts. `accent` is a token name
   * resolved to a class on the client, never raw CSS from the database.
   */
  features: { title: string; description: string; icon: string; accent: string }[];
  /** `label` is the overlay caption's prefix — "01 — Verification". */
  gallery: { src: string; caption: string; label: string }[];
  roi: { value: string; label: string; description: string; icon: string }[];
  roiSectionDescription: string;
  screens: { label: string; caption: string; description: string; image: string }[];
  workflowSteps: { step: string; title: string; description: string }[];
  stackSectionDescription: string;
  codeSnippet?: { language: string; label: string; code: string };
  architecture?: string;
  isActive: boolean;
  order: number;
};

const portfolioProjectSchema = new Schema<PortfolioProjectDocument>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    metric: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true },
    client: { type: String, default: "", trim: true },
    timeframe: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    intro: { type: String, default: "" },
    heroMeta: {
      type: [{ label: { type: String, default: "" }, value: { type: String, default: "" } }],
      default: []
    },
    sectionHeadings: {
      type: {
        stack: { type: sectionHeadingSchema, default: undefined },
        roi: { type: sectionHeadingSchema, default: undefined },
        problem: { type: sectionHeadingSchema, default: undefined },
        solution: { type: sectionHeadingSchema, default: undefined },
        screens: { type: sectionHeadingSchema, default: undefined },
        features: { type: sectionHeadingSchema, default: undefined },
        workflow: { type: sectionHeadingSchema, default: undefined }
      },
      default: {}
    },
    screenLabelPrefix: { type: String, default: "" },
    stack: { type: [String], default: [] },
    techStack: { type: [String], default: [] },
    liveUrl: { type: String, trim: true },
    githubUrl: { type: String, trim: true },
    problem: { type: String, default: "" },
    solution: { type: String, default: "" },
    features: {
      type: [{
        title: { type: String },
        description: { type: String },
        icon: { type: String, default: "" },
        accent: { type: String, default: "" }
      }],
      default: []
    },
    gallery: {
      type: [{
        src: { type: String },
        caption: { type: String },
        label: { type: String, default: "" }
      }],
      default: []
    },
    roi: {
      type: [{
        value: { type: String, default: "" },
        label: { type: String, default: "" },
        description: { type: String, default: "" },
        icon: { type: String, default: "" }
      }],
      default: []
    },
    roiSectionDescription: { type: String, default: "" },
    screens: {
      type: [{
        label: { type: String, default: "" },
        caption: { type: String, default: "" },
        description: { type: String, default: "" },
        image: { type: String, default: "" }
      }],
      default: []
    },
    workflowSteps: {
      type: [{
        step: { type: String, default: "" },
        title: { type: String, default: "" },
        description: { type: String, default: "" }
      }],
      default: []
    },
    stackSectionDescription: { type: String, default: "" },
    codeSnippet: {
      type: {
        language: { type: String },
        label: { type: String },
        code: { type: String }
      },
      default: undefined
    },
    architecture: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);

portfolioProjectSchema.index({ isActive: 1, order: 1 });

export const PortfolioProjectModel =
  mongoose.models.PortfolioProject ??
  mongoose.model<PortfolioProjectDocument>("PortfolioProject", portfolioProjectSchema);
