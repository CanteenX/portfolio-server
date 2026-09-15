import mongoose, { Schema } from "mongoose";

/** Budget bands, kept coarse so answering is a click rather than a disclosure. */
export const BUDGET_BANDS = ["<2L", "2-5L", "5-15L", "15L+", "not-sure"] as const;
export const TIMELINES = ["asap", "1-3-months", "3-6-months", "exploring"] as const;

export type PortfolioContactDocument = {
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  budgetBand: string;
  timeline: string;
  callSlot: string;
  message: string;
  /**
   * Where the visitor came from, captured SERVER-side from the request headers.
   *
   * Never from a hidden form field: a client-supplied referrer is attacker- and
   * adblocker-controlled, so attribution built on it is fiction. The header is
   * not perfect either, but it is at least not self-reported.
   */
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  /**
   * The exact consent wording shown at submission time, stored verbatim.
   *
   * A boolean "consented: true" is not evidence. When a subject or a regulator
   * asks what someone agreed to, the answer has to be the text as it was on the
   * day — which changes when the privacy policy is edited, so a reference to
   * the current policy would not answer the question either.
   */
  consentText: string;
  consentAt: Date | null;
  status: "new" | "read" | "replied";
};

const portfolioContactSchema = new Schema<PortfolioContactDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 300 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    company: { type: String, default: "", trim: true, maxlength: 200 },
    service: { type: String, default: "", trim: true },
    // Stored as free strings rather than enums: these are qualification hints,
    // and a submission must never be rejected because the options list moved on
    // while someone had the form open.
    budgetBand: { type: String, default: "", trim: true, maxlength: 40 },
    timeline: { type: String, default: "", trim: true, maxlength: 40 },
    callSlot: { type: String, default: "", trim: true },
    message: { type: String, required: true, maxlength: 5000 },

    referrer: { type: String, default: "", trim: true, maxlength: 500 },
    utmSource: { type: String, default: "", trim: true, maxlength: 120 },
    utmMedium: { type: String, default: "", trim: true, maxlength: 120 },
    utmCampaign: { type: String, default: "", trim: true, maxlength: 120 },

    consentText: { type: String, default: "", trim: true, maxlength: 1000 },
    consentAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
      index: true
    }
  },
  { timestamps: true }
);

portfolioContactSchema.index({ status: 1, createdAt: -1 });

export const PortfolioContactModel =
  mongoose.models.PortfolioContact ??
  mongoose.model<PortfolioContactDocument>("PortfolioContact", portfolioContactSchema);
