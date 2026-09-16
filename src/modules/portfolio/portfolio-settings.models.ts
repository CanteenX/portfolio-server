import mongoose, { Schema } from "mongoose";

/**
 * A page's or section's heading block.
 *
 * Same shape as the per-project headings added in B-4, for the same reason:
 * every marketing page on the site opened with an eyebrow, an <h1> and a lead
 * paragraph hardcoded in its view file, so the words a visitor reads first were
 * the words only a deploy could change.
 *
 * Fields are individually optional. An empty string means "use the shipped
 * copy", so a half-finished edit cannot blank a heading.
 */
export type PageCopy = {
  eyebrow: string;
  title: string;
  lead: string;
};

const pageCopySchema = {
  eyebrow: { type: String, default: "" },
  title: { type: String, default: "" },
  lead: { type: String, default: "" }
};

export type PortfolioSettingsDocument = {
  hero: {
    tagline: string;
    description: string;
    ctaPrimary: { label: string; href: string };
    ctaSecondary: { label: string; href: string };
    featuredProjects: { title: string; description: string; href: string; image: string; eyebrow: string }[];
  };
  navbar: {
    brandName: string;
    links: { label: string; href: string }[];
  };
  footer: {
    description: string;
    email: string;
    version: string;
    links: { label: string; href: string }[];
  };
  techMarquee: string[];
  callSlots: string[];
  about: {
    vision: string;
    mission: string;
    values: { icon: string; title: string; desc: string }[];
    stats: { label: string; value: string }[];
  };
  process: {
    phases: { id: string; n: string; title: string; description: string; accent: string; dot: string }[];
    perks: { title: string; description: string; icon: string; gradient: string; border: string }[];
  };
  teamPlaybook: { phase: string; name: string; body: string }[];
  contactInfo: {
    email: string;
    phone: string;
  };
  /** Headings for the pages that are a single composition rather than a list. */
  pageCopy: {
    work?: PageCopy;
    services?: PageCopy;
    team?: PageCopy;
    about?: PageCopy;
    process?: PageCopy;
    contact?: PageCopy;
    insights?: PageCopy;
    faq?: PageCopy;
  };
  /**
   * The closing call to action, which appears on nine routes.
   *
   * It was one hardcoded component, so the site's most repeated sentence was
   * also its least editable.
   */
  contactCta: {
    eyebrow: string;
    title: string;
    lead: string;
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  };
  /**
   * The enquiry form's two qualification dropdowns.
   *
   * Editable because they are commercial positioning, not UI: the bands decide
   * which enquiries arrive, and a band that no longer matches what the company
   * takes on is a lead-quality problem the marketing owner should be able to fix
   * without an engineer.
   */
  contactForm: {
    budgetBands: string[];
    timelines: string[];
  };
  /**
   * The engagement-model block on /how-we-work (B-7b).
   *
   * Deliberately bands and durations rather than a price list — the point is to
   * stop a qualified buyer leaving because they cannot tell whether they can
   * afford a conversation. Empty `bands` collapses the section entirely, so the
   * decision to publish commercials at all stays with the owner.
   */
  engagement: {
    eyebrow: string;
    title: string;
    lead: string;
    bands: { name: string; range: string; duration: string; description: string }[];
    footnote: string;
  };
  isActive: boolean;
};

const portfolioSettingsSchema = new Schema<PortfolioSettingsDocument>(
  {
    hero: {
      tagline: { type: String, default: "" },
      description: { type: String, default: "" },
      ctaPrimary: { label: { type: String, default: "View Work" }, href: { type: String, default: "/work" } },
      ctaSecondary: { label: { type: String, default: "Contact Us" }, href: { type: String, default: "/contact" } },
      featuredProjects: {
        type: [
          {
            title: { type: String },
            description: { type: String },
            href: { type: String },
            image: { type: String },
            eyebrow: { type: String }
          }
        ],
        default: []
      }
    },
    navbar: {
      brandName: { type: String, default: "NVENTRA" },
      links: {
        type: [{ label: { type: String }, href: { type: String } }],
        default: []
      }
    },
    footer: {
      description: { type: String, default: "" },
      email: { type: String, default: "" },
      version: { type: String, default: "v1.0" },
      links: {
        type: [{ label: { type: String }, href: { type: String } }],
        default: []
      }
    },
    techMarquee: { type: [String], default: [] },
    // `services` was removed here deliberately — see PortfolioService. Existing
    // documents may still carry the field; it is ignored on read and stripped
    // on the next save.
    callSlots: { type: [String], default: [] },
    about: {
      vision: { type: String, default: "" },
      mission: { type: String, default: "" },
      values: {
        type: [{ icon: { type: String }, title: { type: String }, desc: { type: String } }],
        default: []
      },
      stats: {
        type: [{ label: { type: String }, value: { type: String } }],
        default: []
      }
    },
    process: {
      phases: {
        type: [
          {
            id: { type: String },
            n: { type: String },
            title: { type: String },
            description: { type: String },
            accent: { type: String },
            dot: { type: String }
          }
        ],
        default: []
      },
      perks: {
        type: [
          {
            title: { type: String },
            description: { type: String },
            icon: { type: String },
            gradient: { type: String },
            border: { type: String }
          }
        ],
        default: []
      }
    },
    teamPlaybook: {
      type: [{ phase: { type: String }, name: { type: String }, body: { type: String } }],
      default: []
    },
    contactInfo: {
      email: { type: String, default: "" },
      phone: { type: String, default: "" }
    },
    pageCopy: {
      type: {
        work: { type: pageCopySchema, default: undefined },
        services: { type: pageCopySchema, default: undefined },
        team: { type: pageCopySchema, default: undefined },
        about: { type: pageCopySchema, default: undefined },
        process: { type: pageCopySchema, default: undefined },
        contact: { type: pageCopySchema, default: undefined },
        insights: { type: pageCopySchema, default: undefined },
        faq: { type: pageCopySchema, default: undefined }
      },
      default: {}
    },
    contactCta: {
      eyebrow: { type: String, default: "" },
      title: { type: String, default: "" },
      lead: { type: String, default: "" },
      primary: { label: { type: String, default: "" }, href: { type: String, default: "" } },
      secondary: { label: { type: String, default: "" }, href: { type: String, default: "" } }
    },
    contactForm: {
      budgetBands: { type: [String], default: [] },
      timelines: { type: [String], default: [] }
    },
    engagement: {
      eyebrow: { type: String, default: "" },
      title: { type: String, default: "" },
      lead: { type: String, default: "" },
      bands: {
        type: [
          {
            name: { type: String, default: "" },
            range: { type: String, default: "" },
            duration: { type: String, default: "" },
            description: { type: String, default: "" }
          }
        ],
        default: []
      },
      footnote: { type: String, default: "" }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const PortfolioSettingsModel =
  mongoose.models.PortfolioSettings ??
  mongoose.model<PortfolioSettingsDocument>("PortfolioSettings", portfolioSettingsSchema);
